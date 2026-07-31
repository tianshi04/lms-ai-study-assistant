# Coursera LMS Platform (AI-Assisted Learning Assistant)

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith%20%2B%20DDD-blue)](https://github.com/tianshi04/lms-ai-study-assistant)
[![Backend](https://img.shields.io/badge/Backend-Python%203.13%2B%20%7C%20Starlette%20%7C%20ConnectRPC-green)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019%20%7C%20Tailwind%20v4-black)](frontend/)
[![Security](https://img.shields.io/badge/Security-3--Layer%20PBAC%20%2B%20SQL%20Scope%20Pushdown-red)](#-3-layer-security-protocol)
[![AI Assistant](https://img.shields.io/badge/AI%20Assistant-CopilotKit%20v2-purple)](frontend/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2017%20pgvector-blueviolet)](backend/docker-compose.yml)
[![Protocol](https://img.shields.io/badge/API-ConnectRPC%20%2F%20Protobuf-orange)](proto/)

A state-of-the-art **Coursera-style Online Learning Management System (LMS)** built with a **Modular Monolith architecture** following **Domain-Driven Design (DDD)** principles and a **3-Layer Security Architecture**.

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
  - [3. Run Infrastructure (PostgreSQL pgvector & MinIO)](#3-run-infrastructure-postgresql-pgvector--minio)
  - [4. Seed Initial Data](#4-seed-initial-data)
  - [5. Start Development Servers](#5-start-development-servers)
  - [Running via Docker Compose](#running-via-docker-compose)
- [Helper Commands & Scripts](#-helper-commands--scripts)
  - [Root Commands (Makefile)](#root-commands-makefile)
  - [Backend Commands (Makefile)](#backend-commands-makefile)
  - [Frontend Commands (NPM)](#frontend-commands-npm)
  - [End-to-End (E2E) Testing](#end-to-end-e2e-testing-e2epackagejson)
- [Development Rules & Conventions](#-development-rules--conventions)
- [Documentation](#-documentation)

---

## ✨ Key Features

- 🎓 **Structured Learning Hierarchy:** Specialization → Course → Module/Week → Lesson → Learning Items.
- 🏢 **Multi-Tenant Organization & Partner Scoping:** Organization Admin (`ORG OWNER`) role management, partner organization onboarding, instructor application submission & approval portal, and course organization binding.
- 🔒 **3-Layer Security Architecture:** Method-level policy declaration `(auth.v1.policy)`, PostgreSQL SQL scope pushdown (`apply_organization_scope`), and strict domain resource ownership verification (`enforce_course_ownership`).
- 🎥 **Interactive Video Player & Transcripts:** VTT subtitle support, scrolling interactive transcript panel with jump-to-timestamp capabilities, in-video quiz checkpoints, and light/dark theme adaptation.
- 📊 **Dynamic Learning Progress:** Automatic video completion tracking ($\ge 80\%$ watch time), lesson checkboxes, real-time course percentage progress, and flexible deadline resetting.
- 📝 **Assessments & Auto-Grading:** Practice quizzes, graded exams (pass grade threshold, cooldowns), auto-graded coding lab sandboxes, and rubric-based peer reviews.
- 💳 **Payments & Subscriptions:** Course purchase checkout, subscription management, and financial aid application processing (150-word essay submission workflow).
- 💬 **Lesson-Level Discussion Forums:** In-context discussion threads with staff answer pinning, upvoting/downvoting, and moderation.
- 📜 **Verified Certificates:** Public verified digital certificates with shareable QR codes / OpenBadges validation.
- 🤖 **AI-Assisted Learning Assistant:** Integrated CopilotKit v2 with vector RAG search over course materials powered by PostgreSQL `pgvector`.

---

## 🏗 System Architecture

The project follows a **Contract-First Modular Monolith** pattern:

```
                  ┌──────────────────────────────────────────┐
                  │          Next.js Frontend (App Router)   │
                  │       (TypeScript + Connect-ES v2.0)     │
                  └────────────────────┬─────────────────────┘
                                       │ ConnectRPC / HTTP2
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │       Python Backend API (Uvicorn)       │
                  │   Modular Monolith & DDD Layering        │
                  │                                          │
                  │  ┌──────────┬───────────┬──────────────┐ │
                  │  │ Catalog  │ Learning  │ Assessment   │ │
                  │  ├──────────┼───────────┼──────────────┤ │
                  │  │ Forum    │ Identity  │ Certificate  │ │
                  │  ├──────────┼───────────┼──────────────┤ │
                  │  │ Partner  │ Payment   │              │ │
                  │  └──────────┴───────────┴──────────────┘ │
                  └────────┬─────────────────────┬───────────┘
                           │                     │
                           ▼                     ▼
              ┌────────────────────────┐  ┌──────────────────┐
              │ PostgreSQL 17 pgvector │  │ MinIO S3 Storage │
              └────────────────────────┘  └──────────────────┘
```

Each backend module enforces strict DDD layer separation:
- **`domain/`**: Pure Python domain entities, value objects, domain events, and repository interfaces. Free of framework or database dependencies.
- **`application/`**: Use case handlers orchestrating domain logic.
- **`infrastructure/`**: Database persistence (SQLAlchemy Async ORM models, Alembic migrations, MinIO client).
- **`presentation/`**: ConnectRPC service handlers serving client requests.

---

## 🔐 3-Layer Security Protocol

The system enforces a strict 3-layer authorization model across all API endpoints:

1. **Layer 1 — API Policy & Context Injection (`AuthInterceptor`):**
   Every ConnectRPC service method in `.proto` explicitly declares its access policy using `(auth.v1.policy)` (`AUTH_POLICY_PUBLIC`, `AUTH_POLICY_AUTHENTICATED`, `AUTH_POLICY_ADMIN`, `AUTH_POLICY_INTERNAL`). `AuthInterceptor` verifies the JWT token, resolves caller identity, extracts the `x-organization-id` header (fallback to token claim), and injects `CurrentUserContext`.

2. **Layer 2 — Database SQL Scope Pushdown (`apply_organization_scope`):**
   Organization-scoped entity queries automatically execute `apply_organization_scope(stmt, Model, current_user)` at the repository layer. Multi-tenant filtering (`WHERE organization_id = active_org_id OR organization_id = INTERNAL_SYSTEM_ORG_ID`) is pushed directly down to the PostgreSQL execution plan. In-memory filtering is strictly prohibited.

3. **Layer 3 — Domain Ownership & State Verification:**
   Application Use Cases verify resource ownership (`owner_id`, `co_instructor_ids`) via `enforce_course_ownership()`, enforce lifecycle state restrictions (e.g. `PENDING_REVIEW` read-only lock), and check granular permissions via `CurrentUserContext`.

---

## 🛠 Technology Stack

### **Backend (Python)**
- **Runtime:** Python 3.13+
- **API Protocol:** ConnectRPC (`@connectrpc/connect`) compiled via Protocol Buffers
- **ORM & Database:** Async SQLAlchemy 2.0, Alembic for schema migrations
- **Security & Authorization:** `AuthInterceptor`, Custom Policy Registry, SQL Scope Pushdown (`apply_organization_scope`)
- **Package Management:** [`uv`](https://github.com/astral-sh/uv) (fast Python package installer)
- **Code Quality:** `ruff` (linter & formatter), `ty` (static type checker), `pytest` (test suite)

### **Frontend (TypeScript)**
- **Framework:** Next.js 16 (App Router) & React 19
- **API Client:** Connect-ES v2.0 (`@connectrpc/connect-web` / `@bufbuild/protobuf`)
- **AI Assistant:** CopilotKit v2 (`@copilotkit/react-core`, `@copilotkit/runtime`)
- **UI Primitives:** Base UI (`@base-ui/react`) for accessible unstyled components
- **State & Data Management:** TanStack Query (`@tanstack/react-query`), TanStack Table, TanStack Form
- **Styling:** Tailwind CSS v4 & `next-themes` (Dark/Light mode)
- **Package Manager:** `npm`

### **Infrastructure & API Schema**
- **Database:** PostgreSQL 17 with `pgvector` extension for vector similarity search
- **Storage:** MinIO S3-compatible object storage
- **API Specification:** Protocol Buffers (`proto/`) managed via [`buf`](https://buf.build/)
- **Containerization:** Docker & Docker Compose

---

## 📁 Project Directory Structure

```
.
├── backend/                  # Python backend application
│   ├── alembic/              # Async database migration scripts
│   ├── src/
│   │   ├── gen/              # Auto-generated Python ConnectRPC stubs (DO NOT EDIT)
│   │   ├── modules/          # Bounded contexts
│   │   │   ├── catalog/      # Course catalog & hierarchy bounded context
│   │   │   ├── learning/     # Video player & progress tracking bounded context
│   │   │   ├── assessment/   # Quizzes & peer review bounded context
│   │   │   ├── forum/        # Discussion forum bounded context
│   │   │   ├── identity/     # Identity, auth & instructor applications context
│   │   │   ├── certificate/  # Certificate verification bounded context
│   │   │   ├── partner/      # Organization & partner management bounded context
│   │   │   └── payment/      # Payments & subscriptions bounded context
│   │   ├── shared/           # Shared kernel (Auth, Scope Pushdown, Base Entity, DB)
│   │   ├── main.py           # Uvicorn server entrypoint & RequestIDMiddleware
│   │   └── seed.py           # Database seeding script (Upsert & Reset modes)
│   ├── tests/                # Pytest test suite & code quality tests
│   ├── Dockerfile            # Container build spec
│   ├── Makefile              # Automation helper commands
│   └── pyproject.toml        # Project dependencies (managed via uv)
├── frontend/                 # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/              # App router pages (/courses, /learn, /partner, /instructor, /admin, etc.)
│   │   ├── components/       # Reusable UI component library (Base UI + Tailwind v4)
│   │   ├── lib/              # ConnectRPC client & TanStack Query hooks
│   │   └── gen/              # Auto-generated TypeScript stubs (DO NOT EDIT)
│   └── package.json          # NPM package specification
├── e2e/                      # Playwright End-to-End test suite (Page Object Model)
├── proto/                    # Central Protocol Buffer shared contracts
│   ├── assessment/           # Assessment & Quiz RPC schemas
│   ├── auth/                 # Custom Auth policy options schema
│   ├── catalog/              # Catalog & Course RPC schemas
│   ├── certificate/          # Certificate verification RPC schemas
│   ├── forum/                # Discussion forum RPC schemas
│   ├── identity/             # Identity & Instructor Application RPC schemas
│   ├── learning/             # Learning progress RPC schemas
│   ├── partner/              # Organization & Partner RPC schemas
│   └── payment/              # Payment & Subscription RPC schemas
├── docs/                     # Architectural & Business specifications
└── AGENTS.md                 # Agent rules & architectural conventions
```

---

## 🧩 Bounded Contexts (Feature Modules)

| Phân hệ (Track) | Bounded Context | Backend Source (`backend/src/modules/`) | Frontend Route (`frontend/src/app/`) |
| :--- | :--- | :--- | :--- |
| **Catalog & Learning** | `catalog`, `learning` | `modules/catalog/`<br>`modules/learning/` | `/courses`<br>`/learn/[courseId]`<br>`/my-courses` |
| **Assessments & Authoring** | `assessment` | `modules/assessment/` | `/assessments`<br>`/peer-review`<br>`/instructor` |
| **Discussion Forum** | `forum` | `modules/forum/` | `/forum` |
| **Identity & Certificates**| `identity`, `certificate` | `modules/identity/`<br>`modules/certificate/` | `/auth`<br>`/financial-aid`<br>`/certificates`<br>`/verify/[certId]` |
| **Organization & Partners**| `partner` | `modules/partner/` | `/partner`<br>`/partners`<br>`/admin` |
| **Payment & Subscriptions**| `payment` | `modules/payment/` | `/checkout`<br>`/subscriptions` |

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed on your machine:
- **Docker Desktop** (with Docker Compose v2)
- **Node.js 20+** and `npm`
- **Python 3.13+**
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) (`pip install uv` or `curl -sSf https://astral.sh/uv/install.sh | sh`)
- [`buf` CLI](https://buf.build/docs/installation) *(optional, for compiling proto files locally)*

---

### 1. Environment Setup

Clone the repository and inspect the environment variable template:

```bash
git clone https://github.com/tianshi04/lms-ai-study-assistant.git
cd lms-ai-study-assistant
```

Create `.env` file inside `backend/` if required (or copy from `.env.example`):

```bash
cp backend/.env.example backend/.env
```

---

### 2. Generate API Stubs

Before running the application for the first time, generate the ConnectRPC code stubs from the `proto/` definitions:

```bash
# Generate Python backend stubs
cd backend
make gen

# Generate TypeScript frontend stubs
cd ../frontend
npm run gen
```

---

### 3. Run Infrastructure (PostgreSQL pgvector & MinIO)

Start the PostgreSQL 17 database container with `pgvector` enabled and MinIO object storage:

```bash
cd backend
make infra
```

To view infrastructure logs:
```bash
make infra-logs
```

---

### 4. Seed Initial Data

Populate the database with initial sample courses, modules, lessons, and video metadata:

```bash
cd backend

# Upsert mode (Idempotent: inserts or updates existing records safely)
make seed

# Alternatively, Clean Reset mode (Truncates tables and re-seeds pristine catalog)
# make seed-reset
```

---

### 5. Start Development Servers

#### **Backend Server (Python Uvicorn)**
From the `backend/` directory:

```bash
cd backend
make dev
```
The backend API server will start at `http://localhost:8000`.

#### **Frontend Server (Next.js)**
In a separate terminal, from the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

### Running via Docker Compose

To run the complete application stack (Postgres, MinIO, Backend) inside Docker containers:

```bash
cd backend
make all
```

To stop all running Docker containers:
```bash
make app-down
# or to stop infrastructure as well:
make infra-down
```

---

## 🛠 Helper Commands & Scripts

### Root Commands (`Makefile`)

Run these commands from the root directory:

| Command | Description |
| :--- | :--- |
| `make help` | Display available root make commands |
| `make format-proto` | Format all Protobuf files in `proto/` in-place (`buf format proto -w`) |
| `make check-proto` | Check Protobuf formatting without modifying files (`buf format proto -d --exit-code`) |
| `make lint-proto` | Lint Protobuf definitions for style conventions (`buf lint proto`) |
| `make gen` | Generate API stubs for both backend (`backend/src/gen/`) and frontend (`frontend/src/gen/`) |

---

### Backend Commands (`backend/Makefile`)

Run these commands from the `backend/` directory:

| Command | Description |
| :--- | :--- |
| `make setup` | Install and sync Python dependencies (`uv sync`) |
| `make infra` | Start infrastructure containers (PostgreSQL 17 `pgvector` & MinIO) |
| `make infra-down` | Stop infrastructure containers (preserves DB volume data) |
| `make infra-clean` | Stop containers and wipe database volume completely (`down -v`) |
| `make infra-logs` | View real-time infrastructure container logs |
| `make app` | Build and start backend container in Docker |
| `make app-down` | Stop backend container |
| `make app-logs` | View backend container logs |
| `make all` | Build and start full stack containers (Postgres, MinIO, Backend API) |
| `make gen` | Compile Protocol Buffers in `proto/` into `backend/src/gen/` |
| `make dev` | Start local Python Uvicorn development server with auto-reload (port 8000) |
| `make seed` | Seed database with sample courses (Idempotent Upsert mode) |
| `make seed-reset` | Truncate database tables and re-seed clean initial catalog |
| `make format` | Format backend Python code and auto-fix linting issues with Ruff |
| `make test` | Run Pytest test suite (including Ruff linting and `ty` type checking) |

---

### Frontend Commands (`frontend/package.json`)

Run these commands from the `frontend/` directory:

| Command | Description |
| :--- | :--- |
| `npm run gen` | Compile Protocol Buffers in `proto/` into `frontend/src/gen/` |
| `npm run dev` | Start Next.js development server (port 3000) |
| `npm run lint` | Run ESLint static code analysis (`--max-warnings=0`) |
| `npm run lint:fix` | Run ESLint and automatically fix linting issues |
| `npm run type-check` | Run fast standalone TypeScript type-checking (`tsc --noEmit`) |
| `npm run check` | Run comprehensive check (type-check + lint) |
| `npm run build` | Compile Next.js production build |

---

### End-to-End (E2E) Testing (`e2e/package.json`)

Run these commands from the `e2e/` directory:

| Command | Description |
| :--- | :--- |
| `npm install` | Install Playwright testing framework dependencies |
| `npx playwright install` | Download Playwright browser binaries (Chromium, Firefox, WebKit) |
| `npm test` | Run full blackbox E2E test suite in headless mode |
| `npm run test:all` | Run full cross-browser test suite |
| `npm run test:ui` | Run Playwright test runner with interactive UI |
| `npm run test:report` | Show HTML test execution report |

---

## 📏 Development Rules & Conventions

All architectural guidelines, security protocols, database migration rules, and development conventions are centralized in [`AGENTS.md`](AGENTS.md). Please refer to [`AGENTS.md`](AGENTS.md) for full details before contributing or modifying the codebase.

---

## 📖 Documentation

Detailed specification documents are available in the [`docs/`](docs/) directory:

- [`docs/01_overview.md`](docs/01_overview.md) - Business overview, user personas (Admin, Instructor, Partner, Learner), and sequence diagrams.
- [`docs/02_user_stories.md`](docs/02_user_stories.md) - Detailed User Stories and Acceptance Criteria across all feature tracks.
- [`docs/03_functional_specifications.md`](docs/03_functional_specifications.md) - Detailed functional specifications and API endpoints.
- [`docs/04_business_rules.md`](docs/04_business_rules.md) - Business rules (Honor Code, Grading, Financial Aid, Vector RAG parameters).
- [`docs/05_uat_test_cases.md`](docs/05_uat_test_cases.md) - User Acceptance Testing (UAT) scenarios and test scripts.
