import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { socket } from "./socket";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useStore,
  useViewport,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";
import Login from "./Login";
import OrganizationOnboarding from "./OrganizationOnboarding";
import OrgImpactLogo from "./OrgImpactLogo";


type NavIconName = "dashboard" | "entities" | "relationships" | "teams" | "members" | "incidents" | "simulation" | "chat";

function NavIcon({ name }: { name: NavIconName }) {
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "dashboard") return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5.5h5V20"/></svg>;
  if (name === "entities") return <svg {...common}><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/></svg>;
  if (name === "relationships") return <svg {...common}><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="m8 11 7.8-4"/><path d="m8 13 7.8 4"/></svg>;
  if (name === "teams") return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.4-3.2 2.2-5 5.5-5s5.1 1.8 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.7"/><path d="M17 15c2.2.3 3.6 1.8 4 4"/></svg>;
  if (name === "members") return <svg {...common}><circle cx="12" cy="8" r="3.1"/><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6"/></svg>;
  if (name === "chat") return <svg {...common}><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.4-4.2A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>;
  if (name === "incidents") return <svg {...common}><path d="M12 3 21 7v5c0 4.8-3.2 7.8-9 9-5.8-1.2-9-4.2-9-9V7l9-4Z"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>;
  return <svg {...common}><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/></svg>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type GraphNode = {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  entityTypeColor?: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
};

function GraphMiniOverview({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  const viewport = useViewport();
  const flowWidth = useStore((state) => state.width);
  const flowHeight = useStore((state) => state.height);
  const nodeWidth = 230;
  const nodeHeight = 100;
  const width = 220;
  const height = 140;
  const padding = 12;

  if (nodes.length === 0) {
    return null;
  }

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + nodeWidth));
  const maxY = Math.max(...nodes.map((node) => node.position.y + nodeHeight));
  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (width - padding * 2) / graphWidth,
    (height - padding * 2) / graphHeight,
  );
  const offsetX = (width - graphWidth * scale) / 2;
  const offsetY = (height - graphHeight * scale) / 2;
  const positionOf = (node: Node, right = false) => ({
    x: offsetX + (node.position.x + (right ? nodeWidth : 0) - minX) * scale,
    y: offsetY + (node.position.y + nodeHeight / 2 - minY) * scale,
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const viewportX = offsetX + (-viewport.x / viewport.zoom - minX) * scale;
  const viewportY = offsetY + (-viewport.y / viewport.zoom - minY) * scale;
  const viewportWidth = (flowWidth / viewport.zoom) * scale;
  const viewportHeight = (flowHeight / viewport.zoom) * scale;

  return (
    <div className="graph-mini-overview" aria-label="Dependency graph overview">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
        {edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (!source || !target) return null;
          const start = positionOf(source, true);
          const end = positionOf(target);
          const middleX = (start.x + end.x) / 2;
          return (
            <path
              key={edge.id}
              className="graph-mini-edge"
              d={`M ${start.x} ${start.y} H ${middleX} V ${end.y} H ${end.x}`}
            />
          );
        })}
        {nodes.map((node) => {
          const x = offsetX + (node.position.x - minX) * scale;
          const y = offsetY + (node.position.y - minY) * scale;
          const miniWidth = nodeWidth * scale;
          const miniHeight = nodeHeight * scale;
          const name = typeof node.data.miniLabel === "string" ? node.data.miniLabel : "Dependency node";
          return (
            <g key={node.id}>
              <title>{name}</title>
              <rect
                className="graph-mini-node"
                x={x}
                y={y}
                width={miniWidth}
                height={miniHeight}
                rx={Math.min(3, miniHeight / 4)}
                style={{ fill: typeof node.data.miniColor === "string" ? node.data.miniColor : "#38bdf8" }}
              />
              {miniWidth > 26 && miniHeight > 8 && (
                <text className="graph-mini-label" x={x + 3} y={y + miniHeight / 2}>
                  {name.length > 18 ? `${name.slice(0, 17)}…` : name}
                </text>
              )}
            </g>
          );
        })}
        <rect
          className="graph-mini-viewport"
          x={viewportX}
          y={viewportY}
          width={viewportWidth}
          height={viewportHeight}
          rx={2}
        />
      </svg>
    </div>
  );
}

type GraphResponse = {
  organizationId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
  };
};

type EntityType = {
  id: string;
  name: string;
  color: string;
};

const entityTypeColorPresets = [
  { name: "Service", color: "#2563EB" },
  { name: "Database", color: "#16A34A" },
  { name: "Application", color: "#9333EA" },
  { name: "Infrastructure", color: "#EA580C" },
  { name: "Network", color: "#0891B2" },
  { name: "Security", color: "#DC2626" },
];

type ImpactEntity = GraphNode & {
  depth: number;
};

type ImpactResponse = {
  rootEntity: GraphNode;
  totalAffected: number;
  affectedEntities: ImpactEntity[];
};

type Incident = {
  id: string; organizationId: string; affectedEntityId: string; createdById: string;
  title: string; description: string | null; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED"; createdAt: string; updatedAt: string; resolvedAt: string | null;
  affectedEntity: GraphNode & { entityType: { id: string; name: string } }; createdBy: UserSummary;
};

type IncidentForm = { title: string; description: string; affectedEntityId: string; severity: Incident["severity"] };

type IncidentStatusDropdownProps = {
  value: Incident["status"];
  onChange: (value: Incident["status"]) => void;
};

function IncidentStatusDropdown({
  value,
  onChange,
}: IncidentStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Element && ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const options: Incident["status"][] = [
    "OPEN",
    "INVESTIGATING",
    "RESOLVED",
  ];

  return (
    <div className="incident-status-dropdown" ref={ref}>
      <button
        type="button"
        className={`incident-status-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`incident-status-indicator ${value.toLowerCase()}`} />
        <span>{value.charAt(0) + value.slice(1).toLowerCase()}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="incident-status-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`incident-status-option ${
                value === option ? "selected" : ""
              }`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span
                className={`incident-status-indicator ${option.toLowerCase()}`}
              />
              <span>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </span>
              {value === option && (
                <span className="incident-status-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


type ActiveView =
  | "dashboard"
  | "entities"
  | "relationships"
  | "teams"
  | "members"
  | "chat"
  | "incidents"
  | "simulation";

type SimulationResult = {
  rootEntity: GraphNode;
  totalAffected: number;
  affectedEntities: ImpactEntity[];
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

type EntityForm = {
  name: string;
  description: string;
  entityTypeId: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

type RelationshipForm = {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
};

const emptyEntityForm: EntityForm = {
  name: "",
  description: "",
  entityTypeId: "",
  criticality: "MEDIUM",
};

const emptyRelationshipForm: RelationshipForm = {
  sourceEntityId: "",
  targetEntityId: "",
  relationshipType: "DEPENDS_ON",
};

const relationshipTypes = [
  "DEPENDS_ON",
  "CALLS",
  "USES",
  "RUNS_ON",
  "CONTAINS",
];


type Team = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  members?: TeamMember[];
};

type UserSummary = {
  id: string;
  name: string;
  email: string;
};

type TeamMember = {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  createdAt?: string;
  user?: UserSummary;
};

type ChatUser = { id: string; name: string; email: string };
type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  clientMessageId: string | null;
  createdAt: string;
  editedAt: string | null;
  sender: { id: string; name: string };
};
type ChatConversation = {
  id: string;
  type: "DIRECT" | "TEAM" | "GROUP";
  title: string | null;
  organizationId: string;
  teamId: string | null;
  team: { id: string; name: string; slug: string } | null;
  updatedAt: string;
  members: ChatUser[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
};

type TeamForm = {
  name: string;
  slug: string;
};

type TeamMemberForm = {
  userId: string;
  role: string;
};

type OrganizationMember = {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt?: string;
  user?: UserSummary;
  organization?: { createdById: string | null };
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  memberships?: Array<{
    id: string;
    role: string;
    organizationId: string;
    organization?: {
      id: string;
      name: string;
      slug: string;
      createdById?: string | null;
    };
  }>;
};

type ApprovalRequest = {
  id: string;
  organizationId: string;
  organizationName: string;
  status: string;
  createdAt: string;
  user?: UserSummary;
};

type MembershipForm = {
  email: string;
};

const emptyTeamForm: TeamForm = {
  name: "",
  slug: "",
};

const emptyTeamMemberForm: TeamMemberForm = {
  userId: "",
  role: "MEMBER",
};

const emptyMembershipForm: MembershipForm = {
  email: "",
};

const emptyIncidentForm: IncidentForm = { title: "", description: "", affectedEntityId: "", severity: "MEDIUM" };

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => localStorage.getItem("orgimpact-theme") === "light" ? "light" : "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("orgimpact-theme", theme);
  }, [theme]);

  const organizationId = localStorage.getItem("organizationId") || "e9cd3e97-f509-4a60-a8c8-390f2b9dd8a6";
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    Boolean(localStorage.getItem("token") && !localStorage.getItem("organizationId")),
  );

  const [activeView, setActiveView] =
    useState<ActiveView>("dashboard");

  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entityTypesError, setEntityTypesError] = useState("");
  const [entityTypesModalOpen, setEntityTypesModalOpen] = useState(false);
  const [editingEntityType, setEditingEntityType] = useState<EntityType | null>(null);
  const [entityTypeForm, setEntityTypeForm] = useState({ name: "", color: "#2563EB" });
  const [entityTypeSaving, setEntityTypeSaving] = useState(false);
  const entityTypesRequestId = useRef(0);

  const [selectedEntity, setSelectedEntity] =
    useState<GraphNode | null>(null);
  const [impact, setImpact] =
    useState<ImpactResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [entityTypesLoading, setEntityTypesLoading] =
    useState(false);
  const [impactLoading, setImpactLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [impactError, setImpactError] = useState("");
  const [entityError, setEntityError] = useState("");

  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [focusedEntityId, setFocusedEntityId] =
    useState<string | null>(null);

  const [entityModalOpen, setEntityModalOpen] =
    useState(false);
  const [editingEntity, setEditingEntity] =
    useState<GraphNode | null>(null);
  const [entityForm, setEntityForm] =
    useState<EntityForm>(emptyEntityForm);
  const [entitySaving, setEntitySaving] =
    useState(false);
  const [entitySearch, setEntitySearch] =
    useState("");

  const [relationshipModalOpen, setRelationshipModalOpen] =
    useState(false);
  const [relationshipForm, setRelationshipForm] =
    useState<RelationshipForm>(emptyRelationshipForm);
  const [relationshipSaving, setRelationshipSaving] =
    useState(false);
  const [relationshipError, setRelationshipError] =
    useState("");


  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm);
  const [teamSaving, setTeamSaving] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState<TeamMemberForm>(emptyTeamMemberForm);
  const [memberSaving, setMemberSaving] = useState(false);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileNameEditing, setProfileNameEditing] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileNameSaving, setProfileNameSaving] = useState(false);
  const [profileNameError, setProfileNameError] = useState("");
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [chatConversationsLoading, setChatConversationsLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [selectedChatConversation, setSelectedChatConversation] = useState<ChatConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessageText, setChatMessageText] = useState("");
  const [chatConnected, setChatConnected] = useState(socket.connected);
  const [chatTypingUser, setChatTypingUser] = useState<string | null>(null);
  const [chatMobileOpen, setChatMobileOpen] = useState(false);
  const [chatHasOlder, setChatHasOlder] = useState(false);
  const [chatReadAtByConversation, setChatReadAtByConversation] = useState<Record<string, string>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [approvalActionId, setApprovalActionId] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState("");
  const [simulationFilterOpen, setSimulationFilterOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const simulationFilterRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatPendingMessageRef = useRef<{ content: string; id: string } | null>(null);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [membershipEditOpen, setMembershipEditOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<OrganizationMember | null>(null);
  const [membershipEditRole, setMembershipEditRole] = useState("MEMBER");
  const [membershipForm, setMembershipForm] = useState<MembershipForm>(emptyMembershipForm);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [membershipJoinCode, setMembershipJoinCode] = useState("");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentError, setIncidentError] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState<IncidentForm>(emptyIncidentForm);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const [simulationEntityId, setSimulationEntityId] = useState("");
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState("");
  const [simulationRiskMap, setSimulationRiskMap] = useState<
    Record<string, { score: number; level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }>
  >({});
  const [simulationOverviewLoading, setSimulationOverviewLoading] =
    useState(false);
  const [simulationRiskFilter, setSimulationRiskFilter] =
    useState<"ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("ALL");

  useEffect(() => {
    if (!token) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    const handleConnect = () => {
      socket.emit("join-organization", organizationId);
    };

    socket.auth = { token: localStorage.getItem("token") };
    socket.on("connect", handleConnect);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, [token, organizationId]);


  function getAuthHeaders(): HeadersInit {
    const currentToken = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      ...(currentToken
        ? { Authorization: `Bearer ${currentToken}` }
        : {}),
    };
  }

  async function handleUnauthorized(response: Response) {
    if (response.status !== 401) {
      return false;
    }

    localStorage.removeItem("token");
    setToken(null);
    setShowOnboarding(false);
    setGraph(null);
    return true;
  }

  async function loadGraph() {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/graph/organization/${organizationId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      if (response.status === 403) {
        throw new Error(
          "You are not a member of this organization.",
        );
      }

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data: GraphResponse = await response.json();
      setGraph(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the organization graph.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    const handleEntityTypeChanged = () => {
      void loadEntityTypes();
      void loadGraph();
    };
    socket.on("ENTITY_TYPE_CREATED", handleEntityTypeChanged);
    socket.on("ENTITY_TYPE_UPDATED", handleEntityTypeChanged);
    socket.on("ENTITY_TYPE_DELETED", handleEntityTypeChanged);

    const handleEntityCreated = () => {
      void loadGraph();
    };

    const handleEntityUpdated = () => {
      void loadGraph();
    };

    const handleEntityDeleted = () => {
      void loadGraph();
    };

    const handleRelationshipCreated = () => {
      void loadGraph();
    };

    const handleRelationshipDeleted = () => {
      void loadGraph();
    };

    socket.on("ENTITY_CREATED", handleEntityCreated);
    socket.on("ENTITY_UPDATED", handleEntityUpdated);
    socket.on("ENTITY_DELETED", handleEntityDeleted);

    const handleIncidentCreated = (incident: Incident) => {
      setIncidents((current) => [incident, ...current.filter((item) => item.id !== incident.id)]);
    };
    const handleIncidentUpdated = (incident: Incident) => {
      setIncidents((current) => current.map((item) => item.id === incident.id ? incident : item));
      setSelectedIncident((current) => current?.id === incident.id ? incident : current);
    };
    const handleIncidentDeleted = (incident: { id: string; organizationId: string }) => {
      setIncidents((current) => current.filter((item) => item.id !== incident.id));
      setSelectedIncident((current) => current?.id === incident.id ? null : current);
    };

    socket.on("RELATIONSHIP_CREATED", handleRelationshipCreated);
    socket.on("RELATIONSHIP_DELETED", handleRelationshipDeleted);
    socket.on("INCIDENT_CREATED", handleIncidentCreated);
    socket.on("INCIDENT_UPDATED", handleIncidentUpdated);
    socket.on("INCIDENT_DELETED", handleIncidentDeleted);

    return () => {
      socket.off("ENTITY_CREATED", handleEntityCreated);
      socket.off("ENTITY_UPDATED", handleEntityUpdated);
      socket.off("ENTITY_DELETED", handleEntityDeleted);

      socket.off("RELATIONSHIP_CREATED", handleRelationshipCreated);
      socket.off("RELATIONSHIP_DELETED", handleRelationshipDeleted);
      socket.off("INCIDENT_CREATED", handleIncidentCreated);
      socket.off("INCIDENT_UPDATED", handleIncidentUpdated);
      socket.off("INCIDENT_DELETED", handleIncidentDeleted);
      socket.off("ENTITY_TYPE_CREATED", handleEntityTypeChanged);
      socket.off("ENTITY_TYPE_UPDATED", handleEntityTypeChanged);
      socket.off("ENTITY_TYPE_DELETED", handleEntityTypeChanged);
    };
  }, [token, organizationId]);

  async function loadEntityTypes() {
    const requestId = ++entityTypesRequestId.current;
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setEntityTypes([]);
      setEntityTypesLoading(false);
      return;
    }

    try {
      setEntityTypesLoading(true);
      setEntityTypesError("");

      const response = await fetch(
        `${API_BASE_URL}/entity-types/organization/${organizationId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      if (!response.ok) {
        throw new Error(
          `Unable to load entity types (${response.status})`,
        );
      }

      const data: EntityType[] = await response.json();
      if (requestId === entityTypesRequestId.current) {
        setEntityTypes(data);
      }
    } catch (err) {
      console.error(err);
      if (requestId === entityTypesRequestId.current) {
        setEntityTypesError(
          err instanceof Error
            ? err.message
            : "Unable to load entity types.",
        );
      }
    } finally {
      if (requestId === entityTypesRequestId.current) {
        setEntityTypesLoading(false);
      }
    }
  }

  async function loadTeams() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    try {
      setTeamsLoading(true);
      setTeamError("");

      const response = await fetch(
        `${API_BASE_URL}/teams/organization/${organizationId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to load teams (${response.status})`);
      }

      setTeams(Array.isArray(data) ? data : data?.teams ?? []);
    } catch (err) {
      console.error(err);
      setTeamError(err instanceof Error ? err.message : "Unable to load teams.");
    } finally {
      setTeamsLoading(false);
    }
  }

  async function loadCurrentUser() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to load current user (${response.status})`);
      }

      setCurrentUser({
        id: data.id,
        name: data.name,
        email: data.email,
        memberships: data.memberships ?? [],
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function saveProfileName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = profileNameDraft.trim();
    if (name.length < 2 || name.length > 100) {
      setProfileNameError("Name must be between 2 and 100 characters.");
      return;
    }
    try {
      setProfileNameSaving(true);
      setProfileNameError("");
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      if (await handleUnauthorized(response)) throw new Error("Your session expired. Please sign in again.");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to update your name.");
      setCurrentUser((user) => user ? { ...user, name: data.name } : user);
      setProfileNameDraft(data.name);
      setProfileNameEditing(false);
    } catch (error) {
      setProfileNameError(error instanceof Error ? error.message : "Unable to update your name.");
    } finally {
      setProfileNameSaving(false);
    }
  }

  async function loadApprovalRequests() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setApprovalRequests([]);
      return;
    }

    try {
      const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!meResponse.ok) return;

      const me = await meResponse.json();
      const memberships: NonNullable<CurrentUser["memberships"]> = me.memberships ?? [];
      setCurrentUser({ id: me.id, name: me.name, email: me.email, memberships });

      const owners = memberships.filter((membership: NonNullable<CurrentUser["memberships"]>[number]) => membership.role === "OWNER");
      const results = await Promise.all(owners.map(async (membership) => {
        const response = await fetch(`${API_BASE_URL}/organizations/${membership.organizationId}/join-requests`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) return [];

        const requests = await response.json();
        return (Array.isArray(requests) ? requests : []).map((request: ApprovalRequest) => ({
          ...request,
          organizationId: membership.organizationId,
          organizationName: membership.organization?.name || "Organization",
        }));
      }));

      setApprovalRequests(results.flat().filter((request) => request.status === "PENDING"));
      setNotificationError("");
    } catch (error) {
      console.error("Unable to load approval requests:", error);
    }
  }

  async function reviewApprovalRequest(request: ApprovalRequest, decision: "APPROVED" | "REJECTED") {
    setApprovalActionId(request.id);
    setNotificationError("");
    try {
      const response = await fetch(`${API_BASE_URL}/organizations/${request.organizationId}/join-requests/${request.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to review join request");
      await loadApprovalRequests();
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : "Unable to review join request");
    } finally {
      setApprovalActionId(null);
    }
  }

  useEffect(() => {
    if (!token) {
      setApprovalRequests([]);
      return;
    }
    void loadApprovalRequests();
    const interval = window.setInterval(() => void loadApprovalRequests(), 30_000);
    return () => window.clearInterval(interval);
  }, [token, organizationId]);

  async function loadOrganizationMembers() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    try {
      setMembersLoading(true);
      setMembersError("");

      const response = await fetch(
        `${API_BASE_URL}/memberships/organization/${organizationId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to load members (${response.status})`);
      }

      setOrganizationMembers(Array.isArray(data) ? data : data?.members ?? []);
    } catch (err) {
      console.error(err);
      setMembersError(err instanceof Error ? err.message : "Unable to load organization members.");
    } finally {
      setMembersLoading(false);
    }
  }

  function openAddOrganizationMember() {
    setMembershipForm(emptyMembershipForm);
    setMembershipJoinCode("");
    setMembersError("");
    setMembershipModalOpen(true);
  }

  function closeMembershipModal() {
    setMembershipModalOpen(false);
    setMembershipForm(emptyMembershipForm);
    setMembershipJoinCode("");
  }

  async function saveOrganizationMember() {
    const email = membershipForm.email.trim().toLowerCase();

    if (!email) {
      setMembersError("Email address is required.");
      return;
    }

    try {
      setMembershipSaving(true);
      setMembersError("");
      setMembershipJoinCode("");

      const response = await fetch(`${API_BASE_URL}/memberships`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email,
          organizationId: organizationId,
        }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 404 && data?.error === "No OrgImpact account exists with this email address.") {
          const organizationsResponse = await fetch(`${API_BASE_URL}/organizations`, { headers: getAuthHeaders() });
          const organizations = await organizationsResponse.json().catch(() => []);
          const organization = Array.isArray(organizations)
            ? organizations.find((item) => item.id === organizationId)
            : null;
          if (organization?.joinCode) {
            setMembershipJoinCode(organization.joinCode);
            return;
          }
          throw new Error("No account exists with this email, and the organization join code could not be loaded.");
        }
        throw new Error(data?.error || data?.message || `Unable to create invitation (${response.status})`);
      }

      await loadOrganizationMembers();
      setMembershipModalOpen(false);
      setMembershipForm(emptyMembershipForm);
    } catch (err) {
      console.error(err);
      setMembersError(err instanceof Error ? err.message : "Unable to add member.");
    } finally {
      setMembershipSaving(false);
    }
  }

  function openEditOrganizationMember(member: OrganizationMember) {
    setEditingMembership(member);
    setMembershipEditRole(member.role);
    setMembersError("");
    setMembershipEditOpen(true);
  }

  function closeMembershipEdit() {
    setMembershipEditOpen(false);
    setEditingMembership(null);
    setMembershipEditRole("MEMBER");
  }

  async function saveOrganizationMemberRole() {
    if (!editingMembership) return;

    try {
      setMembershipSaving(true);
      setMembersError("");
      const response = await fetch(`${API_BASE_URL}/memberships/${editingMembership.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: membershipEditRole }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to update member role (${response.status})`);
      }

      closeMembershipEdit();
      await loadOrganizationMembers();
      await loadCurrentUser();
    } catch (err) {
      console.error(err);
      setMembersError(err instanceof Error ? err.message : "Unable to update member role.");
    } finally {
      setMembershipSaving(false);
    }
  }

  async function removeOrganizationMember(member: OrganizationMember) {
    setConfirmDialog({
      title: "Remove organization member?",
      message: `${member.user?.name ?? "This user"} will lose access to this organization.`,
      confirmLabel: "Remove",
      onConfirm: () => {
        void (async () => {
          try {
            setMembersError("");
            const response = await fetch(`${API_BASE_URL}/memberships/${member.id}`, {
              method: "DELETE",
              headers: getAuthHeaders(),
            });
            if (await handleUnauthorized(response)) {
              throw new Error("Authentication failed. Please login again.");
            }
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.error || data?.message || `Unable to remove member (${response.status})`);
            }
            setConfirmDialog(null);
            await loadOrganizationMembers();
          } catch (err) {
            console.error(err);
            setConfirmDialog(null);
            setMembersError(err instanceof Error ? err.message : "Unable to remove organization member.");
          }
        })();
      },
    });
  }

  async function loadTeamMembers(teamId: string) {
    try {
      setTeamMembersLoading(true);
      setTeamError("");

      const response = await fetch(
        `${API_BASE_URL}/team-members/team/${teamId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to load team members (${response.status})`);
      }

      setTeamMembers(Array.isArray(data) ? data : data?.members ?? []);
    } catch (err) {
      console.error(err);
      setTeamError(err instanceof Error ? err.message : "Unable to load team members.");
    } finally {
      setTeamMembersLoading(false);
    }
  }

  async function loadChatConversations() {
    if (!localStorage.getItem("token")) return [] as ChatConversation[];
    try {
      setChatConversationsLoading(true);
      setChatError("");
      const response = await fetch(`${API_BASE_URL}/chat/organizations/${organizationId}/conversations`, { headers: getAuthHeaders() });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please sign in again.");
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || `Unable to load conversations (${response.status})`);
      const conversations = Array.isArray(data) ? data as ChatConversation[] : [];
      setChatConversations(conversations);
      setSelectedChatConversation((current) => current ? conversations.find((item) => item.id === current.id) ?? null : null);
      return conversations;
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Unable to load conversations.");
      return [] as ChatConversation[];
    } finally {
      setChatConversationsLoading(false);
    }
  }

  async function loadChatMessages(conversationId: string, before?: string) {
    try {
      setChatLoading(true);
      setChatError("");
      const query = before ? `?before=${encodeURIComponent(before)}` : "";
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages${query}`, { headers: getAuthHeaders() });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please sign in again.");
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || `Unable to load messages (${response.status})`);
      const messages = Array.isArray(data) ? data as ChatMessage[] : [];
      if (before) setChatMessages((current) => [...messages, ...current.filter((message) => !messages.some((item) => item.id === message.id))]);
      else setChatMessages(messages);
      setChatHasOlder(messages.length === 50);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Unable to load messages.");
    } finally {
      setChatLoading(false);
    }
  }

  async function markChatRead(conversationId: string) {
    const markLocally = () => setChatConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation));
    if (socket.connected) {
      socket.emit("chat:mark-read", conversationId, (result: { ok: boolean }) => { if (result.ok) markLocally(); });
      return;
    }
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, { method: "PATCH", headers: getAuthHeaders() });
    if (response.ok) markLocally();
  }

  async function openChatConversation(conversation: ChatConversation) {
    if (selectedChatConversation?.id && selectedChatConversation.id !== conversation.id) socket.emit("chat:leave-conversation", selectedChatConversation.id);
    setSelectedChatConversation(conversation);
    setChatMessages([]);
    setChatTypingUser(null);
    setChatMobileOpen(true);
    socket.emit("chat:join-conversation", conversation.id, (result: { ok: boolean; error?: string }) => {
      if (!result.ok) setChatError(result.error || "Unable to join this conversation.");
    });
    await Promise.all([loadChatMessages(conversation.id), markChatRead(conversation.id)]);
  }

  async function startDirectChat(user: ChatUser) {
    setChatError("");
    try {
      const response = await fetch(`${API_BASE_URL}/chat/organizations/${organizationId}/conversations/direct`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Unable to start conversation (${response.status})`);
      const conversations = await loadChatConversations();
      const conversation = conversations.find((item) => item.id === data.id);
      if (conversation) await openChatConversation(conversation);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Unable to start direct conversation.");
    }
  }

  async function openTeamChat(team: Team) {
    setChatError("");
    try {
      const response = await fetch(`${API_BASE_URL}/chat/organizations/${organizationId}/conversations/teams/${team.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Unable to open team channel (${response.status})`);
      const conversations = await loadChatConversations();
      const conversation = conversations.find((item) => item.id === data.id);
      if (conversation) await openChatConversation(conversation);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Unable to open team channel.");
    }
  }

  async function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const conversation = selectedChatConversation;
    const content = chatMessageText.trim();
    if (!conversation || !content || chatSending) return;
    if (!socket.connected) {
      setChatError("You are offline. Reconnect before sending your message.");
      return;
    }
    setChatSending(true);
    setChatError("");
    if (chatPendingMessageRef.current?.content !== content) {
      chatPendingMessageRef.current = { content, id: crypto.randomUUID() };
    }
    const clientMessageId = chatPendingMessageRef.current.id;
    socket.timeout(10000).emit("chat:send-message", { conversationId: conversation.id, content, clientMessageId }, (timeoutError: Error | null, result: { ok: boolean; error?: string; message?: ChatMessage }) => {
      setChatSending(false);
      if (timeoutError) {
        setChatError("The server did not confirm delivery. Reconnect and retry; the message ID prevents duplicate saves.");
        return;
      }
      if (!result.ok || !result.message) {
        setChatError(result.error || "Message could not be sent.");
        return;
      }
      chatPendingMessageRef.current = null;
      setChatMessageText("");
      setChatMessages((current) => current.some((item) => item.id === result.message!.id) ? current : [...current, result.message!]);
      setChatConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, lastMessage: result.message!, updatedAt: result.message!.createdAt } : item));
    });
  }

  useEffect(() => {
    if (activeView === "teams" && token) {
      void loadTeams();
      void loadOrganizationMembers();
      void loadCurrentUser();
    }
  }, [activeView, token]);

  useEffect(() => {
    if (activeView === "members" && token) {
      void loadOrganizationMembers();
      void loadCurrentUser();
    }
  }, [activeView, token]);

  useEffect(() => {
    if (activeView === "chat" && token) {
      void loadChatConversations();
      void loadOrganizationMembers();
      void loadTeams();
      void loadCurrentUser();
    }
  }, [activeView, token, organizationId]);

  useEffect(() => {
    if (token) void loadChatConversations();
  }, [token, organizationId]);

  useEffect(() => {
    if (!token) return;
    const onConnect = () => {
      setChatConnected(true);
      if (selectedChatConversation) socket.emit("chat:join-conversation", selectedChatConversation.id);
    };
    const onDisconnect = () => setChatConnected(false);
    const onMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      const { conversationId, message } = payload;
      setChatConversations((current) => current.map((conversation) => conversation.id === conversationId ? {
        ...conversation,
        lastMessage: message,
        updatedAt: message.createdAt,
        unreadCount: activeView === "chat" && selectedChatConversation?.id === conversationId || message.senderId === currentUser?.id
          ? 0
          : conversation.unreadCount + 1,
      } : conversation).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      if (selectedChatConversation?.id === conversationId) {
        setChatMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (activeView === "chat" && message.senderId !== currentUser?.id) void markChatRead(conversationId);
      }
    };
    const onTyping = (payload: { conversationId: string; userId: string; expiresIn: number }) => {
      if (payload.conversationId !== selectedChatConversation?.id || payload.userId === currentUser?.id) return;
      const sender = selectedChatConversation.members.find((member) => member.id === payload.userId);
      setChatTypingUser(sender?.name ?? "A teammate");
      window.setTimeout(() => setChatTypingUser((current) => current === (sender?.name ?? "A teammate") ? null : current), payload.expiresIn);
    };
    const onRead = (payload: { conversationId: string; userId: string; lastReadAt: string }) => {
      if (payload.userId !== currentUser?.id) {
        setChatReadAtByConversation((current) => ({ ...current, [payload.conversationId]: payload.lastReadAt }));
      }
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:read", onRead);
    setChatConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:read", onRead);
    };
  }, [token, activeView, selectedChatConversation?.id, currentUser?.id]);

  useEffect(() => {
    if (activeView === "incidents" && token) void loadIncidents();
  }, [activeView, token]);

  useEffect(() => {
    if (selectedTeam) {
      void loadTeamMembers(selectedTeam.id);
    } else {
      setTeamMembers([]);
    }
  }, [selectedTeam]);

  useEffect(() => {
    setEntityTypes([]);
    setEntityTypesError("");
  }, [organizationId]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    void loadGraph();
    void loadEntityTypes();
  }, [token, organizationId]);

  const affectedIds = useMemo(() => {
    if (!impact) {
      return new Set<string>();
    }

    return new Set(
      impact.affectedEntities.map((entity) => entity.id),
    );
  }, [impact]);

  const nodes: Node[] = useMemo(() => {
    if (!graph) {
      return [];
    }

    const incomingCount = new Map<string, number>();

    graph.nodes.forEach((node) => {
      incomingCount.set(node.id, 0);
    });

    graph.edges.forEach((edge) => {
      incomingCount.set(
        edge.target,
        (incomingCount.get(edge.target) ?? 0) + 1,
      );
    });

    const roots = graph.nodes
      .filter(
        (node) => (incomingCount.get(node.id) ?? 0) === 0,
      )
      .map((node) => node.id);

    const levels = new Map<string, number>();
    const queue = roots.map((id) => ({ id, level: 0 }));

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        break;
      }

      const existingLevel = levels.get(current.id);

      if (
        existingLevel !== undefined &&
        existingLevel >= current.level
      ) {
        continue;
      }

      levels.set(current.id, current.level);

      graph.edges
        .filter((edge) => edge.source === current.id)
        .forEach((edge) => {
          queue.push({
            id: edge.target,
            level: current.level + 1,
          });
        });
    }

    graph.nodes.forEach((node) => {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0);
      }
    });

    const levelCounts = new Map<number, number>();

    return graph.nodes.map((entity) => {
      const level = levels.get(entity.id) ?? 0;
      const row = levelCounts.get(level) ?? 0;
      levelCounts.set(level, row + 1);

      const isSelected = selectedEntity?.id === entity.id;
      const isAffected = affectedIds.has(entity.id);
      const isFocused = focusedEntityId === entity.id;

      const type = entity.entityType.toUpperCase();
      let typeClass = "graph-node-default";
      let icon = "•";

      if (type === "SERVICE") {
        typeClass = "graph-node-service";
        icon = "S";
      } else if (type === "DATABASE") {
        typeClass = "graph-node-database";
        icon = "DB";
      } else if (type === "APPLICATION") {
        typeClass = "graph-node-application";
        icon = "A";
      } else if (type === "INFRASTRUCTURE") {
        typeClass = "graph-node-infrastructure";
        icon = "INF";
      }

      return {
        id: entity.id,
        position: {
          x: level * 320 + 80,
          y: row * 180 + 80,
        },
        data: {
          miniLabel: entity.name,
          miniColor: entity.entityTypeColor ?? "#64748b",
          label: (
            <div
              className={[
                "graph-node",
                typeClass,
                isSelected ? "is-selected" : "",
                isAffected ? "is-affected" : "",
                isFocused ? "is-focused" : "",
              ].join(" ")}
              style={entity.entityTypeColor ? { borderLeftColor: entity.entityTypeColor } : undefined}
            >
              <div
                className="node-icon"
                style={entity.entityTypeColor ? {
                  backgroundColor: entity.entityTypeColor,
                  borderColor: entity.entityTypeColor,
                } : undefined}
              >{icon}</div>

              <div className="node-content">
                <div className="node-type">
                  {entity.entityType}
                </div>

                <div className="node-name">
                  {entity.name}
                </div>

                {entity.description && (
                  <div className="node-description">
                    {entity.description}
                  </div>
                )}
              </div>
            </div>
          ),
        },
        style: {
          width: 230,
          padding: 0,
          border: "none",
          background: "transparent",
          boxShadow: "none",
        },
        className: entity.entityTypeColor ? "has-custom-type-color" : undefined,
      };
    });
  }, [graph, selectedEntity, affectedIds, focusedEntityId]);

  const edges: Edge[] = useMemo(() => {
    if (!graph) {
      return [];
    }

    return graph.edges.map((relationship) => {
      const sourceAffected = affectedIds.has(
        relationship.source,
      );
      const targetAffected = affectedIds.has(
        relationship.target,
      );
      const highlighted = sourceAffected || targetAffected;

      return {
        id: relationship.id,
        source: relationship.source,
        target: relationship.target,
        type: "smoothstep",
        label: relationship.relationshipType,
        animated: highlighted,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
        },
        style: {
          strokeWidth: highlighted ? 3 : 2,
        },
        labelStyle: {
          fontSize: 9,
          fontWeight: 800,
          fill: "#cbd5e1",
        },
        labelBgStyle: {
          fill: "#020617",
          borderRadius: 6,
        },
        labelBgPadding: [10, 5] as [number, number],
      };
    });
  }, [graph, affectedIds]);

  async function analyzeImpact(entityId: string) {
    try {
      setImpactLoading(true);
      setImpactError("");
      setImpact(null);

      const response = await fetch(
        `${API_BASE_URL}/impact/${entityId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      if (response.status === 403) {
        throw new Error(
          "You are not authorized to analyze this entity.",
        );
      }

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data: ImpactResponse = await response.json();
      setImpact(data);
    } catch (err) {
      console.error(err);
      setImpactError(
        err instanceof Error
          ? err.message
          : "Unable to analyze impact.",
      );
    } finally {
      setImpactLoading(false);
    }
  }

  function focusEntity(entityId: string) {
    const entityNode = nodes.find(
      (node) => node.id === entityId,
    );

    if (!entityNode || !reactFlowInstance) {
      return;
    }

    setFocusedEntityId(entityId);

    reactFlowInstance.fitView({
      nodes: [entityNode],
      padding: 0.6,
      duration: 600,
      minZoom: 0.8,
      maxZoom: 1.5,
    });
  }

  function handleAffectedEntityClick(entityId: string) {
    const entity = graph?.nodes.find(
      (item) => item.id === entityId,
    );

    if (!entity) {
      return;
    }

    setSelectedEntity(entity);
    setImpact(null);
    setImpactError("");
    setFocusedEntityId(entityId);

    void analyzeImpact(entityId);

    requestAnimationFrame(() => {
      focusEntity(entityId);
    });
  }

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const entity = graph?.nodes.find(
      (item) => item.id === node.id,
    );

    if (!entity) {
      return;
    }

    setSelectedEntity(entity);
    setImpact(null);
    setImpactError("");
    setFocusedEntityId(entity.id);

    void analyzeImpact(entity.id);
  };

  async function handleLogin(newToken: string) {
    setShowOnboarding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!response.ok) throw new Error("Unable to load your organization membership");
      const user: CurrentUser = await response.json();
      const memberships = user.memberships || [];
      const savedOrganizationId = localStorage.getItem("organizationId");
      const membership = memberships.find((item) => item.organizationId === savedOrganizationId) || memberships[0];

      if (membership) {
        localStorage.setItem("organizationId", membership.organizationId);
        setShowOnboarding(false);
      } else {
        localStorage.removeItem("organizationId");
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Unable to determine organization membership:", error);
      localStorage.removeItem("organizationId");
      setShowOnboarding(true);
    }

    localStorage.setItem("token", newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("organizationId");
    setToken(null);
    setGraph(null);
    setSelectedEntity(null);
    setImpact(null);
    setError("");
    setImpactError("");
    setEntityError("");
    setEntityTypes([]);
    setEntityTypesError("");
    setEntityTypesModalOpen(false);
    setActiveView("dashboard");
  }

  function closeEntityTypesModal() {
    if (entityTypeSaving) return;
    setEntityTypesModalOpen(false);
    setEditingEntityType(null);
    setEntityTypeForm({ name: "", color: "#2563EB" });
    setEntityTypesError("");
  }

  function startCreateEntityType() {
    setEditingEntityType(null);
    setEntityTypeForm({ name: "", color: "#2563EB" });
    setEntityTypesError("");
  }

  function startEditEntityType(entityType: EntityType) {
    setEditingEntityType(entityType);
    setEntityTypeForm({ name: entityType.name, color: entityType.color });
    setEntityTypesError("");
  }

  async function saveEntityType() {
    const name = entityTypeForm.name.trim();
    if (!name) {
      setEntityTypesError("Type name is required.");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(entityTypeForm.color)) {
      setEntityTypesError("Choose a valid six-digit hex color.");
      return;
    }

    try {
      setEntityTypeSaving(true);
      setEntityTypesError("");
      const response = await fetch(
        editingEntityType
          ? `${API_BASE_URL}/entity-types/${editingEntityType.id}`
          : `${API_BASE_URL}/entity-types`,
        {
          method: editingEntityType ? "PATCH" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...(editingEntityType ? {} : { organizationId }),
            name,
            color: entityTypeForm.color,
          }),
        },
      );
      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save entity type.");
      }
      setEditingEntityType(null);
      setEntityTypeForm({ name: "", color: "#2563EB" });
      await loadEntityTypes();
      await loadGraph();
    } catch (error) {
      setEntityTypesError(error instanceof Error ? error.message : "Unable to save entity type.");
    } finally {
      setEntityTypeSaving(false);
    }
  }

  async function performDeleteEntityType(entityType: EntityType) {
    try {
      setEntityTypesError("");
      const response = await fetch(`${API_BASE_URL}/entity-types/${entityType.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete entity type.");
      }
      if (editingEntityType?.id === entityType.id) startCreateEntityType();
      await loadEntityTypes();
    } catch (error) {
      setEntityTypesError(error instanceof Error ? error.message : "Unable to delete entity type.");
    }
  }

  function confirmDeleteEntityType(entityType: EntityType) {
    setConfirmDialog({
      title: "Delete entity type?",
      message: `Delete "${entityType.name}"? Types assigned to entities cannot be deleted; no entities will be removed.`,
      confirmLabel: "Delete type",
      onConfirm: () => { void performDeleteEntityType(entityType); },
    });
  }

  function openCreateEntity() {
    setEditingEntity(null);

    setEntityForm({
      ...emptyEntityForm,
      entityTypeId: entityTypes[0]?.id ?? "",
      criticality: "MEDIUM",
    });

    setEntityError("");
    setEntityModalOpen(true);
  }

  function openEditEntity(entity: GraphNode) {
    const matchingType = entityTypes.find(
      (type) =>
        type.name.toLowerCase() ===
        entity.entityType.toLowerCase(),
    );

    setEditingEntity(entity);

    setEntityForm({
      name: entity.name,
      description: entity.description ?? "",
      entityTypeId: matchingType?.id ?? "",
      criticality: entity.criticality ?? "MEDIUM",
    });

    setEntityError("");
    setEntityModalOpen(true);
  }

  function closeEntityModal() {
    setEntityModalOpen(false);
    setEditingEntity(null);
    setEntityForm(emptyEntityForm);
    setEntityError("");
  }

  async function saveEntity() {
    if (!entityForm.name.trim()) {
      setEntityError("Entity name is required.");
      return;
    }

    if (!editingEntity && !entityForm.entityTypeId) {
      setEntityError("Please select an entity type.");
      return;
    }

    try {
      setEntitySaving(true);
      setEntityError("");

      const url = editingEntity
        ? `${API_BASE_URL}/entities/${editingEntity.id}`
        : `${API_BASE_URL}/entities`;

      const body = editingEntity
        ? {
            name: entityForm.name.trim(),
            entityTypeId: entityForm.entityTypeId,
            ...(entityForm.description.trim()
              ? {
                  description: entityForm.description.trim(),
                }
              : {}),
            criticality: entityForm.criticality,
          }
        : {
            organizationId: organizationId,
            entityTypeId: entityForm.entityTypeId,
            name: entityForm.name.trim(),
            ...(entityForm.description.trim()
              ? {
                  description: entityForm.description.trim(),
                }
              : {}),
            criticality: entityForm.criticality,
          };

      const response = await fetch(url, {
        method: editingEntity ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Unable to ${editingEntity ? "update" : "create"} entity.`,
        );
      }

      closeEntityModal();
      setSelectedEntity(null);
      setImpact(null);
      setFocusedEntityId(null);
      await loadGraph();
      setConfirmDialog(null);
    } catch (err) {
      console.error(err);
      setEntityError(
        err instanceof Error
          ? err.message
          : "Unable to save entity.",
      );
    } finally {
      setEntitySaving(false);
    }
  }

  async function deleteEntity(entity: GraphNode) {
    setConfirmDialog({
      title: "Delete entity?",
      message: `Delete "${entity.name}"? Any relationships connected to this entity will also be removed by the database.`,
      confirmLabel: "Delete entity",
      onConfirm: () => { void performDeleteEntity(entity); },
    });
  }

  async function performDeleteEntity(entity: GraphNode) {
    try {
      setEntityError("");

      const response = await fetch(
        `${API_BASE_URL}/entities/${entity.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to delete entity.",
        );
      }

      if (selectedEntity?.id === entity.id) {
        setSelectedEntity(null);
        setImpact(null);
        setFocusedEntityId(null);
      }

      setConfirmDialog(null);
      // await loadGraph(); // graph updates through socket events.
    } catch (err) {
      console.error(err);
      setEntityError(
        err instanceof Error
          ? err.message
          : "Unable to delete entity.",
      );
    }
  }

  function openCreateRelationship() {
    const entities = graph?.nodes ?? [];

    setRelationshipForm({
      sourceEntityId: entities[0]?.id ?? "",
      targetEntityId: entities[1]?.id ?? "",
      relationshipType: "DEPENDS_ON",
    });
    setRelationshipError("");
    setRelationshipModalOpen(true);
  }

  function closeRelationshipModal() {
    if (relationshipSaving) {
      return;
    }

    setRelationshipModalOpen(false);
    setRelationshipForm(emptyRelationshipForm);
    setRelationshipError("");
  }

  async function saveRelationship() {
    const { sourceEntityId, targetEntityId, relationshipType } =
      relationshipForm;

    if (!sourceEntityId || !targetEntityId) {
      setRelationshipError("Please select both source and target entities.");
      return;
    }

    if (sourceEntityId === targetEntityId) {
      setRelationshipError("Source and target entities must be different.");
      return;
    }

    try {
      setRelationshipSaving(true);
      setRelationshipError("");

      const response = await fetch(`${API_BASE_URL}/relationships`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organizationId: organizationId,
          sourceEntityId,
          targetEntityId,
          relationshipType,
        }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to create relationship.",
        );
      }

      setRelationshipModalOpen(false);
      setRelationshipForm(emptyRelationshipForm);
      setRelationshipError("");
      setConfirmDialog(null);
      // await loadGraph();
    } catch (err) {
      console.error(err);
      setRelationshipError(
        err instanceof Error
          ? err.message
          : "Unable to create relationship.",
      );
    } finally {
      setRelationshipSaving(false);
    }
  }

  async function deleteRelationship(relationshipId: string) {
    const relationship = graph?.edges.find(
      (edge) => edge.id === relationshipId,
    );

    if (!relationship) {
      return;
    }

    const source = graph?.nodes.find(
      (node) => node.id === relationship.source,
    );
    const target = graph?.nodes.find(
      (node) => node.id === relationship.target,
    );

    setConfirmDialog({
      title: "Delete relationship?",
      message: `Delete ${source?.name ?? "source"} → ${relationship.relationshipType} → ${target?.name ?? "target"}?`,
      confirmLabel: "Delete relationship",
      onConfirm: () => { void performDeleteRelationship(relationshipId); },
    });
  }

  async function performDeleteRelationship(relationshipId: string) {
    try {
      setRelationshipError("");

      const response = await fetch(
        `${API_BASE_URL}/relationships/${relationshipId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to delete relationship.",
        );
      }

      setSelectedEntity(null);
      setImpact(null);
      setFocusedEntityId(null);
      // await loadGraph();
    } catch (err) {
      console.error(err);
      setRelationshipError(
        err instanceof Error
          ? err.message
          : "Unable to delete relationship.",
      );
    }
  }

  async function loadIncidents() {
    if (!localStorage.getItem("token")) return;
    try {
      setIncidentsLoading(true); setIncidentError("");
      const response = await fetch(`${API_BASE_URL}/incidents/organization/${organizationId}`, { headers: getAuthHeaders() });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please login again.");
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || data?.message || `Unable to load incidents (${response.status})`);
      setIncidents(Array.isArray(data) ? data : data?.incidents ?? []);
    } catch (err) { setIncidentError(err instanceof Error ? err.message : "Unable to load incidents."); }
    finally { setIncidentsLoading(false); }
  }

  function openCreateIncident() {
    setEditingIncident(null); setIncidentError("");
    setIncidentForm({ ...emptyIncidentForm, affectedEntityId: graph?.nodes[0]?.id ?? "" });
    setIncidentModalOpen(true);
  }

  function openEditIncident(incident: Incident) {
    setEditingIncident(incident); setIncidentError("");
    setIncidentForm({ title: incident.title, description: incident.description ?? "", affectedEntityId: incident.affectedEntityId, severity: incident.severity });
    setIncidentModalOpen(true);
  }

  function closeIncidentModal() {
    if (incidentSaving) return;
    setIncidentModalOpen(false); setEditingIncident(null); setIncidentForm(emptyIncidentForm); setIncidentError("");
  }

  async function saveIncident() {
    if (!incidentForm.title.trim()) { setIncidentError("Incident title is required."); return; }
    if (!incidentForm.affectedEntityId) { setIncidentError("Please select the affected entity."); return; }
    try {
      setIncidentSaving(true); setIncidentError("");
      const url = editingIncident ? `${API_BASE_URL}/incidents/${editingIncident.id}` : `${API_BASE_URL}/incidents`;
      const body = editingIncident ? { title: incidentForm.title.trim(), description: incidentForm.description.trim() || null, severity: incidentForm.severity } : { organizationId: organizationId, affectedEntityId: incidentForm.affectedEntityId, title: incidentForm.title.trim(), description: incidentForm.description.trim() || undefined, severity: incidentForm.severity };
      const response = await fetch(url, { method: editingIncident ? "PATCH" : "POST", headers: getAuthHeaders(), body: JSON.stringify(body) });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please login again.");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || "Unable to save incident.");
      closeIncidentModal(); await loadIncidents();
      if (!editingIncident) { const entity = graph?.nodes.find((item) => item.id === data?.affectedEntityId); if (entity) { setSelectedIncident(data); setSelectedEntity(entity); setFocusedEntityId(entity.id); void analyzeImpact(entity.id); } }
    } catch (err) { setIncidentError(err instanceof Error ? err.message : "Unable to save incident."); }
    finally { setIncidentSaving(false); }
  }

  async function updateIncidentStatus(incident: Incident, status: Incident["status"]) {
    try {
      setIncidentError("");
      const response = await fetch(`${API_BASE_URL}/incidents/${incident.id}`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify({ status }) });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please login again.");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || "Unable to update incident status.");
      setIncidents((current) => current.map((item) => item.id === incident.id ? data : item)); setSelectedIncident(data);
    } catch (err) { setIncidentError(err instanceof Error ? err.message : "Unable to update incident status."); }
  }

  async function deleteIncident(incident: Incident) {
    setConfirmDialog({
      title: "Delete incident?",
      message: `Delete incident "${incident.title}"? This action cannot be undone.`,
      confirmLabel: "Delete incident",
      onConfirm: () => { void performDeleteIncident(incident); },
    });
  }

  async function performDeleteIncident(incident: Incident) {
    try {
      setIncidentError("");
      const response = await fetch(`${API_BASE_URL}/incidents/${incident.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please login again.");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || "Unable to delete incident.");
      setIncidents((current) => current.filter((item) => item.id !== incident.id));
      if (selectedIncident?.id === incident.id) { setSelectedIncident(null); setSelectedEntity(null); setImpact(null); setFocusedEntityId(null); }
      setConfirmDialog(null);
    } catch (err) { setIncidentError(err instanceof Error ? err.message : "Unable to delete incident."); }
  }

  function selectIncident(incident: Incident) {
    setSelectedIncident(incident);
    const entity = graph?.nodes.find((item) => item.id === incident.affectedEntityId);
    if (!entity) { setIncidentError("The affected entity is not currently available in the graph."); return; }
    setIncidentError(""); setSelectedEntity(entity); setImpact(null); setImpactError(""); setFocusedEntityId(entity.id); void analyzeImpact(entity.id);
    requestAnimationFrame(() => focusEntity(entity.id));
  }

  function calculateSimulationRisk(
    criticality: GraphNode["criticality"],
    totalAffected: number,
    maxDepth: number,
  ) {
    const criticalityScore: Record<GraphNode["criticality"], number> = {
      LOW: 10,
      MEDIUM: 30,
      HIGH: 60,
      CRITICAL: 85,
    };

    const safeAffected = Number.isFinite(totalAffected)
      ? Math.max(0, totalAffected)
      : 0;

    const safeDepth = Number.isFinite(maxDepth)
      ? Math.max(0, maxDepth)
      : 0;

    const baseScore = criticalityScore[criticality] ?? 30;
    const blastRadiusScore = Math.min(30, safeAffected * 10);
    const depthScore = Math.min(20, Math.max(0, safeDepth - 1) * 10);

    const score = Math.min(
      100,
      baseScore + blastRadiusScore + depthScore,
    );

    if (score >= 80) return { score, level: "CRITICAL" as const };
    if (score >= 60) return { score, level: "HIGH" as const };
    if (score >= 35) return { score, level: "MEDIUM" as const };
    return { score, level: "LOW" as const };
  }

  const filteredSimulationEntities = useMemo(() => {
    const entities = graph?.nodes ?? [];

    if (simulationRiskFilter === "ALL") {
      return entities;
    }

    return entities.filter(
      (entity) => simulationRiskMap[entity.id]?.level === simulationRiskFilter,
    );
  }, [graph, simulationRiskFilter, simulationRiskMap]);

  async function loadSimulationRiskOverview() {
    if (!graph?.nodes?.length) {
      return;
    }

    try {
      setSimulationOverviewLoading(true);

      const results = await Promise.all(
        graph.nodes.map(async (entity) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/impact/${entity.id}`,
              { headers: getAuthHeaders() },
            );

            if (!response.ok) {
              return null;
            }

            const data: ImpactResponse = await response.json();

            const maxDepth =
              data.affectedEntities.length > 0
                ? Math.max(
                    ...data.affectedEntities.map((item) => item.depth),
                  )
                : 0;

            const risk = calculateSimulationRisk(
              entity.criticality,
              data.totalAffected,
              maxDepth,
            );

            return {
              id: entity.id,
              score: risk.score,
              level: risk.level,
            };
          } catch {
            return null;
          }
        }),
      );

      const riskMap: Record<
        string,
        { score: number; level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
      > = {};

      for (const result of results) {
        if (result) {
          riskMap[result.id] = {
            score: result.score,
            level: result.level,
          };
        }
      }

      setSimulationRiskMap(riskMap);
    } finally {
      setSimulationOverviewLoading(false);
    }
  }

  useEffect(() => {
    if (activeView === "simulation" && graph?.nodes?.length) {
      void loadSimulationRiskOverview();
    }
  }, [activeView, graph]);

  async function runChangeSimulation(entityIdOverride?: string) {
    const entityId = entityIdOverride ?? simulationEntityId;

    if (!entityId) {
      setSimulationError("Please select an entity to simulate.");
      return;
    }

    try {
      setSimulationLoading(true);
      setSimulationError("");
      setSimulationResult(null);

      const response = await fetch(
        `${API_BASE_URL}/impact/${entityId}`,
        { headers: getAuthHeaders() },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Unable to simulate change (${response.status})`,
        );
      }

      const impactData: ImpactResponse = data;

      const maxDepth =
        impactData.affectedEntities.length > 0
          ? Math.max(
              ...impactData.affectedEntities.map((entity) => entity.depth),
            )
          : 0;

      const rootEntity = graph?.nodes.find(
        (entity) => entity.id === entityId,
      );

      if (!rootEntity) {
        throw new Error("Selected entity is no longer available.");
      }

      const risk = calculateSimulationRisk(
        rootEntity.criticality,
        impactData.totalAffected,
        maxDepth,
      );

      setSimulationResult({
        rootEntity: impactData.rootEntity,
        totalAffected: impactData.totalAffected,
        affectedEntities: impactData.affectedEntities,
        riskScore: risk.score,
        riskLevel: risk.level,
      });

      setSelectedEntity(impactData.rootEntity);
      setImpact(impactData);
      setImpactError("");
      setFocusedEntityId(impactData.rootEntity.id);

      requestAnimationFrame(() => {
        focusEntity(impactData.rootEntity.id);
      });
    } catch (err) {
      console.error(err);
      setSimulationError(
        err instanceof Error ? err.message : "Unable to simulate change.",
      );
    } finally {
      setSimulationLoading(false);
    }
  }

  useEffect(() => {
    function handleDocumentPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      const path = event.composedPath();
      const account = profileMenuRef.current;
      const panel = profileMenuPanelRef.current;
      const clickedAccount = Boolean(account && (account.contains(event.target) || path.includes(account)));
      const clickedPanel = Boolean(panel && (panel.contains(event.target) || path.includes(panel)));

      if (!clickedAccount && !clickedPanel) {
        setProfileMenuOpen(false);
      }

      if (simulationFilterRef.current && !simulationFilterRef.current.contains(event.target)) {
        setSimulationFilterOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
  }, []);

  useLayoutEffect(() => {
    if (!profileMenuOpen) return;

    const positionProfileMenu = () => {
      const account = profileMenuRef.current?.querySelector<HTMLElement>(".account-chip");
      const panel = profileMenuPanelRef.current;
      if (!account || !panel) return;

      const accountRect = account.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;
      const panelWidth = panel.getBoundingClientRect().width;
      const left = Math.max(margin, Math.min(accountRect.right - panelWidth, viewportWidth - panelWidth - margin));
      const desiredTop = accountRect.bottom + 10;
      const availableHeight = Math.max(160, viewportHeight - desiredTop - margin);
      const top = availableHeight < 240 ? Math.max(margin, viewportHeight - Math.min(panel.offsetHeight, viewportHeight - margin * 2) - margin) : desiredTop;

      panel.style.left = `${left}px`;
      panel.style.right = "auto";
      panel.style.top = `${top}px`;
      panel.style.maxHeight = `${Math.max(160, viewportHeight - top - margin)}px`;
    };

    const keepMenuPointerEventsInside = (event: PointerEvent) => event.stopPropagation();
    const panel = profileMenuPanelRef.current;
    panel?.addEventListener("pointerdown", keepMenuPointerEventsInside);

    positionProfileMenu();
    window.addEventListener("resize", positionProfileMenu);
    window.addEventListener("scroll", positionProfileMenu, true);
    return () => {
      window.removeEventListener("resize", positionProfileMenu);
      window.removeEventListener("scroll", positionProfileMenu, true);
      panel?.removeEventListener("pointerdown", keepMenuPointerEventsInside);
    };
  }, [profileMenuOpen]);

  function selectSimulationEntity(entityId: string) {
    setSimulationEntityId(entityId);
    setSimulationResult(null);
    setSimulationError("");
    setSelectedEntity(null);
    setImpact(null);
    setFocusedEntityId(null);

    if (entityId) {
      void runChangeSimulation(entityId);
    }
  }

  function openCreateTeam() {
    setEditingTeam(null);
    setTeamForm(emptyTeamForm);
    setTeamError("");
    setTeamModalOpen(true);
  }

  function openEditTeam(team: Team) {
    setEditingTeam(team);
    setTeamForm({ name: team.name, slug: team.slug });
    setTeamError("");
    setTeamModalOpen(true);
  }

  function closeTeamModal() {
    setTeamModalOpen(false);
    setEditingTeam(null);
    setTeamForm(emptyTeamForm);
  }

  async function saveTeam() {
    const name = teamForm.name.trim();
    const slug = teamForm.slug.trim().toLowerCase();

    if (!name) {
      setTeamError("Team name is required.");
      return;
    }

    if (!slug) {
      setTeamError("Team slug is required.");
      return;
    }

    try {
      setTeamSaving(true);
      setTeamError("");

      const response = await fetch(
        editingTeam ? `${API_BASE_URL}/teams/${editingTeam.id}` : `${API_BASE_URL}/teams`,
        {
        method: editingTeam ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...(editingTeam ? {} : { organizationId }),
          name,
          slug,
        }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to ${editingTeam ? "update" : "create"} team (${response.status})`);
      }

      const savedTeam = data?.team ?? data;
      closeTeamModal();
      await loadTeams();
      if (savedTeam?.id) {
        setSelectedTeam(savedTeam);
      }
    } catch (err) {
      console.error(err);
      setTeamError(err instanceof Error ? err.message : `Unable to ${editingTeam ? "update" : "create"} team.`);
    } finally {
      setTeamSaving(false);
    }
  }

  function openAddMember() {
    if (!selectedTeam) return;
    setEditingTeamMember(null);
    setMemberForm(emptyTeamMemberForm);
    setTeamError("");
    setMemberModalOpen(true);
  }

  function openEditTeamMember(member: TeamMember) {
    setEditingTeamMember(member);
    setMemberForm({ userId: member.userId, role: member.role });
    setTeamError("");
    setMemberModalOpen(true);
  }

  function closeMemberModal() {
    setMemberModalOpen(false);
    setEditingTeamMember(null);
    setMemberForm(emptyTeamMemberForm);
  }

  async function saveTeamMember() {
    if (!selectedTeam) return;
    if (!memberForm.userId) {
      setTeamError("Please select a user.");
      return;
    }

    try {
      setMemberSaving(true);
      setTeamError("");

      const response = await fetch(
        editingTeamMember
          ? `${API_BASE_URL}/team-members/${editingTeamMember.id}`
          : `${API_BASE_URL}/team-members`,
        {
          method: editingTeamMember ? "PATCH" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(
            editingTeamMember
              ? { role: memberForm.role }
              : {
                  teamId: selectedTeam.id,
                  userId: memberForm.userId,
                  role: memberForm.role,
                },
          ),
        },
      );

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Unable to ${editingTeamMember ? "update" : "add"} team member (${response.status})`,
        );
      }

      closeMemberModal();
      await loadTeamMembers(selectedTeam.id);
    } catch (err) {
      console.error(err);
      setTeamError(
        err instanceof Error
          ? err.message
          : `Unable to ${editingTeamMember ? "update" : "add"} team member.`,
      );
    } finally {
      setMemberSaving(false);
    }
  }

  async function removeTeamMember(member: TeamMember) {
    if (!selectedTeam) return;

    setConfirmDialog({
      title: "Remove team member?",
      message: `${member.user?.name ?? "This user"} will be removed from ${selectedTeam.name}.`,
      confirmLabel: "Remove",
      onConfirm: () => {
        void (async () => {
          try {
            setTeamError("");
            const response = await fetch(`${API_BASE_URL}/team-members/${member.id}`, {
              method: "DELETE",
              headers: getAuthHeaders(),
            });
            if (await handleUnauthorized(response)) {
              throw new Error("Authentication failed. Please login again.");
            }
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.error || data?.message || `Unable to remove team member (${response.status})`);
            }
            setConfirmDialog(null);
            await loadTeamMembers(selectedTeam.id);
          } catch (err) {
            console.error(err);
            setConfirmDialog(null);
            setTeamError(err instanceof Error ? err.message : "Unable to remove team member.");
          }
        })();
      },
    });
  }

  function selectTeam(team: Team) {
    setSelectedTeam(team);
    setTeamError("");
  }

  function removeTeam(team: Team) {
    setConfirmDialog({
      title: "Delete team?",
      message: `Delete ${team.name} and remove its team memberships? Organization members will keep their organization access.`,
      confirmLabel: "Delete team",
      onConfirm: () => {
        void (async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/teams/${team.id}`, {
              method: "DELETE",
              headers: getAuthHeaders(),
            });
            if (await handleUnauthorized(response)) {
              throw new Error("Authentication failed. Please login again.");
            }
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.error || data?.message || `Unable to delete team (${response.status})`);
            }
            setConfirmDialog(null);
            if (selectedTeam?.id === team.id) {
              setSelectedTeam(null);
              setTeamMembers([]);
            }
            await loadTeams();
          } catch (err) {
            setConfirmDialog(null);
            setTeamError(err instanceof Error ? err.message : "Unable to delete team.");
          }
        })();
      },
    });
  }

  const filteredEntities = useMemo(() => {
    const entities = graph?.nodes ?? [];
    const query = entitySearch.trim().toLowerCase();

    if (!query) {
      return entities;
    }

    return entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(query) ||
        entity.entityType.toLowerCase().includes(query) ||
        (entity.description ?? "")
          .toLowerCase()
          .includes(query),
    );
  }, [graph, entitySearch]);

  const currentOrganizationRole =
    organizationMembers.find((member) => member.userId === currentUser?.id)?.role ?? "";
  const currentTeamMemberRole =
    teamMembers.find((member) => member.userId === currentUser?.id)?.role ?? "";
  const isOrganizationCreator = (targetOrganizationId: string) =>
    Boolean(currentUser && currentUser.memberships?.some(
      (membership) => membership.organizationId === targetOrganizationId &&
        membership.organization?.createdById === currentUser.id,
    ));
  const canManageSelectedTeam =
    currentOrganizationRole === "OWNER" ||
    (selectedTeam ? isOrganizationCreator(selectedTeam.organizationId) : false) ||
    currentTeamMemberRole === "LEAD";
  const canAddTeamMembers = canManageSelectedTeam || currentOrganizationRole === "ADMIN";
  const canEditOrganizationMember = (member: OrganizationMember) => {
    const isCreator = isOrganizationCreator(member.organizationId);
    return currentUser?.id !== member.userId &&
      (isCreator || (
        member.role !== "OWNER" &&
        member.organization?.createdById !== member.userId &&
        (currentOrganizationRole === "OWNER" ||
          (currentOrganizationRole === "ADMIN" && member.role === "MEMBER"))
      ));
  };
  const canEditTeamMember = (member: TeamMember) => {
    if (!selectedTeam || !currentUser || currentUser.id === member.userId) return false;
    const creator = isOrganizationCreator(selectedTeam.organizationId);
    const target = organizationMembers.find((organizationMember) => organizationMember.userId === member.userId);
    const targetIsCreator = target?.organization?.createdById === member.userId;
    const targetIsOwner = target?.role === "OWNER";
    if (creator) return true;
    if (targetIsCreator || targetIsOwner) return false;
    if (currentOrganizationRole === "OWNER") return true;
    return currentTeamMemberRole === "LEAD" && member.role === "MEMBER";
  };

  const canManageTeams = currentOrganizationRole === "OWNER" ||
    isOrganizationCreator(organizationId);
  const currentMembershipRole = currentUser?.memberships?.find(
    (membership) => membership.organizationId === organizationId,
  )?.role;
  const canManageEntityTypes = ["OWNER", "ADMIN"].includes(currentOrganizationRole || currentMembershipRole || "") ||
    isOrganizationCreator(organizationId);
  const canCreateTeams = canManageTeams || currentOrganizationRole === "ADMIN";
  const assignedTeamMemberIds = new Set(teams.flatMap((team) => (team.members ?? []).map((member) => member.userId)));
  const unassignedOrganizationMembers = organizationMembers.filter((member) => !assignedTeamMemberIds.has(member.userId));
  const totalChatUnread = chatConversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const chatVisibleConversations = chatConversations.filter((conversation) => {
    const name = conversation.type === "TEAM"
      ? conversation.team?.name ?? "Team channel"
      : conversation.title ?? conversation.members.find((member) => member.id !== currentUser?.id)?.name ?? "Direct message";
    return `${name} ${conversation.lastMessage?.content ?? ""}`.toLowerCase().includes(chatSearch.trim().toLowerCase());
  });
  const chatVisibleMembers = organizationMembers
    .filter((member) => member.user && member.userId !== currentUser?.id)
    .filter((member) => `${member.user?.name ?? ""} ${member.user?.email ?? ""}`.toLowerCase().includes(chatSearch.trim().toLowerCase()));
  const chatVisibleTeams = teams.filter((team) => team.members?.some((member) => member.userId === currentUser?.id));
  const organizationMemberPriority = (member: OrganizationMember) => {
    if (member.organization?.createdById === member.userId) return 0;
    if (member.role === "OWNER") return 1;
    if (member.role === "ADMIN") return 2;
    return 3;
  };
  const teamMemberPriority = (member: TeamMember) => {
    const organizationMember = organizationMembers.find((item) => item.userId === member.userId);
    if (organizationMember?.organization?.createdById === member.userId) return 0;
    if (organizationMember?.role === "OWNER") return 1;
    if (organizationMember?.role === "ADMIN") return 2;
    if (member.role === "LEAD") return 3;
    return 4;
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  if (showOnboarding || !localStorage.getItem("organizationId")) {
    return <OrganizationOnboarding token={token} onLogout={handleLogout} />;
  }

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className="header-brand-button"
          onClick={() => {
            setActiveView("dashboard");
            setProfileMenuOpen(false);
          }}
          aria-label="Go to OrgImpact dashboard"
        >
          <div className="header-brand">
            <OrgImpactLogo />
          </div>
        </button>

        <nav className="main-nav" aria-label="Primary navigation">
          {[
            ["dashboard", "Dashboard", "dashboard"],
            ["entities", "Entities", "entities"],
            ["relationships", "Relationships", "relationships"],
            ["teams", "Teams", "teams"],
            ["chat", "Chat", "chat"],
            ["members", "Members", "members"],
            ["incidents", "Incidents", "incidents"],
            ["simulation", "Simulation", "simulation"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              className={`nav-item ${activeView === key ? "active" : ""}`}
              onClick={() => {
                setActiveView(key as typeof activeView);
                setProfileMenuOpen(false);
              }}
              aria-current={activeView === key ? "page" : undefined}
            >
              <span className="nav-item-icon">
                <NavIcon name={icon as NavIconName} />
              </span>
              <span className="nav-item-label">{label}</span>
              {key === "chat" && totalChatUnread > 0 && <span className="nav-chat-unread">{totalChatUnread > 9 ? "9+" : totalChatUnread}</span>}
            </button>
          ))}
        </nav>

        <div className="header-account" ref={profileMenuRef}>
          {currentUser?.memberships?.some((membership) => membership.role === "OWNER") && (
            <div className="notification-control">
              <button
                type="button"
                className={`notification-button ${notificationOpen ? "open" : ""}`}
                aria-label={`Approval requests${approvalRequests.length ? `, ${approvalRequests.length} pending` : ""}`}
                aria-expanded={notificationOpen}
                onClick={() => setNotificationOpen((open) => !open)}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
                {approvalRequests.length > 0 && <span className="notification-badge">{approvalRequests.length > 9 ? "9+" : approvalRequests.length}</span>}
              </button>
              {notificationOpen && (
                <div className="approval-notification-menu">
                  <div className="approval-notification-heading">
                    <strong>Join requests</strong>
                    <span>{approvalRequests.length} pending</span>
                  </div>
                  {notificationError && <div className="approval-notification-error">{notificationError}</div>}
                  {approvalRequests.length === 0 ? (
                    <div className="approval-notification-empty">No approval requests right now.</div>
                  ) : approvalRequests.map((request) => (
                    <div className="approval-notification-item" key={request.id}>
                      <div className="approval-notification-copy">
                        <strong>{request.user?.name || "Someone"}</strong>
                        <span>{request.user?.email || ""}</span>
                        <small>Request to join {request.organizationName}</small>
                      </div>
                      <div className="approval-notification-actions">
                        <button type="button" disabled={approvalActionId === request.id} onClick={() => void reviewApprovalRequest(request, "APPROVED")}>Approve</button>
                        <button type="button" className="reject" disabled={approvalActionId === request.id} onClick={() => void reviewApprovalRequest(request, "REJECTED")}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="header-divider" />
          <button
            type="button"
            className={`account-chip ${profileMenuOpen ? "open" : ""}`}
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
          >
            <span className="account-avatar">
              {(currentUser?.name || "U").trim().charAt(0).toUpperCase()}
            </span>
            <span className="account-name">{currentUser?.name || "User"}</span>
            <svg className="account-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {profileMenuOpen && createPortal(
            <div className="profile-menu" ref={profileMenuPanelRef} role="menu">
              <div className="profile-menu-header">
                <div className="profile-menu-avatar">
                  {(currentUser?.name || "U").trim().charAt(0).toUpperCase()}
                </div>
                <div className="profile-menu-identity">
                  {profileNameEditing ? (
                    <form className="profile-name-edit" onSubmit={(event) => void saveProfileName(event)}>
                      <input
                        aria-label="Account name"
                        value={profileNameDraft}
                        maxLength={100}
                        autoFocus
                        disabled={profileNameSaving}
                        onChange={(event) => setProfileNameDraft(event.target.value)}
                      />
                      <button type="submit" aria-label="Save name" disabled={profileNameSaving || profileNameDraft.trim().length < 2}>✓</button>
                      <button type="button" aria-label="Cancel name edit" disabled={profileNameSaving} onClick={() => { setProfileNameEditing(false); setProfileNameError(""); }}>×</button>
                    </form>
                  ) : (
                    <div className="profile-menu-name-line">
                      <strong>{currentUser?.name || "User"}</strong>
                      <button
                        type="button"
                        className="profile-name-edit-button"
                        aria-label="Edit account name"
                        title="Edit name"
                        onClick={() => { setProfileNameDraft(currentUser?.name || ""); setProfileNameError(""); setProfileNameEditing(true); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m15 5 4 4"/><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="M13.5 6.5l4 4"/>
                        </svg>
                      </button>
                    </div>
                  )}
                  <span>{currentUser?.email || "No email available"}</span>
                  {profileNameError && <small className="profile-name-error">{profileNameError}</small>}
                </div>
              </div>

              <div className="profile-menu-section">
                <button
                  type="button"
                  className="profile-workspace"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setShowOnboarding(true);
                  }}
                >
                  <span className="workspace-dot" />
                  <span className="profile-workspace-copy">
                    <strong>Workspace setup & join requests</strong>
                    <small>Create organizations, share join codes, review requests</small>
                  </span>
                </button>
              </div>

              <div className="profile-menu-section">
                <span className="profile-menu-label">WORKSPACES</span>
                {(currentUser?.memberships ?? []).map((membership) => (
                  <button
                    type="button"
                    className={`profile-workspace ${membership.organizationId === organizationId ? "current" : ""}`}
                    key={membership.id}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      if (membership.organizationId !== organizationId) {
                        localStorage.setItem("organizationId", membership.organizationId);
                        window.location.reload();
                        return;
                      }
                      setActiveView("dashboard");
                    }}
                  >
                    <span className="workspace-dot" />
                    <span className="profile-workspace-copy">
                      <strong>{membership.organization?.name || "Organization"}</strong>
                      <small>{membership.role}</small>
                    </span>
                    {membership.organizationId === organizationId && (
                      <span className="profile-check">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="profile-appearance">
                <span className="profile-appearance-label">Appearance</span>
                <button type="button" className="profile-action appearance-toggle" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
                  <span className="profile-action-icon">{theme === "dark" ? "☼" : "☾"}</span>
                  <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
                  <span className={`theme-switch ${theme}`} aria-hidden="true"><span /></span>
                </button>
              </div>

              <div className="profile-menu-footer">
                <button
                  type="button"
                  className="profile-action secondary"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <span className="profile-action-icon">⇄</span>
                  <span>Switch account</span>
                </button>
                <button
                  type="button"
                  className="profile-action danger"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <span className="profile-action-icon">↪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>,
            document.body,
          )}
        </div>
      </header>

      <main className="main">
        {activeView === "dashboard" ? (
          <>
            <section className="stats">
              <div className="stat-card organization-stat">
                <OrgImpactLogo compact showWordmark={false} className="organization-stat-logo" />
                <div className="organization-stat-copy">
                  <span>Organization</span>
                  <strong>OrgImpact Demo</strong>
                </div>
              </div>

              <div className="stat-card">
                <span>Entities</span>
                <strong>{graph?.stats.totalNodes ?? "-"}</strong>
              </div>

              <div className="stat-card">
                <span>Relationships</span>
                <strong>{graph?.stats.totalEdges ?? "-"}</strong>
              </div>

              <div className="stat-card">
                <span>Graph Status</span>
                <strong>
                  {loading
                    ? "Loading"
                    : error
                      ? "Offline"
                      : "Healthy"}
                </strong>
              </div>
            </section>

            <section className="workspace">
              <section className="graph-section">
                <div className="graph-header">
                  <div>
                    <h2>Dependency Graph</h2>
                    <p>
                      Click an entity to inspect its dependencies and
                      automatically analyze potential impact.
                    </p>
                  </div>

                  <div className="graph-legend">
                    <span>
                      <i className="legend-service" />
                      Service
                    </span>
                    <span>
                      <i className="legend-database" />
                      Database
                    </span>
                    <span>
                      <i className="legend-application" />
                      Application
                    </span>
                  </div>
                </div>

                <div
                  className="graph-container"
                  style={{
                    width: "100%",
                    height: "620px",
                    minHeight: "620px",
                  }}
                >
                  {loading && (
                    <div className="overlay">
                      <div className="loader" />
                      <p>Loading organization graph...</p>
                    </div>
                  )}

                  {!loading && error && (
                    <div className="overlay error">
                      <h3>Unable to load graph</h3>
                      <p>{error}</p>
                      <small>
                        Please login again if your authentication session has
                        expired.
                      </small>
                    </div>
                  )}

                  {!loading && !error && graph && (
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      fitView
                      fitViewOptions={{
                        padding: 0.25,
                        minZoom: 0.5,
                        maxZoom: 1.5,
                      }}
                      onInit={(instance) => {
                        setReactFlowInstance(instance);
                        requestAnimationFrame(() => {
                          instance.fitView({
                            padding: 0.25,
                            minZoom: 0.5,
                            maxZoom: 1.5,
                            duration: 0,
                          });
                        });
                      }}
                      onNodeClick={handleNodeClick}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background gap={24} size={1} />
                      <Controls />
                      <GraphMiniOverview nodes={nodes} edges={edges} />
                    </ReactFlow>
                  )}
                </div>
              </section>

              <aside className="impact-panel">
                <div className="panel-header">IMPACT ANALYSIS</div>

                {!selectedEntity && (
                  <div className="empty-panel">
                    <div className="empty-icon">↗</div>
                    <h3>Select an entity</h3>
                    <p>
                      Click a node in the dependency graph to inspect it and
                      automatically calculate its potential impact.
                    </p>
                  </div>
                )}

                {selectedEntity && (
                  <>
                    <div className="entity-summary">
                      <span className="entity-type">
                        {selectedEntity.entityType}
                      </span>
                      <h2>{selectedEntity.name}</h2>
                      <p>
                        {selectedEntity.description ||
                          "No description available."}
                      </p>
                    </div>

                    {impactLoading && (
                      <div className="impact-loading">
                        <div className="small-loader" />
                        <span>Analyzing dependency impact...</span>
                      </div>
                    )}

                    {impactError && (
                      <div className="impact-error">{impactError}</div>
                    )}

                    {impact && !impactLoading && (
                      <div className="impact-results">
                        <div className="impact-overview">
                          <div className="impact-metric">
                            <strong>{impact.totalAffected}</strong>
                            <span>Affected</span>
                          </div>
                          <div className="impact-metric">
                            <strong>
                              {
                                impact.affectedEntities.filter(
                                  (entity) => entity.depth === 1,
                                ).length
                              }
                            </strong>
                            <span>Direct</span>
                          </div>
                          <div className="impact-metric">
                            <strong>
                              {impact.affectedEntities.length > 0
                                ? Math.max(
                                    ...impact.affectedEntities.map(
                                      (entity) => entity.depth,
                                    ),
                                  )
                                : 0}
                            </strong>
                            <span>Max Depth</span>
                          </div>
                        </div>

                        <div className="affected-section">
                          <div className="section-title">
                            <span>Affected Systems</span>
                            <span>{impact.totalAffected}</span>
                          </div>

                          {impact.totalAffected === 0 && (
                            <div className="no-impact">
                              <strong>No impact detected</strong>
                              <p>No dependent entities were found.</p>
                            </div>
                          )}

                          {impact.affectedEntities.map((entity) => (
                            <button
                              className="affected-item"
                              key={entity.id}
                              onClick={() =>
                                handleAffectedEntityClick(entity.id)
                              }
                            >
                              <div className="affected-main">
                                <strong>{entity.name}</strong>
                                <span>{entity.entityType}</span>
                              </div>
                              <div className="depth-badge">
                                Depth {entity.depth}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </aside>
            </section>
          </>
        ) : activeView === "entities" ? (
          <section className="entities-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION</span>
                <div className="page-heading-title"><span className="page-section-logo"><NavIcon name="entities" /></span><h2>Entities</h2></div>
                <p className="page-header-description">
                  Manage the systems, services, databases and infrastructure
                  represented in your dependency graph.
                </p>
              </div>

              <div className="entity-page-actions">
                {canManageEntityTypes && (
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setEntityTypesError("");
                      setEntityTypesModalOpen(true);
                      void loadEntityTypes();
                    }}
                  >
                    Manage Types
                  </button>
                )}
                <button
                  className="primary-button"
                  onClick={openCreateEntity}
                >
                  + Add Entity
                </button>
              </div>
            </div>

            <div className="entity-toolbar">
              <div className="entity-count">
                <strong>{graph?.stats.totalNodes ?? 0}</strong>
                <span>entities</span>
              </div>

              <input
                className="entity-search"
                value={entitySearch}
                onChange={(event) =>
                  setEntitySearch(event.target.value)
                }
                placeholder="Search entities..."
              />
            </div>

            {entityError && !entityModalOpen && (
              <div className="entity-page-error">{entityError}</div>
            )}

            {loading ? (
              <div className="entity-empty-state">
                <div className="loader" />
                <p>Loading entities...</p>
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="entity-empty-state">
                <div className="empty-icon">+</div>
                <h3>
                  {entitySearch
                    ? "No entities found"
                    : "No entities yet"}
                </h3>
                <p>
                  {entitySearch
                    ? "Try a different search term."
                    : "Create your first entity to start building the dependency graph."}
                </p>
                {!entitySearch && (
                  <button
                    className="primary-button"
                    onClick={openCreateEntity}
                  >
                    Create Entity
                  </button>
                )}
              </div>
            ) : (
              <div className="entity-table-wrap">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th>Entity</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.map((entity) => (
                      <tr key={entity.id}>
                        <td>
                          <div className="entity-name-cell">
                            <div
                              className={`entity-type-icon entity-type-${entity.entityType
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                              style={{ backgroundColor: entityTypes.find((type) => type.name === entity.entityType)?.color }}
                            >
                              {entity.entityType
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <strong>{entity.name}</strong>
                              <small>{entity.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`type-pill type-${entity.entityType
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                            style={{
                              backgroundColor: entityTypes.find((type) => type.name === entity.entityType)?.color,
                              borderColor: entityTypes.find((type) => type.name === entity.entityType)?.color,
                              color: "#fff",
                            }}
                          >
                            {entity.entityType}
                          </span>
                        </td>
                        <td>
                          <span className="entity-description-cell">
                            {entity.description || "No description"}
                          </span>
                        </td>
                        <td>
                          <div className="entity-actions">
                            <button
                              className="table-button"
                              onClick={() => openEditEntity(entity)}
                            >
                              Edit
                            </button>
                            <button
                              className="table-button danger"
                              onClick={() => void deleteEntity(entity)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : activeView === "relationships" ? (
          <section className="relationships-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">DEPENDENCY GRAPH</span>
                <div className="page-heading-title"><span className="page-section-logo"><NavIcon name="relationships" /></span><h2>Relationships</h2></div>
                <p className="page-header-description">
                  Define how entities depend on, call, use, run on, or contain one another.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={openCreateRelationship}
                disabled={(graph?.nodes.length ?? 0) < 2}
              >
                + Add Relationship
              </button>
            </div>

            <div className="relationship-toolbar">
              <div className="entity-count">
                <strong>{graph?.stats.totalEdges ?? 0}</strong>
                <span>relationships</span>
              </div>
              <div className="relationship-hint">
                Changes are reflected in the dependency graph immediately.
              </div>
            </div>

            {relationshipError && !relationshipModalOpen && (
              <div className="entity-page-error">{relationshipError}</div>
            )}

            {(graph?.edges.length ?? 0) === 0 ? (
              <div className="entity-empty-state">
                <div className="empty-icon">↔</div>
                <h3>No relationships yet</h3>
                <p>
                  Connect two entities to start building your dependency graph.
                </p>
                <button
                  className="primary-button"
                  onClick={openCreateRelationship}
                  disabled={(graph?.nodes.length ?? 0) < 2}
                >
                  Create Relationship
                </button>
              </div>
            ) : (
              <div className="relationship-list">
                {(graph?.edges ?? []).map((relationship) => {
                  const source = graph?.nodes.find(
                    (node) => node.id === relationship.source,
                  );
                  const target = graph?.nodes.find(
                    (node) => node.id === relationship.target,
                  );

                  return (
                    <div className="relationship-row" key={relationship.id}>
                      <div className="relationship-entity source">
                        <span className={`relationship-type-icon ${source?.entityType.toLowerCase() ?? ""}`}>
                          {source?.entityType.slice(0, 2).toUpperCase() ?? "?"}
                        </span>
                        <div>
                          <strong>{source?.name ?? "Unknown entity"}</strong>
                          <small>{source?.entityType ?? "UNKNOWN"}</small>
                        </div>
                      </div>

                      <div className="relationship-middle">
                        <span>{relationship.relationshipType}</span>
                        <div className="relationship-arrow">→</div>
                      </div>

                      <div className="relationship-entity target">
                        <span className={`relationship-type-icon ${target?.entityType.toLowerCase() ?? ""}`}>
                          {target?.entityType.slice(0, 2).toUpperCase() ?? "?"}
                        </span>
                        <div>
                          <strong>{target?.name ?? "Unknown entity"}</strong>
                          <small>{target?.entityType ?? "UNKNOWN"}</small>
                        </div>
                      </div>

                      <button
                        className="table-button danger"
                        onClick={() => void deleteRelationship(relationship.id)}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : activeView === "incidents" ? (
          <section className="incidents-page">
            <div className="page-header">
              <div><span className="page-eyebrow">OPERATIONS</span><div className="page-heading-title"><span className="page-section-logo"><NavIcon name="incidents" /></span><h2>Incidents</h2></div><p className="page-header-description">Track failures and understand their dependency blast radius.</p></div>
              <button className="primary-button" onClick={openCreateIncident} disabled={!graph?.nodes.length}>+ Create Incident</button>
            </div>
            {incidentError && !incidentModalOpen && <div className="page-error">{incidentError}</div>}
            <div className="incident-layout">
              <section className="incidents-list-panel">
                <div className="section-heading-row"><div><span className="page-eyebrow">INCIDENTS</span><h3>{incidents.length} Incidents</h3></div>{incidentsLoading && <span className="loading-text">Loading...</span>}</div>
                {incidentsLoading ? <div className="team-loading"><div className="small-loader" /> Loading incidents...</div> : incidents.length === 0 ? <div className="empty-management"><div className="empty-management-icon">!</div><h3>No incidents yet</h3><p>Create an incident to see its blast radius.</p><button className="primary-button" onClick={openCreateIncident} disabled={!graph?.nodes.length}>Create Incident</button></div> : <div className="incident-card-list">{incidents.map((incident) => <button key={incident.id} className={`incident-card ${selectedIncident?.id === incident.id ? "active" : ""}`} onClick={() => selectIncident(incident)}><div className="incident-card-top"><span className={`incident-severity ${incident.severity.toLowerCase()}`}>{incident.severity}</span><span className={`incident-status ${incident.status.toLowerCase()}`}>{incident.status}</span></div><strong>{incident.title}</strong><span className="incident-affected">Affects: {incident.affectedEntity?.name ?? "Unknown entity"}</span><small>{new Date(incident.createdAt).toLocaleString()}</small></button>)}</div>}
              </section>
              <section className="incident-detail-panel">
                {!selectedIncident ? <div className="empty-management detail-empty"><div className="empty-management-icon">!</div><h3>Select an incident</h3><p>Choose an incident to calculate its dependency blast radius.</p></div> : <>
                  <div className="incident-detail-header"><div><span className="page-eyebrow">INCIDENT</span><h2>{selectedIncident.title}</h2><p>{selectedIncident.description || "No incident description provided."}</p></div><div className="incident-detail-actions"><button className="secondary-button" onClick={() => openEditIncident(selectedIncident)}>Edit</button><button className="table-button danger" onClick={() => void deleteIncident(selectedIncident)}>Delete</button></div></div>
                  <div className="incident-meta-grid"><div className="incident-meta-card"><span>Severity</span><strong className={`incident-severity ${selectedIncident.severity.toLowerCase()}`}>{selectedIncident.severity}</strong></div><div className="incident-meta-card"><span>Status</span><IncidentStatusDropdown
                        value={selectedIncident.status}
                        onChange={(status) =>
                          void updateIncidentStatus(selectedIncident, status)
                        }
                      /></div><div className="incident-meta-card"><span>Affected Entity</span><strong>{selectedIncident.affectedEntity?.name ?? "Unknown entity"}</strong></div><div className="incident-meta-card"><span>Created</span><strong>{new Date(selectedIncident.createdAt).toLocaleDateString()}</strong></div></div>
                  <div className="incident-blast-radius"><div className="section-heading-row"><div><span className="page-eyebrow">BLAST RADIUS</span><h3>Potentially Affected Systems</h3></div>{impact && <strong>{impact.totalAffected} affected</strong>}</div>{impactLoading ? <div className="team-loading"><div className="small-loader" /> Calculating dependency blast radius...</div> : impactError ? <div className="page-error">{impactError}</div> : impact ? <><div className="impact-overview"><div className="impact-metric"><strong>{impact.totalAffected}</strong><span>Affected</span></div><div className="impact-metric"><strong>{impact.affectedEntities.filter((e) => e.depth === 1).length}</strong><span>Direct</span></div><div className="impact-metric"><strong>{impact.affectedEntities.length ? Math.max(...impact.affectedEntities.map((e) => e.depth)) : 0}</strong><span>Max Depth</span></div></div><div className="affected-section">{impact.totalAffected === 0 ? <div className="no-impact"><strong>No downstream impact detected</strong><p>No dependent entities were found.</p></div> : impact.affectedEntities.map((entity) => <button className="affected-item" key={entity.id} onClick={() => handleAffectedEntityClick(entity.id)}><div className="affected-main"><strong>{entity.name}</strong><span>{entity.entityType}</span></div><div className="depth-badge">Depth {entity.depth}</div></button>)}</div></> : <div className="empty-management"><p>Select the incident to calculate impact.</p></div>}</div>
                </>}
              </section>
            </div>
          </section>
        ) : activeView === "simulation" ? (
          <section className="simulation-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">WHAT-IF ANALYSIS</span>
                <div className="page-heading-title"><span className="page-section-logo"><NavIcon name="simulation" /></span><h2>Change Simulation</h2></div>
                <p className="page-header-description">
                  Select a system to automatically simulate a change or outage and see
                  which downstream systems could be affected.
                </p>
              </div>
            </div>

            <div className="simulation-layout">
              <section className="simulation-control-panel">
                <div className="section-heading-row">
                  <div>
                    <span className="page-eyebrow">SIMULATION INPUT</span>
                    <h3>Choose a system</h3>
                  </div>
                </div>

                <div className="simulation-entity-picker">
                  <div className="simulation-picker-header">
                    <span>Choose a system</span>
                    <div className="simulation-picker-actions">
                      {simulationOverviewLoading && (
                        <span className="simulation-overview-loading">
                          Calculating risk...
                        </span>
                      )}

                      <div className="simulation-filter-dropdown" ref={simulationFilterRef}>
                        <button
                          type="button"
                          className={`simulation-filter-trigger ${simulationFilterOpen ? "open" : ""}`}
                          onClick={() => setSimulationFilterOpen((open) => !open)}
                          aria-haspopup="listbox"
                          aria-expanded={simulationFilterOpen}
                        >
                          <span className={`filter-dot ${simulationRiskFilter.toLowerCase()}`} />
                          <span>
                            {simulationRiskFilter === "ALL"
                              ? "All Risk Levels"
                              : simulationRiskFilter.charAt(0) + simulationRiskFilter.slice(1).toLowerCase()}
                          </span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>

                        {simulationFilterOpen && (
                          <div className="simulation-filter-menu" role="listbox">
                            {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => (
                              <button
                                key={level}
                                type="button"
                                role="option"
                                aria-selected={simulationRiskFilter === level}
                                className={`simulation-filter-option ${simulationRiskFilter === level ? "selected" : ""}`}
                                onClick={() => {
                                  setSimulationRiskFilter(level as typeof simulationRiskFilter);
                                  setSimulationFilterOpen(false);
                                }}
                              >
                                <span className={`filter-dot ${level.toLowerCase()}`} />
                                <span>{level === "ALL" ? "All Risk Levels" : level.charAt(0) + level.slice(1).toLowerCase()}</span>
                                {simulationRiskFilter === level && <span className="filter-check">✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {filteredSimulationEntities.length === 0 ? (
                    <div className="simulation-empty-filter">
                      <strong>No entities found</strong>
                      <p>
                        There are no entities with {simulationRiskFilter.toLowerCase()}
                        risk level.
                      </p>
                    </div>
                  ) : (
                    <div className="simulation-entity-grid">
                      {filteredSimulationEntities.map((entity) => {
                      const risk = simulationRiskMap[entity.id];
                      const isSelected = simulationEntityId === entity.id;

                      return (
                        <button
                          key={entity.id}
                          type="button"
                          className={`simulation-entity-card ${
                            isSelected ? "selected" : ""
                          } ${risk ? risk.level.toLowerCase() : "unknown"}`}
                          onClick={() => selectSimulationEntity(entity.id)}
                        >
                          <div className="simulation-entity-card-top">
                            <span className="simulation-entity-icon">
                              {entity.entityType.slice(0, 2)}
                            </span>

                            {risk ? (
                              <span
                                className={`simulation-risk-dot ${risk.level.toLowerCase()}`}
                                title={`${risk.level} risk — ${risk.score}/100`}
                              />
                            ) : (
                              <span className="simulation-risk-dot loading" />
                            )}
                          </div>

                          <strong>{entity.name}</strong>
                          <span className="simulation-entity-type">
                            {entity.entityType}
                          </span>

                          <div className="simulation-entity-risk">
                            {risk ? (
                              <>
                                <span>{risk.level}</span>
                                <small>{risk.score}/100</small>
                              </>
                            ) : (
                              <span>Calculating...</span>
                            )}
                          </div>
                        </button>
                      );
                      })}
                    </div>
                  )}
                </div>

                {simulationError && (
                  <div className="form-error">{simulationError}</div>
                )}

                {simulationLoading && (
                  <div className="simulation-loading">
                    Analyzing dependency impact...
                  </div>
                )}
              </section>

              <section className="simulation-result-panel">
                {!simulationResult ? (
                  <div className="empty-management detail-empty">
                    <div className="empty-management-icon">↗</div>
                    <h3>No simulation yet</h3>
                    <p>
                      Select an entity to automatically calculate its potential blast radius
                      and risk level.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="simulation-result-header">
                      <div>
                        <span className="page-eyebrow">SIMULATION RESULT</span>
                        <h2>{simulationResult.rootEntity.name}</h2>
                        <p>Hypothetical change / outage impact analysis</p>
                      </div>

                      <div
                        className={`risk-badge ${simulationResult.riskLevel.toLowerCase()}`}
                      >
                        {simulationResult.riskLevel}
                      </div>
                    </div>

                    <div className="simulation-metrics">
                      <div className="simulation-metric">
                        <span>Risk Score</span>
                        <strong>
                          {simulationResult.riskScore}
                          <small>/100</small>
                        </strong>
                      </div>

                      <div className="simulation-metric">
                        <span>Affected Systems</span>
                        <strong>{simulationResult.totalAffected}</strong>
                      </div>

                      <div className="simulation-metric">
                        <span>Direct Impact</span>
                        <strong>
                          {
                            simulationResult.affectedEntities.filter(
                              (entity) => entity.depth === 1,
                            ).length
                          }
                        </strong>
                      </div>

                      <div className="simulation-metric">
                        <span>Max Depth</span>
                        <strong>
                          {simulationResult.affectedEntities.length > 0
                            ? Math.max(
                                ...simulationResult.affectedEntities.map(
                                  (entity) => entity.depth,
                                ),
                              )
                            : 0}
                        </strong>
                      </div>
                    </div>

                    <div className="simulation-impact-section">
                      <div className="section-heading-row">
                        <div>
                          <span className="page-eyebrow">BLAST RADIUS</span>
                          <h3>Potentially Affected Systems</h3>
                        </div>
                      </div>

                      {simulationResult.totalAffected === 0 ? (
                        <div className="no-impact">
                          <strong>No downstream impact detected</strong>
                          <p>No dependent entities were found for this change.</p>
                        </div>
                      ) : (
                        <div className="simulation-impact-list">
                          {simulationResult.affectedEntities.map((entity) => (
                            <button
                              className="affected-item"
                              key={entity.id}
                              onClick={() =>
                                handleAffectedEntityClick(entity.id)
                              }
                            >
                              <div className="affected-main">
                                <strong>{entity.name}</strong>
                                <span>{entity.entityType}</span>
                              </div>
                              <div className="depth-badge">
                                Depth {entity.depth}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </>
                )}
              </section>
            </div>
          </section>
        ) : activeView === "chat" ? (
          <section className="chat-page">
            <div className="page-header chat-page-header">
              <div>
                <span className="page-eyebrow">ORGIMPACT MESSAGING</span>
                <div className="page-heading-title"><span className="page-section-logo"><NavIcon name="chat" /></span><h2>Chat</h2></div>
                <p className="page-header-description">Talk with organization members and teams in real time.</p>
              </div>
              <span className={`chat-connection-status ${chatConnected ? "connected" : "disconnected"}`}><i />{chatConnected ? "Connected" : "Disconnected"}</span>
            </div>
            {chatError && <div className="page-error chat-page-error">{chatError}</div>}
            <div className={`chat-layout ${chatMobileOpen ? "mobile-chat-open" : ""}`}>
              <aside className="chat-sidebar">
                <label className="chat-search"><span aria-hidden="true">⌕</span><input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search people and conversations" aria-label="Search people and conversations" /></label>
                <section className="chat-sidebar-section">
                  <div className="chat-sidebar-heading"><h3>Conversations</h3>{chatConversationsLoading && <span className="chat-small-loader" />}</div>
                  {chatVisibleConversations.length === 0 && !chatConversationsLoading ? <p className="chat-sidebar-empty">No conversations yet. Start one below.</p> : chatVisibleConversations.map((conversation) => {
                    const peer = conversation.members.find((member) => member.id !== currentUser?.id);
                    const label = conversation.type === "TEAM" ? conversation.team?.name ?? "Team channel" : conversation.title ?? peer?.name ?? "Direct message";
                    return (
                      <button type="button" key={conversation.id} className={`chat-conversation-item ${selectedChatConversation?.id === conversation.id ? "active" : ""}`} onClick={() => void openChatConversation(conversation)}>
                        <span className={`chat-avatar ${conversation.type === "TEAM" ? "team" : ""}`}>{label.slice(0, 1).toUpperCase()}</span>
                        <span className="chat-conversation-copy"><strong>{label}</strong><small>{conversation.lastMessage ? `${conversation.lastMessage.sender.name}: ${conversation.lastMessage.content}` : conversation.type === "TEAM" ? "Team channel" : "Start the conversation"}</small></span>
                        {conversation.unreadCount > 0 && <span className="chat-unread-count">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span>}
                      </button>
                    );
                  })}
                </section>
                {chatVisibleTeams.length > 0 && (
                  <section className="chat-sidebar-section">
                    <div className="chat-sidebar-heading"><h3>Team channels</h3></div>
                    {chatVisibleTeams.filter((team) => `${team.name} ${team.slug}`.toLowerCase().includes(chatSearch.trim().toLowerCase())).map((team) => {
                      const existing = chatConversations.find((conversation) => conversation.teamId === team.id);
                      return <button type="button" key={team.id} className={`chat-conversation-item ${selectedChatConversation?.id === existing?.id ? "active" : ""}`} onClick={() => existing ? void openChatConversation(existing) : void openTeamChat(team)}><span className="chat-avatar team">#</span><span className="chat-conversation-copy"><strong>{team.name}</strong><small>{existing?.lastMessage?.content ?? "Open team channel"}</small></span></button>;
                    })}
                  </section>
                )}
                <section className="chat-sidebar-section chat-people-section">
                  <div className="chat-sidebar-heading"><h3>Organization members</h3>{membersLoading && <span className="chat-small-loader" />}</div>
                  {chatVisibleMembers.length === 0 && !membersLoading ? <p className="chat-sidebar-empty">No matching members.</p> : chatVisibleMembers.map((member) => {
                    const user = member.user!;
                  return <button type="button" key={member.userId} className="chat-person-item" onClick={() => void startDirectChat({ id: member.userId, name: user.name, email: user.email })}><span className="chat-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="chat-conversation-copy"><strong>{user.name}</strong><small>{user.email}</small></span></button>;
                  })}
                </section>
              </aside>

              <section className="chat-window">
                {!selectedChatConversation ? (
                  <div className="chat-empty-state"><span className="chat-empty-icon"><NavIcon name="chat" /></span><h3>Your conversations</h3><p>Select a conversation or choose an organization member to send a direct message.</p></div>
                ) : (() => {
                  const peer = selectedChatConversation.members.find((member) => member.id !== currentUser?.id);
                  const conversationName = selectedChatConversation.type === "TEAM" ? selectedChatConversation.team?.name ?? "Team channel" : selectedChatConversation.title ?? peer?.name ?? "Direct message";
                  const latestOwnMessageId = [...chatMessages].reverse().find((message) => message.senderId === currentUser?.id)?.id;
                  const lastReadAt = chatReadAtByConversation[selectedChatConversation.id];
                  return (
                    <>
                      <header className="chat-conversation-header">
                        <button type="button" className="chat-back-button" onClick={() => setChatMobileOpen(false)} aria-label="Back to conversations">←</button>
                        <span className={`chat-avatar ${selectedChatConversation.type === "TEAM" ? "team" : ""}`}>{conversationName.slice(0, 1).toUpperCase()}</span>
                        <div><strong>{conversationName}</strong><small>{selectedChatConversation.type === "TEAM" ? `${selectedChatConversation.members.length} team members` : peer?.email ?? "Direct conversation"}</small></div>
                      </header>
                      <div className="chat-message-history">
                        {chatHasOlder && <button type="button" className="chat-load-older" disabled={chatLoading} onClick={() => chatMessages[0] && void loadChatMessages(selectedChatConversation.id, chatMessages[0].id)}>{chatLoading ? "Loading…" : "Load older messages"}</button>}
                        {chatLoading && chatMessages.length === 0 && <div className="chat-history-empty">Loading messages…</div>}
                        {!chatLoading && chatMessages.length === 0 && <div className="chat-history-empty">No messages yet. Say hello to start the conversation.</div>}
                        {chatMessages.map((message) => {
                          const own = message.senderId === currentUser?.id;
                          const wasRead = own && message.id === latestOwnMessageId && lastReadAt && new Date(lastReadAt) >= new Date(message.createdAt);
                          return <div className={`chat-message-row ${own ? "own" : ""}`} key={message.id}><span className="chat-message-avatar">{message.sender.name.slice(0, 1).toUpperCase()}</span><div className="chat-message-content"><div className="chat-message-meta"><strong>{own ? "You" : message.sender.name}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div><p>{message.content}</p>{wasRead && <small className="chat-seen-label">Seen</small>}</div></div>;
                        })}
                        {chatTypingUser && <div className="chat-typing-indicator">{chatTypingUser} is typing<span>•••</span></div>}
                        <div ref={chatBottomRef} />
                      </div>
                      <form className="chat-composer" onSubmit={(event) => void sendChatMessage(event)}>
                        <textarea value={chatMessageText} onChange={(event) => { setChatMessageText(event.target.value); if (socket.connected) socket.emit("chat:typing", selectedChatConversation.id); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={chatConnected ? "Write a message…" : "Reconnect to send a message"} maxLength={4000} disabled={!chatConnected} aria-label="Write a message" />
                        <div className="chat-composer-footer"><span>{chatMessageText.length}/4000 · Enter to send</span><button type="submit" className="primary-button" disabled={!chatMessageText.trim() || chatSending || !chatConnected}>{chatSending ? "Sending…" : "Send"}<span aria-hidden="true">↗</span></button></div>
                      </form>
                    </>
                  );
                })()}
              </section>
            </div>
          </section>
        ) : activeView === "members" ? (
          <section className="members-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION ACCESS</span>
                <div className="page-heading-title"><span className="page-section-logo"><NavIcon name="members" /></span><h2>Members &amp; Roles</h2></div>
                <p className="page-header-description">Manage organization membership and assign OWNER, ADMIN, or MEMBER roles.</p>
              </div>

              {(currentUser && organizationMembers.find((member) => member.userId === currentUser.id)?.role === "OWNER") && (
                <button className="primary-button" onClick={openAddOrganizationMember}>
                  + Add Member
                </button>
              )}
            </div>

            {membersError && !membershipModalOpen && (
              <div className="page-error">{membersError}</div>
            )}

            <div className="members-overview">
              <div className="member-stat-card">
                <span>Total Members</span>
                <strong>{organizationMembers.length}</strong>
              </div>
              <div className="member-stat-card">
                <span>Owners</span>
                <strong>{organizationMembers.filter((member) => member.role === "OWNER").length}</strong>
              </div>
              <div className="member-stat-card">
                <span>Admins</span>
                <strong>{organizationMembers.filter((member) => member.role === "ADMIN").length}</strong>
              </div>
              <div className="member-stat-card">
                <span>Members</span>
                <strong>{organizationMembers.filter((member) => member.role === "MEMBER").length}</strong>
              </div>
            </div>

            <section className="members-panel">
              <div className="section-heading-row">
                <div>
                  <span className="page-eyebrow">ACCESS CONTROL</span>
                  <h3>Organization Members</h3>
                </div>
                {membersLoading && <span className="loading-text">Loading...</span>}
              </div>

              {membersLoading ? (
                <div className="team-loading"><div className="small-loader" /> Loading members...</div>
              ) : organizationMembers.length === 0 ? (
                <div className="empty-management">
                  <div className="empty-management-icon">M</div>
                  <h3>No members found</h3>
                  <p>No users are currently assigned to this organization.</p>
                </div>
              ) : (
                <div className="organization-member-list">
                  {[...organizationMembers].sort((left, right) => organizationMemberPriority(left) - organizationMemberPriority(right)).map((member) => {
                    const displayRole = member.organization?.createdById === member.userId ? "CREATOR" : member.role;
                    return (
                    <div className="organization-member-row" key={member.id}>
                      <div className="organization-member-identity">
                        <div className="member-avatar">
                          {(member.user?.name ?? "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="member-main">
                          <strong>
                            {member.user?.name ?? `User ${member.userId.slice(0, 8)}`}
                            {currentUser?.id === member.userId && <span className="you-badge">YOU</span>}
                          </strong>
                          <span>{member.user?.email ?? "No email available"}</span>
                        </div>
                        <div className="organization-member-role-stack">
                          <span className={`organization-role-badge ${displayRole.toLowerCase()}`}>{displayRole}</span>
                          <span className="member-since">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                      <div className="member-row-actions">
                      {canEditOrganizationMember(member) && (
                        <>
                          <button type="button" className="table-button" onClick={() => openEditOrganizationMember(member)}>Edit role</button>
                          <button type="button" className="table-button danger" onClick={() => void removeOrganizationMember(member)}>Remove</button>
                        </>
                      )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

          </section>
        ) : (
          <section className="teams-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION OPERATIONS</span>
                <div className="page-heading-title"><span className="page-section-logo"><NavIcon name="teams" /></span><h2>Teams</h2></div>
                <p className="page-header-description">Understand team membership, leadership, and operational coverage across your organization.</p>
              </div>

              {canCreateTeams && (
                <button className="primary-button" onClick={openCreateTeam}>
                  + Create Team
                </button>
              )}
            </div>

            {teamError && !teamModalOpen && !memberModalOpen && (
              <div className="page-error">{teamError}</div>
            )}

            <div className="teams-overview" aria-label="Team summary">
              <div className="team-overview-stat"><span>Total teams</span><strong>{teamsLoading ? "—" : teams.length}</strong></div>
              <div className="team-overview-stat"><span>Assigned memberships</span><strong>{teamsLoading ? "—" : teams.reduce((total, team) => total + (team.members?.length ?? 0), 0)}</strong></div>
              <div className="team-overview-stat"><span>Teams with a lead</span><strong>{teamsLoading ? "—" : teams.filter((team) => team.members?.some((member) => member.role === "LEAD")).length}</strong></div>
              <div className="team-overview-stat"><span>Unassigned organization members</span><strong>{membersLoading ? "—" : unassignedOrganizationMembers.length}</strong></div>
            </div>

            <div className="teams-layout">
              <section className="teams-list-panel">
                <div className="section-heading-row">
                  <div>
                    <span className="page-eyebrow">TEAM DIRECTORY</span>
                    <h3>{teams.length} {teams.length === 1 ? "team" : "teams"}</h3>
                  </div>
                  {teamsLoading && <span className="loading-text">Loading...</span>}
                </div>

                <p className="team-filter-note">Entity ownership and dependency risk are not tracked for teams yet.</p>

                {!teamsLoading && teams.length === 0 ? (
                  <div className="empty-management">
                    <div className="empty-management-icon">T</div>
                    <h3>No teams yet</h3>
                    <p>Teams will appear here once they are created in this organization.</p>
                    {canCreateTeams && <button className="primary-button" onClick={openCreateTeam}>Create Team</button>}
                  </div>
                ) : (
                  <div className="team-card-list">
                    {teams.map((team) => {
                      const lead = team.members?.find((member) => member.role === "LEAD");
                      const teamMemberCount = team.members?.length ?? 0;
                      return (
                        <button
                          key={team.id}
                          className={`team-card ${selectedTeam?.id === team.id ? "active" : ""}`}
                          onClick={() => selectTeam(team)}
                          aria-pressed={selectedTeam?.id === team.id}
                        >
                          <div className="team-avatar">{team.name.slice(0, 1).toUpperCase()}</div>
                          <div className="team-card-main">
                            <strong>{team.name}</strong>
                            <span>/{team.slug}</span>
                            <small>{lead ? `Lead: ${lead.user?.name ?? "Organization member"}` : "No lead assigned"}</small>
                          </div>
                          <div className="team-card-meta">
                            <div className="team-member-avatars" aria-label={`${teamMemberCount} team members`}>
                              {(team.members ?? []).slice(0, 4).map((member) => <span key={member.id} title={member.user?.name ?? "Member"}>{(member.user?.name ?? "U").slice(0, 1).toUpperCase()}</span>)}
                              {teamMemberCount > 4 && <span className="team-avatar-overflow">+{teamMemberCount - 4}</span>}
                            </div>
                            <span className="team-member-count">{teamMemberCount} {teamMemberCount === 1 ? "member" : "members"}</span>
                          </div>
                          <div className="team-card-arrow" aria-hidden="true">→</div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!teamsLoading && unassignedOrganizationMembers.length > 0 && (
                  <section className="unassigned-members-section">
                    <div className="unassigned-heading"><div><span className="page-eyebrow">ORGANIZATION COVERAGE</span><h4>Not assigned to a team</h4></div><strong>{unassignedOrganizationMembers.length}</strong></div>
                    <div className="unassigned-member-list">
                      {unassignedOrganizationMembers.slice(0, 6).map((member) => (
                        <div className="unassigned-member" key={member.id}>
                          <span className="unassigned-avatar">{(member.user?.name ?? "U").slice(0, 1).toUpperCase()}</span>
                          <span><strong>{member.user?.name ?? "Organization member"}</strong><small>{member.user?.email ?? member.role}</small></span>
                        </div>
                      ))}
                      {unassignedOrganizationMembers.length > 6 && <p className="unassigned-overflow">and {unassignedOrganizationMembers.length - 6} more</p>}
                    </div>
                  </section>
                )}
              </section>

              <section className="team-detail-panel">
                {!selectedTeam ? (
                  <div className="empty-management detail-empty">
                    <div className="empty-management-icon">T</div>
                    <h3>Select a team</h3>
                    <p>Choose a team to inspect its members and manage membership.</p>
                  </div>
                ) : (
                  <>
                    <div className="team-detail-header">
                      <div>
                        <span className="page-eyebrow">TEAM</span>
                        <h2>{selectedTeam.name}</h2>
                        <p>/{selectedTeam.slug} · Created {selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString() : "date unavailable"}</p>
                      </div>
                      <div className="team-detail-actions">
                        {canManageTeams && <><button className="secondary-button" onClick={() => openEditTeam(selectedTeam)}>Edit team</button><button className="table-button danger" onClick={() => removeTeam(selectedTeam)}>Delete</button></>}
                        {canAddTeamMembers && <button className="primary-button" onClick={openAddMember}>+ Add Member</button>}
                      </div>
                    </div>

                    <div className="team-overview-details">
                      <div><span>Team lead</span><strong>{teamMembers.find((member) => member.role === "LEAD")?.user?.name ?? "No lead assigned"}</strong></div>
                      <div><span>Members</span><strong>{teamMembers.length}</strong></div>
                      <div><span>Your organization role</span><strong>{currentOrganizationRole || "Member"}</strong></div>
                    </div>

                    <div className="team-members-section-heading"><div><span className="page-eyebrow">TEAM ROSTER</span><h3>Members</h3></div><span>{teamMembers.length} total</span></div>

                    {teamMembersLoading ? (
                      <div className="team-loading"><div className="small-loader" /> Loading members...</div>
                    ) : teamMembers.length === 0 ? (
                      <div className="empty-management">
                        <h3>No members yet</h3>
                        <p>Add a user to this team to get started.</p>
                        {canAddTeamMembers && <button className="primary-button" onClick={openAddMember}>Add Member</button>}
                      </div>
                    ) : (
                      <div className="team-members-list">
                        {[...teamMembers].sort((left, right) => teamMemberPriority(left) - teamMemberPriority(right)).map((member) => {
                          const organizationMember = organizationMembers.find((item) => item.userId === member.userId);
                          const displayRole = organizationMember?.organization?.createdById === member.userId
                            ? "CREATOR"
                            : organizationMember?.role === "OWNER"
                              ? "OWNER"
                              : organizationMember?.role === "ADMIN"
                                ? "ADMIN"
                                : member.role === "LEAD"
                                  ? "LEAD"
                                  : "MEMBER";
                          return (
                          <div className="team-member-row" key={member.id}>
                            <div className="team-member-identity">
                              <div className="member-avatar">{(member.user?.name ?? "U").slice(0, 1).toUpperCase()}</div>
                              <div className="member-main">
                                <strong>{member.user?.name ?? `User ${member.userId.slice(0, 8)}`}</strong>
                                <span>{member.user?.email ?? "Member"}</span>
                              </div>
                              <div className="team-member-role-stack">
                                <div className="team-role-badges">
                                  <span className={`role-badge ${displayRole.toLowerCase()}`}>{displayRole}</span>
                                </div>
                              </div>
                            </div>
                            {canEditTeamMember(member) && (
                              <div className="member-row-actions">
                                <button type="button" className="table-button" onClick={() => openEditTeamMember(member)}>Edit role</button>
                                <button type="button" className="table-button danger" onClick={() => void removeTeamMember(member)}>Remove</button>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </section>
        )}
      </main>

      {entityModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeEntityModal}>
          <div
            className="entity-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">
                  {editingEntity ? "EDIT ENTITY" : "NEW ENTITY"}
                </span>
                <h2>
                  {editingEntity ? "Edit Entity" : "Create Entity"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closeEntityModal}
                disabled={entitySaving}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label className="form-field">
                <span>Name</span>
                <input
                  value={entityForm.name}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Payment API"
                  autoFocus
                />
              </label>

              <label className="form-field">
                <span>Entity Type</span>
                <select
                  value={entityForm.entityTypeId}
                  disabled={entityTypesLoading || entitySaving}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      entityTypeId: event.target.value,
                    }))
                  }
                >
                  <option value="">
                    {entityTypesLoading
                      ? "Loading types..."
                      : "Select a type"}
                  </option>
                  {entityTypes.map((type) => (
                      <option key={type.id} value={type.id} style={{ color: type.color }}>
                      {type.name}
                    </option>
                  ))}
                </select>
                  {entityForm.entityTypeId && entityTypes.find((type) => type.id === entityForm.entityTypeId) && (
                    <span className="entity-type-selection-preview">
                      <i style={{ backgroundColor: entityTypes.find((type) => type.id === entityForm.entityTypeId)?.color }} />
                      {entityTypes.find((type) => type.id === entityForm.entityTypeId)?.name}
                      <code>{entityTypes.find((type) => type.id === entityForm.entityTypeId)?.color}</code>
                    </span>
                  )}
              </label>

              <label className="form-field">
                <span>Description</span>
                <textarea
                  value={entityForm.description}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe what this entity does..."
                  rows={4}
                />
              </label>

              <label className="form-field">
                <span>Criticality</span>

                <select
                  value={entityForm.criticality}
                  disabled={entitySaving}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      criticality: event.target.value as EntityForm["criticality"],
                    }))
                  }
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>

                <small>
                  Defines how important this entity is to the organization.
                </small>
              </label>

              {entityError && (
                <div className="form-error">{entityError}</div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={closeEntityModal}
                disabled={entitySaving}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => void saveEntity()}
                disabled={entitySaving || entityTypesLoading}
              >
                {entitySaving
                  ? "Saving..."
                  : editingEntity
                    ? "Save Changes"
                    : "Create Entity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {entityTypesModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeEntityTypesModal}>
          <div
            className="entity-modal entity-type-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entity-types-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION SETTINGS</span>
                <h2 id="entity-types-title">Manage Entity Types</h2>
                <p className="entity-type-modal-description">Types are only available to members of this organization.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close entity type management"
                onClick={closeEntityTypesModal}
                disabled={entityTypeSaving}
              >
                ×
              </button>
            </div>

            <div className="entity-type-manager">
              <section className="entity-type-list-section" aria-label="Organization entity types">
                <div className="entity-type-list-heading">
                  <strong>Organization types</strong>
                  <button type="button" className="table-button" onClick={startCreateEntityType}>+ New type</button>
                </div>
                {entityTypesLoading ? (
                  <div className="entity-type-state"><div className="small-loader" /> Loading organization types...</div>
                ) : entityTypesError && entityTypes.length === 0 ? (
                  <div className="entity-type-state entity-type-state-error" role="alert">{entityTypesError}</div>
                ) : entityTypes.length === 0 ? (
                  <div className="entity-type-state">
                    <strong>No types yet</strong>
                    <span>Create a type to categorize this organization’s entities.</span>
                  </div>
                ) : (
                  <div className="entity-type-list">
                    {entityTypes.map((type) => (
                      <div className="entity-type-row" key={type.id}>
                        <span className="entity-type-swatch" style={{ backgroundColor: type.color }} />
                        <span className="entity-type-row-name">{type.name}</span>
                        <code>{type.color}</code>
                        <button type="button" className="table-button" aria-label={`Edit ${type.name}`} onClick={() => startEditEntityType(type)}>Edit</button>
                        <button type="button" className="table-button danger" aria-label={`Delete ${type.name}`} onClick={() => confirmDeleteEntityType(type)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="entity-type-editor" aria-label={editingEntityType ? "Edit entity type" : "Create entity type"}>
                <h3>{editingEntityType ? "Edit type" : "Create a type"}</h3>
                <label className="form-field">
                  <span>Type name</span>
                  <input
                    value={entityTypeForm.name}
                    maxLength={60}
                    onChange={(event) => setEntityTypeForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Data Pipeline"
                    disabled={entityTypeSaving}
                  />
                </label>
                <label className="form-field">
                  <span>Type color</span>
                  <div className="entity-type-color-input">
                    <input
                      type="color"
                      aria-label="Choose entity type color"
                      value={entityTypeForm.color}
                      onChange={(event) => setEntityTypeForm((current) => ({ ...current, color: event.target.value.toUpperCase() }))}
                      disabled={entityTypeSaving}
                    />
                    <code>{entityTypeForm.color.toUpperCase()}</code>
                  </div>
                </label>
                <div className="entity-type-presets" aria-label="Suggested colors">
                  {entityTypeColorPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      className={`entity-type-preset ${entityTypeForm.color.toUpperCase() === preset.color ? "selected" : ""}`}
                      style={{ backgroundColor: preset.color }}
                      aria-label={`${preset.name} color ${preset.color}`}
                      title={`${preset.name} ${preset.color}`}
                      onClick={() => setEntityTypeForm((current) => ({ ...current, color: preset.color }))}
                      disabled={entityTypeSaving}
                    />
                  ))}
                </div>
                <div className="entity-type-preview">
                  <span className="entity-type-swatch" style={{ backgroundColor: entityTypeForm.color }} />
                  <strong>{entityTypeForm.name.trim() || "Type preview"}</strong>
                  <code>{entityTypeForm.color.toUpperCase()}</code>
                </div>
                {entityTypesError && <div className="form-error" role="alert">{entityTypesError}</div>}
                <div className="entity-type-editor-actions">
                  {editingEntityType && (
                    <button type="button" className="secondary-button" onClick={startCreateEntityType} disabled={entityTypeSaving}>Cancel edit</button>
                  )}
                  <button type="button" className="primary-button" onClick={() => void saveEntityType()} disabled={entityTypeSaving || entityTypesLoading}>
                    {entityTypeSaving ? "Saving..." : editingEntityType ? "Save changes" : "Create type"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {teamModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeTeamModal}>
          <div className="entity-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">TEAM SETTINGS</span>
                <h2>{editingTeam ? "Edit Team" : "Create Team"}</h2>
              </div>
              <button className="modal-close" onClick={closeTeamModal} disabled={teamSaving}>×</button>
            </div>

            <div className="modal-body">
              <label className="form-field">
                <span>Team Name</span>
                <input
                  value={teamForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setTeamForm((current) => ({
                      ...current,
                      name,
                      slug: !editingTeam && current.slug === "" ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : current.slug,
                    }));
                  }}
                  placeholder="e.g. Engineering"
                  autoFocus
                />
              </label>

              <label className="form-field">
                <span>Slug</span>
                <input
                  value={teamForm.slug}
                  onChange={(event) => setTeamForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                  placeholder="engineering"
                />
                <small>Unique within this organization. Team descriptions and initial lead assignment are not part of the current data model.</small>
              </label>

              {teamError && <div className="form-error">{teamError}</div>}
            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={closeTeamModal} disabled={teamSaving}>Cancel</button>
              <button className="primary-button" onClick={() => void saveTeam()} disabled={teamSaving}>
                {teamSaving ? "Saving..." : editingTeam ? "Save Changes" : "Create Team"}
              </button>
            </div>
          </div>
        </div>
      )}

      {memberModalOpen && selectedTeam && (
        <div className="modal-backdrop" onMouseDown={closeMemberModal}>
          <div className="entity-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">TEAM MEMBERSHIP</span>
                <h2>{editingTeamMember ? "Edit Team Role" : "Add Member"}</h2>
              </div>
              <button className="modal-close" onClick={closeMemberModal} disabled={memberSaving}>×</button>
            </div>

            <div className="modal-body">
              <label className="form-field">
                <span>User</span>
                <select
                  value={memberForm.userId}
                  disabled={Boolean(editingTeamMember) || memberSaving || membersLoading}
                  onChange={(event) => setMemberForm((current) => ({ ...current, userId: event.target.value }))}
                >
                  <option value="">{membersLoading ? "Loading organization members..." : "Select an organization member"}</option>
                  {editingTeamMember?.user && (
                    <option value={editingTeamMember.userId}>
                      {editingTeamMember.user.name} — {editingTeamMember.user.email}
                    </option>
                  )}
                  {organizationMembers
                    .filter((organizationMember) => organizationMember.user && !teamMembers.some((member) => member.userId === organizationMember.userId))
                    .map((organizationMember) => (
                      <option key={organizationMember.userId} value={organizationMember.userId}>
                        {organizationMember.user!.name} — {organizationMember.user!.email}
                      </option>
                    ))}
                </select>
              </label>

              <label className="form-field">
                <span>Team Role</span>
                <select
                  value={memberForm.role}
                  disabled={memberSaving}
                  onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="MEMBER">MEMBER</option>
                {selectedTeam && canManageSelectedTeam && <option value="LEAD">LEAD</option>}
                </select>
              </label>

              {teamError && <div className="form-error">{teamError}</div>}
            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={closeMemberModal} disabled={memberSaving}>Cancel</button>
              <button className="primary-button" onClick={() => void saveTeamMember()} disabled={memberSaving || membersLoading}>
                {memberSaving ? (editingTeamMember ? "Saving..." : "Adding...") : (editingTeamMember ? "Save Role" : "Add Member")}
              </button>
            </div>
          </div>
        </div>
      )}

      {membershipEditOpen && editingMembership && (
        <div className="modal-backdrop" onMouseDown={closeMembershipEdit}>
          <div className="entity-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION ACCESS</span>
                <h2>Edit Member Role</h2>
              </div>
              <button className="modal-close" onClick={closeMembershipEdit} disabled={membershipSaving}>×</button>
            </div>
            <div className="modal-body">
              <div className="role-edit-identity">
                <strong>{editingMembership.user?.name ?? "Organization member"}</strong>
                <span>{editingMembership.user?.email ?? ""}</span>
              </div>
              <label className="form-field">
                <span>Organization Role</span>
                <select
                  value={membershipEditRole}
                  disabled={membershipSaving}
                  onChange={(event) => setMembershipEditRole(event.target.value)}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                  {isOrganizationCreator(editingMembership.organizationId) && <option value="OWNER">OWNER</option>}
                </select>
              </label>
              {membersError && <div className="form-error">{membersError}</div>}
            </div>
            <div className="modal-footer">
              <button className="secondary-button" onClick={closeMembershipEdit} disabled={membershipSaving}>Cancel</button>
              <button className="primary-button" onClick={() => void saveOrganizationMemberRole()} disabled={membershipSaving}>
                {membershipSaving ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {membershipModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeMembershipModal}>
          <div className="entity-modal membership-modal invitation-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">ADD ORGANIZATION MEMBER</span>
                <h2>{membershipJoinCode ? "Share the join code" : "Add a member"}</h2>
              </div>
              <button className="modal-close" onClick={closeMembershipModal} disabled={membershipSaving}>×</button>
            </div>

            {!membershipJoinCode ? (
              <>
                <div className="modal-body">
                  <div className="invitation-intro">
                    <div className="invitation-intro-icon">＋</div>
                    <div>
                      <strong>Add an existing OrgImpact account</strong>
                      <p>Enter the email used for their account. New users can join with the organization code after signing up.</p>
                    </div>
                  </div>

                  <label className="form-field">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={membershipForm.email}
                      disabled={membershipSaving}
                      onChange={(event) => setMembershipForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="person@company.com"
                      autoFocus
                    />
                  </label>

                  {membersError && <div className="form-error">{membersError}</div>}
                </div>

                <div className="modal-footer">
                  <button className="secondary-button" onClick={closeMembershipModal} disabled={membershipSaving}>Cancel</button>
                  <button className="primary-button" onClick={() => void saveOrganizationMember()} disabled={membershipSaving}>
                    {membershipSaving ? "Adding member..." : "Add member"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-body">
                  <div className="invitation-success">
                    <div className="invitation-success-icon">↗</div>
                    <h3>No account found for this email</h3>
                    <p>Share this organization code. They can sign up, then request to join; an owner can approve the request.</p>
                  </div>

                  <div className="invitation-link-box">
                    <span>{membershipJoinCode}</span>
                    <button
                      type="button"
                      className="secondary-button invitation-copy-button"
                      onClick={() => void navigator.clipboard.writeText(membershipJoinCode)}
                    >
                      Copy code
                    </button>
                  </div>

                  <div className="invitation-note">
                    Join requests remain pending until an organization owner approves them.
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="primary-button" onClick={closeMembershipModal}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {incidentModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeIncidentModal}>
          <div className="entity-modal incident-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="page-eyebrow">{editingIncident ? "EDIT INCIDENT" : "NEW INCIDENT"}</span><h2>{editingIncident ? "Edit Incident" : "Create Incident"}</h2></div><button className="modal-close" onClick={closeIncidentModal} disabled={incidentSaving}>×</button></div>
            <div className="modal-body">
              <label className="form-field"><span>Title</span><input value={incidentForm.title} onChange={(e) => setIncidentForm((c) => ({...c, title: e.target.value}))} placeholder="e.g. Payment Database Failure" autoFocus /></label>
              <label className="form-field"><span>Affected Entity</span><select value={incidentForm.affectedEntityId} disabled={Boolean(editingIncident) || incidentSaving} onChange={(e) => setIncidentForm((c) => ({...c, affectedEntityId: e.target.value}))}><option value="">Select affected entity</option>{(graph?.nodes ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name} — {entity.entityType}</option>)}</select></label>
              <label className="form-field"><span>Severity</span><select value={incidentForm.severity} disabled={incidentSaving} onChange={(e) => setIncidentForm((c) => ({...c, severity: e.target.value as Incident["severity"]}))}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select></label>
              <label className="form-field"><span>Description</span><textarea value={incidentForm.description} onChange={(e) => setIncidentForm((c) => ({...c, description: e.target.value}))} placeholder="Describe what happened..." rows={5} /></label>
              {incidentError && <div className="form-error">{incidentError}</div>}
            </div>
            <div className="modal-footer"><button className="secondary-button" onClick={closeIncidentModal} disabled={incidentSaving}>Cancel</button><button className="primary-button" onClick={() => void saveIncident()} disabled={incidentSaving || !graph?.nodes.length}>{incidentSaving ? "Saving..." : editingIncident ? "Save Changes" : "Create Incident"}</button></div>
          </div>
        </div>
      )}

      {relationshipModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={closeRelationshipModal}
        >
          <div
            className="entity-modal relationship-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">NEW RELATIONSHIP</span>
                <h2>Create Relationship</h2>
              </div>

              <button
                className="modal-close"
                onClick={closeRelationshipModal}
                disabled={relationshipSaving}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label className="form-field">
                <span>Source Entity</span>
                <select
                  value={relationshipForm.sourceEntityId}
                  disabled={relationshipSaving}
                  onChange={(event) =>
                    setRelationshipForm((current) => ({
                      ...current,
                      sourceEntityId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select source entity</option>
                  {(graph?.nodes ?? []).map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} — {entity.entityType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Relationship</span>
                <select
                  value={relationshipForm.relationshipType}
                  disabled={relationshipSaving}
                  onChange={(event) =>
                    setRelationshipForm((current) => ({
                      ...current,
                      relationshipType: event.target.value,
                    }))
                  }
                >
                  {relationshipTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Target Entity</span>
                <select
                  value={relationshipForm.targetEntityId}
                  disabled={relationshipSaving}
                  onChange={(event) =>
                    setRelationshipForm((current) => ({
                      ...current,
                      targetEntityId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select target entity</option>
                  {(graph?.nodes ?? []).map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} — {entity.entityType}
                    </option>
                  ))}
                </select>
              </label>

              {relationshipError && (
                <div className="form-error">{relationshipError}</div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={closeRelationshipModal}
                disabled={relationshipSaving}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => void saveRelationship()}
                disabled={relationshipSaving || (graph?.nodes.length ?? 0) < 2}
              >
                {relationshipSaving ? "Creating..." : "Create Relationship"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={() => setConfirmDialog(null)}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 21 7v5c0 4.8-3.2 7.8-9 9-5.8-1.2-9-4.2-9-9V7l9-4Z" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <div className="confirm-dialog-content">
              <h3 id="confirm-dialog-title">{confirmDialog.title}</h3>
              <p>{confirmDialog.message}</p>
            </div>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="confirm-cancel-button"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-delete-button"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
