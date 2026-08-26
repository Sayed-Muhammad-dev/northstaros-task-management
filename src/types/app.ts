export type Priority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus = "Backlog" | "Todo" | "In Progress" | "Review" | "Completed";

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
  messages: { id: string; authorId: string; content: string; time: string }[];
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
