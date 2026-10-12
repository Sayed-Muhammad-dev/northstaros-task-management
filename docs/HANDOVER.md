# NorthstarOS handover

NorthstarOS is a locally verified React team workspace with a Node 24 API and SQLite persistence. It adds collaboration evidence to the portfolio alongside commerce, finance and mobile work. Sample workspace records and public marketing examples are labelled demonstrations. No public deployment has been performed.

## What the application supports

- Registration, sign-in, protected routes, logout and authenticated password changes. Salted scrypt hashes and opaque HTTP-only sessions remain on the server.
- Multiple private workspaces, actual owner/member permissions, email-bound invitation links, role management and last-owner protection. Owners copy invitation links manually; an email service is not connected.
- Projects, tasks, priorities, due dates, assigned members, subtasks, comments, current-month calendars and Kanban movement through drag/drop or keyboard controls.
- Saved messages, per-user notification read state, profile and workspace settings. Messages are persisted; there is no WebSocket or live-presence service.
- Reports calculated from stored records, protected CSV downloads, printable reports, audit history and an owner-only operational JSON export.
- Responsive layouts, labelled forms, modal keyboard focus, light/dark appearance, loading/error states and reduced-motion support.

## Start the application

Use Node 24. Install packages with `npm ci`, then run `npm run build`. The build produces the frontend in `dist/` and the server in `.server/`.

```powershell
$env:APP_ORIGIN = 'http://127.0.0.1:5347'
$env:API_PORT = '5347'
npm.cmd run start
```

Open `http://127.0.0.1:5347`. Register your own account to create an isolated workspace with clearly labelled sample records. There is no public default administrator password. The ignored `.app-data/browser-demo.json` contains only the private local QA identity; do not upload it or include it in a client package.

For frontend development, run `npm run dev` on port 5345 and `npm run api` on 5346 with `APP_ORIGIN=http://127.0.0.1:5345`. See [backend.md](backend.md) for the exact environment and security contract.

## Storage and hosting

`DATABASE_FILE` defaults to `.app-data/northstar.sqlite`. Users, memberships, sessions and invitations use relational tables; business records use a revisioned JSON column within each workspace row. Transactions and revision checks prevent stale requests from overwriting newer changes. Foreign keys, prepared statements and workspace ownership checks protect the data boundaries.

A production host needs Node 24, HTTPS, a durable writable volume and a process manager. Build before packaging; the runtime needs `.server/`, `dist/`, package files and production dependencies. Keep databases, session records, exports, `.env` and QA credentials private. Environment files were not modified for this implementation.

SQLite is unsuitable for this application's ephemeral Vercel serverless deployment. The server rejects Vercel startup before opening the local database. A PostgreSQL/Neon adapter has not been implemented here. Do not deploy the old static-only `vercel.json` and expect authenticated persistence to work.

The HTTP JSON export is a redacted operational export, not a raw database backup or restore feature. Use a consistent SQLite backup procedure; never copy only a live database file without considering its WAL/SHM files.

## Verification and remaining services

Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`. [QA.md](QA.md) records actual local browser runs; [backend.md](backend.md) documents the HTTP/database checks. Local tests do not establish production connectivity, physical-device execution, a complete accessibility certification or load capacity.

Email delivery, uploads/object storage, paid billing, account recovery, two-factor authentication, third-party integrations, cloud storage and database restore remain unconfigured. The interface states these limits instead of reporting false success. Connect and verify the required services before a commercial handover that depends on them.

## Portfolio publication

The project is added to the local full-stack portfolio catalogue and reviewed media drafts. Its original screenshots and illustrative device cover show the running implementation with sample data. It remains outside the four homepage featured slots. In the portfolio admin, import the reviewed project drafts and screenshots, inspect the before/after preview, then publish the selected changes. No production CMS records or deployment were changed automatically.
