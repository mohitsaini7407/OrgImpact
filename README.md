# OrgImpact

[![Live Demo](https://img.shields.io/badge/demo-orgimpact.vercel.app-blue)](https://orgimpact.vercel.app)
[![Source Code](https://img.shields.io/badge/github-mohitsaini7407%2FOrgImpact-lightgrey)](https://github.com/mohitsaini7407/OrgImpact)

**OrgImpact** is a multi-tenant organizational dependency mapping and impact analysis platform. It enables engineering and operations teams to map interconnected services, infrastructure, and teams, visually trace upstream blast radius during incidents, and collaborate in real time.

---

## 🎯 Key Features

- **Interactive Dependency Graph:** Visually map services, databases, infrastructure, and teams with directed relationships using `@xyflow/react`.
- **Upstream Impact Analysis:** Instantly compute the blast radius and affected upstream systems by traversing dependency paths when a component fails.
- **Incident Tracking:** Log incidents, track resolution status (`OPEN`, `INVESTIGATING`, `RESOLVED`), and notify affected stakeholders.
- **Multi-Tenant Workspaces & RBAC:** Organization creation, join codes, membership approvals, and role-based access control (`OWNER`, `ADMIN`, `MEMBER`).
- **Teams & Real-Time Collaboration:** Team channels, direct messaging, typing indicators, and instant entity updates powered by Socket.IO and Redis Pub/Sub.
- **Theme Support:** Polished UI with native dark and light modes.

---

## 🚀 Demo Access

Try the live app at **[orgimpact.vercel.app](https://orgimpact.vercel.app)** with disposable demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Developer | `dev@orgimpact.dev` | `dev@1234` |
| Owner | `owner@orgimpact.dev` | `owner@1234` |
| Admin | `admin@orgimpact.dev` | `admin@1234` |
| Member | `member@orgimpact.dev` | `member@1234` |

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, `@xyflow/react` (graph visualization), Custom CSS
- **Backend:** Node.js, Express 5, TypeScript, Socket.IO 4, Zod
- **Database & ORM:** PostgreSQL, Prisma 7 (`@prisma/adapter-pg`)
- **Cache & Real-Time:** Redis (Pub/Sub event broker & auth rate limiting)
- **Auth & Security:** JWT (HS256), bcryptjs, Redis rate-limiting

---

## 🏗️ Architecture

```
React 19 (Vite) <─── HTTP / Socket.IO ───> Express 5 API
                                             ├── Prisma ORM ──> PostgreSQL
                                             └── Pub/Sub / Rate Limit ──> Redis
```

When an entity experiences an incident, OrgImpact traverses upstream dependency edges (e.g., `API -> Service -> Database`), identifying every dependent component and its depth in the failure chain.

---

## 📡 API Reference

Protected endpoints require `Authorization: Bearer <JWT>`. The Express backend serves JSON responses without an `/api` prefix.

| Domain | Method & Endpoint | Description |
| --- | --- | --- |
| **System** | `GET /health` | Service health & liveness check |
| **Auth** | `POST /auth/register`<br>`POST /auth/login` | Account registration & authentication (rate-limited) |
| | `GET /auth/me`<br>`PATCH /auth/me` | Fetch / update current user profile |
| **Organizations** | `POST /organizations`<br>`GET /organizations` | Create or list user organizations |
| | `POST /organizations/join-requests`<br>`PATCH .../:requestId` | Request to join via code; owner approval/rejection |
| | `POST /memberships`<br>`PATCH /memberships/:id` | Manage organization members & roles (`OWNER`, `ADMIN`, `MEMBER`) |
| | `POST /invitations`<br>`POST /invitations/:token/accept` | Generate and accept organization invitations |
| **Teams** | `POST /teams`<br>`GET /teams/organization/:id` | Create and list organization teams |
| | `POST /team-members`<br>`PATCH /team-members/:id` | Assign team members & roles (`MEMBER`, `LEAD`) |
| **Entities & Types** | `GET /entities/organization/:id`<br>`POST /entities` | Inventory entities with criticality (`LOW` to `CRITICAL`) |
| | `GET /entity-types/organization/:id`<br>`POST /entity-types` | Custom entity categories and color tags |
| **Relationships** | `GET /relationships/organization/:id`<br>`POST /relationships` | Directed dependencies (`DEPENDS_ON`, `CALLS`, etc.) |
| | `GET /relationship-types/organization/:id` | List organization relationship types |
| **Impact & Graph** | `GET /graph/organization/:id` | Full dependency graph nodes, edges, and statistics |
| | `GET /impact/:entityId` | Upstream blast radius analysis with traversal depth |
| **Incidents** | `POST /incidents`<br>`GET /incidents/organization/:id` | Log incidents (`OPEN`, `INVESTIGATING`, `RESOLVED`) |
| | `GET /incidents/:id/impact` | Direct blast radius analysis for an incident's entity |
| **Notifications** | `GET /notifications/organization/:id`<br>`PATCH .../read-all` | User incident & organization notifications |
| **Chat & Real-Time** | `POST /chat/organizations/:id/conversations/direct`<br>`POST .../teams/:teamId` | Direct and team message channels |
| | `GET /chat/conversations/:id/messages` | Paginated/persisted conversation messages |
| | *Socket.IO Handshake & Events* | Real-time rooms (`join-organization`), `chat:message`, `chat:typing`, and entity event streaming via Redis |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis (`docker run -p 6379:6379 -d redis:7-alpine`)

### 1. Clone & Setup Backend

```bash
git clone https://github.com/mohitsaini7407/OrgImpact.git
cd OrgImpact/backend

# Install dependencies & generate Prisma client
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Run migrations & start server
npx prisma migrate deploy
npm run dev
```
*Backend runs on `http://localhost:5000` (Health check: `http://localhost:5000/health`).*

### 2. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000

# Start development server
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default / Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/orgimpact?schema=public` |
| `JWT_SECRET` | Secret key for signing auth tokens (min 32 chars) | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT token lifespan | `7d` |
| `REDIS_URL` | Redis instance URL | `redis://localhost:6379` |
| `FRONTEND_URL` | Allowed CORS frontend origins | `http://localhost:5173` |
| `PORT` | API server port (optional) | `5000` |

### Frontend (`frontend/.env`)
| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:5000` |

---

## 📁 Project Structure

```text
OrgImpact/
├── frontend/                # React 19 + Vite client
│   ├── src/
│   │   ├── App.tsx          # Main dashboard & graph view
│   │   ├── Login.tsx        # Authentication & onboarding
│   │   └── socket.ts        # Real-time Socket.IO client
│   └── package.json
└── backend/                 # Express 5 + TypeScript API
    ├── prisma/              # Schema & database migrations
    ├── src/
    │   ├── server.ts        # App entry & Socket.IO initialization
    │   ├── routes/          # API route definitions & Zod validation
    │   ├── services/        # Business logic & graph traversal
    │   └── lib/             # Prisma, Redis, & Socket helpers
    └── package.json
```

---

## 📜 Available Scripts

| Area | Command | Action |
| --- | --- | --- |
| **Backend** | `npm run dev` | Start development server with watch mode |
| | `npm run build` | Compile TypeScript to JavaScript |
| | `npm test` | Run route schema and error-handler tests |
| **Frontend** | `npm run dev` | Start Vite development server |
| | `npm run build` | Build production bundle |
| | `npm run lint` | Run Oxlint |
| | `npm test` | Run graph helper unit tests |

---

## 📄 License

ISC
