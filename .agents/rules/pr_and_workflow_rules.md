# Global Workflow & Quality Rules

## 1. Strict PR Scope Isolation
- Every Pull Request MUST contain ONLY changes directly relevant to its stated title and objective.
- NEVER allow code or configuration bleed (pollution) from parallel features or other branches into a PR.
- Always run `git diff main --stat` and inspect changed files before pushing to ensure zero irrelevant files are committed.

## 2. DX & Makefile Ergonomics First
- ALWAYS provide clean, 1-line shortcuts in `Makefile` for all common operations (e.g., `make seed-demo`, `make dev`, `make test`).
- NEVER force the user to type long, verbose CLI commands when a Makefile target can encapsulate it.

## 3. Preservation & Reusability (Audit Before Creating)
- NEVER modify hardcoded values, established architecture contracts, or fixed configuration settings unless explicitly instructed by the user.
- NEVER create new helpers, functions, classes, or files if equivalent logic/utilities already exist in the codebase. Always audit existing code first and reuse existing implementations.
- Do NOT write speculative code or dead functions.
