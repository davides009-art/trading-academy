import { Router, Response } from 'express';
import pool from '../db';
import { optionalAuth } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/lessons/:id — public; includes per-user progress when authenticated
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lessonId = parseInt(req.params.id);

    let lessonRes;
    if (req.userId) {
      lessonRes = await pool.query(
        `SELECT l.*, lv.title as level_title, lv.order_num as level_order,
                COALESCE(ulp.status, 'not_started') as progress_status,
                COALESCE(ms.score, 0) as mastery_score
         FROM lessons l
         JOIN levels lv ON lv.id = l.level_id
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = $2
         LEFT JOIN mastery_scores ms ON ms.lesson_id = l.id AND ms.user_id = $2
         WHERE l.id = $1`,
        [lessonId, req.userId]
      );
    } else {
      lessonRes = await pool.query(
        `SELECT l.*, lv.title as level_title, lv.order_num as level_order,
                'not_started' as progress_status, 0 as mastery_score
         FROM lessons l
         JOIN levels lv ON lv.id = l.level_id
         WHERE l.id = $1`,
        [lessonId]
      );
    }

    if (lessonRes.rows.length === 0) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    const lesson = lessonRes.rows[0];

    // Mark as in_progress only for authenticated users
    if (req.userId && lesson.progress_status === 'not_started') {
      await pool.query(
        `INSERT INTO user_lesson_progress (user_id, lesson_id, status)
         VALUES ($1, $2, 'in_progress')
         ON CONFLICT (user_id, lesson_id) DO NOTHING`,
        [req.userId, lessonId]
      );
      lesson.progress_status = 'in_progress';
    }

    // Prev/next lesson navigation
    const navRes = await pool.query(
      `SELECT id, order_num, title FROM lessons WHERE level_id = $1 ORDER BY order_num`,
      [lesson.level_id]
    );
    const allLessons = navRes.rows;
    const currentIdx = allLessons.findIndex((l) => l.id === lessonId);
    const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
    const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

    // Last quiz attempt — only available when authenticated
    let lastAttempt = null;
    if (req.userId) {
      const lastAttemptRes = await pool.query(
        `SELECT score, passed, created_at FROM quiz_attempts
         WHERE user_id = $1 AND lesson_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [req.userId, lessonId]
      );
      lastAttempt = lastAttemptRes.rows[0] || null;
    }

    res.json({
      lesson,
      prevLesson,
      nextLesson,
      lastAttempt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/lessons/:id/questions — public
router.get('/:id/questions', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lessonId = parseInt(req.params.id);
    const questionsRes = await pool.query(
      `SELECT id, type, question_text, options, correct_answer, explanation, visual_config, order_num
       FROM questions WHERE lesson_id = $1 ORDER BY order_num`,
      [lessonId]
    );

    // Don't expose correct_answer to the client
    const questionsForQuiz = questionsRes.rows.map(({ correct_answer, explanation, ...q }) => q);

    res.json({ questions: questionsForQuiz, total: questionsForQuiz.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
