"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FavoriteContextValue={favorites:ReadonlySet<string>;authenticated:boolean|null;pending:ReadonlySet<string>;toggle:(clubId:string)=>Promise<void>};
const FavoriteContext=createContext<FavoriteContextValue|null>(null);

export function FavoriteProvider({children}:{children:React.ReactNode}){
 const[favoriteIds,setFavoriteIds]=useState<string[]>([]),[authenticated,setAuthenticated]=useState<boolean|null>(null),[pendingIds,setPendingIds]=useState<string[]>([]);
 useEffect(()=>{fetch("/api/favorites",{credentials:"same-origin",cache:"no-store"}).then(async response=>{if(response.status===401){setAuthenticated(false);return}if(!response.ok)throw new Error("FAVORITES_LOAD_FAILED");const data=await response.json() as{favorites?:string[]};setFavoriteIds(data.favorites??[]);setAuthenticated(true)}).catch(()=>setAuthenticated(false))},[]);
 const toggle=useCallback(async(clubId:string)=>{if(!authenticated)throw new Error("AUTH_REQUIRED");if(pendingIds.includes(clubId))return;const wasFavorite=favoriteIds.includes(clubId);setPendingIds(items=>[...items,clubId]);setFavoriteIds(items=>wasFavorite?items.filter(id=>id!==clubId):[...items,clubId]);try{const response=await fetch(wasFavorite?`/api/favorites/${encodeURIComponent(clubId)}`:"/api/favorites",{method:wasFavorite?"DELETE":"POST",credentials:"same-origin",headers:wasFavorite?undefined:{"content-type":"application/json"},body:wasFavorite?undefined:JSON.stringify({clubId})});if(!response.ok)throw new Error(response.status===401?"AUTH_REQUIRED":"FAVORITE_UPDATE_FAILED")}catch(error){setFavoriteIds(items=>wasFavorite?[...new Set([...items,clubId])]:items.filter(id=>id!==clubId));throw error}finally{setPendingIds(items=>items.filter(id=>id!==clubId))}},[authenticated,favoriteIds,pendingIds]);
 const value=useMemo(()=>({favorites:new Set(favoriteIds),authenticated,pending:new Set(pendingIds),toggle}),[favoriteIds,authenticated,pendingIds,toggle]);
 return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>;
}

export function useFavorites(){const value=useContext(FavoriteContext);if(!value)throw new Error("Favorite components require FavoriteProvider.");return{...value,isFavorite:(clubId:string)=>value.favorites.has(clubId)}}

export function FavoriteButton({clubId,clubName,variant="icon"}:{clubId:string;clubName:string;variant?:"icon"|"detailIcon"}){
 const{authenticated,pending,toggle,isFavorite}=useFavorites(),favorite=isFavorite(clubId),busy=pending.has(clubId),[message,setMessage]=useState("");
 async function handleClick(event:React.MouseEvent<HTMLButtonElement>){event.preventDefault();event.stopPropagation();if(busy)return;if(!authenticated){setMessage("로그인 후 관심 동아리를 저장할 수 있습니다.");return}setMessage("");try{await toggle(clubId)}catch(error){setMessage(error instanceof Error&&error.message==="AUTH_REQUIRED"?"로그인 후 관심 동아리를 저장할 수 있습니다.":"즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요.")}}
 const label=favorite?`${clubName} 즐겨찾기에서 제거`:`${clubName} 즐겨찾기에 추가`;
 return <span className={`favorite-control favorite-${variant}`} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}><button className={favorite?"is-favorite":""} type="button" aria-label={label} aria-pressed={favorite} disabled={busy} onClick={handleClick}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z"/></svg></button>{message&&<small role="status">{message} <Link href="/login">로그인</Link></small>}</span>;
}
