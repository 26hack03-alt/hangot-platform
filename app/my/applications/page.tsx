import { redirect } from "next/navigation";
import { currentUser } from "../../lib/security";
import MyApplicationsClient from "./MyApplicationsClient";

export default async function MyApplicationsPage() {
  if (!await currentUser()) redirect("/login?next=%2Fmy%2Fapplications");
  return <MyApplicationsClient/>;
}
