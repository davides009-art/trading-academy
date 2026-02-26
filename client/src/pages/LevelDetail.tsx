import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { levelsApi, Level, LessonSummary } from '../api/client';
import MasteryBadge from '../components/MasteryBadge';

const statusIcon: Record<string, string> = {
  completed: '✓',
  in_progress: '◑',
  not_started: '○',
};
const statusColor: Record<string, string> = {
  completed: 'text-emerald-400',
  in_progress: 'text-blue-400',
  not_started: 'text-gray-600',
};

export default function LevelDetail() {
  const { id } = useParams<{ id: string }>();
  const [level, setLevel] = useState<Level | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    levelsApi.getLessons(Number(id)).then((r) => {
      setLevel(r.data.level);
      setLessons(r.data.lessons);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading…</div>;
  if (!level) return <div className="text-red-400 py-10 text-center">Level not found.</div>;

  const completed = lessons.filter((l) => l.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/levels" className="hover:text-gray-300">Levels</Link>
        <span>/</span>
        <span className="text-gray-300">Level {level.order_num}: {level.title}</span>
      </div>

      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{level.icon}</span>
          <div>
            <div className="text-xs text-gray-500">Level {level.order_num}</div>
            <h1 className="text-xl font-bold text-white">{level.title}</h1>
          </div>
        </div>
        <p className="text-gray-400 text-sm">{level.description}</p>
        <div className="mt-3 text-sm text-gray-500">
          {completed} / {lessons.length} lessons completed
        </div>
      </div>

      {/* Lesson list */}
      <div className="space-y-2">
        {lessons.map((lesson, i) => (
          <Link
            key={lesson.id}
            to={`/lessons/${lesson.id}`}
            className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-all group"
          >
            <span className={`text-lg font-bold ${statusColor[lesson.status]} w-5 text-center`}>
              {statusIcon[lesson.status]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">#{i + 1}</span>
                <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                  {lesson.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">~{lesson.estimated_minutes} min</span>
                {lesson.mastery_score > 0 && (
                  <MasteryBadge score={lesson.mastery_score} size="sm" />
                )}
              </div>
            </div>
            <span className="text-gray-700 group-hover:text-gray-400 transition-colors">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
