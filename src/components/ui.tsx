import { type ReactNode, useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useAppStore } from "../hooks/useAppStore";
import { cn, initials } from "../utils/helpers";

export function Button({
  children,
  className,
  variant = "primary",
  asChild,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  asChild?: boolean;
}) {
  const variants = {
    primary:
      "bg-slate-950 text-white shadow-panel hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100",
    secondary:
      "border border-slate-200 bg-white text-slate-900 hover:border-brand-500 hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
    ghost:
      "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className,
  );
  return asChild ? (
    <span className={classes}>{children}</span>
  ) : (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const tokens = className?.split(/\s+/) ?? [];
  const customBackground = tokens.some((token) => token.startsWith("bg-"));
  const customDarkBackground = tokens.some((token) =>
    token.startsWith("dark:bg-"),
  );
  const customPadding = tokens.some((token) => token.startsWith("p-"));
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200/70 shadow-panel dark:border-white/10",
        !customBackground && "bg-white/95",
        !customDarkBackground && "dark:bg-white/5",
        !customPadding && "p-6",
        className,
      )}
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
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
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
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600 dark:text-brand-100">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-ink-900 dark:text-white";
export function Input({
  label,
  error,
  icon,
  id,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: ReactNode;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <label htmlFor={inputId} className="block space-y-2">
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? inputId + "-error" : undefined}
          className={cn(
            fieldClass,
            icon && "pl-11",
            error && "border-rose-500",
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <span
          id={inputId + "-error"}
          className="text-sm text-rose-600 dark:text-rose-300"
        >
          {error}
        </span>
      )}
    </label>
  );
}
export function Textarea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        rows={4}
        className={cn(fieldClass, "resize-y", className)}
        {...props}
      />
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
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="block space-y-2">
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          className={cn(fieldClass, "appearance-none pr-10", className)}
          {...props}
        >
          {options.map((item) => {
            const option =
              typeof item === "string" ? { label: item, value: item } : item;
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
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
  return (
    <Input
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      icon={<Search className="h-4 w-4" />}
    />
  );
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
    >
      {message}
    </p>
  ) : null;
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
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) ?? [],
      );
    const frame = requestAnimationFrame(() => {
      (focusables()[0] ?? dialog.current)?.focus();
    });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const list = focusables();
        const first = list[0];
        const last = list[list.length - 1];
        if (!first) {
          e.preventDefault();
          dialog.current?.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first ||
            !dialog.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.14 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={
              description ? titleId + "-description" : undefined
            }
            tabIndex={-1}
            initial={{ y: reduce ? 0 : 8 }}
            animate={{ y: 0 }}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white/10 bg-white p-6 text-slate-900 shadow-luxe dark:bg-ink-900 dark:text-white"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 id={titleId} className="text-xl font-semibold">
                  {title}
                </h3>
                {description && (
                  <p
                    id={titleId + "-description"}
                    className="mt-1 text-sm text-slate-600 dark:text-slate-300"
                  >
                    {description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                aria-label="Close dialog"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function Avatar({
  name,
  status,
}: {
  name: string;
  status?: "Online" | "Away" | "Offline";
}) {
  const tones = {
    Online: "bg-emerald-400",
    Away: "bg-amber-400",
    Offline: "bg-slate-300",
  };
  return (
    <div className="relative shrink-0">
      <div
        aria-label={name}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-sm font-semibold text-white"
      >
        {initials(name)}
      </div>
      {status && (
        <span
          title={status}
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-ink-900",
            tones[status],
          )}
        />
      )}
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
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
export function SkeletonCard() {
  return (
    <Card>
      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-8 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
    </Card>
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
      type="button"
      aria-pressed={active}
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
  label = "Toggle setting",
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50",
        checked ? "bg-brand-500" : "bg-slate-300 dark:bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white transition",
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
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400"
    >
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 && <span className="mr-2">/</span>}
          {item.href ? (
            <Link to={item.href}>{item.label}</Link>
          ) : (
            <span
              aria-current="page"
              className="text-slate-900 dark:text-white"
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
export function SuccessRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Check className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </div>
  );
}
export function ToastViewport() {
  const { toasts, dismissToast } = useAppStore();
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 print-hidden">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "warning" ? "alert" : "status"}
          className="pointer-events-auto rounded-3xl border border-slate-200/70 bg-white p-4 text-slate-900 shadow-panel dark:border-white/10 dark:bg-ink-900 dark:text-white"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{toast.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {toast.description}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
