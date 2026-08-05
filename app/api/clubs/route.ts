import { NextResponse } from "next/server";
import workbookClubs from "../../../public/saerom-clubs-2026.json";

export const dynamic = "force-dynamic";

function parseCsv(csv: string) {
  const rows = csv.trim().split(/\r?\n/);
  const headers = rows.shift()?.split(",").map(v => v.trim()) ?? [];
  return rows.map((row) => {
    const values = row.match(/(".*?"|[^",]+|(?<=,)(?=,))/g)?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
    const club = Object.fromEntries(headers.map((header, i) => [header, values[i]?.trim() ?? ""]));
    return { ...club, visible: String(club.visible).toLowerCase() === "true" };
  }).filter((club) => club.visible);
}

export async function GET() {
  const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL;
  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, { next: { revalidate: 300 } });
      if (!response.ok) throw new Error("Spreadsheet source unavailable");
      const clubs = parseCsv(await response.text());
      if (clubs.length > 0) {
        return NextResponse.json({ clubs, source: "google-sheet" });
      }
    } catch {
      // 운영 스프레드시트가 일시적으로 실패해도 마지막 검증본을 계속 제공한다.
    }
  }

  return NextResponse.json({
    clubs: workbookClubs.filter((club) => club.visible),
    source: "saerom-2026-workbook",
  });
}
