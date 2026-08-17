"use client";

import { useEffect, useMemo, useState } from "react";
import { ClubCategoryIcon,clubCategoryVisual } from "../components/ClubCategoryIcon";
import { FavoriteButton,useFavorites } from "../components/FavoriteButton";
import { HeaderAccount, HeaderSessionProvider } from "../components/HeaderSession";

type Club={club_id:string;club_name:string;category:string;career:string;introduction:string;activities:string;location:string;selection_type:string;poster_url:string;recruitment_status:string;visible:boolean;color?:string;icon?:string;grade?:string};
type Sort="name"|"recruiting"|"category";
const openStatus=(value:string)=>["모집중","추가모집중","신청가능"].includes(value.replace(/\s+/g,""));
const categoryDescriptions:Record<string,string>={
 "인문·사회":"언어, 역사, 철학, 경영 등",
 "과학·공학":"과학, 수학, 공학, IT 등",
 "예술·체육":"음악, 미술, 공연, 체육 등",
 "미디어":"영상, 방송, 사진, 콘텐츠 등",
};

export default function ClubsPage(){
 const[clubs,setClubs]=useState<Club[]>([]);const[query,setQuery]=useState("");const[category,setCategory]=useState("전체");const[sort,setSort]=useState<Sort>("name");const[loading,setLoading]=useState(true);const[favoritesOnly,setFavoritesOnly]=useState(false);const{isFavorite}=useFavorites();
 useEffect(()=>{fetch("/api/clubs").then(r=>r.json()).then(data=>setClubs(data.clubs??[])).finally(()=>setLoading(false))},[]);
 const categories=useMemo(()=>["전체",...Array.from(new Set(clubs.map(club=>club.category))).filter(Boolean)],[clubs]);
 const categoryCounts=useMemo(()=>clubs.reduce<Record<string,number>>((counts,club)=>(counts[club.category]=(counts[club.category]??0)+1,counts),{}),[clubs]);
 const visible=useMemo(()=>{const normalized=query.trim().toLocaleLowerCase("ko-KR");const rows=clubs.filter(club=>(category==="전체"||club.category===category)&&(!favoritesOnly||isFavorite(club.club_id))&&(!normalized||[club.club_name,club.category,club.career,club.introduction,club.activities].join(" ").toLocaleLowerCase("ko-KR").includes(normalized)));return [...rows].sort((a,b)=>sort==="recruiting"?Number(openStatus(b.recruitment_status))-Number(openStatus(a.recruitment_status))||a.club_name.localeCompare(b.club_name,"ko"):sort==="category"?a.category.localeCompare(b.category,"ko")||a.club_name.localeCompare(b.club_name,"ko"):a.club_name.localeCompare(b.club_name,"ko"))},[clubs,query,category,sort,favoritesOnly,isFavorite]);
 return <main className="app-shell clubs-page">
  <HeaderSessionProvider><header className="topbar"><a className="brand" href="/" aria-label="한곳 홈"><img className="brand-logo" src="/hangot-logo.png" alt="" width="36" height="36"/><span>한<span className="brand-accent">곳</span></span></a><HeaderAccount/></header></HeaderSessionProvider>
  <section className="clubs-explorer">
   <header className="clubs-heading"><h1>동아리 찾기</h1><p>새롬고의 동아리를 탐색해보세요.</p></header>
   <label className="clubs-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="동아리 이름, 관심 분야, 진로 검색" aria-label="동아리 검색"/><button type="button">검색</button></label>
   <div className="clubs-filters" role="group" aria-label="분야 빠른 필터">{categories.map(item=><button type="button" key={item} className={category===item?"active":""} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}<button className={`favorites-only-filter${favoritesOnly?" active":""}`} type="button" aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(value=>!value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z"/></svg>즐겨찾기만 보기</button></div>
   <section className="category-explorer" aria-labelledby="category-explorer-title"><h2 id="category-explorer-title">카테고리 탐색</h2><div className="category-card-grid">{categories.filter(item=>item!=="전체").map(item=>{const visual=clubCategoryVisual(item);return <button className={`category-card category-${visual.tone}${category===item?" is-selected":""}`} type="button" aria-pressed={category===item} key={item} onClick={()=>setCategory(item)}><span className="category-card-icon"><ClubCategoryIcon category={item}/></span><span className="category-card-copy"><b>{item}</b><small>{categoryDescriptions[item]??"다양한 동아리 활동"}</small><strong>{categoryCounts[item]??0}개 동아리</strong></span>{category===item&&<span className="category-selected-label">선택됨</span>}</button>})}</div></section>
   <div className="clubs-results"><h2>{visible.length}개의 동아리</h2><label><span className="sr-only">정렬</span><select value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="name">이름순</option><option value="recruiting">모집 우선</option><option value="category">분야순</option></select></label></div>
   {loading?<div className="clubs-loading">동아리를 불러오는 중입니다.</div>:visible.length?<div className="clubs-list">{visible.map(club=><article className="explorer-card" key={club.club_id} role="link" tabIndex={0} aria-label={`${club.club_name} 상세 정보 보기`} onClick={()=>location.assign(`/clubs/${club.club_id}`)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();location.assign(`/clubs/${club.club_id}`)}}}><FavoriteButton clubId={club.club_id} clubName={club.club_name}/>
    <div className="explorer-image" style={{background:club.color||clubCategoryVisual(club.category).background}}>{club.poster_url?<img src={club.poster_url} alt=""/>:<span className={`club-category-fallback category-${clubCategoryVisual(club.category).tone}`}><ClubCategoryIcon category={club.category}/></span>}</div>
    <div className="explorer-body"><div className="explorer-badges"><span className={openStatus(club.recruitment_status)?"is-open":""}>{club.recruitment_status}</span><span>{club.category}</span></div><h3>{club.club_name}</h3><p>{club.introduction}</p><div className="explorer-grade"><span>대상 학년</span><b>{club.grade||"전 학년"}</b></div></div><span className="explorer-chevron" aria-hidden="true">›</span>
   </article>)}</div>:<div className="clubs-loading">조건에 맞는 동아리가 없습니다.</div>}
  </section>
  <nav className="mobile-nav" aria-label="모바일 메뉴"><a href="/"><span>⌂</span>홈</a><a className="active" href="/clubs"><span>⌕</span>동아리</a><a href="/my/applications"><span>▣</span>내 신청</a><a href="/board"><span>▤</span>게시판</a><a href="/questions"><span>◌</span>질의응답</a></nav>
 </main>
}
