# NorthstarOS backend: running, security, and verification

This is a local full-stack Node 24 application with a durable SQLite database. The HTTP implementation lives in `server/`; the exact frontend request/response contract is `server/CONTRACT.md`, with response types in `server/contracts.ts`. `server/app.ts` exports `createServer({databasePath?, origin?, distPath?, serveStatic?})`, which returns `{server, db, close}`. Call `server.listen()` separately; tests use port zero and temporary database files.

## Development

Install the repository dependencies with `npm ci`. Use Node **24.13 or later in the Node 24 line** with the built-in `node:sqlite`. SQLite currently emits Node's experimental-feature warning.

In a PowerShell terminal from the repository root:

```powershell
$env:DATABASE_FILE = '.app-data/northstar.sqlite'
$env:API_PORT = '5346'
$env:APP_ORIGIN = 'http://127.0.0.1:5345'
npm run api
```

Run the parent's Vite frontend on `http://127.0.0.1:5345` in another terminal. Its `/api` proxy targets port 5346. `APP_ORIGIN` is the **browser-facing origin**, even when the backend receives an internal localhost URL. `localhost` and `127.0.0.1` are different origins; do not alternate them. Configuration is read from the process environment. The server does not edit or automatically load `.env`; a shell or process manager must supply its values.

`DATABASE_FILE` defaults to `.app-data/northstar.sqlite` relative to the working directory. `API_PORT` defaults to 5346 and accepts `PORT` as a secondary host-provider fallback. `API_HOST` defaults to `127.0.0.1`; set it to `0.0.0.0` only when a host/reverse proxy needs external access. No public default owner or credentials exist. Registration creates the real user, an isolated owned workspace, and clearly labelled Sample projects/tasks assigned to that user's actual ID. A later `POST /api/workspaces` creates an empty workspace.

## Production packaging and persistence

The parent build runs TypeScript, Vite, and `scripts/build-server.mjs`. The latter creates the Node 24 ESM server artifact `.server/index.mjs` with external runtime packages and a production environment banner. `npm start` runs that artifact with Node, without needing the development-only `tsx` package. Keep **`.server/`, `dist/`, `package.json`, the lockfile, and installed runtime dependencies** on a Node host; `npm ci --omit=dev` installs the production dependencies. Build with development dependencies present before creating the runtime package.

Example environment for a reverse-proxied durable host:

```text
NODE_ENV=production
API_HOST=127.0.0.1
API_PORT=5346
APP_ORIGIN=https://tasks.example.com
DATABASE_FILE=/persistent/northstar/northstar.sqlite
```

`APP_ORIGIN` is required in production. Use HTTPS at the browser-facing reverse proxy; the session cookie gets `Secure` when the configured origin uses HTTPS. The default server bind is local and may be kept local behind the proxy. Use the process manager's working directory containing `dist/`. Do not include `.env`, SQLite files, WAL/SHM files, backups, or invitation/session secrets in build artifacts or public assets. Keep the database directory readable/writable only by the server account.

SQLite needs a persistent volume, including its `-wal` and `-shm` companions during operation. Moving a live `.sqlite` file alone is not a safe backup. Use a consistent SQLite backup procedure, or stop the server cleanly before copying its persistent directory. The owner-only HTTP JSON export is a redacted operational export, not a raw SQLite backup and not an implemented restore mechanism.

`VERCEL` causes database startup to fail **before** opening SQLite. The prototype `vercel.json` static configuration does not host this backend. Ephemeral/serverless deployment, shared network filesystem concurrency, PostgreSQL/Neon, and cloud database connectivity have not been integrated or verified. No deployment was performed.

## Stored data and concurrency

Users, password hashes, workspaces, memberships, sessions, invitations, schema versions, and rate guards use relational SQLite tables with foreign keys and uniqueness/check constraints. Business state is a JSON **column inside a relational workspace row**, with an integer revision and timestamp; there is no JSON file database. All SQL parameters use prepared statements. WAL, foreign keys, full synchronous durability, and a ten-second busy timeout are enabled.

State mutations acquire `BEGIN IMMEDIATE`, revalidate the actual session and membership inside the transaction, compare the submitted revision, validate references, and commit the complete next state/revision. Separate processes are serialized by SQLite. A stale request returns `409 {error:'State changed. Refresh and retry.',revision:<current>}` and rolls back. The client must reload and let the user retry; it must not silently replay the previous patch. Invitations and role changes also increment the workspace revision. Send `X-Workspace-Id` with state reads/writes and owner operations so stale tabs are rejected after selecting another workspace.

Projects can only reference actual workspace members; task assignees must also belong to their project's member list. Validated dates reject rollover dates such as February 31. Subtask IDs must belong to the same task. Deleting a project removes its tasks, comments, and linked notifications in the same transaction. Archived projects reject task create/edit/move/delete/toggle operations. Completed task progress is 100; reopened task/project progress is recalculated below 100. Reports and CSV use current stored tasks, not fixed analytics. Member utilization is the percentage of assigned tasks that remain incomplete; it is not a time-tracking or capacity measurement. `Online` identifies the current requester; other members are labelled `Offline`, without claiming a live presence service.

## Authentication and request guards

- Passwords use random-salt scrypt (`N=32768, r=8, p=1`, 64-byte derived key); verification uses a constant-time comparison. Passwords require 12–128 characters. Email addresses are trimmed and normalized to lowercase. Unknown login accounts still perform a scrypt comparison.
- Sessions are random 256-bit opaque tokens. Only their SHA-256 hashes are stored. `ns_session` is `HttpOnly`, `SameSite=Lax`, path `/`, expires after seven days, and gets `Secure` on HTTPS origins. Logout removes the stored token. Authenticated password changes check the current password and atomically revoke all old sessions while issuing a replacement.
- Roles come from relational workspace memberships on every protected request. Register/login/profile/state requests reject arbitrary client role/user/author fields. Owners manage projects, invitations, roles, and private backups; members manage tasks/comments/messages. The last owner cannot be demoted.
- Invitation tokens are cryptographically random, hash-stored, exact-email bound, expire after seven days, and can be consumed once. Reissuing an invitation invalidates the previous pending link. Existing members cannot gain privileges through invitation acceptance. Owners copy the link manually; no email is sent.
- Every POST requires exact `Origin === APP_ORIGIN`; explicitly cross-site browser writes fail. No broad CORS allowance exists. Strict Zod schemas reject unknown keys. Requests require JSON and are capped at 128 KiB, with 16 KiB headers and bounded request/header timeouts.
- Rate guards are SQLite-persisted, using hashed identities. Writes allow 300/minute per socket IP; reads 1,500/minute. Authentication writes allow 30/15 minutes per socket IP and login/registration 12/15 minutes per normalized email. The server does not trust arbitrary `X-Forwarded-For`; clients behind one reverse proxy share the proxy IP limit. Rejected counters still commit. Tune at a trusted deployment edge if needed; no distributed limiter is claimed.
- API responses use `no-store`, `nosniff`, frame denial, and no-referrer headers. Error responses expose no SQL, file paths, hashes, passwords, or connection details. `/api/health` only exposes driver/schema health. CSV quotes cells and prefixes potential spreadsheet formulas; printable reports HTML-escape names. Backups require live owner authorization and omit auth/session/invitation-token records. They are unencrypted and contain private workspace data, so store them privately.
- Production static serving allows built `/assets/` file types and a small root-file list, with SPA fallback for safe extensionless routes. Dot paths, traversal, encoded backslashes/double encoding, source maps, database/backup paths, and API fallbacks are rejected. The real resolved file must stay within `dist`, preventing symlink escapes.

## Verification

Run from the root:

```powershell
npm test
npm run typecheck
npx oxlint server tests
# After building the frontend; needs the existing Chrome/Puppeteer installation:
node --import tsx tests/browser-smoke.ts
```

The backend suite uses actual HTTP requests and temporary on-disk SQLite files, not mocks. On 2026-10-11 its **13 tests passed**, covering normalized registration, real sample ownership, strict identity fields, scrypt storage, password/session revocation, logout, CSRF and body limits, workspace isolation and selection, persistence after restart, invitations with wrong email/expiry/replay/reissue, owner/member permissions and last-owner protection, references/date/subtask validation with rollback, completion/reopen/report/CSV behavior, cascade deletion, per-user notifications, rate-limit persistence and session expiry, and safe static serving. Concurrent CAS was tested through **two separate Node processes sharing the same database**: one success, one 409, exactly one revision/audit increment. Vercel startup refusal was tested. Tests never use the actual default workspace database and clean up their isolated files.

The first sandbox test attempt could not connect to localhost (`EACCES`); an approved rerun outside that restriction passed. Root `npm run typecheck` subsequently passed, including `src`, `server`, and `tests`; `npx oxlint server tests` passed without warnings.

An additional actual headless Chrome smoke passed on 2026-10-11, through the built frontend and an isolated on-disk SQLite server: UI registration, authenticated state hydration with only the real member, browser-observed HttpOnly session cookie, persistence across reload, authenticated comment with server-derived author, and logout returning `user:null`. No frontend responses were mocked. Its temporary database was removed afterward; the parent's demo accounts were not touched. The optional script defaults to local port 5348, existing Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, and the existing Puppeteer module in the sibling Rozana-Kart installation. Override `BACKEND_BROWSER_PORT`, `CHROME_PATH`, and `PUPPETEER_MODULE_PATH` when needed; no browser dependency is installed by this backend. This focused check does not claim full responsive/frontend coverage or the parent's final bundled production smoke.

## Deliberate limits

No SMTP/email delivery, email verification, password-reset flow, external notification delivery, push service, 2FA, uploads, payments, cloud database, deployment, legal/compliance certification, or restore API is implemented. Unsupported delivery/2FA settings are false and attempts to enable them fail validation. Language/timezone preferences persist; the backend does not translate the frontend or promise localization. Messages/comments are actual workspace records. Audit history retains the newest 2,000 entries per workspace; this is an operational activity log, not a tamper-proof compliance ledger. Notifications retain at most 5,000 entries on state mutations, and entity/message/comment limits are enforced. Treat exported backups and manually copied invitations as private information.
