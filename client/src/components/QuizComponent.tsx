import { useState } from 'react';
import { Question, QuizAnswer } from '../api/client';
import CandlestickChart, { CandleData } from './CandlestickChart';

interface AnswerResult {
  questionId: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface QuizComponentProps {
  questions: Question[];
  lessonId: number;
  onSubmit: (answers: QuizAnswer[]) => Promise<void>;
  results?: AnswerResult[];
  score?: number;
  passed?: boolean;
  loading?: boolean;
}

export default function QuizComponent({
  questions,
  onSubmit,
  results,
  score,
  passed,
  loading,
}: QuizComponentProps) {
  const [selected, setSelected] = useState<Record<number, string>>({});

  const handleSelect = (qId: number, value: string) => {
    if (results) return; // locked after submission
    setSelected((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = () => {
    const answers: QuizAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: selected[q.id] ?? '',
    }));
    onSubmit(answers);
  };

  const allAnswered = questions.every((q) => selected[q.id]);

  return (
    <div className="space-y-6">
      {/* Score banner */}
      {results && score !== undefined && (
        <div className={`rounded-xl p-4 flex items-center gap-4 ${passed ? 'bg-emerald-900/40 border border-emerald-700' : 'bg-red-900/40 border border-red-700'}`}>
          <div className={`text-3xl font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>{score}%</div>
          <div>
            <div className={`font-semibold ${passed ? 'text-emerald-300' : 'text-red-300'}`}>
              {passed ? '✓ Passed' : '✗ Below 70% — added to review queue'}
            </div>
            <div className="text-sm text-gray-400">
              {results.filter((r) => r.isCorrect).length} / {results.length} correct
            </div>
          </div>
        </div>
      )}

      {questions.map((q, qi) => {
        const result = results?.find((r) => r.questionId === q.id);
        const userAns = selected[q.id];

        return (
          <div
            key={q.id}
            className={`bg-gray-900 rounded-xl p-5 border ${
              result
                ? result.isCorrect
                  ? 'border-emerald-700/60'
                  : 'border-red-700/60'
                : 'border-gray-800'
            }`}
          >
            {/* Question number + text */}
            <div className="flex gap-3 mb-4">
              <span className="flex-shrink-0 text-xs font-bold text-gray-500 mt-0.5">Q{qi + 1}</span>
              <p className="text-sm text-gray-100 leading-relaxed">{q.question_text}</p>
            </div>

            {/* Visual chart for visual-type questions */}
            {q.type === 'visual' && q.visual_config && (q.visual_config as { data?: CandleData[] }).data && (
              <div className="mb-4 rounded-lg overflow-hidden border border-gray-700">
                <CandlestickChart
                  data={(q.visual_config as { data: CandleData[] }).data}
                  height={200}
                />
              </div>
            )}

            {/* Options */}
            <div className="space-y-2">
              {q.type === 'true_false' ? (
                ['true', 'false'].map((opt) => (
                  <OptionButton
                    key={opt}
                    value={opt}
                    label={opt === 'true' ? 'True' : 'False'}
                    selected={userAns === opt}
                    result={result}
                    onClick={() => handleSelect(q.id, opt)}
                  />
                ))
              ) : (
                (q.options ?? []).map((opt) => (
                  <OptionButton
                    key={opt}
                    value={opt}
                    label={opt}
                    selected={userAns === opt}
                    result={result}
                    onClick={() => handleSelect(q.id, opt)}
                  />
                ))
              )}
            </div>

            {/* Explanation after submission */}
            {result && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${result.isCorrect ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                {!result.isCorrect && (
                  <p className="font-medium mb-1">
                    Correct answer: <span className="text-gray-100">{result.correctAnswer}</span>
                  </p>
                )}
                <p className="text-gray-400 text-xs">{result.explanation}</p>
              </div>
            )}
          </div>
        );
      })}

      {!results && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting…' : !allAnswered ? 'Answer all questions to submit' : 'Submit Quiz'}
        </button>
      )}
    </div>
  );
}

interface OptionButtonProps {
  value: string;
  label: string;
  selected: boolean;
  result?: { userAnswer: string; correctAnswer: string; isCorrect: boolean } | undefined;
  onClick: () => void;
}

function OptionButton({ value, label, selected, result, onClick }: OptionButtonProps) {
  let style = 'border-gray-700 text-gray-300 hover:border-blue-500 hover:text-gray-100';

  if (result) {
    const isCorrect = value.toLowerCase().trim() === result.correctAnswer.toLowerCase().trim();
    const isUserChoice = value === result.userAnswer;
    if (isCorrect) style = 'border-emerald-500 bg-emerald-900/30 text-emerald-300';
    else if (isUserChoice && !result.isCorrect) style = 'border-red-500 bg-red-900/30 text-red-300';
    else style = 'border-gray-800 text-gray-600';
  } else if (selected) {
    style = 'border-blue-500 bg-blue-900/30 text-blue-300';
  }

  return (
    <button
      onClick={onClick}
      disabled={!!result}
      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${style}`}
    >
      {label}
    </button>
  );
}
