# Coding Standards

## Rust + Axum
- Use stable Rust (latest stable toolchain)
- Prefer explicit types at boundaries (API, DB), inference internally
- Avoid unwrap() in production code → use proper error handling
- Use Result<T, E> and ? operator consistently
- Use thiserror or anyhow for error management
- Enforce formatting with cargo fmt
- Lint with cargo clippy (no warnings allowed)

## Web Framework
- Use Axum for all HTTP handling
- Keep handlers thin (delegate logic to services)
- Use extractors (Json, Path, Query, State) properly
- Return typed responses (Json<T>, StatusCode, etc.)
- Use middleware for cross-cutting concerns (auth, logging)

## React
- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused — one job per component
- Extract reusable logic into custom hooks
- Make sure components are reusable
- Make sure to use reusable components first before making a new one

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive in `index.css`
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

## Frontend Component Architecture

### UI Primitives (`components/ui/`)
- All shared visual primitives live in `components/ui/`
- Barrel-exported via `components/ui/index.js`
- Import as: `import { Button, Input, Label, Card, Alert } from '../components/ui'`
- **To change a style globally, edit the single UI primitive file — never duplicate styles inline**

### Component guidelines
- Each component gets its own file (no multi-component files)
- Use UI primitives (Button, Input, Label, Card, Alert, Avatar, LoadingState, EmptyState) instead of inline Tailwind for common patterns
- Button variants: `primary`, `outline`, `ghost`, `destructive`, `link`
- Button sizes: `xs`, `sm`, `md`, `lg`, `icon`, `full`
- Use `as={Link}` on Button for router navigation with button styling
- Card + CardHeader + CardBody for section containers
- Alert returns null when empty — safe to always render

## File Organization

### Backend
```
src/
  routes/     — API route definitions
  handlers/   — HTTP layer
  repository/ — raw sqlx queries
  models/     — DB row structs, DTOs
  auth/       — JWT, extractor
  state.rs    — AppState
  db/         — pool init
```

### Frontend
```
frontend/src/
  components/ui/  — shared UI primitives (Button, Input, Label, Card, Alert, Avatar, LoadingState, EmptyState)
  components/     — feature components (Logo, LogOutButton, Navbar, Sidebar, PetCard, PetForm, UserCard, etc.)
  pages/          — route-level page components
  lib/            — utilities (api client, auth context, utils)
```

## Naming

### Frontend
- Components: PascalCase (`PetCard.jsx`)
- Files: Match component name
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

### Backend
- Use appropriate Rust naming conventions (snake_case for functions/variables, PascalCase for types)

## Styling
- Tailwind CSS for all styling
- Use UI primitives from `components/ui/` for buttons, inputs, labels, cards, alerts, avatars, loading states
- No inline styles
- Dark mode first, light mode as option
- CSS custom properties via `--color-*` pattern

## Database
- PostgreSQL
- SQLx for queries
- Transactions for multi-table operations

## Code Quality
- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
