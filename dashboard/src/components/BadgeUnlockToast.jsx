import { useEffect } from "react";

export default function BadgeUnlockToast({ badge, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!badge) return null;

  return (
    <div className="tq-toast" role="alert">
      <span className="tq-toast-icon">{badge.icon}</span>
      <div style={{ flex: 1 }}>
        <div className="tq-toast-title">Badge unlocked!</div>
        <div className="tq-toast-name">{badge.name}</div>
        {badge.description && (
          <div className="tq-toast-desc">{badge.description}</div>
        )}
      </div>
      <button className="tq-toast-close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}
