import { formatWords } from "../utils/format.js";

export default function XPBar({ xp, xpForNext, pct }) {
  return (
    <div className="tq-xpbar">
      <div className="tq-xpbar-meta">
        <span className="tq-xpbar-label">{formatWords(xp)} XP</span>
        <span>
          <span className="tq-xpbar-sep">/</span>
          <span className="tq-xpbar-next"> {formatWords(xpForNext)} to next</span>
        </span>
      </div>
      <div className="tq-xpbar-track">
        <div className="tq-xpbar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
