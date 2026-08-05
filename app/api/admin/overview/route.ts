import { tableCount } from "../../../lib/database/client";
import { requireUser } from "../../../lib/security";
export async function GET(){const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;const[users,applications,posts,questions,syncErrors]=await Promise.all([tableCount("users"),tableCount("applications"),tableCount("posts"),tableCount("questions"),tableCount("sync_jobs","status=eq.failed")]);return Response.json({stats:{users,applications,posts,questions,syncErrors}})}
