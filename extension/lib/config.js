// extension/lib/config.js
// Single source of truth for environment-dependent values.
// Toggle DEV by changing IS_DEV when packaging.

const IS_DEV = true;

export const CONFIG = {
  API_URL: IS_DEV
    ? "http://localhost:4000/api"
    : "https://api.typequest.app/api",

  DASHBOARD_URL: IS_DEV
    ? "http://localhost:5173"
    : "https://app.typequest.app",

  // Tracking tuneables
  IDLE_THRESHOLD_MS: 5000,        // pause active timer after this long without input
  FLUSH_INTERVAL_MS: 30000,       // batch upload cadence
  FLUSH_WORD_THRESHOLD: 50,       // flush early if this many words accumulated
  WPM_WINDOW_MS: 60000,           // rolling window for instantaneous WPM

  // Detected app surfaces (host → app code)
  HOST_TO_APP: {
    "docs.google.com": "google_docs",
    "word.office.com": "word_online",
    "word-edit.officeapps.live.com": "word_online",
    "www.notion.so": "notion"
  }
};