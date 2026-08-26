/**
 * Joins truthy class names. Accepts numbers and ReactNode-ish values because
 * callers pass expressions like `icon && "pl-11"`, where `icon` may be any
 * falsy value rather than strictly a boolean.
 */
export function cn(...classes: Array<string | number | false | null | undefined>) {
  return classes.filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
