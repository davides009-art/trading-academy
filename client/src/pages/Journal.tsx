import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { journalApi, JournalEntry } from '../api/client';

interface JournalStats {
  total_trades: string;
  wins: string;
  losses: string;
  breakevens: string;
  win_rate: string;
  avg_planned_rr: string | null;
  avg_actual_rr: string | null;
}
interface StatsResponse {
  stats: JournalStats;
  topMistakeTags: Array<{ tag: string; count: string }>;
  recentTrades: JournalEntry[];
}

const directionColor = { long: 'text-emerald-400', short: 'text-red-400' };
const resultColor = { win: 'text-emerald-400', loss: 'text-red-400', breakeven: 'text-yellow-400' };
const resultBg = { win: 'bg-emerald-900/20 border-emerald-800', loss: 'bg-red-900/20 border-red-800', breakeven: 'bg-yellow-900/20 border-yellow-800' };

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [statsResp, setStatsResp] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([
      journalApi.getAll(),
      journalApi.getStats(),
    ]).then(([entriesRes, statsRes]) => {
      setEntries(entriesRes.data.entries);
      setStatsResp(statsRes.data as unknown as StatsResponse);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this journal entry?')) return;
    setDeleting(id);
    try {
      await journalApi.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading journal…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
          <p className="text-gray-400 text-sm mt-1">Track and analyse your trades over time.</p>
        </div>
        <Link
          to="/journal/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
        >
          + New Trade
        </Link>
      </div>

      {/* Stats row */}
      {statsResp && (() => {
        const s = statsResp.stats;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Win Rate"
              value={Number(s.total_trades) > 0 ? `${Number(s.win_rate).toFixed(0)}%` : '—'}
              sub={`${s.wins}W / ${s.losses}L / ${s.breakevens}BE`}
            />
            <StatCard
              label="Avg Planned R:R"
              value={s.avg_planned_rr != null ? `${Number(s.avg_planned_rr).toFixed(2)}R` : '—'}
            />
            <StatCard
              label="Avg Actual R:R"
              value={s.avg_actual_rr != null ? `${Number(s.avg_actual_rr).toFixed(2)}R` : '—'}
            />
            <StatCard
              label="Total Trades"
              value={String(s.total_trades)}
              sub="last 30 days"
            />
          </div>
        );
      })()}

      {/* Top mistake tags */}
      {statsResp && statsResp.topMistakeTags.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
          <div className="text-xs font-semibold text-red-400 mb-2">⚠ Most Common Mistakes</div>
          <div className="flex flex-wrap gap-2">
            {statsResp.topMistakeTags.map((m) => (
              <span key={m.tag} className="text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-800/50">
                {m.tag} <span className="opacity-60">×{m.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📓</div>
          <div className="font-medium text-gray-400 mb-1">No trades logged yet</div>
          <div className="text-sm mb-5">Start tracking your trades to see performance stats.</div>
          <Link
            to="/journal/new"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors"
          >
            Log First Trade
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border p-4 transition-all ${resultBg[entry.result as keyof typeof resultBg] ?? 'bg-gray-900 border-gray-800'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white text-sm">{entry.symbol}</span>
                    <span className={`text-xs font-semibold uppercase ${directionColor[entry.direction as keyof typeof directionColor]}`}>
                      {entry.direction}
                    </span>
                    <span className={`text-xs font-bold ${resultColor[entry.result as keyof typeof resultColor]}`}>
                      {entry.result.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{entry.trade_date}</span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-2">
                    {entry.entry_price != null && (
                      <span>Entry: <span className="text-gray-200">{entry.entry_price}</span></span>
                    )}
                    {entry.exit_price != null && (
                      <span>Exit: <span className="text-gray-200">{entry.exit_price}</span></span>
                    )}
                    {entry.planned_rr != null && (
                      <span>Planned R: <span className="text-gray-200">{Number(entry.planned_rr).toFixed(2)}R</span></span>
                    )}
                    {entry.actual_rr != null && (
                      <span>
                        Actual R:{' '}
                        <span className={Number(entry.actual_rr) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {Number(entry.actual_rr).toFixed(2)}R
                        </span>
                      </span>
                    )}
                  </div>

                  {entry.entry_reason && (
                    <p className="text-xs text-gray-500 truncate">{entry.entry_reason}</p>
                  )}

                  {entry.mistake_tags && (entry.mistake_tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(entry.mistake_tags as string[]).map((tag) => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/journal/${entry.id}`)}
                    className="text-xs text-gray-500 hover:text-gray-200 px-2 py-1 rounded transition-colors border border-transparent hover:border-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="text-xs text-gray-600 hover:text-red-400 px-2 py-1 rounded transition-colors border border-transparent hover:border-red-900/50 disabled:opacity-40"
                  >
                    {deleting === entry.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
