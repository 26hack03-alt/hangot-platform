import { DatabaseSync } from "node:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null},input=value("--input"),output=resolve(value("--output")||"backups/d1-export.json");
if(!input)throw new Error("Usage: node scripts/export-d1-data.mjs --input <local.sqlite> [--output backups/d1-export.json]");
const db=new DatabaseSync(resolve(input),{readOnly:true}),tables=["users","clubs","teacher_clubs","applications","posts","post_comments","questions","answers","audit_logs","sync_jobs"],data={format:"hangot-d1-export-v1",createdAt:new Date().toISOString(),tables:{}};
for(const table of tables){const exists=db.prepare("select 1 from sqlite_master where type='table' and name=?").get(table);data.tables[table]=exists?db.prepare(`select * from ${table}`).all():[]}
db.close();await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(data,null,2));console.log(JSON.stringify({output,tables:Object.fromEntries(Object.entries(data.tables).map(([k,v])=>[k,v.length]))}));
