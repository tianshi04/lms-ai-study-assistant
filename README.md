# Coursera LMS Platform (AI-Assisted Learning Assistant)

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith%20%2B%20DDD-blue)](https://github.com/tianshi04/lms-ai-study-assistant)
[![Backend](https://img.shields.io/badge/Backend-Python%203.13%2B%20%7C%20Starlette%20%7C%20ConnectRPC-green)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019%20%7C%20Tailwind%20v4-black)](frontend/)
[![Security](https://img.shields.io/badge/Security-3--Layer%20PBAC%20%2B%20SQL%20Scope%20Pushdown-red)](#-3-layer-security-protocol)
[![AI Assistant](https://img.shields.io/badge/AI%20Assistant-CopilotKit%20v2%20%7C%20Gemini-purple)](frontend/)
[![Cache & Queues](https://img.shields.io/badge/Cache-Redis%207-red)](backend/docker-compose.yml)
[![Observability](https://img.shields.io/badge/Observability-OpenTelemetry%20%7C%20OpenObserve-teal)](backend/docker-compose.yml)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2017%20pgvector-blueviolet)](backend/docker-compose.yml)
[![Protocol](https://img.shields.io/badge/API-ConnectRPC%20%2F%20Protobuf-orange)](proto/)
[![Testing](https://img.shields.io/badge/Testing-Playwright%20E2E%20%7C%20Pytest-brightgreen)](e2e/)

A modern, production-grade **Coursera-style Online Learning Management System (LMS)** built with a **Contract-First Modular Monolith architecture** following **Domain-Driven Design (DDD)** principles, **3-Layer Security Architecture**, and an **integrated AI Study Assistant**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [3-Layer Security Protocol](#-3-layer-security-protocol)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Bounded Contexts (Feature Modules)](#-bounded-contexts-feature-modules)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Environment Setup](#1-environment-setup)
  - [2. Generate API Stubs](#2-generate-api-stubs)
  - [3. Run Infrastructure Services](#3-run-infrastructure-services-postgresql-minio-redis-openobserve)
  - [4. Database Migrations & Initial Seeding](#4-database-migrations--initial-seeding)
  - [5. Default Seed Test Accounts](#5-default-seed-test-accounts)
  - [6. Start Development Servers](#6-start-development-servers)
  - [Running Full Stack via Docker Compose](#running-full-stack-via-docker-compose)
  - [Production VPS Deployment](#production-vps-deployment)
- [Helper Commands & Scripts](#-helper-commands--scripts)
  - [Root Commands (Makefile)](#root-commands-makefile)
  - [Backend Commands (Makefile)](#backend-commands-makefile)
  - [Frontend Commands (PNPM)](#frontend-commands-pnpm)
  - [End-to-End (E2E) Testing (Playwright TS)](#end-to-end-e2e-testing-playwright-ts)
- [Development Rules & Conventions](#-development-rules--conventions)
- [Documentation](#-documentation)

---

## ✨ Key Features

- 🎓 **Structured Learning Hierarchy:** Multi-tier curriculum modeling: `Specialization` → `Course` → `Module/Week` → `Lesson` → `Learning Items` (Interactive Videos, Reading Materials, Quizzes, Coding Labs, Peer Reviews).
- 🏢 **Multi-Tenant Organization & Partner Management:** Organization Owner (`ORG OWNER`) portal, partner university/enterprise onboarding (e.g., Stanford Online, DeepLearning.AI, Google Cloud, NEU), Enterprise Licenses (`ENT-...` seat allocations), and instructor application & verification queues.
- 👥 **Granular ReBAC & Role-Based Permissions:** Granular access controls for Super Admins, Instructors, Co-Instructors, Teaching Assistants (TAs), and Learners backed by centralized ReBAC permission matrices.
- 🔒 **3-Layer Security Protocol:** API method policy declaration `(auth.v1.policy)`, PostgreSQL multi-tenant SQL scope pushdown (`apply_organization_scope`), and domain resource ownership enforcement (`enforce_course_ownership`).
- 🔔 **In-App Notification Center & Preferences:** Real-time in-app notification center and customizable channel preferences for course announcements, forum replies, and assignment grading feedback.
- 🎥 **Adaptive Video Player & Asset Streaming:** MinIO S3 object storage with HTTP 206 Partial Content (byte-range streaming for seeking), VTT subtitle support, interactive scrolling transcript panel with jump-to-timestamp capabilities, and in-video quiz checkpoints.
- 📊 **Dynamic Learning Progress Tracking:** Automatic video watch-time completion tracking ($\ge 80\%$), lesson completion checkboxes, real-time course progress calculations, and flexible deadline resetting.
- 📝 **Comprehensive Assessment Engine:** Practice quizzes, graded exams (pass grade threshold, cooldown timers, retake limits), in-browser coding labs (CodeMirror with Python/JS syntax support), and rubric-based peer reviews.
- 💳 **Payments & Subscriptions (VNPay Gateway):** Course purchases, subscriptions, and secure checkout via VNPay Sandbox (cryptographic HMAC-SHA512 verification & IPN webhooks), plus financial aid application processing (150-word essay submission workflow).
- 💬 **Lesson-Level Discussion Forums:** In-context discussion threads with staff answer pinning, upvoting/downvoting, and moderation.
- 📜 **Verified Digital Certificates:** Publicly verifiable digital certificates with shareable QR codes and OpenBadges validation (`/verify/[certId]`).
- 🤖 **Dual CopilotKit v2 AI Assistants:**
  - **Platform Navigation & Discovery Agent (`generalAgent`):** Global assistant for semantic course discovery, category filtering, FAQ, certificate lookups, and direct page navigation.
  - **Socratic Learning Assistant (`learnAgent`):** Dedicated context-aware study assistant inside `/learn/[courseId]` featuring 5-layer context injection, scaffolding hints, timestamp jumping, and CPU-optimized FastEmbed vector search (`sentence-transformers/all-MiniLM-L6-v2` + `pgvector`).
- 🔭 **Full-Stack Observability:** OpenTelemetry distributed tracing and metrics in backend, OpenObserve APM dashboard, structured logging with correlation IDs (`x-request-id`), and Browser Real User Monitoring (RUM) & Session Replay in frontend.
- 🚀 **Production-Ready Caddy & Docker Stack:** Reverse proxy with automatic SSL/TLS (Let's Encrypt / ZeroSSL), HTTP/3 QUIC support, gzip/zstd compression, and automated CI/CD deployment via GitHub Actions.

---

## 🏗 System Architecture

The platform follows a **Contract-First Modular Monolith** pattern with **Domain-Driven Design (DDD)** and a dedicated **Backend-For-Frontend (BFF)** proxy in Next.js:

```
                          ┌───────────────────────────────────────────────┐
                          │               Client Browser                  │
                          └───────────────────────┬───────────────────────┘
                                                  │ HTTPS / HTTP/3
                                                  ▼
                          ┌───────────────────────────────────────────────┐
                          │             Caddy v2 Reverse Proxy            │
                          │   (Auto SSL/TLS, Gzip/Zstd, Static Cache)     │
                          └──┬──────────────────┬───────────────────┬─────┘
                             │                  │                   │
         /_next/static/*,    │                  │ /coursera-assets/ │ /rum/*
         /rpc/*, /copilotkit │                  │ (Video Streaming) │ (Browser RUM)
                             ▼                  │                   ▼
    ┌────────────────────────────────────────┐  │  ┌──────────────────────────────┐
    │     Next.js 16 Frontend (App Router)   │  │  │   OpenObserve Observability  │
    │     - React 19, Base UI, Tailwind v4   │  │  │   (Logs, Metrics, Traces)    │
    │     - Connect-ES v2.0 Client & RSC BFF │  │  └──────────────▲───────────────┘
    │     - CopilotKit v2 Runtime & Agents   │  │                 │
    └──────────────────┬─────────────────────┘  │                 │ OTLP gRPC /
                       │ ConnectRPC             │                 │ OpenTelemetry
                       ▼                        │                 │
    ┌───────────────────────────────────────────┴─────────────────┴───────────────┐
    │                     Python Backend API (Starlette + Uvicorn)                │
    │                                                                             │
    │  ┌──────────┬───────────┬──────────────┬──────────────┬──────────────────┐  │
    │  │ Catalog  │ Learning  │  Assessment  │    Forum     │     Identity     │  │
    │  ├──────────┼───────────┼──────────────┼──────────────┼──────────────────┤  │
    │  │ Partner  │  Payment  │ Notification │ Certificate  │  Shared Kernel   │  │
    │  └──────────┴───────────┴──────────────┴──────────────┴──────────────────┘  │
    └──────────┬──────────────────────┬──────────────────────┬────────────────────┘
               │                      │                      │
               ▼                      ▼                      ▼
  ┌────────────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐
  │ PostgreSQL 17 pgvector │ │ MinIO S3 Storage │ │            Redis 7            │
  │ (Relational & Vectors) │ │ (Media & Files)  │ │ (Cache & Token Bucket Limits) │
  └────────────────────────┘ └──────────────────┘ └──────────────────────────────┘
```

Each backend module in `backend/src/modules/` enforces strict DDD layer separation:
- **`domain/`**: Pure Python domain entities, value objects, business invariants, domain events, and repository interfaces. Completely free of framework or database dependencies.
- **`application/`**: Use case orchestrators executing domain logic and triggering domain events.
- **`infrastructure/`**: Database persistence (SQLAlchemy Async ORM models, Alembic migrations, MinIO client, Redis client).
- **`presentation/`**: ConnectRPC service handlers serving client requests and mapping domain errors to ConnectRPC codes.

---

## 🔐 3-Layer Security Protocol

The system enforces a strict 3-layer authorization model across all API endpoints:

1. **Layer 1 — API Policy & Context Injection (`AuthInterceptor`):**
   Every ConnectRPC service method in `.proto` explicitly declares its access policy using `(auth.v1.policy)` (`AUTH_POLICY_PUBLIC`, `AUTH_POLICY_AUTHENTICATED`, `AUTH_POLICY_ADMIN`, `AUTH_POLICY_INTERNAL`). `AuthInterceptor` verifies the JWT token, resolves caller identity, extracts the `x-organization-id` header (fallback to token claim), and injects `CurrentUserContext`.

2. **Layer 2 — Database SQL Scope Pushdown (`apply_organization_scope`):**
   Organization-scoped entity queries automatically execute `apply_organization_scope(stmt, Model, current_user)` at the repository layer. Multi-tenant filtering (`WHERE organization_id = active_org_id OR organization_id = INTERNAL_SYSTEM_ORG_ID`) is pushed directly down to the PostgreSQL execution plan. In-memory filtering is strictly prohibited.

3. **Layer 3 — Domain Ownership & Centralized ReBAC Authorization:**
   Application Use Cases verify resource ownership (`owner_id`, `co_instructor_ids`) via `enforce_course_ownership()` / central permission guards (`src/shared/permissions`), enforce lifecycle state restrictions (e.g. `PENDING_REVIEW` read-only lock), and check granular permissions via `CurrentUserContext`.

---

## 🛠 Technology Stack

### **Backend (Python)**
- **Runtime:** Python 3.13+
- **Framework & Server:** Starlette 1.7+, Uvicorn ASGI
- **API Protocol:** ConnectRPC (`connectrpc`, `connectrpc-otel`) compiled via Protocol Buffers
- **ORM & Database:** Async SQLAlchemy 2.0, Alembic (async database migrations), `asyncpg`
- **Vector Search & AI:** FastEmbed (`sentence-transformers/all-MiniLM-L6-v2`, CPU-optimized ONNX Runtime), `pgvector`
- **Cache & Rate Limiting:** Redis 7 (`redis-py`)
- **Storage:** MinIO S3-compatible client (`aioboto3`)
- **Observability:** OpenTelemetry Python SDK (Starlette, SQLAlchemy, Logging, ConnectRPC) exporting to OpenObserve
- **Package Management:** [`uv`](https://github.com/astral-sh/uv) (fast Python package manager)
- **Code Quality:** `ruff` (linter & formatter), `ty` (static type checker), `pytest` & `pytest-asyncio`

### **Frontend (TypeScript)**
- **Framework:** Next.js 16 (App Router, Server Actions, React Server Components)
- **UI Library:** React 19 (`react` 19.3.0, React Compiler)
- **API Client:** Connect-ES v2.0 (`@connectrpc/connect`, `@connectrpc/connect-web`, `@bufbuild/protobuf`, `@bufbuild/protoc-gen-es`)
- **AI Assistant:** CopilotKit v2 (`@copilotkit/react-core`, `@copilotkit/runtime`) with Google Gemini
- **UI Primitives:** Base UI (`@base-ui/react`) for accessible unstyled primitives
- **Headless Logic:** TanStack Query v5, TanStack Table v8, TanStack Form
- **Styling:** Tailwind CSS v4, `next-themes` (Dark/Light mode)
- **Content & Code Display:** Streamdown (`streamdown`, `@streamdown/code`, `@streamdown/math`, `katex`, `shiki`), CodeMirror 6 (`@uiw/react-codemirror`)
- **Observability & RUM:** OpenObserve Browser Logs & RUM (`@openobserve/browser-logs`, `@openobserve/browser-rum`)
- **Icons & Assets:** Lucide React (`lucide-react`), DiceBear Avatars (`@dicebear/core`, `@dicebear/avataaars`)
- **Tooling:** Oxlint (Rust linter), Oxfmt (Rust formatter), TypeScript 7

### **Infrastructure & API Schema**
- **Database:** PostgreSQL 17 with `pgvector` extension
- **In-Memory Cache:** Redis 7 Alpine
- **Object Storage:** MinIO S3-compatible Object Storage
- **Observability:** OpenObserve All-In-One (Logs, Metrics, Traces, RUM)
- **Reverse Proxy:** Caddy v2 (Automatic SSL/TLS, HTTP/3 QUIC, Gzip/Zstd compression)
- **API Contract:** Protocol Buffers (`proto/`) managed via [`buf`](https://buf.build/)
- **Testing:** Playwright TS (End-to-End Blackbox Testing with Page Object Model)

---

## 📁 Project Directory Structure

```
.
├── backend/                       # Python backend application
│   ├── alembic/                   # Async database migration scripts
│   ├── src/
│   │   ├── gen/                   # Auto-generated Python ConnectRPC stubs (DO NOT EDIT)
│   │   ├── modules/               # Bounded contexts (DDD)
│   │   │   ├── assessment/        # Quizzes, exams, coding labs & peer review
│   │   │   ├── catalog/           # Course catalog, hierarchy, categories & vector embeddings
│   │   │   ├── certificate/       # Certificate issuance & public QR verification
│   │   │   ├── forum/             # Lesson & course discussion forums
│   │   │   ├── identity/          # Identity, auth, JWT, instructor applications & licenses
│   │   │   ├── learning/          # Video player, transcripts, progress tracking & deadlines
│   │   │   ├── notification/      # In-app notifications & channel preferences
│   │   │   ├── partner/           # Organization, partner universities & member onboarding
│   │   │   └── payment/           # Checkout, subscriptions & VNPay IPN gateway
│   │   ├── shared/                # Shared kernel (Auth, Permissions, DB, Redis, S3, OTel)
│   │   │   ├── domain/            # Shared business constants & base types
│   │   │   └── infrastructure/    # Database, Redis, S3, Telemetry, Logging, Interceptors
│   │   ├── scripts/seeds/         # Domain-specific seeding routines
│   │   ├── main.py                # Starlette server entrypoint, middleware & routing
│   │   └── seed.py                # Database seeding runner (Upsert & Clean Reset modes)
│   ├── tests/                     # Pytest test suite & code quality tests
│   ├── Dockerfile                 # Backend container build specification
│   ├── docker-compose.yml         # Local development infrastructure compose spec
│   ├── Makefile                   # Automation helper commands for backend
│   └── pyproject.toml             # Python dependencies (managed via uv)
├── frontend/                      # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/                   # App Router pages (/courses, /learn, /assessments, etc.)
│   │   │   ├── (public)/          # Public marketing & instructor application pages
│   │   │   ├── copilotkit/        # CopilotKit AI assistant runtime & agents
│   │   │   └── rpc/[...path]/     # BFF ConnectRPC streaming proxy
│   │   ├── components/            # Reusable UI component library (Base UI + Tailwind v4)
│   │   ├── lib/                   # ConnectRPC clients, TanStack Query hooks, RUM setup
│   │   └── gen/                   # Auto-generated TypeScript stubs (DO NOT EDIT)
│   ├── Dockerfile                 # Frontend container build specification (Standalone output)
│   ├── package.json               # Package dependencies & scripts specification
│   └── pnpm-lock.yaml             # PNPM lockfile
├── e2e/                           # Playwright End-to-End test suite (Page Object Model)
│   ├── pages/                     # Page Object Model abstractions
│   ├── tests/                     # Blackbox test suites (Learner, Instructor, Admin)
│   └── package.json               # Playwright testing dependencies
├── proto/                         # Central Protocol Buffer contracts
│   ├── assessment/v1/             # Assessment & Quiz RPC schemas
│   ├── auth/v1/                   # Custom Auth policy options schema
│   ├── catalog/v1/                # Catalog & Course RPC schemas
│   ├── certificate/v1/            # Certificate verification RPC schemas
│   ├── forum/v1/                  # Discussion forum RPC schemas
│   ├── identity/v1/               # Identity & Instructor Application RPC schemas
│   ├── learning/v1/               # Learning progress RPC schemas
│   ├── notification/v1/           # Notification & Preference RPC schemas
│   ├── partner/v1/                # Organization & Partner RPC schemas
│   └── payment/v1/                # Payment & VNPay Subscription RPC schemas
├── docs/                          # Architecture & Business specifications
│   ├── 01_overview.md             # System overview & user personas
│   ├── 02_user_stories.md         # User stories across all tracks
│   ├── 03_functional_specifications.md # Functional requirements & APIs
│   ├── 04_business_rules.md       # Business rules & grading formulas
│   ├── 05_uat_test_cases.md       # UAT test scenarios
│   ├── 06_system_initialization_and_onboarding.md # Seeding & onboarding spec
│   ├── 07_authentication_and_authorization_architecture.md # 3-Layer Security
│   ├── 08_copilotkit_ai_chatbot.md # AI Study Assistant architecture
│   └── 09_vps_deployment_guide.md # Production VPS All-in-One deployment guide
├── Caddyfile                      # Production Caddy v2 reverse proxy configuration
├── docker-compose.yml             # Full-stack production docker-compose configuration
├── .env.example                   # Production environment variables template
├── AGENTS.md                      # AI agent rules & architectural conventions
└── Makefile                       # Root automation commands
```

---

## 🧩 Bounded Contexts (Feature Modules)

| Phân hệ (Track) | Bounded Context | Backend Source (`backend/src/modules/`) | Frontend Route (`frontend/src/app/`) |
| :--- | :--- | :--- | :--- |
| **Catalog & Discovery** | `catalog` | `modules/catalog/` | `/courses`<br>`/courses/[courseId]` |
| **Learning & Streaming** | `learning` | `modules/learning/` | `/learn/[courseId]`<br>`/my-learning` |
| **Assessments & Authoring** | `assessment` | `modules/assessment/` | `/assessments`<br>`/instructor`<br>`/ta` |
| **Discussion Forum** | `forum` | `modules/forum/` | `/forum` |
| **Identity & Authentication**| `identity` | `modules/identity/` | `/auth`<br>`/account-settings`<br>`/become-an-instructor` |
| **Certificates** | `certificate` | `modules/certificate/` | `/learner`<br>`/verify/[certId]` |
| **Notifications** | `notification` | `modules/notification/` | `/notifications` |
| **Organizations & Partners** | `partner` | `modules/partner/` | `/partner`<br>`/partners`<br>`/organizations`<br>`/admin` |
| **Payments & Aid** | `payment` | `modules/payment/` | `/payment`<br>`/my-purchases`<br>`/financial-aid` |

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed on your machine:
- **Docker Desktop** (with Docker Compose v2)
- **Node.js 20+** and [`pnpm`](https://pnpm.io/)
- **Python 3.13+**
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) (`pip install uv` or `curl -sSf https://astral.sh/uv/install.sh | sh`)
- [`buf` CLI](https://buf.build/docs/installation) *(optional, for compiling proto files locally)*

---

### 1. Environment Setup

Clone the repository:

```bash
git clone https://github.com/tianshi04/lms-ai-study-assistant.git
cd lms-ai-study-assistant
```

Create environment configuration files for both backend and frontend:

```bash
# Backend environment file
cp backend/.env.example backend/.env

# Frontend environment file
cp frontend/.env.example frontend/.env.local
```

> [!TIP]
> If you wish to use the **CopilotKit AI Study Assistant**, add your Google Gemini API key to `GOOGLE_API_KEY` in `frontend/.env.local`.

---

### 2. Generate API Stubs

Before running the application, compile the Protocol Buffers into typed Python and TypeScript stubs:

```bash
# Generate both Backend and Frontend stubs from root
make gen
```

*(Alternatively, run `make gen` inside `backend/` and `pnpm run gen` inside `frontend/`).*

---

### 3. Run Infrastructure Services (PostgreSQL, MinIO, Redis, OpenObserve)

Start the supporting infrastructure containers via Docker Compose:

```bash
cd backend
make infra
```

This starts:
- **PostgreSQL 17 (`pgvector`)**: `localhost:5432` (database: `coursera_lms`)
- **MinIO S3 Storage**: `localhost:9000` (Console UI: `http://localhost:9001`, user: `minio_admin`, pass: `minio_password123`)
- **Redis 7 Alpine**: `localhost:6379`
- **OpenObserve APM**: `http://localhost:5080` (Console user: `admin@coursera.local`, pass: `openobserve_password123`)

To view infrastructure container logs:
```bash
make infra-logs
```

---

### 4. Database Migrations & Initial Seeding

Run Alembic schema migrations and populate the database with sample courses, modules, lessons, quizzes, and default accounts:

```bash
cd backend

# 1. Run database migrations
make migrate

# 2. Seed database (Idempotent Upsert mode)
make seed

# Alternatively, Clean Reset mode (Truncates tables and re-seeds pristine catalog)
# make seed-reset
```

---

### 5. Default Seed Test Accounts

The seed script initializes standard accounts across all user roles (Default password for all seed accounts is `123456`):

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@coursera.ai` | `123456` | Platform administration, organization approvals, instructor verifications |
| **Instructor** | `instructor@coursera.ai` | `123456` | Course creation studio, module authoring, quiz & rubric design |
| **Teaching Assistant (TA)** | `ta@coursera.ai` | `123456` | Grading queues, assignment evaluation, forum moderation |
| **Partner Admin** | `partner@coursera.ai` | `123456` | University/Organization portal (Stanford, NEU, etc.), member management |
| **Learner (Default)** | `learner@coursera.ai` | `123456` | Course enrollment, video player, quizzes, peer reviews, certificates |

---

### 6. Start Development Servers

#### **Backend Server (Python Starlette + Uvicorn)**
In your backend terminal:

```bash
cd backend
make dev
```
The backend API server will start at `http://localhost:8000` with auto-reload.

#### **Frontend Server (Next.js 16)**
In a separate terminal:

```bash
cd frontend
pnpm install
pnpm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

### Running Full Stack via Docker Compose

To build and run the backend API container alongside infrastructure:

```bash
cd backend
make all
```

To stop containers:
```bash
make app-down     # Stop backend API container
make infra-down   # Stop infrastructure containers (preserves DB data)
make infra-clean  # Stop infrastructure containers and wipe volumes completely (-v)
```

---

### Production VPS Deployment

For deploying the complete application stack (Caddy Reverse Proxy, Auto SSL/TLS, Next.js Frontend, Python Backend, PostgreSQL, MinIO, Redis, OpenObserve) to an Ubuntu/Debian VPS:

1. Copy `.env.example` to `.env` in the project root.
2. Configure your `DOMAIN` (e.g., `lms.yourdomain.com`).
3. Run `docker compose up -d`.

For step-by-step production configuration, DNS mapping, and CI/CD pipelines, consult the complete [VPS Deployment Guide](docs/09_vps_deployment_guide.md).

---

## 🛠 Helper Commands & Scripts

### Root Commands (`Makefile`)

| Command | Description |
| :--- | :--- |
| `make help` | Display available root make commands |
| `make format-proto` | Format all Protobuf files in `proto/` in-place (`buf format proto -w`) |
| `make check-proto` | Check Protobuf formatting without modifying files (`buf format proto -d --exit-code`) |
| `make lint-proto` | Lint Protobuf definitions for style conventions (`buf lint proto`) |
| `make gen` | Generate API stubs for both backend (`backend/src/gen/`) and frontend (`frontend/src/gen/`) |

---

### Backend Commands (`backend/Makefile`)

| Command | Description |
| :--- | :--- |
| `make setup` | Install and sync Python dependencies (`uv sync`) |
| `make infra` | Start infrastructure containers (PostgreSQL 17, MinIO, Redis, OpenObserve) |
| `make infra-down` | Stop infrastructure containers (preserves DB volume data) |
| `make infra-clean` | Stop containers and wipe database volume completely (`down -v`) |
| `make infra-logs` | View real-time infrastructure container logs |
| `make app` | Build and start backend container in Docker |
| `make app-down` | Stop backend container |
| `make app-logs` | View backend container logs |
| `make all` | Build and start full stack containers |
| `make docker-build` | Build backend Docker image |
| `make gen` | Compile Protocol Buffers in `proto/` into `backend/src/gen/` |
| `make dev` | Start local Python Uvicorn development server with auto-reload (port 8000) |
| `make seed` | Seed database with sample catalog (Idempotent Upsert mode) |
| `make seed-reset` | Truncate database tables and re-seed clean initial catalog |
| `make migrate` | Run Alembic database migrations directly (`uv run alembic upgrade head`) |
| `make check-migrations` | Check for ungenerated ORM model changes or schema drift (`uv run alembic check`) |
| `make format` | Format backend Python code and auto-fix linting issues with Ruff |
| `make test` | Run Pytest test suite (including Ruff linting and `ty` type checking) |

---

### Frontend Commands (`frontend/package.json`)

| Command | Description |
| :--- | :--- |
| `pnpm run gen` | Compile Protocol Buffers in `proto/` into `frontend/src/gen/` |
| `pnpm run dev` | Start Next.js development server (port 3000) |
| `pnpm run lint` | Run Oxlint static code analysis |
| `pnpm run lint:fix` | Run Oxlint and automatically fix linting issues |
| `pnpm run format` | Format code with Oxfmt (`oxfmt --write .`) |
| `pnpm run fix` | Single command to auto-fix linting and format all code (`oxlint --fix && oxfmt --write .`) |
| `pnpm run type-check` | Fast standalone TypeScript type-checking (`tsc --noEmit`) |
| `pnpm run check` | Comprehensive quality check (type-check, lint, and format verification) |
| `pnpm run build` | Compile Next.js production build |
| `pnpm run start` | Start compiled Next.js production server |

---

### End-to-End (E2E) Testing (Playwright TS)

Run these commands from the `e2e/` directory:

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install Playwright testing framework dependencies |
| `npx playwright install` | Download Playwright browser binaries (Chromium, Firefox, WebKit) |
| `pnpm test` | Run critical E2E test suites (Learner, Instructor, Admin projects) |
| `pnpm run test:all` | Run complete cross-browser test suite |
| `pnpm run test:ui` | Run interactive Playwright UI Test Runner |
| `pnpm run test:headed` | Run Playwright E2E tests in visible browser window |
| `pnpm run test:debug` | Run Playwright E2E tests in step-by-step debug mode |
| `pnpm run test:report` | Display HTML test execution report |

---

## 📏 Development Rules & Conventions

All architectural guidelines, security protocols, database migration rules, and code quality conventions are centralized in [`AGENTS.md`](AGENTS.md). Key developer rules include:

- **Strict Protocol Ordering:** When modifying `.proto` files, always run `make format-proto` → `make lint-proto` → `make gen`.
- **Database Migration Rule:** Never skip migrations. ORM changes must immediately be followed by `uv run alembic revision --autogenerate`, `uv run alembic upgrade head`, and `make check-migrations`.
- **Zero-Legacy Refactoring:** Aggressively refactor and remove legacy fallbacks or unused parameters.
- **Frontend Quality:** Run `pnpm run fix` and `pnpm run check` prior to committing. All UI elements follow Vietnamese (`vi`) language standards, 3-tier Semantic Design Tokens, and Base UI primitives.
- **Backend Quality:** Run `make test` (Pytest + Ruff + Ty) before submitting pull requests.

---

## 📖 Documentation

Detailed specification documents are available in the [`docs/`](docs/) directory:

- [`docs/01_overview.md`](docs/01_overview.md) - Business overview, user personas (Admin, Instructor, Partner, Learner), and sequence diagrams.
- [`docs/02_user_stories.md`](docs/02_user_stories.md) - Detailed User Stories and Acceptance Criteria across all feature tracks.
- [`docs/03_functional_specifications.md`](docs/03_functional_specifications.md) - Functional specifications and ConnectRPC API service definitions.
- [`docs/04_business_rules.md`](docs/04_business_rules.md) - Comprehensive business rules (Honor Code, Grading thresholds, Financial Aid, Vector RAG parameters).
- [`docs/05_uat_test_cases.md`](docs/05_uat_test_cases.md) - User Acceptance Testing (UAT) scenarios and test scripts.
- [`docs/06_system_initialization_and_onboarding.md`](docs/06_system_initialization_and_onboarding.md) - System initialization, Super Admin setup, partner onboarding, and database seeding spec.
- [`docs/07_authentication_and_authorization_architecture.md`](docs/07_authentication_and_authorization_architecture.md) - 3-Layer Security Architecture (PBAC, multi-tenant SQL scope pushdown, and ReBAC matrix authorization).
- [`docs/08_copilotkit_ai_chatbot.md`](docs/08_copilotkit_ai_chatbot.md) - CopilotKit AI Study Assistant integration architecture & vector RAG workflows.
- [`docs/09_vps_deployment_guide.md`](docs/09_vps_deployment_guide.md) - Production VPS All-in-One Docker Stack deployment with Caddy reverse proxy, auto SSL/TLS, and CI/CD pipelines.
