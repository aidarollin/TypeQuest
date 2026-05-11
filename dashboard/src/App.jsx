// dashboard/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import SignIn from "./pages/SignIn.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Badges from "./pages/Badges.jsx";
import Settings from "./pages/Settings.jsx";
import AppShell from "./components/AppShell.jsx";

function ProtectedRoute({ children }) {
  const { isAuthed, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <span style={{ color: "var(--tq-text-secondary)" }}>Loading…</span>
      </div>
    );
  }
  return isAuthed ? children : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="badges" element={<Badges />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}