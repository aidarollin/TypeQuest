// backend/config/badges.seed.js
// Run once with: npm run seed:badges
// Idempotent — uses upsert by code.

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import { Badge } from "../models/Badge.js";

const BADGES = [
  // ── Volume (totalWords) ──
  { code: "FIRST_100",     name: "First Steps",      description: "Type your first 100 words.",        icon: "👣", tier: "bronze",  category: "volume",      rule: { type: "totalWords", threshold: 100 },     xpReward: 50 },
  { code: "WORDS_1K",      name: "Quill Ready",      description: "Type 1,000 lifetime words.",        icon: "🖋️", tier: "bronze",  category: "volume",      rule: { type: "totalWords", threshold: 1000 },    xpReward: 100 },
  { code: "WORDS_10K",     name: "Ten Thousand",     description: "Type 10,000 lifetime words.",       icon: "📜", tier: "silver",  category: "volume",      rule: { type: "totalWords", threshold: 10000 },   xpReward: 250 },
  { code: "WORDS_50K",     name: "Library Builder",  description: "Type 50,000 lifetime words.",       icon: "📚", tier: "silver",  category: "volume",      rule: { type: "totalWords", threshold: 50000 },   xpReward: 500 },
  { code: "WORDS_100K",    name: "Centurion",        description: "Type 100,000 lifetime words.",      icon: "🏛️", tier: "gold",    category: "volume",      rule: { type: "totalWords", threshold: 100000 },  xpReward: 1000 },
  { code: "WORDS_500K",    name: "Half Million",     description: "Type 500,000 lifetime words.",      icon: "🗿", tier: "gold",    category: "volume",      rule: { type: "totalWords", threshold: 500000 },  xpReward: 2500 },
  { code: "WORDS_1M",      name: "Million Words",    description: "Type 1,000,000 lifetime words.",    icon: "💎", tier: "platinum",category: "volume",      rule: { type: "totalWords", threshold: 1000000 }, xpReward: 5000 },

  // ── Time (totalActiveTime, in minutes) ──
  { code: "TIME_1H",       name: "First Hour",       description: "Spend 1 hour writing.",            icon: "⏱️", tier: "bronze",  category: "volume",      rule: { type: "totalActiveTime", threshold: 60 },    xpReward: 50 },
  { code: "TIME_10H",      name: "Ten Hours In",     description: "Spend 10 hours writing.",          icon: "⏳", tier: "silver",  category: "volume",      rule: { type: "totalActiveTime", threshold: 600 },   xpReward: 200 },
  { code: "TIME_100H",     name: "Centurion Clock",  description: "Spend 100 hours writing.",         icon: "🕰️", tier: "gold",    category: "volume",      rule: { type: "totalActiveTime", threshold: 6000 },  xpReward: 1000 },

  // ── Speed (sustainedWpm) ──
  { code: "SPEEDSTER_40",  name: "Steady Pace",      description: "Sustain 40 WPM for 1 minute.",      icon: "🚶", tier: "bronze",  category: "speed",       rule: { type: "sustainedWpm", wpm: 40, durationSec: 60 }, xpReward: 100 },
  { code: "SPEEDSTER_60",  name: "Speedster",        description: "Sustain 60 WPM for 1 minute.",      icon: "🏃", tier: "silver",  category: "speed",       rule: { type: "sustainedWpm", wpm: 60, durationSec: 60 }, xpReward: 200 },
  { code: "SPEEDSTER_80",  name: "Lightning Hands",  description: "Sustain 80 WPM for 1 minute.",      icon: "⚡", tier: "gold",    category: "speed",       rule: { type: "sustainedWpm", wpm: 80, durationSec: 60 }, xpReward: 500 },
  { code: "SPEEDSTER_100", name: "Sound Barrier",    description: "Sustain 100 WPM for 1 minute.",     icon: "💨", tier: "platinum",category: "speed",       rule: { type: "sustainedWpm", wpm: 100, durationSec: 60 }, xpReward: 1000 },

  // ── Marathon (singleSession) ──
  { code: "MARATHON_30M",  name: "Half-Hour Hold",   description: "Write for 30 minutes straight.",    icon: "🏁", tier: "bronze",  category: "milestone",   rule: { type: "singleSession", minutes: 30 },  xpReward: 100 },
  { code: "MARATHON_1H",   name: "Hour of Power",    description: "Write for 60 minutes straight.",    icon: "🎯", tier: "silver",  category: "milestone",   rule: { type: "singleSession", minutes: 60 },  xpReward: 250 },
  { code: "MARATHON_2H",   name: "Marathon Mind",    description: "Write for 120 minutes straight.",   icon: "🏃‍♂️", tier: "gold",   category: "milestone",   rule: { type: "singleSession", minutes: 120 }, xpReward: 750 },
  { code: "MARATHON_4H",   name: "Iron Pen",         description: "Write for 240 minutes straight.",   icon: "🥇", tier: "platinum",category: "milestone",   rule: { type: "singleSession", minutes: 240 }, xpReward: 2000 },

  // ── Streaks (dailyStreak) ──
  { code: "STREAK_3",      name: "Habit Forming",    description: "Write 3 days in a row.",            icon: "🌱", tier: "bronze",  category: "consistency", rule: { type: "dailyStreak", days: 3 },   xpReward: 75 },
  { code: "STREAK_7",      name: "Week Warrior",     description: "Write 7 days in a row.",            icon: "🌿", tier: "silver",  category: "consistency", rule: { type: "dailyStreak", days: 7 },   xpReward: 200 },
  { code: "STREAK_14",     name: "Fortnight",        description: "Write 14 days in a row.",           icon: "🌳", tier: "silver",  category: "consistency", rule: { type: "dailyStreak", days: 14 },  xpReward: 400 },
  { code: "STREAK_30",     name: "Monthly Monk",     description: "Write 30 days in a row.",           icon: "🔥", tier: "gold",    category: "consistency", rule: { type: "dailyStreak", days: 30 },  xpReward: 1000 },
  { code: "STREAK_100",    name: "Centurion Streak", description: "Write 100 days in a row.",          icon: "👑", tier: "platinum",category: "consistency", rule: { type: "dailyStreak", days: 100 }, xpReward: 5000 },
  { code: "STREAK_365",    name: "Year of Words",    description: "Write 365 days in a row.",          icon: "🌌", tier: "platinum",category: "consistency", rule: { type: "dailyStreak", days: 365 }, xpReward: 25000 },

  // ── Time-of-day (fun) ──
  { code: "EARLY_BIRD",    name: "Early Bird",       description: "Write before 7 AM five times.",     icon: "🌅", tier: "silver",  category: "fun",         rule: { type: "timeOfDay", before: "07:00", sessions: 5 }, xpReward: 150 },
  { code: "NIGHT_OWL",     name: "Night Owl",        description: "Write after 11 PM five times.",     icon: "🦉", tier: "silver",  category: "fun",         rule: { type: "timeOfDay", after: "23:00", sessions: 5 }, xpReward: 150 },

  // ── Style (noBackspace) ──
  { code: "CONFIDENT_100", name: "Confident Hand",   description: "Type 100 words with no backspace.", icon: "✨", tier: "silver",  category: "fun",         rule: { type: "noBackspace", words: 100 },  xpReward: 200 },
  { code: "CONFIDENT_500", name: "Surgical",         description: "Type 500 words with no backspace.", icon: "🎖️", tier: "gold",    category: "fun",         rule: { type: "noBackspace", words: 500 },  xpReward: 750 }
];

// Exported for use in server.js startup (does not disconnect)
export async function seedBadges() {
  let inserted = 0;
  let updated = 0;
  for (const def of BADGES) {
    const result = await Badge.updateOne(
      { code: def.code },
      { $set: def },
      { upsert: true }
    );
    if (result.upsertedCount) inserted++;
    else updated++;
  }
  console.log(`✅ Badges: ${inserted} inserted, ${updated} up-to-date`);
}

// CLI runner: node config/badges.seed.js
const isMain = process.argv[1]?.endsWith("badges.seed.js");
if (isMain) {
  await connectDB();
  await seedBadges();
  await mongoose.disconnect();
}