import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { journalApi } from '../api/client';

const MISTAKE_SUGGESTIONS = [
  'FOMO entry', 'Moved stop loss', 'No stop loss', 'Over-leveraged',
  'Ignored trend', 'Early exit', 'Chasing price', 'No trading plan',
  'Poor R:R', 'Revenge trade',
];

interface FormState {
  trade_date: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_reason: string;
  stop_loss: string;
  take_profit: string;
  entry_price: string;
  exit_price: string;
  planned_rr: string;
  actual_rr: string;
  result: 'win' | 'loss' | 'breakeven';
  notes: string;
  mistake_tags: string[];
}

const defaultForm = (): FormState => ({
  trade_date: new Date().toISOString().split('T')[0],
  symbol: '',
  direction: 'long',
  entry_reason: '',
  stop_loss: '',
  take_profit: '',
  entry_price: '',
  exit_price: '',
  planned_rr: '',
  actual_rr: '',
  result: 'win',
  notes: '',
  mistake_tags: [],
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 placeholder-gray-600';
const selectCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500';

export default function JournalEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(defaultForm());
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    journalApi.get(Number(id)).then((r) => {
      const e = r.data.entry;
      setForm({
        trade_date: e.trade_date ?? '',
        symbol: e.symbol ?? '',
        direction: e.direction ?? 'long',
        entry_reason: e.entry_reason ?? '',
        stop_loss: e.stop_loss != null ? String(e.stop_loss) : '',
        take_profit: e.take_profit != null ? String(e.take_profit) : '',
        entry_price: e.entry_price != null ? String(e.entry_price) : '',
        exit_price: e.exit_price != null ? String(e.exit_price) : '',
        planned_rr: e.planned_rr != null ? String(e.planned_rr) : '',
        actual_rr: e.actual_rr != null ? String(e.actual_rr) : '',
        result: e.result ?? 'win',
        notes: e.notes ?? '',
        mistake_tags: Array.isArray(e.mistake_tags) ? e.mistake_tags : [],
      });
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      mistake_tags: prev.mistake_tags.includes(tag)
        ? prev.mistake_tags.filter((t) => t !== tag)
        : [...prev.mistake_tags, tag],
    }));
  };

  const addCustomTag = () => {
    const tag = tagInput.trim();
    if (!tag || form.mistake_tags.includes(tag)) { setTagInput(''); return; }
    setForm((prev) => ({ ...prev, mistake_tags: [...prev.mistake_tags, tag] }));
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol.trim()) { setError('Symbol is required.'); return; }
    if (!form.trade_date) { setError('Trade date is required.'); return; }
    setError('');
    setSaving(true);

    const payload = {
      trade_date: form.trade_date,
      symbol: form.symbol.trim().toUpperCase(),
      direction: form.direction,
      entry_reason: form.entry_reason || undefined,
      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : undefined,
      take_profit: form.take_profit ? parseFloat(form.take_profit) : undefined,
      entry_price: form.entry_price ? parseFloat(form.entry_price) : undefined,
      exit_price: form.exit_price ? parseFloat(form.exit_price) : undefined,
      planned_rr: form.planned_rr ? parseFloat(form.planned_rr) : undefined,
      actual_rr: form.actual_rr ? parseFloat(form.actual_rr) : undefined,
      result: form.result,
      notes: form.notes || undefined,
      mistake_tags: form.mistake_tags,
    };

    try {
      if (isEdit && id) {
        await journalApi.update(Number(id), payload);
      } else {
        await journalApi.create(payload);
      }
      navigate('/journal');
    } catch {
      setError('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading entry…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/journal" className="hover:text-gray-300">Journal</Link>
        <span>/</span>
        <span className="text-gray-300">{isEdit ? 'Edit Trade' : 'New Trade'}</span>
      </div>

      <h1 className="text-xl font-bold text-white">{isEdit ? 'Edit Trade' : 'Log New Trade'}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Date + Symbol + Direction */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input type="date" value={form.trade_date} onChange={(e) => set('trade_date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Symbol">
            <input
              type="text" placeholder="e.g. EURUSD" value={form.symbol}
              onChange={(e) => set('symbol', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Direction">
            <select value={form.direction} onChange={(e) => set('direction', e.target.value as 'long' | 'short')} className={selectCls}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </Field>
        </div>

        {/* Row 2: Entry / Exit / SL / TP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Entry Price">
            <input type="number" step="any" placeholder="0.00" value={form.entry_price}
              onChange={(e) => set('entry_price', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Exit Price">
            <input type="number" step="any" placeholder="0.00" value={form.exit_price}
              onChange={(e) => set('exit_price', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Stop Loss">
            <input type="number" step="any" placeholder="0.00" value={form.stop_loss}
              onChange={(e) => set('stop_loss', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Take Profit">
            <input type="number" step="any" placeholder="0.00" value={form.take_profit}
              onChange={(e) => set('take_profit', e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* Row 3: R:R + Result */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Planned R:R">
            <input type="number" step="0.01" placeholder="e.g. 2.5" value={form.planned_rr}
              onChange={(e) => set('planned_rr', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Actual R:R">
            <input type="number" step="0.01" placeholder="e.g. 1.8" value={form.actual_rr}
              onChange={(e) => set('actual_rr', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Result">
            <select value={form.result} onChange={(e) => set('result', e.target.value as FormState['result'])} className={selectCls}>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </Field>
        </div>

        {/* Entry reason */}
        <Field label="Entry Reason">
          <textarea
            rows={3} placeholder="Why did you enter this trade? What setup did you see?"
            value={form.entry_reason} onChange={(e) => set('entry_reason', e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            rows={3} placeholder="Post-trade review, lessons learned…"
            value={form.notes} onChange={(e) => set('notes', e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </Field>

        {/* Mistake tags */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Mistake Tags</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {MISTAKE_SUGGESTIONS.map((tag) => (
              <button
                key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.mistake_tags.includes(tag)
                    ? 'bg-red-900/40 border-red-700 text-red-300'
                    : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {/* Custom tag input */}
          <div className="flex gap-2">
            <input
              type="text" placeholder="Custom tag…" value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            <button
              type="button" onClick={addCustomTag}
              className="px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
            >
              Add
            </button>
          </div>
          {/* Selected custom tags */}
          {form.mistake_tags.filter((t) => !MISTAKE_SUGGESTIONS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.mistake_tags.filter((t) => !MISTAKE_SUGGESTIONS.includes(t)).map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-900/30 border border-red-800/50 text-red-300">
                  {tag}
                  <button type="button" onClick={() => toggleTag(tag)} className="text-red-500 hover:text-red-300 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Link
            to="/journal"
            className="flex-1 py-3 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Trade'}
          </button>
        </div>
      </form>
    </div>
  );
}
