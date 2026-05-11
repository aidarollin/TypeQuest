import BadgeCard from "./BadgeCard.jsx";

const CATEGORY_LABELS = {
  volume:      "Volume",
  speed:       "Speed",
  consistency: "Consistency",
  milestone:   "Milestone",
  fun:         "Fun"
};

export default function BadgeGrid({ badges = [] }) {
  const groups = badges.reduce((acc, b) => {
    const cat = b.category || "milestone";
    (acc[cat] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="tq-badge-groups">
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <div className="tq-badge-group-title">
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
          <div className="tq-badge-grid">
            {items.map(b => <BadgeCard key={b.code} badge={b} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
