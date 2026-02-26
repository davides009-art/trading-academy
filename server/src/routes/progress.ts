import { Router, Response } from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/progress
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const progressRes = await pool.query(
      `SELECT l.id, l.title, l.level_id, lv.title as level_title,
              COALESCE(ulp.status, 'not_started') as status,
              COALESCE(ms.score, 0) as mastery_score,
              ulp.completed_at
       FROM lessons l
       JOIN levels lv ON lv.id = l.level_id
       LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $1
       LEFT JOIN mastery_scores ms ON ms.lesson_id = l.id AND ms.user_id = $1
       ORDER BY lv.order_num, l.order_num`,
      [req.userId]
    );

    const reviewCountRes = await pool.query(
      `SELECT COUNT(*) FROM review_queue WHERE user_id = $1 AND next_review_date <= CURRENT_DATE`,
      [req.userId]
    );

    res.json({
      lessons: progressRes.rows,
      reviewDueCount: parseInt(reviewCountRes.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
