import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const { access_token } = await api.login(username, password);
    localStorage.setItem("token", access_token);
    const me = await api.me();
    setUser(me);
  }, []);

  const register = useCallback(async (username, email, password) => {
    await api.register(username, email, password);
    await login(username, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}