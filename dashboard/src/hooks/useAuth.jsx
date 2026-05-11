import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tq_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.get("/auth/me")
      .then(data => setUser(data))
      .catch(() => localStorage.removeItem("tq_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (idToken) => {
    const data = await api.post("/auth/google", { idToken });
    localStorage.setItem("tq_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signOut = () => {
    localStorage.removeItem("tq_token");
    setUser(null);
    window.location.href = "/signin";
  };

  return (
    <AuthContext.Provider value={{ user, isAuthed: !!user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
