import { redirect } from "next/navigation";
import { currentUser, type Role } from "./security";
export async function requirePageRole(roles: Role[], returnTo: string) {
  const user = await currentUser();
  if (!user) redirect(`/api/auth/refresh?next=${encodeURIComponent(returnTo)}`);
  if (!roles.includes(user.role as Role)) redirect("/403");
  return user;
}
