import { useBadges } from "../hooks/useBadges.js";
import BadgeGrid from "../components/BadgeGrid.jsx";

export default function Badges() {
  const { data, isLoading } = useBadges();

  if (isLoading) return <div className="tq-loading">Loading badges…</div>;

  const { badges = [], totalUnlocked = 0 } = data ?? {};

  return (
    <div>
      <div className="tq-page-head">
        <div>
          <h2 className="tq-page-title">Badges</h2>
          <p className="tq-page-sub">
            {totalUnlocked} of {badges.length} earned
          </p>
        </div>
      </div>
      {badges.length === 0 ? (
        <div className="tq-empty">
          No badges found. Start typing to unlock your first one!
        </div>
      ) : (
        <BadgeGrid badges={badges} />
      )}
    </div>
  );
}
