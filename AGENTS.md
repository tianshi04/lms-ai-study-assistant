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
- Original `.proto` definitions are placed in `backend/proto/`.
- Auto-generated stubs are compiled into `backend/src/gen/`.
- **Never modify code inside `backend/src/gen/` manually.** Always update the `.proto` files and run the generation script.
- The `src/gen/` folder is ignored in Git.

---

## 3. Code Quality, Type Checking & Testing
- **Linter & Formatter**: We use `ruff` for code styling, sorting imports, and linting.
- **Type Checker**: We use `ty` (Astral's Rust-powered static type checker) for type checking.
- **Testing**: We use `pytest` and `pytest-asyncio` for unit, integration, and code quality tests.
- Code quality tests are located in `backend/tests/test_code_quality.py`. These tests execute `ruff` and `ty` checks during the test run to ensure style consistency.

---

## 4. Helper Commands Reference (Makefile)
Always use the following shortcuts from the `backend/` directory:
- `make gen` - Regenerate protobuf and ConnectRPC stubs from `.proto` files.
- `make dev` - Start local development server with auto-reload.
- `make format` - Format code and fix auto-fixable lint issues with Ruff.
- `make test` - Run pytest suite (which also executes Ruff linting and Ty type checking).
