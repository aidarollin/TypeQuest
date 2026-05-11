// Circular SVG progress ring. size controls the outer diameter.
export default function LevelRing({ level, pct, size = 160 }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(100, pct)) / 100;
  const cx = size / 2;

  return (
    <div className="tq-level-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="var(--tq-bg-elev-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="url(#tq-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
        <defs>
          <linearGradient id="tq-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--tq-accent-cool)" />
            <stop offset="100%" stopColor="var(--tq-accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="tq-level-ring-inner">
        <span className="tq-level-ring-label">LEVEL</span>
        <span className="tq-level-ring-number">{level}</span>
      </div>
    </div>
  );
}
