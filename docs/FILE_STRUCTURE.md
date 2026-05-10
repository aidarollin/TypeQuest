# File Structure Reference

```
typequest/
├── README.md                            Main project introduction
├── .gitignore
│
├── docs/
│   ├── ARCHITECTURE.md                  System design, data flow, gamification engine
│   ├── UI_UX.md                         Wireframes, design tokens, interaction patterns
│   ├── INTEGRATION_GUIDE.md             Step-by-step setup for every component
│   └── FILE_STRUCTURE.md                This file
│
├── extension/                           Chrome extension (Manifest V3)
│   ├── manifest.json                    Extension manifest — permissions, content scripts
│   ├── background.js                    Service worker — auth, sync queue, badge listener
│   ├── content.js                       Injected into Docs/Word/Notion — captures keystrokes
│   ├── hud.js                           Floating in-doc HUD overlay logic
│   ├── hud.css                          HUD styles (Shadow DOM-encapsulated)
│   ├── lib/
│   │   ├── config.js                    API endpoint, dashboard URL, feature flags
│   │   ├── tracker.js                   Pure tracking engine (testable, framework-free)
│   │   ├── api.js                       fetch wrapper with auth + retry
│   │   └── storage.js                   chrome.storage.local helpers
│   ├── popup/
│   │   ├── popup.html                   Popup markup
│   │   ├── popup.js                     Popup state and rendering
│   │   └── popup.css                    Popup styles
│   └── icons/                           16/48/128 px icons (drop your PNGs here)
│
├── backend/                             Node.js + Express API
│   ├── package.json
│   ├── .env.example                     Sample environment variables
│   ├── server.js                        Entry point — Express app bootstrap
│   ├── config/
│   │   ├── db.js                        MongoDB connection
│   │   └── badges.seed.js               Badge definition seeds
│   ├── models/
│   │   ├── User.js                      User schema (auth, stats, level)
│   │   ├── Session.js                   Writing session document
│   │   ├── Event.js                     Granular typing event
│   │   └── Badge.js                     Badge definitions and unlocks
│   ├── routes/
│   │   ├── auth.routes.js               POST /auth/google, /auth/refresh, /auth/me
│   │   ├── events.routes.js             POST /events (batch ingest)
│   │   ├── stats.routes.js              GET /stats/overview, /stats/range
│   │   ├── badges.routes.js             GET /badges, /badges/unlocked
│   │   └── leaderboard.routes.js        GET /leaderboard (optional, opt-in)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── events.controller.js
│   │   ├── stats.controller.js
│   │   └── badges.controller.js
│   ├── services/
│   │   ├── gamification.service.js      XP curve, level lookup, badge rule engine
│   │   ├── streak.service.js            Daily streak tracking + recovery rules
│   │   └── analytics.service.js         Aggregations for dashboard charts
│   └── middleware/
│       ├── auth.middleware.js           JWT verification
│       ├── rateLimit.middleware.js      Per-user rate limiting
│       └── errorHandler.middleware.js   Centralized error formatting
│
├── dashboard/                           React + Vite analytics dashboard
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx                     React entry, Router, QueryClient
│       ├── App.jsx                      App shell + route definitions
│       ├── components/
│       │   ├── LevelRing.jsx            Circular SVG progress ring
│       │   ├── XPBar.jsx                Animated horizontal XP bar
│       │   ├── StatCard.jsx             Big-number stat tile
│       │   ├── BadgeGrid.jsx            Grid of earned + locked badges
│       │   ├── BadgeCard.jsx            Single badge tile (locked/unlocked states)
│       │   ├── DailyChart.jsx           Recharts bar chart
│       │   ├── HeatmapChart.jsx         Day-of-week × hour-of-day heatmap
│       │   ├── StreakFlame.jsx          Animated streak indicator
│       │   ├── BadgeUnlockToast.jsx     Slide-in celebration toast
│       │   └── LevelUpModal.jsx         Full-screen level-up celebration
│       ├── pages/
│       │   ├── SignIn.jsx
│       │   ├── Dashboard.jsx            Main analytics view
│       │   ├── Badges.jsx               All badges (locked + unlocked)
│       │   └── Settings.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useStats.js
│       │   └── useBadges.js
│       ├── utils/
│       │   ├── api.js                   Axios instance with auth interceptor
│       │   ├── format.js                Number/duration formatters
│       │   └── levels.js                Client-side level lookup
│       └── styles/
│           ├── globals.css              CSS variables (design tokens)
│           └── tailwind.css
│
├── google-docs-addon/                   Apps Script Google Docs add-on
│   ├── Code.gs                          Server-side script (fetch to API, doc triggers)
│   ├── Sidebar.html                     Sidebar UI
│   └── appsscript.json                  Apps Script manifest, OAuth scopes
│
└── word-addin/                          Microsoft Word Office.js add-in
    ├── manifest.xml                     Office add-in manifest
    ├── package.json
    ├── webpack.config.js
    ├── src/
    │   ├── taskpane/
    │   │   ├── taskpane.html
    │   │   ├── taskpane.js              Office.js change listener + UI
    │   │   └── taskpane.css
    │   └── commands/
    │       ├── commands.html
    │       └── commands.js              Ribbon button handlers
    └── assets/
        └── icon-*.png                   16/32/64/80 px ribbon icons
```

## What lives where, briefly

- **Capture logic** lives in `extension/content.js`, `google-docs-addon/Code.gs`, and `word-addin/src/taskpane/taskpane.js`. Each is a thin client that delegates to the same backend.
- **Domain rules** (XP curve, badge thresholds, streak math) live in `backend/services/`. There is exactly one source of truth.
- **Presentation** is split between the popup (`extension/popup/`) and the full dashboard (`dashboard/src/`). They consume the same API endpoints.
- **The database schema** is defined entirely in `backend/models/`. New fields go there first, then propagate.