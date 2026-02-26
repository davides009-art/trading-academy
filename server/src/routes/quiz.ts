import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/quiz/submit
// Body: { lessonId: number, answers: Array<{ questionId: number, answer: string }> }
router.post(
  '/submit',
  authenticateToken,
  [body('lessonId').exists().isInt(), body('answers').isArray({ min: 1 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { lessonId, answers } = req.body as {
      lessonId: number;
      answers: Array<{ questionId: number; answer: string }>;
    };

    try {
      // Load correct answers for all questions in this lesson
      const questionsRes = await pool.query(
        `SELECT id, correct_answer, explanation, question_text, type, options FROM questions
         WHERE lesson_id = $1`,
        [lessonId]
      );
      const questions = questionsRes.rows;
      if (questions.length === 0) {
        res.status(404).json({ error: 'No questions found for this lesson' });
        return;
      }

      // Score the attempt
      let correctCount = 0;
      const answerResults: Array<{
        questionId: number;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        explanation: string;
      }> = [];

      for (const { questionId, answer } of answers) {
        const q = questions.find((q) => q.id === questionId);
        if (!q) continue;
        const isCorrect =
          q.correct_answer.toLowerCase().trim() === (answer || '').toLowerCase().trim();
        if (isCorrect) correctCount++;
        answerResults.push({
          questionId,
          userAnswer: answer,
          correctAnswer: q.correct_answer,
          isCorrect,
          explanation: q.explanation,
        });
      }

      const total = questions.length;
      const score = Math.round((correctCount / total) * 100);
      const passed = score >= 70;

      // Record the attempt
      const attemptRes = await pool.query(
        `INSERT INTO quiz_attempts (user_id, lesson_id, score, total_questions, correct_count, passed)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [req.userId, lessonId, score, total, correctCount, passed]
      );
      const attemptId = attemptRes.rows[0].id;

      // Record individual answers
      for (const ar of answerResults) {
        await pool.query(
          `INSERT INTO quiz_attempt_answers (attempt_id, question_id, user_answer, is_correct)
           VALUES ($1,$2,$3,$4)`,
          [attemptId, ar.questionId, ar.userAnswer, ar.isCorrect]
        );
      }

      // Update mastery score (rolling average of last 3 attempts)
      const recentAttemptsRes = await pool.query(
        `SELECT score FROM quiz_attempts
         WHERE user_id = $1 AND lesson_id = $2
         ORDER BY created_at DESC LIMIT 3`,
        [req.userId, lessonId]
      );
      const recentScores = recentAttemptsRes.rows.map((r) => r.score);
      const masteryScore = Math.round(
        recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      );

      await pool.query(
        `INSERT INTO mastery_scores (user_id, lesson_id, score, attempts_count)
         VALUES ($1,$2,$3,1)
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET score = $3, attempts_count = mastery_scores.attempts_count + 1, updated_at = NOW()`,
        [req.userId, lessonId, masteryScore]
      );

      // Mark lesson as completed
      await pool.query(
        `INSERT INTO user_lesson_progress (user_id, lesson_id, status, completed_at)
         VALUES ($1,$2,'completed', NOW())
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET status = 'completed', completed_at = NOW()`,
        [req.userId, lessonId]
      );

      // Spaced repetition: if score < 70%, schedule questions for review
      if (!passed) {
        const wrongQuestions = answerResults.filter((ar) => !ar.isCorrect);
        for (const wq of wrongQuestions) {
          const reviewDate = new Date();
          reviewDate.setDate(reviewDate.getDate() + 1);
          await pool.query(
            `INSERT INTO review_queue (user_id, lesson_id, question_id, next_review_date, interval_days)
             VALUES ($1,$2,$3,$4,1)
             ON CONFLICT DO NOTHING`,
            [req.userId, lessonId, wq.questionId, reviewDate.toISOString().split('T')[0]]
          );
        }
      }

      res.json({
        score,
        passed,
        correctCount,
        total,
        masteryScore,
        answerResults,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/quiz/history/:lessonId
router.get('/history/:lessonId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    const attemptsRes = await pool.query(
      `SELECT id, score, total_questions, correct_count, passed, created_at
       FROM quiz_attempts
       WHERE user_id = $1 AND lesson_id = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.userId, lessonId]
    );
    res.json({ attempts: attemptsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
