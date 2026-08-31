import { sheetSafe } from "./security";

export type SheetsErrorCode="SHEETS_NOT_CONFIGURED"|"SHEETS_AUTH_FAILED"|"SHEETS_PERMISSION_DENIED"|"SHEETS_READ_FAILED"|"SHEETS_WRITE_FAILED";
export type SheetsErrorStage="configuration"|"create_jwt"|"oauth_token"|"read_sheet"|"write_sheet"|"clear_trailing_rows";
export class SheetsError extends Error{constructor(public readonly code:SheetsErrorCode,public readonly stage:SheetsErrorStage,public readonly httpStatus?:number){super(code)}}

function responseError(response:Response,fallback:SheetsErrorCode,stage:SheetsErrorStage){
 const code=response.status===401?"SHEETS_AUTH_FAILED":response.status===403?"SHEETS_PERMISSION_DENIED":fallback;
 return new SheetsError(code,stage,response.status);
}

export function sheetValuesRange(sheetName:string,cells:string){
 const escapedName=sheetName.replaceAll("'","''"),a1Range=`'${escapedName}'!${cells}`;
 return encodeURIComponent(a1Range).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sheetsConfig(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,privateKey=process.env.GOOGLE_PRIVATE_KEY?.replaceAll("\\n","\n"),spreadsheetId=process.env.GOOGLE_SHEETS_SPREADSHEET_ID,applicationSheet=process.env.GOOGLE_SHEETS_APPLICATION_SHEET;
 if(!email||!privateKey||!spreadsheetId||!applicationSheet)throw new SheetsError("SHEETS_NOT_CONFIGURED","configuration");
 return{email,privateKey,spreadsheetId,applicationSheet};
}

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function googleAccessToken() {
  const {email,privateKey}=sheetsConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  let signature:ArrayBuffer;
  try{const pem=privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");const keyBytes=Uint8Array.from(atob(pem),char=>char.charCodeAt(0));const key=await crypto.subtle.importKey("pkcs8",keyBytes,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(`${header}.${claim}`))}catch{throw new SheetsError("SHEETS_AUTH_FAILED","create_jwt")}
  const assertion = `${header}.${claim}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  }).catch(()=>{throw new SheetsError("SHEETS_AUTH_FAILED","oauth_token")});
  if (!response.ok) throw responseError(response,"SHEETS_AUTH_FAILED","oauth_token");
  const token=(await response.json() as { access_token?: string }).access_token;if(!token)throw new SheetsError("SHEETS_AUTH_FAILED","oauth_token",response.status);return token;
}

export async function upsertSheetRow(sheetName: string, sourceId: string, row: string[]) {
  const {spreadsheetId}=sheetsConfig();
  const token = await googleAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values`;
  const safeRow = row.map((value) => sheetSafe(String(value ?? "")));
  const read = await fetch(`${base}/${sheetValuesRange(sheetName,"A:A")}`, { headers: { authorization: `Bearer ${token}` } });
  if (!read.ok) throw responseError(read,"SHEETS_READ_FAILED","read_sheet");
  const values = (await read.json() as { values?: string[][] }).values ?? [];
  const rowIndex = values.findIndex((item) => item[0] === sourceId);
  const target = rowIndex >= 0 ? `A${rowIndex + 1}` : "A:Z";
  const method = rowIndex >= 0 ? "PUT" : "POST";
  const suffix = rowIndex >= 0 ? "?valueInputOption=RAW" : ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
  const write = await fetch(`${base}/${sheetValuesRange(sheetName,target)}${suffix}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ values: [safeRow] }),
  });
  if (!write.ok) throw responseError(write,"SHEETS_WRITE_FAILED","write_sheet");
}

export async function replaceApplicationSheet(rows:string[][]){
 const{spreadsheetId,applicationSheet}=sheetsConfig(),token=await googleAccessToken(),base=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values`,headers={authorization:`Bearer ${token}`,"content-type":"application/json"};
 const current=await fetch(`${base}/${sheetValuesRange(applicationSheet,"A:A")}`,{headers:{authorization:`Bearer ${token}`}});
 if(!current.ok)throw responseError(current,"SHEETS_READ_FAILED","read_sheet");
 const oldCount=((await current.json())as{values?:string[][]}).values?.length??0,safeRows=rows.map(row=>row.map(value=>sheetSafe(String(value??""))));
 const write=await fetch(`${base}/${sheetValuesRange(applicationSheet,`A1:J${Math.max(1,safeRows.length)}`)}?valueInputOption=RAW`,{method:"PUT",headers,body:JSON.stringify({values:safeRows})});
 if(!write.ok)throw responseError(write,"SHEETS_WRITE_FAILED","write_sheet");
 if(oldCount>safeRows.length){const clear=await fetch(`${base}/${sheetValuesRange(applicationSheet,`A${safeRows.length+1}:J${oldCount}`)}:clear`,{method:"POST",headers,body:"{}"});if(!clear.ok)throw responseError(clear,"SHEETS_WRITE_FAILED","clear_trailing_rows")}
}
