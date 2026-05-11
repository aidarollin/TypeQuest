import { formatDate } from "../utils/format.js";

const TIER_LABELS = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum"
};

export default function BadgeCard({ badge }) {
  const { name, description, icon, tier, unlocked, unlockedAt } = badge;

  return (
    <div className={`tq-badge-card ${unlocked ? "is-unlocked" : "is-locked"}`}>
      {!unlocked && <span className="tq-badge-lock">🔒</span>}
      <div className="tq-badge-icon">{icon}</div>
      <div className="tq-badge-name">{name}</div>
      <div className="tq-badge-desc">{description}</div>
      <div className="tq-badge-foot">
        <span style={{ color: tierColor(tier) }}>{TIER_LABELS[tier] ?? tier}</span>
        {unlocked && unlockedAt && (
          <span>{formatDate(unlockedAt)}</span>
        )}
      </div>
    </div>
  );
}

function tierColor(tier) {
  switch (tier) {
    case "platinum": return "var(--tq-accent-cool)";
    case "gold":     return "var(--tq-accent)";
    case "silver":   return "var(--tq-text-dim)";
    default:         return "#cd7f32";
  }
}
