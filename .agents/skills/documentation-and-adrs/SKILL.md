---
name: documentation-and-adrs
description: Records decisions and documentation. Use when making architectural decisions, changing public APIs, shipping features, or when you need to record context that future engineers and agents will need to understand the codebase.
source: https://github.com/tianshi04/backend-template
---

# Documentation and ADRs

## Overview

Document decisions, not just code. The most valuable documentation captures the *why* — the context, constraints, and trade-offs that led to a decision. Code shows *what* was built; documentation explains *why it was built this way* and *what alternatives were considered*. This context is essential for future humans and agents working in the codebase.

## When to Use

- Making a significant architectural decision
- Choosing between competing approaches
- Adding or changing a public API
- Shipping a feature that changes user-facing behavior
- Onboarding new team members (or agents) to the project
- When you find yourself explaining the same thing repeatedly

**When NOT to use:** Don't document obvious code. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

## Architecture Decision Records (ADRs)

ADRs capture the reasoning behind significant technical decisions. They're the highest-value documentation you can write.

### When to Write an ADR

- Choosing a framework, library, or major dependency
- Designing a data model or database schema
- Selecting an authentication strategy
- Deciding on an API architecture (gRPC vs. REST vs. GraphQL)
- Choosing between build tools, hosting platforms, or infrastructure
- Any decision that would be expensive to reverse

### ADR Template

Store ADRs in `docs/decisions/` with sequential numbering:

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Date
2026-06-29

## Context
We need a primary database for the task management application. Key requirements:
- Relational data model (users, tasks, teams with relationships)
- ACID transactions for task state changes
- Support for full-text search on task content
- Managed hosting available

## Decision
Use PostgreSQL with GORM ORM.

## Alternatives Considered

### MongoDB
- Pros: Flexible schema, easy to start with
- Cons: Our data is inherently relational; would need to manage relationships manually
- Rejected: Relational data in a document store leads to complex joins or data duplication

### SQLite
- Pros: Zero configuration, embedded, fast for reads
- Cons: Limited concurrent write support
- Rejected: Not suitable for multi-user web application in production

## Consequences
- GORM provides type-safe database access and automigrate
- Team needs PostgreSQL knowledge
```

### ADR Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```
- Don't delete old ADRs. They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.

## Inline Documentation

### When to Comment
Comment the **why**, not the **what**:

```go
// BAD: Restates the code
// Increment counter by 1
counter++

// GOOD: Explains non-obvious intent
// Rate limit uses a sliding window — reset counter at window boundary,
// not on a fixed schedule, to prevent burst attacks at window edges
if now.Sub(windowStart) > windowSize {
	counter = 0
	windowStart = now
}
```

### When NOT to Comment

```go
// Don't comment self-explanatory code
func CalculateTotal(items []CartItem) float64 {
	var total float64
	for _, item := range items {
		total += item.Price * float64(item.Quantity)
	}
	return total
}

// Don't leave TODO comments for things you should just do now
// TODO: add error handling  ← Just add it

// Don't leave commented-out code
// oldImplementation()  ← Delete it, git has history
```

## API Documentation

For public APIs, services, and interfaces:

### Interface Documentation Conventions

Follow idiomatic documentation standards for the target language. Docstrings and comments for exported interfaces, types, or methods should be simple, natural paragraphs that explain the purpose, constraints, and behavior. Do NOT write verbose, boilerplate parameter or return lists (such as `@param` or custom listings) unless strictly required by the language tooling. Keep comments high-level and focused on intent.

```
// RegisterUser hashes the password and registers a new user in the system.
// It returns the newly registered user details, or an error if validation fails.
function RegisterUser(user) {
    // ...
}
```


## Documentation for Agents

Special consideration for AI agent context:

- **AGENTS.md / rules files** — Document project conventions so agents follow them
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps

## Verification

After documenting:

- [ ] ADRs exist for all significant architectural decisions
- [ ] Public interfaces and methods are clearly documented explaining their purpose and behavior
- [ ] Known gotchas are documented inline where they matter
- [ ] No commented-out code remains
- [ ] Rules files (AGENTS.md etc.) are current and accurate
