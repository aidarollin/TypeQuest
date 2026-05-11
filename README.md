# TypeQuest

> Level up every word you type. Earn XP, unlock badges, and watch your writing habit grow.

TypeQuest turns writing into an RPG. It tracks your words, speed, and streaks across Google Docs, Microsoft Word, and Notion — then rewards you with XP, levels, and 40+ badges shown on a personal dashboard.

**Privacy-first:** only word counts and timing are tracked — document content is never read or stored.

---

## How to use TypeQuest (no local setup)

TypeQuest has two parts: a **web app + API** (deployed to the cloud) and a **Chrome extension** (loaded from this repo). You only need to deploy once, then anyone you share the link with can sign up — no one else needs to run anything locally.

---

## Step 1 — Get a Google OAuth Client ID (~3 min)

This is the only credential you need. It's free and requires no billing.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → sign in with any Google account
2. **Select a project → New project** → name it anything → **Create**
3. Left menu: **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
4. If prompted: **Configure consent screen → External** → fill in an app name → **Save and continue** (skip the rest)
5. Back in Credentials — Application type: **Web application**
6. Under **Authorized JavaScript origins** add:
   ```
   https://YOUR-APP-NAME.onrender.com
   ```
   *(You'll choose the app name in Step 2 — use anything, e.g. `typequest-yourinitials`)*
7. Click **Create** → copy the **Client ID** and **Client Secret**

---

## Step 2 — Deploy to Render (~5 min)

Render hosts the backend API and the dashboard together for free. No credit card required.

1. [Create a free Render account](https://render.com/) (sign in with GitHub)
2. Click **New → Web Service → Build and deploy from a Git repository**
3. Connect this repo (`typequest`)
4. Render auto-reads `render.yaml` — it pre-fills the build and start commands
5. Fill in the **Environment Variables** section:

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your Atlas connection string (see below) |
   | `GOOGLE_CLIENT_ID` | Client ID from Step 1 |
   | `GOOGLE_CLIENT_SECRET` | Client Secret from Step 1 |
   | `VITE_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` |
   | `CORS_ORIGINS` | Leave blank for now — you'll add the extension ID in Step 4 |

6. Click **Create Web Service** — Render builds and deploys (takes ~3 minutes)
7. Your app is live at `https://YOUR-APP-NAME.onrender.com` 🎉

**Getting a MongoDB URI (free, 2 min):**
- Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) → create a free cluster
- **Connect → Drivers** → copy the connection string → replace `<password>`
- Under **Network Access → Add IP Address → Allow Access from Anywhere**

---

## Step 3 — Load the Chrome Extension

The extension connects to your deployed app — no local server needed.

1. Open this file in the repo: `extension/lib/config.js`
2. Change two lines:
   ```js
   const IS_DEV = false;                                        // was: true
   const PROD_URL = "https://YOUR-APP-NAME.onrender.com";      // your Render URL
   ```
3. Open **chrome://extensions/** → toggle **Developer mode** on
4. Click **Load unpacked** → select the `extension/` folder
5. Note the **Extension ID** shown on the card (e.g. `abcde...fghij`)
6. Go to Render → your service → **Environment** → add/update:
   ```
   CORS_ORIGINS = chrome-extension://YOUR_EXTENSION_ID
   ```
7. Click **Save Changes** — Render redeploys automatically

---

## Step 4 — Sign in and start writing

1. Open `https://YOUR-APP-NAME.onrender.com` → sign in with Google
2. Click the **TypeQuest icon** in Chrome toolbar → **Sign in** → sign in → close the tab
3. Open any [Google Doc](https://docs.google.com) and start typing

A gold orb appears in the bottom-right corner. Click it to see your Level, XP, WPM, and streak — updating live as you type. Stats sync to the dashboard within 30 seconds.

---

## Share with others

Once deployed, anyone can use your TypeQuest instance:
- Share your Render URL — they sign in with their own Google account
- They install the extension (Steps 3 above) pointing to your URL
- Each user gets their own stats, badges, and dashboard

---

## Optional: Google Docs Sidebar Add-on

An in-document sidebar (alternative to the extension). Requires your deployed Render URL.

1. Go to [script.google.com](https://script.google.com) → **New project**, name it `TypeQuest`
2. Paste `google-docs-addon/Code.gs` into `Code.gs`
3. Set `const API_BASE = "https://YOUR-APP-NAME.onrender.com/api"` at the top
4. **File → New → HTML file** → name it `Sidebar` → paste `google-docs-addon/Sidebar.html`
5. **Project Settings → Show appsscript.json** → replace with `google-docs-addon/appsscript.json`
6. **Deploy → Test deployments → Google Workspace add-on → Install**
7. Open any Google Doc → **Extensions → TypeQuest → Open sidebar**

---

## Optional: Microsoft Word Add-in

Requires Node.js locally (one-time setup per machine):

```bash
cd word-addin
npm install
npx office-addin-dev-certs install
npm run dev
```

In Word: **Insert → Add-ins → My Add-ins → Upload My Add-in** → select `word-addin/manifest.xml`.

---

## Running locally (for development)

<details>
<summary>Expand for local dev instructions</summary>

**Prerequisites:** Node.js 20+, Google Chrome, Docker (optional)

```bash
git clone https://github.com/your-username/typequest.git
cd typequest
npm install && npm run setup
```

Start a local database:
```bash
docker compose up -d          # MongoDB on localhost:27017
```

Configure environment:
```bash
cp backend/.env.example backend/.env
cp dashboard/.env.example dashboard/.env.local
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in backend/.env
# Fill in VITE_GOOGLE_CLIENT_ID in dashboard/.env.local
```

Add `http://localhost:5173` to your Google OAuth client's Authorized JavaScript Origins.

Start everything:
```bash
npm run dev    # starts API on :4000 and dashboard on :5173
```

Load the extension: set `IS_DEV = true` in `extension/lib/config.js`, then load unpacked from `chrome://extensions/`.

</details>

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Sign-in fails with `redirect_uri_mismatch` | Add your Render URL to **Authorized JavaScript Origins** in Google Cloud Console |
| Extension stuck on "Sign in" | Add `chrome-extension://YOUR_ID` to `CORS_ORIGINS` in Render env and redeploy |
| Orb shows but count stays 0 | Edit `config.js` with your Render URL, reload extension at `chrome://extensions/`, open a **new** Google Docs tab |
| Render build fails | Check that `VITE_GOOGLE_CLIENT_ID` is set in Render env — it's needed at build time |
| MongoDB connection refused | In Atlas: **Network Access → Add IP → Allow from anywhere (0.0.0.0/0)** |
| Dashboard blank after deploy | Check Render logs — usually a missing env var |

---

## Tech stack

| Layer | Technology |
|---|---|
| Tracking | Chrome Extension (MV3), Google Apps Script, Office.js |
| Backend | Node.js 20, Express 4, Mongoose, JWT |
| Database | MongoDB 7 / Atlas |
| Dashboard | React 18, Vite, TanStack Query v5, Recharts |
| Auth | Google OAuth 2.0 |
| Hosting | Render (API + dashboard), MongoDB Atlas |

---

## License

MIT — fork it, deploy it, gamify your team's writing.
