import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { ApiError, request } from "../lib/api";
import type {
  AppSettings,
  AppState,
  Invitation,
  ProjectInput,
  ProjectPatch,
  Role,
  TaskInput,
  TaskPatch,
  TaskStatus,
  ToastItem,
  User,
  WorkspaceMembership,
} from "../types/app";
import { dateInput } from "../utils/helpers";

const defaultSettings: AppSettings = {
  appearance: "light",
  language: "English",
  emailNotifications: false,
  pushNotifications: false,
  weeklyDigest: false,
  twoFactorAuth: false,
  timezone: "UTC",
};
function useStoreController() {
  const [state, setState] = useState<AppState | null>(null);
  const [currentUser, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateInput(new Date()));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const stateRef = useRef<AppState | null>(null);
  const userRef = useRef<User | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const reading = useRef(false);
  const readController = useRef<AbortController | null>(null);
  const idleSince = useRef(Date.now());
  const mounted = useRef(true);

  const clear = useCallback(() => {
    generation.current += 1;
    stateRef.current = null;
    userRef.current = null;
    setState(null);
    setUser(null);
    setWorkspaces([]);
    setCurrentProjectId("");
    setToasts([]);
    setSelectedDate(dateInput(new Date()));
  }, []);
  const publish = useCallback(
    (next: AppState, version: number) => {
      if (!mounted.current || generation.current !== version) return;
      const user = userRef.current;
      if (
        !user ||
        next.currentUser.id !== user.id ||
        next.workspace.id !== user.workspaceId
      ) {
        clear();
        throw new Error(
          "Your account or workspace changed. Reload before continuing.",
        );
      }
      if (stateRef.current && next.revision < stateRef.current.revision) return;
      stateRef.current = next;
      userRef.current = next.currentUser;
      setState(next);
      setUser(next.currentUser);
      setLoadError("");
      setCurrentProjectId((id) =>
        next.projects.some((p) => p.id === id)
          ? id
          : (next.projects[0]?.id ?? ""),
      );
    },
    [clear],
  );

  const refresh = useCallback(async () => {
    readController.current?.abort();
    const controller = new AbortController();
    readController.current = controller;
    reading.current = true;
    let version = generation.current;
    try {
      const { user } = await request<{ user: User | null }>(
        "/api/me",
        undefined,
        controller.signal,
      );
      if (!mounted.current || version !== generation.current) return;
      if (!user) {
        clear();
        setLoadError("");
        return;
      }
      if (
        userRef.current?.id !== user.id ||
        userRef.current.workspaceId !== user.workspaceId
      ) {
        clear();
        version = generation.current;
      }
      userRef.current = user;
      setUser(user);
      const next = await request<AppState>(
        "/api/state",
        undefined,
        controller.signal,
      );
      if (version !== generation.current) return;
      publish(next, version);
      const list = await request<{ workspaces: WorkspaceMembership[] }>(
        "/api/workspaces",
        undefined,
        controller.signal,
      );
      if (version === generation.current && mounted.current)
        setWorkspaces(list.workspaces);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) clear();
      if (mounted.current && version === generation.current)
        setLoadError(
          error instanceof Error
            ? error.message
            : "Workspace could not be loaded.",
        );
      throw error;
    } finally {
      if (readController.current === controller) {
        reading.current = false;
        if (mounted.current) setAuthLoading(false);
      }
    }
  }, [clear, publish]);

  useEffect(() => {
    mounted.current = true;
    void refresh().catch(() => {});
    const activity = () => {
      idleSince.current = Date.now();
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    const timer = window.setInterval(() => {
      const editing = document.activeElement?.matches(
        "input, textarea, select, [contenteditable=true]",
      );
      if (
        userRef.current &&
        !locked.current &&
        !reading.current &&
        document.visibilityState === "visible" &&
        !editing &&
        !document.querySelector('[role="dialog"]') &&
        Date.now() - idleSince.current > 30000
      ) {
        void refresh().catch(() => {});
      }
    }, 15000);
    return () => {
      mounted.current = false;
      readController.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [refresh]);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      state?.settings.appearance === "dark",
    );
  }, [state?.settings.appearance]);
  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(
      () => setToasts((items) => items.slice(1)),
      6000,
    );
    return () => window.clearTimeout(timer);
  }, [toasts]);

  async function exclusively<T>(operation: () => Promise<T>): Promise<T> {
    if (locked.current)
      throw new Error("Another change is saving. Please wait and try again.");
    locked.current = true;
    setBusy(true);
    idleSince.current = Date.now();
    try {
      return await operation();
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
      idleSince.current = Date.now();
    }
  }
  async function change(action: string, payload: object): Promise<void> {
    await exclusively(async () => {
      const snapshot = stateRef.current;
      if (!snapshot)
        throw new Error("Load your workspace before making changes.");
      const version = generation.current;
      try {
        const next = await request<AppState>(
          "/api/state",
          { revision: snapshot.revision, action, payload },
          undefined,
          { "X-Workspace-Id": snapshot.workspace.id },
        );
        if (version !== generation.current)
          throw new Error("Workspace changed. This response was discarded.");
        publish(next, version);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) clear();
        if (error instanceof ApiError && error.status === 409) {
          try {
            await refresh();
          } catch {
            /* Refresh error is displayed separately. */
          }
          throw new Error(
            "Your workspace changed elsewhere. Latest data was reloaded; your change was not saved. Review it and retry.",
          );
        }
        throw error;
      }
    });
  }
  async function authenticate(path: string, body: object) {
    await exclusively(async () => {
      clear();
      setLoadError("");
      setAuthLoading(true);
      try {
        const { user } = await request<{ user: User }>(path, body);
        userRef.current = user;
        setUser(user);
        await refresh();
      } finally {
        setAuthLoading(false);
      }
    });
  }
  async function selectOrJoin(path: string, body: object) {
    await exclusively(async () => {
      clear();
      setAuthLoading(true);
      setLoadError("");
      try {
        const { user } = await request<{ user: User }>(path, body);
        userRef.current = user;
        setUser(user);
        await refresh();
      } catch (error) {
        // Reload the server-selected session; never restore the previous workspace cache.
        try {
          await refresh();
        } catch {
          /* Guard displays failed loading. */
        }
        throw error;
      } finally {
        setAuthLoading(false);
      }
    });
  }
  async function download(path: string, filename: string) {
    const user = userRef.current;
    if (!user) throw new Error("Sign in before exporting.");
    const version = generation.current;
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Workspace-Id": user.workspaceId },
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new ApiError(response.status, data?.error ?? "Export failed.");
    }
    const blob = await response.blob();
    if (version !== generation.current)
      throw new Error("Workspace changed. Export was discarded.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {
    state,
    currentUser,
    workspaces,
    authLoading,
    loadError,
    busy,
    settings: state?.settings ?? defaultSettings,
    projects: state?.projects ?? [],
    tasks: state?.tasks ?? [],
    members: state?.members ?? [],
    notifications: state?.notifications ?? [],
    messageThreads: state?.messageThreads ?? [],
    comments: state?.comments ?? {},
    invitations: state?.invitations ?? [],
    audit: state?.audit ?? [],
    currentProjectId,
    setCurrentProjectId,
    selectedDate,
    setSelectedDate,
    toasts,
    refresh,
    login: (email: string, password: string) =>
      authenticate("/api/auth/login", { email, password }),
    register: (body: {
      name: string;
      email: string;
      company: string;
      password: string;
    }) => authenticate("/api/auth/register", body),
    logout: () =>
      exclusively(async () => {
        await request("/api/auth/logout", {});
        clear();
        setLoadError("");
      }),
    selectWorkspace: (id: string) =>
      selectOrJoin("/api/workspaces/select", { id }),
    createWorkspace: (name: string) =>
      selectOrJoin("/api/workspaces", { name }),
    acceptInvite: (token: string) =>
      selectOrJoin("/api/invitations/accept", { token }),
    changePassword: (oldPassword: string, newPassword: string) =>
      exclusively(async () => {
        await request("/api/auth/password", { oldPassword, newPassword });
      }),
    invite: (email: string, role: Role) =>
      exclusively(async () => {
        const result = await request<{
          invitation: Invitation;
          inviteLink: string;
        }>("/api/invitations", { email, role }, undefined, {
          "X-Workspace-Id": userRef.current?.workspaceId ?? "",
        });
        await refresh();
        return result;
      }),
    setMemberRole: (id: string, role: Role) =>
      exclusively(async () => {
        const version = generation.current;
        const next = await request<AppState>(
          "/api/members/role",
          { id, role },
          undefined,
          { "X-Workspace-Id": userRef.current?.workspaceId ?? "" },
        );
        publish(next, version);
      }),
    updateSettings: (patch: Partial<AppSettings>) =>
      change("updateSettings", { patch }),
    updateProfile: (name: string, team: string) =>
      change("updateProfile", { name, team }),
    createProject: (input: ProjectInput) => change("createProject", input),
    updateProject: (id: string, patch: ProjectPatch) =>
      change("updateProject", { id, patch }),
    archiveProject: (id: string) => change("archiveProject", { id }),
    deleteProject: (id: string) => change("deleteProject", { id }),
    createTask: (input: TaskInput) => change("createTask", input),
    updateTask: (id: string, patch: TaskPatch) =>
      change("updateTask", { id, patch }),
    moveTask: (id: string, status: TaskStatus) =>
      change("moveTask", { id, status }),
    deleteTask: (id: string) => change("deleteTask", { id }),
    toggleSubtask: (id: string, subtaskId: string) =>
      change("toggleSubtask", { id, subtaskId }),
    addComment: (taskId: string, content: string) =>
      change("addComment", { taskId, content }),
    addMessage: (threadId: string, content: string) =>
      change("addMessage", { threadId, content }),
    markNotificationRead: (id: string) =>
      change("markNotificationRead", { id }),
    markAllNotificationsRead: () => change("markAllNotificationsRead", {}),
    exportTasks: () => download("/api/export.csv", "northstaros-tasks.csv"),
    exportBackup: () => download("/api/backup", "northstaros-workspace.json"),
    pushToast: (toast: Omit<ToastItem, "id">) =>
      setToasts((items) => [...items, { ...toast, id: crypto.randomUUID() }]),
    dismissToast: (id: string) =>
      setToasts((items) => items.filter((item) => item.id !== id)),
  };
}
const AppStoreContext = createContext<ReturnType<
  typeof useStoreController
> | null>(null);
export function AppStoreProvider({ children }: PropsWithChildren) {
  const store = useStoreController();
  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  );
}
export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("AppStoreProvider is required.");
  return store;
}
