# TypeQuest

> Level up every word you type. Earn XP, unlock badges, and watch your writing habit grow.

TypeQuest is a gamification layer for writing tools. It tracks your words, speed, and streaks across Google Docs, Microsoft Word, and Notion — then rewards you with XP, levels, and 40+ badges shown on a personal analytics dashboard.

**Privacy-first:** only counts are tracked, never document content.

---

## What's in This Repo

| Folder | What it does |
|---|---|
| `backend/` | Node.js + Express REST API, MongoDB, JWT auth |
| `dashboard/` | React analytics dashboard (Vite) |
| `extension/` | Chrome extension (Manifest V3) — the primary tracking client |
| `google-docs-addon/` | Google Apps Script sidebar add-on (alternative to extension) |
| `word-addin/` | Microsoft Office.js task-pane add-in |

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier is enough) **or** MongoDB running locally
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth 2.0 credentials
- Google Chrome (or any Chromium browser)

---

## Quick Start

```bash
git clone https://github.com/your-username/typequest.git
cd typequest
```

You'll run three things in separate terminals: the backend API, the dashboard, and the Chrome extension.

---

## 1 — Backend API

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in the four required values:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/typequest
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

Seed the badge definitions (one-time):

```bash
npm run seed:badges
```

Start the server:

```bash
npm run dev
```

Verify it's running:

```
GET http://localhost:4000/api/health  →  { "status": "ok" }
```

---

## 2 — Dashboard

```bash
cd dashboard
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=<same-client-id>.apps.googleusercontent.com
```

> `VITE_API_URL` can be left out — Vite proxies `/api` to `localhost:4000` automatically.

Start the dashboard:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You'll see the sign-in screen.

---

## 3 — Google OAuth Setup

If you haven't set up OAuth credentials yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Add to **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   ```
5. Add to **Authorized redirect URIs**:
   ```
   http://localhost:5173
   ```
6. Copy the **Client ID** and **Client Secret** into `backend/.env` and `dashboard/.env.local`

---

## 4 — Chrome Extension

### Load it

1. Open `chrome://extensions/` in Chrome
2. Toggle **Developer mode** on (top-right switch)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. The TypeQuest icon appears in your toolbar

### Add the extension ID to the backend

After loading, Chrome assigns your extension an ID (shown on the extensions page, e.g. `abcdefghijklmnopqrstuvwxyz123456`).

Add it to `backend/.env`:

```env
CORS_ORIGINS=http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID
```

Restart the backend after saving.

### Sign in

1. Click the **TypeQuest icon** in the Chrome toolbar
2. Click **Sign in** — the dashboard sign-in page opens in a new tab
3. Sign in with Google
4. Close that tab and click the toolbar icon again — your stats will appear

### Start tracking

Open any [Google Doc](https://docs.google.com), start typing. The gold orb appears in the bottom-right corner and counts words live. Click it to expand the stats panel.

Words flush to the backend every 30 seconds (or every 50 words). After the first flush, Level, XP, and Streak populate in the panel.

---

## 5 — Google Docs Add-on (optional)

The add-on is an alternative to the extension for users who prefer a sidebar inside Google Docs. It requires a publicly reachable backend URL (the extension works with localhost).

1. Go to [script.google.com](https://script.google.com) → **New project**, name it `TypeQuest`
2. Paste `google-docs-addon/Code.gs` into the default `Code.gs` file
3. **File → New → HTML file** → name it `Sidebar` → paste `google-docs-addon/Sidebar.html`
4. Open **Project Settings → Show "appsscript.json"** → replace its contents with `google-docs-addon/appsscript.json`
5. In `Code.gs`, set `API_BASE` to your deployed backend URL (see [Deployment](#deployment))
6. **Deploy → Test deployments → Google Workspace add-on → Install**
7. Open any Google Doc → **Extensions → TypeQuest → Open sidebar**

---

## 6 — Word Add-in (optional)

Requires Node.js and a Microsoft 365 account.

```bash
cd word-addin
npm install
npx office-addin-dev-certs install   # one-time: installs a local HTTPS cert
npm run dev                           # starts at https://localhost:3000
```

Sideload into Word desktop:

1. **Insert → Add-ins → My Add-ins → Upload My Add-in**
2. Select `word-addin/manifest.xml`

The TypeQuest task pane opens in the Word sidebar.

---

## Deployment

For others to use your instance you need the backend and dashboard deployed publicly.

### Backend (Railway / Render / Fly.io)

Any Node.js host works. Set all environment variables from `.env.example`. The `npm start` command runs `node server.js`.

### Dashboard (Vercel)

```bash
cd dashboard
npx vercel --prod
```

Set `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` in the Vercel project settings.

After deploying, update your Google OAuth credentials to include the production URLs in **Authorized JavaScript origins** and **Authorized redirect URIs**.

### Chrome Extension (Chrome Web Store)

```bash
cd extension
zip -r typequest-extension.zip . --exclude "*.DS_Store"
```

Upload the zip at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). After approval, update `CORS_ORIGINS` in your backend with the permanent production extension ID.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Extension popup stuck on "Sign in" | Add the extension ID to `CORS_ORIGINS` in `backend/.env` and restart |
| Orb appears but word count stays 0 | Reload the extension, then open a **new** Google Docs tab |
| Dashboard shows empty charts | Run `npm run seed:badges` in `backend/`, then sign out and back in |
| MongoDB connection refused | Whitelist your IP in Atlas: **Network Access → Add IP → Allow from anywhere** |
| Apps Script returns 403 | Check `oauthScopes` in `appsscript.json` and redeploy |
| Word add-in won't load | Run `npx office-addin-dev-certs install` and trust the cert in Windows |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Tracking | Chrome Extension (MV3), Google Apps Script, Office.js |
| Backend | Node.js 20, Express 4, Mongoose, JWT |
| Database | MongoDB 7 / Atlas |
| Dashboard | React 18, Vite, TanStack Query v5, Recharts |
| Auth | Google OAuth 2.0 |

---

## License

MIT — fork it, deploy it, gamify your team's writing.
