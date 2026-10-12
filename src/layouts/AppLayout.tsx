import {
  Bell,
  CalendarDays,
  ChartColumnBig,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  SquareKanban,
  UserCircle2,
  Users2,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogoMark } from "../components/brand";
import { Avatar, Button, ErrorNotice, Modal, Select } from "../components/ui";
import { useAppStore } from "../hooks/useAppStore";
import { useAction } from "../hooks/useAction";
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
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const location = useLocation();
  const user = store.currentUser;
  if (!user) return null;
  const title =
    navItems.find((item) => location.pathname.startsWith(item.to))?.label ??
    "Workspace";
  const navigation = (
    <>
      <NavLink to="/" aria-label="NorthstarOS home">
        <LogoMark tone="lightSurface" />
      </NavLink>
      <nav aria-label="Workspace navigation" className="mt-7 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-6 space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
        <Select
          label="Active workspace"
          aria-label="Active workspace"
          options={store.workspaces.map((w) => ({
            value: w.id,
            label: w.name + " · " + w.role,
          }))}
          value={user.workspaceId}
          disabled={action.pending}
          onChange={(e) => {
            const id = e.target.value;
            setSidebarOpen(false);
            void action.run(() => store.selectWorkspace(id));
          }}
        />
        <NavLink
          className="block text-sm text-brand-600 dark:text-brand-100"
          to="/app/settings"
          onClick={() => setSidebarOpen(false)}
        >
          Workspace settings & join
        </NavLink>
        {user.role === "owner" && (
          <Button
            className="w-full"
            variant="secondary"
            disabled={action.pending}
            onClick={() => {
              void action.run(
                () =>
                  store.updateSettings({
                    appearance:
                      store.settings.appearance === "dark" ? "light" : "dark",
                  }),
                "Appearance saved",
              );
            }}
          >
            Use {store.settings.appearance === "dark" ? "light" : "dark"}{" "}
            appearance
          </Button>
        )}
      </div>
    </>
  );
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-ink-950 dark:text-white">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:p-3 focus:text-slate-950"
      >
        Skip to content
      </a>
      <aside className="print-hidden fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900 lg:block">
        {navigation}
      </aside>
      <Modal
        open={sidebarOpen}
        title="Workspace navigation"
        onClose={() => setSidebarOpen(false)}
      >
        {navigation}
      </Modal>
      <div className="print-content flex min-h-screen min-w-0 flex-col lg:pl-72">
        <header className="print-hidden sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/90 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="lg:hidden"
                aria-label="Open navigation"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="max-w-[220px] truncate text-sm text-slate-500 dark:text-slate-400">
                  {user.workspaceName}
                </p>
                <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                disabled={action.pending}
                onClick={() => {
                  void action.run(() => store.refresh(), "Workspace refreshed");
                }}
              >
                Refresh
              </Button>
              <NavLink
                to="/app/notifications"
                aria-label="Notifications"
                className="relative rounded-2xl border border-slate-200 p-3 dark:border-white/10"
              >
                <Bell className="h-5 w-5" />
                {store.notifications.some((n) => !n.read) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </NavLink>
              <NavLink to="/app/profile" className="flex items-center gap-2">
                <Avatar name={user.name} />
                <span className="hidden max-w-[140px] truncate text-sm sm:block">
                  {user.name}
                </span>
              </NavLink>
              <Button
                variant="ghost"
                aria-label="Log out"
                disabled={action.pending}
                onClick={async () => {
                  const result = await action.run(() => store.logout());
                  if (result.ok) navigate("/login", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main
          id="workspace-main"
          tabIndex={-1}
          aria-busy={store.busy}
          className="min-w-0 flex-1 space-y-5 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          <ErrorNotice message={store.loadError || action.error} />
          <div key={user.workspaceId}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
