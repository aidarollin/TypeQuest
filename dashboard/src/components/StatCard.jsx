export default function StatCard({ label, value, icon, sub, trend }) {
  const trendClass = trend > 0 ? "is-up" : trend < 0 ? "is-down" : "";

  return (
    <div className="tq-card tq-stat-card">
      <div className="tq-stat-head">
        <span className="tq-stat-label">{label}</span>
        {icon && <span className="tq-stat-icon">{icon}</span>}
      </div>
      <div className="tq-stat-value">{value}</div>
      <div className="tq-stat-foot">
        {sub && <span className="tq-stat-sub">{sub}</span>}
        {trend != null && (
          <span className={`tq-stat-trend ${trendClass}`}>
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
    </div>
  );
}
