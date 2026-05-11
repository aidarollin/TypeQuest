// backend/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";
import { generatePAT } from "./tokens.controller.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );
}

export async function signInWithGoogle(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "MISSING_ID_TOKEN" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.create({
        googleId,
        email: email.toLowerCase(),
        displayName: name,
        avatarUrl: picture
      });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        level: user.level,
        xp: user.xp
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res) {
  const u = req.user;
  res.json({
    id: u._id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    level: u.level,
    xp: u.xp,
    settings: u.settings,
    timezone: u.timezone
  });
}

export async function updateSettings(req, res, next) {
  try {
    const allowed = ["showHud", "hudOpacity", "notifyBadges", "notifyLevelUp", "publicProfile", "theme"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[`settings.${key}`] = req.body[key];
    }
    if (req.body.timezone !== undefined) update.timezone = req.body.timezone;

    const user = await req.user.constructor.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    );
    res.json({ settings: user.settings, timezone: user.timezone });
  } catch (err) {
    next(err);
  }
}

export async function createPAT(req, res) {
  const token = generatePAT(req.user._id);
  res.json({ token });
}