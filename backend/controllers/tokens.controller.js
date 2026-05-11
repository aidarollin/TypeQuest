// backend/controllers/tokens.controller.js
// Personal Access Token (PAT) support.
// PAT format: "tq_" + signed JWT containing { sub, scopes, type: "pat" }
// Users generate PATs from the dashboard Settings page and paste them into
// the Google Docs / Word add-ins.

import jwt from "jsonwebtoken";

export async function verifyRawToken(rawToken) {
  const jwtPart = rawToken.slice(3); // strip the "tq_" prefix
  try {
    const payload = jwt.verify(jwtPart, process.env.JWT_SECRET);
    if (payload.type !== "pat") return null;
    return { userId: payload.sub, scopes: payload.scopes || ["read", "write"] };
  } catch {
    return null;
  }
}

export function generatePAT(userId, scopes = ["read", "write"]) {
  const inner = jwt.sign(
    { sub: userId.toString(), scopes, type: "pat" },
    process.env.JWT_SECRET,
    { expiresIn: "365d" }
  );
  return `tq_${inner}`;
}
