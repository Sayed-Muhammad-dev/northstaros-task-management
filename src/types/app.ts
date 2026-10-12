export type Priority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus =
  "Backlog" | "Todo" | "In Progress" | "Review" | "Completed";
export type Role = "owner" | "member";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  workspaceId: string;
  workspaceName: string;
};
export type Workspace = { id: string; name: string };
export type WorkspaceMembership = Workspace & { role: Role };
export type Member = {
  id: string;
  name: string;
  role: string;
  team: string;
  email: string;
  avatar: string;
  utilization: number;
  completedTasks: number;
  permissions: string[];
  status: "Online" | "Away" | "Offline";
};
export type Project = {
  id: string;
  name: string;
  client: string;
  summary: string;
  status: "Active" | "At Risk" | "Completed" | "Archived";
  progress: number;
  dueDate: string;
  members: string[];
  budget: string;
  health: string;
  tags: string[];
};
export type Task = {
  id: string;
  title: string;
  projectId: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  assigneeId: string;
  labels: string[];
  progress: number;
  comments: number;
  attachments: number;
  subtasks: { id: string; label: string; done: boolean }[];
};
export type Comment = {
  id: string;
  authorId: string;
  content: string;
  time: string;
};
export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: "System" | "Tasks" | "Team";
  read: boolean;
};
export type MessageThread = {
  id: string;
  title: string;
  participants: string[];
  lastMessage: string;
  unread: number;
  messages: Comment[];
};
export type Invitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
};
export type AuditItem = {
  id: string;
  action: string;
  time: string;
  actor: string;
};
export type ToastItem = {
  id: string;
  title: string;
  description: string;
  tone?: "default" | "success" | "warning";
};
export type AppSettings = {
  appearance: "light" | "dark";
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  twoFactorAuth: boolean;
  timezone: string;
};
export type AppState = {
  revision: number;
  settings: AppSettings;
  projects: Project[];
  tasks: Task[];
  members: Member[];
  notifications: NotificationItem[];
  messageThreads: MessageThread[];
  comments: Record<string, Comment[]>;
  currentUser: User;
  workspace: Workspace;
  invitations: Invitation[];
  audit: AuditItem[];
};
export type ProjectInput = Pick<
  Project,
  "name" | "client" | "summary" | "dueDate" | "members" | "budget" | "tags"
>;
export type ProjectPatch = Partial<
  ProjectInput & { status: "Active" | "At Risk" | "Archived" }
>;
export type TaskInput = Pick<
  Task,
  | "title"
  | "projectId"
  | "description"
  | "status"
  | "priority"
  | "dueDate"
  | "assigneeId"
  | "labels"
> & { subtasks: { label: string; done: boolean }[] };
export type TaskPatch = Partial<
  Omit<TaskInput, "subtasks"> & {
    subtasks: { id?: string; label: string; done: boolean }[];
  }
>;
export type ReportSummary = {
  taskCount: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  byStatus: Record<TaskStatus, number>;
  projects: {
    id: string;
    name: string;
    taskCount: number;
    completedTasks: number;
    progress: number;
  }[];
};
