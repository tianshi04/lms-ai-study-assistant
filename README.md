# Coursera LMS Platform (AI-Assisted Learning Assistant)

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith%20%2B%20DDD-blue)](https://github.com/tianshi04/lms-ai-study-assistant)
[![Backend](https://img.shields.io/badge/Backend-Python%203.12%2B%20%7C%20FastAPI%20%7C%20ConnectRPC-green)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019%20%7C%20Tailwind%20v4-black)](frontend/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2017%20pgvector-blueviolet)](backend/docker-compose.yml)
[![Protocol](https://img.shields.io/badge/API-ConnectRPC%20%2F%20Protobuf-orange)](proto/)

A state-of-the-art **Coursera-style Online Learning Management System (LMS)** built with a **Modular Monolith architecture** following **Domain-Driven Design (DDD)** principles. The platform features an integrated **Coursera AI Coach** powered by Retrieval-Augmented Generation (RAG) using PostgreSQL 17 `pgvector`, providing interactive, Socratic self-learning assistance.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
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
  - [Backend Commands (Makefile)](#backend-commands-makefile)
  - [Frontend Commands (NPM)](#frontend-commands-npm)
- [Development Rules & Conventions](#-development-rules--conventions)
- [Documentation](#-documentation)

---

## ✨ Key Features

- 🎓 **Structured Learning Hierarchy:** Specialization → Course → Module/Week → Lesson → Learning Items.
- 🎥 **Interactive Video Player:** Supports VTT subtitles, scrolling interactive transcripts, in-video quiz checkpoints, and light/dark theme adaptation.
- 📊 **Dynamic Learning Progress:** Automatic video completion tracking (completes at $\ge 80\%$ watch time), lesson checkboxes, real-time course percentage progress, and flexible deadline resetting.
- 🤖 **Coursera AI Coach (Socratic RAG):** Context-aware AI assistant utilizing video transcript embeddings stored in PostgreSQL `pgvector` to explain concepts, summarize content, and query course material.
- 📝 **Assessments & Auto-Grading:** Practice quizzes, graded exams (pass grade threshold, cooldowns), auto-graded coding lab sandboxes, and rubric-based peer reviews.
- 💬 **Lesson-Level Discussion Forums:** In-context discussion threads with staff answer pinning, upvoting/downvoting, and moderation.
- 📜 **Financial Aid & Verified Certificates:** Financial Aid application workflow (150-word essay submission) and public verified digital certificates with shareable QR codes / OpenBadges.

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
                  │  │ AI Coach │ Identity  │ Certificate  │ │
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

## 🛠 Technology Stack

### **Backend (Python)**
- **Runtime:** Python 3.12+
- **API Protocol:** ConnectRPC (`@connectrpc/connect`) compiled via Protocol Buffers
- **ORM & Database:** Async SQLAlchemy, Alembic for schema migrations
- **Package Management:** [`uv`](https://github.com/astral-sh/uv) (fast Python package installer)
- **Code Quality:** `ruff` (linter & formatter), `ty` (static type checker), `pytest` (test suite)

### **Frontend (TypeScript)**
- **Framework:** Next.js 16 (App Router) & React 19
- **API Client:** Connect-ES v2.0 (`@connectrpc/connect-web` / `@bufbuild/protobuf`)
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
│   │   ├── modules/          # Bounded contexts (catalog, learning, assessment, etc.)
│   │   │   ├── catalog/      # Course catalog bounded context
│   │   │   ├── learning/     # Video player & progress tracking bounded context
│   │   │   ├── assessment/   # Quizzes & peer review bounded context
│   │   │   ├── ai_coach/     # Vector RAG & AI tutor bounded context
│   │   │   ├── identity/     # User identity & financial aid bounded context
│   │   │   └── certificate/  # Certificate verification bounded context
│   │   ├── shared/           # Shared kernel (Base Entity, Value Object, DB Session)
│   │   ├── main.py           # Uvicorn server entrypoint
│   │   └── seed.py           # Database seeding script (Upsert & Reset modes)
│   ├── tests/                # Pytest test suite & code quality tests
│   ├── Dockerfile            # Container build spec
│   ├── Makefile              # Automation helper commands
│   └── pyproject.toml        # Project dependencies (managed via uv)
├── frontend/                 # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/              # App router pages (/courses, /learn, /assessments, etc.)
│   │   ├── components/       # Reusable UI component library
│   │   └── gen/              # Auto-generated TypeScript stubs (DO NOT EDIT)
│   └── package.json          # NPM package specification
├── proto/                    # Central Protocol Buffer shared contracts
│   ├── ai_coach/             # AI Coach RPC schemas
│   ├── assessment/           # Assessment & Quiz RPC schemas
│   ├── catalog/              # Catalog & Course RPC schemas
│   ├── certificate/          # Certificate verification RPC schemas
│   ├── forum/                # Discussion forum RPC schemas
│   ├── identity/             # Identity & Financial Aid RPC schemas
│   └── learning/             # Learning progress RPC schemas
├── docs/                     # Architectural & Business specifications
└── SPRINT_PLAN.md            # Sprint execution roadmap
```

---

## 🧩 Bounded Contexts (Feature Modules)

| Phân hệ (Track) | Bounded Context | Backend Source (`backend/src/modules/`) | Frontend Route (`frontend/src/app/`) |
| :--- | :--- | :--- | :--- |
| **Catalog & Learning** | `catalog`, `learning` | `modules/catalog/`<br>`modules/learning/` | `/courses`<br>`/learn/[courseId]` |
| **Assessments** | `assessment` | `modules/assessment/` | `/assessments`<br>`/peer-review` |
| **Coursera AI Coach** | `ai_coach`, `forum` | `modules/ai_coach/`<br>`modules/forum/` | `/forum`<br>Widget AI Coach (Video player) |
| **Identity & Certificates**| `identity`, `certificate` | `modules/identity/`<br>`modules/certificate/` | `/auth`<br>`/financial-aid`<br>`/verify/[certId]` |

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed on your machine:
- **Docker Desktop** (with Docker Compose v2)
- **Node.js 20+** and `npm`
- **Python 3.12+**
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

### Backend Commands (`backend/Makefile`)

Run these commands from the `backend/` directory:

| Command | Description |
| :--- | :--- |
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
| `npm run lint` | Run ESLint check across the frontend codebase |
| `npm run build` | Compile and build Next.js application for production |

---

## 📏 Development Rules & Conventions

To maintain code quality and architectural integrity across the repository, all contributors must adhere to the following rules:

1. **Contract-First Development:**
   - Always update Protocol Buffer definitions in `proto/` first.
   - **Never manually edit code inside generated directories (`backend/src/gen/` or `frontend/src/gen/`).** Always run `make gen` and `npm run gen`.

2. **Domain-Driven Design (DDD) Boundaries:**
   - Modules inside `backend/src/modules/` must not import directly from another module's private internal directories (`application`, `infrastructure`, `presentation`). Inter-module communication occurs via defined interfaces or events.
   - Domain logic inside `domain/` must remain pure Python without external ORM or framework dependencies.

3. **Database Migration Synchronization:**
   - Whenever SQLAlchemy ORM models in `infrastructure/` are modified, generate an Alembic migration script inside `backend/` using:
     ```bash
     uv run alembic revision --autogenerate -m "<migration_description>"
     ```

4. **Package Management Discipline:**
   - **Backend:** Add Python dependencies exclusively via `uv add <package>` inside `backend/`. Do not edit `pyproject.toml` or `uv.lock` manually.
   - **Frontend:** Add Node dependencies exclusively via `npm install <package>` inside `frontend/`. Do not edit `package.json` manually.

5. **Code Style & Verification:**
   - Format and lint Python code before committing (`make format`).
   - Ensure all unit tests, Ruff linting, and `ty` type checks pass (`make test`).

---

## 📖 Documentation

Detailed specification documents are available in the [`docs/`](docs/) directory:

- [`docs/01_overview.md`](docs/01_overview.md) - Business overview, user personas (Admin, Instructor, Partner, Learner), and sequence diagrams.
- [`docs/02_user_stories.md`](docs/02_user_stories.md) - Detailed User Stories and Acceptance Criteria across all 4 feature tracks.
- [`docs/03_functional_specifications.md`](docs/03_functional_specifications.md) - Detailed functional specifications and API endpoints.
- [`docs/04_business_rules.md`](docs/04_business_rules.md) - Business rules (Honor Code, Grading, Financial Aid, Vector RAG parameters).
- [`docs/05_uat_test_cases.md`](docs/05_uat_test_cases.md) - User Acceptance Testing (UAT) scenarios and test scripts.
