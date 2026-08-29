import { useState } from "react";
import type { FormEvent } from "react";
import { signIn, signUp } from "../services/profileService";
import "./Splash.css";

export default function Splash() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthSubmitting(true);

    try {
      if (authMode === "signup") {
        const data = await signUp({ name, email, password });
        if (!data.session) {
          setAuthNotice("Account created! Check your email to confirm, then log in.");
          setAuthMode("login");
        }
      } else {
        await signIn({ email, password });
        // AuthProvider's onAuthStateChange picks this up and swaps the splash for the app
      }
      setPassword("");
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  return (
    <div className="splash">
      <div className="splash-card">
        <h1 className="splash-brand">MatchUp</h1>
        <p className="splash-subtitle">Find a game near you and jump in.</p>

        <div className="auth-tabs">
          <button type="button" className={authMode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setAuthMode("login"); setAuthError(null); setAuthNotice(null); }}>Log In</button>
          <button type="button" className={authMode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => { setAuthMode("signup"); setAuthError(null); setAuthNotice(null); }}>Sign Up</button>
        </div>

        <form onSubmit={handleAuthSubmit} className="splash-form">
          {authMode === "signup" && (
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required type="password" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {authError && <p className="splash-error">{authError}</p>}
          {authNotice && <p className="splash-notice">{authNotice}</p>}

          <button type="submit" className="splash-button" disabled={authSubmitting}>
            {authSubmitting ? "Please wait..." : authMode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}