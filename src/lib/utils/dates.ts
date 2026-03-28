import { addDays, startOfWeek, format, parseISO, isSameDay } from "date-fns";

export function getMondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 4);
  return `${format(weekStart, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function dayLabel(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE d");
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isSameDay(d, new Date());
}
