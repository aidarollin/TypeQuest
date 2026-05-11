// backend/controllers/badges.controller.js
import { Badge } from "../models/Badge.js";

export async function listBadges(req, res, next) {
  try {
    const user = req.user;
    const allBadges = await Badge.find({ hidden: false }).sort({ tier: 1, "rule.threshold": 1 });
    const unlockedMap = new Map(
      user.unlockedBadges.map(b => [b.badgeCode, b.unlockedAt])
    );

    const result = allBadges.map(b => ({
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
      tier: b.tier,
      category: b.category,
      xpReward: b.xpReward,
      unlocked: unlockedMap.has(b.code),
      unlockedAt: unlockedMap.get(b.code) || null,
      rule: b.rule
    }));

    res.json({ badges: result, totalUnlocked: user.unlockedBadges.length });
  } catch (err) {
    next(err);
  }
}