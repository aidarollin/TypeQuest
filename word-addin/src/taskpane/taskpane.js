/**
 * TypeQuest — Microsoft Word Office.js task pane
 *
 * Tracking strategy:
 *  - Office.js does not expose keystroke events; instead we listen for
 *    `DocumentSelectionChanged` (fires whenever the user types or moves
 *    the caret) and poll the body word count at a debounced cadence.
 *  - Word-count diffs feed an event queue that's flushed to the API
 *    every 30s or every 50 new words, whichever comes first.
 *  - Token is stored in localStorage (sandboxed per add-in origin).
 *
 * Note: this file is intentionally framework-free — Office.js + plain DOM
 * keep the add-in fast and free of bundler surprises across Word desktop,
 * Word for Mac, and Word on the web.
 */

const API_BASE = 'https://api.typequest.app/api';
const TOKEN_KEY = 'tq_token';

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_WORDS_THRESHOLD = 50;
const POLL_DEBOUNCE_MS = 600;
const IDLE_THRESHOLD_MS = 5_000;

const state = {
  lastWordCount: 0,
  sessionStart: Date.now(),
  sessionWords: 0,
  sessionActiveMs: 0,
  lastActivityAt: Date.now(),
  pollTimer: null,
  flushTimer: null,
  pendingEvents: [],
  overview: null,
};

// ---------- Office bootstrap ----------

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) return;

  if (!getToken()) {
    showView('view-signin');
    document.getElementById('signin-btn').addEventListener('click', handleSignIn);
    return;
  }

  initSignedIn();
});

function initSignedIn() {
  showView('view-loading');
  document.getElementById('signout-btn')?.addEventListener('click', handleSignOut);

  // Seed baseline word count, then start listeners.
  Word.run(async (ctx) => {
    const body = ctx.document.body;
    body.load('text');
    await ctx.sync();
    state.lastWordCount = countWords(body.text);
  })
    .then(() => fetchOverview())
    .then(() => {
      attachSelectionListener();
      state.flushTimer = setInterval(flushIfNeeded, FLUSH_INTERVAL_MS);
      showView('view-stats');
      renderOverview();
    })
    .catch((err) => {
      console.error('Init failed', err);
      showView('view-signin');
    });
}

// ---------- Word listeners ----------

function attachSelectionListener() {
  // Office.js exposes DocumentSelectionChanged as the closest proxy to
  // "user is doing something in the document".
  Office.context.document.addHandlerAsync(
    Office.EventType.DocumentSelectionChanged,
    onSelectionChanged
  );
}

function onSelectionChanged() {
  const now = Date.now();
  // Time-tracking: count time only if there hasn't been a long idle gap.
  const gap = now - state.lastActivityAt;
  if (gap < IDLE_THRESHOLD_MS) {
    state.sessionActiveMs += gap;
  }
  state.lastActivityAt = now;

  // Debounce: re-poll word count after the user stops moving the caret.
  clearTimeout(state.pollTimer);
  state.pollTimer = setTimeout(pollWordCount, POLL_DEBOUNCE_MS);
}

async function pollWordCount() {
  try {
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      body.load('text');
      await ctx.sync();

      const current = countWords(body.text);
      const delta = Math.max(0, current - state.lastWordCount);
      if (delta > 0) {
        state.sessionWords += delta;
        enqueueEvent(delta);
        renderSessionStats();
      }
      state.lastWordCount = current;
    });
  } catch (err) {
    console.error('pollWordCount failed', err);
  }
}

function enqueueEvent(wordsAdded) {
  state.pendingEvents.push({
    clientEventId: cryptoUuid(),
    app: 'word_addin',
    deltaWords: wordsAdded,
    deltaChars: Math.round(wordsAdded * 5.5),   // rough estimate
    deltaBackspaces: 0,
    activeMs: state.sessionActiveMs,
    wpm: 0,
    sessionStartedAt: new Date(state.sessionStart).toISOString(),
    flushedAt: new Date().toISOString(),
    reason: 'threshold'
  });

  // Trigger an immediate flush once threshold reached
  const pendingWords = state.pendingEvents.reduce((s, e) => s + e.wordsAdded, 0);
  if (pendingWords >= FLUSH_WORDS_THRESHOLD) flushIfNeeded();
}

async function flushIfNeeded() {
  if (state.pendingEvents.length === 0) return;
  const batch = state.pendingEvents.splice(0, state.pendingEvents.length);
  try {
    const resp = await apiPost('/events', { events: batch });
    // Refresh overview if the server signals anything noteworthy
    if (resp.leveledUp || resp.unlockedBadges?.length) {
      state.overview = resp.overview;
      renderOverview();
      if (resp.unlockedBadges?.length) showUnlockToast(resp.unlockedBadges[0]);
    } else if (resp.overview) {
      state.overview = resp.overview;
      renderOverview();
    }
    // Reset session active counter — server has it now.
    state.sessionActiveMs = 0;
  } catch (err) {
    // Re-queue on failure so we don't lose data
    state.pendingEvents.unshift(...batch);
    console.error('Flush failed, will retry', err);
  }
}

// ---------- API ----------

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiGet(path) {
  const r = await fetch(API_BASE + path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    showView('view-signin');
    throw new Error('Session expired');
  }
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

async function fetchOverview() {
  state.overview = await apiGet('/stats/overview');
}

// ---------- Render ----------

function renderOverview() {
  const o = state.overview;
  if (!o) return;
  setText('level', o.level);
  setText('level-title', o.title || 'Apprentice Scribe');
  setText('next-level', o.level + 1);
  setText('xp-in', (o.xp || 0).toLocaleString());
  setText('xp-next', (o.xpForNext || 0).toLocaleString());
  setText('streak-days', o.streak || 0);
  setText('today-words', (o.wordsToday || 0).toLocaleString());
  setText('today-time', formatDuration(Math.round((o.activeMsToday || 0) / 1000)));
  setText('lifetime-words', (o.totalWords || 0).toLocaleString());
  setText('lifetime-time', formatDuration(Math.round((o.totalActiveMs || 0) / 1000)));

  const pct = o.levelProgressPct || 0;
  document.getElementById('xp-fill').style.width = `${Math.min(100, pct)}%`;
}

function renderSessionStats() {
  setText('session-words', state.sessionWords.toLocaleString());
  setText('session-time', formatDuration(state.sessionActiveMs / 1000));
}

function showUnlockToast(badge) {
  const host = document.getElementById('recent-unlocks');
  host.innerHTML = `
    <div class="unlock">
      <div class="unlock-icon">${badge.icon || '🏅'}</div>
      <div>
        <div class="unlock-title">Badge unlocked</div>
        <div class="unlock-name">${escapeHtml(badge.name)}</div>
      </div>
    </div>`;
  setTimeout(() => (host.innerHTML = ''), 8000);
}

// ---------- Handlers ----------

async function handleSignIn() {
  const token = document.getElementById('token-input').value.trim();
  const errEl = document.getElementById('signin-err');
  errEl.textContent = '';
  if (!token) {
    errEl.textContent = 'Please enter your token.';
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  try {
    await fetchOverview();
    initSignedIn();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    errEl.textContent = 'Invalid token. Check your dashboard and try again.';
  }
}

function handleSignOut() {
  localStorage.removeItem(TOKEN_KEY);
  clearInterval(state.flushTimer);
  showView('view-signin');
  document.getElementById('signin-btn').addEventListener('click', handleSignIn);
}

// ---------- Utilities ----------

function showView(id) {
  ['view-signin', 'view-stats', 'view-loading'].forEach((v) => {
    document.getElementById(v).hidden = v !== id;
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function countWords(text) {
  if (!text) return 0;
  return (text.match(/\S+/g) || []).length;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function cryptoUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}