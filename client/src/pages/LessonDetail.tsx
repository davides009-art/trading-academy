import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { lessonsApi, quizApi, Lesson, Question, QuizAnswer } from '../api/client';
import CandlestickChart, { CandleData } from '../components/CandlestickChart';
import QuizComponent from '../components/QuizComponent';
import MasteryBadge from '../components/MasteryBadge';

type QuizResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  masteryScore: number;
  answerResults: Array<{ questionId: number; userAnswer: string; correctAnswer: string; isCorrect: boolean; explanation: string }>;
};

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson & { prevLesson?: { id: number; title: string } | null; nextLesson?: { id: number; title: string } | null; lastAttempt?: { score: number; passed: boolean } | null } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const lessonId = Number(id);

    // Reset all lesson-specific state before the new fetch so stale quiz
    // results from a previously viewed lesson never bleed into this one.
    setLesson(null);
    setQuestions([]);
    setShowQuiz(false);
    setQuizResult(null);
    setQuizLoading(false);
    setLoading(true);

    Promise.all([
      lessonsApi.get(lessonId),
      lessonsApi.getQuestions(lessonId),
    ]).then(([lessonRes, questionsRes]) => {
      const { lesson: lessonData, prevLesson, nextLesson, lastAttempt } = lessonRes.data;
      setLesson({ ...lessonData, prevLesson, nextLesson, lastAttempt });
      setQuestions(questionsRes.data.questions);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleQuizSubmit = async (answers: QuizAnswer[]) => {
    if (!lesson) return;
    setQuizLoading(true);
    try {
      const { data } = await quizApi.submit({ lessonId: lesson.id, answers });
      setQuizResult(data);
    } finally {
      setQuizLoading(false);
    }
  };

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading lesson…</div>;
  if (!lesson) return <div className="text-red-400 py-10 text-center">Lesson not found.</div>;

  const chartData = lesson.visual_config && (lesson.visual_config as { data?: CandleData[] }).data;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/levels" className="hover:text-gray-300">Levels</Link>
        <span>/</span>
        <Link to={`/levels/${lesson.level_id}`} className="hover:text-gray-300">{lesson.level_title}</Link>
        <span>/</span>
        <span className="text-gray-300 truncate">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">~{lesson.estimated_minutes} min read</span>
            {lesson.mastery_score > 0 && <MasteryBadge score={lesson.mastery_score} />}
            {lesson.lastAttempt && (
              <span className={`text-xs font-medium ${lesson.lastAttempt.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                Last quiz: {lesson.lastAttempt.score}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lesson content */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="prose prose-sm prose-invert max-w-none">
          {(lesson.content ?? '').split('\n').filter(Boolean).map((para, i) => (
            <p key={i} className="text-gray-300 leading-relaxed mb-4 last:mb-0">{para}</p>
          ))}
        </div>
      </div>

      {/* Chart visual */}
      {lesson.visual_type === 'candlestick' && chartData && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 text-sm font-medium text-gray-300">
            Chart Visual
          </div>
          <div className="p-4">
            <CandlestickChart data={chartData} height={280} />
            {(lesson.visual_config as { caption?: string }).caption && (
              <p className="text-xs text-gray-500 mt-2 text-center italic">
                {(lesson.visual_config as { caption?: string }).caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Common Mistakes */}
      {lesson.common_mistakes?.length > 0 && (
        <div className="bg-red-950/30 rounded-xl p-5 border border-red-900/50">
          <h2 className="text-sm font-semibold text-red-400 mb-3">⚠ Common Mistakes</h2>
          <ul className="space-y-2">
            {lesson.common_mistakes.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-red-500 flex-shrink-0">×</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Takeaways */}
      {lesson.key_takeaways?.length > 0 && (
        <div className="bg-emerald-950/30 rounded-xl p-5 border border-emerald-900/50">
          <h2 className="text-sm font-semibold text-emerald-400 mb-3">✓ Key Takeaways</h2>
          <ul className="space-y-2">
            {lesson.key_takeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-emerald-500 flex-shrink-0">→</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quiz section */}
      {questions.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Quiz</h2>
              <p className="text-xs text-gray-500 mt-0.5">{questions.length} questions · Pass mark: 70%</p>
            </div>
            {!showQuiz && !quizResult && (
              <button
                onClick={() => setShowQuiz(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
              >
                Start Quiz
              </button>
            )}
          </div>
          {(showQuiz || quizResult) && (
            <div className="p-5">
              <QuizComponent
                key={lesson.id}
                questions={questions}
                lessonId={lesson.id}
                onSubmit={handleQuizSubmit}
                results={quizResult?.answerResults}
                score={quizResult?.score}
                passed={quizResult?.passed}
                loading={quizLoading}
              />
              {quizResult && (
                <button
                  onClick={() => { setQuizResult(null); setShowQuiz(true); }}
                  className="mt-4 w-full py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
                >
                  Retake Quiz
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {lesson.prevLesson && (
          <Link to={`/lessons/${lesson.prevLesson.id}`}
            className="flex-1 py-3 rounded-xl border border-gray-800 hover:border-gray-700 text-center text-sm text-gray-400 hover:text-gray-200 transition-colors">
            ← {lesson.prevLesson.title}
          </Link>
        )}
        {lesson.nextLesson && (
          <Link to={`/lessons/${lesson.nextLesson.id}`}
            className="flex-1 py-3 rounded-xl border border-gray-800 hover:border-gray-700 text-center text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {lesson.nextLesson.title} →
          </Link>
        )}
      </div>
    </div>
  );
}
