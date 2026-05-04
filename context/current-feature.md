# Current Feature

## Status

Completed

## Goals

Frontend refactor — extract shared UI primitives into reusable components so styles can be changed in one place.

## Notes

Completed 2026-04-18.

## History

### 2026-04-18: Frontend UI Refactor
- Created `components/ui/` with 8 shared primitives: Button, Input, Label, Card, Alert, Avatar, LoadingState, EmptyState
- Extracted Logo and LogOutButton into separate component files (removed shared.jsx)
- Updated all 8 pages and 5 components to use UI primitives instead of inline styles
- Added `/profile` route — moved profile section from ClientDashboard to its own page
- Navbar: renamed "My Dashboard" to "Home", added "Profile" link, added "Log Out" text to all logout buttons
- Admin: added back button on PetsPage, added pet list chips + Manage Pets button on UserCard
- Logged-in users visiting `/` are redirected to dashboard (admin → `/admin/users`, client → `/dashboard`)
- Build passes, all functionality preserved
