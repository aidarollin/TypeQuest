// backend/services/streak.service.js
// Daily-streak math with grace-period rule.

import { todayKey } from "./gamification.service.js";

/**
 * Update a user's streak based on today's activity.
 * Rules:
 *   - Same day → no change
 *   - Yesterday was last active → +1 streak
 *   - Skipped >1 day → reset to 1
 */
export function updateStreak(user) {
  const today = todayKey(user.timezone);
  if (user.lastActiveDate === today) return user; // already counted

  const yesterday = previousDay(today);
  if (user.lastActiveDate === yesterday) {
    user.currentStreak += 1;
  } else {
    user.currentStreak = 1; // reset (or first day)
  }

  if (user.currentStreak > user.longestStreak) {
    user.longestStreak = user.currentStreak;
  }
  user.lastActiveDate = today;
  return user;
}

function previousDay(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}