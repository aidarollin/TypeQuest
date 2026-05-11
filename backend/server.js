// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import badgesRoutes from "./routes/badges.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);              // server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.startsWith("chrome-extension://")) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true
}));

// ── Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), now: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/badges", badgesRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "NOT_FOUND" }));

// Centralized error handler
app.use(errorHandler);

// ── Start
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🎯 TypeQuest API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();