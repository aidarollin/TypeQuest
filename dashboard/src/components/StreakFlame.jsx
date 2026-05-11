export default function StreakFlame({ days }) {
  const cls =
    days >= 30 ? "tq-streak-legendary"
    : days >= 7  ? "tq-streak-hot"
    : days >= 1  ? "tq-streak-warm"
    : "";

  const flame =
    days >= 30 ? "🔥"
    : days >= 7  ? "🔥"
    : days >= 1  ? "🔥"
    : "·";

  return (
    <div className={`tq-streak ${cls}`}>
      <span className="tq-streak-flame">{flame}</span>
      <div>
        <div className="tq-streak-days">{days}</div>
        <div className="tq-streak-label">day streak</div>
      </div>
    </div>
  );
}
