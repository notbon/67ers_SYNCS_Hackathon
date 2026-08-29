import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "../services/profileService";
import "./Splash.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="splash">
      <div className="splash-card">
        <h1 className="splash-brand">Reset Password</h1>
        <p className="splash-subtitle">Choose a new password for your account.</p>

        {done ? (
          <p className="splash-notice">Password updated! Redirecting...</p>
        ) : (
          <form onSubmit={handleSubmit} className="splash-form">
            <input
              required
              type="password"
              minLength={6}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="splash-error">{error}</p>}
            <button type="submit" className="splash-button" disabled={submitting}>
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
