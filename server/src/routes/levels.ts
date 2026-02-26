import { Router, Request, Response } from 'express';
import pool from '../db';
import { optionalAuth } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/levels — public; includes per-user progress when authenticated
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const levels = await pool.query('SELECT * FROM levels ORDER BY order_num');

    const levelsWithProgress = await Promise.all(
      levels.rows.map(async (level) => {
        const totalRes = await pool.query(
          'SELECT COUNT(*) FROM lessons WHERE level_id = $1',
          [level.id]
        );

        let completedLessons = 0;
        if (req.userId) {
          const completedRes = await pool.query(
            `SELECT COUNT(*) FROM user_lesson_progress ulp
             JOIN lessons l ON l.id = ulp.lesson_id
             WHERE l.level_id = $1 AND ulp.user_id = $2 AND ulp.status = 'completed'`,
            [level.id, req.userId]
          );
          completedLessons = parseInt(completedRes.rows[0].count);
        }

        return {
          ...level,
          total_lessons: parseInt(totalRes.rows[0].count),
          completed_lessons: completedLessons,
        };
      })
    );

    res.json({ levels: levelsWithProgress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/levels/:id/lessons — public; includes per-user progress when authenticated
router.get('/:id/lessons', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const levelId = parseInt(req.params.id);
    const level = await pool.query('SELECT * FROM levels WHERE id = $1', [levelId]);
    if (level.rows.length === 0) {
      res.status(404).json({ error: 'Level not found' });
      return;
    }

    let lessonsRes;
    if (req.userId) {
      lessonsRes = await pool.query(
        `SELECT l.id, l.order_num, l.title, l.estimated_minutes, l.visual_type,
                COALESCE(ulp.status, 'not_started') as status,
                COALESCE(ms.score, 0) as mastery_score
         FROM lessons l
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $2
         LEFT JOIN mastery_scores ms ON ms.lesson_id = l.id AND ms.user_id = $2
         WHERE l.level_id = $1
         ORDER BY l.order_num`,
        [levelId, req.userId]
      );
    } else {
      lessonsRes = await pool.query(
        `SELECT id, order_num, title, estimated_minutes, visual_type,
                'not_started' as status, 0 as mastery_score
         FROM lessons WHERE level_id = $1 ORDER BY order_num`,
        [levelId]
      );
    }

    res.json({ level: level.rows[0], lessons: lessonsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
