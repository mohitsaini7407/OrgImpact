import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import OrgImpactLogo from "./OrgImpactLogo";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type LoginProps = {
  onLogin: (token: string) => void;
};

type AuthMode = "login" | "register";

function PasswordVisibilityButton({
  visible,
  label,
  onToggle,
}: {
  visible: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="password-visibility-toggle"
      aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      aria-pressed={visible}
      onClick={onToggle}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {visible ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.7 4.1 10 7-.4.9-1.1 1.9-2 2.8" />
            <path d="M6.2 6.2C4.1 7.5 2.6 9.5 2 12c1.3 2.9 5 7 10 7 1.3 0 2.5-.3 3.6-.8" />
          </>
        ) : (
          <>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}

function Login({ onLogin }: LoginProps) {
  const inviteToken = useMemo(
    () => new URLSearchParams(window.location.search).get("invite") ?? "",
    [],
  );

  const [mode, setMode] = useState<AuthMode>(inviteToken ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [invitedAccountExists, setInvitedAccountExists] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;

    fetch(`${API_BASE_URL}/invitations/${encodeURIComponent(inviteToken)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "This invitation is invalid or has expired.");
        }
        setEmail(data.email ?? "");
        setInvitedAccountExists(Boolean(data.accountExists));
        if (data.accountExists) setMode("login");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "This invitation is invalid or has expired.");
      });
  }, [inviteToken]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to sign in");
      }

      if (inviteToken && invitedAccountExists) {
        const acceptResponse = await fetch(
          `${API_BASE_URL}/invitations/${encodeURIComponent(inviteToken)}/accept`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` }, body: JSON.stringify({}) },
        );
        const acceptData = await acceptResponse.json().catch(() => null);
        if (!acceptResponse.ok) throw new Error(acceptData?.error || "Unable to accept invitation");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      localStorage.setItem("token", data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!inviteToken && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      if (inviteToken) {
        const response = await fetch(
          `${API_BASE_URL}/invitations/${encodeURIComponent(inviteToken)}/accept`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password }),
          },
        );

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Unable to accept invitation");
        }

        setInvitationAccepted(true);
        setSuccess("Your account is ready. Sign in to continue to your organization.");
        setMode("login");
        setEmail(data.email || email);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to create account");
      }

      localStorage.setItem("token", data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }


  const isInvitation = Boolean(inviteToken) && !invitationAccepted;

  return (
    <div className="auth-page">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />

      <div className="auth-network" aria-hidden="true">
        <span className="auth-line auth-line-one" />
        <span className="auth-line auth-line-two" />
        <span className="auth-line auth-line-three" />
        <span className="auth-line auth-line-four" />
        <span className="auth-node auth-node-one" />
        <span className="auth-node auth-node-two" />
        <span className="auth-node auth-node-three" />
        <span className="auth-node auth-node-four" />
        <span className="auth-node auth-node-five" />
      </div>

      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-logo-orbit">
            <div className="auth-orbit orbit-one" />
            <div className="auth-orbit orbit-two" />
            <OrgImpactLogo />
          </div>
          <span className="auth-eyebrow">ORGANIZATIONAL DEPENDENCY INTELLIGENCE</span>
          <h1>See what connects your organization.</h1>
          <p>
            Map people, teams, services, applications and infrastructure — then understand what could be affected when something changes.
          </p>
          <div className="auth-capabilities">
            <span>Dependency Graph</span>
            <span>Impact Analysis</span>
            <span>Incident Intelligence</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-top">
            <span className="page-eyebrow">{isInvitation ? "ORGANIZATION INVITATION" : mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
            <h2>{isInvitation ? "Join your organization" : mode === "login" ? "Sign in to OrgImpact" : "Create your account"}</h2>
            <p>
              {isInvitation
                ? (invitedAccountExists ? "Accept the invitation to add your existing account." : "Set your password to activate your organization account.")
                : mode === "login"
                  ? "Continue to your dependency intelligence workspace."
                  : "Create your account and get ready to map your organization."}
            </p>
          </div>

          {mode === "login" && (!isInvitation || invitedAccountExists) && (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required autoFocus readOnly={Boolean(inviteToken && invitedAccountExists)} />
              </label>
              <div className="auth-field">
                <label htmlFor="login-password">Password</label>
                <div className="auth-password-control">
                  <input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
                  <PasswordVisibilityButton visible={showPassword} label="password" onToggle={() => setShowPassword((visible) => !visible)} />
                </div>
              </div>
              {success && <div className="auth-success">{success}</div>}
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Signing in..." : inviteToken && invitedAccountExists ? "Sign In & Accept Invitation" : "Sign In"}
              </button>
              <button type="button" className="auth-switch" onClick={() => { setMode("register"); setError(""); setSuccess(""); }}>
                New to OrgImpact? <strong>Create an account</strong>
              </button>
            </form>
          )}

          {mode === "register" && (
            <form className="auth-form" onSubmit={handleRegister}>
              {!isInvitation && (
                <label className="auth-field">
                  <span>Full name</span>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required autoFocus />
                </label>
              )}
              {!isInvitation && (
                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required />
                </label>
              )}
              {isInvitation && !invitedAccountExists && (
                <label className="auth-field">
                  <span>Your name</span>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required autoFocus />
                </label>
              )}
              {isInvitation && (
                <div className="auth-invite-email">
                  <span>Invited email</span>
                  <strong>{email || "Your invited email"}</strong>
                </div>
              )}
              {isInvitation && invitedAccountExists && (
                <div className="auth-invite-existing">
                  This email already has an OrgImpact account. Accepting this invitation will add that account to the organization.
                </div>
              )}
              {(!isInvitation || !invitedAccountExists) && (
                <div className="auth-field">
                  <label htmlFor="register-password">Password</label>
                  <div className="auth-password-control">
                    <input id="register-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a strong password" minLength={8} required />
                    <PasswordVisibilityButton visible={showPassword} label="password" onToggle={() => setShowPassword((visible) => !visible)} />
                  </div>
                </div>
              )}
              {!isInvitation && (
                <div className="auth-field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <div className="auth-password-control">
                    <input id="confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" minLength={8} required />
                    <PasswordVisibilityButton visible={showConfirmPassword} label="password confirmation" onToggle={() => setShowConfirmPassword((visible) => !visible)} />
                  </div>
                </div>
              )}
              {success && <div className="auth-success">{success}</div>}
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Creating account..." : isInvitation ? "Accept Invitation" : "Create Account"}
              </button>
              {!isInvitation && (
                <button type="button" className="auth-switch" onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>
                  Already have an account? <strong>Sign in</strong>
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
