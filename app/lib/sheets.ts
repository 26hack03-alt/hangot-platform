import { sheetSafe } from "./security";

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function googleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replaceAll("\\n", "\n");
  if (!email || !privateKey) throw new Error("Google Sheets credentials are not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const pem = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const assertion = `${header}.${claim}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("Google authentication failed");
  return (await response.json() as { access_token: string }).access_token;
}

export async function upsertSheetRow(sheetName: string, sourceId: string, row: string[]) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Google spreadsheet is not configured");
  const token = await googleAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values`;
  const safeRow = row.map((value) => sheetSafe(String(value ?? "")));
  const read = await fetch(`${base}/${encodeURIComponent(`${sheetName}!A:A`)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!read.ok) throw new Error("Unable to read Google Sheet");
  const values = (await read.json() as { values?: string[][] }).values ?? [];
  const rowIndex = values.findIndex((item) => item[0] === sourceId);
  const target = rowIndex >= 0 ? `${sheetName}!A${rowIndex + 1}` : `${sheetName}!A:Z`;
  const method = rowIndex >= 0 ? "PUT" : "POST";
  const suffix = rowIndex >= 0 ? "?valueInputOption=RAW" : ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
  const write = await fetch(`${base}/${encodeURIComponent(target)}${suffix}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ values: [safeRow] }),
  });
  if (!write.ok) throw new Error("Unable to update Google Sheet");
}
