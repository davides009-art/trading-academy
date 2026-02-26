import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest, DrillUserInput, DrillAnswerSet, DrillZone, DrillPoint } from '../types';

const router = Router();

// ── Scoring helpers ──────────────────────────────────────────────────────────

function zoneOverlap(userFrom: number, userTo: number, ansFrom: number, ansTo: number): number {
  const overlapFrom = Math.max(userFrom, ansFrom);
  const overlapTo = Math.min(userTo, ansTo);
  if (overlapTo <= overlapFrom) return 0;
  const overlapSize = overlapTo - overlapFrom;
  const ansSize = ansTo - ansFrom;
  return ansSize > 0 ? overlapSize / ansSize : 0;
}

function scoreZones(
  userZones: DrillUserInput['zones'] = [],
  answerZones: DrillZone[] = []
): Array<{ element: string; correct: boolean; explanation: string }> {
  return answerZones.map((ans, i) => {
    const match = userZones.find(
      (u) =>
        u.type === ans.type &&
        zoneOverlap(u.priceFrom, u.priceTo, ans.priceFrom, ans.priceTo) >= 0.5
    );
    const tol = ans.tolerance ?? 3;
    const inRange =
      !match &&
      userZones.some(
        (u) =>
          u.type === ans.type &&
          Math.abs(u.priceFrom - ans.priceFrom) <= tol &&
          Math.abs(u.priceTo - ans.priceTo) <= tol
      );
    const correct = !!match || inRange;
    return {
      element: `${ans.type}_zone_${i + 1}`,
      correct,
      explanation: correct
        ? `Your ${ans.type} zone overlapped with the expected zone (${ans.priceFrom}–${ans.priceTo}).`
        : `The ${ans.type} zone should be around ${ans.priceFrom}–${ans.priceTo}.`,
    };
  });
}

function scorePoints(
  userPoints: DrillUserInput['points'] = [],
  answerPoints: DrillPoint[] = []
): Array<{ element: string; correct: boolean; explanation: string }> {
  return answerPoints.map((ans, i) => {
    const priceTol = ans.tolerance ?? 3;
    const barTol = ans.barTolerance ?? 5;
    const match = userPoints.find((u) => {
      if (u.type !== ans.type) return false;
      const priceOk = Math.abs(u.price - ans.price) <= priceTol;
      const barOk = u.barIndex !== undefined ? Math.abs(u.barIndex - ans.barIndex) <= barTol : true;
      const dirOk = ans.direction ? u.direction === ans.direction : true;
      return priceOk && barOk && dirOk;
    });
    return {
      element: `${ans.type}_point_${i + 1}`,
      correct: !!match,
      explanation: match
        ? `Your ${ans.type} point is within the expected range.`
        : `The ${ans.type} was expected around price ${ans.price} (bar ~${ans.barIndex})${ans.direction ? `, direction: ${ans.direction}` : ''}.`,
    };
  });
}

// GET /api/drills
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drillsRes = await pool.query(
      `SELECT d.id, d.title, d.description, d.level_required, d.difficulty, d.tags,
              (SELECT COUNT(*) FROM drill_attempts da WHERE da.drill_id = d.id AND da.user_id = $1) as attempt_count,
              (SELECT da.score FROM drill_attempts da WHERE da.drill_id = d.id AND da.user_id = $1 ORDER BY da.created_at DESC LIMIT 1) as last_score
       FROM drills d ORDER BY d.level_required, d.id`,
      [req.userId]
    );
    res.json({ drills: drillsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/drills/:id
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drillRes = await pool.query(
      `SELECT id, title, description, level_required, difficulty, tags,
              chart_config, answer_set, hint1_text, hint2_text, explanation
       FROM drills WHERE id = $1`,
      [req.params.id]
    );
    if (drillRes.rows.length === 0) {
      res.status(404).json({ error: 'Drill not found' });
      return;
    }
    const lastAttemptRes = await pool.query(
      `SELECT score, user_input, feedback, hints_used, revealed, created_at
       FROM drill_attempts
       WHERE drill_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [req.params.id, req.userId]
    );
    res.json({
      drill: drillRes.rows[0],
      lastAttempt: lastAttemptRes.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/drills/:id/submit
router.post(
  '/:id/submit',
  authenticateToken,
  [
    body('user_input').isObject(),
    body('hints_used').optional().isInt({ min: 0, max: 2 }),
    body('revealed').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const drillRes = await pool.query('SELECT * FROM drills WHERE id = $1', [req.params.id]);
      if (drillRes.rows.length === 0) {
        res.status(404).json({ error: 'Drill not found' });
        return;
      }
      const drill = drillRes.rows[0];
      const answerSet: DrillAnswerSet = drill.answer_set;
      const userInput: DrillUserInput = req.body.user_input;
      const hintsUsed: number = req.body.hints_used ?? 0;
      const revealed: boolean = req.body.revealed ?? false;

      // Score zones and points
      const zoneFeedback = scoreZones(userInput.zones, answerSet.zones);
      const pointFeedback = scorePoints(userInput.points, answerSet.points);
      const allFeedback = [...zoneFeedback, ...pointFeedback];

      const totalElements = allFeedback.length;
      const correctElements = allFeedback.filter((f) => f.correct).length;
      const score = totalElements > 0 ? Math.round((correctElements / totalElements) * 100) : 0;

      // Record attempt with hint/reveal metadata
      await pool.query(
        `INSERT INTO drill_attempts (user_id, drill_id, user_input, score, feedback, hints_used, revealed)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.userId, drill.id, JSON.stringify(userInput), score, JSON.stringify(allFeedback), hintsUsed, revealed]
      );

      res.json({
        score,
        correctElements,
        totalElements,
        feedback: allFeedback,
        answerSet,
        // Let the client know whether this attempt is assisted so it can display the badge
        assisted: revealed,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
