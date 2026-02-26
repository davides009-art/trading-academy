import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { drillsApi, Drill } from '../api/client';
import CandlestickChart, { CandleData, ChartOverlay } from '../components/CandlestickChart';

type MarkType = 'support' | 'resistance' | 'liquidity' | 'swing_high' | 'swing_low' | 'bos';

interface UserMark {
  id: number;
  markType: MarkType;
  priceFrom?: number;
  priceTo?: number;
  price?: number;
  direction?: 'bullish' | 'bearish';
}

const ZONE_TYPES: MarkType[] = ['support', 'resistance', 'liquidity'];
const POINT_TYPES: MarkType[] = ['swing_high', 'swing_low', 'bos'];
const isZone = (t: MarkType) => ZONE_TYPES.includes(t);

const typeColors: Record<MarkType, string> = {
  support: '#10b981',
  resistance: '#ef4444',
  liquidity: '#f59e0b',
  swing_high: '#3b82f6',
  swing_low: '#8b5cf6',
  bos: '#ec4899',
};

type FeedbackItem = { element: string; correct: boolean; explanation: string };
type AnswerZone = { type: string; priceFrom: number; priceTo: number };
type AnswerPoint = { type: string; price: number; barIndex: number; direction?: string };
type AnswerSet = { zones?: AnswerZone[]; points?: AnswerPoint[]; description: string };

export default function DrillDetail() {
  const { id } = useParams<{ id: string }>();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [marks, setMarks] = useState<UserMark[]>([]);
  const [nextId, setNextId] = useState(1);
  const [markType, setMarkType] = useState<MarkType>('support');
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDir, setFormDir] = useState<'bullish' | 'bearish'>('bullish');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: FeedbackItem[]; answerSet: AnswerSet; assisted: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Hints + reveal state
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const hasHints = !!(drill?.hint1_text || drill?.hint2_text);

  useEffect(() => {
    if (!id) return;
    drillsApi.get(Number(id)).then((r) => setDrill(r.data.drill)).finally(() => setLoading(false));
  }, [id]);

  // Dev-only: verify all answer prices are within the chart's candle range
  useEffect(() => {
    if (!import.meta.env.DEV || !drill) return;
    const candles = (drill.chart_config as { data?: CandleData[] }).data;
    if (!candles?.length) return;
    const minLow  = Math.min(...candles.map((c) => c.low));
    const maxHigh = Math.max(...candles.map((c) => c.high));
    const answerSet = drill.answer_set as unknown as AnswerSet;
    answerSet.zones?.forEach((z) => {
      if (z.priceFrom < minLow || z.priceFrom > maxHigh)
        console.error(`[DrillValidation] "${drill.title}" zone priceFrom ${z.priceFrom} outside chart range [${minLow}, ${maxHigh}]`);
      if (z.priceTo < minLow || z.priceTo > maxHigh)
        console.error(`[DrillValidation] "${drill.title}" zone priceTo ${z.priceTo} outside chart range [${minLow}, ${maxHigh}]`);
    });
    answerSet.points?.forEach((p) => {
      if (p.price < minLow || p.price > maxHigh)
        console.error(`[DrillValidation] "${drill.title}" point price ${p.price} outside chart range [${minLow}, ${maxHigh}]`);
    });
  }, [drill]);

  const addMark = () => {
    if (isZone(markType)) {
      const from = parseFloat(formFrom);
      const to = parseFloat(formTo);
      if (isNaN(from) || isNaN(to) || from >= to) return;
      setMarks((prev) => [...prev, { id: nextId, markType, priceFrom: from, priceTo: to }]);
    } else {
      const price = parseFloat(formPrice);
      if (isNaN(price)) return;
      setMarks((prev) => [...prev, { id: nextId, markType, price, direction: formDir }]);
    }
    setNextId((n) => n + 1);
    setFormFrom(''); setFormTo(''); setFormPrice('');
  };

  const removeMark = (markId: number) => setMarks((prev) => prev.filter((m) => m.id !== markId));

  const handleHint = () => {
    if (hintsUsed < 2) setHintsUsed((n) => n + 1);
  };

  const handleReveal = () => setRevealed(true);

  const handleSubmit = async () => {
    if (!drill || !marks.length) return;
    setSubmitting(true);
    try {
      const user_input = {
        zones: marks.filter((m) => isZone(m.markType)).map((m) => ({
          type: m.markType, priceFrom: m.priceFrom!, priceTo: m.priceTo!,
        })),
        points: marks.filter((m) => POINT_TYPES.includes(m.markType)).map((m) => ({
          type: m.markType, price: m.price!, direction: m.direction,
        })),
      };
      const { data } = await drillsApi.submit(Number(id), user_input, hintsUsed, revealed);
      setResult({
        score: data.score,
        feedback: data.feedback,
        answerSet: data.answerSet as AnswerSet,
        assisted: data.assisted,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setResult(null);
    setMarks([]);
    setHintsUsed(0);
    setRevealed(false);
  };

  // Build chart overlays from user marks
  const overlays: ChartOverlay[] = [];
  marks.forEach((m) => {
    const color = typeColors[m.markType];
    if (isZone(m.markType)) {
      overlays.push({ type: 'zone_top', price: m.priceTo!, color, label: `${m.markType} top`, dashed: true });
      overlays.push({ type: 'zone_bottom', price: m.priceFrom!, color, label: `${m.markType} btm`, dashed: true });
    } else if (m.price !== undefined) {
      overlays.push({ type: 'level', price: m.price, color, label: m.markType });
    }
  });

  // Answer overlays shown after reveal or after submission
  const showAnswerOverlay = revealed || submitted;
  const answerSetForOverlay = submitted
    ? result?.answerSet
    : (drill?.answer_set as AnswerSet | undefined);

  if (showAnswerOverlay && answerSetForOverlay) {
    answerSetForOverlay.zones?.forEach((z) => {
      overlays.push({ type: 'zone_top', price: z.priceTo, color: '#22d3ee', label: `✓ ${z.type}`, dashed: false });
      overlays.push({ type: 'zone_bottom', price: z.priceFrom, color: '#22d3ee', label: '', dashed: false });
    });
    answerSetForOverlay.points?.forEach((p) => {
      overlays.push({ type: 'level', price: p.price, color: '#22d3ee', label: `✓ ${p.type}` });
    });
  }

  const chartData = drill?.chart_config && (drill.chart_config as { data?: CandleData[] }).data;

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading drill…</div>;
  if (!drill || !chartData) return <div className="text-red-400 py-10 text-center">Drill not found.</div>;

  const explanation = drill.explanation;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/drills" className="hover:text-gray-300">Drills</Link>
        <span>/</span>
        <span className="text-gray-300">{drill.title}</span>
      </div>

      <h1 className="text-xl font-bold text-white">{drill.title}</h1>
      <p className="text-gray-400 text-sm">{drill.description}</p>

      {/* Chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <CandlestickChart data={chartData} overlays={overlays} height={360} />
      </div>

      {/* Explanation panel — shown after reveal, before submission */}
      {revealed && !submitted && explanation && explanation.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-cyan-800/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-cyan-400">Answer Explanation</h3>
          <ul className="space-y-1.5">
            {explanation.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-cyan-500 flex-shrink-0">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitted && result ? (
        /* ── Results panel ─────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className={`rounded-xl p-5 border flex items-center gap-4 ${result.score >= 70 ? 'border-emerald-700 bg-emerald-900/20' : 'border-red-700 bg-red-900/20'}`}>
            <div className={`text-4xl font-bold ${result.score >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.score}%
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {result.score >= 70 ? 'Well done!' : 'Keep practicing'}
                </span>
                {result.assisted && (
                  <span className="text-xs font-medium text-cyan-400 bg-cyan-900/30 border border-cyan-800/50 px-2 py-0.5 rounded">
                    Assisted
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400">Cyan lines show the correct answer zones on the chart above</div>
            </div>
          </div>

          <div className="space-y-2">
            {result.feedback.map((fb, i) => (
              <div key={i} className={`px-4 py-3 rounded-lg border text-sm ${fb.correct ? 'border-emerald-700/50 bg-emerald-900/10 text-emerald-300' : 'border-red-700/50 bg-red-900/10 text-red-300'}`}>
                {fb.correct ? '✓' : '✗'} {fb.explanation}
              </div>
            ))}
          </div>

          {/* Explanation always shown in results if available */}
          {explanation && explanation.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-cyan-800/50 p-5 space-y-2">
              <h3 className="text-sm font-semibold text-cyan-400">Answer Explanation</h3>
              <ul className="space-y-1.5">
                {explanation.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-cyan-500 flex-shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        /* ── Marking panel ─────────────────────────────────────────────────── */
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <h2 className="font-semibold text-gray-300 text-sm">Add Marks</h2>

          {/* Type selector */}
          <div className="flex flex-wrap gap-2">
            {([...ZONE_TYPES, ...POINT_TYPES] as MarkType[]).map((t) => (
              <button
                key={t}
                onClick={() => setMarkType(t)}
                style={{ borderColor: markType === t ? typeColors[t] : undefined, color: markType === t ? typeColors[t] : undefined }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  markType === t ? 'bg-gray-800' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Input fields */}
          <div className="flex gap-2 flex-wrap">
            {isZone(markType) ? (
              <>
                <input type="number" placeholder="Price from" value={formFrom}
                  onChange={(e) => setFormFrom(e.target.value)}
                  className="flex-1 min-w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500" />
                <input type="number" placeholder="Price to" value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                  className="flex-1 min-w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500" />
              </>
            ) : (
              <>
                <input type="number" placeholder="Price level" value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="flex-1 min-w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500" />
                {markType === 'bos' && (
                  <select value={formDir} onChange={(e) => setFormDir(e.target.value as 'bullish' | 'bearish')}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none">
                    <option value="bullish">Bullish</option>
                    <option value="bearish">Bearish</option>
                  </select>
                )}
              </>
            )}
            <button onClick={addMark}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
              + Add
            </button>
          </div>

          {/* Mark list */}
          {marks.length > 0 && (
            <div className="space-y-2">
              {marks.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: typeColors[m.markType] }} className="text-xs font-bold uppercase">
                      {m.markType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {isZone(m.markType) ? `${m.priceFrom} – ${m.priceTo}` : `@ ${m.price}${m.direction ? ` (${m.direction})` : ''}`}
                    </span>
                  </div>
                  <button onClick={() => removeMark(m.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* ── Hints + Reveal ──────────────────────────────────────────────── */}
          {hasHints && (
            <div className="border-t border-gray-800 pt-4 space-y-3">
              {/* Hint callouts */}
              {hintsUsed >= 1 && drill.hint1_text && (
                <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
                  <span className="font-semibold text-amber-400 mr-1.5">Hint 1:</span>
                  {drill.hint1_text}
                </div>
              )}
              {hintsUsed >= 2 && drill.hint2_text && (
                <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
                  <span className="font-semibold text-amber-400 mr-1.5">Hint 2:</span>
                  {drill.hint2_text}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {/* Hint button — visible until both hints are used */}
                {hintsUsed < 2 && (
                  <button
                    onClick={handleHint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-700/60 text-amber-400 text-sm hover:bg-amber-900/30 transition-colors"
                  >
                    <span>Hint</span>
                    <span className="text-xs opacity-70">{hintsUsed}/2</span>
                  </button>
                )}

                {/* Reveal Answer — only unlocks after both hints used */}
                {hintsUsed < 2 && (
                  <span className="text-xs text-gray-600">Use both hints to unlock Reveal Answer</span>
                )}
                {hintsUsed >= 2 && !revealed && (
                  <button
                    onClick={handleReveal}
                    className="px-3 py-1.5 rounded-lg border border-cyan-700/60 text-cyan-400 text-sm hover:bg-cyan-900/30 transition-colors"
                  >
                    Reveal Answer
                  </button>
                )}
                {revealed && (
                  <span className="text-xs text-cyan-500">Answer shown on chart above</span>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={marks.length === 0 || submitting}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
          >
            {submitting ? 'Scoring…' : marks.length === 0 ? 'Add at least one mark to submit' : 'Submit Drill'}
          </button>
        </div>
      )}
    </div>
  );
}
