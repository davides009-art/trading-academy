import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/practice/daily
// Returns up to 5 questions from the review queue due today or overdue
router.get('/daily', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const queueRes = await pool.query(
      `SELECT rq.id as queue_id, rq.lesson_id, rq.question_id, rq.interval_days, rq.ease_factor,
              q.type, q.question_text, q.options, q.visual_config, q.order_num,
              l.title as lesson_title
       FROM review_queue rq
       JOIN questions q ON q.id = rq.question_id
       JOIN lessons l ON l.id = rq.lesson_id
       WHERE rq.user_id = $1 AND rq.next_review_date <= $2
       ORDER BY rq.next_review_date ASC
       LIMIT 5`,
      [req.userId, today]
    );

    // If fewer than 5 in queue, supplement with questions from recently-failed lessons
    let questions = queueRes.rows;
    if (questions.length < 5) {
      const needed = 5 - questions.length;
      const queuedQuestionIds = questions.map((q) => q.question_id).filter(Boolean);

      const supplementRes = await pool.query(
        `SELECT q.id as question_id, q.type, q.question_text, q.options, q.visual_config,
                l.id as lesson_id, l.title as lesson_title,
                NULL as queue_id, 1 as interval_days, 2.5 as ease_factor
         FROM questions q
         JOIN lessons l ON l.id = q.lesson_id
         JOIN mastery_scores ms ON ms.lesson_id = l.id AND ms.user_id = $1
         WHERE ms.score < 70
         ${queuedQuestionIds.length > 0 ? `AND q.id NOT IN (${queuedQuestionIds.join(',')})` : ''}
         ORDER BY ms.score ASC, RANDOM()
         LIMIT $2`,
        [req.userId, needed]
      );
      questions = [...questions, ...supplementRes.rows];
    }

    // Don't expose correct_answer to client
    const safeQuestions = questions.map(({ ...q }) => q);

    res.json({
      questions: safeQuestions,
      totalDue: queueRes.rows.length,
      date: today,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/practice/daily/submit
// Body: { answers: Array<{ questionId: number, queueId?: number, answer: string }> }
router.post(
  '/daily/submit',
  authenticateToken,
  [body('answers').isArray({ min: 1 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { answers } = req.body as {
      answers: Array<{ questionId: number; queueId?: number; answer: string }>;
    };

    try {
      const results = [];

      for (const { questionId, queueId, answer } of answers) {
        const qRes = await pool.query(
          'SELECT correct_answer, explanation, lesson_id FROM questions WHERE id = $1',
          [questionId]
        );
        if (qRes.rows.length === 0) continue;

        const q = qRes.rows[0];
        const isCorrect =
          q.correct_answer.toLowerCase().trim() === (answer || '').toLowerCase().trim();

        results.push({ questionId, isCorrect, correctAnswer: q.correct_answer, explanation: q.explanation });

        // Update review queue scheduling (SM-2-inspired)
        if (queueId) {
          const queueRes = await pool.query(
            'SELECT interval_days, ease_factor FROM review_queue WHERE id = $1 AND user_id = $2',
            [queueId, req.userId]
          );
          if (queueRes.rows.length > 0) {
            const { interval_days, ease_factor } = queueRes.rows[0];
            let newInterval: number;
            let newEase = parseFloat(ease_factor);

            if (isCorrect) {
              // Correct: increase interval
              if (interval_days === 1) newInterval = 3;
              else if (interval_days <= 3) newInterval = 7;
              else newInterval = Math.round(interval_days * newEase);
              newEase = Math.min(3.0, newEase + 0.1);
            } else {
              // Wrong: reset to 1 day
              newInterval = 1;
              newEase = Math.max(1.3, newEase - 0.2);
            }

            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + newInterval);
            await pool.query(
              `UPDATE review_queue SET next_review_date = $1, interval_days = $2, ease_factor = $3, updated_at = NOW()
               WHERE id = $4`,
              [nextDate.toISOString().split('T')[0], newInterval, newEase, queueId]
            );
          }
        } else if (!isCorrect) {
          // Supplement question answered wrong → add to review queue
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 1);
          await pool.query(
            `INSERT INTO review_queue (user_id, lesson_id, question_id, next_review_date, interval_days)
             VALUES ($1,$2,$3,$4,1)
             ON CONFLICT DO NOTHING`,
            [req.userId, q.lesson_id, questionId, nextDate.toISOString().split('T')[0]]
          );
        }
      }

      const correctCount = results.filter((r) => r.isCorrect).length;
      const score = Math.round((correctCount / results.length) * 100);

      res.json({ score, correctCount, total: results.length, results });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
