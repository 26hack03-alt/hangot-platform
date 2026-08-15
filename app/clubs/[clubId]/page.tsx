import { notFound } from "next/navigation";
import { findClub } from "../../lib/clubs";
import ClubDetailClient from "@/app/clubs/[clubId]/ClubDetailClient";

export default async function ClubDetailPage({params}:{params:Promise<{clubId:string}>}){
 const{clubId}=await params;const club=findClub(clubId);if(!club)notFound();return <ClubDetailClient club={club}/>;
}
