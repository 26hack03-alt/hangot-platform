import "server-only";

export class DatabaseError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); }
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SERVER_DATABASE_NOT_CONFIGURED");
  return { url, serviceKey };
}

export async function databaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceKey } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("authorization", `Bearer ${serviceKey}`);
  headers.set("content-type", "application/json");
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string; code?: string };
    throw new DatabaseError(detail.message || "DATABASE_REQUEST_FAILED", response.status, detail.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  return search.toString();
}

export function isUniqueViolation(error: unknown) {
  return error instanceof DatabaseError && error.code === "23505";
}
export async function tableCount(table:string,filter?:string){const rows=await databaseRequest<Array<{id:string}>>(`${table}?select=id${filter?`&${filter}`:""}`);return rows.length}
