// backend/routes/events.routes.js
import { Router } from "express";
import { ingestEvents } from "../controllers/events.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { eventsLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/", requireAuth, eventsLimiter, ingestEvents);

export default router;