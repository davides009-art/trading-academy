import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import ProgressBar from '../components/ProgressBar';

type DashboardData = Awaited<ReturnType<typeof dashboardApi.get>>['data'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading dashboard…</div>;
  if (!data) return <div className="text-red-400 py-10 text-center">Failed to load dashboard.</div>;

  const { user, levelProgress, lessonStats, reviewDueCount, topMastery, weakestTopics, recentActivity, journalStats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user.username}</h1>
          <p className="text-gray-400 text-sm mt-0.5">Here's your progress overview</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-400">🔥 {user.streak_count}</div>
          <div className="text-xs text-gray-500">day streak</div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Lessons Completed" value={lessonStats.completed} sub={`of ${lessonStats.total}`} color="text-blue-400" />
        <StatCard label="Review Queue" value={reviewDueCount} sub="due today" color={reviewDueCount > 0 ? 'text-yellow-400' : 'text-emerald-400'} />
        <StatCard label="Win Rate" value={journalStats.win_rate ? `${journalStats.win_rate}%` : '—'} sub={`${journalStats.total_trades} trades`} color="text-emerald-400" />
        <StatCard label="In Progress" value={lessonStats.in_progress} sub="lessons" color="text-purple-400" />
      </div>

      {/* Review queue CTA */}
      {reviewDueCount > 0 && (
        <Link to="/practice" className="block bg-yellow-900/30 border border-yellow-700/60 rounded-xl p-4 hover:border-yellow-600 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-yellow-300">Daily Practice Ready</div>
              <div className="text-sm text-yellow-600 mt-0.5">{reviewDueCount} question{reviewDueCount !== 1 ? 's' : ''} due for review</div>
            </div>
            <span className="text-yellow-400 text-xl">→</span>
          </div>
        </Link>
      )}

      {/* Level progress */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Progress by Level</h2>
        <div className="space-y-4">
          {levelProgress.map((lv) => (
            <Link key={lv.id} to={`/levels/${lv.id}`} className="block group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span>{lv.icon}</span>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    Level {lv.order_num}: {lv.title}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {lv.completed_lessons}/{lv.total_lessons}
                </span>
              </div>
              <ProgressBar
                value={lv.total_lessons > 0 ? (lv.completed_lessons / lv.total_lessons) * 100 : 0}
                color={lv.avg_mastery >= 70 ? 'green' : 'blue'}
                height="md"
              />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Weakest topics */}
        {weakestTopics.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Needs Review</h2>
            <div className="space-y-2">
              {weakestTopics.map((t) => (
                <Link key={t.id} to={`/lessons/${t.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0 hover:text-blue-400 transition-colors group">
                  <span className="text-sm text-gray-400 group-hover:text-blue-400">{t.title}</span>
                  <span className="text-xs font-medium text-red-400">{t.score}%</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Quiz Activity</h2>
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-sm text-gray-400 truncate mr-2">{a.lesson_title}</span>
                  <span className={`text-xs font-semibold flex-shrink-0 ${a.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {a.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top mastery */}
      {topMastery.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Top Mastered Topics</h2>
          <div className="flex flex-wrap gap-2">
            {topMastery.map((t, i) => (
              <span key={i} className="px-3 py-1 bg-emerald-900/30 border border-emerald-700/50 rounded-full text-xs text-emerald-300">
                {t.title} · {t.score}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
      <div className="text-xs text-gray-400 mt-1 font-medium">{label}</div>
    </div>
  );
}
