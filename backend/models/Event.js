// backend/models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

  // Idempotency: each client supplies a unique ID per flush
  clientEventId: { type: String, required: true },

  // Source app
  app: { type: String, default: "unknown" },

  // Counters in this flush
  deltaWords: { type: Number, default: 0 },
  deltaChars: { type: Number, default: 0 },
  deltaBackspaces: { type: Number, default: 0 },
  activeMs: { type: Number, default: 0 },
  wpm: { type: Number, default: 0 },

  // Timing
  sessionStartedAt: Date,
  flushedAt: { type: Date, required: true, index: true },

  // For debugging
  reason: String  // "interval" | "threshold" | "hidden" | "unload"
}, { timestamps: true });

// Idempotency: same client never inserts the same event twice
eventSchema.index({ userId: 1, clientEventId: 1 }, { unique: true });

// Time-series queries
eventSchema.index({ userId: 1, flushedAt: -1 });

export const Event = mongoose.model("Event", eventSchema);