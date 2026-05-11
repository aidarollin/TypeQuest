// extension/background.js
// Service worker. Handles:
//   - Receiving TYPING_EVENT messages from content scripts
//   - Queueing events when offline
//   - Periodic sync (chrome.alarms)
//   - Auth handshake with backend
//   - Notifications for badge unlocks / level-ups

import { CONFIG } from "./lib/config.js";
import { storage, EventQueue } from "./lib/storage.js";
import { api } from "./lib/api.js";

const queue = new EventQueue();
let lastStats = null;

// ──────── Schedule periodic sync ────────
chrome.alarms.create("tq-sync", { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "tq-sync") {
    await trySync();
  }
});

// ──────── Receive events from content scripts ────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TYPING_EVENT") {
    handleTypingEvent(msg.payload).then((stats) => {
      sendResponse({ ok: true, stats });
    });
    return true; // keep channel open for async response
  }

  if (msg.type === "GET_STATS") {
    api.getOverview()
      .then((stats) => sendResponse({ ok: true, stats }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "SIGN_IN") {
    handleSignIn(msg.idToken)
      .then((user) => sendResponse({ ok: true, user }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "SIGN_OUT") {
    api.clearToken().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "SET_TOKEN") {
    api.setToken(msg.token)
      .then(() => api.getOverview())
      .then((stats) => {
        lastStats = stats;
        sendResponse({ ok: true });
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function handleTypingEvent(event) {
  await queue.push(event);
  // Try immediate sync if event was triggered by a word threshold
  if (event.deltaWords >= 50) {
    return trySync();
  }
  return lastStats;
}

async function trySync() {
  const events = await queue.drain();
  if (events.length === 0) return lastStats;

  try {
    const result = await api.ingestEvents(events);
    lastStats = result.stats;

    // Show notifications for badge unlocks
    if (result.unlockedBadges?.length) {
      for (const badge of result.unlockedBadges) {
        showBadgeNotification(badge);
      }
    }

    // Show notification for level-up
    if (result.leveledUp) {
      showLevelUpNotification(result.stats.level);
    }

    return lastStats;
  } catch (err) {
    if (err.message === "NETWORK_ERROR" || err.message === "UNAUTHORIZED") {
      // Restore queue so we don't lose the events
      await queue.restore(events);
    }
    return lastStats;
  }
}

async function handleSignIn(idToken) {
  const result = await api.signInWithGoogle(idToken);
  await api.setToken(result.token);
  await storage.set({ tq_user: result.user });
  return result.user;
}

function showBadgeNotification(badge) {
  // chrome.notifications requires the "notifications" permission — omitted here
  // for minimum-permissions principle. Use a simpler approach: badge text on action icon.
  chrome.action.setBadgeText({ text: "🏅" });
  chrome.action.setBadgeBackgroundColor({ color: "#F5B342" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 8000);
}

function showLevelUpNotification(level) {
  chrome.action.setBadgeText({ text: `L${level}` });
  chrome.action.setBadgeBackgroundColor({ color: "#5FE3A1" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 8000);
}

// On install, open the welcome page
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({ url: `${CONFIG.DASHBOARD_URL}/welcome` });
  }
});