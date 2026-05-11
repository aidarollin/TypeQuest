const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function cellColor(value, max) {
  if (max === 0 || value === 0) return "var(--tq-bg-elev-2)";
  const t = value / max;
  if (t < 0.25) return "rgba(245,179,66,0.15)";
  if (t < 0.5)  return "rgba(245,179,66,0.35)";
  if (t < 0.75) return "rgba(245,179,66,0.6)";
  return "rgba(245,179,66,0.9)";
}

export default function HeatmapChart({ heatmap }) {
  if (!heatmap) return null;

  const max = Math.max(...heatmap.flat());

  return (
    <div style={{ overflowX: "auto" }}>
      <div className="tq-heatmap-grid">
        <div className="tq-heatmap-hours">
          <span />
          {HOURS.map(h => (
            <span key={h} style={{ textAlign: "center" }}>
              {h % 6 === 0 ? `${h}h` : ""}
            </span>
          ))}
        </div>
        {DAYS.map((day, di) => (
          <div key={day} className="tq-heatmap-row">
            <span className="tq-heatmap-day">{day}</span>
            {HOURS.map(h => {
              const v = heatmap[di]?.[h] ?? 0;
              return (
                <div
                  key={h}
                  className="tq-heatmap-cell"
                  style={{ background: cellColor(v, max) }}
                  title={v ? `${day} ${h}:00 — ${v} words` : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
