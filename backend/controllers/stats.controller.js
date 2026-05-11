// backend/controllers/stats.controller.js
import { Event } from "../models/Event.js";
import { Badge } from "../models/Badge.js";
import { xpProgress, todayKey, titleForLevel } from "../services/gamification.service.js";

export async function getOverview(req, res, next) {
  try {
    const user = req.user;
    const progress = xpProgress(user.xp);
    const today = todayKey(user.timezone);
    const todayBucket = user.daily.find(d => d.date === today);

    // Last 5 unlocked badges with their full info
    const recentCodes = user.unlockedBadges.slice(-5).reverse().map(b => b.badgeCode);
    const recentBadges = await Badge.find({ code: { $in: recentCodes } });

    // Compute current WPM (median of last 5 events for stability)
    const lastEvents = await Event.find({ userId: user._id })
      .sort({ flushedAt: -1 })
      .limit(5);
    const wpmValues = lastEvents.map(e => e.wpm).filter(v => v > 0);
    const wpm = wpmValues.length
      ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length)
      : 0;

    res.json({
      level: user.level,
      title: titleForLevel(user.level),
      xp: progress.xpInLevel,
      xpForNext: progress.xpForNext,
      xpTotal: user.xp,
      levelProgressPct: progress.pct,

      wordsToday: todayBucket?.words ?? 0,
      activeMsToday: todayBucket?.activeMs ?? 0,
      wpm,

      streak: user.currentStreak,
      longestStreak: user.longestStreak,

      totalWords: user.totalWords,
      totalActiveMs: user.totalActiveMs,
      totalBadges: user.unlockedBadges.length,

      recentBadges: recentBadges.map(b => ({
        code: b.code,
        name: b.name,
        icon: b.icon,
        category: b.category
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function getRange(req, res, next) {
  try {
    const user = req.user;
    const period = req.query.period || "30d";

    const days = parseInt(period, 10) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    const series = user.daily
      .filter(d => d.date >= cutoffKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        words: d.words,
        activeMs: d.activeMs,
        chars: d.chars
      }));

    // Heatmap data — bucket events by (day-of-week, hour)
    const events = await Event.find({
      userId: user._id,
      flushedAt: { $gte: cutoff }
    }).select("flushedAt deltaWords");

    const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    for (const e of events) {
      const d = new Date(e.flushedAt);
      heatmap[d.getDay()][d.getHours()] += e.deltaWords;
    }

    res.json({ period, series, heatmap });
  } catch (err) {
    next(err);
  }
}