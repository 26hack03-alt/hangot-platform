import "server-only";
import { databaseRequest, query } from "./client";

type FavoriteRow={user_id:string;club_id:string;created_at:string};

export async function listFavoriteClubIds(userId:string){const rows=await databaseRequest<Array<Pick<FavoriteRow,"club_id">>>(`club_favorites?${query({select:"club_id",user_id:`eq.${userId}`,order:"created_at.desc"})}`);return rows.map(row=>row.club_id)}
export async function addClubFavorite(userId:string,clubId:string){await databaseRequest<FavoriteRow[]>("club_favorites?on_conflict=user_id,club_id",{method:"POST",headers:{prefer:"resolution=ignore-duplicates"},body:JSON.stringify({user_id:userId,club_id:clubId})})}
export async function removeClubFavorite(userId:string,clubId:string){await databaseRequest(`club_favorites?${query({user_id:`eq.${userId}`,club_id:`eq.${clubId}`})}`,{method:"DELETE"})}
