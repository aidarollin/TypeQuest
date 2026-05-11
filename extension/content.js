// extension/content.js
// Injected into supported writing apps. Listens for input events,
// runs the tracker, and handles HUD injection.
//
// Note: We deliberately avoid reading document content. We only inspect
// event metadata (inputType, data length).

(() => {
  // The content script is plain JS (not a module) per Manifest V3 limits.
  // We inline a minimal tracker here mirroring lib/tracker.js semantics.

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
    sessionTotalWords: 0   // cumulative across flushes for local orb display
  };

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
        updateOrbCount(state.sessionTotalWords);
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

    // Trigger early flush if word threshold reached
    if (state.deltaWords >= FLUSH_WORD_THRESHOLD) {
      flushAndSend("threshold");
    }
  }

  function currentWpm() {
    if (state.recentEvents.length === 0) return 0;
    const totalChars = state.recentEvents.reduce((a, e) => a + e.charCount, 0);
    const windowMin = WPM_WINDOW_MS / 60000;
    return Math.round((totalChars / 5) / windowMin);
  }

  function snapshotAndReset() {
    const snapshot = {
      clientEventId: `${state.sessionStartedAt}-${state.clientEventCounter++}`,
      app: appName,
      url: location.hostname, // hostname only, no path/query
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
        // Background acks. Used for HUD live updates if it's mounted.
        if (response && response.stats) {
          window.postMessage(
            { source: "typequest", type: "STATS_UPDATE", stats: response.stats },
            "*"
          );
        }
      }
    );
  }

  // ──────── Find the editable region ────────
  function attachListener() {
    // Google Docs uses a hidden contenteditable div for input; the target may not
    // pass a simple isContentEditable check. Since content.js only runs on known
    // writing apps, accept all input events and filter only obvious non-editor targets.
    const isKnownWritingApp = appName !== "unknown";

    document.addEventListener(
      "input",
      (event) => {
        const target = event.target;
        const tagName = target?.tagName;

        if (isKnownWritingApp) {
          // On known writing apps, skip only form inputs that are clearly not the editor
          if (tagName === "SELECT" || tagName === "BUTTON") return;
          if (tagName === "INPUT" && !/^(text|search)$/i.test(target.type || "")) return;
        } else {
          const isEditable =
            target?.isContentEditable ||
            tagName === "TEXTAREA" ||
            (tagName === "INPUT" && /^(text|search)$/i.test(target.type || ""));
          if (!isEditable) return;
        }

        recordEvent(event.inputType, event.data);
      },
      true
    );
  }

  // ──────── Periodic flush ────────
  setInterval(() => flushAndSend("interval"), FLUSH_INTERVAL_MS);

  // Flush on tab hide / unload — last-ditch save
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAndSend("hidden");
  });
  window.addEventListener("beforeunload", () => flushAndSend("unload"));

  // ──────── HUD injection ────────
  let hudOrb = null;

  function updateOrbCount(count) {
    if (hudOrb) hudOrb.textContent = count;
  }

  function injectHUD() {
    // Avoid duplicate mounts on SPA navigations
    if (document.getElementById("tq-hud-host")) return;

    const host = document.createElement("div");
    host.id = "tq-hud-host";
    host.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      z-index: 2147483647; pointer-events: none;
    `;
    document.body.appendChild(host);

    // Use Shadow DOM to fully encapsulate styles from host page CSS
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .orb {
          pointer-events: auto;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #131A2B 0%, #1C2540 100%);
          border: 2px solid #F5B342;
          color: #F5B342;
          font: 600 16px "Inter", system-ui, sans-serif;
          display: flex; align-items: center; justify-content: center;
          cursor: grab;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          user-select: none;
        }
        .orb:hover { transform: scale(1.05); box-shadow: 0 0 24px rgba(245,179,66,0.45); }
        .panel {
          pointer-events: auto;
          position: absolute; bottom: 64px; right: 0;
          width: 280px;
          background: #131A2B;
          border: 1px solid #2A3556;
          border-radius: 12px;
          padding: 16px;
          color: #E8EBF5;
          font: 13px "Inter", system-ui, sans-serif;
          opacity: 0; transform: translateY(8px); pointer-events: none;
          transition: opacity 0.2s, transform 0.2s;
        }
        .panel.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; }
        .row .label { color: #9AA3B8; }
        .row .value { color: #E8EBF5; font-variant-numeric: tabular-nums; font-weight: 500; }
        .lvl { color: #F5B342; font-weight: 700; }
        .bar { height: 4px; background: #2A3556; border-radius: 2px; margin-top: 8px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #6FCFEB, #F5B342); transition: width 0.4s ease-out; }
      </style>
      <div class="orb" id="orb">0</div>
      <div class="panel" id="panel">
        <div class="row"><span class="label">Level</span><span class="value lvl" id="hud-level">—</span></div>
        <div class="row"><span class="label">XP</span><span class="value" id="hud-xp">—</span></div>
        <div class="bar"><div class="bar-fill" id="hud-bar" style="width:0%"></div></div>
        <div class="row" style="margin-top:8px"><span class="label">Today</span><span class="value" id="hud-today">— words</span></div>
        <div class="row"><span class="label">WPM</span><span class="value" id="hud-wpm">—</span></div>
        <div class="row"><span class="label">Streak</span><span class="value" id="hud-streak">—</span></div>
      </div>
    `;

    const orb = shadow.getElementById("orb");
    hudOrb = orb;
    orb.textContent = state.sessionTotalWords;
    const panel = shadow.getElementById("panel");
    orb.addEventListener("click", () => panel.classList.toggle("open"));

    // Listen for stats updates from background ack
    window.addEventListener("message", (e) => {
      if (e.data?.source !== "typequest" || e.data.type !== "STATS_UPDATE") return;
      const s = e.data.stats;
      orb.textContent = `L${s.level ?? 1}`;
      shadow.getElementById("hud-level").textContent = s.level ?? "—";
      shadow.getElementById("hud-xp").textContent =
        `${s.xp ?? 0} / ${s.xpForNext ?? 0}`;
      shadow.getElementById("hud-bar").style.width =
        `${Math.min(100, ((s.xp / s.xpForNext) * 100) || 0)}%`;
      shadow.getElementById("hud-today").textContent = `${s.wordsToday ?? 0} words`;
      shadow.getElementById("hud-wpm").textContent = s.wpm ?? "—";
      shadow.getElementById("hud-streak").textContent = `🔥 ${s.streak ?? 0} days`;
    });

    // Make orb draggable
    makeDraggable(host, orb);
  }

  function makeDraggable(target, handle) {
    let dragging = false;
    let startX, startY, startRight, startBottom;
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
      target.style.right = `${Math.max(8, startRight - (e.clientX - startX))}px`;
      target.style.bottom = `${Math.max(8, startBottom - (e.clientY - startY))}px`;
    });
    document.addEventListener("mouseup", () => {
      if (dragging) {
        dragging = false;
        handle.style.cursor = "grab";
      }
    });
  }

  // ──────── Bootstrap ────────
  attachListener();
  // Wait a moment for SPA editors to mount before injecting HUD
  setTimeout(injectHUD, 1500);
})();