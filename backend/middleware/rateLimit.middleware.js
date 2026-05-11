// backend/middleware/rateLimit.middleware.js
import rateLimit from "express-rate-limit";

export const eventsLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,                         // 60 batch flushes per minute is generous
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});