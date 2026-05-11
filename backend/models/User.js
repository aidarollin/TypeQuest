// backend/models/User.js
import mongoose from "mongoose";

const dailyStatSchema = new mongoose.Schema({
  date: { type: String, required: true },     // YYYY-MM-DD in user's timezone
  words: { type: Number, default: 0 },
  chars: { type: Number, default: 0 },
  backspaces: { type: Number, default: 0 },
  activeMs: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
  apps: { type: Map, of: Number, default: {} } // { google_docs: 234, notion: 12 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  // Identity
  email: { type: String, required: true, unique: true, lowercase: true },
  googleId: { type: String, unique: true, sparse: true },
  displayName: String,
  avatarUrl: String,
  timezone: { type: String, default: "UTC" },

  // Lifetime totals
  totalWords: { type: Number, default: 0 },
  totalChars: { type: Number, default: 0 },
  totalBackspaces: { type: Number, default: 0 },
  totalActiveMs: { type: Number, default: 0 },

  // Gamification state
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  unlockedBadges: [{
    badgeCode: String,
    unlockedAt: Date
  }],

  // Streaks
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: String, // YYYY-MM-DD

  // Daily history (last 365 days, older entries archived)
  daily: [dailyStatSchema],

  // Settings
  settings: {
    showHud: { type: Boolean, default: true },
    hudOpacity: { type: Number, default: 1.0 },
    notifyBadges: { type: Boolean, default: true },
    notifyLevelUp: { type: Boolean, default: true },
    publicProfile: { type: Boolean, default: false },
    theme: { type: String, enum: ["dark", "light", "system"], default: "dark" }
  }
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ "daily.date": 1 });

export const User = mongoose.model("User", userSchema);