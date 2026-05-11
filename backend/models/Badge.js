// backend/models/Badge.js
import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },     // e.g. "WORDS_10K"
  name: { type: String, required: true },
  description: String,
  icon: { type: String, default: "🏅" },                     // emoji or icon code
  tier: { type: String, enum: ["bronze", "silver", "gold", "platinum"], default: "bronze" },
  category: {
    type: String,
    enum: ["volume", "speed", "consistency", "milestone", "fun"],
    required: true
  },

  // Rule definition — interpreted by services/gamification.service.js
  rule: {
    type: { type: String, required: true },
    threshold: Number,
    wpm: Number,
    durationSec: Number,
    minutes: Number,
    days: Number,
    before: String,
    after: String,
    sessions: Number,
    words: Number
  },

  xpReward: { type: Number, default: 100 },
  hidden: { type: Boolean, default: false }   // secret badges
}, { timestamps: true });

export const Badge = mongoose.model("Badge", badgeSchema);