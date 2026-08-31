export type ApplicationPeriodStatus = "not_configured" | "before" | "open" | "closed";
export type ApplicationPeriodSettings = { startAt: string | null; endAt: string | null };
export type ApplicationPeriodSnapshot = ApplicationPeriodSettings & { status: ApplicationPeriodStatus; serverNow: string };

export function applicationPeriodStatus(settings: ApplicationPeriodSettings, now = new Date()): ApplicationPeriodStatus {
  if (!settings.startAt || !settings.endAt) return "not_configured";
  const start = Date.parse(settings.startAt), end = Date.parse(settings.endAt), current = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "not_configured";
  if (current < start) return "before";
  if (current < end) return "open";
  return "closed";
}

export function applicationPeriodError(status: ApplicationPeriodStatus) {
  if (status === "not_configured") return "APPLICATION_PERIOD_NOT_CONFIGURED";
  if (status === "before") return "APPLICATION_PERIOD_NOT_STARTED";
  if (status === "closed") return "APPLICATION_PERIOD_CLOSED";
  return null;
}

export function formatApplicationPeriodDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
