# Barista Paws — Project Context

## Problem Statement

Barista Paws is a pet grooming/care business that currently uses physical paper forms to register customers and their pets. This project replaces that manual process with a digital platform: clients self-register and manage their own pet profiles and appointments, while admins get a dashboard to oversee all customers and their pets.

---

## Goals

1. Eliminate paper-based client/pet registration.
2. Give clients a self-service portal (profile, pets, appointments).
3. Give admins a dashboard to view, search, and manage all clients and their pets.
4. Mobile-first, touch-optimized UI — most customers will use their phones at the shop.

---

## User Roles

### Client (Customer)
- Self-register via public `/register` endpoint.
- View and edit their own profile (separate `/profile` page).
- CRUD their own pets (name, species, breed, age, weight, notes, photo).
- Schedule and manage their own appointments.
- Cannot see other clients' data.

### Admin
- Created internally (no public admin registration).
- CRUD all clients and their pets.
- View a dashboard with all clients and pets.
- Search/filter clients by name, pet name, or email.
- Access-level field (`i32`) for future granular permissions.

---

## Tech Stack

### Backend
- **Language:** Rust (stable)
- **Framework:** Axum (latest stable)
- **ORM/DB:** SQLx + PostgreSQL
- **Auth:** JWT (Bearer token) — created on login, verified via `AuthUser` extractor
- **File uploads:** Multipart — avatar for users, photo for pets; stored in `uploads/`
- **Config:** `.env` via `dotenvy` (`DATABASE_URL`, `API_PORT`, `JWT_SECRET`)

### Frontend
- **Build tool:** Vite (latest) — React + JavaScript only (no TypeScript)
- **Styling:** Tailwind CSS v4 with CSS custom properties
- **Routing:** React Router v7
- **Theme:** Dark mode first, light mode toggle — inspired by Barista Paws Facebook page (warm browns, soft creams, friendly pet-owner aesthetic)
- **Responsive:** Mobile + desktop; mobile drawer for sidebar, touch-optimized buttons/icons

---

## Backend Architecture

### Entry points
- `src/main.rs` — starts the server
- `src/app.rs` — builds `AppState` (DB pool), configures CORS, mounts router
- `src/lib.rs` — re-exports `AppState`

### Layered structure
```
src/
  routes/mod.rs       — all API route definitions
  handlers/           — HTTP layer (extract params → call repo → return JSON)
    auth_handlers.rs
    user_handlers.rs
    pet_handlers.rs
    upload_handlers.rs
  repository/         — raw sqlx queries, no business logic
    user_repo.rs
    pet_repo.rs
  models/             — DB row structs, request DTOs, response DTOs
    user.rs
    pet.rs
    api_response.rs   — ApiResponse<T> envelope: { success, message, data }
  auth/
    jwt.rs            — token creation/verification
    extractor.rs      — AuthUser axum extractor (rejects bad/missing tokens)
  state.rs            — AppState { PgPool }
  db/mod.rs           — pool init
```

### RBAC pattern
- No middleware-level role enforcement.
- Each handler checks `claims.role` and `claims.sub` (user UUID) against path params.
- Admins can access any user's resources; clients are restricted to their own `user_id`.

### Standard response envelope
```json
{ "success": true, "message": "...", "data": { ... } }
```

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/login` | No | — | Login, returns JWT |
| POST | `/api/clients` | No | — | Self-register as client |
| GET | `/api/auth/me` | Yes | any | Get own profile |
| GET | `/api/users` | Yes | admin | List all users |
| GET | `/api/users/:id` | Yes | admin or self | Get user by ID |
| PUT | `/api/users/:id` | Yes | admin or self | Update user profile |
| DELETE | `/api/users/:id` | Yes | admin | Delete user |
| PUT | `/api/users/:id/password` | Yes | admin or self | Change password |
| POST | `/api/users/:id/avatar` | Yes | admin or self | Upload avatar (multipart) |
| POST | `/api/users/:owner_id/pets` | Yes | admin or self | Create pet |
| GET | `/api/users/:owner_id/pets` | Yes | admin or self | List pets by owner |
| GET | `/api/pets/:id` | Yes | admin or self | Get pet by ID |
| PUT | `/api/pets/:id` | Yes | admin or self | Update pet |
| DELETE | `/api/pets/:id` | Yes | admin | Delete pet |
| POST | `/api/pets/:id/photo` | Yes | admin or self | Upload pet photo (multipart) |

> **Appointments endpoint not yet implemented** — next priority after frontend is stable.

---

## Database Schema

### Tables
- **`users`** — id (UUID PK), email, hashed_password, first_name, last_name, phone_number, address, avatar_url, created_at
- **`roles`** — id (i32 PK), name (`"admin"` | `"client"`)
- **`user_roles`** — user_id FK, role_id FK (junction)
- **`clients`** — user_id FK, vip_card_number
- **`admins`** — user_id FK, access_level (i32)
- **`pets`** — id (UUID PK), owner_id FK → users, name, species, breed, age, weight, notes, photo_url, created_at, updated_at

### Transactions
User creation atomically inserts into `users`, assigns a role in `user_roles`, and inserts into `clients` or `admins`.

### Migrations (in order)
1. `create_users_table`
2. `create_client_table`
3. `create_table_roles`
4. `create_table_user_roles`
5. `seed_data` — seeds default roles
6. `create_admins_table`
7. `create_pets_table`
8. `add_avatar_url_to_users`
9. `add_photo_url_to_pets`

---

## Frontend Architecture

### Route structure

**Client routes** (wrapped in `Navbar`):
| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | `HomeRedirect` | No | Landing page (unauthenticated) or redirect to dashboard (authenticated) |
| `/login` | `LoginPage` | No | Login form |
| `/register` | `RegisterPage` | No | Client self-registration |
| `/dashboard` | `ClientDashboard` | Yes | Pets list + appointments |
| `/profile` | `ProfilePage` | Yes | Profile view/edit + password change |

**Admin routes** (wrapped in `AdminLayout` with sidebar):
| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/admin/users` | `UsersPage` | Admin | All customers list with search |
| `/admin/users/:userId/pets` | `PetsPage` | Admin | Manage pets for a user |
| `/admin/users/:userId/edit` | `EditUserPage` | Admin | Edit user profile/password |

### File structure
```
frontend/src/
  App.jsx                 — root router, ProtectedRoute, HomeRedirect
  main.jsx                — entry point
  index.css               — global styles / Tailwind imports

  components/
    ui/                   — shared UI primitives (single source of truth)
      index.js            — barrel export
      Button.jsx          — 6 variants (primary, outline, ghost, destructive, link) + 6 sizes (xs, sm, md, lg, icon, full), supports `as` prop for Link
      Input.jsx           — styled input + Textarea export
      Label.jsx           — form label
      Card.jsx            — Card, CardHeader (title + action), CardBody
      Alert.jsx           — error/success alert banners
      Avatar.jsx          — user/pet avatar with fallback (sm, md sizes)
      LoadingState.jsx    — loading text + Skeleton export
      EmptyState.jsx      — "no results" centered message
    Logo.jsx              — BaristaPaws logo link (PawPrint icon + text)
    LogOutButton.jsx      — logout button using Button primitive
    Navbar.jsx            — top nav for client + admin-on-public-pages
    Sidebar.jsx           — DesktopSidebar, MobileDrawer, MobileTopBar
    AdminLayout.jsx       — admin layout wrapper (sidebar + main content)
    ThemeToggle.jsx       — dark/light mode toggle
    PetCard.jsx           — pet display card with photo upload
    PetForm.jsx           — add/edit pet form
    UserCard.jsx          — user card for admin listing (with pet chips)

  pages/
    LandingPage.jsx       — public landing / hero + features
    LoginPage.jsx         — login form
    RegisterPage.jsx      — client self-registration
    ClientDashboard.jsx   — pets section + appointments placeholder
    ProfilePage.jsx       — profile view/edit + avatar upload + password change
    UsersPage.jsx         — admin: all users list with search
    PetsPage.jsx          — manage pets for a user (admin back button)
    EditUserPage.jsx      — edit user profile + password (admin)

  lib/
    api.js                — centralized API client (auto-injects token, handles 401)
    AuthContext.jsx        — auth state provider (token + user in localStorage)
    utils.js              — cn() utility (clsx wrapper)
```

### UI component system

All visual primitives live in `components/ui/`. Every page and component imports from there. To change a button style, input style, card layout, alert appearance, etc. — edit **one file**.

Key patterns:
- `Button` supports rendering as `<Link>` via `as={Link}` prop
- `Card` + `CardHeader` + `CardBody` compose section containers
- `Alert` returns `null` when children is falsy (safe to always render)
- `LoadingState` for text-based loading, `Skeleton` for pulse placeholders

### Layout structure

**Client view:**
- Top navbar with: Logo, Home link, Profile link, user name, Log Out, ThemeToggle
- Mobile: hamburger menu with same links
- Clean vertical flow — no sidebar

**Admin view:**
- Collapsible desktop sidebar with: Logo, user name, ThemeToggle, Log Out, nav items
- Mobile: drawer overlay + top bar with hamburger
- Sidebar links: All Customers (future: Appointments, Reports)
- User cards show: avatar, name, email, phone, role badge, edit/delete buttons, pet chips, Manage Pets button

### Theme & UX
- Dark mode first (`dark:` Tailwind classes throughout)
- Colors via CSS custom properties (--color-primary, --color-foreground, etc.)
- Friendly, minimal — avoid clinical/corporate feel
- Touch-optimized: minimum 44px tap targets, icon buttons with labels on mobile
- Components always in separate files — no co-located component definitions

---

## What's Not Yet Built

- **Appointments** — backend endpoints and frontend UI (next major feature)
- **Admin dashboard metrics** — pet count, appointment summary cards
- **Notification system** — appointment reminders
- **Admin: Create admin accounts** — currently manual DB insertion

---

## Development Notes

- Run backend: `cargo run` from project root
- Run frontend: `cd frontend && npm run dev`
- Apply migrations: `sqlx migrate run`
- Both services run concurrently during development; frontend proxies `/api` to backend port from `.env`
- File uploads land in `uploads/` at project root; served statically
