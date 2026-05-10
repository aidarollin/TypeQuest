# Integration Guide

This walks through getting every component running locally, then deploying. Allow ~45 minutes for first-time setup.

## Prerequisites

- Node.js 20+
- MongoDB 7+ (local or Atlas)
- Google Chrome (or Edge / any Chromium browser)
- A Google Cloud project (for OAuth + the Apps Script add-on)
- A Microsoft Azure tenant (for the Word add-in)

---

## Step 1 — Backend API

### 1.1 Install
```bash
cd backend
npm install
cp .env.example .env
```

### 1.2 Configure `.env`
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/typequest
JWT_SECRET=replace-with-32-byte-random-string
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
CORS_ORIGINS=http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID
```

Generate `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.3 Seed badge definitions
```bash
npm run seed:badges
```

### 1.4 Run
```bash
npm run dev
# → Server listening on http://localhost:4000
# → Test: curl http://localhost:4000/api/health
```

---

## Step 2 — Web Dashboard

### 2.1 Install
```bash
cd dashboard
npm install
cp .env.example .env.local
```

### 2.2 Configure `.env.local`
```env
VITE_API_URL=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
```

### 2.3 Run
```bash
npm run dev
# → http://localhost:5173
```

You should see the sign-in screen. Sign in with Google. (See section 5 for the OAuth setup.)

---

## Step 3 — Chrome Extension

### 3.1 Configure the API endpoint
Edit `extension/lib/config.js`:
```js
export const API_URL = "http://localhost:4000/api";   // change for prod
export const DASHBOARD_URL = "http://localhost:5173"; // change for prod
```

### 3.2 Add icon assets
Drop 16, 48, and 128 px PNG icons into `extension/icons/`. Filenames: `icon16.png`, `icon48.png`, `icon128.png`.

### 3.3 Load the extension
1. Open `chrome://extensions`
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Note the generated **Extension ID** — you'll need it for the backend's `CORS_ORIGINS`.

### 3.4 Update backend CORS
Add `chrome-extension://YOUR_EXTENSION_ID` to `CORS_ORIGINS` in `backend/.env` and restart the API.

### 3.5 Test
1. Open https://docs.google.com and create a new doc.
2. Type a few sentences.
3. Click the TypeQuest icon in the Chrome toolbar — you should see your word count.
4. Open the dashboard at http://localhost:5173 — your stats should be there.

---

## Step 4 — Google Docs Add-on (optional, alternative to extension)

The add-on appears as a sidebar inside Google Docs.

### 4.1 Create a new Apps Script project
1. Go to https://script.google.com → **New project**
2. Name it "TypeQuest"
3. Copy `google-docs-addon/Code.gs` into `Code.gs`
4. **File → New → HTML** → name it `Sidebar` → paste `Sidebar.html`
5. **Project Settings → Show "appsscript.json"** → paste the contents of `appsscript.json`

### 4.2 Configure the API endpoint
In `Code.gs`, set `const API_URL = "https://your-deployed-api.example.com/api";`. (Apps Script can't reach `localhost`. Use ngrok or deploy first.)

### 4.3 Deploy as a test add-on
1. **Deploy → Test deployments → Install**
2. Open any Google Doc
3. **Extensions → TypeQuest → Open sidebar**

---

## Step 5 — OAuth setup

### 5.1 Google OAuth (for both dashboard and Apps Script)
1. https://console.cloud.google.com → New project
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**
3. **Application type: Web application**
4. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://your-production-dashboard.com`
5. Authorized redirect URIs:
   - `http://localhost:5173/auth/callback`
   - `https://your-production-dashboard.com/auth/callback`
6. Copy the Client ID and secret into `backend/.env` and `dashboard/.env.local`.

### 5.2 Microsoft Identity (for Word add-in)
1. https://portal.azure.com → **Azure Active Directory → App registrations → New registration**
2. **Supported account types: Personal Microsoft accounts and any organizational directory**
3. **Redirect URI: Single-page application** → `https://localhost:3000/taskpane.html`
4. Copy the Application (client) ID into `word-addin/manifest.xml`.

---

## Step 6 — Word Office Add-in (optional)

### 6.1 Generate dev certs (one-time)
```bash
cd word-addin
npx office-addin-dev-certs install
```

### 6.2 Edit the manifest
Open `manifest.xml` — replace `<Id>` with a fresh GUID and update `<SourceLocation>` URLs to your dev host.

### 6.3 Run the dev server
```bash
npm install
npm run dev
# → https://localhost:3000/taskpane.html
```

### 6.4 Sideload into Word
- **Word desktop**: **Insert → My Add-ins → Upload My Add-in** → select `manifest.xml`
- **Word online**: same path, plus you may need to share via OneDrive

---

## Step 7 — Production Deployment

### 7.1 Deploy the backend
**Option A: Railway** (simplest)
```bash
railway login
railway init
railway up
```

**Option B: Render**
- Create a new Web Service from your repo
- Build command: `npm install`
- Start command: `npm run start`
- Add all environment variables from `.env`

### 7.2 Deploy the dashboard
**Vercel:**
```bash
cd dashboard
vercel --prod
```
Add `VITE_API_URL` (pointing to your deployed API) in the Vercel project settings.

### 7.3 Publish the extension
1. Bundle: `cd extension && zip -r typequest.zip .`
2. Chrome Web Store dashboard → New item → upload zip
3. Fill in store listing, screenshots, privacy policy
4. Submit for review (typically 1–3 days)

After approval, the production extension ID will be permanent — don't forget to update CORS_ORIGINS.

---

## Verifying End-to-End

A successful integration looks like this:

1. ✅ User opens a Google Doc, types 50 words
2. ✅ Within 30 seconds, those words appear in the extension popup
3. ✅ Within the same minute, they appear on the web dashboard
4. ✅ At the 100-word threshold, a "First Steps" badge toast appears
5. ✅ Closing the laptop and reopening preserves the streak

If any step fails, check the backend logs first (`/var/log/typequest.log` or wherever `winston` writes).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Extension popup says "Sign in" forever | CORS blocking the API | Add the extension ID to `CORS_ORIGINS` |
| Word count doesn't update | Content script didn't inject | Check Chrome devtools → Sources → Content scripts. Reload the doc. |
| Badges never trigger | Seed script wasn't run | `cd backend && npm run seed:badges` |
| Dashboard charts empty | API returns 401 | Token expired — sign out and back in |
| Apps Script returns 403 | Missing OAuth scopes | Edit `appsscript.json`, redeploy |