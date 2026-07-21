# Project Custom Rules & Conventions

This file provides rules, architectural conventions, and workspace instructions for AI agents working on this project.

---

## 1. Project Architecture (DDD & Modular Monolith)
- We follow the **Modular Monolith** pattern using **Domain-Driven Design (DDD)** principles.
- The backend source code is located in `backend/src/`.
- All modules/bounded contexts reside inside `backend/src/modules/` (e.g., `greet`).
- Every module must maintain strict DDD layer boundaries:
  - **`domain/`**: Pure Python containing entities, value objects, domain events, and repository interfaces. **No external framework or database dependencies.**
  - **`application/`**: Use Case coordinators executing domain actions.
  - **`presentation/`**: Network-specific code (e.g., ConnectRPC stubs handlers).
- Common/shared utilities and base abstractions (like base `Entity` and `ValueObject`) reside in the Shared Kernel: `backend/src/shared/`.
- **No direct internal coupling**: Modules must not import from another module's internal directories (`application`, `infrastructure`, `presentation`).

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

---

## 3. Code Quality, Type Checking & Testing
- **Backend (Python)**:
  - **Linter & Formatter**: We use `ruff` for code styling, sorting imports, and linting.
  - **Type Checker**: We use `ty` (Astral's Rust-powered static type checker) for type checking.
  - **Testing**: We use `pytest` and `pytest-asyncio` for unit, integration, and code quality tests.
  - Code quality tests are located in `backend/tests/test_code_quality.py`. These tests execute `ruff` and `ty` checks during the test run to ensure style consistency.
- **Frontend (TypeScript)**:
  - **Linter**: We use **ESLint** for code quality. The generated `src/gen/` folder is globally ignored from ESLint.
  - **Type Checker & Compiler**: Built-in Next.js typescript compiler check during `npm run build`.

---

## 4. Frontend Architecture & Conventions
- The frontend is located in `frontend/` and built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS v4**.
- Styling is implemented using Tailwind CSS v4 utility classes.
- API Client calls are made by importing service schemas from the generated stubs (e.g. `import { GreetService } from "@/gen/greet/v1/greet_pb"`) and using the `@connectrpc/connect` client.

---

## 5. Helper Commands Reference

### Backend (from `backend/` directory):
- `make infra` - Start infrastructure containers (PostgreSQL pgvector & MinIO).
- `make gen` - Regenerate Python stubs from root `proto/` directory.
- `make dev` - Start local Python dev server with auto-reload (port 8000).
- `make format` - Format code and fix auto-fixable lint issues with Ruff.
- `make test` - Run pytest suite (which also executes Ruff linting and Ty type checking).

### Frontend (from `frontend/` directory):
- `npm run gen` - Regenerate TypeScript stubs from root `proto/` directory.
- `npm run dev` - Start Next.js development server (port 3000).
- `npm run lint` - Run ESLint checks.
- `npm run build` - Compile and build Next.js application for production.
