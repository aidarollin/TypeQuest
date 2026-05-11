import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { titleForLevel } from "../utils/levels.js";

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initial = user?.displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="tq-shell">
      <header className="tq-header">
        <div className="tq-brand">
          <div className="tq-brand-mark">TQ</div>
          <div>
            <div className="tq-brand-name">TypeQuest</div>
            <div className="tq-brand-tag">Level up your writing</div>
          </div>
        </div>

        <nav className="tq-nav">
          <NavLink to="/" end className={({ isActive }) => "tq-nav-link" + (isActive ? " is-active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/badges" className={({ isActive }) => "tq-nav-link" + (isActive ? " is-active" : "")}>
            Badges
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => "tq-nav-link" + (isActive ? " is-active" : "")}>
            Settings
          </NavLink>
        </nav>

        <div className="tq-user">
          {user && (
            <div className="tq-user-level">
              <span className="tq-user-level-num">Lvl {user.level}</span>
              <span className="tq-user-level-title">{titleForLevel(user.level)}</span>
            </div>
          )}
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="tq-user-avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="tq-user-avatar">{initial}</div>
          )}
          <button
            className="tq-btn tq-btn-ghost"
            onClick={signOut}
            style={{ fontSize: 13, padding: "6px 12px" }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="tq-main">
        <Outlet />
      </main>

      <footer className="tq-footer">
        <span>TypeQuest — gamify your writing</span>
        <span>Privacy-first. We track counts, never content.</span>
      </footer>
    </div>
  );
}
