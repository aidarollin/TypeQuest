// extension/popup/popup.js

import { CONFIG } from "../lib/config.js";
import { storage } from "../lib/storage.js";

const els = {
  signedOut: document.getElementById("signed-out-state"),
  signedIn: document.getElementById("signed-in-state"),
  signInBtn: document.getElementById("signin-btn"),
  levelNum: document.getElementById("level-num"),
  levelTitle: document.getElementById("level-title"),
  xpCurrent: document.getElementById("xp-current"),
  xpTarget: document.getElementById("xp-target"),
  xpBarFill: document.getElementById("xp-bar-fill"),
  ringProgress: document.getElementById("ring-progress"),
  statWords: document.getElementById("stat-words"),
  statTime: document.getElementById("stat-time"),
  statWpm: document.getElementById("stat-wpm"),
  statStreak: document.getElementById("stat-streak"),
  badgeStrip: document.getElementById("badge-strip"),
  viewDashboardBtn: document.getElementById("view-dashboard-btn"),
  openDashboard: document.getElementById("open-dashboard")
};

// ──── Helpers ────
function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

function levelTitleFor(level) {
  if (level >= 50) return "Grand Wordlord";
  if (level >= 40) return "Master Author";
  if (level >= 30) return "Author";
  if (level >= 20) return "Chronicler";
  if (level >= 10) return "Wordsmith";
  if (level >= 5) return "Drafter";
  return "Apprentice Scribe";
}

// ──── Renderers ────
function renderStats(stats) {
  els.signedOut.classList.add("hidden");
  els.signedIn.classList.remove("hidden");

  els.levelNum.textContent = stats.level ?? 1;
  els.levelTitle.textContent = levelTitleFor(stats.level ?? 1);
  els.xpCurrent.textContent = (stats.xp ?? 0).toLocaleString();
  els.xpTarget.textContent = (stats.xpForNext ?? 50).toLocaleString();

  const pct = Math.min(100, ((stats.xp || 0) / (stats.xpForNext || 50)) * 100);
  els.xpBarFill.style.width = `${pct}%`;

  // Ring: circumference = 2πr ≈ 213.6 for r=34
  const circumference = 213.6;
  els.ringProgress.style.strokeDashoffset = circumference * (1 - pct / 100);

  els.statWords.textContent = (stats.wordsToday ?? 0).toLocaleString();
  els.statTime.textContent = formatDuration(stats.activeMsToday ?? 0);
  els.statWpm.textContent = stats.wpm ?? 0;
  els.statStreak.textContent = `🔥 ${stats.streak ?? 0}`;

  // Badges
  if (stats.recentBadges && stats.recentBadges.length > 0) {
    els.badgeStrip.innerHTML = stats.recentBadges
      .slice(0, 7)
      .map(b => `<div class="badge" title="${b.name}">${b.icon || "🏅"}</div>`)
      .join("");
  } else {
    els.badgeStrip.innerHTML = `<div class="empty">No badges yet — start typing!</div>`;
  }
}

function showSignedOut() {
  els.signedOut.classList.remove("hidden");
  els.signedIn.classList.add("hidden");
}

// ──── Event handlers ────
els.viewDashboardBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
});

els.openDashboard.addEventListener("click", () => {
  chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
});

els.signInBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${CONFIG.DASHBOARD_URL}/signin?source=extension` });
});

// ──── Bootstrap ────
async function init() {
  const { tq_token } = await storage.get("tq_token");
  if (!tq_token) {
    showSignedOut();
    return;
  }

  // Ask the background worker for fresh stats
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
    if (response?.ok && response.stats) {
      renderStats(response.stats);
    } else {
      // Show last cached stats if we have them, else signed-out state
      storage.get("tq_last_stats").then(({ tq_last_stats }) => {
        if (tq_last_stats) renderStats(tq_last_stats);
        else showSignedOut();
      });
    }
  });
}

init();