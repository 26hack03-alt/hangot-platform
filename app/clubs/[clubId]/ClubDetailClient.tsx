"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { ClubCategoryIcon,clubCategoryVisual } from "../../components/ClubCategoryIcon";
import { FavoriteButton } from "../../components/FavoriteButton";
import { HeaderAccount,HeaderSessionProvider } from "../../components/HeaderSession";
import MobileBottomNav from"../../components/MobileBottomNav";
import type{ClubSource}from"../../lib/clubs";
import { applicationPeriodStatus,formatApplicationPeriodDate,type ApplicationPeriodSnapshot } from "../../lib/application-period";
import { applicationAvailability } from "../../lib/clubs";

const splitItems=(value:string)=>value.split(/\n|￭/).map(item=>item.trim()).filter(Boolean);
const splitCareers=(value:string)=>value.split(/\n|,|\/|·/).map(item=>item.trim()).filter(item=>item&&item!=="전체");
const DetailIcon=({type}:{type:"students"|"layers"|"location"|"category"})=>{
 const props={width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
 if(type==="students")return <svg {...props}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13a5.5 5.5 0 0 1 5.5 5.5V20M14.5 14.5A4.5 4.5 0 0 1 21 18.5V20"/></svg>;
 if(type==="layers")return <svg {...props}><rect x="4" y="4" width="12" height="12" rx="2"/><rect x="8" y="8" width="12" height="12" rx="2"/></svg>;
 if(type==="location")return <svg {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
 return <svg {...props}><path d="M20 13 13 20a2 2 0 0 1-2.8 0L4 13.8V4h9.8L20 10.2a2 2 0 0 1 0 2.8Z"/><circle cx="9" cy="9" r="1.5"/></svg>;
};

export default function ClubDetailClient({club}:{club:ClubSource}){
 const activities=splitItems(club.activities);const careers=splitCareers(club.career);const[period,setPeriod]=useState<ApplicationPeriodSnapshot|null>(null);const availability=applicationAvailability(club.recruitment_status);
 useEffect(()=>{fetch("/api/application-period",{cache:"no-store"}).then(response=>response.json()).then((result:ApplicationPeriodSnapshot)=>setPeriod({...result,status:applicationPeriodStatus(result,new Date(result.serverNow))})).catch(()=>setPeriod({startAt:null,endAt:null,status:"not_configured",serverNow:new Date().toISOString()}))},[]);
 const applyControl=!period?<span className="club-apply-cta is-disabled" aria-disabled="true">신청 기간 확인 중</span>:period.status==="before"?<span className="club-apply-cta is-disabled" aria-disabled="true">{period.startAt?`${formatApplicationPeriodDate(period.startAt)}부터 신청 가능`:"신청 기간 전"}</span>:period.status==="not_configured"?<span className="club-apply-cta is-disabled" aria-disabled="true">신청 기간 미설정</span>:period.status==="closed"?<span className="club-apply-cta is-disabled" aria-disabled="true">신청 종료</span>:availability==="open"?<Link className="club-apply-cta" href={`/clubs/${club.club_id}/apply`}>신청하기</Link>:availability==="inquiry"?<span className="club-apply-cta is-disabled" aria-disabled="true">가입 문의</span>:<span className="club-apply-cta is-disabled" aria-disabled="true">모집 마감</span>;
 const applyNote=!period?"신청 가능 여부를 확인하고 있습니다.":period.status==="before"&&period.startAt?`${formatApplicationPeriodDate(period.startAt)}부터 신청할 수 있습니다.`:period.status==="not_configured"?"현재 신청 기간이 설정되지 않았습니다.":period.status==="closed"?"신청 기간이 종료되었습니다.":period.status==="open"&&availability==="inquiry"?"담당자에게 가입 가능 여부를 문의해 주세요.":period.status==="open"&&availability==="closed"?"이 동아리의 모집이 마감되었습니다.":"";
 return <main className="app-shell club-detail-page">
  <HeaderSessionProvider><header className="club-detail-header"><Link className="detail-back" href="/clubs" aria-label="동아리 목록으로">‹</Link><Link className="brand" href="/" aria-label="한곳 홈"><img className="brand-logo" src="/hangot-logo.png" alt="" width="36" height="36"/><span>한<span className="brand-accent">곳</span></span></Link><HeaderAccount/></header></HeaderSessionProvider>
  <article className="club-detail-main">
   <section className="club-detail-intro">
    <div className="club-detail-poster" style={{background:club.color||clubCategoryVisual(club.category).background}}>{club.poster_url?<img src={club.poster_url} alt=""/>:<span className={`club-detail-category-fallback category-${clubCategoryVisual(club.category).tone}`}><ClubCategoryIcon category={club.category}/></span>}</div>
    <div className="club-detail-copy"><div className="club-detail-badges"><span>{club.recruitment_status}</span><span>{club.category}</span></div><h1>{club.club_name}</h1><p>{club.introduction}</p>
     <dl className="club-detail-summary"><div><dt><DetailIcon type="students"/><span>대상 학년</span></dt><dd>{club.grade||"전 학년"}</dd></div><div><dt><DetailIcon type="layers"/><span>동아리 유형</span></dt><dd>{club.selection_type}</dd></div><div><dt><DetailIcon type="location"/><span>활동 장소</span></dt><dd>{club.location||"추후 안내"}</dd></div></dl>
    </div>
   </section>
   <nav className="club-detail-tabs" aria-label="상세 내용"><a href="#introduction">소개</a><a href="#activities">활동 내용</a><a href="#careers">관련 진로</a><a href="#inquiry">문의</a></nav>
   <div className="club-detail-sections">
    <section className="detail-info-card" id="introduction"><h2>동아리 소개</h2><p>{club.introduction}</p></section>
    <section className="detail-info-card" id="activities"><h2>주요 활동</h2>{activities.length?<ul>{activities.map((item,index)=><li key={`${item}-${index}`}><span aria-hidden="true">✓</span>{item}</li>)}</ul>:<p>등록된 주요 활동 정보가 없습니다.</p>}</section>
    <section className="detail-data-grid" id="inquiry"><div><span><DetailIcon type="location"/></span><dl><dt>활동 장소</dt><dd>{club.location||"추후 안내"}</dd></dl></div><div><span><DetailIcon type="layers"/></span><dl><dt>동아리 유형</dt><dd>{club.selection_type}</dd></dl></div><div><span><DetailIcon type="category"/></span><dl><dt>분야</dt><dd>{club.category}</dd></dl></div><div><span><DetailIcon type="students"/></span><dl><dt>대상 학년</dt><dd>{club.grade||"전 학년"}</dd></dl></div></section>
    {careers.length>0&&<section className="detail-info-card" id="careers"><h2>관련 진로</h2><div className="career-chips">{careers.map((career,index)=><span key={`${career}-${index}`}>{career}</span>)}</div></section>}
    <div className="club-detail-actions"><FavoriteButton clubId={club.club_id} clubName={club.club_name} variant="detailIcon"/>{applyControl}{applyNote&&<p className="application-period-note" role="status">{applyNote}</p>}</div>
   </div>
  </article>
  <MobileBottomNav/>
 </main>;
}
