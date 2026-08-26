import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useAppStore } from "../hooks/useAppStore";
import { cn, initials } from "../utils/helpers";

export function Button({
  children,
  className,
  variant = "primary",
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  asChild?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-slate-950 text-white shadow-panel hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100",
    secondary: "border border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
  };

  if (asChild) {
    return <span className={cn(base, variants[variant], className)}>{children}</span>;
  }

  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

/** Spreads remaining div props so callers can attach drag handlers and ARIA. */
export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-panel dark:border-white/10 dark:bg-white/5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  };
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-500">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Input({
  label,
  error,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input
          className={cn(
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-500/20",
            icon && "pl-11",
            error && "border-rose-300 focus:border-rose-400 focus:ring-rose-200 dark:border-rose-500/40",
          )}
          {...props}
        />
      </div>
      {error && <span className="text-sm text-rose-500">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  options,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: string[];
  className?: string;
}) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <div className="relative">
        <select
          className={cn(
            "w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-white",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} icon={<Search className="h-4 w-4" />} />;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-rise rounded-[32px] border border-white/10 bg-white p-6 shadow-luxe dark:bg-ink-900">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h3>
            {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>}
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({
  name,
  status,
}: {
  name: string;
  status?: "Online" | "Away" | "Offline";
}) {
  const statusTone = {
    Online: "bg-emerald-400",
    Away: "bg-amber-400",
    Offline: "bg-slate-300",
  };
  return (
    <div className="relative">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-sm font-semibold text-white">
        {initials(name)}
      </div>
      {status && <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-ink-900", statusTone[status])} />}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-3xl bg-brand-50 dark:bg-brand-500/10" />
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="h-4 w-24 animate-pulseLine rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-8 w-40 animate-pulseLine rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 h-24 rounded-2xl animate-pulseLine bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-900"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full transition",
        checked ? "bg-brand-500" : "bg-slate-300 dark:bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white transition",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2">
          {item.href ? (
            <Link to={item.href} className="hover:text-slate-900 dark:hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 dark:text-white">{item.label}</span>
          )}
          {index < items.length - 1 && <span>/</span>}
        </div>
      ))}
    </div>
  );
}

export function SuccessRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20">
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
      </div>
      <span>{children}</span>
    </div>
  );
}

export function ToastViewport() {
  const { toasts, dismissToast } = useAppStore();
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-panel dark:border-white/10 dark:bg-ink-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-950 dark:text-white">{toast.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.description}</p>
            </div>
            <button onClick={() => dismissToast(toast.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
