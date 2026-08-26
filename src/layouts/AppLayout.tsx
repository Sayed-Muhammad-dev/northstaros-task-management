import { Bell, CalendarDays, ChartColumnBig, FolderKanban, HelpCircle, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, SquareKanban, UserCircle2, Users2 } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { LogoMark } from "../components/brand";
import { Avatar, Button, Select } from "../components/ui";
import { useAppStore } from "../hooks/useAppStore";
import { cn } from "../utils/helpers";

const navItems = [
  { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "Projects", to: "/app/projects", icon: FolderKanban },
  { label: "Kanban Board", to: "/app/kanban", icon: SquareKanban },
  { label: "Calendar", to: "/app/calendar", icon: CalendarDays },
  { label: "Tasks", to: "/app/tasks", icon: SquareKanban },
  { label: "Team Members", to: "/app/team", icon: Users2 },
  { label: "Messages", to: "/app/messages", icon: MessageSquare },
  { label: "Notifications", to: "/app/notifications", icon: Bell },
  { label: "Reports", to: "/app/reports", icon: ChartColumnBig },
  { label: "Analytics", to: "/app/analytics", icon: ChartColumnBig },
  { label: "Settings", to: "/app/settings", icon: Settings },
  { label: "Profile", to: "/app/profile", icon: UserCircle2 },
  { label: "Help Center", to: "/app/help", icon: HelpCircle },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { projects, currentProjectId, setCurrentProjectId, settings, updateSettings, pushToast, notifications, currentUser } = useAppStore();
  const location = useLocation();

  const pageTitle = useMemo(() => navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? "Workspace", [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition dark:bg-ink-950 dark:text-white">
      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-80 border-r border-slate-200 bg-white/95 p-6 shadow-panel transition-transform dark:border-white/10 dark:bg-ink-900/95 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <LogoMark />
            <Button variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
          <div className="mt-8 rounded-[28px] border border-slate-200/70 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Workspace</p>
            <div className="mt-3">
              <Select
                options={projects.map((project) => project.name)}
                value={projects.find((project) => project.id === currentProjectId)?.name}
                onChange={(event) => {
                  const project = projects.find((item) => item.name === event.target.value);
                  if (project) {
                    setCurrentProjectId(project.id);
                    pushToast({ title: "Workspace switched", description: `${project.name} is now your active project.` });
                  }
                }}
              />
            </div>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => updateSettings({ appearance: settings.appearance === "dark" ? "light" : "dark" })}
            >
              Toggle {settings.appearance === "dark" ? "Light" : "Dark"} Mode
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-80">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/85 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="lg:hidden" onClick={() => setSidebarOpen((current) => !current)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Command center</p>
                  <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    pushToast({
                      title: "Sync complete",
                      description: "Latest activity, tasks, and reports were refreshed.",
                    })
                  }
                >
                  Sync Workspace
                </Button>
                <NavLink to="/app/notifications" className="relative rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                  <Bell className="h-5 w-5" />
                  {notifications.some((item) => !item.read) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />}
                </NavLink>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-white/5">
                  <Avatar name={currentUser.name} />
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.role}</p>
                  </div>
                  <LogOut className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
