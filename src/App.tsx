import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { ToastViewport } from "./components/ui";
import { AuthPage, ForgotPasswordPage, RegisterPage } from "./pages/AuthPages";
import { LandingPage } from "./pages/LandingPage";
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

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastViewport />
    </>
  );
}
