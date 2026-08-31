"use client";

import Link from"next/link";
import{usePathname}from"next/navigation";

const items=[{href:"/",label:"홈",icon:"home"},{href:"/clubs",label:"동아리",icon:"clubs"},{href:"/my/applications",label:"내 신청",icon:"applications"},{href:"/board",label:"게시판",icon:"board"},{href:"/questions",label:"질의응답",icon:"questions"}]as const;

function NavIcon({name}:{name:(typeof items)[number]["icon"]}){const props={viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round"as const,strokeLinejoin:"round"as const,"aria-hidden":true};
 if(name==="home")return <svg {...props}><path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/></svg>;
 if(name==="clubs")return <svg {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.1 4.1M10.5 7.5v6m-3-3h6"/></svg>;
 if(name==="applications")return <svg {...props}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10.5l1.5 1.5 2.5-3M8.5 16h7"/></svg>;
 if(name==="board")return <svg {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.7A2.5 2.5 0 0 1 4 13.5Z"/><path d="M8 8h8m-8 4h5"/></svg>;
 return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.4 1.1-1.4 2.3M12 17h.01"/></svg>}

export default function MobileBottomNav({className="mobile-nav"}:{className?:string}){const pathname=usePathname();const active=(href:string)=>href==="/"?pathname==="/":href==="/my/applications"?pathname.startsWith("/my"):pathname.startsWith(href);return <nav className={className} aria-label="모바일 주요 메뉴">{items.map(item=>{const selected=active(item.href);return <Link key={item.href} className={selected?"active":undefined} aria-current={selected?"page":undefined} href={item.href}><span className="mobile-nav-icon"><NavIcon name={item.icon}/></span><span className="mobile-nav-label">{item.label}</span></Link>})}</nav>}
