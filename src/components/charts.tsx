import { cn } from "../utils/helpers";

export function BarChart({
  items,
}: {
  items: { label: string; value: number; tone?: "brand" | "mint" | "amber" }[];
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200/80 dark:bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                item.tone === "mint" && "bg-mint",
                item.tone === "amber" && "bg-amber",
                (!item.tone || item.tone === "brand") && "bg-gradient-to-r from-brand-500 to-cyan-400",
              )}
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutStat({
  value,
  label,
  description,
}: {
  value: number;
  label: string;
  description: string;
}) {
  const angle = Math.round((value / 100) * 360);
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-panel dark:border-white/10 dark:bg-white/5">
      <div
        className="mx-auto flex h-32 w-32 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#4f7cff 0deg ${angle}deg, rgba(148,163,184,0.18) ${angle}deg 360deg)`,
        }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-semibold text-slate-900 dark:bg-ink-900 dark:text-white">
          {value}%
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </div>
  );
}
