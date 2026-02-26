import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { drillsApi, Drill } from '../api/client';

const levelBadge: Record<number, string> = {
  0: 'bg-gray-700 text-gray-300',
  1: 'bg-blue-900/50 text-blue-300',
  2: 'bg-purple-900/50 text-purple-300',
  3: 'bg-yellow-900/50 text-yellow-300',
  4: 'bg-red-900/50 text-red-300',
};

export default function Drills() {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    drillsApi.getAll().then((r) => setDrills(r.data.drills)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading drills…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Chart Practice Drills</h1>
        <p className="text-gray-400 text-sm mt-1">
          Identify zones and patterns on real-structure charts. Each drill is auto-scored.
        </p>
      </div>

      <div className="grid gap-4">
        {drills.map((drill) => (
          <Link
            key={drill.id}
            to={`/drills/${drill.id}`}
            className="block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBadge[drill.level_required] ?? levelBadge[0]}`}>
                    Level {drill.level_required}+
                  </span>
                  {drill.attempt_count !== undefined && drill.attempt_count > 0 && (
                    <span className="text-xs text-gray-500">{drill.attempt_count} attempt{drill.attempt_count !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-200 group-hover:text-white transition-colors">{drill.title}</h3>
              </div>
              {drill.last_score !== undefined && drill.last_score !== null && (
                <div className={`text-xl font-bold ml-4 ${drill.last_score >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {drill.last_score}%
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{drill.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
