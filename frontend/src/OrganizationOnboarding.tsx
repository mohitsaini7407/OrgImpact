import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import OrgImpactLogo from "./OrgImpactLogo";
import "./Onboarding.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type Organization = { id: string; name: string; slug: string; joinCode?: string };
type Membership = { role: string; organization: Organization };
type JoinRequest = {
  id: string;
  status: string;
  createdAt: string;
  organization?: { id: string; name: string };
  user?: { id: string; name: string; email: string };
};

type Props = { token: string; onLogout: () => void };

export default function OrganizationOnboarding({ token, onLogout }: Props) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [mine, setMine] = useState<JoinRequest[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const api = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Request failed");
    return data;
  };

  async function load() {
    const [me, orgs, myRequests] = await Promise.all([
      api("/auth/me"),
      api("/organizations"),
      api("/organizations/join-requests/mine"),
    ]);
    setMemberships(me.memberships || []);
    setMine(myRequests || []);
    const initial = localStorage.getItem("organizationId");
    const availableOrganizations: Organization[] = orgs || [];
    const validInitial = availableOrganizations.find((o) => o.id === initial);
    const defaultOrg = validInitial || availableOrganizations.find((o) => o.id === "e9cd3e97-f509-4a60-a8c8-390f2b9dd8a6") || availableOrganizations[0];
    if (defaultOrg) setSelectedOrg(defaultOrg.id);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load onboarding"));
    // Load once for this authenticated session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!selectedOrg) { setRequests([]); return; }
    const membership = memberships.find((item) => item.organization.id === selectedOrg);
    if (!membership || membership.role !== "OWNER") { setRequests([]); return; }
    api(`/organizations/${selectedOrg}/join-requests`)
      .then((data) => setRequests(data || []))
      .catch(() => setRequests([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrg, memberships]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await api("/organizations", {
        method: "POST",
        body: JSON.stringify({ name: orgName.trim(), slug: slug.trim().toLowerCase() }),
      });
      await load();
      setSelectedOrg(created.id);
      setNotice(`Organization created. Save this join code: ${created.joinCode}`);
      localStorage.setItem("organizationId", created.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create organization"); }
    finally { setBusy(false); }
  }

  async function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api("/organizations/join-requests", {
        method: "POST",
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });
      setNotice(`Request sent to ${result.organization.name}. An organization owner must approve it.`);
      setJoinCode("");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to request access"); }
    finally { setBusy(false); }
  }

  async function review(requestId: string, decision: "APPROVED" | "REJECTED") {
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`/organizations/${selectedOrg}/join-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      setNotice(`Join request ${decision.toLowerCase()}.`);
      await load();
      const updated = await api(`/organizations/${selectedOrg}/join-requests`);
      setRequests(updated || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to review request"); }
    finally { setBusy(false); }
  }

  function enterWorkspace() {
    if (!selectedOrg) return;
    localStorage.setItem("organizationId", selectedOrg);
    window.location.reload();
  }

  const hasMembership = memberships.length > 0;
  const pendingMine = mine.filter((item) => item.status === "PENDING");

  return (
    <main className="onboarding-page">
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <OrgImpactLogo className="onboarding-logo" />
          <div className="onboarding-header-actions">
            <button className="onboarding-back" type="button" onClick={() => hasMembership ? enterWorkspace() : onLogout()} aria-label={hasMembership ? "Back to workspace" : "Back to sign in"}>
              <span aria-hidden="true">←</span> {hasMembership ? "Back to workspace" : "Back to sign in"}
            </button>
            <button className="onboarding-logout" type="button" onClick={onLogout}>Sign out</button>
          </div>
        </header>

        <section className="onboarding-intro">
          <span className="onboarding-eyebrow">YOUR ORGANIZATION, CONNECTED</span>
          <h1>{hasMembership ? "Choose your workspace" : "Create or join an organization"}</h1>
          <p>Create a new organization or request access to an existing one with its join code. Access requests need approval from an organization owner.</p>
        </section>

        {error && <div className="onboarding-alert error">{error}</div>}
        {notice && <div className="onboarding-alert success">{notice}</div>}

        <div className="onboarding-top-grid">
        {hasMembership && (
          <section className="onboarding-panel onboarding-workspaces">
            <h2>Your workspaces</h2>
            <p>Select the organization you want to open.</p>
            <div className="onboarding-org-list">
              {memberships.map((membership) => (
                <button key={membership.organization.id} type="button" className={`onboarding-org-option ${selectedOrg === membership.organization.id ? "selected" : ""}`} onClick={() => setSelectedOrg(membership.organization.id)}>
                  <span className="onboarding-org-avatar">{membership.organization.name.slice(0, 1).toUpperCase()}</span>
                  <span className="onboarding-org-name"><strong>{membership.organization.name}</strong><small>{membership.organization.slug}</small></span>
                </button>
              ))}
            </div>
            {(() => {
              const selectedMembership = memberships.find((membership) => membership.organization.id === selectedOrg);
              const code = selectedMembership?.organization.joinCode;
              return code && selectedMembership && selectedMembership.role === "OWNER" ? (
                <div className="onboarding-share-code">
                  <span>Organization join code</span><strong>{code}</strong>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(code).then(() => setNotice("Join code copied to clipboard.")).catch(() => setNotice(`Join code: ${code}`))}>Copy code</button>
                  <small>People using this code still need approval before they become members.</small>
                </div>
              ) : null;
            })()}
            <button className="onboarding-primary" type="button" onClick={enterWorkspace} disabled={!selectedOrg}>Continue to workspace <span>→</span></button>
          </section>
        )}

        {selectedOrg && memberships.some((m) => m.organization.id === selectedOrg && m.role === "OWNER") && (
          <section className="onboarding-panel onboarding-workspaces">
            <div className="onboarding-section-heading"><div><h2>Join requests</h2><p>Approve or reject people requesting access to this organization.</p></div><span className="onboarding-count">{requests.filter((r) => r.status === "PENDING").length} pending</span></div>
            {requests.filter((r) => r.status === "PENDING").length === 0 ? <div className="onboarding-empty">No pending join requests.</div> : requests.filter((r) => r.status === "PENDING").map((request) => (
              <div className="onboarding-request" key={request.id}>
                <div><strong>{request.user?.name || "User"}</strong><span>{request.user?.email}</span></div>
                <div className="onboarding-request-actions"><button type="button" disabled={busy} onClick={() => review(request.id, "APPROVED")}>Approve</button><button type="button" className="reject" disabled={busy} onClick={() => review(request.id, "REJECTED")}>Reject</button></div>
              </div>
            ))}
          </section>
        )}

        </div>

        <div className="onboarding-grid">
          <section className="onboarding-panel">
            <div className="onboarding-panel-icon">＋</div>
            <h2>Create an organization</h2>
            <p>You’ll become its owner and can invite or approve members.</p>
            <form onSubmit={submitCreate} className="onboarding-form">
              <label>Organization name<input value={orgName} onChange={(e) => { setOrgName(e.target.value); setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} placeholder="Acme Operations" minLength={2} required /></label>
              <label>Workspace slug<input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="acme-operations" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
              <button type="submit" disabled={busy}>{busy ? "Working…" : "Create organization"}</button>
            </form>
          </section>

          <section className="onboarding-panel">
            <div className="onboarding-panel-icon">↗</div>
            <h2>Join an organization</h2>
            <p>Enter the join code shared by an organization owner or admin.</p>
            <form onSubmit={submitJoin} className="onboarding-form">
              <label>Organization join code<input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC-234-DEF-567" autoCapitalize="characters" required /></label>
              <button type="submit" disabled={busy}>{busy ? "Sending request…" : "Request to join"}</button>
            </form>
            {pendingMine.length > 0 && <div className="onboarding-pending"><strong>Pending requests</strong>{pendingMine.map((item) => <div key={item.id}>{item.organization?.name || "Organization"} <span>Awaiting approval</span></div>)}</div>}
          </section>
        </div>

        {!hasMembership && pendingMine.length > 0 && <div className="onboarding-waiting">You can use OrgImpact as soon as an owner approves your request. This page will show your workspace after approval; sign in again later to refresh.</div>}
      </div>
    </main>
  );
}
