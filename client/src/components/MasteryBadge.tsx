interface MasteryBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md';
}

function getMasteryLabel(score: number) {
  if (score >= 90) return { label: 'Expert', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
  if (score >= 70) return { label: 'Proficient', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
  if (score >= 40) return { label: 'Learning', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (score > 0)   return { label: 'Beginner', color: 'text-gray-400 bg-gray-700/50 border-gray-600' };
  return { label: 'Not started', color: 'text-gray-600 bg-gray-800 border-gray-700' };
}

export default function MasteryBadge({ score, size = 'sm' }: MasteryBadgeProps) {
  const { label, color } = getMasteryLabel(score);
  return (
    <span
      className={`inline-flex items-center border rounded-full font-medium ${color} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      }`}
    >
      {score > 0 && <span className="mr-1">{score}%</span>}
      {label}
    </span>
  );
}
