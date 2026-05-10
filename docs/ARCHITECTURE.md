# Architecture & Flow

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAPTURE LAYER                               │
├─────────────────┬───────────────────────┬───────────────────────────┤
│  Chrome Ext.    │  Google Docs Add-on   │  Word Office Add-in       │
│  (content.js)   │  (Apps Script)        │  (Office.js task pane)    │
└────────┬────────┴───────────┬───────────┴──────────────┬────────────┘
         │                    │                          │
         │   Typing events    │   Polling / triggers     │   onChange
         │   (debounced)      │                          │
         ▼                    ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRACKING ENGINE (in-client)                      │
│   • Keystroke debouncer    • WPM calculator                         │
│   • Word counter (delta)   • Session timer (idle detection)         │
│   • Local cache (offline)  • Sync queue                             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │  Batched HTTPS (every 30s or 50 words)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (Node/Express)                    │
│   POST /api/sessions     POST /api/events     GET /api/stats        │
│   GET /api/badges        GET /api/leaderboard  POST /api/auth/*     │
└────────┬─────────────────┬──────────────────────────┬───────────────┘
         │                 │                          │
         ▼                 ▼                          ▼
   ┌─────────┐      ┌──────────────┐         ┌──────────────┐
   │ MongoDB │      │ Gamification │         │ Notification │
   │         │      │   Engine     │         │   Service    │
   │ users   │      │              │         │              │
   │ sessions│ ←──→ │ XP/Level     │         │ Badge unlock │
   │ events  │      │ Badge rules  │ ────→   │ Streak alert │
   │ badges  │      │ Streak calc  │         │ Level up     │
   └─────────┘      └──────────────┘         └──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                             │
├──────────────────────┬──────────────────────┬───────────────────────┤
│  Extension Popup     │  Floating HUD        │  Web Dashboard        │
│  (compact stats)     │  (in-doc overlay)    │  (full analytics)     │
└──────────────────────┴──────────────────────┴───────────────────────┘
```

## 2. Data Flow — Single Typing Session

1. User opens a Google Doc and starts typing.
2. The content script attaches an `input` event listener to the editor's contenteditable region.
3. Each keystroke increments an in-memory counter. A 500 ms debouncer triggers the metric calculator.
4. The calculator computes:
   - **delta_words** — words added since last flush
   - **delta_chars** — characters added
   - **active_seconds** — time since last keystroke (capped at 5 s for idle)
   - **wpm_burst** — instantaneous WPM over the last 60 seconds
5. Metrics are pushed to `chrome.storage.local` for offline resilience.
6. Every 30 seconds OR after 50 words (whichever first), a batched POST is sent to `/api/events`.
7. The backend persists the event, recalculates aggregates (daily totals, streak, all-time totals), and runs the gamification engine.
8. If a badge unlocks or level-up occurs, a WebSocket / SSE event pushes a notification back to the client.
9. The popup and floating HUD subscribe to local storage changes and re-render.

## 3. Gamification Engine — XP, Levels, Badges

### XP Curve
XP per word: `1` base. Bonus multipliers stack:
- WPM > 60: × 1.2
- Active streak day ≥ 7: × 1.3
- First 1,000 words of the day: × 1.5

```
xp_for_level(L) = floor(50 * L^1.5)
```

| Level | Cumulative XP | Title |
|------:|--------------:|-------|
| 1 | 0 | Apprentice Scribe |
| 5 | 559 | Drafter |
| 10 | 1,581 | Wordsmith |
| 20 | 4,472 | Chronicler |
| 30 | 8,216 | Author |
| 40 | 12,649 | Master Author |
| 50 | 17,677 | Grand Wordlord |

### Badge Categories

Badges live in the database as rules — adding a new badge is a single document insert, not a code deploy.

```javascript
// Sample badge definitions
[
  { code: "FIRST_100",     name: "First Steps",     rule: { type: "totalWords", threshold: 100 } },
  { code: "WORDS_10K",     name: "Ten Thousand",    rule: { type: "totalWords", threshold: 10000 } },
  { code: "WORDS_100K",    name: "Centurion",       rule: { type: "totalWords", threshold: 100000 } },
  { code: "SPEEDSTER_60",  name: "Speedster",       rule: { type: "sustainedWpm", wpm: 60, durationSec: 60 } },
  { code: "MARATHON_2H",   name: "Marathon Mind",   rule: { type: "singleSession", minutes: 120 } },
  { code: "STREAK_7",      name: "Week Warrior",    rule: { type: "dailyStreak", days: 7 } },
  { code: "STREAK_30",     name: "Monthly Monk",    rule: { type: "dailyStreak", days: 30 } },
  { code: "EARLY_BIRD",    name: "Early Bird",      rule: { type: "timeOfDay", before: "07:00", sessions: 5 } },
  { code: "NIGHT_OWL",     name: "Night Owl",       rule: { type: "timeOfDay", after: "23:00", sessions: 5 } },
  { code: "ZERO_BACKSPACE",name: "Confident Hand",  rule: { type: "noBackspace", words: 500 } },
]
```

### Evaluation Strategy
Badges are evaluated on every event flush. Already-unlocked badges are stored in `users.unlockedBadges[]` so they're skipped. New unlocks are returned in the API response so the client can show a celebration animation.

## 4. Privacy & Data Boundaries

TypeQuest never reads document content. The capture layer extracts only:
- Numeric counts (words, chars added/removed)
- Timestamps
- Application context (which app — *not* which document title or content)

This is enforced at the content-script level: the listener reads `event.inputType` and `event.data.length`, never `editor.innerText`.

## 5. Decision: Why Three Capture Methods?

| Method | Coverage | Latency | UX integration |
|---|---|---|---|
| Chrome extension | Best — works on docs.google.com, word.office.com, Notion, Confluence | Lowest | Floating overlay, browser popup |
| Google Docs add-on | Google Docs only | Higher (Apps Script throttling) | Native sidebar, surveys other Google apps |
| Word Office add-in | Word desktop + online | Low | Native task pane, ribbon button |

The extension is the recommended primary client. Add-ins exist for users who can't install browser extensions (managed enterprise environments) or want deeper native integration.

## 6. Scaling Considerations

- **Event batching** keeps writes manageable. A heavy user generates ~150 events per writing day.
- **Aggregate caching** — daily/monthly rollups are pre-computed nightly via a cron worker.
- **MongoDB indexes** on `{ userId, date }` and `{ userId, badgeCode }` are required from day one.
- **Rate limiting** — 60 req/min per user on the events endpoint protects against runaway clients.

## 7. Failure Modes & Recovery

| Failure | Behavior |
|---|---|
| Backend offline | Events queue in `chrome.storage.local`. Drained when connectivity returns. |
| Token expired | 401 triggers silent re-auth. If refresh fails, popup asks user to sign in. |
| User clears extension data | Server data is canonical. Login restores all stats. |
| Duplicate events | Backend uses `(userId, clientEventId)` unique index for idempotency. |