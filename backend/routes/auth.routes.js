// backend/routes/auth.routes.js
import { Router } from "express";
import { signInWithGoogle, getMe, updateSettings, createPAT } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/google", authLimiter, signInWithGoogle);
router.get("/me", requireAuth, getMe);
router.patch("/settings", requireAuth, updateSettings);
router.post("/pat", requireAuth, createPAT);

export default router;