"use client";

import { useEffect, useMemo, useState } from "react";
import { HeaderAccount, HeaderSessionProvider } from "../components/HeaderSession";

type Club={club_id:string;club_name:string;category:string;career:string;introduction:string;activities:string;location:string;selection_type:string;poster_url:string;recruitment_status:string;visible:boolean;color?:string;icon?:string;grade?:string};
type Sort="name"|"recruiting"|"category";
const openStatus=(value:string)=>["모집중","추가모집중","신청가능"].includes(value.replace(/\s+/g,""));

export default function ClubsPage(){
 const[clubs,setClubs]=useState<Club[]>([]);const[query,setQuery]=useState("");const[category,setCategory]=useState("전체");const[sort,setSort]=useState<Sort>("name");const[loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/clubs").then(r=>r.json()).then(data=>setClubs(data.clubs??[])).finally(()=>setLoading(false))},[]);
 const categories=useMemo(()=>["전체",...Array.from(new Set(clubs.map(club=>club.category))).filter(Boolean)],[clubs]);
 const visible=useMemo(()=>{const normalized=query.trim().toLocaleLowerCase("ko-KR");const rows=clubs.filter(club=>(category==="전체"||club.category===category)&&(!normalized||[club.club_name,club.category,club.career,club.introduction,club.activities].join(" ").toLocaleLowerCase("ko-KR").includes(normalized)));return [...rows].sort((a,b)=>sort==="recruiting"?Number(openStatus(b.recruitment_status))-Number(openStatus(a.recruitment_status))||a.club_name.localeCompare(b.club_name,"ko"):sort==="category"?a.category.localeCompare(b.category,"ko")||a.club_name.localeCompare(b.club_name,"ko"):a.club_name.localeCompare(b.club_name,"ko"))},[clubs,query,category,sort]);
 return <main className="app-shell clubs-page">
  <HeaderSessionProvider><header className="topbar"><a className="brand" href="/" aria-label="한곳 홈"><img className="brand-logo" src="/hangot-logo.png" alt="" width="36" height="36"/><span>한<span className="brand-accent">곳</span></span></a><HeaderAccount/></header></HeaderSessionProvider>
  <section className="clubs-explorer">
   <header className="clubs-heading"><h1>동아리 찾기</h1><p>새롬고의 동아리를 탐색해보세요.</p></header>
   <label className="clubs-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="동아리 이름, 관심 분야, 진로 검색" aria-label="동아리 검색"/><button type="button">검색</button></label>
   <div className="clubs-filters" role="group" aria-label="분야 필터">{categories.map(item=><button type="button" key={item} className={category===item?"active":""} onClick={()=>setCategory(item)}>{item}</button>)}</div>
   <div className="clubs-results"><h2>{visible.length}개의 동아리</h2><label><span className="sr-only">정렬</span><select value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="name">이름순</option><option value="recruiting">모집 우선</option><option value="category">분야순</option></select></label></div>
   {loading?<div className="clubs-loading">동아리를 불러오는 중입니다.</div>:visible.length?<div className="clubs-list">{visible.map((club,index)=><article className="explorer-card" key={club.club_id} role="link" tabIndex={0} aria-label={`${club.club_name} 상세 정보 보기`} onClick={()=>location.assign(`/clubs/${club.club_id}`)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();location.assign(`/clubs/${club.club_id}`)}}}>
    <div className="explorer-image" style={{background:club.color||["#e9f7ef","#e8f1fb","#fbf0e8","#f0eafb"][index%4]}}>{club.poster_url?<img src={club.poster_url} alt=""/>:<span>{club.icon||["⌘","⚛","◉","✦"][index%4]}</span>}</div>
    <div className="explorer-body"><div className="explorer-badges"><span className={openStatus(club.recruitment_status)?"is-open":""}>{club.recruitment_status}</span><span>{club.category}</span></div><h3>{club.club_name}</h3><p>{club.introduction}</p><div className="explorer-grade"><span>대상 학년</span><b>{club.grade||"전 학년"}</b></div></div><span className="explorer-chevron" aria-hidden="true">›</span>
   </article>)}</div>:<div className="clubs-loading">조건에 맞는 동아리가 없습니다.</div>}
  </section>
  <nav className="mobile-nav" aria-label="모바일 메뉴"><a href="/"><span>⌂</span>홈</a><a className="active" href="/clubs"><span>⌕</span>동아리</a><a href="/my/applications"><span>▣</span>내 신청</a><a href="/board"><span>▤</span>게시판</a><a href="/questions"><span>◌</span>질의응답</a></nav>
 </main>
}
