// extension/content.js
// Injected into supported writing apps. Listens for input events,
// runs the tracker, and handles HUD injection.
//
// Note: We deliberately avoid reading document content. We only inspect
// event metadata (inputType, data length).

(() => {
  const IDLE_THRESHOLD_MS = 5000;
  const FLUSH_INTERVAL_MS = 30000;
  const FLUSH_WORD_THRESHOLD = 50;
  const WPM_WINDOW_MS = 60000;

  const APP_FROM_HOST = {
    "docs.google.com": "google_docs",
    "word.office.com": "word_online",
    "word-edit.officeapps.live.com": "word_online",
    "www.notion.so": "notion"
  };
  const appName = APP_FROM_HOST[location.hostname] || "unknown";

  // ──────── Tracker state ────────
  const state = {
    deltaChars: 0,
    deltaWords: 0,
    deltaBackspaces: 0,
    activeMs: 0,
    lastEventAt: null,
    sessionStartedAt: null,
    recentEvents: [],
    partialWordBuffer: "",
    clientEventCounter: 0,
    sessionTotalWords: 0
  };

  // Last stats received from backend — merged with local counters for live display
  let lastKnownStats = null;

  // HUD element refs set after injection
  let hudEls = null;
  let panelAutoOpened = false;

  function recordEvent(inputType, data) {
    const now = Date.now();
    if (!state.sessionStartedAt) state.sessionStartedAt = now;

    if (state.lastEventAt !== null) {
      const gap = now - state.lastEventAt;
      state.activeMs += Math.min(gap, IDLE_THRESHOLD_MS);
    }
    state.lastEventAt = now;

    if (inputType === "insertText" || inputType === "insertCompositionText") {
      const text = data || "";
      state.deltaChars += text.length;
      state.partialWordBuffer += text;
      const completed = (state.partialWordBuffer.match(/\S+\s+/g) || []).length;
      if (completed > 0) {
        state.deltaWords += completed;
        state.sessionTotalWords += completed;
        const lastSpace = state.partialWordBuffer.lastIndexOf(" ");
        state.partialWordBuffer = state.partialWordBuffer.slice(lastSpace + 1);
        onWordCompleted();
      }
      state.recentEvents.push({ ts: now, charCount: text.length });
    } else if (
      inputType === "deleteContentBackward" ||
      inputType === "deleteContentForward"
    ) {
      state.deltaBackspaces += 1;
    }

    const cutoff = now - WPM_WINDOW_MS;
    state.recentEvents = state.recentEvents.filter(e => e.ts >= cutoff);

    updateHUDLive();

    if (state.deltaWords >= FLUSH_WORD_THRESHOLD) {
      flushAndSend("threshold");
    }
  }

  function currentWpm() {
    if (state.recentEvents.length === 0) return 0;
    const totalChars = state.recentEvents.reduce((a, e) => a + e.charCount, 0);
    return Math.round((totalChars / 5) / (WPM_WINDOW_MS / 60000));
  }

  function onWordCompleted() {
    if (!hudEls) return;

    // Pulse the orb
    hudEls.orb.textContent = state.sessionTotalWords;
    hudEls.orb.classList.remove("pulse");
    // Force reflow so animation restarts each time
    void hudEls.orb.offsetWidth;
    hudEls.orb.classList.add("pulse");

    // Auto-open the panel on first word so the user sees stats immediately
    if (!panelAutoOpened) {
      panelAutoOpened = true;
      hudEls.panel.classList.add("open");
    }
  }

  // ──────── Live HUD update ────────
  function updateHUDLive() {
    if (!hudEls) return;
    const wordsToday = (lastKnownStats?.wordsToday ?? 0) + state.sessionTotalWords;
    const wpm = currentWpm();

    setLiveValue(hudEls.today, `${wordsToday} words`);
    setLiveValue(hudEls.wpm, wpm > 0 ? String(wpm) : "—");
  }

  // Bumps the element with a flash animation when the value changes
  function setLiveValue(el, text) {
    if (!el || el.textContent === text) return;
    el.textContent = text;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function snapshotAndReset() {
    const snapshot = {
      clientEventId: `${state.sessionStartedAt}-${state.clientEventCounter++}`,
      app: appName,
      url: location.hostname,
      deltaChars: state.deltaChars,
      deltaWords: state.deltaWords,
      deltaBackspaces: state.deltaBackspaces,
      activeMs: state.activeMs,
      wpm: currentWpm(),
      sessionStartedAt: state.sessionStartedAt,
      flushedAt: Date.now()
    };
    state.deltaChars = 0;
    state.deltaWords = 0;
    state.deltaBackspaces = 0;
    state.activeMs = 0;
    return snapshot;
  }

  function hasData() {
    return state.deltaChars > 0 || state.deltaBackspaces > 0;
  }

  // ──────── Send to background worker ────────
  function flushAndSend(reason = "interval") {
    if (!hasData()) return;
    const snapshot = snapshotAndReset();
    chrome.runtime.sendMessage(
      { type: "TYPING_EVENT", reason, payload: snapshot },
      (response) => {
        if (response && response.stats) {
          window.postMessage(
            { source: "typequest", type: "STATS_UPDATE", stats: response.stats },
            "*"
          );
        }
      }
    );
  }

  // ──────── Shared keydown handler ────────
  function handleKeydown(e) {
    if (e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;
    if (key.length === 1) {
      recordEvent("insertText", key);
    } else if (key === "Enter") {
      recordEvent("insertText", " ");
    } else if (key === "Backspace" || key === "Delete") {
      recordEvent("deleteContentBackward", null);
    }
  }

  // ──────── Attach to writing surfaces ────────
  function attachListener() {
    // Google Docs routes keystrokes through a hidden child iframe; those events
    // don't bubble to the parent document. Attach directly to each iframe's doc.
    const attachedFrames = new Set();

    function tryAttachToFrame(iframe) {
      if (attachedFrames.has(iframe)) return;
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.addEventListener("keydown", handleKeydown, true);
        attachedFrames.add(iframe);
        iframe.addEventListener("load", () => {
          attachedFrames.delete(iframe);
          tryAttachToFrame(iframe);
        });
      } catch (_) { /* cross-origin */ }
    }

    document.querySelectorAll("iframe").forEach(tryAttachToFrame);

    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeName === "IFRAME") tryAttachToFrame(node);
          if (node.querySelectorAll) node.querySelectorAll("iframe").forEach(tryAttachToFrame);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });

    // Fallback: standard contenteditable elements (Notion, Word Online)
    document.addEventListener("keydown", (e) => {
      const tag = e.target?.tagName;
      const isEditable = e.target?.isContentEditable ||
        tag === "TEXTAREA" ||
        (tag === "INPUT" && /^(text|search)$/i.test(e.target.type || ""));
      if (isEditable) handleKeydown(e);
    }, true);

    // input events give more accurate data on apps that fire them
    document.addEventListener("input", (event) => {
      const target = event.target;
      const tag = target?.tagName;
      const isEditable = target?.isContentEditable ||
        tag === "TEXTAREA" ||
        (tag === "INPUT" && /^(text|search)$/i.test(target.type || ""));
      if (!isEditable) return;
      recordEvent(event.inputType, event.data);
    }, true);
  }

  // ──────── Periodic flush + WPM refresh ────────
  setInterval(() => flushAndSend("interval"), FLUSH_INTERVAL_MS);
  setInterval(() => updateHUDLive(), 2000); // keep WPM fresh even when idle

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAndSend("hidden");
  });
  window.addEventListener("beforeunload", () => flushAndSend("unload"));

  // ──────── HUD injection ────────
  function injectHUD() {
    if (document.getElementById("tq-hud-host")) return;

    const host = document.createElement("div");
    host.id = "tq-hud-host";
    host.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      z-index: 2147483647; pointer-events: none;
    `;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        @keyframes pulse {
          0%   { transform: scale(1); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
          40%  { transform: scale(1.18); box-shadow: 0 0 28px rgba(245,179,66,0.6); }
          100% { transform: scale(1); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        }
        @keyframes bump {
          0%   { opacity: 1; transform: translateY(0); }
          30%  { opacity: 1; transform: translateY(-3px); color: #F5B342; }
          100% { opacity: 1; transform: translateY(0); color: inherit; }
        }
        .orb {
          pointer-events: auto;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #131A2B 0%, #1C2540 100%);
          border: 2px solid #F5B342;
          color: #F5B342;
          font: 600 15px "Inter", system-ui, sans-serif;
          display: flex; align-items: center; justify-content: center;
          cursor: grab;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          transition: box-shadow 0.2s;
          user-select: none;
        }
        .orb.pulse { animation: pulse 0.3s cubic-bezier(0.36,0.07,0.19,0.97); }
        .panel {
          pointer-events: auto;
          position: absolute; bottom: 64px; right: 0;
          width: 240px;
          background: #131A2B;
          border: 1px solid #2A3556;
          border-radius: 12px;
          padding: 14px 16px;
          color: #E8EBF5;
          font: 13px "Inter", system-ui, sans-serif;
          opacity: 0; transform: translateY(10px) scale(0.97);
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .panel.open {
          opacity: 1; transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .row {
          display: flex; justify-content: space-between;
          align-items: center; padding: 5px 0;
          border-bottom: 1px solid #1C2540;
        }
        .row:last-child { border-bottom: none; }
        .label { color: #6B7A9E; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .value {
          color: #E8EBF5; font-variant-numeric: tabular-nums; font-weight: 600;
          transition: color 0.2s;
        }
        .value.bump { animation: bump 0.35s ease-out; }
        .lvl { color: #F5B342; }
        .bar-wrap { margin: 8px 0 4px; }
        .bar { height: 4px; background: #2A3556; border-radius: 2px; overflow: hidden; }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6FCFEB, #F5B342);
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          width: 0%;
        }
        .xp-row {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #6B7A9E; margin-top: 2px;
        }
      </style>
      <div class="orb" id="orb">0</div>
      <div class="panel" id="panel">
        <div class="row">
          <span class="label">Level</span>
          <span class="value lvl" id="hud-level">—</span>
        </div>
        <div class="bar-wrap">
          <div class="bar"><div class="bar-fill" id="hud-bar"></div></div>
          <div class="xp-row">
            <span id="hud-xp-cur">0 XP</span>
            <span id="hud-xp-next">— to next</span>
          </div>
        </div>
        <div class="row">
          <span class="label">Today</span>
          <span class="value" id="hud-today">0 words</span>
        </div>
        <div class="row">
          <span class="label">WPM</span>
          <span class="value" id="hud-wpm">—</span>
        </div>
        <div class="row">
          <span class="label">Streak</span>
          <span class="value" id="hud-streak">—</span>
        </div>
      </div>
    `;

    const orb = shadow.getElementById("orb");
    const panel = shadow.getElementById("panel");

    hudEls = {
      orb,
      panel,
      level:  shadow.getElementById("hud-level"),
      xpCur:  shadow.getElementById("hud-xp-cur"),
      xpNext: shadow.getElementById("hud-xp-next"),
      bar:    shadow.getElementById("hud-bar"),
      today:  shadow.getElementById("hud-today"),
      wpm:    shadow.getElementById("hud-wpm"),
      streak: shadow.getElementById("hud-streak"),
    };

    orb.addEventListener("click", () => panel.classList.toggle("open"));

    // Backend stats update — fills in Level / XP / Streak and refines Today
    window.addEventListener("message", (e) => {
      if (e.data?.source !== "typequest" || e.data.type !== "STATS_UPDATE") return;
      const s = e.data.stats;
      lastKnownStats = s;

      orb.textContent = `L${s.level ?? 1}`;
      hudEls.level.textContent = s.level ?? "—";

      const xp = s.xp ?? 0;
      const xpNext = s.xpForNext ?? 50;
      hudEls.xpCur.textContent = `${xp.toLocaleString()} XP`;
      hudEls.xpNext.textContent = `${(xpNext - xp).toLocaleString()} to next`;
      hudEls.bar.style.width = `${Math.min(100, (xp / xpNext) * 100)}%`;

      hudEls.streak.textContent = s.streak > 0 ? `🔥 ${s.streak} days` : "—";

      // Merge backend wordsToday with local session so Today keeps going up
      updateHUDLive();
    });

    makeDraggable(host, orb);

    // Initial live render
    updateHUDLive();
  }

  function makeDraggable(target, handle) {
    let dragging = false, startX, startY, startRight, startBottom;
    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = target.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      handle.style.cursor = "grabbing";
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      target.style.right  = `${Math.max(8, startRight  - (e.clientX - startX))}px`;
      target.style.bottom = `${Math.max(8, startBottom - (e.clientY - startY))}px`;
    });
    document.addEventListener("mouseup", () => {
      if (dragging) { dragging = false; handle.style.cursor = "grab"; }
    });
  }

  // ──────── Bootstrap ────────
  attachListener();
  setTimeout(injectHUD, 1500);
})();
