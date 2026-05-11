// Toggle IS_DEV to false and set PROD_URL after you deploy to Render
const IS_DEV = true;
const PROD_URL = "https://YOUR-APP-NAME.onrender.com";

export const CONFIG = {
  API_URL: IS_DEV ? "http://localhost:4000/api" : `${PROD_URL}/api`,
  DASHBOARD_URL: IS_DEV ? "http://localhost:5173" : PROD_URL,

  IDLE_THRESHOLD_MS:   5000,
  FLUSH_INTERVAL_MS:  30000,
  FLUSH_WORD_THRESHOLD:   50,
  WPM_WINDOW_MS:      60000,

  HOST_TO_APP: {
    "docs.google.com":                  "google_docs",
    "word.office.com":                  "word_online",
    "word-edit.officeapps.live.com":    "word_online",
    "www.notion.so":                    "notion"
  }
};
