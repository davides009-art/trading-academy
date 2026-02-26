import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

const journalValidators = [
  body('trade_date').isISO8601(),
  body('symbol').trim().notEmpty().isLength({ max: 20 }),
  body('direction').isIn(['long', 'short']),
  body('result').optional().isIn(['win', 'loss', 'breakeven']),
  body('planned_rr').optional().isFloat({ min: 0 }),
  body('actual_rr').optional().isFloat(),
  body('stop_loss').optional().isFloat(),
  body('take_profit').optional().isFloat(),
  body('entry_price').optional().isFloat(),
  body('exit_price').optional().isFloat(),
  body('mistake_tags').optional().isArray(),
];

// GET /api/journal
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const entriesRes = await pool.query(
      `SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY trade_date DESC, created_at DESC LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    );
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM journal_entries WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      entries: entriesRes.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/journal/stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statsRes = await pool.query(
      `SELECT
         COUNT(*) as total_trades,
         COUNT(*) FILTER (WHERE result = 'win') as wins,
         COUNT(*) FILTER (WHERE result = 'loss') as losses,
         COUNT(*) FILTER (WHERE result = 'breakeven') as breakevens,
         ROUND(AVG(CASE WHEN planned_rr IS NOT NULL THEN planned_rr END)::numeric, 2) as avg_planned_rr,
         ROUND(AVG(CASE WHEN actual_rr IS NOT NULL THEN actual_rr END)::numeric, 2) as avg_actual_rr,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE result = 'win') /
           NULLIF(COUNT(*) FILTER (WHERE result IN ('win','loss')), 0), 1
         ) as win_rate
       FROM journal_entries WHERE user_id = $1`,
      [req.userId]
    );

    // Most common mistake tags
    const tagsRes = await pool.query(
      `SELECT tag, COUNT(*) as count FROM (
         SELECT jsonb_array_elements_text(mistake_tags) as tag
         FROM journal_entries WHERE user_id = $1 AND jsonb_array_length(mistake_tags) > 0
       ) t GROUP BY tag ORDER BY count DESC LIMIT 5`,
      [req.userId]
    );

    // Recent trades (last 30 days) by result for chart
    const recentRes = await pool.query(
      `SELECT trade_date, result, symbol, planned_rr, actual_rr
       FROM journal_entries
       WHERE user_id = $1 AND trade_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY trade_date ASC`,
      [req.userId]
    );

    res.json({
      stats: statsRes.rows[0],
      topMistakeTags: tagsRes.rows,
      recentTrades: recentRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/journal/:id
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entryRes = await pool.query(
      'SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (entryRes.rows.length === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json({ entry: entryRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/journal
router.post('/', authenticateToken, journalValidators, async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    trade_date, symbol, direction, entry_reason, stop_loss, take_profit,
    entry_price, exit_price, planned_rr, actual_rr, result, notes, mistake_tags,
  } = req.body;

  try {
    const entryRes = await pool.query(
      `INSERT INTO journal_entries
         (user_id, trade_date, symbol, direction, entry_reason, stop_loss, take_profit,
          entry_price, exit_price, planned_rr, actual_rr, result, notes, mistake_tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.userId, trade_date, symbol.toUpperCase(), direction, entry_reason,
        stop_loss ?? null, take_profit ?? null, entry_price ?? null, exit_price ?? null,
        planned_rr ?? null, actual_rr ?? null, result ?? null, notes ?? null,
        JSON.stringify(mistake_tags ?? []),
      ]
    );
    res.status(201).json({ entry: entryRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/journal/:id
router.put('/:id', authenticateToken, journalValidators, async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    trade_date, symbol, direction, entry_reason, stop_loss, take_profit,
    entry_price, exit_price, planned_rr, actual_rr, result, notes, mistake_tags,
  } = req.body;

  try {
    const entryRes = await pool.query(
      `UPDATE journal_entries SET
         trade_date=$1, symbol=$2, direction=$3, entry_reason=$4, stop_loss=$5,
         take_profit=$6, entry_price=$7, exit_price=$8, planned_rr=$9, actual_rr=$10,
         result=$11, notes=$12, mistake_tags=$13, updated_at=NOW()
       WHERE id=$14 AND user_id=$15
       RETURNING *`,
      [
        trade_date, symbol.toUpperCase(), direction, entry_reason,
        stop_loss ?? null, take_profit ?? null, entry_price ?? null, exit_price ?? null,
        planned_rr ?? null, actual_rr ?? null, result ?? null, notes ?? null,
        JSON.stringify(mistake_tags ?? []),
        req.params.id, req.userId,
      ]
    );
    if (entryRes.rows.length === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json({ entry: entryRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/journal/:id
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
