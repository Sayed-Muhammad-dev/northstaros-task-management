import { CalendarRange, Download, Filter, FolderOpenDot, Plus, Search, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarChart, DonutStat } from "../components/charts";
import { KanbanBoard } from "../components/KanbanBoard";
import { Avatar, Badge, Breadcrumbs, Button, Card, EmptyState, Input, Modal, SearchInput, SectionHeader, Select, Switch, TabButton } from "../components/ui";
import { useAppStore } from "../hooks/useAppStore";
import { cn, formatDate, formatShortDate } from "../utils/helpers";

function StatCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-4 text-4xl font-semibold">{value}</p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{helper}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { projects, tasks, notifications, members, currentProjectId, pushToast } = useAppStore();
  const currentProject = projects.find((project) => project.id === currentProjectId) ?? projects[0];
  const upcoming = tasks.filter((task) => task.status !== "Completed").slice(0, 4);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title={`${currentProject.name} delivery pulse`}
        description="A premium snapshot of active work, deadlines, notifications, and reporting health."
        action={
          <Button onClick={() => pushToast({ title: "Shared report", description: "Dashboard summary was sent to your leadership group." })}>
            Share snapshot
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Open tasks" value={`${tasks.filter((task) => task.status !== "Completed").length}`} helper="Across active teams and current project scope." />
        <StatCard title="Project progress" value={`${currentProject.progress}%`} helper="Delivery is tracking against launch milestones." />
        <StatCard title="Upcoming deadlines" value={`${upcoming.length}`} helper="Needs review in the next seven days." />
        <StatCard title="Unread alerts" value={`${notifications.filter((item) => !item.read).length}`} helper="Risk, comment, and digest notifications." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader title="Recent tasks" description="Most recent execution work across the active project." />
          <div className="space-y-4">
            {upcoming.map((task) => {
              const assignee = members.find((member) => member.id === task.assigneeId);
              return (
                <Link key={task.id} to={`/app/tasks/${task.id}`} className="block rounded-3xl border border-slate-200/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {assignee && <Avatar name={assignee.name} status={assignee.status} />}
                      <Badge>{task.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
        <div className="grid gap-6">
          <DonutStat value={87} label="Productivity" description="Blended score based on velocity, due date health, and task completion." />
          <Card>
            <SectionHeader title="Quick actions" />
            <div className="grid gap-3">
              {[
                { label: "Create project", description: "Provision a new workspace stream." },
                { label: "Open calendar", description: "Review due dates and scheduling." },
                { label: "Send update", description: "Notify stakeholders instantly." },
              ].map((action) => (
                <button
                  key={action.label}
                  className="rounded-3xl border border-slate-200/70 p-4 text-left transition hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30"
                  onClick={() => pushToast({ title: action.label, description: action.description })}
                >
                  <p className="font-medium">{action.label}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{action.description}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <Card>
          <SectionHeader title="Project progress" description="Current stage completion across major delivery lanes." />
          <BarChart
            items={[
              { label: "Product scope", value: 78 },
              { label: "Engineering execution", value: 66, tone: "mint" },
              { label: "Operations readiness", value: 57, tone: "amber" },
            ]}
          />
        </Card>
        <Card>
          <SectionHeader title="Upcoming deadlines" />
          <div className="space-y-4">
            {tasks
              .slice()
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 4)
              .map((task) => (
                <div key={task.id} className="rounded-3xl border border-slate-200/70 p-4 dark:border-white/10">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Due {formatDate(task.dueDate)}</p>
                </div>
              ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Recent activity" />
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-3xl border border-slate-200/70 p-4 dark:border-white/10">
                <p className="font-medium">{notification.title}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{notification.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">{notification.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { projects, archiveProject, deleteProject, createProject, members, pushToast } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Due date");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", summary: "", dueDate: "2026-08-20", budget: "$25k" });

  const filtered = useMemo(() => {
    const result = projects.filter((project) => {
      const matchesSearch = [project.name, project.client, project.summary].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "All" || project.status === status;
      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sort === "Progress") return b.progress - a.progress;
      if (sort === "Name") return a.name.localeCompare(b.name);
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [projects, search, status, sort]);

  const pageSize = 4;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Projects"
        title="Manage portfolio-level workstreams"
        description="Create, edit, archive, and remove project spaces with realistic governance controls."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Create project
          </Button>
        }
      />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects" />
          <Select label="Status" options={["All", "Active", "At Risk", "Completed", "Archived"]} value={status} onChange={(event) => setStatus(event.target.value)} />
          <Select label="Sort by" options={["Due date", "Progress", "Name"]} value={sort} onChange={(event) => setSort(event.target.value)} />
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {paged.map((project) => (
          <Card key={project.id}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link to={`/app/projects/${project.id}`} className="text-xl font-semibold hover:text-brand-600">
                    {project.name}
                  </Link>
                  <Badge tone={project.status === "At Risk" ? "warning" : project.status === "Archived" ? "danger" : "success"}>{project.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{project.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <p>Due {formatDate(project.dueDate)}</p>
                <p className="mt-2">Budget {project.budget}</p>
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex -space-x-3">
                {project.members.map((memberId) => {
                  const member = members.find((item) => item.id === memberId);
                  return member ? <Avatar key={member.id} name={member.name} status={member.status} /> : null;
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/app/projects/${project.id}`}>
                  <Button variant="secondary">Open</Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    archiveProject(project.id);
                    pushToast({ title: "Project archived", description: `${project.name} was moved to archived.` });
                  }}
                >
                  Archive
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteProject(project.id);
                    pushToast({ title: "Project deleted", description: `${project.name} and related tasks were removed.` });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create new project" description="Provision a new workstream with realistic workspace metadata.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Project name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Client" value={form.client} onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))} />
          <div className="md:col-span-2">
            <Input label="Summary" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </div>
          <Input label="Due date" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
          <Input label="Budget" value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name || !form.client || !form.summary) return;
              createProject({
                name: form.name,
                client: form.client,
                summary: form.summary,
                dueDate: form.dueDate,
                budget: form.budget,
                members: members.slice(0, 2).map((member) => member.id),
                tags: ["New"],
              });
              pushToast({ title: "Project created", description: `${form.name} is now available in the workspace.` });
              setOpen(false);
            }}
          >
            Save project
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { projects, tasks, members, updateProject, pushToast } = useAppStore();
  const [tab, setTab] = useState("Overview");
  const project = projects.find((item) => item.id === projectId);

  if (!project) return <EmptyState title="Project not found" description="The requested project does not exist anymore." />;

  const projectTasks = tasks.filter((task) => task.projectId === project.id);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Projects", href: "/app/projects" }, { label: project.name }]} />
      <SectionHeader
        title={project.name}
        description={project.summary}
        action={
          <Button
            onClick={() => {
              updateProject(project.id, { progress: Math.min(project.progress + 5, 100) });
              pushToast({ title: "Progress updated", description: `${project.name} moved forward by 5%.` });
            }}
          >
            Update progress
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3">
        {["Overview", "Timeline", "Members", "Files", "Progress"].map((item) => (
          <TabButton key={item} active={tab === item} onClick={() => setTab(item)}>
            {item}
          </TabButton>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <SectionHeader title="Project overview" />
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Client</p>
                <p className="mt-2 text-lg font-medium">{project.client}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Health</p>
                <p className="mt-2 text-lg font-medium">{project.health}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Due date</p>
                <p className="mt-2 text-lg font-medium">{formatDate(project.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Budget</p>
                <p className="mt-2 text-lg font-medium">{project.budget}</p>
              </div>
            </div>
          </Card>
          <Card>
            <SectionHeader title="Progress" />
            <BarChart items={[{ label: "Delivery", value: project.progress }, { label: "Risk coverage", value: 72, tone: "mint" }, { label: "Stakeholder confidence", value: 81 }]} />
          </Card>
        </div>
      )}
      {tab === "Timeline" && (
        <Card>
          <SectionHeader title="Timeline" description="Major delivery checkpoints and deadlines." />
          <div className="space-y-5">
            {projectTasks.map((task) => (
              <div key={task.id} className="flex gap-4">
                <div className="mt-1 h-4 w-4 rounded-full bg-brand-500" />
                <div className="rounded-3xl border border-slate-200/70 p-4 dark:border-white/10">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{formatDate(task.dueDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "Members" && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {project.members.map((memberId) => {
            const member = members.find((item) => item.id === memberId);
            return member ? (
              <Card key={member.id}>
                <div className="flex items-center gap-4">
                  <Avatar name={member.name} status={member.status} />
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{member.role}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">{member.email}</div>
              </Card>
            ) : null;
          })}
        </div>
      )}
      {tab === "Files" && (
        <Card>
          <SectionHeader title="Files" description="Attachments and working assets connected to this project." />
          <div className="grid gap-4 md:grid-cols-3">
            {["Launch-plan-v4.fig", "Migration-runbook.pdf", "Stakeholder-brief.docx"].map((file) => (
              <button
                key={file}
                className="rounded-3xl border border-slate-200/70 p-4 text-left hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30"
                onClick={() => pushToast({ title: "File opened", description: `${file} previewed in the workspace.` })}
              >
                <FolderOpenDot className="h-5 w-5 text-brand-500" />
                <p className="mt-4 font-medium">{file}</p>
              </button>
            ))}
          </div>
        </Card>
      )}
      {tab === "Progress" && (
        <Card>
          <SectionHeader title="Progress detail" />
          <div className="space-y-4">
            {projectTasks.map((task) => (
              <div key={task.id}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{task.title}</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function KanbanPage() {
  const { tasks, projects } = useAppStore();
  const [projectFilter, setProjectFilter] = useState("All projects");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        const project = projects.find((item) => item.id === task.projectId);
        const matchesProject = projectFilter === "All projects" || project?.name === projectFilter;
        const matchesPriority = priorityFilter === "All priorities" || task.priority === priorityFilter;
        const matchesSearch = task.title.toLowerCase().includes(search.trim().toLowerCase());
        return matchesProject && matchesPriority && matchesSearch;
      }),
    [tasks, projects, projectFilter, priorityFilter, search],
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Kanban"
        title="Drag a card to move it between columns"
        description="Cards are draggable between all five columns. Arrow buttons on each card do the same thing from the keyboard, so the board works without a mouse."
      />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search board cards" />
          <Select
            label="Project"
            options={["All projects", ...projects.map((project) => project.name)]}
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          />
          <Select
            label="Priority"
            options={["All priorities", "Critical", "High", "Medium", "Low"]}
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          />
        </div>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState
          title="No cards match these filters"
          description="Clear the search or widen the project and priority filters to see more of the board."
        />
      ) : (
        <KanbanBoard tasks={filtered} />
      )}
    </div>
  );
}

export function CalendarPage() {
  const { selectedDate, setSelectedDate, tasks } = useAppStore();
  const days = Array.from({ length: 31 }, (_, index) => `2026-07-${String(index + 1).padStart(2, "0")}`);
  const dayTasks = tasks.filter((task) => task.dueDate === selectedDate);

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Calendar" title="Interactive due-date calendar" description="Click any day to inspect due work, deadlines, and scheduling pressure." />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <CalendarRange className="h-5 w-5 text-brand-500" />
            <h3 className="text-xl font-semibold">July 2026</h3>
          </div>
          <div className="grid grid-cols-7 gap-3 text-center text-xs uppercase tracking-[0.24em] text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-7 gap-3">
            {days.map((date) => {
              const count = tasks.filter((task) => task.dueDate === date).length;
              const active = selectedDate === date;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "rounded-3xl border px-3 py-4 text-left transition",
                    active
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-200 bg-white hover:border-brand-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-500/30",
                  )}
                >
                  <div className="text-sm font-medium">{date.slice(-2)}</div>
                  <div className={cn("mt-4 text-xs", active ? "text-brand-100" : "text-slate-400")}>{count} tasks</div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionHeader title={`Tasks due on ${formatDate(selectedDate)}`} />
          {dayTasks.length ? (
            <div className="space-y-4">
              {dayTasks.map((task) => (
                <Link key={task.id} to={`/app/tasks/${task.id}`} className="block rounded-3xl border border-slate-200/70 p-4 dark:border-white/10">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{task.description}</p>
                  <div className="mt-3 flex gap-2">
                    <Badge>{task.status}</Badge>
                    <Badge tone={task.priority === "Critical" ? "danger" : "warning"}>{task.priority}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No deadlines here" description="Select another day or create work for this date." />
          )}
        </Card>
      </div>
    </div>
  );
}

export function TasksPage() {
  const { tasks, projects, createTask, members, pushToast } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Due date");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    projectName: projects[0]?.name ?? "",
    description: "",
    status: "Todo",
    priority: "Medium",
    dueDate: "2026-07-20",
  });

  const filtered = useMemo(() => {
    const result = tasks.filter((task) => {
      const projectName = projects.find((project) => project.id === task.projectId)?.name ?? "";
      const matchesSearch = [task.title, task.description, projectName].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "All" || task.status === status;
      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sort === "Priority") return b.priority.localeCompare(a.priority);
      if (sort === "Progress") return b.progress - a.progress;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [tasks, projects, search, status, sort]);

  const paged = filtered.slice((page - 1) * 5, page * 5);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Tasks"
        title="Task list with filters, sorting, and pagination"
        description="Every visible control works against live local state so the interface behaves like a real product."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Create task
          </Button>
        }
      />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tasks" />
          <Select label="Status" options={["All", "Backlog", "Todo", "In Progress", "Review", "Completed"]} value={status} onChange={(event) => setStatus(event.target.value)} />
          <Select label="Sort by" options={["Due date", "Priority", "Progress"]} value={sort} onChange={(event) => setSort(event.target.value)} />
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.7fr] gap-4 border-b border-slate-200/70 px-6 py-4 text-sm font-medium text-slate-500 dark:border-white/10 dark:text-slate-400 md:grid">
          <span>Task</span>
          <span>Project</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Due</span>
        </div>
        <div>
          {paged.map((task) => {
            const project = projects.find((item) => item.id === task.projectId);
            return (
              <Link
                key={task.id}
                to={`/app/tasks/${task.id}`}
                className="grid gap-3 border-b border-slate-200/70 px-6 py-4 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.7fr]"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">{project?.name}</span>
                <span><Badge>{task.status}</Badge></span>
                <span><Badge tone={task.priority === "Critical" ? "danger" : task.priority === "High" ? "warning" : "default"}>{task.priority}</Badge></span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{formatShortDate(task.dueDate)}</span>
              </Link>
            );
          })}
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create task" description="Add a real task card to the workspace.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Task title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <Select label="Project" options={projects.map((project) => project.name)} value={form.projectName} onChange={(event) => setForm((current) => ({ ...current, projectName: event.target.value }))} />
          <div className="md:col-span-2">
            <Input label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <Select label="Status" options={["Backlog", "Todo", "In Progress", "Review", "Completed"]} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} />
          <Select label="Priority" options={["Low", "Medium", "High", "Critical"]} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} />
          <Input label="Due date" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const project = projects.find((item) => item.name === form.projectName);
              if (!project || !form.title || !form.description) return;
              createTask({
                title: form.title,
                projectId: project.id,
                description: form.description,
                status: form.status as never,
                priority: form.priority as never,
                dueDate: form.dueDate,
                assigneeId: members[0].id,
                labels: ["New"],
                subtasks: [{ id: "new-subtask", label: "Kickoff", done: false }],
              });
              pushToast({ title: "Task created", description: `${form.title} was added to ${project.name}.` });
              setOpen(false);
            }}
          >
            Save task
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function TaskDetailsPage() {
  const { taskId } = useParams();
  const { tasks, projects, members, updateTask, toggleSubtask, pushToast } = useAppStore();
  const task = tasks.find((item) => item.id === taskId);
  const navigate = useNavigate();

  const [comment, setComment] = useState("");

  if (!task) return <EmptyState title="Task not found" description="The task may have been deleted or moved." action={<Button onClick={() => navigate("/app/tasks")}>Back to tasks</Button>} />;

  const project = projects.find((item) => item.id === task.projectId);
  const assignee = members.find((item) => item.id === task.assigneeId);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Tasks", href: "/app/tasks" }, { label: task.title }]} />
      <SectionHeader
        title={task.title}
        description={task.description}
        action={
          <Button
            onClick={() => {
              updateTask(task.id, { status: task.status === "Completed" ? "Review" : "Completed", progress: task.status === "Completed" ? 92 : 100 });
              pushToast({ title: "Task updated", description: `${task.title} status changed.` });
            }}
          >
            Toggle completion
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <SectionHeader title="Task details" />
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status"
              options={["Backlog", "Todo", "In Progress", "Review", "Completed"]}
              value={task.status}
              onChange={(event) => updateTask(task.id, { status: event.target.value as never })}
            />
            <Select
              label="Priority"
              options={["Low", "Medium", "High", "Critical"]}
              value={task.priority}
              onChange={(event) => updateTask(task.id, { priority: event.target.value as never })}
            />
            <Input label="Due date" type="date" value={task.dueDate} onChange={(event) => updateTask(task.id, { dueDate: event.target.value })} />
            <Input label="Project" value={project?.name ?? ""} disabled />
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Subtasks</p>
            <div className="mt-4 space-y-3">
              {task.subtasks.map((subtask) => (
                <label key={subtask.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 p-4 dark:border-white/10">
                  <input type="checkbox" checked={subtask.done} onChange={() => toggleSubtask(task.id, subtask.id)} />
                  <span className={subtask.done ? "line-through text-slate-400" : ""}>{subtask.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Comments</p>
            <div className="mt-4 flex gap-3">
              <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a new comment" />
              <Button
                onClick={() => {
                  if (!comment) return;
                  pushToast({ title: "Comment added", description: comment });
                  setComment("");
                }}
              >
                Post
              </Button>
            </div>
          </div>
        </Card>
        <div className="grid gap-6">
          <Card>
            <SectionHeader title="Assignee" />
            {assignee && (
              <div className="flex items-center gap-4">
                <Avatar name={assignee.name} status={assignee.status} />
                <div>
                  <p className="font-medium">{assignee.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{assignee.role}</p>
                </div>
              </div>
            )}
          </Card>
          <Card>
            <SectionHeader title="Attachments UI" />
            <div className="space-y-3">
              {["Specification.pdf", "Board-context.png", "Decision-log.docx"].map((file) => (
                <button key={file} className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 p-4 dark:border-white/10" onClick={() => pushToast({ title: "Attachment opened", description: file })}>
                  <span>{file}</span>
                  <Download className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function TeamMembersPage() {
  const { members, pushToast } = useAppStore();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");
  const filtered = members.filter((member) => {
    const matchesSearch = [member.name, member.role, member.team].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesRole = role === "All" || member.team === role;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Team" title="Profiles, roles, permissions, and performance" description="A realistic people-management surface with working filters and status signals." />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search team members" />
          <Select label="Team" options={["All", "Product", "Engineering", "Design", "Operations"]} value={role} onChange={(event) => setRole(event.target.value)} />
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => (
          <Card key={member.id}>
            <div className="flex items-center gap-4">
              <Avatar name={member.name} status={member.status} />
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{member.role}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Completed tasks</span>
                <span className="font-medium">{member.completedTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Utilization</span>
                <span className="font-medium">{member.utilization}%</span>
              </div>
              <div>
                <p className="mb-3 font-medium">Permissions</p>
                <div className="space-y-2">
                  {member.permissions.map((permission) => (
                    <div key={permission} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button className="mt-5 w-full" variant="secondary" onClick={() => pushToast({ title: "Member profile", description: `${member.name} profile reviewed.` })}>
              Open profile
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { messageThreads, members, addMessage } = useAppStore();
  const [activeThreadId, setActiveThreadId] = useState(messageThreads[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const thread = messageThreads.find((item) => item.id === activeThreadId) ?? messageThreads[0];

  if (!thread) return <EmptyState title="No conversations yet" description="Start a message thread to coordinate work." />;

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card>
        <SectionHeader title="Messages" description="Team conversations connected to execution." />
        <div className="space-y-3">
          {messageThreads.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveThreadId(item.id)}
              className={cn(
                "w-full rounded-3xl border p-4 text-left transition",
                activeThreadId === item.id
                  ? "border-brand-500 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                  : "border-slate-200/70 dark:border-white/10",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.title}</p>
                {item.unread > 0 && <Badge tone="warning">{item.unread}</Badge>}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.lastMessage}</p>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader title={thread.title} description="Message history" />
        <div className="space-y-4">
          {thread.messages.map((entry) => {
            const author = members.find((member) => member.id === entry.authorId);
            return (
              <div key={entry.id} className="rounded-3xl border border-slate-200/70 p-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  {author && <Avatar name={author.name} status={author.status} />}
                  <div>
                    <p className="font-medium">{author?.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{entry.time}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{entry.content}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" icon={<Search className="h-4 w-4 opacity-0" />} />
          <Button
            onClick={() => {
              if (!message) return;
              addMessage(thread.id, members[0].id, message);
              setMessage("");
            }}
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [filter, setFilter] = useState("All");
  const filtered = notifications.filter((item) => filter === "All" || item.category === filter);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Notifications"
        title="Inbox for tasks, team updates, and system signals"
        action={<Button onClick={markAllNotificationsRead}>Mark all as read</Button>}
      />
      <div className="flex flex-wrap gap-3">
        {["All", "System", "Tasks", "Team"].map((item) => (
          <TabButton key={item} active={filter === item} onClick={() => setFilter(item)}>
            {item}
          </TabButton>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.map((notification) => (
          <Card key={notification.id} className={!notification.read ? "border-brand-200 dark:border-brand-500/30" : ""}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium">{notification.title}</p>
                  {!notification.read && <Badge tone="warning">New</Badge>}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{notification.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">{notification.time}</p>
              </div>
              <Button variant="secondary" onClick={() => markNotificationRead(notification.id)}>
                Mark as read
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { pushToast } = useAppStore();
  const [tab, setTab] = useState("Weekly");
  const reportItems = tab === "Weekly"
    ? [
        { label: "Completed tasks", value: 84, tone: "mint" as const },
        { label: "Pending tasks", value: 42, tone: "amber" as const },
        { label: "On-time delivery", value: 88, tone: "brand" as const },
      ]
    : [
        { label: "Completed tasks", value: 91, tone: "mint" as const },
        { label: "Pending tasks", value: 36, tone: "amber" as const },
        { label: "Project progress", value: 76, tone: "brand" as const },
      ];

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Reports" title="Executive-ready weekly and monthly reporting" description="Tabs, exports, and delivery health summaries all behave like a commercial SaaS reporting surface." />
      <div className="flex flex-wrap gap-3">
        {["Weekly", "Monthly"].map((item) => (
          <TabButton key={item} active={tab === item} onClick={() => setTab(item)}>
            {item}
          </TabButton>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <SectionHeader title={`${tab} report`} action={<Button onClick={() => pushToast({ title: "Report exported", description: `${tab} report downloaded as PDF.` })}><Download className="h-4 w-4" /> Export</Button>} />
          <BarChart items={reportItems} />
        </Card>
        <Card>
          <SectionHeader title="Narrative summary" />
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            Delivery remained strong this {tab.toLowerCase()}, with completed work trending above target and risk concentrated in a small number of migration tasks. Stakeholder confidence remains high and reporting latency has continued to decline.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Analytics" title="Professional charts for productivity and workload" description="Visual reporting for completed tasks, pending work, delivery confidence, and team capacity." />
      <div className="grid gap-6 xl:grid-cols-3">
        <DonutStat value={79} label="Completed tasks" description="Completed work as a share of total active scope." />
        <DonutStat value={61} label="Productivity" description="Execution score blended from throughput and due-date adherence." />
        <DonutStat value={72} label="Team workload" description="Average team capacity utilization across departments." />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Weekly report" />
          <BarChart items={[{ label: "Completed", value: 82, tone: "mint" }, { label: "Pending", value: 44, tone: "amber" }, { label: "Project progress", value: 73 }]} />
        </Card>
        <Card>
          <SectionHeader title="Monthly report" />
          <BarChart items={[{ label: "Completed", value: 89, tone: "mint" }, { label: "Pending", value: 31, tone: "amber" }, { label: "Workload balance", value: 76 }]} />
        </Card>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, pushToast } = useAppStore();
  const [tab, setTab] = useState("Appearance");

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Settings" title="Workspace, notifications, appearance, and security" description="Every settings control updates local application state immediately." />
      <div className="flex flex-wrap gap-3">
        {["Profile", "Appearance", "Notifications", "Security", "Workspace"].map((item) => (
          <TabButton key={item} active={tab === item} onClick={() => setTab(item)}>
            {item}
          </TabButton>
        ))}
      </div>
      {tab === "Profile" && (
        <Card>
          <SectionHeader title="Profile preferences" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Display name" defaultValue="Maya Chen" />
            <Input label="Email" defaultValue="maya@northstarlabs.co" />
            <Select label="Language" options={["English", "German", "French"]} value={settings.language} onChange={(event) => updateSettings({ language: event.target.value })} />
            <Input label="Timezone" value={settings.timezone} onChange={(event) => updateSettings({ timezone: event.target.value })} />
          </div>
        </Card>
      )}
      {tab === "Appearance" && (
        <Card>
          <SectionHeader title="Appearance" />
          <div className="flex items-center justify-between rounded-3xl border border-slate-200/70 p-5 dark:border-white/10">
            <div>
              <p className="font-medium">Dark mode</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Switch between light and dark workspace themes.</p>
            </div>
            <Switch checked={settings.appearance === "dark"} onChange={(value) => updateSettings({ appearance: value ? "dark" : "light" })} />
          </div>
        </Card>
      )}
      {tab === "Notifications" && (
        <Card>
          <SectionHeader title="Notification preferences" />
          <div className="space-y-4">
            {[
              { key: "emailNotifications", label: "Email notifications", value: settings.emailNotifications },
              { key: "pushNotifications", label: "Push notifications", value: settings.pushNotifications },
              { key: "weeklyDigest", label: "Weekly digest", value: settings.weeklyDigest },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-3xl border border-slate-200/70 p-5 dark:border-white/10">
                <span>{item.label}</span>
                <Switch checked={item.value} onChange={(value) => updateSettings({ [item.key]: value } as never)} />
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "Security" && (
        <Card>
          <SectionHeader title="Security" />
          <div className="flex items-center justify-between rounded-3xl border border-slate-200/70 p-5 dark:border-white/10">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Add an extra verification layer to the workspace.</p>
            </div>
            <Switch checked={settings.twoFactorAuth} onChange={(value) => updateSettings({ twoFactorAuth: value })} />
          </div>
        </Card>
      )}
      {tab === "Workspace" && (
        <Card>
          <SectionHeader title="Workspace settings" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Workspace name" defaultValue="Northstar Labs" />
            <Input label="Default domain" defaultValue="northstarlabs.co" />
          </div>
          <Button className="mt-6" onClick={() => pushToast({ title: "Workspace updated", description: "Workspace settings were saved." })}>
            Save workspace settings
          </Button>
        </Card>
      )}
    </div>
  );
}

export function ProfilePage() {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Profile" title="Workspace admin profile" description="Professional profile card with activity and productivity context." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name="Maya Chen" status="Online" />
            <div>
              <p className="text-xl font-semibold">Maya Chen</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Workspace Admin</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Email: maya@northstarlabs.co</p>
            <p>Team: Strategy & Operations</p>
            <p>Timezone: UTC+05:00</p>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Recent profile activity" />
          <BarChart items={[{ label: "Tasks managed", value: 74 }, { label: "Approvals completed", value: 68, tone: "mint" }, { label: "Reports shared", value: 52, tone: "amber" }]} />
        </Card>
      </div>
    </div>
  );
}

export function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const { pushToast } = useAppStore();
  const articles = [
    "How to create and archive projects",
    "Managing team permissions and roles",
    "Using the calendar for due-date planning",
    "Interpreting workload analytics",
    "Exporting weekly and monthly reports",
  ].filter((article) => article.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Help Center" title="Support content for real product adoption" description="Searchable guidance, operational questions, and support actions." />
      <Card>
        <SearchInput value={search} onChange={setSearch} placeholder="Search help articles" />
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <SectionHeader title="Articles" />
          <div className="space-y-3">
            {articles.map((article) => (
              <button
                key={article}
                onClick={() => setSelectedArticle(article)}
                className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 p-4 text-left transition hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30"
              >
                <span>{article}</span>
                <Filter className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Support options" />
          <div className="space-y-4">
            <button
              onClick={() => pushToast({ title: "Live chat opened", description: "A support specialist joined your workspace queue." })}
              className="w-full rounded-3xl border border-slate-200/70 p-4 text-left transition hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30"
            >
              Open live chat
            </button>
            <button
              onClick={() => pushToast({ title: "Onboarding requested", description: "Customer success will schedule a guided onboarding session." })}
              className="w-full rounded-3xl border border-slate-200/70 p-4 text-left transition hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30"
            >
              Request onboarding help
            </button>
            <button
              onClick={() => pushToast({ title: "Support email drafted", description: "A new support email draft is ready with your workspace context." })}
              className="w-full rounded-3xl border border-slate-200/70 p-4 text-left transition hover:border-brand-200 dark:border-white/10 dark:hover:border-brand-500/30"
            >
              Email product support
            </button>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        title={selectedArticle ?? "Help article"}
        description="Knowledge base article preview"
      >
        <div className="space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          <p>
            This article explains the workflow, the expected operational outcome, and the most relevant workspace controls for{" "}
            {selectedArticle?.toLowerCase()}.
          </p>
          <p>
            The help center now behaves like a real product surface: article cards open a content preview and support actions create
            visible outcomes instead of acting as dead UI.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-ink-950">
      <EmptyState
        title="404 | Route not found"
        description="The page you requested does not exist in this workspace. Return to the dashboard or the landing page."
        action={
          <div className="flex gap-3">
            <Link to="/">
              <Button variant="secondary">Landing page</Button>
            </Link>
            <Link to="/app/dashboard">
              <Button>Dashboard</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
