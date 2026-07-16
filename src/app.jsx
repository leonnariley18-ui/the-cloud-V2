import React,{useState,useEffect,useCallback,useMemo} from "react";
import {createClient} from "@supabase/supabase-js";

/* ═══════════════════════════════════════════
   SUPABASE SETUP
   ═══════════════════════════════════════════ */
const supabase=createClient("https://rztxqxmqvfsfyawktmka.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dHhxeG1xdmZzZnlhd2t0bWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDEwMDAwMDAsImV4cCI6MTczMjUzNjAwMH0.test");

/* ═══════════════════════════════════════════
   COLOR PALETTE & CONSTANTS
   ═══════════════════════════════════════════ */
const P={
  bg:"#F5F0E8",card:"#FFFCF7",surface:"#EDE8DC",border:"#E8E0D0",borderDark:"#D4CABC",
  text:"#3A3228",textMuted:"#8C7E6A",textWarm:"#6B5D49",sage:"#6B7F5A",sageMid:"#7D9168",
  terracotta:"#C17F4A",terracottaLight:"#FFF3E8",cream:"#FFFCF7",plum:"#8B6D8B",
  plumLight:"#F0EAF0",plumBorder:"#C4B0C4",red:"#C15A4A",redLight:"#FDEEEC",
  sativa:"#C9A84C",indica:"#7B6B9E",onHand:"#5B8A72",onHandLight:"#EBF5EF"
};

const DESKTOP_BG={
  home:"#F0EBE1",stash:"#12220A",library:"#1A1410",insights:"#1A1410",
  compare:"#1A1028",recommender:"#0F1420",detail:"#1A1410"
};

const NAV_ITEMS=[
  {id:"stash",icon:"◈",label:"stash",special:true},
  {id:"home",icon:"⌂",label:"home"},
  {id:"library",icon:"≡",label:"library"},
  {id:"insights",icon:"◉",label:"insights"},
  {id:"compare",icon:"⇆",label:"compare"},
  {id:"recommender",icon:"✦",label:"recommender"},
];

const LEGACY_STRAINS=[
  {id:"legacy_1",name:"OG Kush",type:"Indica",thc:22,cbd:0.5,parents:["unknown lineage"],terpenes:{limonene:2.5,myrcene:4.2,caryophyllene:1.8},effects:["relaxed","euphoric"],flavors:["pine","woody"],vibes:["chill","creative"]},
  {id:"legacy_2",name:"Sour Diesel",type:"Sativa",thc:19,cbd:0.3,parents:["unknown lineage"],terpenes:{limonene:3.1,pinene:2.8,caryophyllene:1.5},effects:["energetic","uplifted"],flavors:["diesel","lemon"],vibes:["social","focused"]},
];

/* ═══════════════════════════════════════════
   SUPABASE DATA HOOK
   ═══════════════════════════════════════════ */
function useCloudData(){
  const USER_ID="dba87fdb-af33-4f2f-94a6-6ee8e6a5c104";
  const[dataLoaded,setDataLoaded]=useState(false);
  const[synced,setSynced]=useState(true);
  const[strains,setStrains]=useState([]);
  const[coppedEntries,setCoppedEntries]=useState([]);
  const[onHand,setOnHand]=useState([]);
  const[mixQueue,setMixQueue]=useState([]);
  const[reups,setReups]=useState([]);
  const[finishedReups,setFinishedReups]=useState([]);
  const[savedComparisons,setSavedComparisons]=useState([]);
  const[savedTips,setSavedTips]=useState([]);
  const[insightsDismissed,setInsightsDismissed]=useState([]);
  const[insightsSaved,setInsightsSaved]=useState([]);
  const[legacyStrains]=useState(LEGACY_STRAINS);

  const loadData=useCallback(async()=>{
    try{
      const{data:rows,error}=await supabase.from("cloud_data").select("*").eq("user_id",USER_ID).maybeSingle();
      if(error)console.error("Load error:",error);
      const initialData=rows?.data||{};
      const migratedStrains=(initialData.strains||[]).map(s=>({...s,parents:s.unknownLineage?["unknown lineage"]:(s.parents||[]).map(p=>p.trim()).filter(Boolean)}));
      setStrains(migratedStrains);
      setCoppedEntries(initialData.coppedEntries||[]);
      setOnHand(initialData.onHand||[]);
      setMixQueue(initialData.mixQueue||[]);
      const rawReups=initialData.reups||[];
      const rawFinished=initialData.finishedReups||[];
      const{finished:numberedFinished,active:numberedActive}=assignReupNumbers(rawFinished,rawReups);
      setReups(numberedActive);
      setFinishedReups(numberedFinished);
      setSavedComparisons(initialData.savedComparisons||[]);
      setSavedTips(initialData.savedTips||[]);
      setInsightsDismissed(initialData.insightsDismissed||[]);
      setInsightsSaved(initialData.insightsSaved||[]);
      setDataLoaded(true);
    }catch(e){
      console.error("loadData error:",e);
      setDataLoaded(true);
    }
  },[]);

  useEffect(()=>{loadData();},[loadData]);

  const saveToCloud=useCallback(async(newData)=>{
    setSynced(false);
    try{
      const{error}=await supabase.from("cloud_data").upsert({user_id:USER_ID,data:newData,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      if(error)console.error("Save error:",error);
      setSynced(!error);
    }catch(e){
      console.error("saveToCloud error:",e);
      setSynced(false);
    }
  },[]);

  useEffect(()=>{
    if(!dataLoaded)return;
    const d={strains,coppedEntries,onHand,mixQueue,reups,finishedReups,savedComparisons,savedTips,insightsDismissed,insightsSaved};
    saveToCloud(d);
  },[strains,coppedEntries,onHand,mixQueue,reups,finishedReups,savedComparisons,savedTips,insightsDismissed,insightsSaved,dataLoaded,saveToCloud]);

  return{dataLoaded,synced,strains,setStrains,coppedEntries,setCoppedEntries,onHand,setOnHand,mixQueue,setMixQueue,reups,setReups,finishedReups,setFinishedReups,savedComparisons,setSavedComparisons,savedTips,setSavedTips,insightsDismissed,setInsightsDismissed,insightsSaved,setInsightsSaved,legacyStrains};
}

function assignReupNumbers(finishedReups,activeReups){
  const allReups=[...finishedReups,...activeReups].sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
  const numbered=allReups.map((rup,i)=>({...rup,number:allReups.length-i}));
  return{finished:numbered.filter(r=>finishedReups.find(f=>f.id===r.id)),active:numbered.filter(r=>activeReups.find(a=>a.id===r.id))};
}

/* ═══════════════════════════════════════════
   RETRO COMPONENTS
   ═══════════════════════════════════════════ */
const retroCard={border:"1.5px solid rgba(232,200,154,0.2)",background:"rgba(255,255,255,0.06)",borderRadius:4,position:"relative",overflow:"hidden"};
const retroCardTop={content:"",position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,rgba(232,200,154,0.25),rgba(232,200,154,0.05))"};

function RetroCard({children,style,onClick}){
  return(<div onClick={onClick} style={{...retroCard,cursor:onClick?"pointer":"default",...style}}><div style={retroCardTop}/>{children}</div>);
}

function RetroHeader({children}){
  return(<div style={{background:"linear-gradient(90deg,rgba(232,200,154,0.1),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(232,200,154,0.3)",marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.45)",letterSpacing:1,textTransform:"uppercase"}}>{children}</span></div>);
}

function RetroWindow({title,badge,children,onClose}){
  return(<div style={{border:"2.5px solid rgba(232,200,154,0.5)",background:"#120D06",boxShadow:"5px 5px 0 rgba(0,0,0,0.5)"}}><div style={{background:"linear-gradient(90deg,#2C1D07,#4A2E0A)",padding:"6px 10px",display:"flex",alignItems:"center",gap:8,borderBottom:"2px solid rgba(232,200,154,0.2)"}}><div style={{display:"flex",gap:4}}><button onClick={onClose} style={{background:"none",border:"none",color:"rgba(232,200,154,0.5)",cursor:"pointer",fontSize:12}}>✕</button><button style={{background:"none",border:"none",color:"rgba(232,200,154,0.3)",cursor:"pointer",fontSize:12}}>−</button><button style={{background:"none",border:"none",color:"rgba(232,200,154,0.3)",cursor:"pointer",fontSize:12}}>□</button></div><span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(232,200,154,0.6)",flex:1,marginLeft:4}}>{title}</span>{badge&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.4)"}}>{badge}</span>}</div><div style={{padding:12}}>{children}</div></div>);
}

function TypeBadge({type}){
  const colors={Indica:"#7B6B9E",Sativa:"#C9A84C",Hybrid:"#6B7F5A"};
  return(<span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:colors[type]||"#999",textTransform:"uppercase",letterSpacing:0.5}}>{type}</span>);
}

function IntentBadge({intent}){
  const colors={focus:"#7B6B9E",creative:"#C9A84C",social:"#6B7F5A",chill:"#A0D2B4",relax:"#8B6D8B"};
  return(<span style={{fontFamily:"'DM Mono',monospace",fontSize:8,background:`${colors[intent]||"#666"}20`,color:colors[intent]||"#999",padding:"2px 6px",borderRadius:3,textTransform:"uppercase",letterSpacing:0.5}}>{intent}</span>);
}

/* ═══════════════════════════════════════════
   MOBILE SHELL
   ═══════════════════════════════════════════ */
function MobileShell(){
  const{dataLoaded,synced,strains,onHand,coppedEntries,mixQueue,finishedReups,reups,savedComparisons,savedTips}=useCloudData();
  const[page,setPage]=useState("home");
  const[view,setView]=useState(null);
  const[menuOpen,setMenuOpen]=useState(false);
  const[peekStrain,setPeekStrain]=useState(null);

  if(!dataLoaded)return(<div style={{background:P.bg,color:P.text,fontFamily:"'DM Sans',sans-serif",padding:20,minHeight:"100vh"}}>Loading...</div>);

  const navigate=pageId=>{setPage(pageId);setMenuOpen(false);setView(null);window.scrollTo(0,0);};

  return(
    <div style={{background:P.bg,color:P.text,fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",paddingBottom:60}}>
      <TopBar page={page} onMenuOpen={()=>setMenuOpen(!menuOpen)} synced={synced} onHandCount={onHand.length}/>
      {menuOpen&&<MobileMenu currentPage={page} onNavigate={navigate}/>}
      {page==="home"&&<HomePage strains={strains} onHand={onHand} coppedEntries={coppedEntries} mixQueue={mixQueue} finishedReups={finishedReups} onNavigate={navigate} onLogCop={()=>{}} onOpenDetail={s=>setPeekStrain(s)} savedComparisons={savedComparisons} savedTips={savedTips}/>}
      {page==="stash"&&<StashPage strains={strains} coppedEntries={coppedEntries} onHand={onHand} mixQueue={mixQueue} reups={reups} finishedReups={finishedReups} onNavigate={navigate}/>}
      {page==="library"&&<LibraryPage strains={strains} legacyStrains={LEGACY_STRAINS} onOpenDetail={s=>setPeekStrain(s)}/>}
      {page==="insights"&&<InsightsPage/>}
      {page==="compare"&&<ComparePage/>}
      {page==="recommender"&&<RecommenderPage/>}
      {peekStrain&&<MobileDetailModal strain={peekStrain} onClose={()=>setPeekStrain(null)}/>}
      <BottomNav currentPage={page} onNavigate={navigate}/>
    </div>
  );
}

function TopBar({page,onMenuOpen,synced,onHandCount}){
  const titles={home:"home",stash:"stash",library:"library",insights:"insights",compare:"compare",recommender:"recommender"};
  const t={metaColor:"#999"};
  return(
    <div style={{background:`linear-gradient(135deg,${P.surface},${P.bg})`,borderBottom:`1px solid ${P.border}`,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onMenuOpen} style={{background:"none",border:"none",cursor:"pointer",fontSize:20}}>☰</button>
        <div><h1 style={{margin:0,fontSize:16,fontWeight:600}}>{titles[page]||page}</h1></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {onHandCount>0&&<span style={{fontSize:11,color:t.metaColor}}>{onHandCount} on hand</span>}
        <div style={{width:6,height:6,borderRadius:"50%",background:synced?"#4A7A4A":"#C15A4A"}}/>
      </div>
    </div>
  );
}

function MobileMenu({currentPage,onNavigate}){
  return(
    <div style={{background:P.surface,borderBottom:`1px solid ${P.border}`,padding:"12px 0"}}>
      {NAV_ITEMS.map(item=>(
        <div key={item.id} onClick={()=>onNavigate(item.id)} style={{padding:"12px 20px",background:currentPage===item.id?`${P.border}40`:"transparent",cursor:"pointer",borderLeft:currentPage===item.id?`3px solid ${P.text}`:"none",paddingLeft:currentPage===item.id?"17px":"20px"}}>
          <span style={{fontSize:14}}>{item.icon} {item.label}</span>
        </div>
      ))}
    </div>
  );
}

function BottomNav({currentPage,onNavigate}){
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:P.surface,borderTop:`1px solid ${P.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0"}}>
      {NAV_ITEMS.map(item=>(
        <button key={item.id} onClick={()=>onNavigate(item.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:currentPage===item.id?P.text:P.textMuted,fontSize:12}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:10,fontFamily:"'DM Mono',monospace"}}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function HomePage({strains,onHand,coppedEntries,mixQueue,finishedReups,onNavigate,onLogCop,onOpenDetail,savedComparisons,savedTips}){
  return(
    <div style={{padding:"20px"}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:14,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>On Hand</h2>
        {onHand.length===0?<p style={{fontSize:13,color:"#999",fontStyle:"italic"}}>nothing on hand yet</p>:onHand.map(oh=>{
          const s=strains.find(ss=>ss.id===oh.strainId);
          return s?<div key={oh.id} onClick={()=>onOpenDetail(s)} style={{padding:"12px",marginBottom:8,background:P.card,borderRadius:4,cursor:"pointer",border:`1px solid ${P.border}`}}><div style={{fontWeight:600,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:P.textMuted,marginTop:4}}><TypeBadge type={s.type}/> · THC {s.thc}%</div></div>:null;
        })}
      </div>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:14,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Finished Re-ups</h2>
        {finishedReups.slice(0,3).map(rup=><div key={rup.id} style={{padding:"12px",marginBottom:8,background:P.surface,borderRadius:4,border:`1px solid ${P.borderDark}`}}><div style={{fontSize:12,color:P.textWarm}}>Re-up #{rup.number||"?"}</div><div style={{fontSize:10,color:P.textMuted,marginTop:4}}>{new Date(rup.startDate).toLocaleDateString()}</div></div>)}
      </div>
    </div>
  );
}

function StashPage({strains,coppedEntries,onHand,mixQueue,reups,finishedReups,onNavigate}){
  return(
    <div style={{padding:"20px"}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:14,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>On Hand ({onHand.length})</h2>
        {onHand.map(oh=>{const s=strains.find(ss=>ss.id===oh.strainId);return s?<div key={oh.id} style={{padding:"12px",marginBottom:8,background:P.card,borderRadius:4,border:`1px solid ${P.onHand}40`}}><div style={{fontWeight:600,fontSize:13}}>{s.name}</div><div style={{fontSize:10,color:P.textMuted,marginTop:4}}><TypeBadge type={s.type}/> · Day {Math.floor(Math.random()*30)}</div></div>:null;})}
      </div>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:14,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Finished Re-ups ({finishedReups.length})</h2>
        {finishedReups.slice(0,5).map(rup=><div key={rup.id} style={{padding:"12px",marginBottom:8,background:P.surface,borderRadius:4,border:`1px solid ${P.border}`}}><div style={{fontSize:11,color:P.text}}>Re-up #{rup.number||"?"}</div><div style={{fontSize:9,color:P.textMuted,marginTop:4}}>{new Date(rup.startDate).toLocaleDateString()}</div></div>)}
      </div>
    </div>
  );
}

function LibraryPage({strains,legacyStrains,onOpenDetail}){
  const allStrains=[...strains,...legacyStrains];
  return(
    <div style={{padding:"20px"}}>
      <h2 style={{fontSize:14,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>Strain Library</h2>
      {allStrains.map(s=><div key={s.id} onClick={()=>onOpenDetail(s)} style={{padding:"12px",marginBottom:8,background:P.card,borderRadius:4,cursor:"pointer",border:`1px solid ${P.border}`}}><div style={{fontWeight:600,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:P.textMuted,marginTop:4}}><TypeBadge type={s.type}/> · THC {s.thc}%</div></div>)}
    </div>
  );
}

function InsightsPage(){
  return(<div style={{padding:"20px"}}><h2 style={{fontSize:14,fontWeight:600,marginBottom:12}}>Insights</h2><p style={{fontSize:13,color:P.textMuted}}>Analytics coming soon</p></div>);
}

function ComparePage(){
  return(<div style={{padding:"20px"}}><h2 style={{fontSize:14,fontWeight:600,marginBottom:12}}>Compare Strains</h2><p style={{fontSize:13,color:P.textMuted}}>Comparison tool coming soon</p></div>);
}

function RecommenderPage(){
  return(<div style={{padding:"20px"}}><h2 style={{fontSize:14,fontWeight:600,marginBottom:12}}>Recommender</h2><p style={{fontSize:13,color:P.textMuted}}>AI recommendations coming soon</p></div>);
}

function MobileDetailModal({strain,onClose}){
  const[tab,setTab]=useState("overview");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:100,animation:"slideUp 0.3s"}}>
      <div style={{width:"100%",background:P.bg,borderRadius:"12px 12px 0 0",maxHeight:"90vh",overflow:"auto",padding:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:600}}>{strain.name}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:`1px solid ${P.border}`,paddingBottom:8}}>
          {["overview","notes","experiences","mixes"].map(t=><button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 8px",fontSize:12,fontWeight:tab===t?600:400,color:tab===t?P.text:P.textMuted,textTransform:"uppercase",letterSpacing:0.5}}>{t}</button>)}
        </div>
        {tab==="overview"&&<div><div style={{marginBottom:12}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:P.textMuted,textTransform:"uppercase"}}>Type</span><div style={{marginTop:4}}><TypeBadge type={strain.type}/></div></div><div style={{marginBottom:12}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:P.textMuted,textTransform:"uppercase"}}>THC/CBD</span><div style={{marginTop:4,fontSize:13}}>{strain.thc}% THC · {strain.cbd}% CBD</div></div></div>}
        {tab==="notes"&&<div style={{fontSize:13,color:P.textMuted}}>No notes yet</div>}
        {tab==="experiences"&&<div style={{fontSize:13,color:P.textMuted}}>No experiences logged</div>}
        {tab==="mixes"&&<div style={{fontSize:13,color:P.textMuted}}>No mixes yet</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DESKTOP SHELL
   ═══════════════════════════════════════════ */
function StashSidebar({stashOpen,setStashOpen,strains,onHand,finishedReups,onSelectStrain}){
  if(!stashOpen)return null;
  const needsReview=strains.filter(s=>s.needsReview===true);
  const getTypeColor=t=>({"Sativa":"#C9A84C","Indica":"#7B6B9E","Hybrid":"#6B7F5A"}[t]||"#8C7E6A");

  const StrainCard=({strain,status})=>{
    const isCurrent=onHand.some(oh=>oh.strainId===strain.id&&oh.status==="viewing");
    const type=strain.type||"Unknown";
    const typeColor=getTypeColor(type);

    return(
      <div onClick={()=>onSelectStrain(strain)}
        style={{padding:"8px 10px",borderRadius:4,marginBottom:4,position:"relative",overflow:"hidden",background:isCurrent?"rgba(30,20,50,0.8)":"rgba(10,8,5,0.75)",border:isCurrent?`1.5px solid rgba(139,109,180,0.35)`:`1.5px solid rgba(91,138,114,0.18)`,cursor:"pointer"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:`linear-gradient(90deg,${typeColor}40,transparent)`}}/>
        <div style={{fontSize:11,color:isCurrent?"rgba(196,184,216,0.95)":"rgba(255,255,255,0.88)",fontWeight:isCurrent?500:400}}>
          {strain.name}
        </div>
        {isCurrent&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(196,184,216,0.5)",marginTop:2}}>VIEWING · {type.toUpperCase()} · DAY {Math.floor(Math.random()*14)+1}</div>}
        {!isCurrent&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.3)",marginTop:2}}>{type.toUpperCase()} · {status}</div>}
      </div>
    );
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:100,display:"flex",pointerEvents:"auto"}}>
      <div style={{width:280,flexShrink:0,position:"relative",background:"#081A08",borderRight:"0.5px solid rgba(232,200,154,0.08)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 520" preserveAspectRatio="xMidYMid slice">
          <rect fill="#081A08"/>
          <path d="M0 0C40 80 80 160 60 260S20 400 0 520" stroke="#164016" strokeWidth="18" fill="none" opacity="0.6"/>
          <path d="M40 0C80 100 100 180 80 300S40 440 20 520" stroke="#1A5A1A" strokeWidth="12" fill="none" opacity="0.4"/>
          <path d="M100 0C130 90 140 200 120 320S80 450 60 520" stroke="#206020" strokeWidth="14" fill="none" opacity="0.3"/>
          <path d="M160 0C180 70 200 160 180 280S140 420 120 520" stroke="#164016" strokeWidth="10" fill="none" opacity="0.5"/>
          <path d="M220 0C240 100 260 200 240 340S200 460 180 520" stroke="#1A5A1A" strokeWidth="16" fill="none" opacity="0.35"/>
          <path d="M280 0C260 80 240 180 250 300S270 440 280 520" stroke="#206020" strokeWidth="11" fill="none" opacity="0.4"/>
        </svg>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)"}}/>

        <div style={{position:"relative",padding:"16px 14px 12px",flex:1,overflowY:"auto",zIndex:1}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#E8C89A",letterSpacing:1,marginBottom:12}}>cLOUD</div>

          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",background:"rgba(58,107,42,0.15)",border:"1.5px solid rgba(58,107,42,0.3)",borderRadius:8,marginBottom:16}}>
            <span style={{fontSize:13,color:"rgba(140,200,140,0.8)"}}>◈</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(140,200,140,0.8)"}}>STASH</span>
            <span onClick={()=>setStashOpen(false)} style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(140,200,140,0.4)",marginLeft:"auto",cursor:"pointer"}}>✕</span>
          </div>

          <div style={{padding:"4px 8px",borderRadius:"0 4px 4px 0",marginBottom:8,display:"flex",alignItems:"center",background:"linear-gradient(90deg,rgba(139,109,139,0.2),rgba(10,8,5,0.6))",borderLeft:"2px solid rgba(139,109,139,0.5)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:1,color:"rgba(139,109,139,0.7)"}}>NEEDS REVIEW · {needsReview.length}</span>
          </div>
          {needsReview.map(s=><StrainCard key={s.id} strain={s} status={`JUN ${Math.floor(Math.random()*30)+1}`}/>)}

          <div style={{padding:"4px 8px",borderRadius:"0 4px 4px 0",marginBottom:8,marginTop:14,display:"flex",alignItems:"center",background:"linear-gradient(90deg,rgba(91,138,114,0.2),rgba(10,8,5,0.6))",borderLeft:"2px solid rgba(91,138,114,0.5)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:1,color:"rgba(91,138,114,0.8)"}}>ON HAND · {onHand.length}</span>
          </div>
          {onHand.map(oh=>{
            const strain=strains.find(s=>s.id===oh.strainId);
            return strain?<StrainCard key={oh.id} strain={strain} status={`DAY ${Math.floor(Math.random()*30)+1}`}/>:null;
          })}

          <div style={{padding:"4px 8px",borderRadius:"0 4px 4px 0",marginBottom:8,marginTop:14,display:"flex",alignItems:"center",background:"linear-gradient(90deg,rgba(232,200,154,0.12),rgba(10,8,5,0.6))",borderLeft:"2px solid rgba(232,200,154,0.3)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:1,color:"rgba(232,200,154,0.55)"}}>FINISHED RE-UPS</span>
          </div>
          {finishedReups.slice(0,2).map((rup,i)=>(
            <div key={rup.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:6,background:"rgba(10,8,5,0.65)",border:"1.5px solid rgba(232,200,154,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:"rgba(232,200,154,0.6)"}}>#7</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.25)"}}>JUN 28</span>
              </div>
              <div style={{fontSize:9,color:"rgba(232,200,154,0.35)",marginTop:2}}>Re-up #{rup.number||i+1}</div>
            </div>
          ))}

          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 0"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4A7A4A"}}/>
          </div>
        </div>
      </div>
      <div onClick={()=>setStashOpen(false)} style={{flex:1,cursor:"pointer"}}/>
    </div>
  );
}

function StrainDetailWindow({selectedStrain,detailTab,setDetailTab,onClose,strains}){
  if(!selectedStrain)return null;

  const typeThemes={
    Indica:{border:"rgba(139,109,180,0.6)",gradient1:"#1A1028",gradient2:"#2E1A3A",accent:"rgba(139,109,180,1)",text:"rgba(196,184,216,1)",dimText:"rgba(139,109,180,0.6)"},
    Sativa:{border:"rgba(200,170,80,0.6)",gradient1:"#2C1D07",gradient2:"#4A3010",accent:"rgba(200,170,80,1)",text:"rgba(232,210,160,1)",dimText:"rgba(200,170,80,0.6)"},
    Hybrid:{border:"rgba(91,138,114,0.6)",gradient1:"#0A1A10",gradient2:"#1A2E20",accent:"rgba(91,138,114,1)",text:"rgba(160,210,180,1)",dimText:"rgba(91,138,114,0.6)"}
  };

  const theme=typeThemes[selectedStrain.type]||typeThemes.Hybrid;

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:140}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:150,maxWidth:"90%",maxHeight:"90vh",overflow:"auto"}}>
        <div style={{background:"#0A0606",border:`2.5px solid ${theme.border}`,boxShadow:"0 0 40px rgba(0,0,0,0.8)"}}>
          <div style={{background:`linear-gradient(90deg,${theme.gradient1},${theme.gradient2})`,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,borderBottom:`2px solid ${theme.border}`}}>
            <button onClick={onClose} style={{background:"none",border:"none",color:theme.accent,cursor:"pointer",fontSize:12}}>✕</button>
            <button style={{background:"none",border:"none",color:theme.dimText,cursor:"pointer",fontSize:12}}>−</button>
            <button style={{background:"none",border:"none",color:theme.dimText,cursor:"pointer",fontSize:12}}>□</button>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:theme.text,flex:1,marginLeft:4}}>{selectedStrain.name}</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:theme.dimText}}>{selectedStrain.type.toUpperCase()}</span>
          </div>

          <div style={{padding:"16px"}}>
            <div style={{display:"flex",gap:12,marginBottom:16,borderBottom:`1px solid ${theme.border}30`,paddingBottom:8}}>
              {["overview","notes","experiences","mixes"].map(t=>(
                <button key={t} onClick={()=>setDetailTab(t)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 8px",fontSize:11,fontWeight:detailTab===t?600:400,color:detailTab===t?theme.accent:theme.dimText,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:0.5}}>
                  {t}
                </button>
              ))}
            </div>

            {detailTab==="overview"&&(
              <div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>PROFILE</div>
                  <div style={{fontSize:12,color:theme.text,marginBottom:8}}>THC {selectedStrain.thc}% · CBD {selectedStrain.cbd}%</div>
                  {selectedStrain.parents&&<div style={{fontSize:11,color:theme.dimText}}>Parents: {selectedStrain.parents.join(" × ")}</div>}
                </div>

                {selectedStrain.terpenes&&(
                  <div>
                    <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>TERPENES</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                      {Object.entries(selectedStrain.terpenes).map(([name,val])=>(
                        <div key={name} style={{fontSize:9,color:theme.text,background:`${theme.accent}15`,border:`1px solid ${theme.accent}30`,padding:"4px 8px",borderRadius:3}}>
                          {name} <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:theme.dimText}}>{val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {detailTab==="notes"&&<div style={{fontSize:11,color:theme.dimText}}>No notes yet. Click "+ Note" to add one.</div>}
            {detailTab==="experiences"&&<div style={{fontSize:11,color:theme.dimText}}>No experiences logged. Click "+ Experience" to add one.</div>}
            {detailTab==="mixes"&&<div style={{fontSize:11,color:theme.dimText}}>No mixes yet. Mix two strains to create one.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function DesktopSidebar({currentPage,onNavigate,synced,stashOpen}){
  const[hovered,setHovered]=useState(false);
  const w=hovered?208:64;

  return(
    <div style={{width:64,flexShrink:0,position:"relative"}}>
      <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{position:"absolute",top:0,left:0,bottom:0,width:w,zIndex:20,background:"#0A0A0A",borderRight:"0.5px solid rgba(232,200,154,0.08)",boxShadow:hovered?"4px 0 24px rgba(0,0,0,0.4)":"none",display:"flex",flexDirection:"column",alignItems:"stretch",padding:"20px 0",overflow:"hidden",transition:"width 0.18s ease, box-shadow 0.18s ease",userSelect:"none"}}>
        <div style={{height:40,display:"flex",alignItems:"center",fontFamily:"'Playfair Display',serif",fontSize:19,color:"#E8C89A",letterSpacing:1,whiteSpace:"nowrap",width:"100%",padding:"0 20px",marginBottom:28,overflow:"hidden"}}>
          {hovered?"cLOUD":"☁"}
        </div>
        {!stashOpen&&NAV_ITEMS.map((item,i)=>{
          const active=currentPage===item.id;
          return(
            <div key={item.id}>
              {item.special&&i>0&&<div style={{height:0.5,background:"rgba(232,200,154,0.08)",margin:"14px 20px"}}/>}
              <div onClick={()=>onNavigate(item.id)} style={{height:56,width:"100%",display:"flex",alignItems:"center",gap:16,padding:"0 20px",cursor:"pointer",position:"relative",color:active?"#E8C89A":"rgba(232,200,154,0.35)",whiteSpace:"nowrap",overflow:"hidden",background:active?"rgba(232,200,154,0.07)":"transparent",boxSizing:"border-box"}}>
                {active&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:"#E8C89A"}}/>}
                <span style={{fontSize:22,width:24,textAlign:"center",flexShrink:0,display:"inline-block"}}>{item.icon}</span>
                {hovered&&<span style={{fontSize:14,flexShrink:0}}>{item.label}</span>}
              </div>
              {item.special&&<div style={{height:0.5,background:"rgba(232,200,154,0.08)",margin:"14px 20px"}}/>}
            </div>
          );
        })}
        {stashOpen&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"0 16px"}}>
          <span style={{fontSize:20,color:"#E8C89A",marginTop:8}}>◈</span>
          {hovered&&<span style={{fontSize:11,color:"#E8C89A",textAlign:"center",marginTop:4}}>stash open</span>}
        </div>}
        <div style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 20px",height:24,marginBottom:4}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:synced?"#4A7A4A":"#C15A4A",flexShrink:0}}/>
          {hovered&&<span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"rgba(232,200,154,0.25)",whiteSpace:"nowrap"}}>{synced?"synced":"syncing…"}</span>}
        </div>
      </div>
    </div>
  );
}

function DesktopTopBar({page}){
  const titles={home:"home",stash:"◈ stash",library:"library",insights:"insights",compare:"compare",recommender:"recommender",detail:"strain detail"};
  return(
    <div style={{height:36,background:"linear-gradient(90deg,#2C1D07,#3A2810)",borderBottom:"2px solid rgba(232,200,154,0.2)",display:"flex",alignItems:"center",padding:"0 20px",gap:12,flexShrink:0}}>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(232,200,154,0.45)",letterSpacing:1,textTransform:"uppercase"}}>{titles[page]||page}</span>
      <div style={{flex:1}}/>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(232,200,154,0.25)"}}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
    </div>
  );
}

function DesktopHomePage(){
  return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#E8E0D4",opacity:0.6}}>home</span>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#E8E0D4",opacity:0.3,letterSpacing:1,textTransform:"uppercase"}}>welcome to cLOUD</span>
    </div>
  );
}

function DesktopPlaceholder({page}){
  const colors={home:"#3A3228",stash:"#E8E0D4",library:"#E8E0D4",insights:"#E8E0D4",compare:"#E0D8F0",recommender:"#C8D4E8"};
  const c=colors[page]||"#E8E0D4";
  return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:c,opacity:0.6}}>{page}</span>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:c,opacity:0.3,letterSpacing:1,textTransform:"uppercase"}}>desktop layout — coming soon</span>
    </div>
  );
}

function DesktopShell(){
  const{synced,strains,onHand,reups,finishedReups,savedComparisons,savedTips}=useCloudData();
  const[page,setPage]=useState("home");
  const[stashOpen,setStashOpen]=useState(false);
  const[selectedStrain,setSelectedStrain]=useState(null);
  const[detailTab,setDetailTab]=useState("overview");

  const navigate=p=>{
    if(p==="stash"){
      setStashOpen(true);
    }else{
      setPage(p);
      setStashOpen(false);
    }
  };

  const handleSelectStrain=strain=>{
    setSelectedStrain(strain);
    setDetailTab("overview");
  };

  const bg=stashOpen?"#120D06":(DESKTOP_BG[page]||"#120D06");
  const strainCount=strains.length;
  const onHandCount=onHand.length;
  const reupCount=reups.length;

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",display:"flex",height:"100vh",background:bg,transition:"background 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <DesktopSidebar currentPage={page} onNavigate={navigate} synced={synced} stashOpen={stashOpen}/>
      {!stashOpen&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <DesktopTopBar page={page}/>
          {page==="home"
            ?<DesktopHomePage/>
            :<DesktopPlaceholder page={page} strainCount={strainCount} onHandCount={onHandCount} reupCount={reupCount}/>}
        </div>
      )}

      <StashSidebar
        stashOpen={stashOpen}
        setStashOpen={setStashOpen}
        strains={strains}
        onHand={onHand}
        finishedReups={finishedReups}
        onSelectStrain={handleSelectStrain}
      />

      <StrainDetailWindow
        selectedStrain={selectedStrain}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        onClose={()=>setSelectedStrain(null)}
        strains={strains}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════ */
function useShellRoute(){
  const[route,setRoute]=useState(()=>typeof window!=="undefined"&&window.location.hash==="#desktop"?"desktop":"mobile");
  useEffect(()=>{
    const check=()=>setRoute(window.location.hash==="#desktop"?"desktop":"mobile");
    window.addEventListener("hashchange",check);
    return()=>window.removeEventListener("hashchange",check);
  },[]);
  return route;
}

export default function App(){
  const shell=useShellRoute();
  if(shell==="desktop")return <DesktopShell/>;
  return <MobileShell/>;
}