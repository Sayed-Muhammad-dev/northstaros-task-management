import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { LogoMark } from "../components/brand";
import { Button, Card, ErrorNotice, Input, SuccessRow } from "../components/ui";
import { useAppStore } from "../hooks/useAppStore";
import { useAction } from "../hooks/useAction";
function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-hero-grid px-4 py-10 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Link to="/" aria-label="NorthstarOS home">
            <LogoMark />
          </Link>
          <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">
            Work with clarity
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">{description}</p>
          <div className="grid gap-4 text-slate-200 sm:grid-cols-2">
            <SuccessRow>Projects and tasks saved to your workspace.</SuccessRow>
            <SuccessRow>Calendar and Kanban with real due dates.</SuccessRow>
            <SuccessRow>Invite teammates through a private link.</SuccessRow>
            <SuccessRow>Export current task data and print reports.</SuccessRow>
          </div>
        </div>
        <Card className="text-slate-900 dark:text-white">
          {children}
          <div className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
            {footer}
          </div>
        </Card>
      </div>
    </div>
  );
}
function useNext() {
  const [search] = useSearchParams();
  const value = search.get("next");
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/app/dashboard";
}
export function AuthPage() {
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const next = useNext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (!store.authLoading && store.currentUser)
    return <Navigate to={next} replace />;
  return (
    <AuthShell
      title="Sign in to your workspace."
      description="Your projects, conversations and deadlines, together in one command center."
      footer={
        <span>
          Need an account?{" "}
          <Link
            className="font-medium text-brand-600"
            to={"/register?next=" + encodeURIComponent(next)}
          >
            Create one
          </Link>
        </span>
      }
    >
      <h2 className="text-2xl font-semibold">Welcome back</h2>
      <form
        className="mt-5 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await action.run(() => store.login(email, password));
          if (result.ok) {
            setPassword("");
            navigate(next, { replace: true });
          }
        }}
      >
        <Input
          label="Work email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<LockKeyhole className="h-4 w-4" />}
        />
        <Link className="block text-sm text-brand-600" to="/forgot-password">
          Forgot password?
        </Link>
        <ErrorNotice message={action.error || store.loadError} />
        <Button
          type="submit"
          className="w-full"
          disabled={action.pending || store.authLoading}
        >
          {action.pending ? "Signing in…" : "Continue to NorthstarOS"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
export function RegisterPage() {
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const next = useNext();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
  });
  if (!store.authLoading && store.currentUser)
    return <Navigate to={next} replace />;
  return (
    <AuthShell
      title="A clearer place for your team."
      description="Create a private workspace. Start with labelled sample projects, then make it your own."
      footer={
        <span>
          Already registered?{" "}
          <Link
            className="font-medium text-brand-600"
            to={"/login?next=" + encodeURIComponent(next)}
          >
            Sign in
          </Link>
        </span>
      }
    >
      <h2 className="text-2xl font-semibold">Create account</h2>
      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await action.run(() => store.register(form));
          if (result.ok) {
            setForm({ ...form, password: "" });
            navigate(next, { replace: true });
          }
        }}
      >
        <Input
          label="Full name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Work email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Workspace name"
          autoComplete="organization"
          required
          minLength={2}
          maxLength={80}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <Input
          label="Password (12–128 characters)"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <ErrorNotice message={action.error || store.loadError} />
        <Button
          type="submit"
          className="w-full"
          disabled={action.pending || store.authLoading}
        >
          {action.pending ? "Creating workspace…" : "Launch workspace"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
export function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recover your workspace access."
      description="Account recovery needs an email service connected to this installation."
      footer={
        <Link className="text-brand-600" to="/login">
          Return to sign in
        </Link>
      }
    >
      <h2 className="text-2xl font-semibold">
        Email recovery is not configured
      </h2>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        This installation cannot send password reset emails. If you are signed
        in, you can change your password in Settings using your current
        password. Otherwise, contact the installation administrator.
      </p>
      <Link className="mt-6 inline-block" to="/app/settings">
        <Button asChild>Open settings</Button>
      </Link>
    </AuthShell>
  );
}
export function InvitationPage() {
  const { token: routeToken } = useParams();
  const [search] = useSearchParams();
  const token = routeToken ?? search.get("token") ?? "";
  const store = useAppStore();
  const action = useAction();
  const navigate = useNavigate();
  const next = "/invite?token=" + encodeURIComponent(token);
  return (
    <AuthShell
      title="Join your team's workspace."
      description="Invitation links expire after seven days and can be used once."
      footer={<Link to="/">NorthstarOS home</Link>}
    >
      <h2 className="text-2xl font-semibold">Workspace invitation</h2>
      {!token ? (
        <ErrorNotice message="This invitation link is missing its token." />
      ) : store.authLoading ? (
        <p className="mt-4" role="status">
          Checking your session…
        </p>
      ) : !store.currentUser ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in or register using the exact email address the owner invited.
            Your invitation will be kept while you do so.
          </p>
          <Link
            className="block"
            to={"/login?next=" + encodeURIComponent(next)}
          >
            <Button asChild>Sign in to accept</Button>
          </Link>
          <Link
            className="block text-brand-600"
            to={"/register?next=" + encodeURIComponent(next)}
          >
            Create an account
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="break-all text-sm">
            Signed in as {store.currentUser.email}. This email must match the
            invitation.
          </p>
          <ErrorNotice message={action.error} />
          <Button
            disabled={action.pending}
            onClick={async () => {
              const result = await action.run(() => store.acceptInvite(token));
              if (result.ok) navigate("/app/dashboard", { replace: true });
            }}
          >
            Accept invitation
          </Button>
          <Button
            variant="ghost"
            disabled={action.pending}
            onClick={() => {
              void action.run(() => store.logout());
            }}
          >
            Use a different account
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
