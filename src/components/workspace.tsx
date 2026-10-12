import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { useAction } from "../hooks/useAction";
import type { Project, Task, TaskStatus, Priority } from "../types/app";
import { dateInput, formatDate } from "../utils/helpers";
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Input,
  Select,
  Textarea,
} from "./ui";
export const statuses: TaskStatus[] = [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Completed",
];
export const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {detail}
        </p>
      )}
    </Card>
  );
}
export function Progress({
  value,
  label = "Progress",
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-300">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 rounded-full bg-slate-200 dark:bg-white/10"
      >
        <div
          className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-[width] duration-150"
          style={{ width: percent + "%" }}
        />
      </div>
    </div>
  );
}
export function TaskList({ tasks }: { tasks: Task[] }) {
  const { projects, members } = useAppStore();
  return (
    <div className="divide-y divide-slate-200 dark:divide-white/10">
      {tasks.map((task) => (
        <Link
          key={task.id}
          to={"/app/tasks/" + task.id}
          className="block rounded-xl py-4 transition hover:bg-brand-50 dark:hover:bg-white/5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium break-words">{task.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {projects.find((p) => p.id === task.projectId)?.name ??
                  "Project"}{" "}
                ·{" "}
                {members.find((m) => m.id === task.assigneeId)?.name ??
                  "Unassigned"}{" "}
                · {formatDate(task.dueDate)}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge tone={task.status === "Completed" ? "success" : "default"}>
                {task.status}
              </Badge>
              <Badge
                tone={
                  task.priority === "Critical"
                    ? "danger"
                    : task.priority === "High"
                      ? "warning"
                      : "default"
                }
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
export function usePagination<T>(items: T[], key: string, size = 6) {
  const [position, setPosition] = useState({ key, page: 1 });
  const count = Math.max(1, Math.ceil(items.length / size));
  const page = position.key === key ? Math.min(position.page, count) : 1;
  // Persist resets and clamps so returning to a previous filter cannot restore its old page.
  if (position.key !== key || position.page !== page) {
    setPosition({ key, page });
  }
  return {
    items: items.slice((page - 1) * size, page * size),
    page,
    count,
    setPage: (value: number) =>
      setPosition({ key, page: Math.max(1, Math.min(value, count)) }),
  };
}
export function Pagination({
  page,
  count,
  setPage,
}: {
  page: number;
  count: number;
  setPage: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-3"
    >
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-slate-500">
        Page {page} of {count}
      </span>
      <Button
        variant="secondary"
        disabled={page >= count}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
function split(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
export function ProjectForm({
  project,
  onSaved,
}: {
  project?: Project;
  onSaved: () => void;
}) {
  const store = useAppStore();
  const action = useAction();
  const [form, setForm] = useState({
    name: project?.name ?? "",
    client: project?.client ?? "",
    summary: project?.summary ?? "",
    dueDate: project?.dueDate ?? dateInput(new Date(Date.now() + 7 * 86400000)),
    budget: project?.budget ?? "",
    tags: project?.tags.join(", ") ?? "",
    members:
      project?.members ?? (store.currentUser ? [store.currentUser.id] : []),
  });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const input = { ...form, tags: split(form.tags) };
        const result = await action.run(
          () =>
            project
              ? store.updateProject(project.id, input)
              : store.createProject(input),
          project ? "Project updated" : "Project created",
        );
        if (result.ok) onSaved();
      }}
    >
      <Input
        label="Project name"
        required
        maxLength={160}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Client (optional)"
          maxLength={160}
          value={form.client}
          onChange={(e) => setForm({ ...form, client: e.target.value })}
        />
        <Input
          label="Due date"
          type="date"
          required
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
      </div>
      <Textarea
        label="Summary"
        maxLength={5000}
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Budget note (optional)"
          maxLength={80}
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
        />
        <Input
          label="Tags (comma separated)"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
        />
      </div>
      <fieldset className="rounded-2xl border p-4 dark:border-white/10">
        <legend className="px-2 text-sm font-medium">
          Project members (choose at least one)
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {store.members.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.members.includes(member.id)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    members: e.target.checked
                      ? [...form.members, member.id]
                      : form.members.filter((id) => id !== member.id),
                  })
                }
              />
              {member.name}
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorNotice message={action.error} />
      <Button type="submit" disabled={action.pending || !form.members.length}>
        {action.pending
          ? "Saving…"
          : project
            ? "Save project"
            : "Create project"}
      </Button>
    </form>
  );
}
export function TaskForm({
  task,
  projectId,
  onSaved,
}: {
  task?: Task;
  projectId?: string;
  onSaved: () => void;
}) {
  const store = useAppStore();
  const action = useAction();
  const available = store.projects.filter((p) => p.status !== "Archived");
  const initialProject = task?.projectId ?? projectId ?? available[0]?.id ?? "";
  const [form, setForm] = useState({
    title: task?.title ?? "",
    projectId: initialProject,
    description: task?.description ?? "",
    status: task?.status ?? ("Todo" as TaskStatus),
    priority: task?.priority ?? ("Medium" as Priority),
    dueDate: task?.dueDate ?? dateInput(new Date(Date.now() + 7 * 86400000)),
    assigneeId:
      task?.assigneeId ??
      store.members.find((m) =>
        available.find((p) => p.id === initialProject)?.members.includes(m.id),
      )?.id ??
      "",
    labels: task?.labels.join(", ") ?? "",
    subtasks: task?.subtasks.map((s) => s.label).join("\n") ?? "",
  });
  const eligible = store.members.filter((m) =>
    available.find((p) => p.id === form.projectId)?.members.includes(m.id),
  );
  if (!available.length)
    return (
      <p className="text-sm text-slate-500">
        Create or reopen a project before adding tasks. Project creation is
        available to workspace owners.
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const subtasks = form.subtasks
          .split("\n")
          .map((label) => label.trim())
          .filter(Boolean)
          .map((label, index) =>
            task
              ? {
                  id: task.subtasks[index]?.id,
                  label,
                  done: task.subtasks[index]?.done ?? false,
                }
              : { label, done: false },
          );
        const input = { ...form, labels: split(form.labels), subtasks };
        const result = await action.run(
          () =>
            task ? store.updateTask(task.id, input) : store.createTask(input),
          task ? "Task updated" : "Task created",
        );
        if (result.ok) onSaved();
      }}
    >
      <Input
        label="Task title"
        required
        maxLength={200}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <Select
        label="Project"
        options={available.map((p) => ({ value: p.id, label: p.name }))}
        value={form.projectId}
        onChange={(e) => {
          const id = e.target.value;
          const assignee = store.members.find((m) =>
            available.find((p) => p.id === id)?.members.includes(m.id),
          );
          setForm({ ...form, projectId: id, assigneeId: assignee?.id ?? "" });
        }}
      />
      <Textarea
        label="Description"
        maxLength={10000}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Status"
          options={statuses}
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as TaskStatus })
          }
        />
        <Select
          label="Priority"
          options={priorities}
          value={form.priority}
          onChange={(e) =>
            setForm({ ...form, priority: e.target.value as Priority })
          }
        />
        <Input
          label="Due date"
          type="date"
          required
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
        <Select
          label="Assignee"
          required
          options={eligible.map((m) => ({ value: m.id, label: m.name }))}
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
        />
      </div>
      <Input
        label="Labels (comma separated)"
        value={form.labels}
        onChange={(e) => setForm({ ...form, labels: e.target.value })}
      />
      <Textarea
        label="Subtasks (one per line)"
        value={form.subtasks}
        onChange={(e) => setForm({ ...form, subtasks: e.target.value })}
      />
      <ErrorNotice message={action.error} />
      <Button type="submit" disabled={action.pending || !eligible.length}>
        {action.pending ? "Saving…" : task ? "Save task" : "Create task"}
      </Button>
    </form>
  );
}
export function DetailsRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  );
}
