import { titleForLevel } from "../utils/levels.js";

export default function LevelUpModal({ level, newBadges = [], onClose }) {
  if (!level) return null;

  return (
    <div className="tq-modal-backdrop" onClick={onClose}>
      <div className="tq-modal tq-levelup" onClick={e => e.stopPropagation()}>
        <div className="tq-levelup-glow" />
        <div className="tq-levelup-eyebrow">✨ LEVEL UP ✨</div>
        <div className="tq-levelup-number">{level}</div>
        <div className="tq-levelup-title">{titleForLevel(level)}</div>
        {newBadges.length > 0 && (
          <div className="tq-levelup-blurb">
            New badges: {newBadges.map(b => b.icon).join(" ")}
          </div>
        )}
        <button className="tq-btn tq-btn-primary" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
