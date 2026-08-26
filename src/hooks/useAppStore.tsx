import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { defaultSettings, members, messageThreads, notifications, projects, tasks } from "../data/mockData";
import type { AppSettings, MessageThread, NotificationItem, Project, Task, TaskStatus, ToastItem } from "../types/app";
import { createId } from "../utils/helpers";

type AppStoreValue = {
  settings: AppSettings;
  projects: Project[];
  tasks: Task[];
  notifications: NotificationItem[];
  messageThreads: MessageThread[];
  currentProjectId: string;
  selectedDate: string;
  toasts: ToastItem[];
  currentUser: { name: string; role: string; email: string };
  members: typeof members;
  setSelectedDate: (value: string) => void;
  setCurrentProjectId: (projectId: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  createProject: (project: Omit<Project, "id" | "status" | "progress" | "health">) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  archiveProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  createTask: (task: Omit<Task, "id" | "comments" | "attachments" | "progress">) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  moveTask: (taskId: string, status: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  addMessage: (threadId: string, authorId: string, content: string) => void;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [projectState, setProjectState] = useState<Project[]>(projects);
  const [taskState, setTaskState] = useState<Task[]>(tasks);
  const [notificationState, setNotificationState] = useState<NotificationItem[]>(notifications);
  const [threadState, setThreadState] = useState<MessageThread[]>(messageThreads);
  const [currentProjectId, setCurrentProjectId] = useState(projects[0].id);
  const [selectedDate, setSelectedDate] = useState("2026-07-11");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.appearance === "dark");
  }, [settings.appearance]);

  useEffect(() => {
    if (!toasts.length) return;
    timeoutRef.current = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2800);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [toasts]);

  const value = useMemo<AppStoreValue>(
    () => ({
      settings,
      projects: projectState,
      tasks: taskState,
      notifications: notificationState,
      messageThreads: threadState,
      currentProjectId,
      selectedDate,
      toasts,
      currentUser: {
        name: "Maya Chen",
        role: "Workspace Admin",
        email: "maya@northstarlabs.co",
      },
      members,
      setSelectedDate,
      setCurrentProjectId,
      updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      createProject: (project) => {
        setProjectState((current) => [
          {
            id: createId("project"),
            status: "Active",
            progress: 12,
            health: "New",
            ...project,
          },
          ...current,
        ]);
      },
      updateProject: (projectId, patch) =>
        setProjectState((current) => current.map((project) => (project.id === projectId ? { ...project, ...patch } : project))),
      archiveProject: (projectId) =>
        setProjectState((current) =>
          current.map((project) => (project.id === projectId ? { ...project, status: "Archived" } : project)),
        ),
      deleteProject: (projectId) => {
        setProjectState((current) => current.filter((project) => project.id !== projectId));
        setTaskState((current) => current.filter((task) => task.projectId !== projectId));
      },
      createTask: (task) =>
        setTaskState((current) => [
          {
            id: createId("task"),
            comments: 0,
            attachments: 0,
            progress: task.status === "Completed" ? 100 : 18,
            ...task,
          },
          ...current,
        ]),
      updateTask: (taskId, patch) =>
        setTaskState((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task))),
      moveTask: (taskId, status) =>
        setTaskState((current) =>
          current.map((task) =>
            task.id === taskId
              ? { ...task, status, progress: status === "Completed" ? 100 : Math.max(task.progress, 20) }
              : task,
          ),
        ),
      toggleSubtask: (taskId, subtaskId) =>
        setTaskState((current) =>
          current.map((task) => {
            if (task.id !== taskId) return task;
            const subtasks = task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
            );
            const complete = subtasks.filter((item) => item.done).length;
            const progress = Math.round((complete / subtasks.length) * 100);
            return { ...task, subtasks, progress };
          }),
        ),
      markNotificationRead: (notificationId) =>
        setNotificationState((current) =>
          current.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        ),
      markAllNotificationsRead: () =>
        setNotificationState((current) => current.map((notification) => ({ ...notification, read: true }))),
      addMessage: (threadId, authorId, content) =>
        setThreadState((current) =>
          current.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  lastMessage: content,
                  messages: [...thread.messages, { id: createId("message"), authorId, content, time: "Just now" }],
                }
              : thread,
          ),
        ),
      pushToast: (toast) => setToasts((current) => [...current, { id: createId("toast"), ...toast }]),
      dismissToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    }),
    [settings, projectState, taskState, notificationState, threadState, currentProjectId, selectedDate, toasts],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return context;
}
