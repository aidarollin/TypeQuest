// backend/routes/leaderboard.routes.js
// Opt-in public leaderboard. Only users with publicProfile: true appear.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { User } from "../models/User.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const leaders = await User.find({ "settings.publicProfile": true })
      .sort({ totalWords: -1 })
      .limit(50)
      .select("displayName avatarUrl level totalWords currentStreak");

    res.json(
      leaders.map((u, i) => ({
        rank: i + 1,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        level: u.level,
        totalWords: u.totalWords,
        streak: u.currentStreak
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
