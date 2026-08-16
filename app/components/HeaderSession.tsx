"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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

type HeaderNotification = {
  id: string;
  title: string;
  message: string;
  targetPath: string | null;
  isRead: boolean;
  createdAt: string;
};

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minute = 60_000;
  if (elapsed < minute) return "방금 전";
  if (elapsed < minute * 60) return `${Math.floor(elapsed / minute)}분 전`;
  if (elapsed < minute * 60 * 24) return `${Math.floor(elapsed / (minute * 60))}시간 전`;
  if (elapsed < minute * 60 * 24 * 7) return `${Math.floor(elapsed / (minute * 60 * 24))}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export function HeaderNotifications() {
  const { user, loading } = useHeaderSession();
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { notifications?: HeaderNotification[]; unreadCount?: number };
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setOpen(false);
      return;
    }
    void loadNotifications();
  }, [loadNotifications, user]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  if (loading || !user) return null;

  const markAllRead = async () => {
    if (!unreadCount || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "same-origin" });
      if (response.ok) {
        setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
      }
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (notification: HeaderNotification) => {
    if (!notification.isRead) {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: "PATCH", credentials: "same-origin" });
      if (response.ok) {
        setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    }
    const target = notification.targetPath;
    if (target && target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")) window.location.assign(target);
  };

  return <div className="notification-center" ref={rootRef}>
    <button className="home-notification" type="button" aria-label={`알림${unreadCount ? ` ${unreadCount}개 읽지 않음` : ""}`} aria-expanded={open} aria-controls="header-notification-panel" onClick={() => setOpen((value) => !value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
    </button>
    {open && <section className="notification-panel" id="header-notification-panel" aria-label="알림 목록">
      <header><h2>알림</h2><button type="button" disabled={!unreadCount || busy} onClick={markAllRead}>{busy ? "처리 중" : "모두 읽음"}</button></header>
      <div className="notification-list">{notifications.length ? notifications.map((notification) => <button className={`notification-item${notification.isRead ? " is-read" : ""}`} type="button" key={notification.id} onClick={() => void openNotification(notification)}>
        <span className="notification-dot" aria-hidden="true" /><span className="notification-copy"><strong>{notification.title}</strong><span>{notification.message}</span><time dateTime={notification.createdAt}>{relativeTime(notification.createdAt)}</time></span>
      </button>) : <p className="notification-empty">새로운 알림이 없습니다.</p>}</div>
    </section>}
  </div>;
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
