# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Barista Paws is a pet management REST API built with Rust (Axum + SQLx + PostgreSQL), with a React/Vite/Tailwind frontend.

For full project context, refer to the files in `context/`:
- [`context/project-spec.md`](context/project-spec.md) — Problem statement, goals, user roles, full tech stack, API endpoints, DB schema, frontend architecture, and what's not yet built.
- [`context/usecase-diagram.md`](context/usecase-diagram.md) — Mermaid use case diagram covering all 23 use cases across Client and Admin actors, with live/planned status.

-For ai interaction context, refer to the files in `context/`:
- [`context/ai-interaction.md`](context/ai-interaction.md)or 


For coding standard context, refer to the files in `context/`:
- [`context/coding-standards.md`](context/coding-standards.md)

## Environment Setup

Requires a `.env` file in the project root:
```
DATABASE_URL=postgresql://<user>:<password>@localhost/barista_paws
API_PORT=3000
JWT_SECRET=<secret>
```

## Backend Commands

```bash
# Build
cargo build

# Run the server
cargo run

# Run tests
cargo test

# Run a single test
cargo test <test_name>

# Check for compile errors without building
cargo check

# Run linter
cargo clippy

# Apply database migrations (uses sqlx-cli)
sqlx migrate run

# Revert last migration
sqlx migrate revert
```

## Frontend Commands (from `frontend/`)

```bash
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Architecture

### Backend (`src/`)

Layered architecture with clear separation:

- **`app.rs`** — Server bootstrap: connects DB pool, builds `AppState`, configures CORS, mounts router.
- **`routes/mod.rs`** — Single router function defining all API endpoints. Public routes (login, client registration) vs protected routes are distinguished here by whether handlers use the `AuthUser` extractor.
- **`handlers/`** — HTTP layer. Extracts path/query params, calls repository functions, returns `(StatusCode, Json)`.
- **`repository/`** — Database layer. Raw `sqlx` queries against PostgreSQL. No business logic.
- **`models/`** — Structs for DB rows (`sqlx::FromRow`), request DTOs (`Deserialize`), and response DTOs (`Serialize`). `ApiResponse<T>` is the standard envelope: `{ success, message, data }`.
- **`auth/`** — JWT creation/verification (`jwt.rs`) and the `AuthUser` Axum extractor (`extractor.rs`). `AuthUser` is added as a handler parameter to require authentication — it rejects missing/invalid Bearer tokens automatically.
- **`state.rs`** — `AppState` holds the `PgPool` and is passed to all handlers via Axum's `State` extractor.
- **`db/mod.rs`** — Database connection pool initialization using `dotenvy` + `sqlx`.

### RBAC Pattern

Authorization is role-based (`admin` vs `client`) and enforced inside handlers by checking `claims.role` and `claims.sub` (the authenticated user's UUID) against path parameters. There is no middleware-level RBAC — each handler does its own access check.

### Database Schema

Tables: `users`, `clients`, `admins`, `roles`, `user_roles`, `pets`. User creation uses database transactions (`user_repo`) to atomically insert into `users`, assign a role in `user_roles`, and insert into the role-specific table (`clients` or `admins`).

### Frontend (`frontend/`)

React 19 + React Router v7 + Tailwind CSS v4 + Vite. Communicates with the backend API at the port defined in `.env`.
