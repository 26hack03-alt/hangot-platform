"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type SessionRole = "student" | "club_manager" | "admin";
type SessionUser = { alias: string; displayName: string; profileCompleted: boolean; role: SessionRole };
type SessionState = {
  user: SessionUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const HeaderSessionContext = createContext<SessionState | null>(null);

function useHeaderSession() {
  const value = useContext(HeaderSessionContext);
  if (!value) throw new Error("Header session components require HeaderSessionProvider.");
  return value;
}

export function HeaderSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = response.ok ? await response.json() as { user?: SessionUser | null } : null;
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    const refreshAfterNavigation = () => void loadSession();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadSession();
    };
    window.addEventListener("pageshow", refreshAfterNavigation);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("pageshow", refreshAfterNavigation);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadSession]);

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("LOGOUT_FAILED");
    setUser(null);
  }, []);

  return <HeaderSessionContext.Provider value={{ user, loading, logout }}>
    {children}
  </HeaderSessionContext.Provider>;
}

export function HeaderRoleLink() {
  const { user, loading } = useHeaderSession();
  if (loading || !user) return null;
  if (user.role === "admin") return <><a href="/admin">관리자</a><a href="/admin/teachers">교사 관리</a><a href="/admin/teacher-assignments">담당 배정</a><a href="/admin/applications">신청 관리</a></>;
  if (user.role === "club_manager") return <><a href="/teacher">담당 교사 페이지</a><a href="/teacher/applications">담당 신청</a></>;
  return <a href="/my/applications">내 신청</a>;
}

export function HeaderAccount() {
  const { user, loading, logout } = useHeaderSession();
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return <span className="profile-button profile-loading" aria-label="로그인 상태 확인 중" aria-busy="true" />;
  }

  if (!user) {
    return <a className="profile-button" href="/login">
      <span>Google 로그인</span><b aria-hidden="true">→</b>
    </a>;
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const needsProfile = user.role === "student" && !user.profileCompleted;
  const accountLabel = needsProfile ? "학생 정보 등록" : user.displayName;
  const accountHref = needsProfile ? "/profile" : user.role === "admin" ? "/admin" : user.role === "club_manager" ? "/teacher" : "/profile";

  return <div className="profile-session">
    <a className={`profile-button profile-user${needsProfile ? " profile-required" : ""}`} href={accountHref} aria-label={`${accountLabel} 페이지`} title={accountLabel}>
      <span>{accountLabel}</span><b>{needsProfile ? "필수" : user.role === "club_manager" ? "담당 교사" : user.role === "admin" ? "관리자" : "학생 정보"}</b>
    </a>
    <button className="header-logout" type="button" disabled={loggingOut} onClick={handleLogout}>
      {loggingOut ? "로그아웃 중" : "로그아웃"}
    </button>
  </div>;
}
