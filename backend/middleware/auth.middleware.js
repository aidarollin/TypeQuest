// backend/middleware/auth.middleware.js
//
// Accepts either:
//  1. A JWT issued by /api/auth/google (dashboard + chrome extension)
//  2. A Personal Access Token starting with "tq_" (Word + Docs add-ons)
//
// The two paths converge on `req.user` so downstream controllers don't
// have to care which kind of credential was presented.

import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { verifyRawToken } from "../controllers/tokens.controller.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "MISSING_TOKEN" });

  try {
    // PAT path — recognized by the "tq_" prefix
    if (token.startsWith("tq_")) {
      const pat = await verifyRawToken(token);
      if (!pat) return res.status(401).json({ error: "INVALID_TOKEN" });
      const user = await User.findById(pat.userId);
      if (!user) return res.status(401).json({ error: "USER_NOT_FOUND" });
      req.user = user;
      req.authMethod = "pat";
      req.tokenScopes = pat.scopes;
      return next();
    }

    // JWT path
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "USER_NOT_FOUND" });
    req.user = user;
    req.authMethod = "jwt";
    next();
  } catch (err) {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}