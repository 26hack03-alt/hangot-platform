"use client";
import { FormEvent, useEffect, useState } from "react";
import PortalShell from "../components/PortalShell";
type Post={id:string;authorAlias:string;category:string;title:string;content:string;isNotice:boolean;createdAt:string};
export default function BoardClient(){
  const[posts,setPosts]=useState<Post[]>([]);const[open,setOpen]=useState(false);const[message,setMessage]=useState("");const[form,setForm]=useState({category:"자유",title:"",content:""});
  const load=()=>fetch("/api/posts").then(r=>r.json()).then(d=>setPosts(d.posts??[]));useEffect(()=>{load()},[]);
  async function submit(e:FormEvent){e.preventDefault();const r=await fetch("/api/posts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(r.status===401)return setMessage("익명 로그인 후 작성할 수 있습니다.");if(!r.ok)return setMessage(d.error==="PERSONAL_DATA_DETECTED"?"개인정보로 보이는 내용을 삭제해 주세요.":"글을 저장하지 못했습니다.");setForm({category:"자유",title:"",content:""});setOpen(false);load()}
  return <PortalShell title="익명 게시판" description="시스템이 만든 익명 별칭으로 학교 활동 이야기를 나눕니다.">
    <div className="section-actions"><div className="privacy-inline">이름·학번·연락처 등 개인정보를 작성하지 마세요.</div><button className="primary" onClick={()=>setOpen(!open)}>글 작성</button></div>
    {open&&<form className="panel form-panel compact-form" onSubmit={submit}><label>카테고리<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>자유</option><option>동아리 활동</option><option>모집</option></select></label><label>제목<input required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>내용<textarea required maxLength={5000} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>{message&&<p className="form-error">{message}</p>}<button className="primary">게시하기</button></form>}
    <div className="list-stack">{posts.map(post=><article className="list-card board-card" key={post.id}><div><small>{post.isNotice?"공지 · ":""}{post.category} · {post.authorAlias}</small><h3>{post.title}</h3><p>{post.content}</p></div><time>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</time></article>)}{!posts.length&&<div className="empty-panel">첫 게시글을 작성해 보세요.</div>}</div>
  </PortalShell>
}
