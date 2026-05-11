// backend/services/gamification.service.js
// Pure-ish domain logic: XP curve, level lookup, badge rule evaluation.

import { Badge } from "../models/Badge.js";

// ──────── XP curve ────────
//   xp_for_level(L) = floor(50 * L^1.5) — cumulative XP needed to REACH level L.
// Level lookup is done by walking forward (cheap because levels max at 50).

export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.5));
}

export function levelForXp(xp) {
  let level = 1;
  while (level < 50 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpProgress(xp) {
  const level = levelForXp(xp);
  const currentBase = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  return {
    level,
    xp,
    xpInLevel: xp - currentBase,
    xpForNext: nextBase - currentBase,
    pct: Math.min(100, Math.round(((xp - currentBase) / (nextBase - currentBase)) * 100))
  };
}

// ──────── XP from a single event ────────
//   1 XP per word, with stackable multipliers.
export function xpForEvent(event, user) {
  const baseXp = event.deltaWords;
  let multiplier = 1.0;
  if (event.wpm > 60) multiplier *= 1.2;
  if (user.currentStreak >= 7) multiplier *= 1.3;
  // "First 1k words today" bonus
  const todayWordsBefore = (user.daily?.find(d => d.date === todayKey(user.timezone))?.words ?? 0)
    - event.deltaWords;
  if (todayWordsBefore < 1000) multiplier *= 1.5;
  return Math.floor(baseXp * multiplier);
}

// ──────── Badge rule engine ────────
// Each rule type maps to a predicate over the (user, event) pair.
const RULE_HANDLERS = {
  totalWords: (rule, user) => user.totalWords >= rule.threshold,

  totalActiveTime: (rule, user) => user.totalActiveMs >= rule.threshold * 60_000,

  dailyStreak: (rule, user) => user.currentStreak >= rule.days,

  sustainedWpm: (rule, _user, event) => {
    return event.wpm >= rule.wpm && event.activeMs >= (rule.durationSec || 60) * 1000;
  },

  singleSession: (rule, _user, event) => {
    if (!event.sessionStartedAt) return false;
    const sessionLen = event.flushedAt - new Date(event.sessionStartedAt).getTime();
    return sessionLen >= rule.minutes * 60_000;
  },

  noBackspace: (rule, _user, event) => {
    return event.deltaBackspaces === 0 && event.deltaWords >= rule.words;
  },

  timeOfDay: (rule, _user, event) => {
    const d = new Date(event.flushedAt);
    const h = d.getHours();
    if (rule.before) {
      const cutoff = parseInt(rule.before.split(":")[0], 10);
      return h < cutoff;
    }
    if (rule.after) {
      const cutoff = parseInt(rule.after.split(":")[0], 10);
      return h >= cutoff;
    }
    return false;
  }
};

/**
 * Evaluate all badges and return the codes that should be NEWLY unlocked.
 * @param {object} user
 * @param {object} event  the event that triggered this evaluation (may be null)
 * @returns {Array<{code: string, name: string, icon: string, xpReward: number}>}
 */
export async function evaluateBadges(user, event = null) {
  const allBadges = await Badge.find({});
  const unlockedCodes = new Set(user.unlockedBadges.map(b => b.badgeCode));

  const newlyUnlocked = [];
  for (const badge of allBadges) {
    if (unlockedCodes.has(badge.code)) continue;

    const handler = RULE_HANDLERS[badge.rule.type];
    if (!handler) continue;

    const passed = event
      ? handler(badge.rule, user, event)
      : handler(badge.rule, user, { wpm: 0, activeMs: 0, deltaBackspaces: 1, deltaWords: 0, flushedAt: Date.now() });
    if (passed) {
      newlyUnlocked.push({
        code: badge.code,
        name: badge.name,
        icon: badge.icon,
        xpReward: badge.xpReward,
        category: badge.category
      });
    }
  }
  return newlyUnlocked;
}

// ──────── Helpers ────────
export function todayKey(tz = "UTC") {
  // Format YYYY-MM-DD in given timezone. Naive impl — for production use dayjs/timezone.
  const d = new Date();
  const offsetMin = tz === "UTC" ? 0 : -d.getTimezoneOffset();
  const local = new Date(d.getTime() + offsetMin * 60_000);
  return local.toISOString().slice(0, 10);
}

const LEVEL_TITLES = [
  [50, "Grand Wordlord"],
  [40, "Master Author"],
  [30, "Author"],
  [20, "Chronicler"],
  [10, "Wordsmith"],
  [5,  "Drafter"],
  [1,  "Apprentice Scribe"]
];

export function titleForLevel(level) {
  for (const [threshold, title] of LEVEL_TITLES) {
    if (level >= threshold) return title;
  }
  return "Apprentice Scribe";
}