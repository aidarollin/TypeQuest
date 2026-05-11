// backend/routes/badges.routes.js
import { Router } from "express";
import { listBadges } from "../controllers/badges.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, listBadges);

export default router;