import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api";
import Login from "./components/Login";
import Register from "./components/Register";

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authView, setAuthView] = useState("login");

  if (authLoading) return null;

  if (!user) {
    return authView === "login" ? (
      <Login onSwitch={() => setAuthView("register")} />
    ) : (
      <Register onSwitch={() => setAuthView("login")} />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <span className="ledger-mark" />
          Ledger
        </h1>
        <div className="user-bar">
          <span>{user.username}</span>
          <button className="link-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <p>Logged in! Dashboard components go here next.</p>
    </div>
  );
}

export default App;
