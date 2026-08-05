import { requirePageRole } from "../lib/page-auth";
export default async function AdminLayout({children}:{children:React.ReactNode}){await requirePageRole(["admin"],"/admin");return children}
