import AdminApplicationDetailClient from "./AdminApplicationDetailClient";
export default async function AdminApplicationDetailPage({params}:{params:Promise<{applicationId:string}>}) { return <AdminApplicationDetailClient applicationId={(await params).applicationId}/>; }
