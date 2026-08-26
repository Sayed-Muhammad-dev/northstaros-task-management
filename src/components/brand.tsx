import { cn } from "../utils/helpers";

export function LogoMark({
  compact = false,
  tone = "darkSurface",
}: {
  compact?: boolean;
  tone?: "darkSurface" | "lightSurface";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-cyan-400 shadow-panel",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.6),transparent_30%)]" />
        <div className="absolute inset-[5px] rounded-[14px] border border-white/30" />
        <div className="absolute bottom-2 left-2 right-2 top-2 rounded-[12px] bg-ink-900/30 backdrop-blur-md" />
        <div className="absolute left-[12px] top-[10px] h-3 w-3 rounded-full bg-white/90" />
        <div className="absolute bottom-[10px] right-[10px] h-4 w-4 rounded-full border border-white/70" />
      </div>
      {!compact && (
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.28em]",
              tone === "lightSurface" ? "text-brand-600" : "text-brand-100",
            )}
          >
            Northstar Labs
          </p>
          <p className={cn("text-lg font-semibold", tone === "lightSurface" ? "text-slate-950 dark:text-white" : "text-white")}>
            NorthstarOS
          </p>
        </div>
      )}
    </div>
  );
}
