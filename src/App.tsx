import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import {
  Button,
  EmptyState,
  SkeletonCard,
  ToastViewport,
} from "./components/ui";
import {
  AuthPage,
  ForgotPasswordPage,
  InvitationPage,
  RegisterPage,
} from "./pages/AuthPages";
import { LandingPage } from "./pages/LandingPage";
import { useAppStore } from "./hooks/useAppStore";
import {
  AnalyticsPage,
  CalendarPage,
  DashboardPage,
  HelpCenterPage,
  KanbanPage,
  MessagesPage,
  NotFoundPage,
  NotificationsPage,
  ProfilePage,
  ProjectDetailsPage,
  ProjectsPage,
  ReportsPage,
  SettingsPage,
  TaskDetailsPage,
  TasksPage,
  TeamMembersPage,
} from "./pages/AppPages";
function ProtectedRoute() {
  const store = useAppStore();
  const location = useLocation();
  if (store.authLoading)
    return (
      <div
        className="mx-auto max-w-4xl space-y-5 p-6"
        role="status"
        aria-label="Loading your workspace"
      >
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  if (!store.currentUser) {
    if (store.loadError)
      return (
        <div className="mx-auto max-w-xl p-6">
          <EmptyState
            title="Connection unavailable"
            description={store.loadError}
            action={
              <Button
                onClick={() => {
                  void store.refresh().catch(() => {});
                }}
              >
                Retry
              </Button>
            }
          />
        </div>
      );
    return (
      <Navigate
        to={
          "/login?next=" +
          encodeURIComponent(location.pathname + location.search)
        }
        replace
      />
    );
  }
  if (!store.state)
    return (
      <div className="mx-auto max-w-xl p-6">
        <EmptyState
          title="Workspace could not be loaded"
          description={store.loadError || "Refresh to try again."}
          action={
            <Button
              onClick={() => {
                void store.refresh().catch(() => {});
              }}
            >
              Retry
            </Button>
          }
        />
      </div>
    );
  return <Outlet />;
}
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/invite" element={<InvitationPage />} />
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route
              path="projects/:projectId"
              element={<ProjectDetailsPage />}
            />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
            <Route path="team" element={<TeamMembersPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="help" element={<HelpCenterPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastViewport />
    </>
  );
}
