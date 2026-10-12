# NorthstarOS — Projects, Tasks & Team Collaboration

An existing React task-management interface extended into a full-stack workspace application, preserving its neutral/navy design, Kanban board, responsive navigation and motion language.

Accounts, workspace memberships and operational records are stored by a Node 24 API. Registration creates an isolated workspace with clearly labelled sample projects; new workspaces start empty. The public product examples are illustrative, not claims about real customers or revenue.

## Implemented capabilities

- Real registration, sign-in, logout, protected routes and authenticated password changes.
- Multiple workspaces, actual owner/member roles and manually shared, exact-email-bound invitations.
- Persistent projects, tasks, subtasks, assignments, comments, Kanban movement and date-based calendar views.
- Saved messages, individual notification read state, profile and workspace settings.
- Current-data reports, protected CSV downloads, printable reports, audit history and private operational exports.
- Keyboard alternatives to drag/drop, labelled forms, focus-managed modals, reduced motion and responsive light/dark layouts.

## Stack and storage

React 18, TypeScript 6, Vite 8, React Router 7, Tailwind CSS 4, Framer Motion, Lucide, Node 24 and Zod. SQLite stores relational authentication/membership records and revisioned workspace state. Transactions and compare-and-swap revisions reject stale writes; this is not a browser-only or JSON-file database.

## Run locally

Use Node 24, then run `npm ci` and `npm run build`.

```powershell
$env:APP_ORIGIN = 'http://127.0.0.1:5347'
$env:API_PORT = '5347'
npm.cmd run start
```

Open http://127.0.0.1:5347 and register an account. The API serves both production assets and protected routes. Development uses Vite on 5345 with `/api` proxied to the API on 5346.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Scope and deployment

This implementation is local. No public URL, cloud database connection, email service, payment provider, file storage, WebSocket presence, two-factor service or password-recovery provider is claimed. Invitations are copied manually. The UI identifies unavailable service features.

Production requires a durable Node host and HTTPS. The server refuses ephemeral Vercel SQLite startup; the prototype static Vercel configuration cannot host the backend. PostgreSQL/Neon and automated database restore have not been implemented. Existing environment files and live deployments were not changed.

Read [the handover](docs/HANDOVER.md), [backend/security contract](docs/backend.md), [HTTP contract](server/CONTRACT.md) and [actual browser QA](docs/QA.md) before hosting or transferring the application.
