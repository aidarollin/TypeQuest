# TypeQuest

> Level up every word you type. Earn XP, unlock badges, and watch your writing habit grow.

TypeQuest sits on top of Google Docs, Microsoft Word, and Notion and turns writing into an RPG. Every word earns XP. Hit milestones, level up, collect 40+ badges, and track your progress on a personal analytics dashboard.

**Privacy-first:** only word counts and timing are tracked — document content is never read or stored.

---

## What you need

- [Node.js 20+](https://nodejs.org/) — download and install, no account needed
- [Google Chrome](https://www.google.com/chrome/) — to run the extension
- A **Google account** — used to sign in (no Google Cloud setup required to *try* it; see Step 3 if you want to run your own instance)

> **No MongoDB account needed.** If you have [Docker](https://www.docker.com/products/docker-desktop/) installed, one command starts a local database. No Docker? Use [MongoDB Atlas free tier](https://www.mongodb.com/atlas) — takes 2 minutes.

---

## Setup (5 minutes)

### 1 — Clone and install

```bash
git clone https://github.com/your-username/typequest.git
cd typequest
npm install       # installs the dev toolchain
npm run setup     # installs backend + dashboard dependencies
```

### 2 — Start a database

**Option A — Docker (no account needed):**
```bash
docker compose up -d
```
That's it. MongoDB is running on `localhost:27017`.

**Option B — MongoDB Atlas (free):**
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) — free tier, no credit card
2. Create a cluster → **Connect → Drivers** → copy the connection string
3. Replace `<password>` in the string and paste it into `backend/.env` as `MONGODB_URI`

### 3 — Configure environment

```bash
cp backend/.env.example backend/.env
cp dashboard/.env.example dashboard/.env.local
```

Open `backend/.env` and fill in the two Google OAuth values.  
Open `dashboard/.env.local` and fill in the same Client ID.

**Getting Google OAuth credentials (one-time, ~3 minutes):**

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in
2. Click **Select a project → New project** → give it any name → **Create**
3. In the left menu: **APIs & Services → Credentials**
4. Click **+ Create Credentials → OAuth client ID**
5. If prompted, click **Configure consent screen** → External → fill in App name → Save
6. Back in Credentials: Application type = **Web application**
7. Under **Authorized JavaScript origins**, click **+ Add URI** → type `http://localhost:5173`
8. Click **Create** — copy the **Client ID** and **Client Secret**

Paste them into `backend/.env`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```
And into `dashboard/.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 4 — Start everything

```bash
npm run seed   # load the 40 badges into the database (run once)
npm run dev    # starts the API on :4000 and dashboard on :5173
```

Open [http://localhost:5173](http://localhost:5173) — you should see the TypeQuest sign-in screen.

---

## Load the Chrome Extension

1. Open **chrome://extensions/** in Chrome
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked** → select the `extension/` folder
4. Note the Extension ID shown on the card (e.g. `abcde...`)
5. Add it to `backend/.env`:
   ```env
   CORS_ORIGINS=http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID
   ```
6. Restart the backend: stop with `Ctrl+C`, then `npm run dev` again

### Sign in to the extension

1. Click the **TypeQuest icon** in the Chrome toolbar
2. Click **Sign in** — the dashboard login page opens
3. Sign in with Google, then close that tab
4. Click the toolbar icon again — your stats appear

### Start tracking

Open any [Google Doc](https://docs.google.com), start typing.  
A gold orb appears in the bottom-right. Click it to see Level, XP, WPM, and streak — updating live as you type.

---

## Optional: Google Docs Sidebar Add-on

An alternative to the extension — shows a sidebar inside Google Docs. Requires a public backend URL (the extension works on localhost; the add-on doesn't).

Once your backend is deployed (see below):

1. Go to [script.google.com](https://script.google.com) → **New project**, name it `TypeQuest`
2. Paste `google-docs-addon/Code.gs` into `Code.gs`; set `API_BASE` to your deployed URL
3. **File → New → HTML** → name it `Sidebar` → paste `google-docs-addon/Sidebar.html`
4. **Project Settings → Show appsscript.json** → replace with `google-docs-addon/appsscript.json`
5. **Deploy → Test deployments → Google Workspace add-on → Install**
6. Open a Google Doc → **Extensions → TypeQuest → Open sidebar**

---

## Optional: Microsoft Word Add-in

```bash
cd word-addin
npm install
npx office-addin-dev-certs install   # installs a local dev HTTPS cert (one-time)
npm run dev
```

In Word desktop: **Insert → Add-ins → My Add-ins → Upload My Add-in** → select `word-addin/manifest.xml`.

---

## Deploying your own instance

### Backend

Deploy to [Railway](https://railway.app/), [Render](https://render.com/), or [Fly.io](https://fly.io/) — all have free tiers.  
Set the same environment variables from `backend/.env.example`.  
Start command: `npm start`

### Dashboard

```bash
npx vercel --prefix dashboard --prod
```
Add `VITE_API_URL` (your deployed backend URL) and `VITE_GOOGLE_CLIENT_ID` in the Vercel project settings.

After deploying, add your production URLs to Google OAuth:  
**Cloud Console → APIs & Services → Credentials → your OAuth client → Edit** → add the production domain to Authorized JavaScript Origins.

### Chrome Extension (publish to Web Store)

```bash
cd extension && zip -r typequest.zip . --exclude "*.DS_Store"
```
Upload at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).  
After approval, update `CORS_ORIGINS` in your backend with the permanent extension ID.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Extension stuck on "Sign in" | Add the extension ID to `CORS_ORIGINS` and restart the backend |
| Orb appears but count stays at 0 | Reload the extension at `chrome://extensions/`, then open a **new** Google Docs tab |
| Sign-in fails with redirect_uri_mismatch | Add `http://localhost:5173` to Authorized JavaScript Origins in Google Cloud |
| Dashboard shows no data | Make sure `npm run seed` ran successfully |
| MongoDB connection error | Docker: run `docker compose up -d`. Atlas: whitelist your IP under **Network Access** |
| Word add-in won't load | Run `npx office-addin-dev-certs install` and trust the certificate |

---

## Tech stack

| Layer | Technology |
|---|---|
| Tracking | Chrome Extension (MV3), Google Apps Script, Office.js |
| Backend | Node.js 20, Express 4, Mongoose, JWT |
| Database | MongoDB 7 |
| Dashboard | React 18, Vite, TanStack Query v5, Recharts |
| Auth | Google OAuth 2.0 |

---

## License

MIT — fork it, deploy it, gamify your team's writing.
