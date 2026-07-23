# Project Custom Rules & Conventions

This file provides rules, architectural conventions, and workspace instructions for AI agents working on this project.

---

## 1. Project Architecture (DDD & Modular Monolith)
- We follow the **Modular Monolith** pattern using **Domain-Driven Design (DDD)** principles.
- The backend source code is located in `backend/src/`.
- All modules/bounded contexts reside inside `backend/src/modules/` (e.g., `catalog`, `learning`).
- Every module must maintain strict DDD layer boundaries:
  - **`domain/`**: Pure Python containing entities, value objects, domain events, and repository interfaces. **No external framework or database dependencies.**
  - **`application/`**: Use Case coordinators executing domain actions.
  - **`presentation/`**: Network-specific code (e.g., ConnectRPC stubs handlers).
- Common/shared utilities and base abstractions (like base `Entity` and `ValueObject`) reside in the Shared Kernel: `backend/src/shared/`.
- **No direct internal coupling**: Modules must not import from another module's internal directories (`application`, `infrastructure`, `presentation`).
- **Database & Alembic Migration Synchronization**: Whenever SQLAlchemy ORM models (located in module `infrastructure/` directories) are created or modified, an Alembic migration script **MUST** be generated (e.g. `uv run alembic revision --autogenerate -m "<description>"`) inside the `backend/` directory so that database schema migrations are strictly synchronized with ORM definitions.
- **Database Seeding Isolation & Idempotency Rules**:
  - Domain Repositories and Infrastructure Repositories MUST remain completely clean of hardcoded seed/fixture data.
  - All database seeding logic MUST be isolated inside dedicated CLI scripts (`backend/src/seed.py`, `make seed`).
  - `src/seed.py` supports two modes: **Upsert Mode** (`make seed`, safe `session.merge()`) and **Reset Mode** (`make seed-reset`, `TRUNCATE CASCADE`).
  - Whenever adding or modifying initial seed data, always update `backend/src/seed.py`.

---

## 2. API Design & Stubs Generation
- We use **ConnectRPC** for API communication.
- Original `.proto` definitions are placed in the root `proto/` directory as a shared API contract layer.
- Auto-generated stubs are compiled into:
  - Backend: `backend/src/gen/`
  - Frontend: `frontend/src/gen/`
- **Never modify code inside generated folders manually.** Always update the `.proto` files and run the generation scripts.
- The `src/gen/` folders are ignored in Git.
- We use **Connect-ES v2.0** on the frontend (utilizing `protoc-gen-es` only, where both messages and service schemas are generated directly in `_pb.ts` files without a separate `_connect.ts` stub).
- **Development Stage & Backward Compatibility**: Since the project is currently in active initial development, API definitions and code structures can be refactored or modified freely without preserving backward compatibility.
- **Authentication & User Identity Resolution Rule**:
  - **Never trust or extract `user_id` directly from Protobuf request payloads** for authenticated RPC operations.
  - All protected ConnectRPC service handlers **MUST** resolve the authenticated user strictly from context using `require_current_user()` (from `src.shared.auth`).
  - Request-level JWT token verification and `CurrentUser` context injection is handled centrally by `AuthInterceptor` (`src.shared.infrastructure.interceptors.AuthInterceptor`).


---

## 3. Package Management & Dependencies Rule
- **Backend (Python)**: Dependencies **MUST** be added via `uv` CLI command (`uv add <package>`) inside the `backend/` directory. **Never edit `pyproject.toml` or `uv.lock` manually.**
- **Frontend (TypeScript)**: Dependencies **MUST** be added via `npm` CLI command (`npm install <package>`) inside the `frontend/` directory. **Never edit `package.json` manually.**

---

## 4. Code Quality, Type Checking & Testing
- **Standard Libraries & Wheel-Reinvention Rule**:
  - **Prefer Ecosystem & Standard Libraries**: Always leverage battle-tested standard libraries (e.g. `hmac`/`passlib` for security/hash comparisons, `Starlette` for ASGI/CORS middleware, `Pydantic` for schema validation) instead of writing custom home-grown wrappers or byte-level helpers.
  - **Audit Before Implementation**: Before writing custom helper utility classes, custom ASGI middlewares, or manual AST static filters, search the codebase and standard ecosystem first. Avoid implementing custom solutions for problems already solved by standard libraries.
- **Backend (Python)**:
  - **Linter & Formatter**: We use `ruff` for code styling, sorting imports, and linting.
  - **Type Checker**: We use `ty` (Astral's Rust-powered static type checker) for type checking.
  - **Testing**: We use `pytest` and `pytest-asyncio` for unit, integration, and code quality tests.
  - Code quality tests are located in `backend/tests/test_code_quality.py`. These tests execute `ruff` and `ty` checks during the test run to ensure style consistency.
- **Frontend (TypeScript)**:
  - **Linter**: We use **ESLint** for code quality. The generated `src/gen/` folder is globally ignored from ESLint.
  - **Type Checker & Compiler**: Built-in Next.js typescript compiler check during `npm run build`.
- **End-to-End Testing (Playwright TS)**:
  - Full-system blackbox E2E tests reside in the root `/e2e` workspace following the Page Object Model (POM) architecture.
  - **Navigation Strategy Rule**:
    - **UI Click Navigation**: Use for Critical User Journeys (verifying Navbar links, registration, and router navigation flow).
    - **Direct URL Navigation (`page.goto('/path')`)**: Use for Isolated Page & Feature Deep-Testing (leveraging pre-authenticated `storageState` from `auth.setup.ts` to skip redundant clicks and maximize execution speed).



---

## 5. Frontend Architecture & Conventions
- The frontend is located in `frontend/` and built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS v4**.
- Styling is implemented using Tailwind CSS v4 utility classes.
- **Headless UI Primitives & Accessibility (WAI-ARIA)**: We use **Base UI (`@base-ui/react`)** for complex unstyled interactive UI components (such as `Modal/Dialog`, `Tabs`, `DropdownMenu`, `Select`). Always leverage Base UI primitives wrapped with Tailwind CSS v4 styling to ensure standard keyboard navigation and WAI-ARIA accessibility without reinventing unstyled component logic.
- **UI Icons & Aesthetics**: Always use clean, professional inline SVG vector icons instead of text-emoji characters in all UI components and pages.
- **Headless Logic Ecosystem (TanStack Ecosystem)**: We leverage the **TanStack Ecosystem** for all headless logic across the application:
  - **TanStack Query (`@tanstack/react-query`)**: For headless server state management, automatic caching, background revalidation, and deduplication of ConnectRPC API calls. Place reusable query/mutation hooks inside `frontend/src/lib/query_hooks.ts`.
  - **TanStack Table (`@tanstack/react-table`)**: For headless table state, sorting, filtering, and pagination in complex dashboards and data views.
  - **TanStack Form (`@tanstack/react-form`)**: For headless form validation and state management in multi-step or complex form interfaces.
- API Client calls are made by importing service schemas from the generated stubs (e.g. `import { CatalogService } from "@/gen/catalog/v1/catalog_pb"`) and using the `@connectrpc/connect` client.

---

## 6. Helper Commands Reference

### Backend (from `backend/` directory):
- `make infra` - Start infrastructure containers (PostgreSQL pgvector & MinIO).
- `make infra-down` - Stop infrastructure containers (preserves DB volume data).
- `make infra-clean` - Stop containers & wipe database volumes completely (-v).
- `make infra-logs` - View infrastructure logs.
- `make app` - Build & start backend API container in Docker.
- `make app-down` - Stop backend API container.
- `make app-logs` - View backend API container logs.
- `make all` - Start full stack containers (Postgres, MinIO, Backend).
- `make gen` - Regenerate Python stubs from root `proto/` directory.
- `make dev` - Start local Python dev server with auto-reload (port 8000).
- `make seed` - Seed database with initial sample courses (Idempotent Upsert mode).
- `make seed-reset` - Truncate all tables and re-seed pristine initial catalog.
- `make format` - Format code and fix auto-fixable lint issues with Ruff.
- `make test` - Run pytest suite (which also executes Ruff linting and Ty type checking).


### Frontend (from `frontend/` directory):
- `npm run gen` - Regenerate TypeScript stubs from root `proto/` directory.
- `npm run dev` - Start Next.js development server (port 3000).
- `npm run lint` - Run ESLint checks.
- `npm run build` - Compile and build Next.js application for production.


### E2E Testing (from `e2e/` directory):
- `npm test` - Fast local E2E test run on Chromium browser.
- `npm run test:all` - Run full cross-browser test suite (Chromium, Firefox, WebKit, Mobile Chrome).
- `npm run test:ui` - Open interactive Playwright UI Test Runner.
- `npm run test:report` - Show HTML test execution report.

---

## 7. Documentation & Code Synchronization Rule
- **Strict Code-Documentation Synchronization**: Whenever business logic, domain entities, RPC APIs, permission checks, workflow limits, or mathematical formulas are created, updated, or refactored in the codebase, the corresponding documentation in `docs/` **MUST** be updated in the same change to maintain 100% synchronization.
- **Documentation Audit Requirement**: Agents and developers must verify that no new business rules or logic alterations are introduced into code without corresponding updates in `docs/`.


