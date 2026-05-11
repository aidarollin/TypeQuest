import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import { formatDate } from "../utils/format.js";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--tq-bg-elev-2)", border: "1px solid var(--tq-border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 13
    }}>
      <div style={{ color: "var(--tq-text-dim)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--tq-accent)", fontFamily: "var(--tq-font-mono)", fontWeight: 600 }}>
        {payload[0].value.toLocaleString()} words
      </div>
    </div>
  );
}

export default function DailyChart({ series = [] }) {
  const data = series.map(d => ({
    date: formatDate(d.date),
    words: d.words
  }));

  if (!data.length) {
    return (
      <div className="tq-empty">No data yet. Start typing in any document.</div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--tq-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--tq-text-muted)", fontSize: 11 }}
          axisLine={false} tickLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          tick={{ fill: "var(--tq-text-muted)", fontSize: 11 }}
          axisLine={false} tickLine={false} width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(245,179,66,0.08)" }} />
        <Bar dataKey="words" fill="var(--tq-accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
