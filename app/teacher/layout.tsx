import {requirePageRole}from"../lib/page-auth";export default async function TeacherLayout({children}:{children:React.ReactNode}){await requirePageRole(["club_manager"],"/teacher");return children}
