import { useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import api from "../utils/api.js";

function Toggle({ on, onChange }) {
  return (
    <button
      className={`tq-toggle${on ? " is-on" : ""}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <div className="tq-toggle-knob" />
    </button>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState(user?.settings ?? {});
  const [pat, setPat] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/settings", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const generatePAT = async () => {
    try {
      const data = await api.post("/auth/pat");
      setPat(data.token);
    } catch (err) {
      console.error("Failed to generate PAT:", err);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="tq-page-head">
        <div>
          <h2 className="tq-page-title">Settings</h2>
          <p className="tq-page-sub">{user?.email}</p>
        </div>
      </div>

      {/* HUD */}
      <div className="tq-card tq-settings-section" style={{ marginBottom: 16 }}>
        <div className="tq-settings-title">Floating HUD</div>
        <div className="tq-settings-row">
          <div>
            <div className="tq-settings-label">Show floating overlay</div>
            <div className="tq-settings-desc">Display live stats while writing in Google Docs, Word, or Notion.</div>
          </div>
          <Toggle on={settings.showHud ?? true} onChange={v => update("showHud", v)} />
        </div>
        <div className="tq-settings-row">
          <div>
            <div className="tq-settings-label">HUD opacity</div>
            <div className="tq-settings-desc">How visible the overlay is while typing.</div>
          </div>
          <input
            type="range" min="0.2" max="1" step="0.1"
            value={settings.hudOpacity ?? 1}
            onChange={e => update("hudOpacity", parseFloat(e.target.value))}
            style={{ width: 120 }}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="tq-card tq-settings-section" style={{ marginBottom: 16 }}>
        <div className="tq-settings-title">Notifications</div>
        <div className="tq-settings-row">
          <div>
            <div className="tq-settings-label">Badge unlocks</div>
            <div className="tq-settings-desc">Show a celebration when you earn a new badge.</div>
          </div>
          <Toggle on={settings.notifyBadges ?? true} onChange={v => update("notifyBadges", v)} />
        </div>
        <div className="tq-settings-row">
          <div>
            <div className="tq-settings-label">Level-ups</div>
            <div className="tq-settings-desc">Show the full-screen celebration when you level up.</div>
          </div>
          <Toggle on={settings.notifyLevelUp ?? true} onChange={v => update("notifyLevelUp", v)} />
        </div>
      </div>

      {/* Privacy */}
      <div className="tq-card tq-settings-section" style={{ marginBottom: 16 }}>
        <div className="tq-settings-title">Privacy</div>
        <div className="tq-settings-row">
          <div>
            <div className="tq-settings-label">Public profile</div>
            <div className="tq-settings-desc">Appear on the opt-in leaderboard (first name + word count only).</div>
          </div>
          <Toggle on={settings.publicProfile ?? false} onChange={v => update("publicProfile", v)} />
        </div>
      </div>

      {/* Personal Access Token */}
      <div className="tq-card tq-settings-section" style={{ marginBottom: 16 }}>
        <div className="tq-settings-title">Personal Access Token</div>
        <div className="tq-settings-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
          <div className="tq-settings-desc">
            Generate a PAT to connect the Google Docs or Word add-ins without going through OAuth.
            Paste the token into the add-in sidebar.
          </div>
          <button className="tq-btn tq-btn-ghost" onClick={generatePAT}>Generate token</button>
          {pat && (
            <input
              readOnly value={pat}
              onClick={e => e.target.select()}
              style={{
                width: "100%", background: "var(--tq-bg-elev-2)",
                border: "1px solid var(--tq-border)", borderRadius: 6,
                color: "var(--tq-accent)", fontFamily: "var(--tq-font-mono)",
                fontSize: 12, padding: "8px 10px"
              }}
            />
          )}
        </div>
      </div>

      <div className="tq-settings-actions">
        <button className="tq-btn tq-btn-ghost" onClick={signOut} style={{ marginRight: 12 }}>
          Sign out
        </button>
        <button className="tq-btn tq-btn-primary" onClick={save} disabled={saving}>
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
