"use client";
import { FormEvent,useEffect,useState } from "react";
import PortalShell from "../components/PortalShell";
type Club={club_id:string;club_name:string};type Question={id:string;authorAlias:string;clubId:string;title:string;content:string;isPrivate:boolean;status:string;createdAt:string};
export default function QuestionsClient(){
 const[clubs,setClubs]=useState<Club[]>([]);const[items,setItems]=useState<Question[]>([]);const[open,setOpen]=useState(false);const[message,setMessage]=useState("");const[form,setForm]=useState({clubId:"",title:"",content:"",isPrivate:false});
 const load=()=>Promise.all([fetch("/api/clubs").then(r=>r.json()),fetch("/api/questions").then(r=>r.json())]).then(([c,q])=>{setClubs(c.clubs??[]);setItems(q.questions??[])});useEffect(()=>{load()},[]);
 async function submit(e:FormEvent){e.preventDefault();const r=await fetch("/api/questions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(r.status===401)return setMessage("익명 로그인 후 질문할 수 있습니다.");if(!r.ok)return setMessage(d.error==="PERSONAL_DATA_DETECTED"?"개인정보로 보이는 내용을 삭제해 주세요.":"질문을 저장하지 못했습니다.");setOpen(false);setForm({clubId:"",title:"",content:"",isPrivate:false});load()}
 const name=(id:string)=>clubs.find(c=>c.club_id===id)?.club_name??id;
 return <PortalShell title="동아리 질의응답" description="동아리별 질문을 익명으로 남기고 공식 답변 상태를 확인합니다.">
  <div className="section-actions"><div className="privacy-inline">비공개 질문은 작성자·담당자·관리자만 볼 수 있습니다.</div><button className="primary" onClick={()=>setOpen(!open)}>질문 작성</button></div>
  {open&&<form className="panel form-panel compact-form" onSubmit={submit}><label>대상 동아리<select required value={form.clubId} onChange={e=>setForm({...form,clubId:e.target.value})}><option value="">선택</option>{clubs.map(c=><option value={c.club_id} key={c.club_id}>{c.club_name}</option>)}</select></label><label>제목<input required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>질문 내용<textarea required maxLength={3000} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label><label className="check"><input type="checkbox" checked={form.isPrivate} onChange={e=>setForm({...form,isPrivate:e.target.checked})}/> 비공개 질문</label>{message&&<p className="form-error">{message}</p>}<button className="primary">질문 등록</button></form>}
  <div className="list-stack">{items.map(q=><article className="list-card board-card" key={q.id}><div><small>{name(q.clubId)} · {q.authorAlias} {q.isPrivate?"· 비공개":""}</small><h3>{q.title}</h3><p>{q.content}</p></div><span className={`state state-${q.status}`}>{q.status==="answered"?"답변 완료":"답변 대기"}</span></article>)}{!items.length&&<div className="empty-panel">등록된 질문이 없습니다.</div>}</div>
 </PortalShell>
}
