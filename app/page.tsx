"use client";

import { useEffect, useMemo, useState } from "react";
import { HeaderAccount, HeaderRoleLink, HeaderSessionProvider } from "./components/HeaderSession";

type Club = {
  club_id: string;
  club_name: string;
  category: string;
  career: string;
  introduction: string;
  activities: string;
  poster_url: string;
  recruitment_status: string;
  visible: boolean;
  color?: string;
  icon?: string;
  grade?: string;
};

export default function Home() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [selected, setSelected] = useState<Club | null>(null);
  const [showRecommend, setShowRecommend] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => setClubs(data.clubs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[\s·/(),.-]+/g, "");
    const normalizedQuery = normalize(query.trim());
    const relatedTerms: Record<string, string[]> = {
      코딩: ["컴퓨터", "프로그래밍", "소프트웨어", "정보", "인공지능", "ai"],
      의학: ["의료", "의생명", "보건", "생명과학", "약학"],
      미디어: ["방송", "영상", "콘텐츠", "광고", "홍보", "언론"],
      봉사: ["나눔", "도움", "교육봉사", "사회공헌"],
      예술: ["미술", "음악", "공연", "디자인", "영상"],
      공학: ["기계", "전자", "컴퓨터", "로봇", "기술"],
    };
    const searchTerms = normalizedQuery
      ? [normalizedQuery, ...(relatedTerms[normalizedQuery] ?? []).map(normalize)]
      : [];
    const uniqueClubs = Array.from(
      new Map(
        clubs.map((club) => [
          `${club.club_id}|${club.club_name}|${club.grade ?? ""}`,
          club,
        ]),
      ).values(),
    );
    return uniqueClubs.filter((club) => {
      const matchesCategory = category === "전체" || club.category === category;
      const searchableText = normalize([
        club.club_name,
        club.category,
        club.career,
        club.introduction,
        club.activities,
        club.grade ?? "",
      ].join(" "));
      const matchesSearch =
        !normalizedQuery || searchTerms.some((term) => searchableText.includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [clubs, category, query]);
  const availableCategories = useMemo(
    () => ["전체", ...Array.from(new Set(clubs.map((club) => club.category))).filter(Boolean)],
    [clubs],
  );

  return (
    <main className="app-shell">
      <HeaderSessionProvider><header className="topbar">
        <a className="brand" href="/" aria-label="한곳 홈">
          <img className="brand-logo" src="/hangot-logo.png" alt="" width="36" height="36" />
          <span>한<span className="brand-accent">곳</span></span>
        </a>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          <a className="active" href="#clubs">동아리 찾기</a>
          <button onClick={() => setShowRecommend(true)}>AI 추천</button>
          <a href="/my/applications">내 신청</a>
          <HeaderRoleLink />
        </nav>
        <HeaderAccount />
      </header></HeaderSessionProvider>

      <section className="hero">
        <div className="eyebrow"><span>✦</span> 2026학년도 {clubs.length || 58}개 동아리 모집 중</div>
        <h1>새롬고의 모든 동아리,<br/><em>한곳</em>에서.</h1>
        <p>새롬고의 모든 동아리를 한눈에 보고, 관심사와 진로에 맞는 활동을 시작해 보세요.</p>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="동아리 이름, 관심 분야, 진로로 검색"
            aria-label="동아리 검색"
          />
          <button onClick={() => document.getElementById("clubs")?.scrollIntoView({ behavior: "smooth" })}>검색</button>
        </div>
        <div className="quick-tags">
          <span>인기 검색</span>
          {["#컴퓨터", "#사이언스", "#방송", "#도서부"].map((tag) => (
            <button key={tag} onClick={() => setQuery(tag.slice(1))}>{tag}</button>
          ))}
        </div>
      </section>

      <section className="recommend-banner" aria-label="AI 동아리 추천">
        <div className="ai-orb"><span>✦</span></div>
        <div className="recommend-copy">
          <span className="mini-label">SAEROM AI</span>
          <h2>어떤 동아리가 나와 잘 맞을까요?</h2>
          <p>관심 분야와 희망 진로를 알려주면 딱 맞는 동아리를 추천해 드려요.</p>
        </div>
        <button onClick={() => setShowRecommend(true)}>AI 추천 받기 <span>→</span></button>
        <div className="spark one">✦</div><div className="spark two">✦</div>
      </section>

      <section className="club-section" id="clubs">
        <div className="section-heading">
          <div><span className="section-kicker">EXPLORE CLUBS</span><h2>새롬고 동아리를 만나보세요</h2></div>
          <span className="club-count">검색 결과 <b>{filtered.length}</b>개</span>
        </div>
        <div className="filters" role="group" aria-label="분야 필터">
          {availableCategories.map((item) => (
            <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>

        {loading ? (
          <div className="loading-grid">{[1,2,3].map(i => <div className="loading-card" key={i}/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><b>조건에 맞는 동아리가 없어요.</b><span>검색어나 분야를 바꿔보세요.</span></div>
        ) : (
          <div className={`club-grid ${filtered.length < 3 ? "compact" : ""}`}>
            {filtered.map((club, index) => (
              <article
                className="club-card"
                key={club.club_id}
                role="button"
                tabIndex={0}
                aria-label={`${club.club_name} 상세 정보 보기`}
                onClick={() => setSelected(club)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(club);
                  }
                }}
              >
                <div className="card-visual" style={{ background: club.color || ["#e9f7ef","#e8f1fb","#fbf0e8","#f0eafb"][index % 4] }}>
                  <span className="club-icon">{club.icon || ["⌘","⚛","◉","✦"][index % 4]}</span>
                  <span className={`status ${club.recruitment_status === "모집중" ? "open" : ""}`}>{club.recruitment_status}</span>
                </div>
                <div className="card-body">
                  <span className="category-label">{club.category}</span>
                  <h3>{club.club_name}</h3>
                  <p>{club.introduction}</p>
                  <div className="card-meta"><span>대상 학년</span><b>{club.grade || "전 학년"}</b></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="steps">
        <span className="section-kicker">HOW IT WORKS</span>
        <h2>동아리 신청, 이렇게 진행돼요</h2>
        <div className="step-grid">
          {[
            ["01","찾아보기","다양한 동아리 정보와 활동 내용을 살펴봐요."],
            ["02","추천받기","관심사와 진로에 맞는 동아리를 AI가 추천해요."],
            ["03","신청하기","학교 계정으로 로그인하고 지원 동기를 작성해요."],
            ["04","결과확인","검토 과정과 최종 승인 결과를 앱에서 확인해요."]
          ].map(([num,title,text], i) => <div className="step" key={num}><span>{num}</span><div className="step-icon">{["⌕","✦","✓","◎"][i]}</div><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark">S</span><div><b>한곳</b><small>새롬고등학교 활동 플랫폼</small></div></div>
        <p>동아리에서 시작해 더 넓은 학교 활동으로 이어집니다.</p>
        <span>© 2026 Saerom High School</span>
      </footer>

      <nav className="mobile-nav" aria-label="모바일 메뉴">
        <a href="#clubs"><span>⌂</span>홈</a>
        <a href="#clubs"><span>⌕</span>찾기</a>
        <button onClick={() => setShowRecommend(true)}><span className="ai-small">✦</span>AI 추천</button>
        <a href="/my/applications"><span>▣</span>내 신청</a>
      </nav>

      {selected && (
        <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
          <section className="detail-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
            <div className="detail-visual" style={{ background: selected.color || "#e9f7ef" }}><span>{selected.icon || "✦"}</span></div>
            <div className="detail-content">
              <div className="detail-tags"><span>{selected.category}</span><span className="open">{selected.recruitment_status}</span></div>
              <h2>{selected.club_name}</h2><p className="lead">{selected.introduction}</p>
              <div className="basic-info"><div><span>대상 학년</span><b>{selected.grade || "전 학년"}</b></div></div>
              <dl><div><dt>주요 활동</dt><dd>{selected.activities}</dd></div><div><dt>관련 진로</dt><dd>{selected.career}</dd></div></dl>
              <a className="apply-button" href={`/clubs/${selected.club_id}/apply`}>익명으로 신청하기</a>
              <small>이름·학번 없이 익명 계정으로 신청합니다.</small>
            </div>
          </section>
        </div>
      )}

      {showRecommend && <RecommendModal clubs={clubs} onClose={() => setShowRecommend(false)}/>}
    </main>
  );
}

function RecommendModal({ clubs, onClose }: { clubs: Club[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [detailClub, setDetailClub] = useState<Club | null>(null);
  const [interest, setInterest] = useState("");
  const [career, setCareer] = useState("");
  const [activity, setActivity] = useState("");
  const recommendations = useMemo(() => {
    const terms = [interest, career, activity]
      .flatMap((value) => value.toLowerCase().split(/[\s,]+/))
      .filter(Boolean);
    return clubs
      .map((club, index) => {
        const field = `${club.category} ${club.career} ${club.introduction} ${club.activities}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (field.includes(term) ? 3 : 0), 0)
          + (interest && club.category.includes(interest) ? 5 : 0);
        return { club, score, index };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 3)
      .map(({ club }) => club);
  }, [clubs, interest, career, activity]);

  return <div className="modal-backdrop ai-backdrop" onMouseDown={onClose}>
    <section className="ai-modal" onMouseDown={(e) => e.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label="닫기">×</button>
      <div className="ai-modal-head"><span className="ai-orb small">✦</span><div><small>SAEROM AI</small><h2>나만의 동아리 추천</h2></div></div>
      {detailClub ? <div className="recommend-detail">
        <button className="back-to-ranks" onClick={() => setDetailClub(null)}>← 추천 순위로 돌아가기</button>
        <div className="detail-tags"><span>{detailClub.category}</span><span className="open">{detailClub.recruitment_status}</span></div>
        <h3>{detailClub.club_name}</h3>
        <p className="recommend-lead">{detailClub.introduction}</p>
        <div className="basic-info"><div><span>대상 학년</span><b>{detailClub.grade || "전 학년"}</b></div></div>
        <dl><div><dt>주요 활동</dt><dd>{detailClub.activities}</dd></div><div><dt>관련 진로</dt><dd>{detailClub.career}</dd></div></dl>
        <a className="apply-button" href={`/clubs/${detailClub.club_id}/apply`}>익명으로 신청하기</a>
      </div> : step === 0 ? <>
        <p className="modal-intro">몇 가지 질문에 답하면 새롬고 동아리 중 잘 맞는 활동을 찾아드려요. 입력 내용은 추천에만 사용됩니다.</p>
        <label>관심 분야<select value={interest} onChange={e => setInterest(e.target.value)}><option value="">선택해 주세요</option>{Array.from(new Set(clubs.map((club) => club.category))).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>희망 진로<input value={career} onChange={e => setCareer(e.target.value)} placeholder="예: 소프트웨어 개발자, 생명과학자"/></label>
        <label>좋아하는 활동<textarea value={activity} onChange={e => setActivity(e.target.value)} placeholder="예: 친구들과 프로젝트 만들기"/></label>
        <button className="apply-button" disabled={!interest && !career && !activity} onClick={() => setStep(1)}>내 동아리 찾기 <span>→</span></button>
      </> : recommendations.length ? <div className="result">
        <div className="result-label">나와 잘 맞는 동아리 TOP 3</div>
        <h3>추천 결과를 비교해 보세요</h3>
        <div className="rank-list">
          {recommendations.map((club, index) => (
            <button className="rank-card" key={club.club_id} onClick={() => setDetailClub(club)}>
              <span className={`rank-badge rank-${index + 1}`}>{index + 1}순위</span>
              <div className="rank-copy">
                <strong>{club.club_name}</strong>
                <small>{club.category} · {club.grade || "전 학년"}</small>
                <p><b>추천 이유</b> {interest || "관심 분야"}와 {career || "희망 진로"}를 연결해 {club.activities.split(/\n|￭/).filter(Boolean)[0]?.trim() || "다양한 활동"}을 경험할 수 있어요.</p>
                <span>관련 진로 · {club.career}</span>
              </div>
              <i>→</i>
            </button>
          ))}
        </div>
      </div> : <div className="empty-state">동아리 데이터를 먼저 동기화해 주세요.</div>}
    </section>
  </div>
}
