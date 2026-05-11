// backend/models/Session.js
//
// A Session is a contiguous writing burst. Events created within
// IDLE_GAP_MS of each other roll into the same session; otherwise
// a new session is opened. Sessions power "longest session" badges,
// the avg-WPM rolling metric, and the dashboard's session count.
//
// Schema is denormalized on purpose — we never query events by session,
// only the other way around, so storing the rollup here avoids an
// aggregation pipeline on every dashboard load.

import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    startedAt: { type: Date, required: true },
    endedAt:   { type: Date, required: true },

    // Rollups
    words:        { type: Number, default: 0 },   // gross words added
    chars:        { type: Number, default: 0 },
    backspaces:   { type: Number, default: 0 },
    activeMs:     { type: Number, default: 0 },   // sum of active typing time
    avgWpm:       { type: Number, default: 0 },

    // Source breakdown — { "docs.google.com": 220, "word.office.com": 80 }
    apps: { type: Map, of: Number, default: () => new Map() },

    // Convenience: which doc this session touched (if single)
    docId:  { type: String, default: null },

    // Backreference for replay/debugging — capped
    eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true }
);

// Common queries: "recent sessions for this user" and "biggest sessions"
sessionSchema.index({ userId: 1, startedAt: -1 });
sessionSchema.index({ userId: 1, words: -1 });

// Virtual: duration in seconds (derived, not stored)
sessionSchema.virtual("durationSec").get(function () {
  return Math.max(0, Math.round((this.endedAt - this.startedAt) / 1000));
});

sessionSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Session", sessionSchema);