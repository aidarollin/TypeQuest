// extension/lib/tracker.js
// Pure typing-tracker engine. Consumes raw input events, emits metric snapshots.
// Has no DOM dependencies — testable in isolation.

export class TypingTracker {
  constructor({ idleThresholdMs = 5000, wpmWindowMs = 60000 } = {}) {
    this.idleThresholdMs = idleThresholdMs;
    this.wpmWindowMs = wpmWindowMs;

    // Counters since last flush
    this.deltaChars = 0;
    this.deltaWords = 0;
    this.deltaBackspaces = 0;
    this.activeMs = 0;

    // Internal state
    this.lastEventAt = null;
    this.sessionStartedAt = null;
    this.recentEvents = []; // for WPM rolling window: { ts, charCount }
    this.partialWordBuffer = ""; // accumulates chars until a word boundary
  }

  /**
   * Record a single input event.
   * @param {object} ev
   * @param {string} ev.inputType   "insertText" | "deleteContentBackward" | etc.
   * @param {string|null} ev.data    inserted text (if any)
   * @param {number} ev.timestamp    unix ms
   */
  record(ev) {
    const now = ev.timestamp ?? Date.now();
    if (!this.sessionStartedAt) this.sessionStartedAt = now;

    // Active-time accumulation: only count time up to idle threshold
    if (this.lastEventAt !== null) {
      const gap = now - this.lastEventAt;
      this.activeMs += Math.min(gap, this.idleThresholdMs);
    }
    this.lastEventAt = now;

    if (ev.inputType === "insertText" || ev.inputType === "insertCompositionText") {
      const text = ev.data ?? "";
      this.deltaChars += text.length;
      this.partialWordBuffer += text;

      // Word-boundary detection: split on whitespace or punctuation
      const completedWords = (this.partialWordBuffer.match(/\S+\s+/g) || []).length;
      if (completedWords > 0) {
        this.deltaWords += completedWords;
        // Keep only the trailing partial word
        const lastSpace = this.partialWordBuffer.lastIndexOf(" ");
        this.partialWordBuffer = this.partialWordBuffer.slice(lastSpace + 1);
      }

      this.recentEvents.push({ ts: now, charCount: text.length });
    } else if (
      ev.inputType === "deleteContentBackward" ||
      ev.inputType === "deleteContentForward"
    ) {
      this.deltaBackspaces += 1;
    }

    // Trim WPM-window events
    const cutoff = now - this.wpmWindowMs;
    this.recentEvents = this.recentEvents.filter(e => e.ts >= cutoff);
  }

  /** Get the rolling-window WPM. Words ≈ chars / 5 (standard typing benchmark). */
  currentWpm() {
    if (this.recentEvents.length === 0) return 0;
    const totalChars = this.recentEvents.reduce((a, e) => a + e.charCount, 0);
    const windowMin = this.wpmWindowMs / 60000;
    return Math.round((totalChars / 5) / windowMin);
  }

  /** Snapshot the deltas for upload. Returns the snapshot, then resets counters. */
  flush() {
    const snapshot = {
      deltaChars: this.deltaChars,
      deltaWords: this.deltaWords,
      deltaBackspaces: this.deltaBackspaces,
      activeMs: this.activeMs,
      wpm: this.currentWpm(),
      sessionStartedAt: this.sessionStartedAt,
      flushedAt: Date.now()
    };
    this.deltaChars = 0;
    this.deltaWords = 0;
    this.deltaBackspaces = 0;
    this.activeMs = 0;
    return snapshot;
  }

  /** True if there's anything worth uploading. */
  hasData() {
    return this.deltaChars > 0 || this.deltaBackspaces > 0;
  }

  /** Force a fresh session (e.g. on tab change). */
  resetSession() {
    this.sessionStartedAt = null;
    this.lastEventAt = null;
    this.recentEvents = [];
    this.partialWordBuffer = "";
  }
}