// backend/controllers/events.controller.js
import { Event } from "../models/Event.js";
import {
  xpForEvent,
  levelForXp,
  xpProgress,
  evaluateBadges,
  todayKey
} from "../services/gamification.service.js";
import { updateStreak } from "../services/streak.service.js";

const MAX_BATCH_SIZE = 200;

export async function ingestEvents(req, res, next) {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "EMPTY_BATCH" });
    }
    if (events.length > MAX_BATCH_SIZE) {
      return res.status(413).json({ error: "BATCH_TOO_LARGE" });
    }

    const user = req.user;
    const oldLevel = user.level;
    let allUnlockedBadges = [];

    for (const evt of events) {
      // Idempotency: skip if we've already ingested this clientEventId
      const exists = await Event.findOne({
        userId: user._id,
        clientEventId: evt.clientEventId
      });
      if (exists) continue;

      // Persist the raw event
      await Event.create({
        userId: user._id,
        clientEventId: evt.clientEventId,
        app: evt.app,
        deltaWords: evt.deltaWords,
        deltaChars: evt.deltaChars,
        deltaBackspaces: evt.deltaBackspaces,
        activeMs: evt.activeMs,
        wpm: evt.wpm,
        sessionStartedAt: evt.sessionStartedAt ? new Date(evt.sessionStartedAt) : null,
        flushedAt: new Date(evt.flushedAt),
        reason: evt.reason
      });

      // Update lifetime totals
      user.totalWords += evt.deltaWords;
      user.totalChars += evt.deltaChars;
      user.totalBackspaces += evt.deltaBackspaces;
      user.totalActiveMs += evt.activeMs;

      // Update daily bucket
      const dayKey = todayKey(user.timezone);
      let day = user.daily.find(d => d.date === dayKey);
      if (!day) {
        day = { date: dayKey, words: 0, chars: 0, backspaces: 0, activeMs: 0, sessions: 0, apps: new Map() };
        user.daily.push(day);
        // Cap history at 365 days
        if (user.daily.length > 365) {
          user.daily.sort((a, b) => a.date.localeCompare(b.date));
          user.daily = user.daily.slice(-365);
          day = user.daily.find(d => d.date === dayKey);
        }
      }
      day.words += evt.deltaWords;
      day.chars += evt.deltaChars;
      day.backspaces += evt.deltaBackspaces;
      day.activeMs += evt.activeMs;
      const appKey = evt.app || "unknown";
      day.apps.set(appKey, (day.apps.get(appKey) || 0) + evt.deltaWords);

      // Streak update — only on the first event of a day with words
      if (evt.deltaWords > 0) {
        updateStreak(user);
      }

      // XP gain
      const eventXp = xpForEvent(evt, user);
      user.xp += eventXp;

      // Badge evaluation per event
      const newBadges = await evaluateBadges(user, evt);
      for (const b of newBadges) {
        user.unlockedBadges.push({ badgeCode: b.code, unlockedAt: new Date() });
        user.xp += b.xpReward;
        allUnlockedBadges.push(b);
      }
    }

    // Recompute level
    user.level = levelForXp(user.xp);

    await user.save();

    const progress = xpProgress(user.xp);
    const todayBucket = user.daily.find(d => d.date === todayKey(user.timezone));

    res.json({
      ok: true,
      stats: {
        level: user.level,
        xp: progress.xpInLevel,
        xpForNext: progress.xpForNext,
        xpTotal: user.xp,
        levelProgressPct: progress.pct,
        wordsToday: todayBucket?.words ?? 0,
        activeMsToday: todayBucket?.activeMs ?? 0,
        wpm: events[events.length - 1]?.wpm ?? 0,
        streak: user.currentStreak,
        totalWords: user.totalWords
      },
      leveledUp: user.level > oldLevel,
      unlockedBadges: allUnlockedBadges
    });
  } catch (err) {
    next(err);
  }
}