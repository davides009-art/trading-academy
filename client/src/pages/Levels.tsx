import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { levelsApi, Level } from '../api/client';
import ProgressBar from '../components/ProgressBar';

export default function Levels() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    levelsApi.getAll().then((r) => setLevels(r.data.levels)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading levels…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Learning Path</h1>
        <p className="text-gray-400 text-sm mt-1">5 levels from foundations to advanced strategies</p>
      </div>

      <div className="grid gap-4">
        {levels.map((level) => {
          const pct = level.total_lessons > 0
            ? Math.round((level.completed_lessons / level.total_lessons) * 100)
            : 0;
          const isUnlocked = level.order_num === 0 || levels
            .slice(0, level.order_num)
            .every((l) => l.completed_lessons > 0);

          return (
            <Link
              key={level.id}
              to={`/levels/${level.id}`}
              className={`block bg-gray-900 rounded-xl p-5 border transition-all ${
                isUnlocked
                  ? 'border-gray-800 hover:border-blue-700 hover:bg-gray-800/80'
                  : 'border-gray-800/50 opacity-60 cursor-default pointer-events-none'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{level.icon}</div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Level {level.order_num}</div>
                    <div className="font-semibold text-white">{level.title}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                    {pct}%
                  </div>
                  <div className="text-xs text-gray-500">{level.completed_lessons}/{level.total_lessons} lessons</div>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-3 leading-relaxed">{level.description}</p>

              <ProgressBar
                value={pct}
                color={pct === 100 ? 'green' : 'blue'}
                height="md"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
