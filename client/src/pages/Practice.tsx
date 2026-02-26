import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { practiceApi, Question } from '../api/client';
import CandlestickChart, { CandleData } from '../components/CandlestickChart';

type PracticeQuestion = Question & { queue_id?: number; lesson_id: number; lesson_title: string };
type AnswerResult = { questionId: number; isCorrect: boolean; correctAnswer: string; explanation: string };

export default function Practice() {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState('');
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [allResults, setAllResults] = useState<Array<{ questionId: number; queueId?: number; answer: string }>>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; correctCount: number; total: number; results: AnswerResult[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    practiceApi.getDaily().then((r) => {
      setQuestions(r.data.questions);
      setTotalDue(r.data.totalDue);
    }).finally(() => setLoading(false));
  }, []);

  const q = questions[current];

  const checkAnswer = () => {
    if (!q || !selected) return;
    const isCorrect = q.correct_answer
      ? q.correct_answer.toLowerCase().trim() === selected.toLowerCase().trim()
      : false;
    setChecked(true);
    setResult({
      questionId: q.question_id ?? q.id,
      isCorrect,
      correctAnswer: q.correct_answer ?? '',
      explanation: q.explanation ?? '',
    });
  };

  const next = () => {
    const ans = { questionId: q.question_id ?? q.id, queueId: q.queue_id, answer: selected };
    const updated = [...allResults, ans];
    setAllResults(updated);
    setSelected('');
    setChecked(false);
    setResult(null);

    if (current + 1 >= questions.length) {
      // Submit all
      practiceApi.submit({ answers: updated }).then((r) => {
        setFinalScore(r.data);
        setSessionDone(true);
      });
    } else {
      setCurrent((c) => c + 1);
    }
  };

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading practice session…</div>;

  if (questions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-white mb-2">All caught up!</h2>
        <p className="text-gray-400 mb-6">No questions due for review today. Come back tomorrow.</p>
        <Link to="/levels" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors">
          Continue Learning
        </Link>
      </div>
    );
  }

  if (sessionDone && finalScore) {
    return (
      <div className="max-w-lg mx-auto text-center py-10 space-y-5">
        <div className={`text-6xl font-bold ${finalScore.score >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {finalScore.score}%
        </div>
        <div className="text-lg font-semibold text-white">Practice Complete</div>
        <p className="text-gray-400 text-sm">{finalScore.correctCount} of {finalScore.total} correct</p>
        <div className="space-y-2 text-left">
          {finalScore.results.map((r) => (
            <div key={r.questionId} className={`px-4 py-3 rounded-lg border text-sm ${r.isCorrect ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300' : 'border-red-700/50 bg-red-900/20 text-red-300'}`}>
              {r.isCorrect ? '✓' : '✗'} {r.explanation}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard" className="flex-1 py-3 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-gray-200 transition-colors text-center">
            Dashboard
          </Link>
          <Link to="/levels" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors text-center">
            Continue Learning
          </Link>
        </div>
      </div>
    );
  }

  const options = q.type === 'true_false' ? ['true', 'false'] : (q.options ?? []);
  const optionLabels: Record<string, string> = { true: 'True', false: 'False' };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${((current) / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-500">{current + 1} / {questions.length}</span>
      </div>

      <div className="text-xs text-gray-500">
        From: <span className="text-gray-400">{q.lesson_title}</span>
        {totalDue > questions.length && <span className="ml-2 text-yellow-600"> · {totalDue} total due</span>}
      </div>

      {/* Question card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <p className="text-gray-100 leading-relaxed">{q.question_text}</p>

        {q.type === 'visual' && q.visual_config && (q.visual_config as { data?: CandleData[] }).data && (
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <CandlestickChart data={(q.visual_config as { data: CandleData[] }).data} height={200} />
          </div>
        )}

        <div className="space-y-2">
          {options.map((opt) => {
            let style = 'border-gray-700 text-gray-300 hover:border-blue-500';
            if (checked) {
              const isCorrect = opt.toLowerCase().trim() === result?.correctAnswer.toLowerCase().trim();
              const isUser = opt === selected;
              if (isCorrect) style = 'border-emerald-500 bg-emerald-900/30 text-emerald-300';
              else if (isUser) style = 'border-red-500 bg-red-900/30 text-red-300';
              else style = 'border-gray-800 text-gray-600';
            } else if (selected === opt) {
              style = 'border-blue-500 bg-blue-900/20 text-blue-300';
            }

            return (
              <button
                key={opt}
                disabled={checked}
                onClick={() => setSelected(opt)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${style}`}
              >
                {optionLabels[opt] ?? opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {checked && result && (
          <div className={`p-3 rounded-lg text-sm ${result.isCorrect ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
            {result.explanation}
          </div>
        )}
      </div>

      {/* Action button */}
      {!checked ? (
        <button
          onClick={checkAnswer}
          disabled={!selected}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={next}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-colors"
        >
          {current + 1 >= questions.length ? 'Finish Session' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}
