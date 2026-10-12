export function cn(
  ...classes: Array<string | number | false | null | undefined>
) {
  return classes
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" ");
}
function parseDate(value: string) {
  return new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T12:00:00" : value,
  );
}
export function formatDate(value: string) {
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? "No date"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}
export function formatShortDate(value: string) {
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? "No date"
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        date,
      );
}
export function formatTime(value: string) {
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
export function dateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}
export function createId(prefix: string) {
  return prefix + "-" + crypto.randomUUID();
}
