import { useState, useEffect, useRef } from "react";
import { useOverview, useRange } from "../hooks/useStats.js";
import LevelRing from "../components/LevelRing.jsx";
import XPBar from "../components/XPBar.jsx";
import StatCard from "../components/StatCard.jsx";
import StreakFlame from "../components/StreakFlame.jsx";
import DailyChart from "../components/DailyChart.jsx";
import HeatmapChart from "../components/HeatmapChart.jsx";
import BadgeUnlockToast from "../components/BadgeUnlockToast.jsx";
import LevelUpModal from "../components/LevelUpModal.jsx";
import { formatWords, formatDuration } from "../utils/format.js";
import { titleForLevel } from "../utils/levels.js";

export default function Dashboard() {
  const { data: overview, isLoading } = useOverview();
  const [period, setPeriod] = useState("30");
  const { data: rangeData } = useRange(period);

  const [pendingBadge, setPendingBadge] = useState(null);
  const [pendingLevel, setPendingLevel] = useState(null);
  const prevLevel = useRef(null);
  const prevBadgeCount = useRef(null);

  // Detect level-ups and new badge unlocks between polls
  useEffect(() => {
    if (!overview) return;
    if (prevLevel.current !== null && overview.level > prevLevel.current) {
      setPendingLevel(overview.level);
    }
    if (prevBadgeCount.current !== null && overview.totalBadges > prevBadgeCount.current) {
      const newest = overview.recentBadges[0];
      if (newest) setPendingBadge(newest);
    }
    prevLevel.current = overview.level;
    prevBadgeCount.current = overview.totalBadges;
  }, [overview]);

  if (isLoading || !overview) {
    return <div className="tq-loading">Loading your stats…</div>;
  }

  const {
    level, xp, xpForNext, levelProgressPct,
    wordsToday, activeMsToday, wpm,
    streak, longestStreak,
    totalWords, totalActiveMs, totalBadges,
    recentBadges
  } = overview;

  const PERIODS = [
    { label: "7 days",  value: "7" },
    { label: "30 days", value: "30" },
    { label: "90 days", value: "90" }
  ];

  return (
    <div>
      {/* Hero — level + XP + streak */}
      <section className="tq-hero">
        <div className="tq-hero-left">
          <LevelRing level={level} pct={levelProgressPct} size={160} />
          <div className="tq-hero-meta">
            <div className="tq-hero-title">{titleForLevel(level)}</div>
            <XPBar xp={xp} xpForNext={xpForNext} pct={levelProgressPct} />
            {recentBadges?.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                {recentBadges.map(b => (
                  <span key={b.code} title={b.name} style={{ fontSize: 22 }}>{b.icon}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <StreakFlame days={streak ?? 0} />
      </section>

      {/* Stat cards */}
      <div className="tq-stats-grid">
        <StatCard
          label="Words today"
          value={formatWords(wordsToday)}
          sub={formatDuration(activeMsToday) + " typing"}
          icon="✍️"
        />
        <StatCard
          label="Lifetime words"
          value={formatWords(totalWords)}
          sub={`${totalBadges} badge${totalBadges === 1 ? "" : "s"} earned`}
          icon="📚"
        />
        <StatCard
          label="Total time"
          value={formatDuration(totalActiveMs)}
          sub="all-time active"
          icon="⏱"
        />
        <StatCard
          label="Speed"
          value={`${wpm} WPM`}
          sub={`longest streak: ${longestStreak}d`}
          icon="⚡"
        />
      </div>

      {/* Period switcher */}
      <div className="tq-controls">
        <div className="tq-segmented">
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`tq-segmented-item${period === p.value ? " is-active" : ""}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="tq-charts">
        <div className="tq-card">
          <div className="tq-chart-head">
            <div className="tq-chart-title">Daily output</div>
            <div className="tq-chart-sub">Words written per day</div>
          </div>
          <DailyChart series={rangeData?.series ?? []} />
        </div>
        <div className="tq-card">
          <div className="tq-chart-head">
            <div className="tq-chart-title">Writing heatmap</div>
            <div className="tq-chart-sub">Day × hour of activity</div>
          </div>
          <HeatmapChart heatmap={rangeData?.heatmap ?? null} />
        </div>
      </div>

      <BadgeUnlockToast badge={pendingBadge} onClose={() => setPendingBadge(null)} />
      <LevelUpModal level={pendingLevel} onClose={() => setPendingLevel(null)} />
    </div>
  );
}
