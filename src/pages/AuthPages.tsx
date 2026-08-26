import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoMark } from "../components/brand";
import { Button, Card, Input, SuccessRow } from "../components/ui";
import { useAppStore } from "../hooks/useAppStore";

function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-hero-grid px-4 py-10 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <LogoMark />
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">
              Premium work orchestration
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-2xl text-lg text-slate-300">{description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SuccessRow>Shared dashboards for leadership, product, and delivery.</SuccessRow>
            <SuccessRow>Live workload views with calendar and Kanban context.</SuccessRow>
            <SuccessRow>Actionable notifications and structured task execution.</SuccessRow>
            <SuccessRow>Reports that look ready for client and board review.</SuccessRow>
          </div>
        </div>
        <Card className="bg-white text-slate-900 dark:bg-white dark:text-slate-900">
          {children}
          <div className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-600">{footer}</div>
        </Card>
      </div>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { pushToast } = useAppStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  return (
    <AuthShell
      title="Sign in to your workspace."
      description="Access projects, board operations, reporting, and team workflows from one premium command center."
      footer={
        <span>
          Need an account?{" "}
          <Link to="/register" className="font-medium text-brand-600">
            Create one
          </Link>
        </span>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-600">Use your workspace credentials to continue.</p>
        </div>
        <Input
          label="Work email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          error={errors.email}
          icon={<Mail className="h-4 w-4" />}
          placeholder="you@company.com"
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          error={errors.password}
          icon={<LockKeyhole className="h-4 w-4" />}
          placeholder="Enter password"
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-500" />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="font-medium text-brand-600">
            Forgot password?
          </Link>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            const nextErrors: typeof errors = {};
            if (!form.email.includes("@")) nextErrors.email = "Enter a valid work email.";
            if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length) return;
            pushToast({ title: "Signed in", description: "Your workspace session is ready." });
            navigate("/app/dashboard");
          }}
        >
          Continue to NorthstarOS <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { pushToast } = useAppStore();
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "" });
  const [error, setError] = useState("");

  return (
    <AuthShell
      title="Create a production-grade team workspace."
      description="Start with structured planning, connected delivery, and executive-ready reporting from day one."
      footer={
        <span>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </span>
      }
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Create account</h2>
          <p className="mt-2 text-sm text-slate-600">Set up a realistic workspace with your team context.</p>
        </div>
        <Input label="Full name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <Input label="Work email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <Input label="Company name" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <Button
          className="w-full"
          onClick={() => {
            if (Object.values(form).some((value) => value.trim().length < 2)) {
              setError("Complete all fields before creating your account.");
              return;
            }
            setError("");
            pushToast({ title: "Account created", description: `${form.company} workspace is provisioned.` });
            navigate("/app/dashboard");
          }}
        >
          Launch workspace <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <AuthShell
      title="Recover access without slowing the team down."
      description="Reset your credentials securely and get back to projects, messages, and deadlines."
      footer={
        <span>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-brand-600">
            Return to sign in
          </Link>
        </span>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Forgot password</h2>
          <p className="mt-2 text-sm text-slate-600">Enter your email and we’ll send a reset link.</p>
        </div>
        <Input label="Work email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} />
        {submitted && <p className="text-sm text-emerald-600">Reset instructions sent to {email}.</p>}
        <Button className="w-full" onClick={() => setSubmitted(Boolean(email))}>
          Send reset link
        </Button>
      </div>
    </AuthShell>
  );
}
