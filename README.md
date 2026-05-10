# TypeQuest

> *Level up every word you type. Earn badges for every milestone. Watch your craft evolve.*

TypeQuest is a cross-platform gamification layer that sits on top of collaborative writing tools (Google Docs, Microsoft Word, and any web-based editor) and turns the act of writing into a progression-based RPG. It tracks your typing volume, speed, streaks, and time-on-task, then rewards you with XP, levels, badges, and a personal analytics dashboard.

## The Problem It Solves

Long-form writing (reports, dissertations, articles, documentation) is solitary, slow, and unrewarded. Students procrastinate not because they're lazy but because the feedback loop between effort and reward is invisible. TypeQuest closes that loop. Every keystroke counts toward something visible.

## Core Features

| Feature | Description |
|---|---|
| Real-time tracking | Words typed, WPM, active session time, daily streak |
| XP & Levels | 50 progressive levels, exponential XP curve |
| Badges | 40+ achievements across volume, speed, consistency, and milestone categories |
| Analytics dashboard | Day, week, month, all-time views with sparklines and heatmaps |
| Floating HUD | Optional in-document overlay showing live stats |
| Cross-platform | Single Chrome extension covers Google Docs, Word Online, Notion, and more. Native add-ins for Word desktop and Google Docs sidebar |
| Privacy-first | Tracks metadata only (counts, timing) — never document content |

## Components in This Repository

```
typequest/
├── docs/                  Architecture, UI/UX, integration guides
├── extension/             Chrome extension (Manifest V3) — primary capture client
├── backend/               Node.js + Express + MongoDB API
├── dashboard/             React analytics dashboard (Vite)
├── google-docs-addon/     Google Apps Script add-on (sidebar version)
└── word-addin/            Microsoft Office.js add-in (task pane version)
```

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Dashboard
cd dashboard && npm install && npm run dev

# Extension — load unpacked in chrome://extensions with Developer Mode on
```

Full step-by-step integration is in [`docs/INTEGRATION_GUIDE.md`](docs/INTEGRATION_GUIDE.md).

## Documentation Index

1. [Architecture & flow](docs/ARCHITECTURE.md) — system design, data flow, gamification engine logic
2. [UI/UX specification](docs/UI_UX.md) — wireframes, design tokens, interaction patterns
3. [Integration guide](docs/INTEGRATION_GUIDE.md) — installing each component, OAuth setup, deployment
4. [File structure reference](docs/FILE_STRUCTURE.md) — what every file does

## Tech Stack

| Layer | Technology |
|---|---|
| Capture | Chrome Extension (MV3), Office.js, Google Apps Script |
| Backend | Node.js 20+, Express 4, Mongoose, JWT auth |
| Database | MongoDB 7 (or MongoDB Atlas) |
| Frontend | React 18, Vite, TanStack Query, Recharts, Tailwind |
| Auth | Google OAuth 2.0 + Microsoft Identity Platform |
| Deploy | Vercel (dashboard), Railway/Render (API), Chrome Web Store |

## License

MIT — fork it, ship it, gamify your team's writing.
