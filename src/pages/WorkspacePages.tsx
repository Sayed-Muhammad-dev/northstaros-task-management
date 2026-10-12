import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Download, Printer, Send } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Input,
  Modal,
  SearchInput,
  SectionHeader,
  Select,
  Switch,
  TabButton,
  Textarea,
} from "../components/ui";
import { Metric, Progress, statuses } from "../components/workspace";
import { useAppStore } from "../hooks/useAppStore";
import { useAction } from "../hooks/useAction";
import { errorMessage, request } from "../lib/api";
import { cn, dateInput, formatDate, formatTime } from "../utils/helpers";
import type { ReportSummary, Role } from "../types/app";

export function TeamMembersPage() {
  const store = useAppStore();
  const action = useAction();
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [changing, setChanging] = useState<{ id: string; role: Role } | null>(
    null,
  );
  const owner = store.currentUser?.role === "owner";
  const filtered = store.members.filter((m) =>
    (m.name + " " + m.email + " " + m.team)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <SectionHeader
        eyebrow="Collaboration"
        title="Team members"
        description="Actual members of this workspace. Owners manage invitations and roles."
      />
      <div className="mb-6 max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search members"
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => (
          <Card key={member.id}>
            <div className="flex items-center gap-3">
              <Avatar name={member.name} status={member.status} />
              <div className="min-w-0">
                <h3 className="font-semibold break-words">{member.name}</h3>
                <p className="text-sm text-slate-500">
                  {member.team || "No team"}
                </p>
              </div>
            </div>
            <p className="mt-4 break-all text-sm text-slate-500 dark:text-slate-300">
              {member.email}
            </p>
            <div className="mt-4 flex justify-between gap-2">
              <Badge>{member.role}</Badge>
              <span className="text-xs text-slate-500">
                {member.completedTasks} completed tasks
              </span>
            </div>
            <div className="mt-4">
              <Progress
                value={member.utilization}
                label="Assigned tasks still open"
              />
            </div>
            {owner && (
              <div className="mt-5">
                <Select
                  label={"Role for " + member.name}
                  disabled={action.pending}
                  options={["owner", "member"]}
                  value={member.role}
                  onChange={(e) =>
                    setChanging({ id: member.id, role: e.target.value as Role })
                  }
                />
              </div>
            )}
            <ul className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              {member.permissions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          title="No matching members"
          description="Try another search."
        />
      )}
      {owner && (
        <Card className="mt-6">
          <SectionHeader
            title="Invite a teammate"
            description="Copy and share the private link yourself. No invitation email is sent."
          />
          <form
            className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await action.run(() => store.invite(email, role));
              if (result.ok) {
                setInviteLink(result.value.inviteLink);
                setCopyStatus("");
                setEmail("");
              }
            }}
          >
            <Input
              label="Invitee email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Invitation role"
              options={["member", "owner"]}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            />
            <Button type="submit" disabled={action.pending}>
              Create invitation
            </Button>
          </form>
          {inviteLink && (
            <div className="mt-5 space-y-3">
              <Input
                label="Private invitation link (expires in 7 days)"
                readOnly
                value={inviteLink}
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                    setCopyStatus(
                      "Link copied. Share it only with the invitee.",
                    );
                  } catch {
                    setCopyStatus(
                      "Copy unavailable. Select the link above and copy it manually.",
                    );
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <p role="status" className="text-sm text-slate-500">
                {copyStatus}
              </p>
            </div>
          )}
          <ErrorNotice message={action.error} />
          {store.invitations.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold">Pending invitations</h3>
              <ul className="mt-3 space-y-3">
                {store.invitations.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <span className="break-all">
                      {i.email} · {i.role}
                    </span>
                    <span className="text-slate-500">
                      Expires {formatDate(i.expiresAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
      <Modal
        open={!!changing}
        title="Change member role?"
        description="Owners can manage projects, invitations and workspace settings."
        onClose={() => setChanging(null)}
      >
        <ErrorNotice message={action.error} />
        <Button
          disabled={action.pending}
          onClick={async () => {
            if (!changing) return;
            const result = await action.run(
              () => store.setMemberRole(changing.id, changing.role),
              "Role updated",
            );
            if (result.ok) setChanging(null);
          }}
        >
          Confirm role change
        </Button>
      </Modal>
    </>
  );
}
export function MessagesPage() {
  const store = useAppStore();
  const action = useAction();
  const [id, setId] = useState("");
  const [draft, setDraft] = useState("");
  const threads = store.messageThreads.filter(
    (t) => store.currentUser && t.participants.includes(store.currentUser.id),
  );
  const thread = threads.find((t) => t.id === id) ?? threads[0];
  return (
    <>
      <SectionHeader
        eyebrow="Collaboration"
        title="Messages"
        description="Conversations with workspace members."
      />
      {!thread ? (
        <EmptyState
          title="No conversations available"
          description="Conversations appear when you participate in a workspace thread."
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="min-w-0 p-3">
            <nav aria-label="Conversations" className="space-y-2">
              {threads.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    setId(t.id);
                    setDraft("");
                  }}
                  aria-pressed={thread.id === t.id}
                  className={cn(
                    "w-full rounded-2xl p-4 text-left",
                    thread.id === t.id
                      ? "bg-brand-50 dark:bg-brand-500/15"
                      : "hover:bg-slate-50 dark:hover:bg-white/5",
                  )}
                >
                  <p className="break-words font-medium">{t.title}</p>
                  <p className="mt-2 truncate text-xs text-slate-500">
                    {t.lastMessage || "Start a conversation"}
                  </p>
                </button>
              ))}
            </nav>
          </Card>
          <Card className="min-w-0">
            <h3 className="break-words text-xl font-semibold">{thread.title}</h3>
            <p className="mt-2 break-words text-xs text-slate-500">
              {thread.participants
                .map((p) => store.members.find((m) => m.id === p)?.name)
                .filter(Boolean)
                .join(", ")}
            </p>
            <div
              className="my-6 max-h-[480px] space-y-4 overflow-y-auto"
              aria-label="Message history"
            >
              {thread.messages.length ? (
                thread.messages.map((m) => (
                  <div
                    className={cn(
                      "rounded-2xl p-4",
                      m.authorId === store.currentUser?.id
                        ? "ml-4 bg-brand-50 dark:bg-brand-500/15"
                        : "mr-4 bg-slate-50 dark:bg-white/5",
                    )}
                    key={m.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {store.members.find(
                          (member) => member.id === m.authorId,
                        )?.name ?? "Workspace member"}
                      </span>
                      <time dateTime={m.time}>{formatTime(m.time)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {m.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No messages yet.</p>
              )}
            </div>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await action.run(() =>
                  store.addMessage(thread.id, draft.trim()),
                );
                if (result.ok) setDraft("");
              }}
            >
              <Textarea
                label="Message"
                value={draft}
                maxLength={5000}
                required
                onChange={(e) => setDraft(e.target.value)}
              />
              <ErrorNotice message={action.error} />
              <Button type="submit" disabled={action.pending || !draft.trim()}>
                <Send className="h-4 w-4" />
                Send message
              </Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
export function NotificationsPage() {
  const store = useAppStore();
  const action = useAction();
  const [tab, setTab] = useState("All");
  const items = store.notifications.filter(
    (n) => tab === "All" || n.category === tab,
  );
  return (
    <>
      <SectionHeader
        eyebrow="Updates"
        title="Notifications"
        description="Workspace events addressed to your account."
        action={
          <Button
            variant="secondary"
            disabled={
              action.pending || !store.notifications.some((n) => !n.read)
            }
            onClick={() => {
              void action.run(
                () => store.markAllNotificationsRead(),
                "Notifications read",
              );
            }}
          >
            Mark all as read
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {["All", "System", "Tasks", "Team"].map((name) => (
          <TabButton
            key={name}
            active={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </TabButton>
        ))}
      </div>
      <ErrorNotice message={action.error} />
      {items.length ? (
        <div className="space-y-4">
          {items.map((n) => (
            <Card key={n.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{n.title}</h3>
                    {!n.read && <Badge>Unread</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    {n.description}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatTime(n.time)} · {n.category}
                  </p>
                </div>
                {!n.read && (
                  <Button
                    variant="secondary"
                    disabled={action.pending}
                    onClick={() => {
                      void action.run(
                        () => store.markNotificationRead(n.id),
                        "Notification read",
                      );
                    }}
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="You're all caught up"
          description="No notifications in this category."
        />
      )}
    </>
  );
}
function useReport() {
  const store = useAppStore();
  const workspaceId = store.currentUser?.workspaceId;
  const revision = store.state?.revision;
  const key = (workspaceId ?? "") + ":" + (revision ?? 0);
  const [result, setResult] = useState<{
    key: string;
    data?: ReportSummary;
    error?: string;
  }>();
  useEffect(() => {
    if (!workspaceId) return;
    const abort = new AbortController();
    void request<ReportSummary>("/api/reports", undefined, abort.signal, {
      "X-Workspace-Id": workspaceId,
    })
      .then((data) => setResult({ key, data }))
      .catch((error) => {
        if (!abort.signal.aborted)
          setResult({ key, error: errorMessage(error) });
      });
    return () => abort.abort();
  }, [workspaceId, revision, key]);
  return result?.key === key ? result : { key };
}
export function ReportsPage() {
  const store = useAppStore();
  const action = useAction();
  const result = useReport();
  const report = result.data;
  return (
    <div className="print-report">
      <SectionHeader
        eyebrow="Reporting"
        title="Workspace report"
        description="Current totals from the server. No historical trend is inferred."
        action={
          <div className="print-hidden flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={action.pending}
              onClick={() => {
                void action.run(() => store.exportTasks());
              }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <a
              href="/api/reports/print"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button asChild variant="secondary">
                <Printer className="h-4 w-4" />
                Printable report
              </Button>
            </a>
          </div>
        }
      />
      <ErrorNotice message={result.error || action.error} />
      {!report && !result.error ? (
        <p role="status">Loading current report…</p>
      ) : (
        report && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Tasks" value={report.taskCount} />
              <Metric label="Completed tasks" value={report.completedTasks} />
              <Metric
                label="Completion rate"
                value={report.completionRate + "%"}
              />
              <Metric label="Overdue tasks" value={report.overdueTasks} />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Card>
                <h3 className="mb-5 font-semibold">Tasks by status</h3>
                <div className="space-y-4">
                  {statuses.map((status) => (
                    <div key={status}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{status}</span>
                        <span>{report.byStatus[status] ?? 0}</span>
                      </div>
                      <Progress
                        value={
                          report.taskCount
                            ? Math.round(
                                ((report.byStatus[status] ?? 0) /
                                  report.taskCount) *
                                  100,
                              )
                            : 0
                        }
                        label={status + " share"}
                      />
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="mb-5 font-semibold">Project completion</h3>
                {report.projects.length ? (
                  <div className="space-y-5">
                    {report.projects.map((p) => (
                      <div key={p.id}>
                        <Link
                          className="font-medium"
                          to={"/app/projects/" + p.id}
                        >
                          {p.name}
                        </Link>
                        <p className="my-2 text-xs text-slate-500">
                          {p.completedTasks} of {p.taskCount} tasks completed
                        </p>
                        <Progress value={p.progress} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No projects yet.</p>
                )}
              </Card>
            </div>
            <Card className="mt-6">
              <h3 className="mb-4 font-semibold">Task register</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b dark:border-white/10">
                      {["Task", "Project", "Assignee", "Status", "Due"].map(
                        (label) => (
                          <th className="px-2 py-3" key={label} scope="col">
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {store.tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b dark:border-white/10"
                      >
                        <td className="px-2 py-3">{task.title}</td>
                        <td className="px-2 py-3">
                          {
                            store.projects.find((p) => p.id === task.projectId)
                              ?.name
                          }
                        </td>
                        <td className="px-2 py-3">
                          {
                            store.members.find((m) => m.id === task.assigneeId)
                              ?.name
                          }
                        </td>
                        <td className="px-2 py-3">{task.status}</td>
                        <td className="px-2 py-3">
                          {formatDate(task.dueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )
      )}
    </div>
  );
}
export function AnalyticsPage() {
  const store = useAppStore();
  const today = dateInput(new Date());
  const total = store.tasks.length;
  const completed = store.tasks.filter((t) => t.status === "Completed").length;
  const overdue = store.tasks.filter(
    (t) => t.status !== "Completed" && t.dueDate < today,
  ).length;
  return (
    <>
      <SectionHeader
        eyebrow="Intelligence"
        title="Current workload"
        description="Calculated from actual tasks and members. Historical velocity is unavailable."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Task completion"
          value={(total ? Math.round((completed / total) * 100) : 0) + "%"}
          detail={completed + " of " + total + " tasks"}
        />
        <Metric label="Open tasks" value={total - completed} />
        <Metric label="Overdue open tasks" value={overdue} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-5 font-semibold">Priority distribution</h3>
          <div className="space-y-5">
            {["Critical", "High", "Medium", "Low"].map((priority) => {
              const count = store.tasks.filter(
                (t) => t.priority === priority,
              ).length;
              return (
                <div key={priority}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{priority}</span>
                    <span>{count} tasks</span>
                  </div>
                  <Progress
                    value={total ? Math.round((count / total) * 100) : 0}
                    label={priority + " share"}
                  />
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h3 className="mb-5 font-semibold">Member workload</h3>
          <div className="space-y-5">
            {store.members.map((m) => {
              const assigned = store.tasks.filter((t) => t.assigneeId === m.id);
              const open = assigned.filter(
                (t) => t.status !== "Completed",
              ).length;
              return (
                <div key={m.id}>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                    <span>{m.name}</span>
                    <span>
                      {open} open / {assigned.length} assigned
                    </span>
                  </div>
                  <Progress
                    value={
                      assigned.length
                        ? Math.round((open / assigned.length) * 100)
                        : 0
                    }
                    label="Assigned tasks still open"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

function ProfileForm() {
  const store = useAppStore();
  const action = useAction();
  const me = store.members.find((m) => m.id === store.currentUser?.id);
  const [name, setName] = useState(store.currentUser?.name ?? "");
  const [team, setTeam] = useState(me?.team ?? "");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(() => store.updateProfile(name, team), "Profile saved");
      }}
    >
      <Input
        label="Full name"
        autoComplete="name"
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Team"
        maxLength={100}
        value={team}
        onChange={(e) => setTeam(e.target.value)}
      />
      <Input
        label="Email (account identity)"
        value={store.currentUser?.email ?? ""}
        readOnly
      />
      <ErrorNotice message={action.error} />
      <Button type="submit" disabled={action.pending}>
        Save profile
      </Button>
    </form>
  );
}
function PasswordForm() {
  const store = useAppStore();
  const action = useAction();
  const [old, setOld] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) {
          action.setError("New passwords must match.");
          return;
        }
        const result = await action.run(
          () => store.changePassword(old, password),
          "Password changed",
        );
        if (result.ok) {
          setOld("");
          setPassword("");
          setConfirm("");
        }
      }}
    >
      <Input
        label="Current password"
        autoComplete="current-password"
        type="password"
        required
        maxLength={128}
        value={old}
        onChange={(e) => setOld(e.target.value)}
      />
      <Input
        label="New password (12–128 characters)"
        autoComplete="new-password"
        type="password"
        required
        minLength={12}
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Confirm new password"
        autoComplete="new-password"
        type="password"
        required
        minLength={12}
        maxLength={128}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <p className="text-xs text-slate-500">
        Changing your password signs out your other sessions.
      </p>
      <ErrorNotice message={action.error} />
      <Button type="submit" disabled={action.pending}>
        Change password
      </Button>
    </form>
  );
}
function WorkspaceSettings() {
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="space-y-7">
      <div>
        <h3 className="font-semibold">Active workspace</h3>
        <p className="mt-2 text-sm">
          {store.currentUser?.workspaceName} · {store.currentUser?.role}
        </p>
        <div className="mt-4">
          <Select
            label="Select a workspace"
            options={store.workspaces.map((w) => ({
              value: w.id,
              label: w.name + " · " + w.role,
            }))}
            value={store.currentUser?.workspaceId}
            disabled={action.pending}
            onChange={(e) => {
              void action.run(() => store.selectWorkspace(e.target.value));
            }}
          />
        </div>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const url = new URL(link, window.location.origin);
            const token =
              url.searchParams.get("token") ??
              (url.pathname.startsWith("/invite/")
                ? url.pathname.slice(8)
                : "");
            if (!/^[a-f0-9]{64}$/.test(token)) {
              action.setError("Paste a valid NorthstarOS invitation link.");
              return;
            }
            navigate("/invite?token=" + encodeURIComponent(token));
          } catch {
            action.setError("Paste a valid invitation link.");
          }
        }}
      >
        <Input
          label="Join using an invitation link"
          required
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          The invitation must be addressed to your exact signed-in email.
        </p>
        <Button type="submit" variant="secondary">
          Review invitation
        </Button>
      </form>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await action.run(() => store.createWorkspace(name));
          if (result.ok) setName("");
        }}
      >
        <Input
          label="Create another workspace"
          required
          maxLength={150}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Creates an empty workspace owned by you.
        </p>
        <Button type="submit" disabled={action.pending}>
          Create workspace
        </Button>
      </form>
      {store.currentUser?.role === "owner" && (
        <div>
          <h3 className="font-semibold">Operational export</h3>
          <p className="my-3 text-sm text-slate-500">
            Download your workspace as private JSON. It is unencrypted; there is
            no restore or cloud backup service.
          </p>
          <Button
            variant="secondary"
            disabled={action.pending}
            onClick={() => {
              void action.run(() => store.exportBackup());
            }}
          >
            Download workspace JSON
          </Button>
        </div>
      )}
      <ErrorNotice message={action.error} />
    </div>
  );
}
export function SettingsPage() {
  const store = useAppStore();
  const action = useAction();
  const [tab, setTab] = useState("Profile");
  const [timezone, setTimezone] = useState(store.settings.timezone);
  const owner = store.currentUser?.role === "owner";
  return (
    <>
      <SectionHeader
        eyebrow="Preferences"
        title="Settings"
        description="Profile settings are yours. Owners control workspace appearance and timezone."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          "Profile",
          "Appearance",
          "Notifications",
          "Security",
          "Workspace",
        ].map((name) => (
          <TabButton
            key={name}
            active={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </TabButton>
        ))}
      </div>
      <Card className="max-w-3xl">
        {tab === "Profile" && <ProfileForm />}
        {tab === "Appearance" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Dark appearance</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Shared across this workspace.
                </p>
              </div>
              <Switch
                label="Dark appearance"
                checked={store.settings.appearance === "dark"}
                disabled={!owner || action.pending}
                onChange={(dark) => {
                  void action.run(
                    () =>
                      store.updateSettings({
                        appearance: dark ? "dark" : "light",
                      }),
                    "Appearance saved",
                  );
                }}
              />
            </div>
            <Input label="Interface language" value="English" readOnly />
            <p className="text-xs text-slate-500">
              Translation is not configured. All interface text is in English.
            </p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(
                  () => store.updateSettings({ timezone }),
                  "Timezone saved",
                );
              }}
            >
              <Input
                label="Workspace timezone (IANA)"
                placeholder="Asia/Karachi"
                value={timezone}
                disabled={!owner}
                required
                maxLength={80}
                onChange={(e) => setTimezone(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Task deadlines are calendar dates. Event timestamps are
                displayed in your browser's local timezone.
              </p>
              <Button type="submit" disabled={!owner || action.pending}>
                Save timezone
              </Button>
            </form>
            <ErrorNotice message={action.error} />
          </div>
        )}
        {tab === "Notifications" && (
          <div className="space-y-5">
            <h3 className="font-semibold">In-app notifications</h3>
            <p className="text-sm text-slate-500">
              Workspace events appear in Notifications. Email delivery, browser
              push and weekly digests are not configured.
            </p>
            <Link className="text-brand-600" to="/app/notifications">
              Open notifications
            </Link>
          </div>
        )}
        {tab === "Security" && (
          <div className="space-y-6">
            <PasswordForm />
            <div className="border-t pt-5 dark:border-white/10">
              <h3 className="font-semibold">Additional sign-in methods</h3>
              <p className="mt-2 text-sm text-slate-500">
                Google sign-in, two-factor authentication and email password
                recovery are not configured in this installation.
              </p>
            </div>
          </div>
        )}
        {tab === "Workspace" && <WorkspaceSettings />}
      </Card>
    </>
  );
}
export function ProfilePage() {
  const store = useAppStore();
  const user = store.currentUser;
  const mine = store.tasks.filter((t) => t.assigneeId === user?.id);
  return (
    <>
      <SectionHeader
        eyebrow="Account"
        title="Your profile"
        description="Your identity and current workspace responsibilities."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? ""} />
            <div>
              <h3 className="text-xl font-semibold">{user?.name}</h3>
              <p className="text-sm text-slate-500">
                {user?.role} · {user?.workspaceName}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <ProfileForm />
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Assigned tasks" value={mine.length} />
          <Metric
            label="Completed tasks"
            value={mine.filter((t) => t.status === "Completed").length}
          />
          <Card className="sm:col-span-2">
            <h3 className="font-semibold">Your workspaces</h3>
            <ul className="mt-4 space-y-3">
              {store.workspaces.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap justify-between gap-2 text-sm"
                >
                  <span>{w.name}</span>
                  <Badge>{w.role}</Badge>
                </li>
              ))}
            </ul>
            <Link
              className="mt-5 block text-sm text-brand-600"
              to="/app/settings"
            >
              Manage workspace selection
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
const guides = [
  {
    title: "Plan your first project",
    body: "Owners create projects with a name, due date and members. Add tasks and assign them to a member of that project. Project completion is calculated from task progress.",
    href: "/app/projects",
  },
  {
    title: "Move and complete tasks",
    body: "Use Kanban's drag controls or previous and next buttons. Task details let you edit fields, check subtasks and add comments. Reopening a completed task recalculates its progress.",
    href: "/app/kanban",
  },
  {
    title: "Invite your team",
    body: "Owners create an invitation for an exact email and role. Copy the link manually; no email is sent. The recipient signs in or registers with that email, then accepts within seven days.",
    href: "/app/team",
  },
  {
    title: "Use reports",
    body: "Reports show current server totals. Export CSV for actual task data, or open the printable report and use your browser's print command. Historical trend data is not collected.",
    href: "/app/reports",
  },
  {
    title: "Switch workspaces",
    body: "Choose a workspace you belong to in the sidebar or Settings. Previous workspace data and drafts are cleared. Join a new workspace using the owner's invitation link.",
    href: "/app/settings",
  },
  {
    title: "Account and capabilities",
    body: "Change your name and team in Profile, and change your password in Settings using the current password. Email recovery, Google sign-in, uploads, payments and two-factor authentication are not configured.",
    href: "/app/profile",
  },
];
export function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const filtered = guides.filter((g) =>
    (g.title + g.body).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <SectionHeader
        eyebrow="Guidance"
        title="Help center"
        description="Practical guides for this installation."
      />
      <div className="mb-6 max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search guides"
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((guide) => (
          <Card key={guide.title}>
            <h3 className="text-lg font-semibold">{guide.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">
              {guide.body}
            </p>
            <Link
              to={guide.href}
              className="mt-5 inline-block text-sm font-medium text-brand-600 dark:text-brand-100"
            >
              Open workspace page →
            </Link>
          </Card>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          title="No matching guides"
          description="Try a broader search."
        />
      )}
      <Card className="mt-6">
        <h3 className="font-semibold">Need help from a person?</h3>
        <p className="mt-3 text-sm text-slate-500">
          Contact your workspace owner using Messages. An external support desk
          and support email delivery are not connected.
        </p>
        <Link className="mt-4 inline-block text-brand-600" to="/app/messages">
          Open messages
        </Link>
      </Card>
    </>
  );
}
export function NotFoundPage() {
  const store = useAppStore();
  return (
    <div className="mx-auto max-w-xl p-6">
      <EmptyState
        title="Page not found"
        description="This address does not match a NorthstarOS page."
        action={
          <Link to={store.currentUser ? "/app/dashboard" : "/"}>
            <Button asChild>Return to NorthstarOS</Button>
          </Link>
        }
      />
    </div>
  );
}
