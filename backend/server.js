import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import { seedBadges } from "./config/badges.seed.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import badgesRoutes from "./routes/badges.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === "production";

// ── Security & logging
app.use(helmet({ contentSecurityPolicy: isProd }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(isProd ? "combined" : "dev"));

// ── CORS
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.startsWith("chrome-extension://")) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true
}));

// ── API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), now: new Date().toISOString() });
});

app.use("/api/auth",        authRoutes);
app.use("/api/events",      eventsRoutes);
app.use("/api/stats",       statsRoutes);
app.use("/api/badges",      badgesRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// 404 for unmatched /api/* routes
app.use("/api", (req, res) => res.status(404).json({ error: "NOT_FOUND" }));

// ── Serve dashboard in production (built into dashboard/dist)
if (isProd) {
  const dist = path.resolve(__dirname, "../dashboard/dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// ── Error handler
app.use(errorHandler);

// ── Start
async function start() {
  try {
    await connectDB();
    await seedBadges();   // idempotent — safe to run on every boot
    app.listen(PORT, () => {
      console.log(`🎯 TypeQuest API on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
