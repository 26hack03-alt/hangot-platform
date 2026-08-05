import "server-only";
import { databaseRequest } from "./client";
export async function writeAudit(row:Record<string,unknown>){await databaseRequest("audit_logs",{method:"POST",body:JSON.stringify(row)})}
