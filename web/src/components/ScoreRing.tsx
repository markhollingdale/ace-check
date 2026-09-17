import { scoreTone } from '../lib/format';

export function ScoreRing({
  value,
  label,
  size = 72,
}: {
  value: number | null;
  label: string;
  size?: number;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value == null ? 0 : value / 100;
  const dash = circumference * pct;

  const color =
    value == null
      ? '#cbd5e1'
      : value >= 90
        ? '#10b981'
        : value >= 50
          ? '#f59e0b'
          : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-xl font-bold ${scoreTone(value)}`}
          >
            {value ?? '—'}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}
