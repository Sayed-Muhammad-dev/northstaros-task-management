# NorthstarOS HTTP contract

All JSON successes are direct objects. Errors are `{error:string}` with an HTTP status; revision conflicts also contain `{revision:number}`. Browser requests use credentials/cookies. Every POST requires exact same-origin `Origin` matching runtime `APP_ORIGIN`, and JSON bodies where defined. Configure `APP_ORIGIN=http://127.0.0.1:5345` for Vite development proxying `/api` to port 5346. Production uses the actual browser-facing origin. No email, upload, payment or two-factor service is integrated.

## Authentication and workspace selection

- `GET /api/me` -> `{user: null | {id,name,email,role:'owner'|'member',workspaceId,workspaceName}}`.
- `POST /api/auth/register` body **`{name,email,company,password}`** -> `{user}` and opaque HttpOnly session cookie. Password length 12–128. Creates an isolated workspace with explicitly labelled sample projects/tasks assigned only to the actual registrant.
- `POST /api/auth/login` body **`{email,password}`** -> `{user}` and cookie.
- `POST /api/auth/logout` body **`{}`** -> `{ok:true}`; invalidates the stored session.
- `POST /api/auth/password` body **`{oldPassword,newPassword}`** -> `{ok:true}` and replacement cookie. Requires authentication and revokes all prior sessions. New password length 12–128.
- `GET /api/workspaces` -> `{workspaces:[{id,name,role:'owner'|'member'}]}`.
- `POST /api/workspaces` authenticated body **`{name}`** -> `{user}`; creates and selects an isolated empty workspace owned by the current user.
- `POST /api/workspaces/select` body **`{id}`** -> `{user}`; only a workspace with an existing membership. Workspace selection is stored in the current session.

## State

`GET /api/state` -> **`{revision,settings,projects,tasks,members,notifications,messageThreads,comments,currentUser,workspace,invitations,audit}`**. Entity shapes match `src/types/app.ts`. `comments` is `Record<taskId,{id,authorId,content,time}[]>`. `currentUser` is the same user projection as `/api/me`; `workspace` is `{id,name}`. Invitations are `{id,email,role,expiresAt}` (pending, owner-visible; members receive `[]`). Audit is `{id,action,time,actor}[]` with an actor display name. Members are actual registered workspace members; permissions and utilization/completed counts are server-derived. Times are ISO UTC and due dates are real `YYYY-MM-DD` dates. No password hashes, session hashes, invite tokens or invented teammates are returned.

`members[].role` is the literal **`owner` or `member`**, not a fictional job title. Invitations use **`/invite?token=...`** in the copyable link. Cookie name is **`ns_session`**.

Every mutation is **`POST /api/state`** with **`{revision:number,action:string,payload:object}`** and returns the complete updated state. Use the most recently received revision. A stale revision returns **409 `{error:'State changed. Refresh and retry.',revision:<current>}`** without overwriting data. Fetch state and let the user retry; do not blindly resubmit a stale patch. The active workspace must match the state currently displayed; state mutation may additionally send `X-Workspace-Id` and should do so to reject a stale tab after another request selects a workspace.

Exact action payloads (unknown keys are rejected):

| Action | Exact payload | Permission |
| --- | --- | --- |
| `updateSettings` | `{patch:{appearance?,language?,emailNotifications?,pushNotifications?,weeklyDigest?,twoFactorAuth?,timezone?}}` | Owner. `twoFactorAuth` must be false; unsupported notification channels must be false. Settings are workspace settings. |
| `createProject` | `{name,client,summary,dueDate,members:string[],budget,tags:string[]}` | Owner |
| `updateProject` | `{id,patch:{name?,client?,summary?,dueDate?,members?,budget?,tags?,status?}}` | Owner. Status `Active` / `At Risk` / `Archived`; Completed is derived from tasks. |
| `archiveProject` | `{id}` | Owner; marks Archived |
| `deleteProject` | `{id}` | Owner; cascades tasks, their comments and task-linked notifications |
| `createTask` | `{title,projectId,description,status,priority,dueDate,assigneeId,labels:string[],subtasks:[{label,done}]}` | Owner or member. Subtask IDs assigned by server. |
| `updateTask` | `{id,patch:{title?,projectId?,description?,status?,priority?,dueDate?,assigneeId?,labels?,subtasks?:[{id?,label,done}]}}` | Owner or member; supplied subtask IDs must belong to that task |
| `moveTask` | `{id,status}` | Owner or member |
| `toggleSubtask` | `{id,subtaskId}` | Owner or member |
| `deleteTask` | `{id}` | Owner or member; cascades comments and task-linked notifications |
| `markNotificationRead` | `{id}` | Owner or member; notifications/read flags belong to current user |
| `markAllNotificationsRead` | `{}` | Owner or member; current user's notifications only |
| `addMessage` | `{threadId,content}` | Owner or member; current user must be a participant; author/time/ID assigned by server |
| `addComment` | `{taskId,content}` | Owner or member; author/time/ID assigned by server |
| `updateProfile` | `{name,team}` | Owner or member; edits current user only, never role/email/permissions |

Task statuses: `Backlog`, `Todo`, `In Progress`, `Review`, `Completed`. Priorities: `Low`, `Medium`, `High`, `Critical`. A task requires an active workspace project and an actual member of that project's member list as assignee. Project members must be actual workspace memberships. Due dates must be valid calendar dates. Task progress, comment/attachment counts, project progress/Completed status, member metrics and permissions are server-derived. Reopening a Completed task recalculates progress below 100 and reopens its completed project. No attachment upload endpoint exists; attachment counts are zero.

Settings language values are `English`, `German`, or `French`; appearance is `light` or `dark`; timezone must be an accepted IANA timezone. These are persisted preferences. No translation, external notification delivery, or two-factor service is claimed. Archived projects reject task create/update/move/delete/toggle operations.

## Invitations and roles

- `POST /api/invitations` owner body **`{email,role:'owner'|'member'}`** -> **`{invitation:{id,email,role,expiresAt},inviteLink}`**. The link contains a random one-use token, expires after 7 days, and is copied manually; no email is sent. Invite token hashes are stored. Pending invitations and their expiry are visible in owner state.
- `POST /api/invitations/accept` authenticated body **`{token}`** -> **`{user}`** and selects the joined workspace for this session. The logged-in normalized email must exactly match the invitation. Expired/replayed invitations fail; existing memberships cannot be elevated through invite acceptance.
- `POST /api/members/role` owner body **`{id,role:'owner'|'member'}`** -> full state. `id` is the member's user ID. The last owner cannot be demoted. This also increments workspace revision.

## Exports and health

- `GET /api/export.csv` authenticated -> current workspace's actual task CSV with formula-safe cells and server-derived progress.
- `GET /api/backup` owner -> private `{format,exportedAt,state}` JSON; excludes credential/session/invitation-token secrets. Operational export, unencrypted; no restore endpoint or cloud backup claim.
- `GET /api/reports` authenticated -> `{taskCount,completedTasks,overdueTasks,completionRate,byStatus,projects:[{id,name,taskCount,completedTasks,progress}]}` derived from current state; no fixed analytics figures.
- `GET /api/reports/print` authenticated -> escaped, printable HTML of the same actual project/task report; browser printing is manual.
- `GET /api/health` -> `{status:'ok',driver:'sqlite',schemaVersion:1}` without file paths/secrets.

Frontend integration: initial `/api/me`, then `/api/state`; retain latest full state/revision. Workspace switch refreshes state and clears prior workspace UI/cache. Authentication writes never accept client user/workspace/role/author IDs. Use project/member IDs returned by state, including the actual current user ID in freshly created workspaces. Registration/login responses have only `{user}`, so fetch state separately.

Runtime configuration uses **`DATABASE_FILE`** (default `.app-data/northstar.sqlite`), **`API_PORT`** (default 5346), and **`APP_ORIGIN`** (development browser origin `http://127.0.0.1:5345`). Configuration comes from the process environment; the server does not edit `.env`. Production requires durable disk and serves the allowlisted built `dist` directory. The old static-only Vercel configuration does not host this API; SQLite is refused when `VERCEL` is set.
