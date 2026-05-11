/**
 * TypeQuest — Google Docs add-on
 *
 * Strategy: Apps Script cannot listen for keystrokes inside the editor.
 * Instead we poll the open document every `POLL_INTERVAL_MIN` minute(s)
 * via a time-driven trigger, diff word counts against the last snapshot
 * stored in DocumentProperties, and post the delta to the TypeQuest API.
 *
 * The Chrome Extension is the higher-fidelity capture path; this add-on
 * exists for users who can't (or don't want to) install the extension.
 */

const API_BASE = 'https://api.typequest.app/api';
const POLL_INTERVAL_MIN = 1;
const PROP_LAST_WORDS = 'tq_last_word_count';
const PROP_LAST_RUN = 'tq_last_run_iso';
const PROP_TOKEN = 'tq_token';
const PROP_DOC_ID = 'tq_doc_id';
const PROP_SESSION_START = 'tq_session_start_iso';

// ---------- Lifecycle ----------

function onHomepage(e) {
  return buildSidebar();
}

function onInstall(e) {
  ensurePollingTrigger_();
}

function onOpen(e) {
  ensurePollingTrigger_();
  recordSnapshot_(); // baseline so first delta isn't the entire doc
}

// ---------- Sidebar ----------

function buildSidebar() {
  const tmpl = HtmlService.createTemplateFromFile('Sidebar');
  tmpl.user = getUserState_();
  return tmpl
    .evaluate()
    .setTitle('TypeQuest')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/** Pulled from the sidebar via google.script.run */
function getUserState_() {
  const token = PropertiesService.getUserProperties().getProperty(PROP_TOKEN);
  if (!token) return { signedIn: false };

  try {
    const resp = apiFetch_('/stats/overview', { method: 'get' });
    return { signedIn: true, overview: resp };
  } catch (err) {
    return { signedIn: false, error: String(err) };
  }
}

function signInWithToken(token) {
  // Token is minted by the dashboard and pasted into the sidebar.
  // (Apps Script can't run Google's GIS popup inline.)
  PropertiesService.getUserProperties().setProperty(PROP_TOKEN, token);
  return getUserState_();
}

function signOut() {
  PropertiesService.getUserProperties().deleteProperty(PROP_TOKEN);
  return { signedIn: false };
}

// ---------- Polling + diffing ----------

/** Public entry — registered as time-driven trigger. */
function pollDocument() {
  try {
    const doc = DocumentApp.getActiveDocument();
    if (!doc) return;

    const currentWords = countWords_(doc.getBody().getText());
    const props = PropertiesService.getDocumentProperties();
    const lastWords = Number(props.getProperty(PROP_LAST_WORDS) || 0);
    const lastRunIso = props.getProperty(PROP_LAST_RUN);
    const lastRun = lastRunIso ? new Date(lastRunIso) : null;
    const now = new Date();

    // Only positive deltas count. Deletions don't subtract XP, but also
    // don't add it. This matches the extension's word-boundary heuristic.
    const wordsAdded = Math.max(0, currentWords - lastWords);

    // Compute session-elapsed seconds, capped at poll interval × 2 to
    // avoid awarding time for idle hours.
    const elapsedSec = lastRun
      ? Math.min(
          (now.getTime() - lastRun.getTime()) / 1000,
          POLL_INTERVAL_MIN * 60 * 2
        )
      : POLL_INTERVAL_MIN * 60;

    if (wordsAdded > 0) {
      postEvent_({
        clientEventId: Utilities.getUuid(),
        source: 'google-docs-addon',
        docId: doc.getId(),
        wordsAdded,
        activeSeconds: Math.round(elapsedSec),
        capturedAt: now.toISOString(),
      });
    }

    props.setProperty(PROP_LAST_WORDS, String(currentWords));
    props.setProperty(PROP_LAST_RUN, now.toISOString());
    props.setProperty(PROP_DOC_ID, doc.getId());
  } catch (err) {
    console.error('pollDocument failed', err);
  }
}

function recordSnapshot_() {
  const doc = DocumentApp.getActiveDocument();
  if (!doc) return;
  const props = PropertiesService.getDocumentProperties();
  props.setProperty(PROP_LAST_WORDS, String(countWords_(doc.getBody().getText())));
  props.setProperty(PROP_LAST_RUN, new Date().toISOString());
  props.setProperty(PROP_SESSION_START, new Date().toISOString());
}

function countWords_(text) {
  if (!text) return 0;
  return (text.match(/\S+/g) || []).length;
}

// ---------- Trigger management ----------

function ensurePollingTrigger_() {
  const existing = ScriptApp.getProjectTriggers().find(
    (t) => t.getHandlerFunction() === 'pollDocument'
  );
  if (existing) return;

  ScriptApp.newTrigger('pollDocument')
    .timeBased()
    .everyMinutes(POLL_INTERVAL_MIN)
    .create();
}

// ---------- API ----------

function postEvent_(event) {
  return apiFetch_('/events', { method: 'post', payload: { events: [event] } });
}

function apiFetch_(path, opts) {
  const token = PropertiesService.getUserProperties().getProperty(PROP_TOKEN);
  if (!token) throw new Error('Not signed in to TypeQuest');

  const url = API_BASE + path;
  const params = {
    method: opts.method || 'get',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  };
  if (opts.payload) params.payload = JSON.stringify(opts.payload);

  const resp = UrlFetchApp.fetch(url, params);
  const code = resp.getResponseCode();
  const body = resp.getContentText();

  if (code === 401) {
    PropertiesService.getUserProperties().deleteProperty(PROP_TOKEN);
    throw new Error('Session expired — please sign in again.');
  }
  if (code >= 400) throw new Error(`API ${code}: ${body}`);
  return JSON.parse(body);
}