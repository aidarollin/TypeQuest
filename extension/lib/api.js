// extension/lib/api.js
// Authenticated fetch wrapper with token refresh and retry.

import { CONFIG } from "./config.js";
import { storage } from "./storage.js";

async function getToken() {
  const { tq_token } = await storage.get("tq_token");
  return tq_token || null;
}

async function setToken(token) {
  await storage.set({ tq_token: token });
}

async function clearToken() {
  await storage.remove("tq_token");
}

export async function apiFetch(path, { method = "GET", body, retry = true } = {}) {
  const token = await getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${CONFIG.API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    // Network error — caller should treat as "offline, queue and retry later"
    throw new Error("NETWORK_ERROR");
  }

  if (response.status === 401 && retry) {
    // Token invalid — clear it and bail. Popup will re-prompt sign-in.
    await clearToken();
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API_ERROR_${response.status}: ${errBody}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  signInWithGoogle: (idToken) =>
    apiFetch("/auth/google", { method: "POST", body: { idToken } }),

  me: () => apiFetch("/auth/me"),

  ingestEvents: (events) =>
    apiFetch("/events", { method: "POST", body: { events } }),

  getOverview: () => apiFetch("/stats/overview"),

  getRange: (range) => apiFetch(`/stats/range?period=${range}`),

  getBadges: () => apiFetch("/badges"),

  setToken,
  clearToken,
  getToken
};