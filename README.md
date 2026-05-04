# Barista Paws

A pet management platform for a pet grooming/care business — replacing paper-based client and pet registration with a digital self-service portal for clients and an admin dashboard for staff.

- **Backend:** Rust (Axum + SQLx + PostgreSQL), JWT auth
- **Frontend:** React 19 + Vite + Tailwind CSS v4 + React Router v7

---

## Features

### Clients
- Self-register and log in
- View/edit profile, upload avatar
- Change password
- CRUD their own pets (name, species, breed, age, weight, notes, photo)
- Schedule and manage appointments

### Admins
- Dashboard with all clients and their pets
- Search/filter clients by name, pet name, or email
- CRUD any client account or pet
- Edit user profiles and reset passwords
- Manage appointment time slots

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Rust (Axum 0.8), SQLx 0.8, Tokio |
| Database | PostgreSQL |
| Auth | JWT (Bearer) via `jsonwebtoken`, bcrypt password hashing |
| File uploads | Axum multipart, served from `uploads/` |
| Frontend | React 19, React Router v7, Tailwind CSS v4, Vite |
| Icons | lucide-react |

---

## Project Structure

```
barista_paws/
├── src/                    # Rust backend
│   ├── main.rs             # Entry point
│   ├── app.rs              # Server bootstrap, CORS, router
│   ├── state.rs            # AppState (PgPool)
│   ├── routes/             # Route definitions (auth, users, pets, appointments, timeslots)
│   ├── handlers/           # HTTP layer
│   ├── repository/         # SQLx queries
│   ├── models/             # DB rows + request/response DTOs
│   ├── auth/               # JWT + AuthUser extractor
│   ├── appointments/       # Appointment domain logic
│   └── db/                 # Connection pool init
├── migrations/             # SQLx migrations
├── frontend/               # React + Vite app
│   └── src/
│       ├── App.jsx
│       ├── components/     # UI primitives, navbar, sidebar, cards
│       ├── pages/          # Landing, Login, Register, Dashboard, Profile, Admin
│       └── lib/            # api client, AuthContext, utils
├── uploads/                # User-uploaded avatars and pet photos
├── context/                # Project specs and standards
└── Cargo.toml
```

---

## Prerequisites

- Rust (stable, edition 2024)
- PostgreSQL
- Node.js 18+ and npm
- [`sqlx-cli`](https://crates.io/crates/sqlx-cli): `cargo install sqlx-cli --no-default-features --features postgres`

---

## Setup

### 1. Clone and configure environment

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost/barista_paws
API_PORT=3000
JWT_SECRET=<your-secret>
```

### 2. Set up the database

```bash
createdb barista_paws
sqlx migrate run
```

### 3. Run the backend

```bash
cargo run
```

The API will be available at `http://localhost:3000`.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will start (default port `5173`) and proxy `/api` calls to the backend.

---

## Backend Commands

```bash
cargo build            # Build
cargo run              # Run server
cargo test             # Run tests
cargo check            # Compile-check only
cargo clippy           # Lint
sqlx migrate run       # Apply migrations
sqlx migrate revert    # Revert last migration
```

## Frontend Commands

```bash
npm run dev            # Dev server (with --host)
npm run build          # Production build
npm run lint           # ESLint
npm run preview        # Preview production build
```

---

## API Overview

All responses use the envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
```

### Public

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/clients` | Self-register as a client |

### Authenticated

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | any | Get own profile |
| GET | `/api/users` | admin | List all users |
| GET | `/api/users/:id` | admin or self | Get user |
| PUT | `/api/users/:id` | admin or self | Update user |
| DELETE | `/api/users/:id` | admin | Delete user |
| PUT | `/api/users/:id/password` | admin or self | Change password |
| POST | `/api/users/:id/avatar` | admin or self | Upload avatar (multipart) |
| POST | `/api/users/:owner_id/pets` | admin or self | Create pet |
| GET | `/api/users/:owner_id/pets` | admin or self | List pets by owner |
| GET | `/api/pets/:id` | admin or self | Get pet |
| PUT | `/api/pets/:id` | admin or self | Update pet |
| DELETE | `/api/pets/:id` | admin | Delete pet |
| POST | `/api/pets/:id/photo` | admin or self | Upload pet photo (multipart) |

Appointment and time-slot routes are mounted under `/api/appointments` and `/api/timeslots`.

### Auth

Send the JWT as a Bearer token:

```
Authorization: Bearer <token>
```

---

## Architecture Notes

- **Layered backend:** `routes` → `handlers` (HTTP) → `repository` (SQLx) → `models`. No business logic in repositories.
- **RBAC** is enforced inside each handler by checking `claims.role` and `claims.sub` against path params — there is no middleware-level role check.
- **User creation** runs in a database transaction: insert into `users`, assign role in `user_roles`, and insert into the role-specific table (`clients` or `admins`).
- **Frontend UI primitives** all live under `frontend/src/components/ui/` — change a button or card style in one place and it propagates everywhere.
- **Theme:** dark-mode-first with a light toggle, mobile-first responsive layouts.

For full project context, see [`context/project-spec.md`](context/project-spec.md), [`context/usecase-diagram.md`](context/usecase-diagram.md), and [`context/coding-standards.md`](context/coding-standards.md).

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Core account (id, email, hashed_password, name, phone, address, avatar_url) |
| `roles` | Role definitions (`admin`, `client`) |
| `user_roles` | User ↔ role junction |
| `clients` | Client-specific fields (vip_card_number) |
| `admins` | Admin-specific fields (access_level) |
| `pets` | Pet records linked to an owner user |
| `appointments` | Scheduled appointments |

---

## Roadmap

- Admin dashboard metrics (pet counts, appointment summaries)
- Notification system for appointment reminders
- Admin account creation flow (currently manual DB insert)
