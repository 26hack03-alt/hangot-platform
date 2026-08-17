const visuals:Record<string,{tone:string;background:string}>={
 "인문·사회":{tone:"humanities",background:"#edf4ff"},
 "과학·공학":{tone:"science",background:"#eaf7f0"},
 "예술·체육":{tone:"arts",background:"#f3efff"},
 "미디어":{tone:"media",background:"#eaf8fb"},
};

export function clubCategoryVisual(category:string){return visuals[category]??{tone:"default",background:"#edf4ff"}}

export function ClubCategoryIcon({category}:{category:string}){
 if(category==="인문·사회")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"/></svg>;
 if(category==="과학·공학")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9M9.5 12h5"/></svg>;
 if(category==="예술·체육")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 6-6c0-3-4-5-9-5Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="7" r="1"/></svg>;
 if(category==="미디어")return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m9 6 1.5-2h3L15 6M9.5 12.5l5-3v6l-5-3Z"/></svg>;
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6l2 2h8v12H4V5Z"/><path d="M4 9h16"/></svg>;
}
