import { Router, Response } from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/dashboard
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // User info + streak
    const userRes = await pool.query(
      'SELECT username, streak_count, last_active_date FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];

    // Overall progress by level
    const levelProgressRes = await pool.query(
      `SELECT lv.id, lv.order_num, lv.title, lv.icon,
              COUNT(l.id) as total_lessons,
              COUNT(ulp.id) FILTER (WHERE ulp.status = 'completed') as completed_lessons,
              ROUND(AVG(COALESCE(ms.score, 0))) as avg_mastery
       FROM levels lv
       LEFT JOIN lessons l ON l.level_id = lv.id
       LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $1
       LEFT JOIN mastery_scores ms ON ms.lesson_id = l.id AND ms.user_id = $1
       GROUP BY lv.id, lv.order_num, lv.title, lv.icon
       ORDER BY lv.order_num`,
      [userId]
    );

    // Total lesson stats
    const lessonStatsRes = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE ulp.status = 'completed') as completed,
         COUNT(*) FILTER (WHERE ulp.status = 'in_progress') as in_progress
       FROM lessons l
       LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $1`,
      [userId]
    );

    // Review queue count (due today or overdue)
    const reviewCountRes = await pool.query(
      `SELECT COUNT(*) FROM review_queue WHERE user_id = $1 AND next_review_date <= CURRENT_DATE`,
      [userId]
    );

    // Top mastery topics (best performing)
    const topMasteryRes = await pool.query(
      `SELECT l.title, ms.score, lv.title as level_title
       FROM mastery_scores ms
       JOIN lessons l ON l.id = ms.lesson_id
       JOIN levels lv ON lv.id = l.level_id
       WHERE ms.user_id = $1
       ORDER BY ms.score DESC LIMIT 5`,
      [userId]
    );

    // Weakest topics (for review focus)
    const weakestRes = await pool.query(
      `SELECT l.id, l.title, ms.score, lv.title as level_title
       FROM mastery_scores ms
       JOIN lessons l ON l.id = ms.lesson_id
       JOIN levels lv ON lv.id = l.level_id
       WHERE ms.user_id = $1 AND ms.score < 70
       ORDER BY ms.score ASC LIMIT 5`,
      [userId]
    );

    // Recent quiz activity (last 7 days)
    const recentActivityRes = await pool.query(
      `SELECT qa.score, qa.passed, l.title as lesson_title, qa.created_at
       FROM quiz_attempts qa
       JOIN lessons l ON l.id = qa.lesson_id
       WHERE qa.user_id = $1 AND qa.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY qa.created_at DESC LIMIT 10`,
      [userId]
    );

    // Journal quick stats
    const journalRes = await pool.query(
      `SELECT
         COUNT(*) as total_trades,
         ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'win') /
           NULLIF(COUNT(*) FILTER (WHERE result IN ('win','loss')), 0), 1) as win_rate
       FROM journal_entries WHERE user_id = $1`,
      [userId]
    );

    res.json({
      user,
      levelProgress: levelProgressRes.rows,
      lessonStats: lessonStatsRes.rows[0],
      reviewDueCount: parseInt(reviewCountRes.rows[0].count),
      topMastery: topMasteryRes.rows,
      weakestTopics: weakestRes.rows,
      recentActivity: recentActivityRes.rows,
      journalStats: journalRes.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
