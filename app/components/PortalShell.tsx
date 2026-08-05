import Link from "next/link";

export default function PortalShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="portal-shell">
    <header className="portal-topbar">
      <Link className="brand" href="/"><span className="brand-mark">S</span><span>한<span className="brand-accent">곳</span></span></Link>
      <nav><Link href="/">동아리</Link><Link href="/my/applications">내 신청</Link><Link href="/board">게시판</Link><Link href="/questions">질의응답</Link></nav>
    </header>
    <section className="portal-hero"><span>SAEROM ACTIVITY PLATFORM</span><h1>{title}</h1><p>{description}</p></section>
    <section className="portal-content">{children}</section>
  </main>;
}
