"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortalShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <main className="portal-shell">
    <header className="portal-topbar">
      <Link className="brand" href="/" aria-label="한곳 홈"><img className="brand-logo" src="/hangot-logo.png" alt="" width="36" height="36" /><span>한<span className="brand-accent">곳</span></span></Link>
      <nav><Link href="/">동아리</Link><Link href="/my/applications">내 신청</Link><Link href="/board">게시판</Link><Link href="/questions">질의응답</Link></nav>
    </header>
    <section className="portal-hero"><span>SAEROM ACTIVITY PLATFORM</span><h1>{title}</h1><p>{description}</p></section>
    <section className="portal-content">{children}</section>
    <nav className="portal-mobile-nav" aria-label="모바일 주요 메뉴">
      <Link className={active("/") ? "active" : ""} href="/"><span aria-hidden="true">⌂</span>홈</Link>
      <Link className={active("/clubs") ? "active" : ""} href="/clubs"><span aria-hidden="true">⌕</span>동아리</Link>
      <Link className={active("/my") ? "active" : ""} href="/my/applications"><span aria-hidden="true">▣</span>내 신청</Link>
      <Link className={active("/board") ? "active" : ""} href="/board"><span aria-hidden="true">▤</span>게시판</Link>
      <Link className={active("/questions") ? "active" : ""} href="/questions"><span aria-hidden="true">◌</span>질의응답</Link>
    </nav>
  </main>;
}
