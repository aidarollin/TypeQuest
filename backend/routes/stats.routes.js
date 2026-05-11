// backend/routes/stats.routes.js
import { Router } from "express";
import { getOverview, getRange } from "../controllers/stats.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/overview", requireAuth, getOverview);
router.get("/range", requireAuth, getRange);

export default router;