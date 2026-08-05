import { requirePageRole } from "../lib/page-auth";
export default async function ManagerLayout({children}:{children:React.ReactNode}){await requirePageRole(["club_manager","admin"],"/manager");return children}
