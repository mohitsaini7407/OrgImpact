import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import OrgImpactLogo from "./OrgImpactLogo";

const API_BASE_URL = "http://localhost:5000";

type LoginProps = {
  onLogin: (token: string) => void;
};

type AuthMode = "login" | "register";

function Login({ onLogin }: LoginProps) {
  const inviteToken = useMemo(
    () => new URLSearchParams(window.location.search).get("invite") ?? "",
    [],
  );

  const [mode, setMode] = useState<AuthMode>(inviteToken ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      setSuccess("Account created successfully. You can sign in now.");
      setMode("login");
      setPassword("");
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

          {mode === "login" && !isInvitation && (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required autoFocus />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
              </label>
              {success && <div className="auth-success">{success}</div>}
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
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
                <label className="auth-field">
                  <span>Password</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a strong password" minLength={8} required />
                </label>
              )}
              {success && <div className="auth-success">{success}</div>}
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Setting up..." : isInvitation ? "Accept Invitation" : "Create Account"}
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
