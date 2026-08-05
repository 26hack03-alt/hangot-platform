import workbookClubs from "../../public/saerom-clubs-2026.json";

export type ClubSource = (typeof workbookClubs)[number];
export type ApplicationAvailability = "open" | "inquiry" | "closed";

export function findClub(clubId: string) {
  return workbookClubs.find((club) => club.club_id === clubId && club.visible) ?? null;
}

export function applicationAvailability(status: string): ApplicationAvailability {
  const normalized = status.replace(/\s+/g, "");
  if (["모집중", "추가모집중", "신청가능"].includes(normalized)) return "open";
  if (["가입문의가능", "문의가능"].includes(normalized)) return "inquiry";
  return "closed";
}

export function clubName(clubId: string) {
  return findClub(clubId)?.club_name ?? "알 수 없는 동아리";
}
