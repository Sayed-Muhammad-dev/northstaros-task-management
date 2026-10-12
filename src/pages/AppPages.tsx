import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, FolderKanban, Plus, Trash2 } from "lucide-react";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Modal,
  SearchInput,
  SectionHeader,
  Select,
  TabButton,
  Textarea,
} from "../components/ui";
import {
  DetailsRow,
  Metric,
  Pagination,
  Progress,
  ProjectForm,
  TaskForm,
  TaskList,
  priorities,
  statuses,
  usePagination,
} from "../components/workspace";
import { KanbanBoard } from "../components/KanbanBoard";
import { useAppStore } from "../hooks/useAppStore";
import { useAction } from "../hooks/useAction";
import { cn, dateInput, formatDate, formatTime } from "../utils/helpers";
import type { Priority, TaskStatus } from "../types/app";
export {
  TeamMembersPage,
  MessagesPage,
  NotificationsPage,
  ReportsPage,
  AnalyticsPage,
  SettingsPage,
  ProfilePage,
  HelpCenterPage,
  NotFoundPage,
} from "./WorkspacePages";

export function DashboardPage() {
  const store = useAppStore();
  const today = dateInput(new Date());
  const active = store.tasks.filter((t) => t.status !== "Completed");
  const due = active
    .filter((t) => t.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const completed = store.tasks.length - active.length;
  return (
    <>
      <SectionHeader
        eyebrow="Overview"
        title={"Welcome, " + (store.currentUser?.name.split(" ")[0] ?? "")}
        description="Your workspace's current delivery picture."
        action={
          <Link to="/app/tasks">
            <Button asChild>View tasks</Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Projects"
          value={store.projects.filter((p) => p.status !== "Archived").length}
          detail="Excludes archived projects"
        />
        <Metric label="Open tasks" value={active.length} />
        <Metric label="Completed" value={completed} />
        <Metric
          label="Overdue"
          value={active.filter((t) => t.dueDate < today).length}
          detail="Open tasks due before today"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionHeader
            title="Upcoming deadlines"
            description="Next open tasks, ordered by due date."
          />
          {due.length ? (
            <TaskList tasks={due} />
          ) : (
            <p className="text-sm text-slate-500">No upcoming open tasks.</p>
          )}
        </Card>
        <Card>
          <SectionHeader title="Project health" />
          {store.projects.length ? (
            <div className="space-y-5">
              {store.projects
                .filter((p) => p.status !== "Archived")
                .slice(0, 5)
                .map((p) => (
                  <Link
                    key={p.id}
                    className="block space-y-2"
                    to={"/app/projects/" + p.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge>{p.status}</Badge>
                    </div>
                    <Progress
                      value={p.progress}
                      label={p.name + " completion"}
                    />
                  </Link>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No projects yet. Owners can create the first one.
            </p>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Quick actions" />
          <div className="flex flex-wrap gap-3">
            <Link to="/app/projects">
              <Button asChild>
                <FolderKanban className="h-4 w-4" />
                Projects
              </Button>
            </Link>
            <Link to="/app/calendar">
              <Button asChild variant="secondary">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </Button>
            </Link>
            <Link to="/app/reports">
              <Button asChild variant="secondary">
                Reports
              </Button>
            </Link>
            <Link to="/app/team">
              <Button asChild variant="secondary">
                Team
              </Button>
            </Link>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Recent activity" />
          {store.audit.length ? (
            <ul className="space-y-3">
              {store.audit.slice(0, 5).map((item) => (
                <li key={item.id} className="text-sm">
                  <p>
                    {item.action} · {item.actor}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTime(item.time)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Activity appears after changes are saved.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
export function ProjectsPage() {
  const store = useAppStore();
  const action = useAction();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Due date");
  const [create, setCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const owner = store.currentUser?.role === "owner";
  const filtered = store.projects
    .filter(
      (p) =>
        (status === "All" || p.status === status) &&
        (p.name + " " + p.client + " " + p.summary)
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Name"
        ? a.name.localeCompare(b.name)
        : sort === "Progress"
          ? b.progress - a.progress
          : a.dueDate.localeCompare(b.dueDate),
    );
  const pagination = usePagination(filtered, search + status + sort);
  return (
    <>
      <SectionHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Plan delivery, assign members and track task-derived progress."
        action={
          owner ? (
            <Button disabled={action.pending} onClick={() => setCreate(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          ) : (
            <Badge>Member access</Badge>
          )
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects"
        />
        <Select
          aria-label="Project status"
          options={["All", "Active", "At Risk", "Completed", "Archived"]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Select
          aria-label="Sort projects"
          options={["Due date", "Name", "Progress"]}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        />
      </div>
      <ErrorNotice message={action.error} />
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pagination.items.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <Badge
                  tone={
                    p.status === "Completed"
                      ? "success"
                      : p.status === "At Risk"
                        ? "warning"
                        : "default"
                  }
                >
                  {p.status}
                </Badge>
                {owner && (
                  <Button
                    variant="ghost"
                    aria-label={"Delete " + p.name}
                    disabled={action.pending}
                    onClick={() => setDeleting(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Link
                className="mt-4 block text-xl font-semibold"
                to={"/app/projects/" + p.id}
              >
                {p.name}
              </Link>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">
                {p.summary || "No summary yet."}
              </p>
              <div className="mt-5">
                <Progress value={p.progress} />
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Due {formatDate(p.dueDate)} · {p.members.length} members
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={"/app/projects/" + p.id}>
                  <Button asChild variant="secondary">
                    Open project
                  </Button>
                </Link>
                {owner && p.status !== "Archived" && (
                  <Button
                    variant="ghost"
                    disabled={action.pending}
                    onClick={() => {
                      void action.run(
                        () => store.archiveProject(p.id),
                        "Project archived",
                      );
                    }}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects found"
          description={
            search || status !== "All"
              ? "Try a different search or filter."
              : "Owners can create a project to start planning."
          }
        />
      )}
      <Pagination {...pagination} />
      <Modal
        open={create}
        title="Create project"
        onClose={() => setCreate(false)}
      >
        {create && <ProjectForm onSaved={() => setCreate(false)} />}
      </Modal>
      <Modal
        open={!!deleting}
        title="Delete project?"
        description="This also permanently deletes its tasks and comments."
        onClose={() => setDeleting(null)}
      >
        <ErrorNotice message={action.error} />
        <Button
          variant="danger"
          disabled={action.pending}
          onClick={async () => {
            if (!deleting) return;
            const result = await action.run(
              () => store.deleteProject(deleting),
              "Project deleted",
            );
            if (result.ok) setDeleting(null);
          }}
        >
          Delete project
        </Button>
      </Modal>
    </>
  );
}
export function ProjectDetailsPage() {
  const { projectId } = useParams();
  return <ProjectDetails key={projectId} id={projectId ?? ""} />;
}
function ProjectDetails({ id }: { id: string }) {
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [edit, setEdit] = useState(false);
  const [add, setAdd] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const project = store.projects.find((p) => p.id === id);
  if (!project)
    return (
      <EmptyState
        title="Project not found"
        description="It may have been removed, or belong to another workspace."
        action={
          <Link to="/app/projects">
            <Button asChild>Back to projects</Button>
          </Link>
        }
      />
    );
  const tasks = store.tasks.filter((t) => t.projectId === id);
  const owner = store.currentUser?.role === "owner";
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/app/projects" },
          { label: project.name },
        ]}
      />
      <SectionHeader
        title={project.name}
        description={project.summary}
        action={
          <div className="flex flex-wrap gap-2">
            {project.status !== "Archived" && (
              <Button onClick={() => setAdd(true)}>Add task</Button>
            )}
            {owner && (
              <>
                <Button variant="secondary" onClick={() => setEdit(true)}>
                  Edit project
                </Button>
                <Button variant="danger" onClick={() => setDeleting(true)}>
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Status" value={project.status} />
        <Metric label="Tasks" value={tasks.length} />
        <Metric
          label="Completion"
          value={project.progress + "%"}
          detail="Calculated from tasks"
        />
      </div>
      <div className="my-6 flex flex-wrap gap-2">
        {["Overview", "Timeline", "Members", "Files", "Progress"].map(
          (name) => (
            <TabButton
              key={name}
              active={tab === name}
              onClick={() => setTab(name)}
            >
              {name}
            </TabButton>
          ),
        )}
      </div>
      <Card>
        {tab === "Overview" && (
          <>
            <dl className="mb-6 grid gap-5 sm:grid-cols-3">
              <DetailsRow label="Due date">
                {formatDate(project.dueDate)}
              </DetailsRow>
              <DetailsRow label="Client">{project.client || "None"}</DetailsRow>
              <DetailsRow label="Budget note">
                {project.budget || "None"}
              </DetailsRow>
            </dl>
            {tasks.length ? (
              <TaskList tasks={tasks} />
            ) : (
              <p className="text-sm text-slate-500">
                No tasks in this project.
              </p>
            )}
          </>
        )}
        {tab === "Timeline" && (
          <>
            <h3 className="mb-4 font-semibold">Task deadlines</h3>
            {tasks.length ? (
              <TaskList
                tasks={[...tasks].sort((a, b) =>
                  a.dueDate.localeCompare(b.dueDate),
                )}
              />
            ) : (
              <p>No task deadlines yet.</p>
            )}
          </>
        )}
        {tab === "Members" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {store.members
              .filter((m) => project.members.includes(m.id))
              .map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} />
                  <div>
                    <p>{m.name}</p>
                    <p className="text-sm text-slate-500">
                      {m.role} · {m.team || "No team"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
        {tab === "Files" && (
          <p className="text-sm text-slate-500 dark:text-slate-300">
            File uploads are not configured in this installation. Add context in
            task descriptions and comments.
          </p>
        )}
        {tab === "Progress" && (
          <div className="space-y-6">
            <Progress value={project.progress} label="Project completion" />
            <p className="text-sm text-slate-500">
              Progress and completed status are calculated from task status and
              subtasks.
            </p>
            {tasks.map((t) => (
              <Link className="block" key={t.id} to={"/app/tasks/" + t.id}>
                <Progress value={t.progress} label={t.title} />
              </Link>
            ))}
          </div>
        )}
      </Card>
      {owner && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-slate-500">
            Completed status is calculated from tasks. Reopen a task to reopen a
            completed project.
          </p>
          <Select
            label="Project status"
            disabled={action.pending}
            options={
              project.status === "Completed"
                ? ["Completed", "Archived"]
                : ["Active", "At Risk", "Archived"]
            }
            value={project.status}
            onChange={(e) => {
              if (e.target.value !== "Completed")
                void action.run(
                  () =>
                    store.updateProject(id, {
                      status: e.target.value as
                        "Active" | "At Risk" | "Archived",
                    }),
                  "Project status saved",
                );
            }}
          />
          <ErrorNotice message={action.error} />
        </div>
      )}
      <Modal open={edit} title="Edit project" onClose={() => setEdit(false)}>
        {edit && (
          <ProjectForm project={project} onSaved={() => setEdit(false)} />
        )}
      </Modal>
      <Modal open={add} title="Create task" onClose={() => setAdd(false)}>
        {add && <TaskForm projectId={id} onSaved={() => setAdd(false)} />}
      </Modal>
      <Modal
        open={deleting}
        title="Delete project?"
        description="Its tasks and comments will also be deleted."
        onClose={() => setDeleting(false)}
      >
        <ErrorNotice message={action.error} />
        <Button
          variant="danger"
          disabled={action.pending}
          onClick={async () => {
            const result = await action.run(
              () => store.deleteProject(id),
              "Project deleted",
            );
            if (result.ok) navigate("/app/projects");
          }}
        >
          Confirm deletion
        </Button>
      </Modal>
    </>
  );
}
export function KanbanPage() {
  const store = useAppStore();
  const [project, setProject] = useState("All");
  return (
    <>
      <SectionHeader
        eyebrow="Execution"
        title="Kanban board"
        description="Drag tasks between stages, or use their previous and next buttons."
        action={
          <Link to="/app/tasks">
            <Button asChild>Create or edit tasks</Button>
          </Link>
        }
      />
      <div className="mb-5 max-w-sm">
        <Select
          aria-label="Kanban project"
          options={[
            { value: "All", label: "All projects" },
            ...store.projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
      </div>
      {!store.tasks.length ? (
        <EmptyState
          title="No tasks yet"
          description="Create a project and task to fill your board."
        />
      ) : (
        <KanbanBoard
          tasks={store.tasks.filter(
            (t) => project === "All" || t.projectId === project,
          )}
        />
      )}
    </>
  );
}
export function CalendarPage() {
  const store = useAppStore();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const year = month.getFullYear();
  const index = month.getMonth();
  const offset = new Date(year, index, 1).getDay();
  const days = new Date(year, index + 1, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((offset + days) / 7) * 7 },
    (_, i) => i - offset + 1,
  );
  const selected = store.tasks.filter((t) => t.dueDate === store.selectedDate);
  return (
    <>
      <SectionHeader
        eyebrow="Planning"
        title="Calendar"
        description="Tasks scheduled by their actual due date."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              aria-label="Previous month"
              onClick={() => setMonth(new Date(year, index - 1, 1))}
            >
              ←
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const today = new Date();
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                store.setSelectedDate(dateInput(today));
              }}
            >
              Today
            </Button>
            <Button
              variant="secondary"
              aria-label="Next month"
              onClick={() => setMonth(new Date(year, index + 1, 1))}
            >
              →
            </Button>
          </div>
        }
      />
      <Card className="p-3 sm:p-6">
        <h3 className="mb-5 text-xl font-semibold">
          {month.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </h3>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="pb-2 text-center text-xs font-medium text-slate-500"
            >
              {day}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day < 1 || day > days)
              return <div key={i} aria-hidden="true" />;
            const date = dateInput(new Date(year, index, day));
            const tasks = store.tasks.filter((t) => t.dueDate === date);
            return (
              <button
                key={i}
                type="button"
                aria-label={formatDate(date) + ", " + tasks.length + " tasks"}
                aria-pressed={date === store.selectedDate}
                onClick={() => store.setSelectedDate(date)}
                className={cn(
                  "min-h-16 rounded-xl border p-1 text-left sm:min-h-24 sm:p-3",
                  date === store.selectedDate
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15"
                    : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5",
                )}
              >
                <span className="text-sm">{day}</span>
                {tasks.length > 0 && (
                  <>
                    <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span className="mt-1 hidden text-[10px] text-slate-500 sm:block">
                      {tasks.length} tasks
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="mt-6">
        <SectionHeader
          title={formatDate(store.selectedDate)}
          description={selected.length + " tasks due"}
        />
        {selected.length ? (
          <TaskList tasks={selected} />
        ) : (
          <p className="text-sm text-slate-500">No tasks due on this date.</p>
        )}
      </Card>
    </>
  );
}
export function TasksPage() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [project, setProject] = useState("All");
  const [sort, setSort] = useState("Due date");
  const [create, setCreate] = useState(false);
  const priorityWeight: Record<Priority, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4,
  };
  const filtered = store.tasks
    .filter(
      (t) =>
        (status === "All" || t.status === status) &&
        (project === "All" || t.projectId === project) &&
        (t.title + " " + t.description + " " + t.labels.join(" "))
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Priority"
        ? priorityWeight[b.priority] - priorityWeight[a.priority]
        : sort === "Title"
          ? a.title.localeCompare(b.title)
          : a.dueDate.localeCompare(b.dueDate),
    );
  const pagination = usePagination(filtered, search + status + project + sort);
  return (
    <>
      <SectionHeader
        eyebrow="Execution"
        title="Tasks"
        description="Manage priorities, assignees and deadlines."
        action={
          <Button
            onClick={() => setCreate(true)}
            disabled={!store.projects.some((p) => p.status !== "Archived")}
          >
            <Plus className="h-4 w-4" />
            New task
          </Button>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tasks"
        />
        <Select
          aria-label="Task status filter"
          options={["All", ...statuses]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Select
          aria-label="Task project filter"
          options={[
            { value: "All", label: "All projects" },
            ...store.projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
        <Select
          aria-label="Sort tasks"
          options={["Due date", "Priority", "Title"]}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        />
      </div>
      {filtered.length ? (
        <Card>
          <TaskList tasks={pagination.items} />
        </Card>
      ) : (
        <EmptyState
          title="No tasks found"
          description="Adjust your filters, or add a task to an active project."
        />
      )}
      <Pagination {...pagination} />
      <Modal open={create} title="Create task" onClose={() => setCreate(false)}>
        {create && <TaskForm onSaved={() => setCreate(false)} />}
      </Modal>
    </>
  );
}
export function TaskDetailsPage() {
  const { taskId } = useParams();
  return <TaskDetails key={taskId} id={taskId ?? ""} />;
}
function TaskDetails({ id }: { id: string }) {
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comment, setComment] = useState("");
  const task = store.tasks.find((t) => t.id === id);
  if (!task)
    return (
      <EmptyState
        title="Task not found"
        description="It may have been deleted or belong to another workspace."
        action={
          <Link to="/app/tasks">
            <Button asChild>Back to tasks</Button>
          </Link>
        }
      />
    );
  const project = store.projects.find((p) => p.id === task.projectId);
  const assignee = store.members.find((m) => m.id === task.assigneeId);
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Tasks", href: "/app/tasks" }, { label: task.title }]}
      />
      <SectionHeader
        title={task.title}
        description={project?.name ?? "Project"}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEdit(true)}>
              Edit task
            </Button>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              Delete task
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold">Description</h3>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
              {task.description || "No description."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {task.labels.map((label) => (
                <Badge key={label}>{label}</Badge>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold">Subtasks</h3>
            {task.subtasks.length ? (
              <div className="space-y-3">
                {task.subtasks.map((subtask) => (
                  <label
                    className="flex items-start gap-3 text-sm"
                    key={subtask.id}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={subtask.done}
                      disabled={action.pending}
                      onChange={() => {
                        void action.run(
                          () => store.toggleSubtask(id, subtask.id),
                          "Subtask updated",
                        );
                      }}
                    />
                    <span
                      className={
                        subtask.done ? "text-slate-500 line-through" : ""
                      }
                    >
                      {subtask.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Use Edit task to add subtasks.
              </p>
            )}
            <div className="mt-6">
              <Progress value={task.progress} />
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold">Comments ({task.comments})</h3>
            <div className="space-y-5">
              {(store.comments[id] ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {store.members.find((m) => m.id === item.authorId)
                        ?.name ?? "Workspace member"}
                    </span>
                    <time dateTime={item.time}>{formatTime(item.time)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
            <form
              className="mt-5 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await action.run(
                  () => store.addComment(id, comment.trim()),
                  "Comment added",
                );
                if (result.ok) setComment("");
              }}
            >
              <Textarea
                label="Add a comment"
                required
                maxLength={5000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <ErrorNotice message={action.error} />
              <Button
                type="submit"
                disabled={action.pending || !comment.trim()}
              >
                Add comment
              </Button>
            </form>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <dl className="space-y-5">
              <DetailsRow label="Assignee">
                {assignee?.name ?? "Unassigned"}
              </DetailsRow>
              <DetailsRow label="Due date">
                {formatDate(task.dueDate)}
              </DetailsRow>
              <DetailsRow label="Project">
                {project ? (
                  <Link
                    to={"/app/projects/" + project.id}
                    className="text-brand-600 dark:text-brand-100"
                  >
                    {project.name}
                  </Link>
                ) : (
                  "Unavailable"
                )}
              </DetailsRow>
            </dl>
            <div className="mt-6 space-y-4">
              <Select
                label="Status"
                options={statuses}
                value={task.status}
                disabled={action.pending}
                onChange={(e) => {
                  void action.run(
                    () => store.moveTask(id, e.target.value as TaskStatus),
                    "Task status saved",
                  );
                }}
              />
              <Select
                label="Priority"
                options={priorities}
                value={task.priority}
                disabled={action.pending}
                onChange={(e) => {
                  void action.run(
                    () =>
                      store.updateTask(id, {
                        priority: e.target.value as Priority,
                      }),
                    "Priority saved",
                  );
                }}
              />
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold">Files</h3>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
              File uploads are not configured. Use the description and comments
              to share task context.
            </p>
          </Card>
          <ErrorNotice message={action.error} />
        </div>
      </div>
      <Modal open={edit} title="Edit task" onClose={() => setEdit(false)}>
        {edit && <TaskForm task={task} onSaved={() => setEdit(false)} />}
      </Modal>
      <Modal
        open={deleting}
        title="Delete task?"
        description="This permanently removes the task and its comments."
        onClose={() => setDeleting(false)}
      >
        <ErrorNotice message={action.error} />
        <Button
          variant="danger"
          disabled={action.pending}
          onClick={async () => {
            const result = await action.run(
              () => store.deleteTask(id),
              "Task deleted",
            );
            if (result.ok) navigate("/app/tasks");
          }}
        >
          Confirm deletion
        </Button>
      </Modal>
    </>
  );
}
