import { useEffect, useMemo, useState } from "react";
import { socket } from "./socket";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";
import Login from "./Login";

const API_BASE_URL = "http://localhost:5000";
const ORGANIZATION_ID = "e9cd3e97-f509-4a60-a8c8-390f2b9dd8a6";

type GraphNode = {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
};

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
};

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

type ActiveView =
  | "dashboard"
  | "entities"
  | "relationships"
  | "teams"
  | "members"
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
  user?: UserSummary;
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
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

type MembershipForm = {
  userId: string;
  role: string;
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
  userId: "",
  role: "MEMBER",
};

const emptyIncidentForm: IncidentForm = { title: "", description: "", affectedEntityId: "", severity: "MEDIUM" };

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );

  const [activeView, setActiveView] =
    useState<ActiveView>("dashboard");

  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);

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
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm);
  const [teamSaving, setTeamSaving] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState<TeamMemberForm>(emptyTeamMemberForm);
  const [memberSaving, setMemberSaving] = useState(false);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [membershipForm, setMembershipForm] = useState<MembershipForm>(emptyMembershipForm);
  const [membershipSaving, setMembershipSaving] = useState(false);

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
  const [simulationCriticalityFilter, setSimulationCriticalityFilter] =
    useState<"ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("ALL");

  useEffect(() => {
    if (!token) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join-organization", ORGANIZATION_ID);
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, [token]);


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
        `${API_BASE_URL}/graph/organization/${ORGANIZATION_ID}`,
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

    const handleEntityCreated = (entity: GraphNode) => {
      console.log("ENTITY_CREATED:", entity);
      void loadGraph();
    };

    const handleEntityUpdated = (entity: GraphNode) => {
      console.log("ENTITY_UPDATED:", entity);
      void loadGraph();
    };

    const handleEntityDeleted = (entity: {
      id: string;
      organizationId: string;
    }) => {
      console.log("ENTITY_DELETED:", entity);
      void loadGraph();
    };

    const handleRelationshipCreated = (relationship: {
      id: string;
      organizationId: string;
      sourceEntityId: string;
      targetEntityId: string;
      relationshipType: string;
    }) => {
      console.log("RELATIONSHIP_CREATED:", relationship);
      void loadGraph();
    };

    const handleRelationshipDeleted = (relationship: {
      id: string;
      organizationId: string;
    }) => {
      console.log("RELATIONSHIP_DELETED:", relationship);
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
    };
  }, [token]);

  async function loadEntityTypes() {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      return;
    }

    try {
      setEntityTypesLoading(true);
      setEntityError("");

      const response = await fetch(
        `${API_BASE_URL}/entity-types`,
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
      setEntityTypes(data);
    } catch (err) {
      console.error(err);
      setEntityError(
        err instanceof Error
          ? err.message
          : "Unable to load entity types.",
      );
    } finally {
      setEntityTypesLoading(false);
    }
  }

  async function loadTeams() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    try {
      setTeamsLoading(true);
      setTeamError("");

      const response = await fetch(
        `${API_BASE_URL}/teams/organization/${ORGANIZATION_ID}`,
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
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadOrganizationMembers() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    try {
      setMembersLoading(true);
      setMembersError("");

      const response = await fetch(
        `${API_BASE_URL}/memberships/organization/${ORGANIZATION_ID}`,
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
    setMembersError("");
    setMembershipModalOpen(true);
  }

  function closeMembershipModal() {
    setMembershipModalOpen(false);
    setMembershipForm(emptyMembershipForm);
  }

  async function saveOrganizationMember() {
    if (!membershipForm.userId) {
      setMembersError("Please select a user.");
      return;
    }

    try {
      setMembershipSaving(true);
      setMembersError("");

      const response = await fetch(`${API_BASE_URL}/memberships`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: membershipForm.userId,
          organizationId: ORGANIZATION_ID,
          role: membershipForm.role,
        }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to add member (${response.status})`);
      }

      closeMembershipModal();
      await loadOrganizationMembers();
    } catch (err) {
      console.error(err);
      setMembersError(err instanceof Error ? err.message : "Unable to add organization member.");
    } finally {
      setMembershipSaving(false);
    }
  }

  async function loadUsers() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    try {
      setUsersLoading(true);
      const response = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to load users (${response.status})`);
      }

      setUsers(Array.isArray(data) ? data : data?.users ?? []);
    } catch (err) {
      console.error(err);
      setTeamError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setUsersLoading(false);
    }
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

  useEffect(() => {
    if (activeView === "teams" && token) {
      void loadTeams();
      void loadUsers();
    }
  }, [activeView, token]);

  useEffect(() => {
    if (activeView === "members" && token) {
      void loadOrganizationMembers();
      void loadUsers();
      void loadCurrentUser();
    }
  }, [activeView, token]);

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
    if (!token) {
      setLoading(false);
      return;
    }

    void loadGraph();
    void loadEntityTypes();
  }, [token]);

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
          label: (
            <div
              className={[
                "graph-node",
                typeClass,
                isSelected ? "is-selected" : "",
                isAffected ? "is-affected" : "",
                isFocused ? "is-focused" : "",
              ].join(" ")}
            >
              <div className="node-icon">{icon}</div>

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

  function handleLogin(newToken: string) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken(null);
    setGraph(null);
    setSelectedEntity(null);
    setImpact(null);
    setError("");
    setImpactError("");
    setEntityError("");
    setActiveView("dashboard");
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
            ...(entityForm.description.trim()
              ? {
                  description: entityForm.description.trim(),
                }
              : {}),
            criticality: entityForm.criticality,
          }
        : {
            organizationId: ORGANIZATION_ID,
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
    const confirmed = window.confirm(
      `Delete "${entity.name}"? Any relationships connected to this entity will also be removed by the database.`,
    );

    if (!confirmed) {
      return;
    }

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

      // await loadGraph(); //it was not working properly, so I commented it out. The graph will be updated via socket events anyway.
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
          organizationId: ORGANIZATION_ID,
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

    const confirmed = window.confirm(
      `Delete ${source?.name ?? "source"} → ${relationship.relationshipType} → ${target?.name ?? "target"}?`,
    );

    if (!confirmed) {
      return;
    }

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
      const response = await fetch(`${API_BASE_URL}/incidents/organization/${ORGANIZATION_ID}`, { headers: getAuthHeaders() });
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
      const body = editingIncident ? { title: incidentForm.title.trim(), description: incidentForm.description.trim() || null, severity: incidentForm.severity } : { organizationId: ORGANIZATION_ID, affectedEntityId: incidentForm.affectedEntityId, title: incidentForm.title.trim(), description: incidentForm.description.trim() || undefined, severity: incidentForm.severity };
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
    if (!window.confirm(`Delete incident "${incident.title}"?`)) return;
    try {
      setIncidentError("");
      const response = await fetch(`${API_BASE_URL}/incidents/${incident.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (await handleUnauthorized(response)) throw new Error("Authentication failed. Please login again.");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || "Unable to delete incident.");
      setIncidents((current) => current.filter((item) => item.id !== incident.id));
      if (selectedIncident?.id === incident.id) { setSelectedIncident(null); setSelectedEntity(null); setImpact(null); setFocusedEntityId(null); }
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

    if (simulationCriticalityFilter === "ALL") {
      return entities;
    }

    return entities.filter(
      (entity) => entity.criticality === simulationCriticalityFilter,
    );
  }, [graph, simulationCriticalityFilter]);

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
    setTeamForm(emptyTeamForm);
    setTeamError("");
    setTeamModalOpen(true);
  }

  function closeTeamModal() {
    setTeamModalOpen(false);
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

      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organizationId: ORGANIZATION_ID,
          name,
          slug,
        }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to create team (${response.status})`);
      }

      closeTeamModal();
      await loadTeams();
      const createdTeam = data?.team ?? data;
      if (createdTeam?.id) {
        setSelectedTeam(createdTeam);
      }
    } catch (err) {
      console.error(err);
      setTeamError(err instanceof Error ? err.message : "Unable to create team.");
    } finally {
      setTeamSaving(false);
    }
  }

  function openAddMember() {
    if (!selectedTeam) return;
    setMemberForm(emptyTeamMemberForm);
    setTeamError("");
    setMemberModalOpen(true);
  }

  function closeMemberModal() {
    setMemberModalOpen(false);
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

      const response = await fetch(`${API_BASE_URL}/team-members`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          teamId: selectedTeam.id,
          userId: memberForm.userId,
          role: memberForm.role,
        }),
      });

      if (await handleUnauthorized(response)) {
        throw new Error("Authentication failed. Please login again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Unable to add team member (${response.status})`);
      }

      closeMemberModal();
      await loadTeamMembers(selectedTeam.id);
    } catch (err) {
      console.error(err);
      setTeamError(err instanceof Error ? err.message : "Unable to add team member.");
    } finally {
      setMemberSaving(false);
    }
  }

  function selectTeam(team: Team) {
    setSelectedTeam(team);
    setTeamError("");
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

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>OrgImpact</h1>
          <p>Organizational dependency intelligence</p>
        </div>

        <div className="header-actions">
          <nav className="main-nav">
            <button
              className={
                activeView === "dashboard"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => setActiveView("dashboard")}
            >
              Dashboard
            </button>

            <button
              className={
                activeView === "entities"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => setActiveView("entities")}
            >
              Entities
            </button>

            <button
              className={
                activeView === "relationships"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => setActiveView("relationships")}
            >
              Relationships
            </button>


            <button
              className={
                activeView === "teams"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => setActiveView("teams")}
            >
              Teams
            </button>


            <button
              className={
                activeView === "members"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => setActiveView("members")}
            >
              Members
            </button>
            <button
              className={activeView === "incidents" ? "nav-button active" : "nav-button"}
              onClick={() => setActiveView("incidents")}
            >
              Incidents
            </button>

            <button
              className={activeView === "simulation" ? "nav-button active" : "nav-button"}
              onClick={() => setActiveView("simulation")}
            >
              Simulate Change
            </button>
          </nav>

          <div className="status">
            <span className="status-dot" />
            <span>{error ? "Graph Error" : "Graph Connected"}</span>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main">
        {activeView === "dashboard" ? (
          <>
            <section className="stats">
              <div className="stat-card">
                <span>Organization</span>
                <strong>OrgImpact Demo</strong>
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
                      attributionPosition="bottom-left"
                    >
                      <Background gap={24} size={1} />
                      <Controls />
                      <MiniMap />
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
                <h2>Entities</h2>
                <p>
                  Manage the systems, services, databases and infrastructure
                  represented in your dependency graph.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={openCreateEntity}
              >
                + Add Entity
              </button>
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
                <h2>Relationships</h2>
                <p>
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
              <div><span className="page-eyebrow">OPERATIONS</span><h2>Incidents</h2><p>Track failures and understand their dependency blast radius.</p></div>
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
                  <div className="incident-meta-grid"><div className="incident-meta-card"><span>Severity</span><strong className={`incident-severity ${selectedIncident.severity.toLowerCase()}`}>{selectedIncident.severity}</strong></div><div className="incident-meta-card"><span>Status</span><select value={selectedIncident.status} onChange={(e) => void updateIncidentStatus(selectedIncident, e.target.value as Incident["status"])}><option>OPEN</option><option>INVESTIGATING</option><option>RESOLVED</option></select></div><div className="incident-meta-card"><span>Affected Entity</span><strong>{selectedIncident.affectedEntity?.name ?? "Unknown entity"}</strong></div><div className="incident-meta-card"><span>Created</span><strong>{new Date(selectedIncident.createdAt).toLocaleDateString()}</strong></div></div>
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
                <h2>Change Simulation</h2>
                <p>
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

                      <select
                        className="simulation-criticality-filter"
                        value={simulationCriticalityFilter}
                        onChange={(event) =>
                          setSimulationCriticalityFilter(
                            event.target.value as
                              | "ALL"
                              | "LOW"
                              | "MEDIUM"
                              | "HIGH"
                              | "CRITICAL",
                          )
                        }
                        aria-label="Filter entities by criticality"
                      >
                        <option value="ALL">All Criticality</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  {filteredSimulationEntities.length === 0 ? (
                    <div className="simulation-empty-filter">
                      <strong>No entities found</strong>
                      <p>
                        There are no entities with {simulationCriticalityFilter.toLowerCase()}
                        criticality.
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

                <div className="simulation-explanation">
                  <strong>What will happen?</strong>
                  <p>
                    Select any system above. OrgImpact automatically
                    traverses its dependency graph and estimates the systems
                    that could be affected by a change or outage.
                  </p>
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

                    <div className="simulation-warning">
                      <strong>Simulation only</strong>
                      <span>
                        This analysis does not modify your graph or production
                        systems. It estimates impact using the dependency
                        relationships currently recorded in OrgImpact.
                      </span>
                    </div>
                  </>
                )}
              </section>
            </div>
          </section>
        ) : activeView === "members" ? (
          <section className="members-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION ACCESS</span>
                <h2>Members &amp; Roles</h2>
                <p>Manage organization membership and assign OWNER, ADMIN, or MEMBER roles.</p>
              </div>

              {(currentUser && ["OWNER", "ADMIN"].includes(
                organizationMembers.find((member) => member.userId === currentUser.id)?.role ?? "",
              )) && (
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
                  {organizationMembers.map((member) => (
                    <div className="organization-member-row" key={member.id}>
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
                      <span className={`organization-role-badge ${member.role.toLowerCase()}`}>
                        {member.role}
                      </span>
                      <span className="member-since">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="rbac-note">
              <strong>RBAC</strong>
              <span>OWNER has full organization control. ADMIN can manage teams and memberships. MEMBER has standard access.</span>
            </div>
          </section>
        ) : (
          <section className="teams-page">
            <div className="page-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION</span>
                <h2>Teams</h2>
                <p>Organize members into focused teams and manage team membership.</p>
              </div>

              <button className="primary-button" onClick={openCreateTeam}>
                + Create Team
              </button>
            </div>

            {teamError && !teamModalOpen && !memberModalOpen && (
              <div className="page-error">{teamError}</div>
            )}

            <div className="teams-layout">
              <section className="teams-list-panel">
                <div className="section-heading-row">
                  <div>
                    <span className="page-eyebrow">YOUR TEAMS</span>
                    <h3>{teams.length} Teams</h3>
                  </div>
                  {teamsLoading && <span className="loading-text">Loading...</span>}
                </div>

                {!teamsLoading && teams.length === 0 ? (
                  <div className="empty-management">
                    <div className="empty-management-icon">T</div>
                    <h3>No teams yet</h3>
                    <p>Create your first team to start organizing members.</p>
                    <button className="primary-button" onClick={openCreateTeam}>
                      Create Team
                    </button>
                  </div>
                ) : (
                  <div className="team-card-list">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        className={`team-card ${selectedTeam?.id === team.id ? "active" : ""}`}
                        onClick={() => selectTeam(team)}
                      >
                        <div className="team-avatar">{team.name.slice(0, 1).toUpperCase()}</div>
                        <div className="team-card-main">
                          <strong>{team.name}</strong>
                          <span>{team.slug}</span>
                        </div>
                        <div className="team-card-arrow">→</div>
                      </button>
                    ))}
                  </div>
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
                        <p>/{selectedTeam.slug}</p>
                      </div>
                      <button className="secondary-button" onClick={openAddMember}>
                        + Add Member
                      </button>
                    </div>

                    <div className="team-member-summary">
                      <strong>{teamMembers.length}</strong>
                      <span>members</span>
                    </div>

                    {teamMembersLoading ? (
                      <div className="team-loading"><div className="small-loader" /> Loading members...</div>
                    ) : teamMembers.length === 0 ? (
                      <div className="empty-management">
                        <h3>No members yet</h3>
                        <p>Add a user to this team to get started.</p>
                        <button className="primary-button" onClick={openAddMember}>
                          Add Member
                        </button>
                      </div>
                    ) : (
                      <div className="team-members-list">
                        {teamMembers.map((member) => (
                          <div className="team-member-row" key={member.id}>
                            <div className="member-avatar">{(member.user?.name ?? "U").slice(0, 1).toUpperCase()}</div>
                            <div className="member-main">
                              <strong>{member.user?.name ?? `User ${member.userId.slice(0, 8)}`}</strong>
                              <span>{member.user?.email ?? "Member"}</span>
                            </div>
                            <span className="role-badge">{member.role}</span>
                          </div>
                        ))}
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
                  disabled={Boolean(editingEntity) || entityTypesLoading}
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
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {editingEntity && (
                  <small>
                    Entity type is kept unchanged when editing. Delete and
                    recreate an entity if its type needs to change.
                  </small>
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

      {teamModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeTeamModal}>
          <div className="entity-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">NEW TEAM</span>
                <h2>Create Team</h2>
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
                      slug: current.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
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
                <small>Used as the unique team identifier inside the organization.</small>
              </label>

              {teamError && <div className="form-error">{teamError}</div>}
            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={closeTeamModal} disabled={teamSaving}>Cancel</button>
              <button className="primary-button" onClick={() => void saveTeam()} disabled={teamSaving}>
                {teamSaving ? "Creating..." : "Create Team"}
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
                <h2>Add Member</h2>
              </div>
              <button className="modal-close" onClick={closeMemberModal} disabled={memberSaving}>×</button>
            </div>

            <div className="modal-body">
              <label className="form-field">
                <span>User</span>
                <select
                  value={memberForm.userId}
                  disabled={memberSaving || usersLoading}
                  onChange={(event) => setMemberForm((current) => ({ ...current, userId: event.target.value }))}
                >
                  <option value="">{usersLoading ? "Loading users..." : "Select a user"}</option>
                  {users
                    .filter((user) => !teamMembers.some((member) => member.userId === user.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.email}
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
                  <option value="LEAD">LEAD</option>
                </select>
              </label>

              {teamError && <div className="form-error">{teamError}</div>}
            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={closeMemberModal} disabled={memberSaving}>Cancel</button>
              <button className="primary-button" onClick={() => void saveTeamMember()} disabled={memberSaving || usersLoading}>
                {memberSaving ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {membershipModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeMembershipModal}>
          <div className="entity-modal membership-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">ORGANIZATION MEMBERSHIP</span>
                <h2>Add Member</h2>
              </div>
              <button className="modal-close" onClick={closeMembershipModal} disabled={membershipSaving}>×</button>
            </div>

            <div className="modal-body">
              <label className="form-field">
                <span>User</span>
                <select
                  value={membershipForm.userId}
                  disabled={membershipSaving || usersLoading}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, userId: event.target.value }))}
                >
                  <option value="">{usersLoading ? "Loading users..." : "Select a user"}</option>
                  {users
                    .filter((user) => !organizationMembers.some((member) => member.userId === user.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.email}
                      </option>
                    ))}
                </select>
              </label>

              <label className="form-field">
                <span>Organization Role</span>
                <select
                  value={membershipForm.role}
                  disabled={membershipSaving}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                  {organizationMembers.find((member) => member.userId === currentUser?.id)?.role === "OWNER" && (
                    <option value="OWNER">OWNER</option>
                  )}
                </select>
                <small>Role assignment is enforced by the backend. Only an OWNER can assign the OWNER role.</small>
              </label>

              {membersError && <div className="form-error">{membersError}</div>}
            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={closeMembershipModal} disabled={membershipSaving}>Cancel</button>
              <button className="primary-button" onClick={() => void saveOrganizationMember()} disabled={membershipSaving || usersLoading}>
                {membershipSaving ? "Adding..." : "Add Member"}
              </button>
            </div>
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
    </div>
  );
}

export default App;
