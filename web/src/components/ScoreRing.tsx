import { cn } from './ui';

export function ScoreRing({
  score,
  label,
  size = 96,
  className,
}: {
  score: number | null | undefined;
  label?: string;
  size?: number;
  className?: string;
}) {
  const value = score ?? 0;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  const colour =
    score == null
      ? '#64748b'
      : value >= 90
        ? '#34d399'
        : value >= 70
          ? '#fbbf24'
          : value >= 50
            ? '#fb923c'
            : '#fb7185';

  return (
    <div
      className={cn('relative inline-flex flex-col items-center', className)}
      style={{ width: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-ink">
          {score == null ? '-' : Math.round(value)}
        </span>
      </div>
      {label && (
        <span className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
      )}
    </div>
  );
}
