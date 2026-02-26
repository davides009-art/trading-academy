interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  showLabel?: boolean;
  height?: 'sm' | 'md';
  className?: string;
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  showLabel = false,
  height = 'sm',
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-gray-800 rounded-full overflow-hidden ${height === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`${colorMap[color]} h-full rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 w-9 text-right">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
