import "server-only";
import { applicationPeriodStatus, type ApplicationPeriodSnapshot } from "../application-period";
import { databaseRequest } from "./client";

const singletonId = "global_application_period";
export type ApplicationSettingsRow = { id:string; application_start_at:string|null; application_end_at:string|null; updated_by:string|null; updated_at:string };

export async function findApplicationSettings() {
  const rows = await databaseRequest<ApplicationSettingsRow[]>(`application_settings?select=id,application_start_at,application_end_at,updated_by,updated_at&id=eq.${singletonId}&limit=1`);
  return rows[0] ?? null;
}

export async function applicationPeriodSnapshot(now = new Date()): Promise<ApplicationPeriodSnapshot> {
  const row = await findApplicationSettings(), settings = { startAt: row?.application_start_at ?? null, endAt: row?.application_end_at ?? null };
  return { ...settings, status: applicationPeriodStatus(settings, now), serverNow: now.toISOString() };
}

export async function saveApplicationSettings(input:{startAt:string;endAt:string;updatedBy:string;updatedAt:string}) {
  const rows = await databaseRequest<ApplicationSettingsRow[]>("application_settings?on_conflict=id", { method:"POST", headers:{ prefer:"resolution=merge-duplicates,return=representation" }, body:JSON.stringify({ id:singletonId, application_start_at:input.startAt, application_end_at:input.endAt, updated_by:input.updatedBy, updated_at:input.updatedAt }) });
  return rows[0];
}
