# NorthstarOS QA

Aggregate: **PASS — 30 unique stages, 54 responsive checks, six reviewed final screenshots.** The latest run recaptured only the tablet dashboard; complete responsive evidence remains in the original final run.

Status: **PASS**. Mode: **Tablet recapture**. Finished: 2026-10-11T10:53:25.350Z.

This report describes actual local Chromium/HTTP checks against http://127.0.0.1:5347, with the API on http://127.0.0.1:5347. No responses are mocked or intercepted. Accounts, projects and tasks are created through the public HTTP contract. Reload checks verify server-backed hydration; this run does not prove persistence across a server restart or a cloud deployment.

The registered display identity is **Workspace Owner**, in **Demo Workspace**. Credentials are saved privately in the ignored `.app-data/browser-demo.json` file for local recapture. Passwords, cookies, invitation tokens and email addresses are excluded from this report and final screenshots.

## Results

| Stage | Status | Evidence / error |
| --- | --- | --- |
| Captures: readable tablet dashboard without private identity | PASS | Verified against the running local app/API. |
| Runtime: no uncaught browser errors or unexpected failed API calls | PASS | Verified against the running local app/API. |

Earlier actual checks retained as separate evidence (these were not rerun):

| Stage | Status | Origin / evidence |
| --- | --- | --- |
| API: two registrations, session hydration and account isolation | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: authenticated origin enforcement and foreign workspace denial | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: project/task creation, editing and reload persistence | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: comments/messages persisted with server-authored identities | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: exact-email invitation, one-use acceptance and role restrictions | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: workspace switching, stale-tab rejection and revision conflicts | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: derived completion, reopening, subtask and settings persistence | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: genuinely empty workspace, project deletion cascades and selection | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3oef0w/report.json |
| API: real CSV, private backup and reports derived from current state | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3ogeha/report.json |
| API: logout revokes session and subsequent hydration is anonymous | PASS | http://127.0.0.1:5345; .browser-evidence/run-mv3ogeha/report.json |
| UI: logout/login, protected redirects and same-browser account isolation | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3ooq6t/report.json |
| UI: accessible modal keyboard trap, Escape and trigger focus restoration | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3ooq6t/report.json |
| UI: project create/edit saves actual state and survives reload | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3ooq6t/report.json |
| UI: task create/edit, subtask and keyboard Kanban movement | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3ooq6t/report.json |
| UI: real comments and messages with saved authors | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3ooq6t/report.json |
| UI: workspace creation, invitation acceptance and member controls | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3oray0/report.json |
| UI: stale revision shows a recoverable error without overwriting | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3oray0/report.json |
| UI: settings save and reload actual workspace preferences | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3oray0/report.json |
| UI: empty workspace views and disabled task creation | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3oray0/report.json |
| UI: current-month calendar and month navigation | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3oray0/report.json |
| UI: search and filter reset/clamp pagination | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3p2zbl/report.json |
| UI: actual CSV and workspace JSON download buttons | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3p2zbl/report.json |
| UI: task/project deletion and cancellable confirmation | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3p2zbl/report.json |
| UI: logout clears hydrated state and protected deep-link redirects | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3p2zbl/report.json |
| API: final compiled guards reject spoofed counts, dates, references and role elevation | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3p2zbl/report.json |
| Responsive: 18 app paths at 390, 768 and 1440 pixels | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3paph1/report.json |
| Responsive: mobile drawer keyboard focus, Escape and reduced motion | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3paph1/report.json |
| Captures: final real desktop/tablet/phone interfaces without private identity | PASS | http://127.0.0.1:5347; .browser-evidence/run-mv3paph1/report.json |

Responsive checks: 0. Runtime errors: 0. Unexpected failed API responses: 0.

No runtime/API errors were recorded during the stages that ran.

## Captures

- .browser-evidence/run-mv3pg1e5/tablet.png — 768px, Dashboard

Evidence JSON: `.browser-evidence/run-mv3pg1e5/report.json`. Screenshots use only synthetic workspace data and useful sample labels. API-only mode deliberately produces no screenshots and does not verify application routes.

## Run locally

Start Vite on 5345 and the API on 5346 with `APP_ORIGIN=http://127.0.0.1:5345`.

```powershell
node scripts/verify-northstar.mjs --prepare
node scripts/verify-northstar.mjs --api-only
# Run after the frontend source and typecheck are ready:
node scripts/verify-northstar.mjs --app http://127.0.0.1:5347 --api http://127.0.0.1:5347 --ui-only
# Recapture the persisted private demo identity after final UI changes:
node scripts/verify-northstar.mjs --app http://127.0.0.1:5347 --api http://127.0.0.1:5347 --capture-only
```

Focused continuation flags: `--api-final` resumes exports/logout; `--ui-resume` resumes after the saved project/task/comment stages; `--ui-finish` resumes at pagination; `--responsive-only` skips completed functional checks; `--layout-only` collects text-free layout diagnostics. Prior stage results retain their original evidence paths and server origin. Final validation guards run against the compiled server during UI verification.

The script uses Puppeteer from the existing absolute Rozana installation and local Chrome. It performs a single readiness check, requires ignored credential/evidence directories, and never installs packages or edits app/backend source. A first run without a mode flag performs both API and UI stages. Existing private demo credentials are protected from replacement; use a continuation or capture mode thereafter. All writes remain in this script, this document, and the ignored evidence/credential paths.


## Final aggregate and selected media

All required flows PASS across preserved origin-specific runs: 11 API stages (including final compiled-server guards), 14 UI workflow stages, two responsive/accessibility stages, the original captures, focused tablet-dashboard recapture, and runtime verification. The final responsive run passed 54 path/width checks; the later tablet-only run did not repeat those checks. Both runs recorded zero runtime errors and zero unexpected API failures.

Full responsive, drawer/reduced-motion and original screenshot evidence: `.browser-evidence/run-mv3paph1/report.json`. Selected media and tablet-dashboard recapture: `.browser-evidence/run-mv3pg1e5/report.json`. Earlier API flows used Vite 5345/API 5346. UI workflows, final API guards, responsive checks and selected captures used compiled server 5347. Original reports and per-stage origins remain preserved.

The six public originals are in `D:/Project/Mypersonal-portfolio/public/projects/fullstack-2026/northstaros/`: `desktop.png`, `tablet.png`, `phone.png`, `board.png`, `calendar.png`, `task.png`. Tablet now shows the readable dashboard at 768×1024. The separate desktop Kanban gallery remains `board.png`. The five other reviewed images were unchanged. `capture-manifest.json` records routes, viewports, timestamps, synthetic-data provenance and SHA-256 hashes; it includes no credentials. The parent can generate a device cover from these originals.

The frontend owner corrected two confirmed defects: filter clearing resurrected an old page number, and intrinsic Messages grid sizing expanded a 390px page to 500px. Actual browser retests passed after each fix. Invitation rendering required a harness wait, with no invitation source change. No API contract changes were needed. Credentials remain private in ignored `.app-data/browser-demo.json`; no private downloads were copied. No cloud deployment is claimed.

## Independent server restart check — 12 October 2026

After the local server stopped between sessions, the parent restarted the same compiled build on 5347 with the existing SQLite database. `node scripts/verify-local-restart.mjs` authenticated the private QA account through the actual HTTP API, selected its existing workspace and verified its previously saved project/task IDs. The isolated verification session was logged out afterward. Sanitized evidence is `.browser-evidence/restart-verification.json`; no credentials, session cookies or user email addresses were printed. This adds actual process-restart persistence evidence separately from the earlier browser reload checks. Cloud hosting remains unverified.
