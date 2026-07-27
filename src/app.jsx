import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════
   SUPABASE
   ═══════════════════════════════════════════ */
const SB_URL="https://pukzhmhevjbfwvhjzppr.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1a3pobWhldmpiZnd2aGp6cHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjUzNTYsImV4cCI6MjA5MzM0MTM1Nn0.-Jl1tv-xeOTwv6cd-OgF-ovooLfYyzoaA2c7Seax3Zo";
const supabase=createClient(SB_URL,SB_KEY);

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const TERPENES=["Myrcene","Limonene","Caryophyllene","Linalool","Pinene","Humulene","Terpinolene","Ocimene","Bisabolol","Valencene","Nerolidol","Guaiol","Camphene","Geraniol","Eucalyptol","P-Cymene"];
const VIBE_CATEGORIES={"🏃":["Bed mode","Couch-locked","Clean mode","Get things done","Restless"],"🧠":["Deep thinking","Creative flow","Music dive","Zoned out","Laser focused"],"💬":["Conversational","Giggly","Hang out","Quiet mode"],"✨":["Munchies","Music hits different","Body high","Pain relief","Full-body euphoria","Horny","Connected to nature","Dream-inducing","Funny inner-dialogue"],"📊":["Uplifted","Cozy","Sleepy","Energized","Anxious","Paranoid","IDGAF mode"],"👅":["Earthy","Citrus","Pine","Sweet","Gassy","Skunky","Floral","Peppery","Berry","Diesel","Tropical","Minty","Woody","Spicy"]};
const VIBE_TAGS=Object.values(VIBE_CATEGORIES).flat();
const today=()=>new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
const isoToDisplayDate=iso=>{if(!iso)return null;const d=new Date(iso+"T00:00:00");return isNaN(d.getTime())?null:d.toLocaleDateString("en-US",{month:"short",day:"numeric"});};
const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};

/* ── dates ──────────────────────────────────────────────────────────────────
   `date` stays a year-less display string ("Jul 19") so no UI text changes.
   `dateIso` ("2026-07-19") is its sortable, unambiguous twin, used for library
   grouping, month ordering and day counts. Reads go through resolveIso, which
   falls back to inference so records predating the field still work.        */
const LEGACY_DATA_YEAR=2026;   // every record that predates dateIso was logged in 2026
const isoOf=(dateStr,year)=>{
  if(!dateStr)return null;
  const d=new Date(`${dateStr} ${year}`);
  if(isNaN(d.getTime()))return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
// runtime fallback: assume the most recent occurrence of that day/month.
// NOT used for the backfill — that pins LEGACY_DATA_YEAR, or "Dec 25" would land in 2025.
const inferIso=dateStr=>{
  if(!dateStr)return null;
  const now=new Date();
  const thisYear=isoOf(dateStr,now.getFullYear());
  if(!thisYear)return null;
  if(new Date(thisYear+"T00:00:00").getTime()>now.getTime()+86400000)return isoOf(dateStr,now.getFullYear()-1);
  return thisYear;
};
const stamp=()=>({date:today(),dateIso:todayIso()});
const resolveIso=rec=>rec?.dateIso||inferIso(rec?.date);
const monthKeyOf=rec=>resolveIso(rec)?.slice(0,7)||"unknown";           // "2026-07", sorts lexically
const sortMonthKeys=keys=>[...keys].sort((a,b)=>{                        // newest first, "unknown" last
  if(a===b)return 0;
  if(a==="unknown")return 1;
  if(b==="unknown")return -1;
  return a<b?1:-1;
});
const monthLabel=key=>{
  if(!key||key==="unknown")return"unknown";
  const[y,m]=key.split("-");
  const name=new Date(`${y}-${m}-01T00:00:00`).toLocaleDateString("en-US",{month:"long"});
  return Number(y)===new Date().getFullYear()?name:`${name} ${y}`;
};
// one-time, idempotent: fill dateIso on records that predate the field
const backfillIso=rec=>!rec||rec.dateIso||!rec.date?rec:{...rec,dateIso:isoOf(rec.date,LEGACY_DATA_YEAR)};
const typeColor=t=>({"Sativa":"#C9A84C","Indica":"#7B6B9E","Hybrid":"#6B7F5A"}[t]||"#8C7E6A");
const copAgainColor=v=>({"Yes":"#6B7F5A","Maybe":"#C17F4A","No":"#8C7E6A","Never again":"#C15A4A"}[v]||"#8C7E6A");
const intentBadge=i=>({asleep:{bg:"#1A1A2E",color:"#C9B8F0",icon:"🌙"},awake:{bg:"#FFF3E8",color:"#C17F4A",icon:"☀️",border:"0.5px solid #E8D0B0"},adventure:{bg:"#EDF2E8",color:"#6B7F5A",icon:"🏕️"}}[i]||null);
const P={bg:"#F5F0E8",card:"#FFFCF7",surface:"#EDE8DC",border:"#E8E0D0",borderDark:"#D4CABC",text:"#3A3228",textMuted:"#8C7E6A",textWarm:"#6B5D49",sage:"#6B7F5A",sageMid:"#7D9168",terracotta:"#C17F4A",terracottaLight:"#FFF3E8",cream:"#FFFCF7",plum:"#8B6D8B",plumLight:"#F0EAF0",plumBorder:"#C4B0C4",red:"#C15A4A",redLight:"#FDEEEC",sativa:"#C9A84C",indica:"#7B6B9E",onHand:"#5B8A72",onHandLight:"#EBF5EF"};

/* ═══════════════════════════════════════════
   RE-UP HISTORY (V1 seed for numbering)
   ═══════════════════════════════════════════ */
const HISTORICAL_REUPS=[
  {date:"May 19",strainNames:["Trop Cherry","Black Ice"]},
  {date:"May 25",strainNames:["Strawberry Fields","Bubblegum Runtz"]},
  {date:"Jun 2",strainNames:["Gelonade","Gumbo"]},
  {date:"Jun 6",strainNames:["Black Panther","Moroccan Peaches","Durban Mints","Mule Fuel"]},
  {date:"Jun 14",strainNames:["Memory Loss OG"]},
];
// Builds the cop + on-hand records for a lite cop (no first session).
// Shared by both shells so the two lite flows can't drift apart.
function makeLiteCop(cop,reupId){
  const copId=Date.now();const strainId=cop.existingStrainId||copId+1;
  const copIso=cop.copDate||todayIso();
  const copDate=isoToDisplayDate(cop.copDate)||today();
  const newCop={id:copId,type:cop.type,lean:cop.lean,source:cop.source,container:cop.container,brand:cop.brand||"",growType:cop.growType||"",terpenes:[...cop.terpenes],date:copDate,dateIso:copIso,firstNotes:cop.notes,status:"on-hand",intent:cop.intent||null,amount:cop.amount||null,reupId:reupId||null,
    session:null,lite:true,experiences:[],mixes:[],notes:[]};
  const onHandEntry={strainName:cop.name.trim(),strainId,copId,type:cop.type,terpenes:[...cop.terpenes],date:copDate,dateIso:copIso,rating:null,lite:true};
  return{copId,strainId,newCop,onHandEntry,copDate,copIso};
}

// A lite re-up is a backfill, so it takes the date of its earliest cop rather
// than the day it happened to be created. dateIso is kept only for comparison --
// the visible `date` stays the app's "MMM D" display string.
function addLiteCopToReup(reups,reupId,copId,copDate,copIso){
  return reups.map(r=>{
    if(r.id!==reupId)return r;
    const next={...r,copIds:[...(r.copIds||[]),copId]};
    if(r.lite&&(!r.dateIso||copIso<r.dateIso)){next.date=copDate;next.dateIso=copIso;}
    return next;
  });
}

function assignReupNumbers(finished,active){
  let nextNum=HISTORICAL_REUPS.length+1;
  const numberedFinished=finished.map(r=>{
    if(r.number)return r;
    const histIdx=HISTORICAL_REUPS.findIndex(h=>h.date===r.date&&h.strainNames.some(n=>r.strainNames?.includes(n)));
    return histIdx>=0?{...r,number:histIdx+1}:{...r,number:nextNum++};
  }).sort((a,b)=>a.number-b.number);
  const numberedActive=active.map(r=>r.number?r:{...r,number:nextNum++});
  return{finished:numberedFinished,active:numberedActive};
}

const PAGES=[
  {id:"home",icon:"🏠",name:"home",sub:"stash overview · re-ups · saved compare + tip"},
  {id:"stash",icon:"🌿",name:"stash",sub:"log · manage · finish"},
  {id:"library",icon:"📚",name:"library",sub:"strains · mixes · legacy"},
  {id:"insights",icon:"📊",name:"insights",sub:"terpenes · types · bedtime · intent · outdoor"},
  {id:"compare",icon:"⚖️",name:"compare",sub:"any two strains side by side"},
  {id:"recommender",icon:"✦",name:"recommender",sub:"your terpene fingerprint · what to cop next"},
];

const STASH_BG="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAMgAyADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6FoooriOgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACilpKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopCcYycZoAWijOOtFABRRRQAUH3qK6d47WZ4l3SKjMq+pA4FeS2/xT1RJf9J0+0dc8qpZSPbNYVsTToW53a5nOrGHxHr/aiuP0H4g6PqjrDOz2VweAs33SfQN0rr1YMAVIIIyCK0p1YVVeDuVGSlqmLRWF4p8UWHhtIftglklmJ2RxgZIHUnPQUzw94u0nXWEdpMY7n/njMNrfh6/hSdaClyX1DnjflvqdCBkUgx3xQTnFeYeIPiJf6d4iu7SC1tpLa3kMZDZDNx69qVavCirzdhTqRhrI9PorB8KeKLHxHbM1sTFcRj95A/Vfceo960Na1O30fTZr68YiKIdB1Y9gPc1SqRlHnT0KUk1zLYvUVxHhPx/BrmpmyuLUWkj/AOpIfcH9j6Gu369OtKlVhVXNB3QoTU1eIH2xRXD2vj+B/Fc+lXMaR2vmGGG4z/GOPm9ATxXcDOMN1FFOrCrfkd7BGansFFU9X1K10mwmvL6URQRLkk9/Ye9WLaZLm2iniz5cih1z6EZq7q9uo762JKKbLIkMbySuqRoNzMxwAPUmuIvPiLZHUobHSLd76SSRYxJnYmSccdyKipWhT+N2FKcY7s7miiuP1fx5p9nrFvp1qBdSNKsc0gbCR5OOvc06lSNNXk7BKSjqzsKKhvLhbW2nncEpCjOQOpAGawvD3jLRtcdYra4MVwRxFONhP07GnKcYtJvVjcknZnR0VS1i+bTrCS6W0nu9mMxwDLY9QO9c1Y/EfQrlwk73FqTxmWP5R+IqZ1oQdpOwnOMXZs7KioLO7t72BZrOeKeE9HjYMP0qfNaJp6ooKKzp9b0231JbCe8hju2AYRu20kHpyeK0c80lJPRCugorj774h6JZ30trIbpniYozJDkZHBxzzW1oniPSta4068jkkAyYz8rj8DWca9OT5VJXJU4t2TNaiisvxDrtjoFolxqLuqO2xVRdzMcZ4FaSkoq8tim7K7NSisDR/F+h6s4jtb5FmPSOYeWx+ma36UZxmrxd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F4I0XSGWRYDdXA6S3HzY+g6CqpZbWn8SsEcNOW+h5t4P8D32uSLPdq9rp45LsMNIPRR/WvZ9MsLbTLKO0sYligjGAo7+pPqatdh7UV7WHwkMOvd37ndTpRprTcTFGKWkbdtO1sNjg+hrpNDxv4s64b7WV02Bs29n97H8Uh6/l0/OuIghluJRFBG8sh4CopJ/SvZ7P4c6QkzT6hLc38zsXYyNtUknJ4FdTp2m2Omx+Xp9pDbr/wBM1wT9T1ryJZfUr1HUqO1zjeHnUlzSPJPD/wAONTv2D6kwsLfg4PzSH6DoPxr1DQPDmm6DDs0+ALIfvTNy7fj2/Ctfmiu6hg6VDWK17m9OjGnsAGKKKK6ja4UUUUhBRRRQAUUUUAFLgFaSnZ+XFAFLUNPtdRtXtr6BJ4X4KsP1HoaZommx6RpsVjDI8kMWQhfqFzkD8M1eopcq5ua2orK9wooopjCiiigApMUtFADJYkljZJkWRD1VwCD+BrmtQ8CeH72QubLyHPUwOUB/AcV1FFROnCatJXJlGMt0ZPh/w9p2gRSJp0JRpCNzuxZm/E1r00jkH0pc1UYqKtFWQ0klZBRRmjNMYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFL2pKKACiiigLhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRTHcKKKKAuH0oFFFIQCiiimO4YpCKWikIRgGGGAIPYjNVW06xdtz2VqxPUmFf8Kt0UnFPdBZFeKxtIjmK0t0P+zEo/pVgcDA4HtRRQopbBYMUUUUwCjFFFAB2oxRRQAYoxRRQAUYoophcKKKKQBRRRQAUmKWimAYoxRRQAUUUUgCiiigAoxRRTAKKKKQBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAdqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==";
const HOME_BG="data:image/jpeg;base64,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SgYUUUUgCkpaSgYhphp5pppDRG1RMKmao2oLRAwqNhUzComFIohYUzFSsKbimI0qWiipAWiilpkhS0UUxC0tJS0xBS0lLQIKWkpaYgpaKKBBRRRTAKWkpaBBRRRQMKKKKQBRRRQAUUUUDEopaSgApKWkoASmmnUhpFDDUbVIaY1IpELVGwqZhUZFBRCRTcVKRTcUCL1LRS0hBS0UUCClopaYgoopaYgoopaYgoopaBBRRRTAKKKWgQUUUUAFFFFAwooopAFFFFABRRSUALRSUtAxKKKKAEppp1NNAxpphp5pppFERphFSmmEUDIiKbipCKTFAFulopcUhCUtFLQIKKKKYgpaKKYhaKKWgAooopiCiiloEFFFFABRRRQAUUUUAFFFFAwooopAFFFFABSUtJQAUUUUDEpDS0hoAaaaacaQ0FEZFMIqQimkUhkZFJipCKTFAFilopaCbiUUtFABRS0UxBRRS0AFFFFMQUUUtAgooooAKKKKACiiigAooooAKKKKACiiigAooooGFJS0lABRRRSASkpaKBjTSEU6koAYRTSKkxSYoGRkUmKkxSYoAlpaWigQlFLRQK4lLRRTAKKKKACiiloEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUlLRQMSiiigApKWigBKSnUmKAG4oxTsUYoAZijFPxSYoAfRRRQIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooASiiigAooooAKKKKAP/2Q==";

const DESKTOP_HOME_BG="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcICAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCz/wAARCALtBTQDASIAAhEBAxEB/8QAGwAAAwEBAQEBAAAAAAAAAAAAAAECAwQFBgf/xAA3EAACAgEDAwIEBgICAgIDAQEBAgARIRIxQQMiUWFxMoGR8BNCobHB0VLhI/FicgQzgpKiQ1P/xAAcAQADAQADAQEAAAAAAAAAAAAAAQIDBAUGBwj/xAAdEQEBAQEBAQADAQAAAAAAAAAAARESAjEDIUFh/9oADAMBAAIRAxEAPwD9/iMLhOU3ERgYQAiMcRjMoQhAFCEDKBQhC4AoQhGZGEIQMojHEYzEIRQBwhCMEYoQgBEYRGEihJMckygkzMmU0xY5jCeo1bTmd7M06jVObqPvUuGjqvwdpx9ViJr1HJGZx9Vzx+81kUy6raic3QzOPq9Rgt+BQm3W6nbZE4+owZsmhvU0hs+qSVPYR6+JxdRztRobgTXqtk5s+05Op1hgaS1b4mki4z6j2xOynwdxOTrNqY9wblqM06zOLxfO85Oo+57lJ8Yv5yopl1+owDAtai/QsZxdZj01+IMa+L/U6Gcq4sEi6xR9Zw9UgFlFhquyeJcDPqdQkmkLA7A7Tk6pfp50lQRen/HO826gRU168nOBOJuoqtZLFVHaa39CZoGfVY1Wkl2H5sWLmTPa2zBR+YFvijZm6vSpV0UNRBFfofnMXDsaKgg87/OCKTX0+4Ek441X4mBOvq6tWVW2XcN6ek1JZlNaiDgaiMXjaYuwKamUmvT2z7SWHpi7NkktagULksrOT/xMP/LxGwHUcampDkAm8TLqMoele2vxgiZ1hUlmYaSGasnwfWZ692GEND4jkRnq1pARnoWSwPb6ROnUU1QLEWOZDOitfxOHxZo7yOozLqUntF3wWNSvzXlTtjH6wsq9VsaOnPrxM6TKj00FMW7fi2hwQFLe+0MHUovV/lq4gFAS9Y3s+fvMkA6kq1YD/E7jO8k3yp1N5xYiDBTksVANH+4xr6iAhNONRuSarJHcRfIJ3gewars49bPEmmJoqCh2P8wIbTy3AuojSO/qai2QMgZB9IZrnUOJRe1srsc/3JI1PbNSEWBdxA6LmwjD/wAvEnuK0QWK5OMHG8TMAQA+o38jDVVAIzAC8j4YUBWOsk/A2N9xHhr1MHasjzFpdc41HIiBIY4IJ+UgzdmUFb1L+5kkFEoG8fFKBNiwTsMRGja8nnzADNlQt424gwK5IZb4JGPWCoNOrVZwTJBAINmgMH+5JHnbT3ML7sYjs33V62d5K31F7V0YujiFG602DtALooLBya43mYBbqai1kDI3B9MSwCcAk8fYkkj8P4TQPyMSys+t1gR0XbtX5+ItIZvipdxziI4YlWJPtAAWe2i1b+sYJskjBFb7iSHqgFLULyNpTaxk0SciAOr37jXneSzEKQTjn1NQF3YBB59ZRsNQ9AagEHs6dBr7fi2gfzALfreLgxGVzfm6xENKrevJyYtCmtRZBXHw3tJJsDtOo+TWItWnklRtj94wSy/DWLNw0KxVWMAXZ/SL4RYs/rFkj4R6GGdHJ4EWqIEl7Y7CyBz6Q1HwRQurgx7bINCLDPlgFOcmLQogsbVD6HxECSNPcfPriJjT4MAaAFEkC8jb7zGFKxu6BXbfeMZNE6zWcxaG3oEkWIthfwn75jJbMQtXaj9Yq0qKbVi9UFsEYJ494UbYUQTneAOyAQAxJ8xm1GxUeMfWSoXSG1+DBW7xk6fNSjVsNjZ84xcvdcnbBs7yBqZaC6TuQRDJ+JQRxGTWtK6gTt7yAS/WDE5Aut7N7R8GiTx4/SMlaJq9P6ygATzeNhcoAucdNvfxIw7gk0u9XcbYNA5B2ENOKBs0QT5HmWpNkkdpxg7iZI9aQFLULyNvvMunXJrVViVqladXxNq5Od/SUXIUgntHyJNTP81iwT4lqxDCwawPPrDVCvw0BBvHxfxH5AUnGL2iPxFapvJNYgigLq1izk4zGa6ZaYqVBHwkxgknK9xHOLkIwWrLFRsZSszrhdBqzcataWfzMBWDZlfCNXpvvfj79ZmLO6gr5lcmrI2ANftEvTBL9W2bIGRwfSIZGzWBgRluw2ux+RhpDOO6lIxm456UtQzmwh9/EFJK1RYgZob4kWoatWRt4lq1BRpZqGrI2lacUrd2qu0433EtTqaiwc1kA7yO/fFnb0jWx5B8+fnBTQswBAYFQN/8jUWn8PpjSdWPi/iMEhhY1A4xn7xAkFtIw5zdxrGcqFLYxHRSiQVH+JP6xKoVNReycmJW0vdsVW87/KCmmaqu5hjViWrGgCQMZtt5n0y3UTC6G3MdnACWDkSpTantS7zQ+fiIW3WtjkCyPOdsbRLYFWWoVmvbaX//AJkkHtx9B5j1cFtyCCows0AZ2sJYrf8AxmdB3FtSn1vaNhpalN52Ax7Ra0ihqPb3NW+PixGpOo2BpOMNuJmr6Qi6S+NRwe37zNCvUBvFnKjeXoagBt2DGs928GdtJXV28na8TNbA1AMrfvNAdJyD4xn1j1Q7k6Y0tq7SdVVXpKUt3KAW8ePpJwSyj4jtmoKoXpavxBqNHaVq16SoBZWVTfbj6ymsAkqdTDGrF5makahZfSvNX8j+0tS7pSoEsWbH1hKqLF7FgODZ48SgB011A8D1vx9+syycFQV4xLXUBVkgYF/Tb6StGKUHqdaywDAWebzt6RqSVolhQ28RFr6RsGx6YNDz97QNN1EGulORm9o9XGqq3UIrpsf/AC/x8yVJNLTNW/8A5RMVVq1WQcCsVBOoECKUZ6zkHGIaqN0Y67rsqt/iENOs9zajWabf0kH8XVY0m/hH8Rri2FodsD+ZUqlMzKCurs5O144gt9PpqFfVYJLDBA8RqxVqrUpwaN+vHpHjWyiw7ZBJr9I9wRQc2aBJ/c+0ruXJQqM9pr6iZoqr0/xPxBnO32Y1ZQ4LFygvNfftK6NtZAvSdRG7YvM2VqGXAxRs7jxMVLdTpgL0/wAO+7IlqGoKU7fa4BsF0rrU7j3vx/EFvqdYanpxkgZB9PSSjMFqyQMCyPbaaZKZB7TmuceZMI1dqsAgIMKJsFd6/wCM/wDt4mFBnHdSHbN7TTUA5AayD4jS2VmY0dT4sjhponUJN/lON8kTnTqBQq6S5yTY2+8zdQ96iAScgfxETdRqNFteNgdx4l/iEWtjTWeLnOGIOoWGP6zZWKkYNbeTEVaAnpopB1WCb8ek0V80AWvz5matbFReo53qPp0E1a8nPrDGdjoAZRZUgeLlqzVlSWO18zmVgr7vpHM26bM4oLoPxHElOOlWNDU1HY2ePEuiBrBs+285wWAorg/vNemTVWSBsDFTarb9UEsLyT49pQY7HFZEzs6Mg48c/OVu3xYPrcRtbc/lb6QitP8AP9IRG/Y4jAwnRvOCK4GKAO4jCBjMXC4oQAihCUAYoGEAIo4ozEUDCBlCEIzIxRmKAVFHJjAhAxQAkmOIylFIYypmxgEO0wZszR2xMGaVAy6rA8zl6rAbH3mvWbOOJydRqG80kUx6j5InJ1W7qmvVfJP8Tl6zZB/iaqc/W6wxZ9KnN1e5Bfb85q7ADb/U5eswKnGMG7lxTDqOFGdpzOQGom6zNOo6opAJ5oVOJmDBubG4HE0Nl1+oGB3FYvxOR3LqSTY8zXrEaWRSK81gzndl+EgLebzUuKc7MBYvTqu2upxt1PxGC9MFgwIJOKE6OsBQxgZFis8znLKWNDcGhfEs3L1QgthoKn4Vuc7npuSSaCnYf185t1dK9TOoEG7C3pHn78zk63UU0obXpXxj5etyoSGZF6YpgSfHHp+0wZ9DEBu7/Ema9YKoDkDFUukXXoJkzL+Jqbu+WRX7wrL0z6gAdVrbccH7M526illvqEk9oAzYnS2glHFixYAB7TuJidHTpdINtwZDD1WWk9TpqzqEJ+GzsJkxVARQraxN2GpASuBRu9xMNaKMMV3pa3/2amdY0q6aMAXonnz85k5Bs/CBzYwP+pS92ra2F6gsghe7pivU0CDIrOnYdCb1heR9+JmpwbNBgbJ8TVCpOmtJOeccSGC0prY3RFZ2MzoZqdWn8MarsWTVf3BlVSWFEXhbmiuGZqHkb8SHAXqEkEEnVtekff7yQFCuxP8AjwP6+cRKqlhls+JLEMKVtVDxe383GwAOogdtECsyVFeg0GF7VcGAsCj6+v2YzRbUwB4wMj0lHTautjmq2MVoZBl1L3ZOBWcQCnqJbAKTtnaUAqGgBZO/7xsNSDG3PkSSZ2FGAteZWlQ1Xn1k6lAJ1MN6FZMYFlicmruuLgEkgkkWBtv98R/EpNagORvAgLqQEcZAsXGuj4AKxd8DiSpIbSdyA2CfpJUltI6a6rsE7YlsBoWxsdq5grBmNZ3rMRJZVViRpzsL2ipWJPCnYf1G1K9mwbvzUhmDAKDqAHjeIK1AdO7yYE6OTe2kmDABA1AVRArMVgsWYAgmvaANlGpRV+QPvzJ1LqQF8mhQziaCm0sLGLqtjI7VNaRvkwWlQzINXaTgWciHaoIIHqRLan6YxipAZawSN6FbwCtKqavMTGwQON/QQX4iN7G4HERIUFRVHniSAGDZ3AHn74gDQ/8Abc+kSFLqqvniIgaVBXY7EcxGSsXAHTGq7F3BlAtsHwssMNRIGNt+IUqsLwbvbYQCaU5J24/1CwqijvBjeAbq8VvBtIFsKA2FZgAW0ORqyODAimAz523hjVqObxttC1amHPgHEDTY7bOTQqNQWQEgJeBZhYXFDf8A7gx1dMYxEB2i7quT5hShqvPmCsAcHTvWN4lrUSRdjeoAywJJNge+0qw2eAJN6bUEV54lKVxYr1lAhQ9LsWYKdQA6YJBxkxsqlReBfisxqwLEAVuIAmUAkgj2uNdJa22Xj/UDQbY5N+0VgilbVXpcZLtdO8L0vvkYq4mrTq0iqFAj+IHSxJcWdq8SjUwGoYrz65/uGsWpJ8Co7BVWA34qK1VvhFk3vGQAPU6fcAh2FnIj+EUQMSqDIMDbe4KRwSDmhW8ZxQVRjVR3zBmByB+u0hRqJOm7G9cR9otBQ8msRqiwdabhgowb++IKaF3V2Lv74gmi9JFE5vxUCFKgVsbquYKgRizAdPuGRZ4xLKAFiNNXgXGjAsaHtmJgqvZBsnxdQ1Su1thSrwP6l2AhII9fSZEhhQbVzkSsUCdgMCuI9PD1FG3yRQW5bAWBpzvXB+zJFF7YDx7SxRp/0rYw6XhaltbbOwG+I1XX0wWAS8CztDCcAkm5enV0wKwB/MrVxA7bGKH5ufWaBQGHd3ck/wBwGkCwxXJoVJVQSzVq1DBriJWLYglqwBjfaUpDLYOoAYN5+6knt1KCvdksBiUn4e1AXzwKj1UMdQKt3V2NXpBWLADpjXuL8YgyAKAeDtXMtGDN2jyKBj6VA6qGsafAEOx2N8bgRnSrm7Gb86R9/vE1doDa9+PvMNWvUq9PBBJ/SFhG+LNVp1bxELpDUAqgEDTn6RggtbC+PUQ0YogalFHyQNvu49S6ktqN1QzGpDBX8m6o4P8AEldKnYEsYdKUgLpTKE4WztvKsKTYFcmHxdOgNhv841ZRsxFk0K39ZXTSKCqprVR5O8TOCxI44vaSvczAmyRghf0jChAyis1ZAxFqminUuDqVRijBSRkGtV92xzBNFha0k81gVGUGkXwdqrO0qejCPdDpd12NR/Lj9Y2UAll01sF9ZSsNRIXTuME7fYhpCvZFEkEekeqiwEZvRdx/qPUi9IkNv+kzLBwArat9xg5/eWQn4eorgAUtC/lHurhqwQ6bpqrSTvKZRrAo+TQ3+zJ7T1NTKD6AZE0ARwrVp1cUcSujTqS0tyDekAZ/SUqs/SvqKOnwtnarkgp0yTQskH+5oRq6YULgevg/6j6BdqKb00N2vnaaBFU6S9MTvx9ZPTZbw2jJrG/rF0+5ia1ahghc1K1bRmDE1sp87SumR1F31ADB5mdBSyDTkC2Ax/ua9Mp8JXTfOaFfZhqoS72MaufT/qJWLEDpdxsrqvC4/USyo0AAbG8isiNWB6hpfIFH0z+0rdPCZFBLgrWwX1lhVds2NO4H9SdCr1ASuSQdrocymYMAqPq3OV3/AN5huG1VlXp3qs+2wjVtBq6O1XvtmZkLpDEYAFAqL34l2vUfUwBG1VkSp6DehYBFH4j65/6j/EUFSz1wB6SVCOEYAi80AcRjSpuhbEH5w0LVdfS71CD4V1HbeaqVQEELS7tzMyuvogBaFb34MOmyK1BtNnGN4dJsdCqgHxU3ky2ZS+AcfICc/TN3jVqXcLn/AFNMLqUaaO7AYj1Lo6bfiJYOoBaBuWjVZGxO98TLpfh/CQBe54FTTSNGmrzyOYtwY0RrKjp9+SM7DHmalFywI8V6zJSCe0Vvi/vxKAUNkEGwfYQ6TjddLGvG4E0JVemTe/6TE9yije+4lCvww21AUK/aKpsaqxQ532ombbECvUznBDNnPBFZnQNDU1VfptEirHUXSltpIxW8tbfpdwobD0mSsqEkgWTfzmtf8dDYDeBtK86TCSCOB+kIjfs0UUJ0jzohCFwBQhcLlARQhACK4zFGYgYRQM4QigAYoQjAhCKMxCKKAOKEIAGKBijULkk5jkmNMiScTJ2lMZg7RqT1GnP1GxNOo2Jyu2ZcNl1Wszj6rVNuo1GcfVaxNYtl1GOphxOTqdTF3i6ua9YkHPM4+syirPcTNJFMus4Y3Xt6GcbtQOMkH5zbqUSavnfmcvU6jK1jYb3xLhsesy73jxdTj6oF7X7fzN+t1KW6GBm/M5bYKBsoOfHvNIph1mGljdkeuTOTq9TuH+bYxc26isb2C+OfvM4mzRPw3ueJZl1esdmybKj38ThfNALYGSPX0m/UCNrPdRasDNzDqLoQkXp+HVePnKJh1XDLsLrtYefH6zmOlz5I2Bb7+zNWZj/9tGtwDefM5iCOoKCBx+YcE80IyS1KCSpAGKJOZn1LDOg+HYnz9Jp1AzIAxJe82TjjMw6iNqW71HJHHmTWPpP4hVNS2BdTPqFWINbbZsg+JbKoUX2vqFBdt+ZOgF2q7sjPPtIrGsfhBFZYH5yG012kgHcav0luX/E8Ab6jn0P7yGGzBV7fiusnzcisql0FXRf1BkGgjkjURQ3lKG0KL0oNwL33v1kDptbUaT536fvJZ1LEqRqBLnH3849ZYnVvdAgyQvLCxd20WlW1VqILfO6mdBUGWgorcjx7R9rgX4oH795bL+GvIFVd7f3IUtpH4lGtxvmQC+InJY8d0RAVTqBHuT3CLOsCk1DkDYnmo2VmABy1nc3USib4yAMAUTeIlaha4F1EwYEE/Fd0I+3SFoqxIoD+ZNAbSaLA4+oPgRDBwu4//aV+GAxq+Rfk+kks2vfYZ1HbxECYqBatSni8RaBXn1BgwrOkErliRuYIrLpF6VBF0cX5ipmaHTY0WoVVyGu82zkViVoNnah54kqKqxi9zIUosfhbzQzIZRY0j1IGwjpTqrWRfzupTWqZvScEiAK1NX4AB/YRfEWzZ4FwBbSNeaF4zZk2Qw+Gx+/mAM4GQ1e+8RskgCgN/BjZSRvbXyYipFWM+K+ckBXI2sLenaKwx2x5vN+Iu0IAQbYgV4lBbaxYPryYaZChuMsL/wDaBC7g15FwOrUM4AzZzEcKtUSMkkbw0AoDeLvej+8LpWrJAjVTQApVvjz5k6CSeEMRE12AcscCpZfuo73MwpAyMXYJMelCWI1VfIzcAMWABj+ZRph3EAEYMCNIr8vvFmhro+feSoAajk2feL4QbBA994iDYwBXpzGVY891+T9YAGwxUY4zF+Jp2wMCJgbHnnxDAXOGvH+4aZsQ3Hw/PMQwbNWePMarbYBvIzES2rfbcXFoF9pIx5zUek1td83FxZ0nFk1zBLoDFXkDF+sNBmgDyfeOzjVljgQAN8VIVeCPrHoa6sHUOa3k0L0qPUj1gACTQY5lgUMWBtK0AEEC/GDFgtV3nzAaqGsA1uJNHUBS6hn5w0LrO7KB6xmwTWABURsjPxXuf3gysQDydxxHoNXoErdXUZ0vkiv3B8SSFK9wzfHvzLC9xqyfvaPQSYs1l/PMdiu0kXuLgdeojgb2f1ga0g4YrufJlaStIAsAt6g/vGK0tYJI9ZC2BpugNwMfOWEazQFG4aqCz+bLHAqaaySQawa3mSja8i92l6V7j3Vq+d1DV4arY0gDeyOAZZAYrjjB/YfrAAogoGtruCsdPfkVms36w1WBVLNd6vQtHQUEkMPnuJFnULC2D+vtL0swy1tfJMenIqu8hR2gVfG0auQLTABAk6Tgnc5IG0dCqK0SRgfzDWkXYOSDg/MGNCVN0LYHfmH4Y1tQN+TsTC21DkDfUc+hhuKitQHwkgNuL5jCgDI1DyDJIo6ioJGSa3PmNQ2kAYF5o0CfMXS8WKVDgtQ85hfcNy5wAL8xfhGzmhEq4yO29ziPo8a68kNe+PeLSNVBb8gbCSqoS1aqsDbN1NtJVKN1sSDHqoLVlF1tg/xAdzGzZxVnMS3QHUpua8+sATqyFxnbnzQi6XFVQOCoGN+PpHR1Uu1VfENLEHUba+c/OSQ1Cxk+IdKxoj0lpsDpsmMkPROwPm6Mg6NBBU6rFV/M0Cd5wSfUYMeqhoKzWTe/MeAO00CMi6it7GTS7gnMbZAOCRljW58x6uK0gCwC3qD+8eNLVqOkVkyU1qFAOlQc1dEyh0zqI/L63d+f1j6VguqD5c4XeaaskMDvQzsZmF2xYvdvpKUIwatRFixRv5Q04egatIXN5UbXLGlgA1DFAj9oaSi4Bra7/fzECdIHUIbGa58GHWKkUAHJtiT6mNaUE0y8b1Y/qRR15VdWT8z6CaFGcUTbA7m/rHPS1Z1aVAAC5N42lK2lbQUtgczIobUn4iQaG0ZCaSGBB2pf5ldG0Ok7jY5zZVvAh0WCnVQ1Ne/PpGqAu1WSDztftAlx1MX2iiGOY+hiu3TakgEZF7H7/WPQPiCMw9D+8TeaU13MfPiHTDhQB2reaOCc5uVPS14CnBYqNrz4qBYqF1C2OBv5gEaybAW7O9+8SLkgra3u3ErpUbfiUxDk70Df9yT0wTpC2bsji4tCd5Gsix5Jmmg9Nbo+Lu/rFPSxaNpB8Gj/ABGg1HLdwoC2krq26mllGT6+DA6iQCqWLOBzxgTSek41VQpsqy/Pcf1iXnXS4x8tpJVmBDFmfUckn6xMrDQT8ZrA2+6i6NsjUGKYUELLJVjZwAc7Eg+kyGgKbBBJ/Lx7zbpoNRNG79gfYR9G06eDqIy11fPpHQrtNYyL5k6n1YJpRkE597jewAdIJXJNDPiPpONdAGQCfYyyF0tuxUeeJj0w4FWFHIBoE5zNl6ZLXgLnz9YT0mwxgLq+IihkzdWpu+8NW851FnllvdpoiqxY9xFgHkmO3UtgO7tHJJHFza1YLdVVD+pioKIDR8Ej+fMtCRh/nWbi6GNl7nIY2feWKW9xxd8TDNglVLDJrn5TcanOW1Nfk/WOX+IsUppqXavlNFJ0kocXUy0nSCcE+NpYCjpnWKJOw/mHxGNu08Yv3qadI91mrbzIVO667r8Ri1bHG6kxWljX/j5NekIWn5gSfaEfR5X7PcIoTpXnRCEUAIQgZQEVwhACKBhGYMRjigYuEIRgQhFAAxXGZMZiEIQAMUZigYMmMyTGYuQxjMzYxhLNMHMtjMeo0qBh1XtZy9RzWN5r1XsEzk6jeZrItl1G9gfacXUbOLIm/WcasGvecfWZaz+vmaRSOo+LOTxOLqnU13j1m3V6hC4AJ+s5Oq9rQ+c0hsOp1KfSpwfPM5OoVJznmdHUOkYohhVTi6pAJHyoy4uMerqW89ntOTqFe2sHgbAzd+p0xeq7zm/3nI+lheaPF1NDZ9QsbGo3v9+Jy9YgpaXXDefPtLdlDmtPq0w/Ep2DV4XSMxw2LaUUnUWY92BVitzewnM/ULoHOFrxnHpNuov4jE2AzY+U5uuxZS5UigBqEsMWXBZMG7JO1zGjrCuO8Lntzv5lkq7szXRNb/FM20uFXphh/wCxzcbP0y04IQmt8nfO0bHIJYuzZUVVnn94dRVCDUQfc3n3mbtQbTo9Qfv2mdY1BUN1Bdqm9Vx5xtM26ldXQttqG5G/9TV3VkIGOdqGOJnpKEgUQ401Ww+zIrGsW7gL7hg7bYksri89vOLox9TtJ6dHNWpiDIGzqJyLvF+sisqz0r2EAj/HFA4+/nENYLKWNkAj+vSUqhsiwGxV1UhdAJNi+WkIpsQyjQLB2ah8/beQFCJYJJPgVeP2lq1OdQGRQ0rn/uSyDqOaK23ptfEgI1HqIrk4ret/St4BQLYABt8jFw6lkWykUAAwiw9sbo49/wCJIFdw1DurOM7yFBC2t6d9987SuxlUAEe5siJlFAsf1vPyiUvc2TrJ2xgmZ6dT523qv1xHZANaSeQcxsQUxjzjHtJoSep/yBVzfnY5kdpwwvzjb7zLCkE1kMKqQwCsVo0aFSTOmU1YKD95OlTpIBFbacS+xXGoNqzm8XEqkgGzni6kka6rI859/wCoiQwGhTn81SQVUWCvqZQbuplAsV2xLJQAl6rJzgb4k6mdA3Azt+koqGNWtn9MyWtu6jgVcAWnlQAbv0uH5wCO6s4iFMSTdXW8CVYBVUi/JvMkCqGNVeL9ZVmxfcSMDyZLVWc/O8/KFnSQukj1iBFdb5sL7RayOoFUkg+Rv/U0JBWtq+ntJoqSQcEaaiCasaSPXaPuVj4rIrmI0GK59jC0ByDe1k4gE0KWr9KxxGuq8k2fuoAAi80eLqSNNXa3yZJqJLAaF+cjGmw1sc1W+Jd0xsL47RmIgsSAaJ58QCcsl7fKOqthg7wa2FnNYk6gTqz9d4Ge70R3V4iA7Tnt994AqSqhSPfe4Mvbn53mAaXkck/vIK2QTenfaBuyF07bGDEEV6ZxEYLAMFybiwRRzzGBpsiqIqhJ2Nad8V6wCzq+Q3EWkWvHgbXAaQ1my3vtBQCMWL+UQULyM37R1qrSt83Ujtz+soN3CxQPgZlAKF03Zs5wNxUNZddX8R1qbetUGUFbI2Gm4wWnkYJzHkvTL3AeIlpms+gldp0qti/nAEAdJ0mx7+s1vk5LemLmZUYLZ+cYah26CeblaARqcXgb7Sg1PpWyGNX5jNMtH54gBo+GipFUI9BaQRpOfltGVYHft32uS3adOfYmWCgNkMTtvtFoIBe2r9KwNpY1ZGbNH78SFXULznG9ffEtdIJur5MNVIvdaUX61vBVA6eoMSfI5FQVrPeBVcDP/cZTU2CAxENWX4hZAxwPbP0lAHJAo83EVJFuNhWIYZiT7b7xauRYU6gGHcB4iAoELYX33j7CqgAr75NwZRVscbb3H0rGgNkXm8gHa4VqwfhOdohiwNPscyidS+MZxjaHRwy4VwBbXeT7xUpw2edtpS2psEURVREhCUIOaFQ6aRVMGOe0Z+cahSF03j4cVeIk/DXBDX5vn1jRQaJujuCa++ItVilJBIN2R9+0v4gNA1evrzMwBqJ7b5Jmga2OoYqsDPpDVSEihVu9RPgfEK9Y9Z6iBrCjPECoZsnuI+nEpgxGQe3Fw6XhBeQAp31ESgP+Qax314/aQpDWzXV1L1KQFUEe5vP/AHH0qQAAKdJNZ8Z9JquaJBYnIHrIKLXdmzybvxLojChb2KmC8TpLMA3apzkbiX+IV6oRTYbG2IEg9LTVUM0Mbf8Af1jUFDa1RFVWBDThUMKTa7kASgGW89u5FSGAU6MgmhU0QoHBIY8b4+ceqIAFUbPkUKBxLUEMRZJYfY9IkANEXR9a++I1KhrGnG5MNW0vtpBqs3q8mJFULq1WzZwNxUA1dTIFbChn/uUULEmwGPpt5j6NAcsga/NY/SWFBDEDS5yTWPQwZSwOr8uNXziBVrZgRx6mVqooKdYDDvzx9ajA7CFsLZPH0khkKqiq2fOTcplQLbNY979otxTW8gnuvYHYmpJUswvtXeqzUA3bSaL5BHEsMGQCqxk1jA/eV0Y16eoEU2GJFkYMGA+Fsg5IrYxqNB1KRRGkADERAQ6QGsgAiPpWHTLtldyOeYwq0hHGVoV5go6aldSsSDV3i65jRddNkXuLqvvEfR40XVZBJJIFf16SslRoXVm7rc8zJdALG1sfE200RwHGoLVVgd3H6yp6UfTUBMsWY8gUWFH5RjqHq9MNdDOdP6VFX4hPcNbDncfeZThivcDSArqHvH1qoNCsS47Td3xGNWsfifHR/L+0laYlmLBdrveMlCFVFdDfJ1ZuV1h2NFUHVpJrNmwPlNRvbEm9gcDUOJkVVU7jYBogm78e0sNVhQt7Uc4hpK06m7jpXcgjf78zTWE6oVT8RIGMbnaIMH6SqDWKY1i6/wC5SWgtaojTp/WT0D5psg5qtpoA4OPhqyOZjlCUo7AFZt0vwwQGDk7b4B9ZU9AKFKrvvY0igZst6gpY2wx7+PSZIoZVYWNW4sD74lLpDE2LG5OIWprfV/guo+a3MrpKNFliWPpWrBkIw/E71FEcDMvRZu6Yjxt95j6/iVq7dRA11uNvntLVSTYwd7rEggkdwNKKsSlOo215oRX0G1tqCsBqzxLArVpJ0nfMzH4bBVVG53ObmlKMlsbHP9R9Z+043Vsgk2eBwT4i02d9IOarf78yVuiAUvb5Sw19MLt5NYl9aixoraeoFU7nevWaDON7yRW0zUaTqBBsVpj+A6cg0MRalpkbMBeYQwMGzUI+htftUIQnWPOCEVwgBCFwuAEIoQMQhCM0kwEcIAhHCKUYuEIQBGKEI1AxQhACEUIAjEYSCYwGMycxsZk5jCHacztia9Qzk6jZmkimXVbNmcXU6jbGsTfqk2SbnJ1GNEHneaqY9RjZIJzc5Op8O+Npt1HpLvfM4ur1CxoEb5lxTN2BYmqOPnORz3Z3Jz6zTqknq0ACoqc/VbvzgSlMOoe3TnPPAM5Or1G6Y1KMAC5u2qhR0r/r9py9Qfh9NaW/5msUw6ruxJY/Ie04+oWZrLNtQ9rnR1Tk2QpyT8pzP1iSWUggDa5Rsuuy1WnFUdJnN1AAulbIOSPv1MrqNXSd3YauMmY6XCuSADfxCWGL9QMdXcALqjk1xmcztZZjekg4PBmrBtSEUWJo54mI6JZ1PV/5GQGr/aOFWbdTq1+HpVSuD9+Zj1FfU1M1sCCRsfM16hLWjKunVRNf1Mi+gYbubI4r73itZ1Cqo6ZJBcVQ1G5FIWypVqvO0vqF2pSV4vJ+/nMnDN1SiUQu45uRWNQSbAYWWrncSW2CBms5vgHxNOovfR+YvExUdWhRCqDRrn/UzrKoZm6feqgUAG9zJbW1ltjkKPv0MsoOj0VC9MEY3zcyI3JNNvgcCTWaNJLAln20iz68xvRwUxVGvMv8RiWYEaRtMc6GY0GBxkyKgyBppSSDusQIazkVdZyfSMKwRiQAfIkkUFK0WO/tIoTWSSDRHPB+6iZnH/HQsekpekWcfiDUVs1xEwJJGlQLomoghtQNKxtsEg4Pn32jRAq93djSLNw16RqBAZsj0+f6xMWKqlreBiSYADG6psQPgreo+Tn7EKLMVXSVsY5g6kvRwvOZJET2aQTnngHxJYlO4DYZ+cAOpYIoAGj6/wCowv4XSXQg+Y5iqiYMxttjstyNJZwWLYBUZG0vN5w2+1wHUYszAiuBJIMBZpMAZqG4pb9pJsKxbTY2yYKrBTqCgnkRLGD3DVjaufSIAZPFZB4MCD2kZN8+PMAhLKep3lLoViSAXcAoRTDmQQ19pNn6ev7RtZ7Sgq8mIvpFqctkY2iBhNKbaqFd2YgAz3WYMWIC495LWXKrkCIKs2FOb2NxflIGqzt4B8RnDVx7yFHUA+IKBjHMRnZRQwG25qIliCW24qAC9NBpW/PrDknY5OPHEAnTZslhQoWeJTAUBp4zUr8Q6rDLXiQ16HY1fGZJqKg1vmI9zc74r9oUdJsV5MnPacXdXmMHgmyMevBhqOnRixBemSw1dxW8Qa2NFRV0TJMjqvBbOL4h0wAMi6FDVEG0rYOTtBixKrY98wAFXZB8wayBYJv14hktS6SPEGuxxEDxWk359j4iBI7gNt/nJVXoZAAMsL+GopR84AiWYWefv+Iskg92BQj2JugTGrE5BFRmpgNQBUUBRhQ01XqZIBosa9JShtJJA8YgBYJ3NDbMAbNkY594NYK0bN8+IDp/D+INemzUr9gwz/BjEO4HF2eePnA2SQQKuiYwQPzfFt5EP2DRKXlsVmCqNyKNXAlqC4zvJr/kpaI3I5i0mhJsWLLevrBqK6bbP6HxAg/iZwP0qJQ+ADpUGsR6agxU6q47o7dh3EDwBiJemEQaUwY6pfHiHSpBksLZsDSPaWwUCtGKoxIzajpqhmIHDFqwcZMXRyNFAoaSSN6jUqSW+GvB/SLpq6qbAvzELpSDqa+Y9aRa5OojFZB8/Zj/ABOoP+MiiBnESdMsw/Ep9Nn09pRuypVQOZOrhUQ251nm/vxLRFC+RVUTftJBrIYWTj0jYsQACsWqw1C3ZGd8y6OrIyTvfrIYW7KpUjciWQde2Nvv5R6cgsVVnPjZT4jtkAcAWN/nEo6lCm0gNx4lr0x0ukpXpj1seeItXBTMb2BrF7/dQCklSWbSoIG0M2SaVj6XiWnVcvYK6RsN4auKZVHbo2FGML2YvIyPlI4dmrismUisEYuB4seI9UpSu9EUd/biCmyWPw1kHgyKbtO5ut+PMtenqK/ijVps529o9VFKzj/jNXzBgythiWO9bfeIHUx0sqUDn2MA+gWGFttDpS+mgVa+KhQDZ9oxpJFhgd4mYlQvadr++YEH8TSmkgZIh0uQyc1VljV3xcr8pXIvPop8RsP+UKdtvSpIHUqlOkKeORDTVbJkAWo7j7x6ncEmgDx5iCjo/wDxwUQEE883KpmbhTe48ce8NVInS1qWZwo7RkYm7BRSlMbGvMzXqktYZdK5/iO61OxWxtk+8OlyLUUg035IPtGKNkahng5wNvrF0lfSWZRsLI9oZ0gg217+nmPpWGpFlipqrIPBla+qB+E1WKzJHRZnH4veVs1wMRtZZlKLV0T6GHR4KcNYZrOLBx4/iX0umqDI1BRpF8Rfiae4Pd7XBndkC2Lh0awqEi1IavEbGmFgkttk+fT5yDf4mhKI3IvM1bpn8QA7eLj1cBPbVt3fRT4lBmUBgB2jukdNXwUYIgPG5/1KHTHR6I0oMm8534/WE9qhlnfJYAHgSaNqSXAUEDIhpDMTYR7rHgS16jltSEaRx/qV0MaMFUgFMVRqC1oAUHSRZB9pmLKuzkXiv3l9JX0ksATjIh0qRSsCLojSdwfHH1jDAvrb4asgyMkBhRbVRzxyZa9AnqAdU69JJAvG23tKno1L1OqB+EQAa3+/vaMh1Y0zlji1OPER1EsmlAoOcX98RlgosNZbYePnK6Vi+igVaPfQoWb8yl0lgCCMX/QkM/U0hNS3zV8/vKKn8Up0yrDBYQ6LGjEg53Jrfi/+5V9unuGrxsp8RMD+IoFAQRerfaQqhhkcjj9odFjS3TS4AsDumg19Q6idKngTMKOl0RpQHk3nfiUMtkhCf2i6C1U2ts+lLAyJs2lSFK7CjUzTqsW7StAWPf2jslGZiOKyZXRWLVaAAJIOSPlNlpjytYseg2mXRV9JLot+nN/f6yhYVSCC0OktENtqN0NwfM0HUdQOnQsCZr02L31KbSSa+W00BYhl0pV0ceY+ixYV1YGzZxia9MBRkEgYyeZmOWBBJ2l6iVrUt7k+p/eK0sWoXiwammfzDubF3Mcl9KUfOZsyn8QcDbeOekWLvFWabxsJQJU6gBYGTIQOPhOFO80C6enYGfX3ldIxoH6hhIyd0X6Qh2OX7bcIQnFebELihACEWYe8ZnCK4rgZ3CK4XAHCK4EwAMVwijM7hcUIAXFCBjUDFCEAIGK4jAAmZsZRMzYxhDNMeo00dpz9RpcNl1GnL1HmnVacfUczSRTHqOdvJxObqNmwfX2M06rDkHE5XcH83qfaaRbH/wCQ7MTZu5y9TqMwIo/PeWzU2SKnL1nxQ+H/AMppDZ9Rjmz5nM3UwAT6S+s4HUY18R+U5GJC2fNk/OaSLR1ydQwN8zldrF4usG9zL6jMynxmj6TByqnSfFkV+so2D9Tqi1zn03J9Zys7AkgM1jzQ9zNeozNQJXIvn4ZgzK9ah3nPaLx5MuBh1mbWz7X6Y9ZznqFOqGBtQPSt7ldZ7Vxsx3HNC95zuxetIpQcjky1H1CCMEsBizmq2nIC9ZS7JsXXjmX1CdbaUNhvh5rmQRg6xQVcAD4fSKpqeozYdGPnB+E5zMGZ3Ygk+Nqzf75m2WoowNjPquM/tMAwCjUE0Nk548yGNNi7dLRpbNVeTf8AUxc6cWQa7fJviX1NIRioOm92rxvMmYHq3V69vEisqoE6QrNRGOM2Jj1Qw6igjm2xtAhh07YEnVeobSRqNgg8jVv2+JFZUfEhwLogZ3mRbqKrKWf2q9RPN8TQBVYKSQas2K+6mbajpsqcY3+GpNZ0gX03pLWPNDzZibUzFwCBwKxC16hGoHWc0v8AP9SGYEOpxqrHoLkJCsVcMpsVXFb3G21AlqO5zXiZ6iwWhQvPriI6tTUpB1ZHNSSCll3AJzcfULEhlJoC8Vg5hpwCwNAbVt6QFsAUIOM+CPMi00NqYlcnjavs5lWzJoCkEirOTJBPIUo1km+PMTaVSwDpP+Q/WSQNcmvEav2hWJFVe2ZDEHqk1q1V7RFSEvJN2T84jNtWsGubOIwdSEUAax6mSt3tgX3ekeLABIOnIOJIIs4BUF6zfrfrxAahmmaxWP5jOo0AVPj2i1K9Fh3nPbnEAMklgMH6SVYq/adQAx43iwwa6F71ECWAoYBz6yKto3w0LNcnMzViD8IMLIYkCje3pzDSKyD2jAA2iAZmvUtgDwdjJa2YCyf0+zGLKimvH1ESkjwVOd+IgdsUoA2RvzcRJ5OeIGlSwDR/yklv+S6vVt4iC1bABYise8lgQ4Fc8Se78OyLzvxAWcf/ANcVFpneobUc5vmFsARZA8eb/aM0KBvbaTkgDtPj2hoMXvRJPIx84jqssMShTbg2c9viRwwJ3z8pJgMQ1g9oGPEs5Xcn3mZ7iK2vN44hZ1bEUdjGAA15G5jaw2oGh4HBhm7YHA28QBvZv9iSZHU7USTx4gWZlrIJG++Yg23w6TyTxE9AXW/kQAvbitpQPBOwkkjUWq7iF6Cd6MAohrBr3jDauKxjMgWR/PpLFKwFHbMALYCrIz+sYLXdHapJ1du3p7R6lYC9/TxDTULLaqjBINhjgH2kk6tQxnf2ivUQV2vaGhqa2GQOa2kqWHxL3XDOo4IIO0B5NjGw49I9Cmu9SkihsDzAl2JBJb3+94gTQ0tZ/cQ1Z/KVPPpF0FWSmkBgSN9zcCa52yIm0lbANHPd4j1gvdXde0NC0btVSxBA9MwYMSKHOZFHSSRzvxvKWzj5XfEfRrXbaj77xAuBRLf3GAqsAL22PiBskA0Qdr8SdaSBS1kkHwaMY1MxYA+dsQXSwGod2/b49Yiw7lJyflYhokWGo2huh6VNDkUCWrn0mIOutI5z6yjYZgFIz8PNSdXIpSy7i5bE0rDH9xKubKkADA8SgSQCp1N+4i1pC7mNHU3G1fZl27Jp0sCRXkyVbb4SjXeeI2KaNSg6fJhqpBsQGIHImik6ACxGn2/WZlgW2B1fTxGuuiSCTd384+jkaNqBGBvkVLU6hnGCL2uZJqYkVjhuAJYAUhQSDWQYtWAXW7LC/nd+vEtbBuiTsc1n1k9zUNSm/hvxKDK/xgajwucQ1cO2Zi1bi9sfeY1YggqbrbapNghlIALfI1cfxKNArOfXmHS8anI80dzmpC6h8SA5MnuDGlIN48ywoPcwNVgDiPo4prsMt0ougRgiMhmxk8ZH98xKToUqQSR9RBWog9mlufSLpUXbadOlrIq6zfp9Y7KYJrkSWC6LWyhzZH6w1AuSR8VDfFbQ6VGqNShWYjT7Z94nDWKHIvGa/mQAy9JmALm7vgZjzqIGALpuKi6XjTpsWFUBggG6zGC4JB1b2eb/AKkoFBVQDZGRXEfdpUWpB2u8iHSpFLr30ttXjPrHZZ9YFY+UkMOoAGB1HYLnHrHZ7xjPyNXvFq5FKxDBlOAD4qbHuGCTxnNTmFuvaDvn15lHUGNLpIIIB3r7qPpWNFJBIIGTt8sSmsUVPw5oEYIkqttqKkCjQA+GMXurAtXP5hHpyAt1GwzFvcVKtymnS1kVfxH5fWIEqdkZWuz6CNtIQlFYg76hx5hpqVipAbHI/wBS+mxCqrEgLXj9ZkWGqznUAK48StPUVCxXUbvUPeV0cjRwcUMAi8Zj6Z1LRA5ANyFJBIHrT3ipSqqhVF2RkEcSbV4pW6i2pLb2RXxX+0F1j/LajxfvJAJVQGU/43eRLGnqKNY7icBfHrKno8Pvcl6o1tVD5SlYqwKkaQD4ImVjU6csODRq49RcCl2NH15ldHI6K1LYJNHN8CZozKTaCyfvj2knWrnSpU2MckESlWzbKQtGlrIHrDo2jWdLLdLnSCMEStXUcgMSw2Nigf8AclSSFKNqajV/mHPzjQ6TsjI3rWBH0uLH4hQppayK1bm/SNSR8TBayM/pJYKVJUEjywGRAsC+qrDAAePEfRY6OixCqrGtNePmDG4ZSBQoHOM1Me8dNyQWN3fzmiFrIAxZ0vuKh0WNem+oEGl3F3VmWrdRcW2c1V38+JmoRGUZFjIqvvEruYKvawPwXyPv+JPRRp09eoWCcUaOT7zUly2uqwOMXMQyOLYdx+ELnHrKvVrG1irxdXDoWNVYA2p2B8VNsEYbULzjacynXWnGRfrNO9WOkUbBA5l9IaoxU5VTm64OJrZChluhuAeZgi21kEAXQraaKbClSCxuvUSeyxpqZgL7x9L/ANzYOxTTpayKvc/KYI2lqGhlP7CaDRVpZTyR+sqeyxqjU1FgCMzZGGmi1VXj9ZzBgzaqDEgc4li1RjV0bh2VjY6gaAuuOZohBw3qAbmK6zdZHDbipqpUKFAqxkeRLntnYuyMNk8m4QBeu2yODCHSf2/bIQhcl5woCFwuAFwiuFyjOEVwuAEIswuAOKFwuAEUcVxKB3igYrgDihCWBCKEACZJjO8gmAJjmZtKJzM3OY4cZO053aadQ4nN1GmkimHVYjM43c1ZPM6eq1ggzi6zkAgmaRTLrMCd5xdRtN40Z4m3Uajg36zk6j70NXvtNZFMeow1WJyv1AForY8V+826hKn4TtsdxOXqknBBv1xiXFMuqQ1Bc19Jx9RyrBV87Cbu2CGI9bO8w6hKCwbOPW/WWqMXcX3Zu6ucXUYE2oDEGx5H3ia9S26hYsDpXI4b0nN1Ooe67tRWJUhseo6uCCaNWA2wE52Naey7zdWBj9pv1AzCwjCgab/H0nJ1GZhRBNbgc+ss0s6ZIuxsefUicjqEXUfO5JJ5/XE3LnUxqkNC9XxDiYsoYnUwc1Zo7/L75lBh02Z1sliCxIPpUjqutAqQPUbfT5y+q7aXXV2i7OAWMxYHppQbX2jvH9SazqP/AKxgfhp5HipnS/iAqq0aPrx+k0JNaVQv4vaZlWQAlHVa+CxYzv8AfmRWVTqGj/66PC1+8llXqHQmUHHG2/vA2Bp0Es3nGPMCSV7mX/yBbeTWVYPasqI2dV0OZYZbJZiS17xkHpnV+bHrfiYgfi9UsWBIWyvDHxfEhnUEgm0VWN45IksysGBq+AdgJRJAN6rWgBiJlPUPb0mAAw3j3ks6gEALa83e+nEAyZI84J/iIkkadLMQO4ecb4iUm9u3Yd28ippadI1c+TmSrMy3bUzkg+ZdBidTKxrNHeT1HYK6kih8tRkkXUZaABF+m0nCi6CrwRwIFT0+mADq7fj2jyNShCf2kmjdtSAVuNwf+oBl0i1IzYWoyCmmwyrW2MesTWRWnubzjFyAGXUQq5A+m28zY6SFXfVsJZJI7iNX5gTvGBo7rs4+cRgaTZJskneZ2CdQF/x5zAX1OpZa6Fld9XpcCTfIIAxJtUDTWuA3rwJI2XtBzeNhiXpLHCMKGG8SF1bEM2M49JFoUCuokA3wZJGlQxAu9zZMam2s/Dt8W8YF7kE1mjEEqSbIJotePaDlQBVe+ag7ELROAN9tRqQbVAAS2Pi/iAAoKcUPIkkKXBWqIvfMecqFJ8QIKjIZB/ia8yQARVBTd4xvHSsaU2vvj3k58Gz5xi5V+SB5s7wND9p0g1naWBZyd73iACi+cetyVtn1FroZHB9IjBzZFMf2gW1Gjvx6RWavN1tcogsbCEeskJ+HT2je/NYjDLeocHEQJNCia39YA0xJ+E433iMyCov1sHc+8lWJU75N3KvUTZBxmjvIYnTROB8rMAbMKAH1uTsNgF8gwI0Ac2PiqG1iiTECxdggesNQG45OIVpGo2PTGIarxWT8oAyAxCqbH6RFjekHc/WMG7BNYrfeNRpF84+cZgMNRskE3vFV/DRPHpGBqfuNmrI8+kWo538CICgRRNe8PzDtBB2rIEem9kahz4xAXsQWPIreIKXRd8w0dt43vOYas4Hacb7iPSCRbBrGaO8ABZHxNTGPqUAtV8toiSBp1Y5O1w06enQN43gDGCVql8j94qUvqFUY77qAJPrHpIIOllB48esQAoYKkGzipelWpR8P6bSaPgkkc4xcrjLKMZs7+kDSSQ2lWze3mbKwOW84/wBRDA1D0/1JX/ke2YagMjg+km1ch/FtR8X/ABKtTYsWPT9YC6ujgYErSWa16Zrz494tXhChRKg54yBLVunkjPix9ZCqSdJBbz643jW7JxRxvuIaeK0UNWLu7PMaM2g5YgnBHtGF1/EQxrNHeDuQpUm1HO2rG0erkWxWhRGOcxGkvAVfSTRXp9vj4gK+UvIGmmb38xa0kAUFwVAo/WMMKyhFtYWoEFRZBXHw4+searSSxznFi5KsOgxCoLrjjbeSe06VOSbocy87FgKwQTuPErSFAN3gfOB4pSu55J3+e3zqSaIJUA+LMFvqdQFmyosjfnaANjntGIdLkO1YFTQbO/7xrgL2A2bHIXEelmN/hsP/AC8YiBJwQzYzjBxF0rGqslkj68nzDSAobfO5yTIBsntAXb4t5YUNdurH0P6Q1chIxZSQWIY4I9pbsigBd73ksSFKlhpAzxqxD/60Gk67Flh+0WnDFKTpUKByP3jIXVa6aI+dQHIClsfzKKlRkMqn8pr6xauAMBZKVk0K3mmlWIVcjxxUhrq9BthgnF5lA9tFgODqb9I9OBiV7ExnbzNFNklid9j59PnFWkagbND1vxJAPU61s+QLPg529IauQGiLADEbAnb1EeoG1J7jsK29YgWYZvtFgSwpdsIw9f8AGGnAMabQHPGQJasmokA42NfWQtmhRYjf/wApaklia7Nvi3h0uGVruqyTYY7n3gjsVJBNMdxvttKC6viYOazR32gzFQV1YrJGLxxFq1s6gAgqM7g4+nMgHRfaFF7jjyf3h3dPpgqdRKk6tvlAH4lC6sQ0waZ+0KQRd5upeoAHsI7iQANzf7SabpiyrIue0nPvKtgptCWOxNixcro8XoDlUT4fH5TiSxKAIpprGP7lBiBpZgODZ3HAlfCga7xvvfj79YulNFYEnXdsTv8AsJHa3wqGIOFPHzi/+3qgswsCyOD6ekASRyKXAxDpWGaOGFHJCn94wfh7AcjbIG8pQznt6Tf+3+P+olDN2nUx3NDcecR6pSlLLbn+fSPTpGvfNgtZPzkqTqJ09u2+4lhdRosrmuDuPEOgOl1GdSwZiGOCPb/Uvqt0wo0+Tsf0rmJnKqV1DTycC8YAkL/x9MFW1WD3VVelSp6VivhYigi+R7byzRe10kH3uK+AC2L9L9pZVlUEo6Lm1NfWHR4tWUWShGTQrJz+2ZelWZVXAXccHEzyAbVizA0TYsTQG1A1hcUbbceIdCxDdh0qaJN4nSpBYl75oH+Jlp0rrBs1734lKW6nXGtgGUEnx7ekOkmWBugCRsCdvnNAwYENV8Df5zNXJGQw0jAE06aF2x0mND4vEXQw1FBToD2RXIG836bdPJrb059JkuojT3MasgD4sektMvhe0it9xFfRNNONZOrOCc34j6ZZrILEMaFHO20YGp8kOayAd/SPUVJAI01k7XH0WNGKhV2xe0VhboBRe4kID00DA67BNjBHpNaO1M0fSbDAVmtQNJvObM2DAG2Ssk1W8x7kW9DKue3+ZoGJyVJZhi8WIdk2w1IlgfpA2BQxnYRBsZYChRzuJpsmoHj6w6LGqHvOobnnb5RCjsAfAPHzkgfidWyw1ZJ+u0pWO3IG0fSLFa/UCEM//wDMmEvtOP264XCKcl5o7hFcUAqEVxwAiuBiJgDihAwAJhcUVwCriMUI1C4RXCAFwhAxgrhcIQBGQxlNM2MDqSZj1GmjGc/UbMqHGTsbnL1mPmbdRhOPrMJrFxl1mq/WcjsA3mbdVrBO4nF1GyRtcvypj1W7azqqzmczEBLDb1NGe6Ci7xc5OppssufAJmsNj1H0tbFsDHrOZyW6ZpdIAszbqMpJ3x97Tm6rBend2W3rcektTDrMTYOfE52Zipo2Nhf02l9RyoIDCziifWYdQgNVXX3+8uKZdZ7W2BNb49pydSuo9F6Wro5mz9QFhqbJ7a8zla36QLAKzAabO1SobLrPR7WJPisTmbqi1ARmIF2VIozXqMqjIUD/ACG5mJRVcDVVZJI5lBl1F6iknDMczA2HJFoSeMX8+D6y+s2otRpRjeqH/UzJDhmJsLjBv7xGCJKuAVsWBjObmBrSyCw+5zuPaVhRR/NgsfGJkGDlR0hr1WLJqvT1/wByazoZURA/4lkkE4z95mIcKQWZioBo1v7madTpqrFgFKsTSSSEZzqNBTsP0xIrKsx+J1Ol2rpAFsGH6SH1E6WXB2NfrNDpXp4N3449P2mRbQxprO2kneTWdB1MtXf09tpDNqUEg+uI3ADAUb3I4P2ZmXXWlsLIoKDeJDKpZFd6LUhyM3jaS9BqVrI4AxmUEbqoC4CFgAtm6Eg6UWtKgbEg5zJTUq6oF7S9C7YHETL1Bd0SRYmmlAdOujfyuQxBBN9oxvVSKiooqSQCp9MH6xhmDUVJXAwLgTrUt8QXkG/vEhaXF1qwWOJKQ35lGGObvf5RBVRNQcaibPJiDa2UdMF9Viyarb7+cGVVsgA+FJk00g6assQoNGt/eA1N07C6MWbj0qxsmtO4H9QtVXeyfupBpKsTTL7EfvGQ10CW4r/UA2hqBzgUTCqYAA+3n7MkgzBlsgmjI0h3Go6RuLN4j1qWXUc7AXxFpPU6dsAhNAajtUmrDHvpWJI4GxkhwpWlJIF2QcfeYdq7gVtcoBQxF53NxBLI43oneA7O4HST4xBiDZBwMewhrDre4UYo/fEQBY6tsYBr6yG3r8x/aFgCvPJxEraiAhLXYs+P5EkHpCgEOL3kg0d2obY/fxBlUZFZ2HrClY5rtO3+oA+5xhdOLN4iyD8NjiPUFWxzJ1AHLDOIGrNEAlhtX6RsbFkXIxqAIPmLUAw1E6jgVJMyoZ8tSnI9oH46DaiDtBbZcgLe2dpOAM1X+UkFqpRYJoWcbSiGBs0TViMBVaick+MSD+g/QQMH0xxiUDRF7bSQdak3dDeT/PMAZOazf7w0gLq1Czk4kg2BpN3i/EbIuT52FxArrcsQI8le1dNZOIwATnYRkBV4J+8QBEAtpIBHtGLrOawP2h8Jb+4MAGqvf1gYJsbE6Tn1iq3HA38w1C11GuIwCy2QE8WdogGxzeYg2wIZqF5G0eAMjxm5QVRWk/WAAVhvRO9RqBV1VnNcxGiSRjNe0pTqzuBAHZDVVjaFZYLeo+fEhaoeuLlKQQNA1XY9ogaooW9QznbMBQIy1DINGPQFa8UdgYdpY2T2nYf1EcNdTrQFckER0xFFQR5MrtC4bMm9Jqxq2AuLV4rNf5DasVK3XINjf1/1ERTgZPJ+sYI1LqfgKB6SVyDSHcG9K7jNyjpBoEkj6SVU9Tp2yhDsLO0rtUVQoc+sF4Stp0YZjvkfDLKuGOAbyBHpUGtVNyTBiGawKA9doGSg3YtT+80UsGHK7Yz6yV7lvVekVd+n9QXt5q+T4iVFHDMg+L6RoqhNWrubO0lWDMB0wXJtdV7Sz0lUkgLnZSeZLSBfiFliBsf7/aNb6nTpV0nc3DtJN2NPA/qMFUTzcWrw9LcranaUAwwCSAKrHttIHYxznaid5Wmm8c1xFp4tmvpmwbEnSOp1B3EKcgbx6ltLauAN4Kh6nTBZQhOBbbQXIo4fD/TaSj6Qo0liBeQcfeY+1LsLXJ5lhFXtvSb5zJ1QCdQcCyLEpcGxg7Y5iLd2MAY8VKVta3eoAbiHS5Dsgg1a7GvrAjJUYc+tSQdJxzjUTxErFmA6QZ9xZO2P1EOjxarSatQvBgpoiy2ne6+/aDdNVbUNOnhblqiM2caDlf8AUWrkC31VAVNB+I3iADE5UEHaVqVENNfpEGCtWqm2q94tORSkjFk8DYem0pjfTNqbU/eZJWmAN2c1wfswDr2lmIPwhd8fZhq8MqHYW2lDsCb2jYgNQYkg4rxJVT1OkNaBOFs7bx9qAihQwW5i05FI4UINLPQs2D2n7uWV6gNmrOQIKiq1aqJ3J2+vMCQxO4ANVgVFqjUEZFqxxjF/OaZ8WMDz6/tM+mwdd9QAwwPp/UYYDIvusaieP+o+lqbLsosOds1iCqoTX+JZNHaSG1Y6XeSSoN1WPPMpumoLMAtbBb5EOlYFamFs2kZuvbf9RK6ZfqJSrosWQYDR1GNmqwR+2JWpV6eGG/0h0ZMrHBUFDtzNFuqBJrAFj22kB/w3ot3VVXv9mpRXuAGDuRwfvEroQ2OpTqB7D9ceY9Opx3UhyM3tJ1r2anIPwgDP3vBUZ+kAyBB8K6jtvcnVtGIDUrZB2Gx9PWJHC6F0lyBZtT2/eYiAgIpaG7c+s0/DQGi1MTuf7laoMvU1agFLbqN4lsNYtW8jc+5g5DE1gKfO0fT7lu9QUYN/fENDRWYEYsfDYz+28L7mQCnN81iQpHxAEarGr0/6jRtRUdEFjldV0BjzyIdKWiIvS1jqdxo7ZgtL1BbPS81f1gemobUAucBT5lqqM+fy7qP6h0aumX6nT7U0H4jY+7lAMMFLTg7wDKnTsG79NhGGKGi1NVAWM/Zj0VfTsGhZAwLIHpt9Mx//AOeQe059cRMtMoN5yQNj94gGHbqetloZxfj5w1NaEDqOo1UhyM3tLICkgPZsUAMGQql+lTgJwuo/DKpemuy4wW59ZNoUjhUVdJc7mwcTYBwbAFkYF/KZr01BALZO5O31ltRftFAc4xF0laagAwtW2xufnNFLBrqwO01m7mfT/wCRcHUqjBv0jQ0QVvN93gQ6DSxrZVBVjsbqPpqB0w2sajnbMzVg1Dp25FjVwuJpoUMSCoG2m+Y+0rBGqyzgDmr+s16bN1FoIEJ7jczADtRWq3A/qWNKJq1e/mLssad1AaLG/pNEsACzQ4Nft9Jih0c0dqJ9ptsVBvz6GHaV50GwRp3+kfxuO7Sp8m9pIZVILMRmo0UlCWUKNhDpNjWwP/8AS/lCZaCMUDCPpOP3CELhc7Z5gQhcLgBcLiuKGKOELiuGBVxXFcLjAhC4rgDhcVwjAhCK4A4rgdooAGKOSYAEzJjmUZmxjUl2nM7ZmnUbE5nbM0hseo284+qcETfqHJnJ1mwTLi4wds0fecnUN1fn9Zr1G4/NOXqOf1xNPKmfUbuIUem84+qQrcg3d+Jr1CNVAdu5nN1W1UTQxgzWRTDqsGWgQ2ORObraV7v8aoEfxNXo3e+285eqVVTgit7O8tTNyussy6z/ACOJz9SjTbEiwKODvL6hILgYUYJnO3VJyppbAlKZsyp20Cb4M5+sQ3TU6e0Vm9xL6jAjV/jttYPic5IX8vxDPGoSoGZdFBIcrvS6c+/6Tl31gDLCwwXi/wDU26hAA0E6WrGqs8iYOoA2LDyDx6ywx6ulQ3TXSAx+KsGSh6bdgGgkXfAzUfUYUxFsVAHxTF7DjULdqAq4qVDqNKWMKb7hWeZAZWZtK3g4B4lt1bYhvJAzz4nMVXUAoFCyQNrkMvR9QKvVs2Dd7XpH3+8y6hQoArawF5G9Xt6zVirgWax2G9/SZ0HLE5Pgt91JrKp6qoQHraqXTn/qQSpcuwv05FcRsAq2bA5F7iR1LLMq4AFEk7+dpFRVHTqR1Yi81RwamR0odIAy3H6wVyBYHbdWZPU0kBqI07bagb2Eis6p11dNTVUAbviZWigHUV3pa39vpGoCrWnJvB/MJLFasEkNwD+klNQm7ChkXqC8RNQ19MacnJrEegGqtr5B3iJAVjRYrjfPpIQalL01o51cDiQwFCx8J2I5kscjUCXNAVf3vK12TqFm6GZNSSsMhV8ipLBV6lkVm7q9OItIGlVUYyQNgYWpQZ4wb+/MmgmYMAFYMK8eP5g6itRAxVCswPcMmyMUTJIK5o148j6SFjB6hJA9qyJRpir/AD+chgfxGUbDBP8AUNdC1BC3UQHahqhk8RsFKCxYHPpIZlIBs4OPIPiC4Hw7g48yaAHUbErvQrMFyp9RYIHEXbXax7txcCtcXXIMkJrJQc7tWJalaK1XN+JJwDuSuN5LEg86jiIHS0vodj5grAt8PkDPEWvORm5B04AW+aG0RrbSri97va6+/wCZLsCNKtYA2qFhhtuO0wCgsMk1wTEZsoZbIFCqFRYLWw9PaI9oyDjG+8DhiKxVXEFdrURzn2MQ0qcjcxBqWwcDECVIsjb12MRm1FB4kagBhtO9Co1J8bj6yTQGCaNXmIDctW5F2BEaFqCM8jaNgB6+okE70L43iNYK/DVXClKgeD+sizvyaErXZz5wb5gApGo0PP0gaDA1Ru/aSADsMeOJWDj0xAEa2U6q9JRAIJIquJNDURZJvYniHw5INbZ5EAeNRJAP7iVhqN4/mQb1EAYqNW/xFC6zEDUKrVpGTctgNOBihI1AgGsi/cGNKVTjJH1gDVlU76d8VvBMgnckb1FYoUTnBzHpxVaq5B+/EQPAtVoXuRtKXSDRFc+0k4VuSMVcNPcL3OBAKKgoL4N7cykK3gb3WYau+m4Ne0mrOkD3HAMR4ugvUvm79hEWsUDfiO1IAPjB2gFsnNnGLiVFMq6dTDaqFZhgtbAG8eoiChVuiK9dxGR3FVGKon+olLSn0sCR6VsY+1LNDJ3uSrUtrhbq4zparG3rkGS0iyNXTGDtv5grLnu05NCt/WJe38tlt/WGKsMabcXsYLwKLDEDVY3AlHStjHq3ENIUYGr2MCAFbBNCt/lEeL6ZQdoGn14FRlQQLGxvIrMzwWGrJIoVNQxvO4NCJchqy66A8jeJgB1QSOb2uh9/vJAF6QPUji5pasFs1jB/iSqROoGgGBHOPv7qVSlCxAoAUKz8oINRybrYFt4wtcMON95LSQxWoswH9TQU2llFewkFTrIUVQoniAfttLC2BcFYalUN1ZLA/wBzSg3TGDtvvM20sbqgPO4MfTAGSKLX84lRSsqjBKizQqrh08g2t2LsCLGm1NWMi5WgZItvYyVyGAAzotZ3asS0KXorT6jYVIoANuxUeYHBF5Y4FQXGmldjwbojmPpsA/avkYPpDUbIbzjMjSCwULfJUeZJ4rAfIySDtdCDUQAHugTtvmPtNBuRgg17D9YBQzfHfu0enIbKujXWFAoaf4jpWe3zxXIiC15FY33H2JRsPSjFb8bSbVxoCrBHBrVxX3UBpQ5AJu/nzIRtKkqaAIGY2KNuNvqD6RatZQP0RSmgKu/Bh0z012Ypk0K39YumNJBIFsDg8+kXbptDQ57vv/uHRn0xd4ssuCF4l4UMqkZq2A7YtHIBPsf3jpQpwWKiqviM4rp6cLWny2aFSmUFdJ4N5FZEz+ELfxHA+/ea/iEEh7FGvnBUhoylzSjkYP34iKr+JRWixBwMKJOkAhQvqQNrljS6gNixhrrPAgomIZVVX1b8b5/3Gypp1nAUCgVF/KMdzZa/A1RKouwrLxk1YgeKBDvbgEbVWRNVpyr7WdqO8zN/iUgApd+NvSC9TSCUHYCBm4acX2o2QLJv5yyuro0RgbG+AZDFGFkHB9DRh0jzXc178+keri0ZBkNo7jWN/WHTIctQJ1DBC8REqACpNEdwv7/7jKgWVBce/wC8eqVpVdSKy5q2AxH0vw7C6dJ5ajQqTjS3JQAAXmBYgqWHc2ABfmK02jKumjsDZsVmWpU9TC+QKJ+f7SPxDdPgggAg7SQo+BVG5JVaoGGhqwQPkEMSDW9ff8xsysFVH17mq+8xdrBQ3HwtdfL9ZSjVu2o4qzDQoqh6eo0FUClrMvtfqamF8UNxIRQi/CwHuciaUfxNKgChveNoug1tW0Plb4omvuoKVQtgEsQZmvUCoShIUELGWRzkYU+lgxdFY2NN0wK22PkA/wCodN01fGVzjG+P9yOkKN6RbXvz6SwVolWrUMi+fv8AWPoldI9/nUNwsvC6kBWjVsBiSVANgMw3wf3lUoVjuQNrzI6LGvS/DA0gabFnwK+zKZFF2NiTtWfnMroDUbJwJsGrDiiDjMXRr6bIrYHkUCfn+0ehdeQbJB81MgNVJpzuRxNAVYAHCgYP8bxz1EWKNMAAwN3+WXQZQxqgBQIyfaSo1Nk/ImUoo5sfOrELSWKZ7YXfFZHM2FMoaqs+NvuplRD0oAx8pSPQJUkLtcWk0UqBtRYgzYKG6QCqcTAsjA2MA5vNGadM2dQUWfPPpC+iUAvv/wDjCIKv+REIu0/p+2XC4rhc9A8odwuK4XAC4XFccaxCEUAcIrjgCuEIXACF4hEYARxRXAGYrhEYKMmTcDJjBMczJjmaGc/UapRxHUM5eo016rTl6jYmkVGHUY+cfzOPqEkHxOjq4Hr+84nbfOZcXHO7DVZ28zkfS17716zo6xBWgL9fM5GpUuyW323msUz6g/DStl2ucnUYgd1E/XM1dyyhr43qcjgUdODv85amLk6wAACOQOfM5+qGYb913ZJ/Wav8VNuBntzOVsL2k6f39JcUy6ysCDzvU5+pp00bDkjbb5zods2e8nIHrzU43UN1O40u9ERmhun3NQJNn6+nymHUZtYINBRRDHIlv1NLhFzfJHxTmamADd3OB8OP+5Zo65G4Ve3cnz5mHeiqAQqLuBgX59f9S+pqW8HRni6PrMWUNo0g3XaFFCqlBkem1twnrdiZKMAECifiabWwdlsljR4+xI6ncB+Etqchv39t4qzrLSrFqPUIL4q9V1B0KL+aiK1Db5+dowqr071Fmsk0N8b54mev8TpjqNQFeN/SpmzqbYAfiVjcDPdvcxohlHYGXkcN5oTUA7qKN7kYuZn4+8d4H+Od/wDqTWVT1FZ1y1vfJJqZ9RGDqfzHJHHmWQdB0k6flnMZNtbHWTkA0PQ+28is6wZV0gEFW1DbbfmA6dlit3nfk+gjKanUkUm9EcefSSOoR1Qg7tV/EN8/oJFRU2/4lg9qjIY59DJagL0qSMm+TGwDCib2Pw7YksGS/wDEZIq/rEmpQOAgBpARY4vzJPSYkk1X639mMKKStQ8CqBxH36iCTdAj3/iQhkqckdt7niGlW1EBjbY/yupb9yjQLvYnnz7byNITp2Gs74G4qRUhlKJVGqq/v2kgnbqEMRkjfPmGoOgdqANn4f0qSAACydpu7OxMmmRU6wKWxzWx81GyErk915JJgAS4B3rxJUaU7dWmtr39JCgyMGUnk5HECE0UwIJIwNvnL1WwJOonYVVmQRb5NL4qIDR3Mw8kbcxEtr9AKN7jwfXmGrv0ju1eRvmIgH4u4b7bSQGFC+01k3yZKghaulvIHnzKOqjyo3xzJKCkIBwMYq8RAaWsj8v7fdyAPIxd2ZY1ajZNn9/4iainaLG91JppoEMRqrVW2bqOiqbnxEFATeyc1XEWrWgc+PH8SQdNVPnyB58yfzAHTqXb381KC5tTTbk7RV3U3xAZxEamDEUTm83IZTqF4J3hRCkD4cn3hZ1ajm9hW5iCSF05wSRt/MrTuaN/pFWptqU5yIHqd4UC7vcesDGQwrjzIN74Nb45hgnSTqF3tAWt8jxEAARQugDn3iVTq4qKh2+m0rNmjZ4gaQuaIJEKUliL3+cZArtFg5vzAaQl3n98QA0lVvJ4iANU9GK9S6tx5qVpOSuDf6xAiCCKC2P3lUWXOT5JuKiWyM14jUdpo2v75gC0nB58cSqXTRBBsVUr4jZNncCuZIW2AOF3qoga9MFjW/6RktrG9KOTDVThRz6esVC6bPy2gFbZpTWT7xrqCgA4vPHzgQ1+kFXCfpwDiI4YTe9v1iAyLuvJ/mV3aqvPEo7DQL9a+sFRK6TZBbevW6l1oWgDVVf3vEqgJZNtvgbioBtaBj243qLTAvGujWTzAKQapbHPrGAfiArn0MACSuod1eJJqKuy5PdZybiKta3ljxxKVe3FkEy9snJO3vEtGldOQQbG38zRU7sXYsehMgLq6lnA3qperS4QZ1bEjeJpFd4IN4XBveSa+LtNZN8mG4ANkb0BtK0spO1AWQPMSpC6atpABAW8gYz5jHTNm6I+dwAFIwvyKFSwW1EWSSMf16RKQicUCL3MoKp11qyfGbqVuLUXfP3tGgXQDr7jnA3FesSpBp0CskHF3+/mNbvvyNyPXzJDfiLqJAGc185WkUWXDb+klpIVHVspYfufSaaW00TZvc37XEqsHAcd1eP2gi0tLemze2cyVQ2VqB53rgwIX8OiCpsbfzL33N3sPJk6SWO4U5qoLw/w/wDkPO/tcollfwBuCcxF6YKpvUTmvWFDAbuG+20Qh1QsaSRk+pjRXoD4VvIB3PmOmDV+XcioBVCIQNsihQOImkWOm1kD4Rn5yApG62t3beJahtRWzdfr/EZytIL5utz/ABEuFpRwxAarHBuXpKLsc4J/uSqKqWXOo+B8Qr1jL611kqPl89ojoGrSB1KOM+/mGltWy2LPz4xDSe5lw25NStJHUAYd1f4fWoaqRTKxFFra9yT9ZLKbW8Mc42j09raS2jPjM0HxaiSb2FYJkqkZkKOn3Ag3x/M1Xpg9RiL1X8ifaQU1OLFL7ZlfiaOoApsMTmvXiIzJcMALpBnUc+8DwxCmviwMwA/KwtdyK2jphgbbn0godMMOmqqQFvuANWfMpemSzG6Tc7/WSNJVCB6rQofrLXWWKknURj349o+jkSoIJNal1bt9JYVDqosRYBsEm491Ggar/NW5jTphUsvqJ9NxX0i6XIrT+GtjVVUSD+/mFnTXUo4s1z4kaj1F1GgBYBr+IwoyVGlt7k9KwBTryqFlN48+aE0PTZlOoln1HJvHFyKJenHfR/LGiUp0k6ck5HmHSsDdNhpLHuNWBtcZCfhMGDKSRQHvzNQwsFu4mqFYLSCmts9qb1W/8x6MWnTtiRZN1VYJ9ozrVxWyjuDHPv8AWIt+H1lVDeokAkevH9yaDUrD3Gnav+otXItjsdIbTliQMxprAAsBbGoA1e+bi0urbWuSRV5P8QVVKoeN1oUD9YarGi9NtbEZXJzfneQExwVvdqxLXUXrUbbbb6DxKPcg0DUTzW5hPRoUdNy5/wCTTYvBJv0moRumt91fDd/v5k9NUXpks5Zj4GWwfu4x1D1E1g6RRzXjO0NCl1Ff+Qg4z6+DGy9+yWM4G54NDaSF1FmWgSb1VQ9JWdQHUW3z+X9pPQa6Oo4IZtT6visn5wPSals05rA2kqoolAdObN75mwazZ772FYvxDoJKoUbVaknYfzNF6IPUNAsb8YPt5kkamB2X2z6/9y2f8PqhUb4yRZHqdouiqgXD7ml3BOa8/WM0BdK1Za6+UgLZAaiGzpA2mn4bLkZWrIGZPZGiuFADUPzAHDHOZoOkS5ONObvf3mYVSi0Tv20KBmihroubYf8AQ9IdEFUbVY5JmiKhvLUKuxZgaIGkFvWtzK6aqFBZyWP+I3wfu5PR40CFVsE+pv8AeNNVV1CCOfX7xMw56gyQB7SgLJYYN3fEOkKAOrOkkWfsTUh2vU/dd2f3+/MzW7AcW+eJa2MKTpzf1j6SvQdCk74wNpZCaDqsN4H8xKc2TfgVz4hXyH/r9/WK+ibIndjJv5Swzar2rcE5+7mZcKwAF2SL/qOgRRPrpqOektbX0hJ7vKiENGP2q4XC4XPTvKi4XC4XACFwuFwAuELhcALiuFiFwM+YVJuLMDVCK4QAuEVwuAVF5hzETGZSWOYyZDHMYQxmDnBmjHM53OJcOMeqwO05OowG826rEE1OTqsSMy4tz9Q35zOTqONZ2+c26hYtlj4E5f8A5DCzjYViarYu9sbHoKE5er3E5FtNep8FfEJyub3FVtXP1lyGx6zahqPtOR3DNbXk1Oh2tSSCR68GcnU6jZ6dCxUtTF2RioUEY53nN1lXT3Zs7E3n5Tbqa80WtsEjYzDSoSiCwqs5lqYuTR06L51THrMGTHaPbx4ltp13RVqnO7UaKWSRzkiXFM3tboag406QNgJydYhWZBqs0CDNnOCik2QCDxfj2mPUd+n3hQQANWOTGGLt0hkhy+QDeAfWZadXdqPd+XUBmX1D1HBLVTH4V9v9TDSzsrMz4GkWRtfMKSQUUlsXfcfXmL8QazqVa2GkZl9UIMaKFUdPPp9ZkVCrpXI3r7+knWdDoXZjYBb02BO0x6pLoXYEUAARLLA93cN6o7+mZkTqLEjBB34MhnU2rMSxaia33kHQyoF1DHJsg3zLL9T/AOrSFKzNg4ewWLNYJGx8yKypdVV0AtmzsTeflJLEIQoTAo2NpSIq9MmiwrSLzI7S/wAJ1b7SUU2Knpafh/1wJGnQW00Qy6aA2+sd4AIOpvXcf9SCQE0rqzkHi/ElFZdWgSg1ZoUSYqQNZ1E5zeL9ZbMU7gowBqkPqJsmhwok1FSo1KNwPeqMkUtkFb5PrGFLMCxfbSL8esOoFHaensM15kVA1V1KYDO2kZklSzNkamH78SqpaXbepN33dwraj+kki6gLjUQcCrkLTktkqTWeY9yTVgbgnmL8R9P4dAEbyKZEowAUMPc2bidVoWdXubzA6tWGbUbB2IMaIoTJ1cdxkmRJohQvijxGWBXHzPtwPvmTQJuiGq/nCzYtTbbZ3EQLSVJC/CwqgJBwxXNbVKY4ru87YB8STaHVQwO75yDUuhSCbJyLJx85IUtmyFPrUZLMMnB4+UmiSLLbVnxEQXTn03MdkvkDPjeD6QKrjNCIgBccyVEy6tiM7YgbKajeMXDHxZHz8cSTd2RiufMQK9Rs7XGdJFLYscwZnHYePWIhuSbOCRtJMmTFtZHvzHfbivnBQAlVqxVGKhe1HeIGzal9K8SfhGwIIrAiF3RF3Bm7dIsX+npAEcMVAriolK6s6jeLvELIAYDjMWWJN78QAwVwasZF1AbWavkyRvdtsRctvFe8DAuzYGRWI2UEySMADPJlXuxx4r9oAiAVsg4FXAU3nOIznNGufeGpq0Gu0byQCdVKAR77xsAFs5Hg+flF3XYJs88GUqjSdRLAYzmAOyooaT7yrBHPyEVKSLGYZGCDZrmBgLpugO4VE4I7TfAqOgO3u7voPSOylMBsMwAULeQxO13Gq+9HgY++Iu5hfB4qMA7lmoChcQkACgmqJPM0UjV3AeMDMRVQaC1QzXmOgFwL8ya0goMTRpjtDTqBY8CrgDYLCx8/0h8XdVjn0MR4Fotz495XaVVV1fM2bi1NlKyIUwzZJNgniJUimACjUcE7XvKBIQ0FvwZKdNQmSSNsywoLCxRiVIdgpjFDOJSjRtR1CqqLbcdzc36x126e6z9AfETSRLUtqL4FXLGhXGrUTtd/vC2Xv07DPzgdTXdAH8o+/SSoKuqjkX6198QUDJxY3PyhpJIJL0AQPaaOqjGnAGYGFbvo1R8DMenU2/cfHEWnswCbyRKU2LsgDY344ktIGWxZvA02IgwZ7YmrA3jvUSaNEZBO0FbqBfw6FiJch0pIVQV98m42UaRZu/Ob+kNLhsXqNi9x94ldPpoqck7C5OrkAJC0oX2PAlAg9P5Zx6QCqfykGswODlbJ2zvmGnh0yHt2K1QERUJaZyAKzHjTpts/RT4jBI7wAaW2+cSpAg6akEhidgbwI1XUN6U+tZ+6jJdwSdjxzFpJHcXpe0C+JK5AunU2QM5JxNQ1t3KKqhQzEyoMFcVmhGqjTgEg5IgqAqGYmxqI3qvSNgSLYGgKsQWiLoijuD44+sPi7ip08g8GLVYlaZtTXpOLveUdDaQisvvk3Hr6g/4gotefERDqbDEsQRYOPH8RHIo9NQltkE7E37bStRC0oT2MOioVKYahVd0ahSwJBU1v5krisMgX4cZxWw+/rGqlMiqOAv6yCTeQSWxdna/6lWK0d2f0O1QORLUg00bNCpS6FcFg7NterG3MdsgDhRYGfnDvddRwrbLEvB0wGyb0sci64/6j7FY7Eg0x8SACAGYuFUEDbabsqjtKA0KPrUVMB6emC6aoaRmMj8Rt1sjxtxEFGgAAkHJHyjBDZIK0dwc44+slUNlJW2HwjRYiUjqPZ1AbbwvU5ZlNVkHiNW6o/wCIquoAZgsX02CKFYb/ABGyDcplUINRxdUTdnjbaIh1bUNWs4xt94ldLpqE7gXFVnMRkppSFVb8HM0sN0RxjOMCh/3IAQkYINXtLLUQCtscbnz6fOPTkCqyDUtFSK01JchDo7gcAiV+TQCRqyfCnxC26dPpGpR3H3i1UUo6aspYOx2y2LrmHTAbIsKd8gfv8oHX1Bq2B/KJGliQWZwEBAyPnDVLUAMbqwaJM2U/8luF0kcDu4/WS4Rcfh4ApqgotRoJIOSp9tpOmvTrZiSNZHiq8+xjZS4s7INOoe8lc9xtQp3vxx9ZS5fUQSB8QPmLokoQzajZHwk3vNB+EQqqrLfk2QYlfqL/AMOkAgZqMh1bUC2vIviT0FsqlLJsXVWDfjaaK2mwoQ+hHrJ6XSRenm3AFDUb9oKELUQQav8A1F0TbWHRRdWADj0lLadygEVpAr5yBhtiS2Ab3F/9yrAXSL7vop2qLoJJCHQL2Ar/AHNF0A51Fhi7wMcyVLKNYAsDu+c0Bbqd1jT45i6I+mofIJUGsXXH/UagaztezE4k6W7bLUoIG1+s2KopC6B4NSegpTT5C0RihmVp1sbK6q3I2kKo0CrN5YV6bGWps2bAHj9vrFfRLILJkXoGmxDUHYlsDAgCC5YglQDqWUrdQD8IAagN4uiUChACqRvubzKKALbG+Mm5I12CCdXkbS+koC5OqhWTCek2KUmsBb9ZqGV+lW2N+PveZKoY5UggXLHaaOScDJ8/9x9E1U6e4VVVpg4K2ufaThTpyNW/pLBKgEAWLuKeyV2cs0ItTtkaYQ7J+03C4rhc9i8mdwuK4XAHcLiuFwPDuFxXC4DDhULhGBFccIAXC4RGAOK4oQB3JJjkmNREzNjmUZmxzGEO2Jyu03Zpy9Rt5pFRh1GKr6Ti6jbmwJ0dRiwvacfUZhYszSLjB+qbsZHE4uqx0sxrVxmb9Rm1XW/ic3VJ1ajdHzLkW52LBSQADe4nK7HFV49Js7ncNiqG1Tn6hzyfN8TRTBgS419xW6G05+qScMAQDkmX1HN0RZMx6zMCGBNDO+0uKYN1CuQ3c2d5z9Z3YhCQKob/AH65mnWd2JHcbxtWZg7MyMArWRg7kyoph1NTdTStFbHOZl1B302F5zK6hINA0awOTM9doFZyNIrjOOZQYV1bFHSBg197TIoOh0U09MHg3WTL6xbWDprOcbTLVaGxRAwQdyIG52FsbIU7nF4HpEOs1llKlQMDf9IF+otrqYZJoDJJvY8SQWFmnNjNYFwqWTWEdiVBBxkxFXHTYtQa9xLYvrL0QD6Gvl/cy/E/DbUragBXFb3IZ+ksGpCoF3WfElekS6/ij8QpqI/qauuN2YDFt4nOGcEBlBJvAk1nSYln0sgABIY/P0kFtCWGBdhY9JfUsEMt0M4Iwc5mbF3JUkm7FVX2cyGVSzOQq4xV5+7kPbdQqmmhRq9po2t1ICtbAUd8/wATJmINA5zprxJRTe/xc2ByPEzUdQgUQqg0a5/1NFNoFJOBR2zMuoG1A6QLNkePvMhFGkdHppXTB83WZnpzbUp9PAlq2qwcNVA3vIL9Qdo1e1ZJPr97Saml+KSxYEaQMf6mTElSxIu+3Jl6m+IKTY4NC/MR1M2qq+UlFNUfQ1jPkTI2SukC7qWHKtqU2oGL2jaqwxPFmSTMdE6wOqNZW6EGtjpPTUC8mIalOllyeI+oSKZCe3wRgyDSWKiwctn1H3vE+onTan2MO5iV7j8qzfrzmDM7DSFYWKvc3JBMCeppWioyY2FdTIoeniLUQa2OarmNWJQKScYPr7xWhkoewRVA1jmMKOii0v1gwIIwK5gptKI0mvO8kyolrNA748CGs2SGXSNv+oW6qRqPr7+/EkWuaJsZrEREfgJYi7xmUqsFYlRfNRdzPrr+Iair2CSKxt5kVRNqFFQCT93BemSw1d1WZTUeSQPPiZAsB5yRiIG3cSpAwcmBYr+bLZgxIOpSa39jJYsWqyb9KkmZYnGJDXZAoqNx4jJJFUcjf1iJ9eMeYgbDvrPiSAxNggUcylLaQCSKkODruvWMzC6EWh/uLb/qNWsEHtNRBmAIzj9YA9R4IxFZIJsWMiIEk3k2K33lCydVSQYBo6lF+niLIIoZ2jViDYylfKVWKBJ8+kAlemSw/E7q44j5IIFXRP6xKCNxZJ2jO+pdh4PMAMLkML3FxnVQGIiWZqyflUqyw06W/eAFMXOmiBViWVIcCqHMnPn2lqSAAxoj9YGgBrxSgGpQT8NFIQfPmNgeRzkVHd/lq7AzAJAO4oGWrtuCKA2kjVZ3+m/9Sl1b0dqu5FXIQwrE/KjLCNpJIAb0ipi2rzxWIwSGsHHyqSuCjQ5NwHSLEfidxWzX8TRqIwb4zMhqU0RbEwVi8sSpVSL3j+GzeWyIFcKRY5xwYzqY0bPyrP8AcRyCzoC2OOfu4EFuoQNJG5BPMZ1MNNEaufX0hgVePHtEqRppOsfQ5gquao0oNWPvaCE6ACSNIriNlYflzeZOtJAnTXp9NaS78+v/AHCjZshWzGjWpBFGsG4W4FW2/wBf6iaYYck6gVoDAvEkmwz2MEVmMFskAnFfP1j7mOrSRz6esDxaK+kkju9IgD2kUTfMSsVfUpxR9prx2kn1MlUiE6JbqD8Ua9NmvpiU2rKlFwaJiQlTRXJNYNSmJuwTQzvdGTVwtWMEW23pLfVpC2L5N/dxUznk8bV9mUS5WgGsj4tzcS5EkHUVUgruRNCCOoAdtsQsiv0jVjoGo1poHbPvBWJReoSNJAUGsHf/AFLVB0ukulPG/wC36yWDBhgUD7S1yNJGnes1JpxP5rsBuJa9Vg3bpCjYcRanUkajve2/9RpqBsgkkVvz6xNJCvtZ2IFVzNOmH0EkCzuRJ72bXRGPEatpa1NgA4xUDkABpStFr/SUOiSw/F7itn09pd2CLLep4EgFxgrm+P8AqSszZJQotXR+/pGraRYIzt6QOqlZboZoEbxanZqYtnG1fZiORbM7KqgrdD/fvEwb8TSukjkXnxGWdl0hWuq1bm/SO6OTprIiVhsD+IBVCPpr1MFaVVYZEOmSVAYkEYO3zuDqwZaF+fMFSGEXo/8AxxoQHOdWd+ItOckIx/aWjalIK+c3EG6i6gS2ckVdk/tJVhq7FsFdK3i/ltFlldyRiqNmCFxkK5sVg7n1lWzHXprAxVAH75i0K6fTbQWYLZr4ZKhgqsO5r88RglG1KcAH2uaUCDps1yeB8olxI6J6jD8XuKkmuBxUbWWZSq0D3H7+UlCwfIDGztt+0ttR0sl1vQIwRFqgGCCwwF7XiDs7KFtSfQ+f3gWdmINsLo2KF/PmV3sujQ9kVq3NwNJBPUKJpKiiR64E0ZTrUDA8Xiv+pAUggGl5HmadI10wrtVVe30MRp6a9S7Q6VUjI+9pQ6a9Hogr0xk2bzd8frEyMANI2Ox395SNeCK3o6uYlEBkg0hPgcDaaL1G1WpXSua9faSG6q4Jbezjf+oJrG4c3g0a+sSgtlXZjVVWT7zTpo+gsygk1tW0m3ZtZGa2qh7SgSp1q1gA8irk0wAdKEUXuj7efrLHRZmVet36SaHGwx7S2pwaJI2zx9JkrOrdyjJO36ce0nSWbsoemu9E+m9ftKBC5Bu9vT5/fEGBoFQQFyVBGCIy7uaNt5sUD/uTaSiXKKhok538n9d42V/xSqBWAyRefEYPUZNGlySK1bm/SNbWgceJPRtHRg6ge24jRepsjBVBGfT+odJiOmqmxprx+sCrCiFyN73qLoLVB0uiCEDebzvxHwbpDt8uILTA327gG6+Uat1F7Tq8nG/9SekqXrZww0gYF4+kasaZ2YY2z84unqGSGyKNGrPrLOvqPqC1jxgSegrpK+ksyqSa2+/u4wG3sFr+ok9M/CwN0D4Im5NiwS1b+kV9JJOizOo6hvSSQJbA2y6Vrnb78SFLAVo/N5r74mhJq1GORYwYugeFWwQb2z/MZ6jFAuLrOfWSXckAknzjf/c0XVpIIbIq9zcXSTYW2lNJrcX7TWiHFgDirmQDAgHBG006ZYLpYkV7frHPZGisQNBqjuMzVUCdMFV9Tq/aZnVsoGDzvNOnWQccXcV9EKJ4X6QjvqDz+kIdJfs9wuKE928odwuKEAdwuKESjuFxQgFRRQgWHFC4XAYIGKEoxCEVwCrkEx3JJgEtiZMcy2OJm8cEc/UbE5eo2Jv1GnL1GpTNGsc7tZo8zi6xsbgg/tN+q1Yq/ecfUbFWL9Zr5VGPVYMAT8R8Tj6rWrA785m/UOkLjG85m6iUSAb4M0i3L1GJa6wDsZz9RjqOM3tzU36uFuxd3mcp6hYbnff0lKjF9rYHA/8A1mDtZwRqIz6jE26zjBB354+n0nH1epoJoaFvceJamWujnTpOSfT+Zh1MdPANHlh6bzRtP4lqBRAM52Yafh32WpUNl1GH4zGgdRoC7E5n1hASATqstwM8zp6ml2CrlBeLwcTl6jEMqKebqMM21MKzQsar48TJtCsEsra2RVH3+U3DCyXN6iav+PnORirZUBmBx5Xn+oBL2wAJU4xv8NSdS9Si96yb7c48n9Y3KsGBI18WNhcz2030wxOfIXAhU1m/wupwTRIBo8zNj+IylR23keZ0h+lkgGxgGs+pEwZSoHUO+97/AGZFZVGpg57SCDtsak6ManFADAHA8HxLRmZcsxBbBHOIuqyUtML88fSTWdZg/mVgSRzyvmZq1YOjQ2Sb48xilsUEXgjiSa19mnYHm+P0kIqX0hLAOSctUzdgesTVlzjkGahk0gfh8kha9f8Acl1DGh8I42G2/vIZ1idX4d1Z1b3iA1E1WBfd6Rk069NSN9hzK1DOo73X+vnJRUEKjaLrFkHf3mbajpBKm9t8io/iyoBIOL3ETFWtTpscNsBcikklXyfjOaXOPWQzYcGgTVgYxmUKAXsvkc6cRgpRas3g+ZKGfxlWApbyPOJLag5pc6qrmpZXSNR3uwbOf9yVZmGWaidxziJJaaywqhsBt6QHw2rA2PquMynK4FjP0+nzkfAKA0qfHipFNIaviClTn5eYmK6bF0T+YCM6ddgLWNt4rAAtKySBUmhLN/yE1ZbbMnu02QS2q7vG81IVhS7D6bbzM9pCqebqRQFB+VYb0h2ggXxZl6gxJJu73xMiwNkCzePI9pNp4DqJUWM7e1QsdQix3HNLAkNYsavHiIWNNpf7DEnQTEaT8rERa2GkUL+srUmTn0MnTpAJNnycyTS5bUxAog7RerWABgQ1Eg5NE2DfpGzAHf58RAajYCmz+4kA9wLFaPMPSqA8RGtdgRKB2ujXqIE0xNE3VQxVaedqgVBbBxvXygEZ02Rm7uVttt59IG1pR52lJVGzvAEAFIXexnEDfbVHx7QwTxfB9YEhibOeBEFLTb7+BnED+YfUcwH5cfpdCPto/wBZgaRZAoY5+/nKs6jirO3kQ0Y1GvNmNDq/Mcnf5QBhSQCw2G3iGaBU2xz7iNiABR+m0QGaFKPTxUDC7i9Ok83xGdIQlbo8kRUNViqr5xggDK1vQqABIPUznVAjtY5Ju5elSQBWkZ9CKiYkKFBrO3mSYFnG3g+kqgrKMgVZEpSCTfJxcgVWACeAeItPD7iFBIN7e0pafBB1HgfzA6SpBq/aGVrt3PuBJXIG+Fl21euaivWBp2vMsaCSa+f7xhAqhubvMS0W2tjRu9uZoq5FjAG3pEhLA5amP8bS2C4N0ff+IGS500cn9RF8JzpIbc3xKwFutK3/ABAqGbt07fOSqQHSAaBonOoVAkfiVvqr2lAqB8FGzihK0h20g4H0MTSRFNpJIs3d8DP9y1uyBtw3FSWJUhVPOw/mbLRY6uSau/0kqkSqqpoXtkER5oCwwPw3e0k79osjbyJQKsCCRq8cARLPUrDPxnPbn6xXYYE0T8jUFXtU6Qc2KFgby1KUW3I2NQPEXqAK2Bf1ldwdtKkUduaIlaAAHJvN2Sf1j6bMQcmi1gj22k6sAKd1IAFgAbDxGoJ0lWsm/mPMpiuK+t4+kB2Eigo8j94lSEhrfQVbfO4EdJoJAYg/5CIqpbt05G/P+5YK6Ta1kkCt8xLkIsNdkfFQGcQpgl1Z1Xfz/uaUrBVG3jYGQ3bpRWo39TA8MaroA0LpvSWAqsFz3DNxqVLHUSSScH+JJoiwATfJ2+cRw+8hRqFH4SfEsFWUah3nhc2PWSKYFTv48esYBpe0HNgDIG8mtIDkOMXWfO8Sn8QDSOdvM1XTdiz/AOXmGkjuOc4LG+cRKkR3BzS6SSO04Jv7EvTe4IAFgeBF02Zgxs9xwedpblQoo+1RLJWYkaTbEfUQBO1oVbn0ES9hOAg4K/vHQZrWu4fOI4baNOpbo5thAkB7K3dULxW0asoB7a7j21vL0q5A6e158H1iWzCnTqouSbv5zRdTGqscNeAJJtaRSRZuhN1q+5jRJq/4k00qFUKvdtkEViKmKqtgg/CTyIiAQe0M14vj5yiwZCprVmgR+uIli1cd3xnbTnHrEzDvTFn1o1e8Y2Qfh3n3A3lqyZK78HzAYjLgaRsc+vO8ruDkBWU2CBdEiVorvsEk4LZMSFmLUzEM2CN9toqo1AY9ykBQaHgespW2ZGtiP/2EbMlCj+uP9yb03ShU/wAh+/7xKMA3RCFG3zwI2C6Cy6iCd2HzuIhWa1Aqt+T/AHctWXJKkdxIAG+f2zErEM6/iasEsAByPEYV9DWCx1XfjM10K+lUyo3F4kP29imiSDQgDGo4HGzXgD3lKqgquQSMgijLUgsxY3kjN/pMyAb7VYg4BOR5z7RGohmCDUp4Qnkff8RqV6i947jtpzj1itWDKSNXAI29YkwFvpg2RtkLvJtWsbutUWHsauAtgNI2Iv23minp6ia7uDXJ8Svw9I1nNnDGzeeZITbKzUpVrBA5qUE1ZIOnJCgbD+IdJne7LHURR5wJo2gIMjHr93FpUlNqrKQWP/8AQ+7gp07aGVjveKEFtWOlQi3uP3lFVY9tUQfN/wC5FSo6QNSgkE7sIFhrsrr1AD08SlZQG1JXccVljf7ZmulXYIuwqx+X1mdNlT/hs2SQb1cbzVQxxmuG4A95LdvatiyMDkzoQhXOokWTg/xJoQqqhRVsahkEVf2IxbBFtSD8N+IUGulDEHAvYwFMCpOeB/MnSqwVcZXvO2nOIHd0ONQ+dXBdk7NVkbZUb/3NF0b0b81z6SdJKnURpHNe80pg7BUKmwQNiY16ePxDkk4J/mPpksrEaqJ7TfpJtBr3HKkCjQ8D1mi2QpU6jWL5HP8AMTaFUVv5H3mMHSDSgZ3H7ydAG/5CDd53AlkLpJUEi9yP1k6VY9oGRvm5oGFnsrN1W5itTRqU5IGQBV2NoyrKpY9xu7lABgqLxuODA9o0i1s/WGpWGa6AwDg8ATRVUFBmzuCN4l3Jfnj+oGiCANR8GK1Kxq4th5hFfhiPlCHRP2WEVwn0R5M4RQgDhFCCjhFCAOBihAC4XAxQB3C4oQB3AxQMAUkxmLiM0McTF2mjTBzmOQ4x6p03OLrHUT6Tq6hxn5Th6p7PbeaRcc3Veib+k4+rkHtIx8U6OrWrJobzi6x0thiTtU1i4w6jZqjXNTmZ+4kVpON95q/UplABNDxtObqlgbNaiLmkaRl1DqYgnUaszk6zkBhYrN+pmrNpJNkH0x+sxdiCLGLo1LinO5KLQOqx8U5mOoEBdd+dpr1K0stnVznic/UUImsMLJsgbxqZdTV0xZVgv+OLWc3UJogqSzDnGJo/U02xZiFBo18XpMGJZaVAqgWQ1iWEuxIpmUCsgtvMWU9LvF6setmPqK16WQUeZmWc2o7+AMc+kA5yPxOoWZwxVbK3Yb0uQzHuydQAoTTqMCupk2Oce2ZkVHU6gJbShFgb4gEsGdyR0nUZp/HvMySe2mOkd1DHvjaX1DpY0xLXVAYr+Zl+IvaNDNQuyCNPvJqKNVsbFIaG+4kMuom3Dms92/yjYdVSSQC1XIyMi1JsYxfnPmTWVS/UIDLYofIk1+sgg9NAA19otwP4mxYq4tSRgGh8+Ji1Asg+L3rEis6i8UEY+8hlKEEqyivhNWM7y9Kr0w+vJNnz95mQbOSxCg0a395CKTHsrQST/kdOPMDkZYDHdZ3jOp17U00LIaQ4NlWUEHY/zJRQwKANdnF4u5kf+TqWzAkCyu4Y+MTTuPlgcV+m0TMGUWDjeRaisSWvIPaBQjIZjYRhQ+LxAoOo+WGk5HOJDt3GjZB2AxFUDNVTNpGcb+uIgSXOO00LvcR/iqAg0s9CySD2xMvUU3gk5EigFdR7mVjVnMydyAQTge2TKpg2oDST4xHbK/cpIJA2/qTUMzfTAo6sfFCzZAUn32g1aSow3vv5iChRqLDJz5kgqKValRWxrERNADSe4c4xcSt3Akmqwa3h3MtBdOLNyDPUSKJFc5iygu723zcTHcEY8ybYg13e9SdBDufUW2GV+e2IFn3zgbRnuFkHG9TNu7qZPadgTeJGqWe43oP/ALeJnk/EC1ZNDEGbS13ZG/iSXwoIY1nIOJOhQbJ7aXze8CMnNnnO8lgwNir4kitX+JMDDtQ9B+piYaBhrxeqX3K2VxttIPI2MkAWMVY494qIFkEenjMqhpu/U4kjDWdWkfdQMyD/AI5b5E5jFkUSMb5hTMuMQN8gVADYXz9YgNTWSPUDn0lUavJ4qBymRz9YEmyLq7r9ZVaj8LGhv4i0hnBLUNxGcbG644iBrtRBvn1jBzZGKq/MQZQBYJoZsHEqmBvG2BAzq7sgms0d4E0pUm1/fHHpEBzWk/SWbBHbjbzAINqAAbx8VQ1WGABP7RkcAU3vvAABbvJMkzHaQaKjwfeBJqtPc2c4xFs/cWoekYDOuF08m4BY2zQ8wA0qDufJhRIogUYxZ9axJtUkW/VskEgWRuD6SjdcjSNozlcjI3MCoZwCSAcgbxLkMKXNqteviFE4pj59YjhsNdG64MpGA0gBiRnb4YlmDufynm9xL0ljTNZrOd5OlwxwCeIKKyME+IlSAswsE4G52uPTpQaTqx8UrY1XpDkqLDe/EDkIWT8LGUylKOlgP8TxneAAChtVk5kiryWKjINfvJaSHx8LFj5sXNF2q64IJkrbilXTizYMZUk5UUfnJ1UiwuhQ1/XmIW/WBZsgWR59JQ1Vyax/G0bEFCSpxjA/mJciRZGbsAULl6dbYRgfPiLSGIyNByOdoHD/ABWb2HiTqgpPw0SAM1z9I1y1/lPruIlYBVwxxZJBxLphmgTuBDThgWTqYOQM0d4yxC0GBUDJ2JNcSRqB1C1P0mikqe5TpwPfNxLkIL+Gi6TePiEoDJUKT77REDUVF6j8o0QKNevLUTjMlcgplF0UH+OMesCf/EknzjFwDU6ks2kA0f7/AGlLqdaVNBqzdiCoYJ0gE1wQTvHoKjVeSOc+0TA1RUUY1DBayQMce20DIW/VBZhqUWQNt9vSME1+YUNoz8NEG1Oa5xDRrcZpCLAu5KpFBSzWOm23xeMQsnt7mrJob4j+F+03RxW0QaioKs1DUdSnt+8yWkhqxLWR2VW+4mgXWe5g5rNHceJOhwDYF7gQ2tvhO2OYKkDMV1C+2va8Qr8PpgatWMtLViG+GxhcZvmB3ZVsMfWSrCs5ADNYx4hpZfysq57cEwVQE1axZzAEBxZbSLo1+/7QB50ntJZhzixNgxK0WqhRzv6TNNXUSlTQSLOoRnUSNS9vBkrXp0jUDkjnN+IhfU6wLMNYBJG4Pp6RrrqhbVgbe20om+lZBJBz61A0W2nNgqMAVK0F2FdNtsN4xEyB3FmkrFm9vv8AWUcOAHs3sNjEuJAaqIY4zWxxvKXLkgdpxercSV6gVUBVnNajant+8zQp1BnBJyB+kQUE/EPcwcnejv6QLUpS+3ckY1eP4iS1Oodrbe/zlhjfw4283zxEqIK/hdMUdRonUBW/FSheoroZhWDxEcs6DVr4zUpEUdL8TWLNGJUBVkAOhlGe3F+4jN6T2HUR+axYuJWAILMwQXmuMYP6iNC/U6YATQfiNiJcWCSKLDajbYI8Sq0LqvcA+b8TPSdig0nY+stS+mtWoAUNvbb6QIrPV69s1MAWIGxzt6YhbH/JSAKA/uWxtCSptd/B+cQQO602lNwCdW0SjVWcCum2fzcjEpbIohnrehhsb4h8PUpWsg4CjB9IlcKOmArOas2p7fvMg1o3dddhFXfxCWF1nuZXNcNv6RBXBugSchZagimyG2wN5IDOVUrqGms7C8cfpEF/C6YYEtak6vHpW00vSRYJB7dr9ePlAEa2XZ22N1JtKkpyVGpvfzLoqbKsi57cXEqKE1/idxIN1mNSAwtm0izdX8v4kkqjVlSWYYuxYmq2VClq4PduOBI6Zbqp2qE/MbB/mUFbTpZe2RQugqXeSL834/j6w7ur1Brcahkj+PSNQ4GCTWBde230lGj0yGU9uDXtIoSGOnZrUYEsKz1XTc/+XiIgNVPSHaze00bteg1kEYUYk2lUprvTTFqs0L1Y9JorGywHZXneQnUpUWi53Ng4mtOp1VZOQJFpGqlmotqNZAPHiWSQCuq1rJwLxxM1JvULUzYXYte04wL/AO5NoSi/hoNPcSpyB+kuragCfHiGG6jKAdZ+UaIoQtrs4O0i0K06ASVZR/iePaOzfwkltrxclTTi2OkXmX09fUQaBoO5sGLU1antosBwbO48SggC6ryR7yNLaQCLB2xLUtYySBtF0lQGvrDURYyf6ljjdaGIrtKIODW2/wA49IZsNS+Cb2itJdE/lPzEI9sfifpCT0T9euEIT6Y8mcIrjuAEIXC4AQhcLgBCFwuBiELhcALiiuFwM4RXC4AGSdozJbaUEPtObqHM3c9s5eoe6VDc/VNjecHVYHmdvVYYNfOcHWYDFby4uOTq2yi8XtnYTj6jKLxja51f/IIIsj5zi6jADtNVZ01No1jFwA+Tnn1nH1Gstk0Me02c2xAO43qcvVoFlBHvUtpGbNas1g6ebnL1Gxk1quzOjUmnTVYv29JydSqB0jtyLFZlQ3OzamGi31Ai9ph1EANqVYE4WdGoFj2g74vic3U0r1M73d1dCVDYsUYkkkKOB/Ux6jqiYNk71+0vrMpBGsNpG1e/6zHqhQNZ2FaVrMo2J6hUkA2aA03Murh1AzW44P2ZblT1C7gHxjIriQ+k6XXeiQKODVx1TAupZAzZI0hd7EzCnq9FSyhGOF1HYCaFUTt0gm+IuppbpLqU6QASfIkVLFtKiqAG2q8m/wDcWhVYLqF8n5+YyyKthtOGpayfupklF32thdheImVJjbEjCjAO1D/qLUGUuc6RWqzA6Rr6Y05OWAsQT8P4B2WCbzQN1IqKyvSCDiwRq2kK2tlHTBfVYsmh/uaMo0rjCnZhVHmSrKzHSm94viQyrN0CnUApHC3IpGOWpVOa/TEttK9Uk2Dd5GwmT1QVXDgD/Het/n/qSimWVUxRv7qZ6grEA9xoUTKdVA1EChRAr6SCVPU1PRvbGR6SKkmWno2fI4P2ZDMDo1Nv26Zta0rri8gVsZn2dM1QsneRUM1/5EBYaCdrOwkkgA4WtrvzNXAbpqSO0AG/ImYdaNEjehX3nESKNKqaDDVub5kswN0KUY4FfYgosttkXajiQQF1IKHkjb/cikokOLu1XAIP3xM7FYFahVy1ZT21pxftM2AYC8aTdEVnmTSTq1UEt7tb2A2iYBQWFHOFloy6jS+R6zNiq9QE4zd1emRSHa13gLx/qBcKo/N7cSHftoHVQ5HiLqEVbADTWKkWmC2gkXnariZhqAya39fsyWYFyW9vb0hYNMORY3mdplrUFQzUa01ckdwGAl4FmBKrj1hZK1XA5kmV+g94BVU1efWLVpWgdODiswUaskA2NwIAMRvsBj5Q1BgSdh6yedIr1xKXSTpqic+0AQIG+L3MQOokKC249o2UcZANylbMARQZIArxEFU5PB2H9Sqr6+NojRAAbUAPERnhVuwSfEB2tXO1GNgtAtVCqFRduqzn+IA2oML+nmIEULNHAEvBphzmJdI4GTECALJnt4GYDTWa8XLKhunXEQKf5Vv8/WAMKARmjz4gSLPm/pEvOAbG4XiPCkoNNcmsRD6YOpSdwB5iB5yL5uo10bVp/iPSGHzuq5gMQG1ABDqvF7VKKjVYo8ASlotj15gyBXsjnxdCJRAKSc1p4H9ShSLqElmBWg10ORKZQBqI2ArEnVYB2mudt4yLIFepHH3cYVWJLV9No7BII+nrEqRNjULbJxQ8RhSyZAU7LnaNdPTNUMmUwVumAQcDeLVSJpVvb1M0CKDV53MQZeGrehW8SgEkkWSOBEvDO5NUBiUO9SRZA5v0kihqC1nkbS1CfDXz4ESsSuB4vn0jDbDpgsDYu6qNlAUY+HORWZohGrA2sVcSojQBZFVsFjAVz4AOa/qBoNkZJva6gc4DaudpK5F4VCbsmIH8Nq1ZOKuNlUjUdlGBX7QoE2wBH7RLkPSNQU6r3rj7uFgspLVsAJp2sAwG+a8GJQq8AktJtUlVPUQEjQdls7eY8KM1Q5lsAenWk0Kz6CIFfytW9Y3gZhVU1qo+eI8E4B/qSoBvF2uCBxK0hSyDSCasjaJUikIdN7CjDA7/AGIsefixq9JSBNWiqwTfAj0hloi6PIzcTSRKtdDp2+63dV/csoqgsNJzhY0YMx0r5rMCFXqdw0km9r0iJWClJ32Ow/qVaolg37biQ1AAK2oeo3jZV06jsAMV+0S8O9L0Wo7aSY23Ao+SPMO1upqavFeJoNJ0sOc14P8AER4z1Ck1N/4gbylUuncoS8CztGoVSaAJJvH6y2A/CoLYoZ81JVIjtWwQKG5mmhLrVR5J/uSugDDFd6Fb+sSDUxNA2MFV4iVi2ILULobVxBG/EXBsAYYH+vSLtUsoKgGrYDtlp+GLWtLH83iolxKGmx+fGrbBgG1ADp9+4u6rH7Sig0C9gb2rMpGUtQXyKuBoKAFmBXTsFuWFV2omtO6/6k6VD2bs0arb7/mU1dQDSwIF8fWKqVar07DA/wARX+G2knO1E7/ZjdV0KxACgAgEZ+UZUF9TCxtVZESg4AcDfmuD9mGpezU5H5QJpSuFYYJzWcGQK6fAtjcRhUPU6PcoQ7LZ2gNK76aui15mmkN0gNJqt78GSpUG9WjJrG/rEuLCIprXRu7O315gSGbF0uOMCT011GwASwwQOI9KqXRdOatqxtEFLTLYOpQPiv0/qCnJN/FfcfBjQoDpI03ueBUCq1kDtN5HO0SkKwYhel/yGyoa9sftNHRQ7MAtcITzL6ZX8TtUDcVfEGRV6llaOCPT7/mI4QVGPgDgf1KBVOlvZ/UD7qSxB6YAcNvxvn98xlV/D1HSFVQQCv7DmKrhBijaSaO2kn2z53qU4pwM3vXG8O1ntwDWPUTQaWCdQCic1Wx/jaLQjUAE1PWygDP6Roh6nTtlCflGo7b3GAqt8ItiDvNGW+io0mgN/Y/6i0JXSmKXH5rz6zX8NVIBYK3k/wByEZVOH09xoVv6w6ahixwxK4IXiSayQXJUHG2aAEvp96GjekYa/SSdClkUrmrYDEvp/hrSAaeb2AqTaEr2tqBIvF81/wBRq1lR0yXu1B4XHmUyLoo8EnIrO00Rg3UpV2sUD9+JFCW6ahiw0kbBfWWqozHVQC7gf1J0r+JkEEkEYsKPv942IYKq9TUMnb7zItTGlIvTJ1bn5gQDlCQDR8XvdfzEyp+HqPwgChQv5S9KuwLAeNsiRaYKHtGfNcH7xKtQV1NpzQG/6S6RgjDFkGvHv4gpVCTQtiDJtIlTWgLgLWBnY8yxpVaNUN2/eUw1dGtJwMEeAYKy12vpyaxvI0VSoqtRNHeztGzA9TFivkJmmTwdQ3AmigC0BAsZIGNpOpWhDLvqCjDD79YKQpu9+fSUi9MLpAoeeBUCmKPwg3nGdpGgK1lR0+/dfbHmaFQASCo9L3MAV1mgBVigfv1jpFbIKkkfKSSgqs5vHkStQRLv+6iJUqKYNvuJTKpXVgKAKFSNFAcqaujtRMvOBn1HEjDv3V7VkTYUwViKvijIqU6gAupqrFDM06al07lA4F8SVpbJ3Jua1qQKUwNjJtTSojkGE1AT1+kJGpfrOfEIrhc+qvLHceZNxwB5hmKEAeYZihAHcLihAHcLihAC4XJqBgariuTAwAMlpRmZOZUJm5xOXqHM36k5ervKhufqPYnB1yK9J2dYih5ucPVAzU0jSOR2rYf0Zw9Ui8E/WdXWYhsZrfyJxdQnijW/vNo28sepXAJ4xOPq1pZhk7bzoYtpq6XczldTe1LLaMeoxNWO4/fynO/Vs9xzdb/pLajxi+ZzPpN6QaLeDd1GGTAbAWNyPBmXUbUtE0a7Te826g0piwrCtV4+c52dgKerHG+fMo2D9zNkkjy3H8f7nP1KAN6hjNncSyCOoKVdS8jgnmhI6iuy79/qTg7ZlKY9Q31HQfDVE3+1TNeppFqKBauY+t0yCLvVvX8TJlWgptWLDA235hRU9TQ7Bv8AHbOQfEhRpHwgFh/+wmn4YyVBuz9fQSGZ9V32qMgnI8SKiobTsrHS3F/pIdQBgar8Hj1lPtsp077ZbaQFZdIvSgOQNr8yWdS1aWvJFciZtepb+M4H3xmWekxvYL87B+zMlQk2RYu7MzqKZ6mo04Ia6Bv9MzEKoIULY3IGw9pZCHXp1nv+e0GBTGwIrUNvnJZVDU6i/Hab/T9f0kaQxs9x8EytR094Brcb5mekhgaXUu1cHzUmoqa7TYNc2d/0ia/xGUVVUTKdXZe4298kn0kOpDC9964kVNSvUpLWwtgfSJihFjFbbYPiJlUdOjgkjA/mUOmNR06ic/M+klCFpVNgdw+sk1VKcH1/SU7MvUsWFAqjx4mb5F6Rj4ifMmooZQAFFt7GZsQqt+Yj1zK7hQ+FRuAaz5mbBrOMe+QfsyKmkxIww7zgQPWNkG7uhUz/AC2eTuZPa15b4sebqZ30SqBNV60JJcEDO4xn9IMdKnevPHzkajdPRO9DzM7THxE5v5ybAUWD433Emjq2Arn1g1kDe/NzMzY21AY2uRrIyvw3XvG16gc34k0AmRRv7uI1WrZ07foYlpRgb/rGEs41c/WHddi8DOcwMiBkqaB3BMK969IYq6U1+pgqnFYUesAKpTizDkYNnEYUkUBiILsTseYEpepdgg3dSeAoHyEAFJNXvjztLK6OD4gAKIFmsYiA1MSM8bx5ruo8n3io6gKXG9eTJMBe26IHN8xnDEAcZhpaqY5vztAoQwaje5EAYYqCQKF1AlWokV48gwIXTW2Rt/MapyLvbMRktAbCz+sbFeCaOauMFrxmhkE5iYULpTW5qADXRIF+xhwxq2AreNAwULwDkevn1gEPy+cRQgKNnJ9Jpqs93mhMwMgkHfeXpUlq1Gjzd3EvC0ggKB6kCXYar+Rj+EYJra4hZHeR5ofvEYC6mv8AQmKgBkH67iOjqFgBhn5x6W5Ju+TEsD4iABQEpW0rqGBfMRVqBrJzUeldIvUCTWJK8M6fioivrca9vFEjnkQCgk1k/wAx2wffA3vfeJUgNV2nB3F/pGVzsWHvvFp9BYy3vGmoAAGl5rzDVYdAajk0PMeRVjJwKiVSG2off9xIpvusrd5kqxoGNkNvdAxBRelR6kDzEQpJonevW5ooPTXmtriVCABAzWMEftKVdRN5PAiXUFp/n7+YKp1UQtjO3MS5DAC2SGAGN9x4jIpio2rzvKKsynU3cTuTEwODmyRjiTaqGjhVOkUoobxtRo+Pa7iKqOnkEWRt/MsdMamoG/XzEuRIrJpe4H5+kMVanB3F7GVTWQL7eCYYoHStrlvWAh6MjGoeh/ePt0NjUQAN4IHVQBQF5zgmA6ZOqhj9YLkM2tWO7YS9eaYnesSFTkixe5laUOrfcDY3cmrhBLagtckAbS+0iiQMYN/p+saroTkCqv8AuClgK6gBrJo8+ZKwoDHOc+Ygv/iR89x4iVaYYUFcnHPtNWRyuSdd+flJVidJ1kLQoVcaOQp0ghbAz6RMrUpo6j4j0qFphpLEYH8wM2KuASpGn6gx9OrussDvzKCAva3f6X6QIYOKvAze/vEqFQq1JGqrztH+GCbC6r3N8esZAHdSkjLGtz/EFDBaBpfzAWBfmJcGFU7tpAxfy2jLbWLY4H39IL0zqP8Aj63BB6Agnc7xHGmu7DeaB9ZnoAOkLySVGwMrsbUe4gEDybmmkqt92nYn+4lEdLKATxQa/oP1goBcm7qsavuoLePxK2s+/mSFIcHSuoZ25PoIHFadAohlxW9WPsSmvWQMADz6R6XbDGzZySfr7SX6ZxeDvXHmTVKR9ItbC2BeYUhokVpJ9wYiqDpU1qb2X35mq9HvJFk+1A+wgoumNPdpotfz9IYq1OCMi+fH3zKtw3ooyCc+hksDQalNZbAz6yVQyoBsKWzwYEAI1gtpFVfyh0w6ppFBL7qNAnzGOmxJONJ3u8evtAEbFFviPaN5t+IMhuDQI/3Muml7rYvdsekrSjMxGoixeDd+kSi0gnSqgkmyBWDNRoIF7Vhr+ghoKqD3VsT/AHBddV1KPJrnwREYC6iTe21mAASzTKBi7qx6Y2xJI7xaLa5wOT6CaFXcEO2pr3s+1yVpNh6UACs+NuP9yum2lSUHYCF5ifpsNN7nxtHpUdMggqWIwP5iCiEarGAduQfSV06B2Gpr+fpGvSBckAk3tx8v1jJYEUD2DIY594gdgraWNQyL2+/3laQpsAsPQ/vJ0j4tKtpy3r4ldNXC6QaWwWAOCc5k2mNICk1ekec+JVEAaibOB9f+ox031mgAhu9/r+0F6ecixe7TO0NPxc94yGoG9oigsKEFkm1EWlCWPcaIBvJv0m2g9NLN1tqx+vnmK0iGllUHA4a/0jADtk5xz91ENVDXWN/XwYaWsEopItsYz7CRaUWABeCON9x9I67yFAGPltHodr1Nqe+SfrGemwCk7mjXEig0agSh7AaltpfcbHncGRpUIQylScUP5mq9MHqGhbH6SCPpABtRA1N+vpGSNFo1WM5jphWkGlFEMc+/1jqgDS4ycbybRSKAZGc8H95SjSp5IFb8RIGC0DQJF0auaL0zquhWSd95FqRdBdW5wM/fpNA+CGuwa3kIlHbF7mWqqWY2awDYJNyLTPSPhC+4HmWAMAnFED+owulea+9/MFsLThffzJtSFUu9E5xzKUYyGB95IDatlsWdufaa6XI7jb3558yDo06epQoY/iV06UWpxtmSUpR/keOJekBDeL/x/mTahRKtkgUDz5miY7vzN+slelbWBbXnGLmyqwNZ7dwTRmdqKKU7GvTxCaYO4hJ1D9TuFxXC59aeZO4XFcLgDuFxXC4gqFybjuAFwuKEAqEmFwCoSbhzAxC45J3gAfMyJzmUSJk5FYlQmfUJvec3VIubdSgN5zdUniXDc3Vq87Th67U/aSQf1nZ1WtanB17o+GFe0uL8uLrFdm7uZwvqS7+Gdf8A8g0KyOJxdQoCSQS2fabRv5c/UokAYPH0nMxa6LHUc2N/abFcWS1HbPPznIxUOTY9TcqLZ9VtQ7R8/Pr+s5yVHTvVbb7bzYtTsCoF4GkZnP1F/EYgEW/6Z2lRTnfqF0V7AFePac7hiSVw93na5t1mJBcqRQAsTmYhrJLUTW+8tTIm+r3Zev8AHO8xcEKdJbSfqczV2RwoTUMbtk36zHqhVW2Ng8WNx6iMEWBa2Ost8Irc8kTBkDuLbQhzWmuZTnSpChG9/wBP2jdg6CrA3NDGOBJpVj+IR1B01F6xyPiz+kzOk0G76F4G33RmtFQwFFXGgADgf9zDqdpPTF5oUeJFZ0OH6YP+HtdH1melewqKrasDaa6kByHLG83iZBBQOaPqBUSKVuz1bXv/ANeJDEFRoH/5V9+YuwMSpHqdhcYcDqdyqMV27zOs6zpV6d6snNAb4/aRrLoOoaAPNb7WKlsmt2oqCf2MjqWy6yCKwCBIZ0tN2Uw13na5n3F6atVf4+sYpmsk5Nb7xMUYIACMebIMmpqaOjs1V8rOdoybILHWTtisyeoBpFm88nc/KQzUjBQhrhuBIqKVB2s9qHIxWPMk9QjqL01N6vTfMtnVkAuqrYeJl8KkA2GGmhJ1nanBNNnnaqksWQsD8HtcjqOAxTuzWDEWXVnUSL5xItRpNVKQD6VgHEnUxZgSb/WRvnOfBG8gMt2KvkzH16LFs1/CN8g1IwoBv12gWpqIG1Y3Mlu5jnJmVpkXLKrnb23iq/hGYMSRqzgAXFqs+Qcb7yQWb5us4iq1NfDHhlUKD7wZQK5HvzEZ+p7r2FRadRsml9o80QoF+vAjYgjmoBIw4Xz5EXNEccCWF03WxFUJBwCtVdb+YGpgQ3/j43i0gAEfKscRggNZDE+8ANQFbe8kDIZlBsmMgEdgv1qQFWyTVjcywaO24xW8YIBQt6s77bx6tS6jj5QK624swa9zeMQBgC7G/wClxAd1MO6vEa0bJ/feBK4C3JMgpA7b3+svchtzwPXmSy4BNn+5QvTShT6QCMsy5AXcYlKxD6R3X5G8YYMm+38Rquk0MhhVCBYWmxRzztDuF1kDMHq9IvOKMa6edRJxd4+cSi0g6cH/AMfapS6tRFn095KJfBAO3FSgoRicHyYjkVuMC/Wt4gAOneoknwNxGDnIA2qt4yodsHJElUiSxfphjVe36RhfirDeeCZRt01URQrEkANZOxx7wVIaqbAYZrxKC6Vwxr98w7SAFDZ2ve4Mo05299z8pKpFi/N3kD1iK6mFmhvVesMqCQA3oZYIKXmvaJcidWk0udVjI3ioGgcjfaXp04wQcACS1DtzmgRFq1nUpP8AjV/OSACFr5ViO01i9Rba7xKVQwFXR4uojkMXdXbV9j0gaYChqv0+sSgBjtfJmisNWQM7UMyVyJRQq3qsn03FRliyBsD5fOo2UMTpIsj6QI1DUeMAwVIAtiwPXbEofFpatVeMyR3MTki633l9pC6Qb9Tm7k2rhAEA6S1H+5pYLAm2JyB6yGQac5HIJ3PEoYWgF9QfESsIqGbal32l6tPUCKb1XXbAEFPArJG33vKVdAsUQwqqgrEaRfdnmtO0elxdfD7XRialJSjmhRJlKFDd2om6Bv05iOQBV0qVG23AOJaayxFmyB9fHpEi6siwD4Ncf9RgKrGqvYmJR/8Aqurm63giqBq12T4G4qMN32wAxWBmFamPk7enpEuQBz1EDYAzmvnVfWMLZtcNve2Y2AcWQcDTqEQIYsSTWB7yF4YFsAw7832/sY9NIQNWjk3+kOxgqqrD3Nm4MoC5Ng4ydz8oGsGyL7r2HrFpLsAcKc1BbVTQX28S9QZBWMZxgY/7iUWo/iBVzqJG2DmIgXRziyAspQUytEEaaElhpJQls0DcSpD7gOSvOLz/AFBaIQ58jFA4lKFDdwZm83j5w6ahvIUnI2z91EqRdNqN3qI/Xx6SjRHYt8g4yZC6Qxyvq0sMA+VABGCBkxKJVVV1E2xzgfFiA6h6iaiwG+a+dRlPxHJBFsPavP8AMG7hbA9grUOYKGm+4CiTd1iMX+JT/FRvt/aJaYkkmsC7lWhVVRWze+SDEZhTpOktpsk5/SUMkEnUTsOLklVCjUd8ZI3+UYwKXQfQydUYTUwvtXeiN/XErWE6uhe4MSBY3ydvrzHqVukB8OKOPH2Y1GjIogjTp/7iUz0gim7h8RWtowGU+U5xzFWglO7IAo/ftKXQGAYMx2vVi/WBnpXSpA9VoVePWWuvUQScjH9DxJVde1i6xdcf9bQAVWJsHydojXgqAqlrzqrcwVAEsvk+BuKMasA9Oo0kflGY9J6j3jWw8ffrEpIY9XplrA3o1849GCyim3JrEbLrGQewaQRECGOosawN/aSpQU6wOoo1gHjPyjCnS2gkJknb6RaumwVUDAm8k2QbgyD8PuNg43BvxtEpotYY215Arc/ZiKfiEX2oc7UTAYFKqE+G8TQU3SAHjOMXX/cElq/D6oQd2okZG+Tt/cFQbHSeSANpar+GLFEEadI+sk1020dwsAV4k2jGgVlP/huRVwAWlI9xQoHfzGv4epdWon3wD6xogcXkKdxdfv8AKZ2mpfxLoknUKGOfA8R4ZKVSxObrcyFC6s14Y7cTZGAemUAEUPPEk09NFVNRbU7ZwN8S1Y9VNRrF5r9I9IZzkaiPG39cxkFh3LegadQ+/SRSLQMlQFbcniWBbAOLejx+0hO46mJC4G/2JfYyhUVh4vJu5NIwhGoITps2dprdHUwLeBXMgqumybBNHIPttL4oKlngyLSo0hjV6RvtLLaOqEQjuJANb5iFN0wAasUcY+95oq6DYqqoL+si0k6Rppu691A8SgrD4cpzjMRUdMae7IAIM0QoWAYE8XeBjmRaaVVaU16isAzVAbKkkk19+khFDEb0fWvviUqqCcC9mMi1DSgT2gteb9Y0UabuyfAzsYK1PbgU2BQzK0hmsfER9/zJtADF11X52EYXVkCic3+0WnUoFGkFXKWmbU11tIJagsaYd2eI63KkgZswtNICq253zmMjtznzZu/pJOrUXV2Qdl9ZSpZ9PUSc1gLfrmbJlMjgA+JFrOjC9QBTdk5r14lhbIU7bkVBFAN3uKqUBpBFHgTO1nVaT5r5wl6R6wk6l+nXC4rhc+vPNHcLiuFwB3C4rhcQO47kgx3ACzDMWYZgDzDMVmFmAVFFcLgaiZB3gYrgCJ4mL4E0aZNgyoGL1zOXqEe036jEzl6jG6mkNy9R80Rkzi6zX2gmdnW+KthOHqay1ggefWXFRx9ZivcBxmcHWZnsk48DfadnWvp9NRQ+fM4uq2MkKc3NY38uTqFmfJY4oTm67LntoAZ++Z0dXq1ZGmhtOPqO2lmJAbjMqNUdQ4wCV3M5mbu1AEZxn4vTM2YMEYkC+Tc5X1BgVAvkTSKZdQ2WYWVrne5j1Oq+enpAK1Nm6TF1PV7mQHE5eoxa1ZQADlqgbPqFwxpmJawSAKPmZBF0G7YVpGrMsuemtgjUwBHkfe8y6jM5VMVgH755zGEUpfYhv3PiSTmmUkt67iDBj1Si6SqkWOYdQd1EEA7i/wBpFTWbfCFBa9x4B8eZDM3TIcLsBq9/uoAdYhcBQMH1x+0NP4PSQL09Q9fzeJDOs+oWZbJ7TsPlMqLOCWfbSLra5qwF2SqscmvEk9bJa10jaTUVHV08psKseYitJSnUu5ETXocsVDA+TDS4U2o1bWJFZ1OpSNYsVtnf0zMt2NAlav2P3Us6qRhlieT+8gdJi4/F7it0P4kIqWdz/wAekArVzJtROCdTYJGxlsxJKsqjNEzPXp+FhnPihJrOkFVVz3itI1G5Fq24N1mPqO7aVBW8TB2tyq6SoqxMrUVTPkAglm9dx/1M3f8ALZz9AfEOoT+ILupio6hIxpANH1EztY026jJ3AZAziZuXYWSADx9+0Wn8NFpRnzzJN72Ab4mV9ER1HJLbULraPqadiu3iA6hNkFaEjIQknN+siqM7YzFxdkc8/SUAygk883IKmlI9pAHJu6rnzDU1FKArciA6dt/ydxW4ibsELV0TEAQTe9/oYKqqubbFC8wJIqiLIv2jJagBUAVBjkbi4Vmjkn9YGy5AorzGV7gP0vEARyKF7fQ+IHHdXvBFY5BoDEen8NFpd9yTvAyOplsjfIEQWyNRO1Zjo52B3jVzeCumpIBC8DGxj4r6xflJJGDiUA1NYA8kRgsfELA8jn0is3qo/PgwN2pAyf2lDpkt/wAhurxAFqatFAVCmBOTqODW0eWwVGDmFlRgjO0kzVAq2bcVUAAW2bVAljSmvXMCDZVarkQB5GKy2P1hutWc7e/iNhRo4ESq5XFKL+sSsMWjagBgZgdTWTAL+H0xS773zHWckA748SdNOk2CdW1C5oyg40jG8QfOoadI+kVVbHzg2YlSKoae0XyYbgtkAfdRqp0kkZPMNJBBGTfmJWH8RJAxWx8wtwugiqxGvRJI1gsVvH8RtZOQtXRP/US5EkMGuzZ54ldNFC0wuhWcmGogXYGrIlMWwmOL9P7iXIFAJ2z94hYvY2a+/pEcvS0RufSXo7heBe0Si+JdIvOdsA+IatIDadh3QUPwdKqa949I6ailHrcnTB1PvVeJOkk5ZqAoZH6yqs5IDHx4lq5FkVpA2vESsDAV8OOfeMLgUDkZEWShJ3lKraWJAvyDEqQDTv3YyM+OIx3MWOVrI9YgGsEd2ZY6bM//ACnWRdfyIrVDU4BTT8MNLXdnUcXxBhqtdK7mzGCEypHdtEuH01XRnurtGrzKAXXsbr6+knu0BTV4uuJRy+lQpAIJzJ1eGbBoA922d8xHA05zzwD4lMO4DYbbwUOaqlCmj9+IaeDKDWBmu64iXY3sPAlL0x0+kulRfN8wAsnZW9PAgZBWZhbN22BdTRglEadhRiVmuwRpA2/SJRhi1Y2zJXIvTaUtkHeC2zX3LR/bj6w6avpJatR5BgdQCkZa6yf1krh86qJHIPn9ow7KPwtIBFZ+/vaJeiWdfxAWIs0OPSUxJtSq75MS4nQyvYJLGxiq+8S+koC01nFZMFfQPiGcj0gxfSFtb9/u4AxpLbU0Dg9wNnAN7i/+4ipZ9KqunkX98S2X/kA+EfuJJliiue7/APk+PMoMykOFBIGfnEi9QkVQVTXn7EpUHS6KlU33vn0guA62s7A8DmLRVWXpQQLraMZzhG9uBLDm7UrpG3iJchsqr+TYUajVRoxkHJk7q7PVgismV01aiWGeSu0R4VlhYsZ3B9Ns+sALbUQdNZB8/ZhTAgjLbEkxr0WZ1HVttNmtvlEZh3Ufh6QCB9/ftHTq12S5xYoj7xEe4ldI+KiYw2kWGWztFqj6XTRVyC+K7sxoEZ8gg1cGZygUEfXz+/vAqS+lAGA3F5iMzd5Btts+vp6XGa0hFvP0U+JTIda8AYr0/wCokTrV20qq3HP+oKPU3T7tIJA7ozrfNUp/LzBemOj0VISxudXrsP1irVqBpWPpxx7wNIBIDEuAoIG02ZVB06KFUdMB1DqJUppUYH6SbNM7ECqrJzzJNQUBcBiG3B9oCiSaYAfmHoNvrDpK2WKrdbj6wpgqt8T3+nmJRhu4uQxHIPBjD9RR+FQDADjaC/8Ax2Zx+KNWkk1x7YjYk6lKKM0fnJURDB7DHUcWKI8fxL6SIvSvL0KGo3ErabIYG9v+42ZyAO28c+f3iUAqMaIYGr2mhbuyDZxv6+nzkFSXPTSiNyOfE1KkdQLRAGKxX3Um0iB7SncA30X0jGpSHCZUd3zgi9T8p0qG33JFylQdH/440IDyb58CRaMPuezweBJpmK5dVUELdCUq6idkY4+U0XqEmxWlc7yQplQUpQDFGvfzBVpBpuiLI9K2krelmJHbVZ+c06SvoLOouuJNoNdLZ0nBrc8DbPrGtuSxHbyrcGLSQAwFm/MteiWcDqnVRJobe0i0grOqfhEAN+0enqB7DHUbFjbxAk6mXSu+fn9iWhC0QwN7eki0ldJE0U1vQrNQAXUCQVNXtAsxULi99/J/WNlbWVGmtzn2kWg1vlcnY3xf/csnGmyNX/8APpGykECiB77xqvUxpOkKRkciTaR26jUFXA7pR1sLPap4G8SdMdNAVQZ8534l6bY32nax4mdoRTahZbSBi6ubEKvaV4oyF6h14K6QNpa5DMSBVVmSg1B0CrIO4+Utc+QAfJ8bSelq0kmifIlBTpDfE15kWmY72BIJXkGVqZVPT0gGt416bFgOp3aSTQGB6RtdlSq1cVqQurVu2raX01UZI1ACsxBtAsMO7b0lFnqqH1kFTUAkHSbmi7gkbne65/7kUNRVaI3M3ruAPGJnaiqHbjOfHEtdQFgZG8lAxODgHeaqv4aDH1mVrOgM1bQjIN5RYSdQ/SbhcnMMz7G86q45PEcANULi1QuIKuO5FwuAVqMLMW8IGeowsxQgDuFxRQCicSLjO0kwBMxvEx6hPPiaMSGxMHbztKhxj1WpfecfUbJnT1Wx7GcfUbJmkDnds59pw9diXBPnM6eox0i/O84+oTZvwc+k0hxzdVicXk/rODqs4G55sVnM7OtQej4s/wBzh61ncjb9ODNI28uVy6sTTHV4wCZy9Z21Fqu/THrOjqEdTJ+M+Bf1nF1X1KwIGfX3lxvEN1NLAg6lAoeN5j1KIxmsEmNzqN4FHI8zme1c0CDq+HmpS8ZszigyXd4urmXX1Ah1Zq3xXacy2XFvYCrgD8vj+ZkzavhIus3sVxmBseo3VckGz8qz598yXZ3TSFeyMHc3/AhryNeko2Sc7efWZ9TSqGhhuWAEdImsHfuzXmGq+mqsT2itxnEhnH4rGr1HHiZZVNRF9wNk4qRWdV1AwcGgBefIkhiybaWrBvcyQWNgqaW6b094UF6mnIJFm8fP5SKzqL6iqVBYefNn14kgsLIBOoeaBMbEkAErtj1WpLV1Aur4ybpc49ZFTUNr1l6xWxES9Qo2oZAXG1bxO1q67XmrrGZmx1EaRgHI8zOsq1c8WWAxZH0nNqcYZLNnFxFiHOKo5W6NcySdWSPhG3j0kWs7T6jsNLKTQzisHzMOo/UZqsnjbn7MZdmHaQSRnG64zMdWaOjS2T7TO1lapuozAjS3d53uZM5XA34k9RlC2FNeWEz6jD8Q7kttM/VZ6sOSMtWK4zMn1ahis3E2pUzbZu5Nt6jgG+JnalWqwcUeJDahYth9+YyFDAZGM3E1kgY9D5FTMwuqtWcjiI2zFqrGIYYqWHd6SS1hhfvmSFBtBsVVRkWN8cmpF2cbc+sLIY0DvkekRgauRm8iNrsMvv7GLSCM40jHpGOKIJr6jzJBdzEXqNitqgWLKRR23iG+QKbJPpGaq816wAJK++a8xjYAk2Iiw/F2vUcREdtmybuANgdQsYvPpBW1LntNGs7wztpPOfSMUpr0zcQLvVSLP0s5gLuxZvxA2aFg+L8R4bf4vC5+sAKty1VfpANpyDgD5RWKYYzvC9RBUYv6xGs2RjNc1JBI/KLN44hqNk1VHa5QA5us4iAzeteP0MMtuSbxtUAxNUbNfURKSBnTpbm+IgZLEUNWfrHlTk8Yi0rpxefMLH4hx8WBDTxa2QAxyMcZgQ1ihi7PkSKbTdXm7+ca2MZ8avT3k6vFD2zmjcAXClbPkiuTKAGoKDxdVEQSACVPg+R5iVgWwLFteI+8sWCkCNVDC2+I5x4iwVYYB98+8SsNbVxWaF+RLO2M+sjuatNgfvAWGNKQb29IlSGAwOVBN7eku2tSNWPXY5iVb3GANvEsXY0sDe/qImiTqJo2eNv7lFmYaaOdjJB2BC6Sb+UZVdFgmvJiMAkHfO4loe0KTVYO36ySwvbVe3tEQ2kk5bVd/OTp4ptVjt+XMpbK1VXdHzJXVVAYzTektaUgWRjxmJchd4tQSM/UwXUGuj3YxyYdxVRg+PUSxTiyDe/bEqQHUcgH6QU6Ta/CB8otwwOL4uAtq0jb13+7kqxqbK+QMfKJdROVsk8H/X3UkXrNAjO3pUtVBokUAMDx6QUbXhgTQyarBgWZ3o5v0rP9xqcLpbJ9NxAVsdJVvXiKrkBZmQqAwJFXuYxYzdNkiJtIUsLIPJEGIPUsi9XriFqmqvSgMfhoHbPvEwYkUtUc+kju02RqN3d7ZlLqBxjw3pJNSZXbg1nmCl1wSRn9/WNQoYC+LoiojdqLDAjHtBUhrqGe46hWDXzMZ1MdVVsarG3EXb1K1DuPC+PWH+a7E+tGpC8WrlWDKcAelb7SyO0i78kjImRbUOwdoOfWMXrNAjO3NQVgWw3cubP39+JowPayg0M7jBESrnIIUbCto1Pw6CGavqIjDF3IvUeNq+zHqcqQAwNVe5v0koxrZdLb54H7xtpAJXUVPLD9YlKyDROckVLRiVAaxQo7frMmYfiXvqqhuPEKYAkgsbu/n/cSsasCDtsfGY0OoUcbgG4ls4z6NfHvKUAaRZsiyDvEoK3UW1s3zjf1+/EEJNGma8Y5MWWCgMrA7e0oFXADDuOVC5xxcVWDrYatOkVdViNXKsGU2AD7RXh12vweL/7gCXUaRi8jzEpqaORbUck8CQpNkEXnjHGIu5XJUEG9j7f9S1TVuDQBIXxAGxbDITjNXsYX1GNG34+GvswUEhNJBYj/APYRqSDshRt8nYSTVbt0yhD2RV1Zv0iyKs0dx/UTadJYaip3LLXziYrrutVgAcjxiCm6MdCq9qVGcDPvJYMCKG2TIIfQzG2N3+spdRagNjhuKiUtSSSGxggEmPV1FBssM2cXZMSqFIUXZGQcGKmZVFqwPw+oiM0Lj/I3g1iz6xnW5/EC0CNqND78wGnqDuvWdgovHrETYdaClhxgkXJ1S1bS4ZTYAPipZAawLwasjaYAl6KDmjnJ5lWVdtKFSCDWxqI1jUgyoydga4xx7fSW5IAdboZIsYMSoDkqQADS1sI1yV0nUa//AGHmCiJdiAbbg2NP78zUHqHp6aeyPiOTfpMg3dVIyE59hLIUIxVWZD+ZhUi0BbUizXIm3TJ0KrX2j0+dzEsuuyt6qAHBlUwRiyljd+2ZOhbK1ChyMc16S+mbsEVvm+ZCl9WkA42biveUoVWUDBIysihat1VB+LezYvUf4lJqxYckijXPvFTsVW1YHC+olrp6iDUDrOwXN+8igu5m1gacCsYB/mUpIplNgA/UycsHU/mHGDV7wUagNIwDnyeZNpOmgyk5+fH0kLYOQN+Nv2iGodQlRpoihdYmgXOVNC6A4EikGDAArqxki9iJTFnA3YHyKv8A3FuEKMNdH5jmNN/y6W9cUJNS0UuenpOrIq9zcFJUjgjaKkokWVPJEZIDBtwQABxIp1p027AGbb2/WUylcAZG/mZAFVYlSxu7E1Gu6BbfDcVIpLRvSqsBtsx63Fgk539YlUKyg2L4PMe4A7T/AI3zIAUvdkHIo1yfWV3EhgK/aMFWXuvUdgMkiMH4qq6rwauTaRqSCpU4Fzbcnc+/Ex+OqxX1MrI+EEE0RJ1KwSCTV52G0o6rBQGuRe0SqLyCF4FcS1NAUQSdvUSNI+5iASTfpQlKWK6aa9r3PykK3sVJqaAKAdNlfJEiiqXtOceJt09gDYqvH6zHd9RFmvlNApANgkg7zO1lWwBGw2lqbGmvYyFBXH0a+JqNPA3H6TO1lS7x5zCV3/l7h5hJS/RIcxbwn2V55VwkwuAViEUMxGqFxQuAO8QuKFwPD1QuKFwGHcCYgYGAwXJJjMhjmAxBOnic/Uq9psT6TDqdvE08hzuw8fKpydVhsDgcTo6jHajZ8+JydRiRkj1zNIHN1m2APynI7Cs3Z2nV1LVb3OJwdTuJJINCyL3lm5usQzWBZ/UfeJwdZgxIO/8A5bATt6zH1uqxOPqZJpWXHxTSNfLj6p0le0H9axOXqFLv6Hn1m/VY6aCsayQB/U5GY6r/ACNj4txxLciMeqNIVjv5N7TmLswolqLE35FbTp6h16izajVtR3nJ1+o2l01DSt7UCxqU0R1mSgV5xvj6TlZwpIodNLrUPHma9QHpIAGs0O4c/KZMxJNKX232jNnSl7QAA0fXjEnUujPTqzha394zqSiVZVr4TVrneQ2oqQVYsw5tbF75kUiZQ50KbVbxxVb+8xZiCEQi72mzOSp1sAK7gTII/CzuRXzMmsqNQNlvzbA3+k5yQx1KFY3izkfeJRP4nU1sQWVMrij6AzNiTeTgChIrOkzKwIJFgbHgTOwum0zvtYGJbgtZCMN+/wAe8xLE4Oo6Rmhg43xM6infT1X64bmZMuldXN2CSTDX3E12Nj4txJbvvU1ms5kVjWX4jNYJJzgjxUjrOuKYfx9IdTqEBl1YF2fJmLWqgA2SKLAfxMrWVpaguK0r5HAmWGbFViq9xLZjdBdXiZtjJVgKqsWM7zO1jUkgreis4FRUrEBR2jj+YNZGmib+WI88t7i5FJm3aAoPOw5lYsmzniUVKDUM7etzMHV1NTEHSLIvf5yKMTQbIAv9omAIN/FwP5lFjk5scQo8IfRpASDQGN/nWIDTZIH9wyT+ZsZgOSAaI87xBOk0DzvZzBSWG5onB9JVWbY6ud/4iLEKV4F/MyTNtNijUgY4pTsRGdSKBd4+KoWcgKT6GSC7deAMj5wAGLWrO1SvhIsECvh5ERypFZP7QB0CaXjMWR2g83XmV5th62d4wNIsZP7wBCiDls7XIy1kC/XmMdz6idlsj+IxZBsnFVJBGjg7+vAiGwsZGfNYl0GawtA8+IrNZtjWYAxoyYBSO4n1EBsT+U+u4jrUTZ1Gs53i1WEjYJJOTv8AKU1Y2A9DiJjut45PkwKlEFbV8UWjCAA2AVf2hgtgCq+Z/wBSs93bfiPSVP8AiPGMSdVIS0F+HnapWlWpV2HrjaIi1qjqO14xLU2eKrNneC55Znt7FObuvM1BF5O/mLSFN3eB/qJRrcEkdosjcGJWFgi6BN88SsNjF8CoZIG9gbSiuprC/wD5RHiRQVewH9axLUrkgnHNbxC6rLHnxt6Rqc6qOk433ES5CVKAJqydyZSsauzRNj1xK3Nk6sZowYlLUVQ52s1JUGK4o0PviTdE4oHxAjStA6tQ3/1KW7YaGOOYHEgDVgCqxKsAG1oXtWYEFCO0qK2xiPuv4WJPyxJUYUE6V4PyIhlCFU7n6yhZABNYzZjC6aO5x84lyGoBBs3n7qScjUAGN49IwC/Usm6FkcH0uMknHIG0m1WEaZSDg+vEYNBeyz9alC+oQQhrz4iXYLRNb0N8RHil0Ek1fg1vEUoA1m7smMEl8jtOLveWBdhsms0d4KkT09RU2zZOCPaaOV04NSHJFqWB8nAvEYH4aCjdj4h/UWrwbGtIVb3H7wqzgCtxHZqlXVW0CNNNRUH8ti5KpBisrWbArf8A1LZQaRcr4vG28mz/AIks3nGLliyADW1HMFYhu0hF5OwmgoEkk+P32ioqNV+PW4v/ALOtZIsCyPPp6RHgsEkrRI2zKBUrR33rx6xKTV91gCXp10R0z/7eJK4kY00l3WwsCWrJk1kbeTJWz2kFuSK3x6SlI1E6ewirvcRLMLgNebsE5uCsW/MaY4Ye0oAMe46sZzAuQCt454s1BWG5XSKxnzEuDQUKvkRAHpoCDqJG+3yqV5ADH3knhUC3aBkX6xhlJNrWdq3z+0CKrtKr/i1WI8/4nUeDYsXARRVSNK5A9cGSSVbQDRvYczQMdi1AYNtuI60pqvcD5+Ilw1YE5bFnf+PnIaqNAMRwTkfONe/q6mIwLK8e3pAEkYB7QKER4CQ2CaPAI2jWho7FOQfIGJWkmq6Z/wDYcRd1AHUSMkAb49JNXFqyG2PH5qi0V32N8E5vxBbLYHbtereUF/EbJDHmjvEoumzMSdbEMcEb7S3ZdIogEeslmZVK2NIGSKGrHECv4fTWmslfiH9QCsKcLpU8j94FVbqdumiPOTHyRRaxjxBlKgHSUU/lIFj1kmAwzfTrOBW5uXoViEA7b2vG0g2ARpJdhi7Fi5ojGqJG1G23HiCkMdFIhzfHM2UiyWJyTj+ogmhdeqyRfn7/ANyRfV6oJcWBZGKPp6QURIa9KhyNrOR84yQwIJGrgEbQDMQBRGkCl/3LClyNPTb0Ycebk2mlaCINA3G3cBv+k0DJqJrI2Pv4kLdAUzctQwcekpW77rsIrfcRKPRQDmruwWN8xIxZWIZiCcH5bSwh6nxNqYjg7+kCzKCoYaayRizWKiUrqFAAVq7xnH05kk6bChUW91/UxUemgoh7UnUAMelTQbkKrHG/FxGQRS9qAAR85QIprSu4mtOT/qBB6YBKMgz24sQ1NpB0kuRjcXn1k0L0qzBUrSOODiJmKDQpyTsNzNFJIosFxRs8cCPTpTUDmve/H36yKSlIbLnk4P8AHziKrZNBjeAxyILfU61lhqFkj+MbRgkgHbSMCRQskFCp34Hj1iQDSnYDnFCwN41Q9RhXTb/28YjTV8OWPNDfG+JFoWGRrYDu4Nb+0oLXcTZJwzGJWJa9lIr4txNAPxGOptRrYHjxIpI6bFgxtjZwR+02dl0CqFYv73k6io0ggjkihZriMKemgIOo0STW0mkQpWwAi3x+8YCs/bVEH3gN6pm8e800lV1aWRf8cYkkasLNrQJJoDeVo1EKpoDjiLIFlSWO12LlqSVpmAAxluPEigj29q4s+N5v0yC+ptuP9TLTpXWOR73KA/E6wLML3I8+npJpHijpAYjZb595eGBDGvT+YlyeRQwolgaqAQ5/MOJnQlR2r2g5xyJspSyazxje/EzFgAaWc+g3+kpMtZ+Gq33EmpVX5ruzYvP1grtRYMTnB+UsIWOTqxwf0lXpFXjk7cSLRTJXTYO3384sqxFaR6ffvJClEBGTW4FfKaA1wSfbmRqaFq+0DP1mygcrVk1jeZ6dIvSVH+Mvu3o6jteJNpVqoD0FxX0lagO0GiTBVJAtgODniWiUuq7xMrWVa9Nu46ifb+oH6yR3Pk5Auv4lhiw2IriRazLVCVnhD9ISdD9BuF3JBhPtLz67iuK4XAKs+Y7NSLjuIzs+YwTIuO4BVw+cnHmERKv1uFyY8eYA7NXDYxXmK8wAuhIY+JV4zM9WMRhDEAXc5+o1EmzNW8kiYdSid5cDDqZFAVztOHrG7sV4nX1TS15nF1u0EXc1gc7sx2zwJx9VhpDEf7nT1fi05xuJx9Vh+ILYgnFS4bm6q6mOpqXecPXOnVTkkXgbTs6illyNJO1mcXWpbFD38zSNPLj6vUAoUWIF6jeJx9T8RS10TQOJ2dRFUgXnczh67WxIwBi8YlOT5YMSrEqNLH5frMy5XqLqFjYiud+Jo7alJY4Aqx9+Jy6iHIONdgscRtGfU+FlBOvk3x7TIqqdPWHFsbNb/eYwxdlHT/5CQRqOMeJD9NQSw0kMcLcdOoDBSCzOVUYNHMkluovamkAWQ2PvmV2M5JOkKaI/1JYqOmCKJPj9v2kIrNyWbSyAodif3kkuwod3AFc7bQ1kGg2dtN7+sjqAA6cn0+/WRWVHUe0BINXRrn1uYEa3y1IcizePu426qFl1PkjSF3vEzIbqdK2AQsAFszO1n6LqNpY09kHi6mX4wBUUWoWTR7YEqt9q1tq8/PjiZ9qtWrNmyZn6Y2l1D1FBJAsi5kTVkHSbr7MfUbJokVjfYSNWq2Pco5uZ2srQzFTlbzRx85zscMtHV7/xLbff4vzGZk6tIQF7sXew95nWVGmlvUpJonGTMzXJJC3xv7y26YW2FEHYXF2FrugNwB/EypJ7uolqukAWdViSQxwVBXgn95oaCCuf09JGrSeLPFxVJHUQQDf34iZu3VpyN42UBqyeT9+8gkdoLbjTUki063omhuLNxE1s1+nBj0nqJZAUnaztUKUHYe8ihKt3VTEgXttAhwcgXwJekBh3UfXaSQPZar2ioJQQLoIdscx2bFj0iJ1Lq4A8xCxe+bzIM9I0kG79TxJChUB1ZY5MYpqVba8WTUZVQSQBXCyQgMA2SSBzRjALJ2rVZNxgKx7tgfvEoBdFg37QCSDsQCI6JG98CF6WrnargRpOQYHhsQRdHfOIiNTDNKcj2gGAYWd8AQALoMaTsLO1RDARTYa/YbxKQKoE48HEdKNwK8+ZQADVebJyJNqsBVlN0L3AgBpyMGDZs7AfoJQArP5cXEoLd9wu8eebhQyKIJ5J4ize+4ydo1OrCjVqxZNVEolQBb1ZML0tZJoc1HpHcRVXgSqT2ANV/qI4Shn6eFrFkGOjYFY4Md0uMn9oClND2q4lAXWLPEe/5Tg0YiuQKN8+v2YWA6AtR+HT6QVg06mq6U58wYBXwdtwNoKupRfbeBZ2jAC7hRxfn+ojwBgoUUTi9to9PUBsCycgR6QDWob7mB+LAqojkAwbAoygSDkXwYhTjewvMNgTe/PpJq5Dr4gLvfesRqBWrWDqzEp1Vp77xquv1jPTAawRXAuJWBaUgWcSlBZcLR3OrEMEmjWk7Su0KDe8SpE5O6ijsZS6sgGIEI1XfFXK8CiB9/zEqQ2+CzePT0iKB+oLYBeAYCiVJNE4A3jVdaZXTwtnbzJVIbb4e64iViAo7mxZsHH3mPC5oV5lqqA1eeb8wVINPUQ2ALO0SmqZbBjPcccYGdpQOoXuFHmJeGCQ2VvYbfOL4iwruPk8RLjF1di/SMWxGgaibW/ERmFpL1LZrjMQrALMQt5q/lGyAMWFVwLjXQxP5QpyK/iB4E1OtqumxZDXA6jhhana5QIVMZ4xvEraec7V5iVIoBgMEngfttHq7SSMjf8A7iK9wA9yPv1hqFqNdXShZC8MgdRxkBTnOY2NPQb5AYkqp6nTsqEJ7VztKwoNgeC1wVIFcArhm5JIOJWlxZoFtwJWhdVMe47n73iY6thSjHtEuAdvcpo7bbyx2kWDW1/rEp1D/MAYIP3xJW9xzYJ2wYlLJAJUE6j5MSqAmouLNe8nVdBO8m1yarEo9NQSw0kcLAECNQstQvJHHiUobqJ2ppO5Bv8AmMKpbP5dx+2JXaqXYN+N/vaScg7jggEHaUNVf5cce20gMUcjVR20k77Z+s0IAKijnJHEWrkMm+kbBsb8XjzFpDsBqpDtecCIstoWfTfaBv8ApGFPV6dsFTFLqO0SoZOk0Gujitj6Ro2kIKZjV5B7fvMShVBsLX+UvQivls3ub/eSoV1ATgFjsLgLVtXwnz5+cGILkgEAYHpKU6kuwQoqwfTf6QClYrVjGBjP7Rbl1AOs+shTkUfivuJ4iDFiv4d9SyVu6048wU0VAF167JzdZ/uFgMLZ9Cg91E4+8R6FBZgFK8LfMpdPUJB2G4v+IlBdfVTsXRfc1gwJJPw2vEq1Tp7771JVtGLycab32/mI1rdVZKj29tvpBmvp5U9mP08xMCGUC/JF7/ZMNYBTW2n8tDMlRldTDupNxedvv9YMdPUoNdHYDBHrJVPxOn3KE4WztvKCr0wdQXAy37wMK6qqLpZzVmwe37zmVo6isTQJOVGZQ6aq/wARDXkn+4myxIBCjG4FRGASBqFg+fM0DFeCV2wL/wC8RIda2e5VHxX6enp4gp0rjGq+7bBkmeCzgAhznepSKF6f4gcWaJ+95mrFio6QLnK6r2x5lnoqCxXTp2C3zJqgtarZm0i80T8j+0vpluqO1NH5jY/uCqjHSe0LuB/UsFQhYMDZ+dfxJpUWw7Sg0HIPFzRS1YJKjAGB+n0kBij6bo1VE+2ZZUClo+SPnIoNjq6ZsG19PTzGU1MDq7dxm9vv9ZOte3U+nYVvzKRS/SGpQh2XUciRUqNB8PkHYDB9JSsKRQGehZwe37zJChFNhaG7TVemAfi7vJ/uRTMp1PiNEnIEE31iww/X5xkAuaB7TQF7SkGtauwBg3JSrIIJBI2jK2zKNWps+JKb2Bv+b0xGGPaOn3myt+MeZNoV01H4erWLxxmNTTZZiovNfpD8MKSRWn/G+RGqqxIOK3H+pFqapS3U6fauknOblaTQBAIP0jBVVBsE/sOYatJo3dVUi01KG8kqMC6/aaE2mRtv8pBU2oJ9xLBrTrahsBItSen8RxR0qRyb2jK6Dh9jsNqiVS/SOpQnAs7SgAoN6f8A25kHQrAaQQWO+xxL0upvGdhAKuqtVEk5jJt7zjxsJNSa/wCYw0skruMbE+fpF0wWo3YAxR/r3jU8jmRoMfEwF2cjNS0Q6NZYZzIVrIC95sjfaVpF2K9rkkpTmmZqW81NVvqClWucyAqscigPvabKqhbxcztTTF1RUFZqmFoZraZjsxdE4E0UEDauTM7WNaUfwzeKjZLIyAp85k2KXuIG0pQSuRXAkIXQH54RaT4BhJ0PvAYXJBjufbHQHHfrJhcArEdiRHEFYhiRHAKsQsSY4A7EMfOKEAZ8QiuFi4gDIO9iUTMy2cRhn1SJy9UjTOjqETk6h3mkDDqnGrf0nF1SNZJyfSdPWIr3HmcfVbvPpiawMOowoMN+PScbaUwBm50u9CxsT5nH1G2rj0zfiXAx61su1f1OLqMgBpq3xWZ1MdIJ5/cTi65AHbz6/pKjTy4uoA2qqsgZAnH1tIDdNdNcmrHtOz/5CgE1kc0ePWcPWYUzVqIxvLjleEWlaQoXm80M1OXqKpCkAELwRzzL6zHWt/G2BR+6mT9XWxDXeogZ/SNqkMpLULFEVeamD6V6hJOk3quiQo+/3hpQ0ALrJA2uJm1Ve9DSwO8VFZdUqVADBwF/x8evmLqBB3EAAUQCv8Siupid/c8fx/uZGlBLBvmd5DKpYqX1MN/G4riQxUkMpOc1W2L+/aJidbqu2xP71Mx1CFtTgmpnWNqSEQ0FG/mT1CG6S2prBu+JPUZDR01p28g+JkO0Ghlh9RMqz9UmZQvxad8V9+Jic67G43A4ldQjOgnO4B/S5DL/APl6jkTP1WNQdNMgrPNQBQGguk+eBA0qsQLIxvIPr8RwBIqLAyjQNsZr1kIVJwOCN81L1WSrb3QozPtNKB6kSKzpMqjqUb3u/Amb1pFNq0jxvNSQfTGM/pJ0hrJP1NSCS6qBqoY2EhtOu2+/SUwoGww9zEbLlR85NIEDUGGLyBWxk0iihRzKD2LA5qS2ktecbe/iSWAgMotTVb+ki0AwdO+KjFLsMkc8xGq7TQPFxESi9VVtvUWO7pqBnc1KoqLF/wD4mKhmgWOOZmDUAYqv2ksooXxmvWHORZOJQYsc73QkmSnOFJuxVySArd2M771DSMAKPJEZyRZ4wbkjCNEUCDQgVFXihsKhV229cXChps7V53iPBjWWYXnErFKRzmvWTuxC4xmMMVWwMXUSiChTsCb4lsurpg6TX8STpLaqIo/MHxBBpvAsj6xAAoBd1uareCg2Tvi9o6GkEc+sdUP8h5uI8GlRqVSM7mvTaUujYdt59pJI0nFkesDmgcnbFxKVpBGaBHnGZS1wL+cnXbURm6+ckIAaA9ageKOlWzvd+0D3DBBoeIzTVnNYaCrbm8+5iUCF0ajsKoVHQZ9TC+MRDAJOoD33EeSxVR84lSKUqSGHIse8KUGtN58xdNtypwCN49KkChtfjB8RLPSH6YHAAzBSoB7q3xWYKNO4yePMfAKH5XJ08JAKNUcbgcR9oBXAJ5rEZTO2r5x7AmiSK5i1UgXRq0AUT9BGQCAPB2qsyTX5jk4EvUG384iXhrRa1GMiIhQ9m7u9tpIUWBp3ya4MvFDb0IMRkSNGCGxyJTqoWyMACgR4iA1ZJuuCYUALII+dYk1WHpBYEi+PUSwFNEc5rwZO7EL4Fm40wLX4RQu4lSGFVfcmUVVumAbqhmJgDRqgP0PiPpjSbAsn03iXIF0jY6d8VGBltrIwQIEDdT75/SMg7kE+xiMUBfTXSLOSBKGkGtIB3vxJwFPJAreBORe+wqCpFso0gcA3nzBavCnnnMA94rINXckAWAB6kesSlNpDWRzftEa0gBtQ9t5RKkgCrrtP8frALqJa/qYjw2VdOqhQAIxmCgF9TjmvUSapeR8+JZvWQgG2ZKovDBWU1fFH3iRVUEYybko4Atbq9Ms6WyRVfUHxEuK06kA04rfzEhUbNW9YyYksAkDcHfmFhVwT6i4KwILYnFkYIErC60GmjuQLH3iB6ebpj7H94doDfmIFbyVNECigF0YyeBJKjSB/ibo4zFeLbJOBUvWMhuDQiM1A1Gl8gAGJkVepbAgnzwJIVfhAF7kTS1YKCax2m69hAJxpGlg1Dx9/dS2VPwwaFKMCv4kquo73XrUYUcgjGbPHiLVyGNLPbAVt6rLNHS47bzVREaWKr43gnU0KdNgA1m5KpAoQXgEkjaaMurpAVQFZ81IOls0QF81YMOnWq9OXv/8AL0/aI1qUXZtNk1jf1i6YDMSAGsYpYELo7TWri9o9IFUCfY5iWZ0jUilQcW1YldMdMHTWnyeBUghQG50it81GSV06sk4G8RKbpgqBigeRWdpaMv4hAXyKB+/EC9kh7NGhm+JnoUkBReSSPWClsEHU7hWQfNCDNa0raqvj7+6j7WCg+KVr/T9YBQ5u7IoUTBQZE0F6GkAUCJVBn1dQDwKGRJA0myGA23qx9PSM3+IQnjJ4OOJNNp2sFcHfNVsZK6VY4BJIO8leppQ6Pg1BeZT6WFkfCeasGJS27uiKU7b3xcSFQcPpyaxv6yU+K9Atrx/kPEfaqnSTncXAz6YVrNAlhhgvEeF1KNNmrYDH3iPSL1BSR5B/eGArWNRVR71tJNfTPTDVWg5zwKg3TBTIsKbyKztIN4LfF8Iq8fKa67JD7g0MxGalSx0qcWAAfvxAqqPkZJBGNvv+ZGgYGkE7sBVAzQaWVQ2MdrX9BJphmUhQHVt/y/WWyJoDkDQoFDTmSo1nJJI8n7qUqhTnVt5qx9PSRRT7W6mp1BG2N1m6qG0uBV5rwZjRHV0qNhvxtL6bkC1woIXJMmkY0ISNGSb+/SaMurpUUwAKN+DII6fUwRQU87qZXTBBvSAWvf8AN6SKla6QbVtOTWN/WCbkgWSMECLGnBwdxfMtkCgUCfNH95BmFVAyDSSatqxL6WhcBdNjJzivsxAKFNiyo8i/ELur3IrmTUrZRpo0QCT85aUephb3FXFq0nuGxoGJlF6QufzCZ2hRVQ+RRsEDxKYrSgOG34gNLIoIoV2m/wBI1UNkn2zJpDSui6AUAGq/bzLCqz2wHj2kqP8A2HrfE0rS9KBt5wJFoaLpamGCTdeIwACSavBkKSAdIxdZuPtcUbNfoZFqWukMgCq1VuI1038WnJq5HSUg6tPxDnn0l2AnbzxcmmFFnAyRihLpUJSwNQFkDEll5AJ+eY9IANg2orJ4kVK1VQtUL5I4MbLXyznGYshRq3qppfdpbzUgGgGvHqKBjZVDZFZFekz0jK17iagKwC1tsb/STaRgqVpSDnxvNQoZQT8NciQqlzk5HkzVQFHOB+kztRVaVZ7Iu/0mwUYO1m6mfwtS4xLViMrtdTK1lWigaht7yqBXA2Eigw5/oylobjJ48yNQYrNQj0JzY+cJOh9sDHYuQc8RihPuOOgXniF+ZAJMZB4hgVcfMkGOIHCKFwCoXJ1ekdxHhx3J5hAYqhzIruuVvvJzeIDC8+8z6hxLOxMxYkmMYzf1H/c5epevG86HPgWZydT4sj3lwOfq6qybPM4+tYPOeJ09TGQTU5erZPm9h6zWBydULpHDX8pzdRbYkZOZ0OAzWcL7Tk6jU4QZ1A8Swx6rENYOBjO4nD1jmwFxv7zq6ucE6udtpydbUBnbPF5mkXHJ1NaigaS/PPk/fE4uojknFL873/3OrrKKBAzx9JxuzBiCxDY+/SNyvDlKgkFhYs9xxOcojk6S5GqhuTdTo67KEpBfhq+6mAUL09V22Tt6evEbYmU9NaWwDi+PnMCxquoBYFn3lN1C6K501V3p3GOJkRm0w136XI9JqDa9Re1dS8jz5mfURylMxL5ySd5Tf/Z3DuAyazMSGCUGOmr/APaZ1j6qXVgR5O44mXUC6dJwSRjj5zZjZz3XsAPlic7LqcXSrvVVzI9X9MqnRZOnVdneQxYPY2UZDHaPWdYVe7UORVzPBoGjsdtvvMyZVPUwQ1KxG/vtJAagBYQbj18y2sAk/DV7XRmZRWVKGeK9pFRUaGvah87kAYDEGt7abANZBJs5+/Ek6WWlFg7Gt/u5FSzKr3HvPdjzdQKlE5C7enzjUALeq23wN8SSdQDGgK3r+JFRYmz+YbfvMwDYFKCvPqZekbrhrv0uID/kogFqz25k1OJZWKWSb/8AI7SCrLXnepoVpDpJr339IEZs9xO3vIoxlSgeDYqtvnAL3YF5OD5j06ms9q71XENRHU0L3ar3EmpxLatVi9Kije4kMNiQD5vzKIGAc87bQ7gCKOkem0iliFRlAAwoOQIaT4x9Y9IoV6VQqMBtiTeK/qQeJVci/wDqAUMCRq38ZuU1UAov/wAuDBVAXeycihJp4nTpHpt/3Gpau+rGfnHqLoHwB5qAUVYwfasyLTxFHVVLY2rzKKtVkkt84BTqojNeIlBKkZr94hhFDg1R3qGkackg2MD+ZqctZGq9sSNOpqOF5xmB4a9PuO5zzHbat8cgnMnUR1FUC9XkQ0rWT9OIjwUMHSGIySfMaqyqKwOeMxkFTW67kb5hpHaQKNYrA2iPCKNZPHzxEor2vcyxqyPaozRUaFu+a3grElQSa1Hu8ZuVRUfmA2uAUKLuyeK3xCyVDGgPNRHgW67xtn5xBSpwq2vPrL0gHtGd/STRL0Rms9uYlSCmbe7s5uGk4JHNkcRgaVx8P+5oBmyNR4xUnV4igFoggkjb+ZSpbGrsfvDSGYXYB8iGrS4UZv0q4jwzq1YOBve8CMg0DyfeSRjNHY7bSqIwa0+3MSsCBgAB2gHOcXHpazXw/qIgvaun5Yq8S8nVk8f9RKxAU3TLzeZWlTZBYi69blH4exb5utzEFofFd+m+IlSK0FRs2cXCmoa6J3+cQJdQce9SgtgkCjv84tViACrC1AI8eZZDFaN6idydoBe4WLat6zHpKo2T7+ZKpDZSAu/tAgFeRZ2H8y98mz4FcydIYi70b7bxLw16dkkWffYyiz2KuhvZzC9PUCqbv03hQOGzzttA01saVtJs45loG0gXS3nxfmKmAs7b7QCqStDO4A5iUYViTjHz3iRe7Ix5MsBgSCSS1ffpAgMKUauQa3iPC0pqYjXvXrcvSVF5rYyVA0glrZvT0j1al1Y+niK1UhqTXeNsn+IgpsCktc/OAUDuGG3vi5QHcActXiSqQyHZcm21cn5QIOODvUSrilNA3f8AU0BzZJJbZaoEwVIzKqFzam9h/MtUGskWTzjFwCljR7V3jDBX0A6tRIGN8xKgOsMTWF3v94HByFxlveLGzU2xwJdOD5XxvmTqwgcYGFsWAefePQ2o38PzwfsydIpK/wDx4BxNE1VRLZGMc+PSBoVc2RYvc8R6VJetdWPN3Utu4DSL8HyfsxBQFvVZOcD4sRBdHprkmtrv94lsiupnkgcydX4iazVeajCgqSBpbfMSpAFa60qCLOPPBxNCrsCCbYHm8SQLamUa6PH7QC9rAE6Tf77Ras2VqXfUawNoaV0U5IN7D+ZYpm1HN7LVZriIpqbOF32zXMRqXpW90SfXYmM6wb4UZBOfeBeuppFHUSNt88RMAV0nPO20RmfiB0qSMtfJgodVoHSLzms+YUyjB7eRV1EOmp0H5jSKuBrHTbWf8fn98yVXNMLW9z9JahidOcgVj9B4jNMKRSebrcxKLSja7LGiLwSbqaBSg58Xv9ZAQKtl7Y5wN8Q1a+nqJAq+PERqQto09QLtmuT5k0Q4tVsW3jJ2NRhBllwTkniPSdah1t6PGZKlFeowIZizatyT9ZLdNu28HHbxGqmiEJVTZOR9JoOCc3kCqzEaNKjpnVqBsbfzU0HSGo0GsfQmQV1t4U5IrJHMvVXVCg6tRIFjfPH9wMEurige3fUc+8CBQYqrEZb1gFVlCtRBokVt91KIZGoC132sgxGSagKFKtjVRwTnP6RjptbH8uSd8eskdNQEIHtQoN9ZoFYk6mOojH8AeIlM0S9xYvc4mgVH10zMLF4JN1KOlgAg1XZutzzDpoF6d67Y5wNxRkUNArJ0/wA1bFr/AHiUGq6gGLJ5+Ykq/wCL0tfbpF1jxmpQ6Y7iva13dYMmgvhcEqtjPz4xNmDkEFtT6tyT9faTnWA4/wCSjxn5RqlK2ljWbOPO0kG3Talvc1gbR9ugg2Cx4/maKRdkWTkLxfiQFLt4TxVXM6lovSH4hq9V16Ey8hh8VLggnPvJ1fh9UBTZb09dhK0jCtRHgDIqTQZF0SFPLYldPWOnQNLyPJ8xBWux8G5xeZSqtIQD6AYuTQrSxJsUps8yVXOxKg7tiWuonSSbauB9B4lkLjSt+tbmRUkFQs1FiLF+bl6GVQe6tv8AupPTRdFlrb0G4qUGL9PVxnNfORRTUUKf3Pr4MfcWHatizjzEALJApjkniWobXTi2zx+0ikrS+bOp75P6x6GVRqFMeBtACidN6c2f4mq1hib8CufsyLQgAaCDYvxNF6Y/EwLN7cEydJZsCh7S7CvQzZq69eJFJR16gBdKMg7+8CNrCsBvY38RadlPvVbTSiKoGuRIopKrhauhY1AGrPvKCnWa23JzJCgop28VgTQAg0dVt6fpJQkLwQSAdzLVQSSCasX5lUuKW+b8mPpquneyf1xJBjplckH35+ctcDv259ZCseot0BLC2SRZMi0jUmxgeTN6Yrk2QZmqksA4Gr2mqqb7SQPMytRVaLVdQAJ8S8BM2IwBuRvwfMenU3gTK1lV/h5xk38oDUG5xCwjDTyfEdCvTxUhCqHJzCI3xUItN9oD5hXiTjgwBn3R0KroeYA3vFZhZ8QBmo8ASMyhEFXC5Nx3AHcLEVw1ekRqxDMmz4hmAVdmLVmoHeT5qADbYmLG5oTY8TEnJjDJyMgk5/WcnVYHAudHUc3U5OoTqxdmaQObrADfI/mcvVxdAH3nT1ANJsXeBc5HK6ibo71NIGHVZWTx5NTk6lrYABBFATd2I3BNzl6h2UNnf5+JpCc3WsErm5y9RkU2QxORd4nX1GKDUACAKnF1tXUFscE4C+0uNI4+oNWRYB4uq+s4H06rwTeT+87OqGZ8lsDSu1zj/wDlaBY0ccRuV4YN1AGIYAX8OkWTOfqKXY6Suph9iaOvZS2V3MxJBGsah4rmuMwrVn1CWXWR4AI2MxJVrLasmqveaOQzkmypHPB8ftMn6j5TSARVzP0ioYo4QKWFjk5mLKO3UbvayN/lL6geiATqYEEjImaqAhJ7qFDVmZ1j6JjpUhVU+jSOowbp42/qUApY3d4vEzut1st67zP0zqNOiwACGWgPA+zM2tTpo58zRvhCgtnPpfiQdXT7wtUAD7zO/GVT2AktZJvN4kBbAq6PrVTRtTEltt6G8zKsWBYttpF1tchKAFBsHPJisajYC8DSMy+oFCmlwBWPMkrSkLm5FSgr+IxojOJD9wLG7oZE0BByAfcH9JHxWc1X6yaTPDG2vejneI6WAC3tyczQM1FKFrWZDK1ki7OCePvEmpxLqKGo36eT8oZC0oBO1GNVAU6hYIoXvEoDNdG/3kFhNTDtO0nTQ47hVCUd7olj8riuxWc/S/EgmbdnYLzjmNdOrOonIu8R3o7gOO6IhmHFeBIpYkLgb+11EuCSCLG5j0sTZLVVDaN1UA2uKzIGBcOdQAscDMRGpiARZ/SMr2DSLBzCwTeRX3UiqwmyuoqRisSRmydia33lb21GiNvWMM1FaAK4kHInFALqs+c5hpAUWfqeflGVNnusm7raNVATutsVkxHhbWAAfePdaGIDSX2N8jzA+oJJPneB4K0qdiCKHpJY6TpzxdyuKtsjGNvTzGSwbWFvz7wOQAKDyx23xEE1Zs1xGdTtnY5oRaLoWaGBcR4KUNxvkywe42MEcbwZV+HT7w0i6zW9QVg0ajd1f6QIsaqO24lYIJ7gPN/pFd21GvXg/ZiPECmJu9Jx7yqVgoXUMc5Nw1PWmgGWoU2om7JwTwZNp4GQBbJsevn5SvQKpPrxBVAUmiQBWYxpZrIzgmSuQyRVX+kFXT47hQEeBijZ9YqNUCaP6ekFSE3YSosbCowF1Z1Ftrv95VlTqAyN4ZZsgVwPv2kqwlUY3r3qOhrNVfJuLSSRZaqobZmjBRjTiqMFSFdNkDIxQj+MmjZP6XAL2YFjmFA5zXv+klWA5ybwKxAUWLMT43gdLDVuKz6GPU1aKAI3iVIWoNpC6vn5llABbG78/wCoirBsE6iPlGiAKSw1CqFxKwxentAb3lWClA+8SqCaog1mFm8rkwPDVShwAQcVEQFOgA8DMZIA0C/49oWy0wGwzBWAFQ1kkng3j5xqoaskX8v3i1Ows4HjzAK2CS1DA2kiGukHixuZQamOoDbGkZgQg3HoalAdli87xarBpLkkUCRBha2dgKsRgg2cj5/pDLG6NVm+DJViVpjZJrC+8qlZVA1fPzDU3wUBpEdMGJBOo4JAx94iWZSt7I8EjPiM0AdIHz4EETSPIArMAEZ7Io1f+oHIrUGTGIBdIwFojTpr+4c5BLHG9cxkitOc59AfEleJauma7s0OZanp6slmO13i/WLUyd2nIHd7x07Zbngb/eIjCqCbFi+Lr74gFUNdjUDk7RBWsWzUAQLoTQqgwVrFEwMw1PTIACPyjMNOok41H/qL/wDzpb0tv9IwQQWyoB3vxx9YDAbYaiD2jTqEBTNdnSTXvGO5iclayCdjGH6mn8Ou4cyVwrQhQob55N3KZAVF2RfJGT8oirq1hjqOL4ldLphUo2eM5kqMWopQCfXxK1BukKOm/T79ZPYzA0bqOzYsHUaG++f6uBnRTI0lSumhINKdGboCjcd4C92fop8SgWSnC7Du+cDNfwwwssTtd4+cFUNizR9a/f5R27sSar/H79pOlrGosAAVAxA1KFDE2A3M0XBoqKIoUMxOFDaSvFN/UAtJi6OSK4raSoMockg0xFD0jYHTZB7RViC0Tq2rY344gO43RK1kHj7uSZLp6jEsSLob/YjtHChFdc7k2bj1dSvwioDDmI61Oru1nBIqvvESlMi0C5sE1RIz9NpS9oNBD6N4i6XTUDNtQ058xqFLchiL2iUu1bpgbGs49P3ggPTF4K1p01ESdWQdR9fWH5dNnP0U8CASw0HRnIoiWo6YddRZjdXeNuYWyDWF7gO4+8ZLvmu0nYRGXTUOLBIB4uv3+W0FC23w3sW2i0takswCWoupoyqo0lOKNeYqZo9P3BfA0jPE0/DD2SQGI+n053kIi6eSCO7HpNF7u42oHNngbZ9ZFAYakJN9o06hzmCsOo7FiQDQq4LTNqNleQ3mWW6gUdIrTgff/UmmXYyKq6h7mzcvQoTU5xtkjPjbaSQ4ckFtR3Iqpp0UULRyqihci0jGxoL7HOJakN0qBrFHGMD/ALkLoZhgihe0u6NFSS2319JFSrpkodQoqRpqtueYEBDo7sgAj794xpKFQSL/AP58CMFkAfTdDu+ckKXQGGosTtd4+cpVBUGyAeNs/OFt1LY0FPHMkKzEWXpQQNpFFUgAYkVq2JmooN3DBwCBniKkFDTxRqUq2liyp3Hyk1NUULMTiyPnBxqQ2PhFalEBVXkadiCfpCgXYnau6ZihSrMSWoWBdy+wqoGrO1nmJS+n8PTRjpgbBOrbG0mksqPw8843H8Slwuy+xh0lAHJxWYBVdsgg1cztDRSGQZ4onx95lKAtHFEadJkKSpyDZwMy7FUSc8cD0kUiY6Roo5AB3lqUBF6m9bx84AkAHSNQBJMruazjjHMigKmsC8A7+n1lAAE1XqZIDEi2bSooXNe2ha1jMlAX46IFEYreXoJaxuRICkqALIIzLVgx2oDn5esmhWkaaP5RViCnU5JBAuoZLXkjkS1LhCpycZmdJSlCAAD88zZVCi2sj78TNdQaxeraxtNukAM/ENpnazql+HYE+DNLBWtrFHEhVUitjW00qjRu/NzGsaACucVW0NIXzmMUMCxf6QJogirAzJJWlf8AyhDU7ZqoRKfX1FeYBsxz7u6ExtAybjzAHngx6jZEjUTGCSNogoXdR7xcesLNbwB0faA7QBJz4jBJ9PWBqs3xDXm6k2doA5vMAercneHr5iY5k7MDAExIW+ZiQeTNG3mLtS2cxhj1De/nM5uoSub3FidHVurvacfUYkkG/mJpA5uszBdNgVW05OobcqACo9czp6raloA3+84+qTnJ245mkDHqWXpsA+s5X/EA8KDR5+WZ0u2KLUBjicvWZtQxWaPpNIGHUX8NFIW9vinF1c5tQxyflOpzqU2tHg3yJx9U9QKV7tzis2b5lRUcnV6pBLCig2E83qsw6buSoa8WTO92dbaibHGATPO6xYuzAY9dpTk+GWlwjlhRJqwZzPrDIyjUSa34mwco6sDa16VI6uRYtuCTJ9Nqx/BZmX8TuZbx/Eycau0qoAamaXqcfEvnF149JPUsUyXjPHaZl/WdZa9A1Ai2yPSZ9QsdKCqsDB4l9RnawxZr2xX78yXLspUK4JG53mdZ+mTAnqUosWLzm4OtvR25jawprBo15iDalAJqhWwziR6+s2Sjq6RRAANH1k/hjp9JNKXdfFyZfUvWLAFb+klcqcaTWDe8iorIZJsgE5PygepqN9tDYSmLgabPOAOTzckMdRJBN+MAyKisiSA7ki7xmGg6WJGdrH391KYHUWoj5YkhirAjK18t5nSrPIZdNMTiIdIlh+J3lb/6mrDBGq/UzNdQHctkk4iqUtltOkUDRMksVFhu7cS+peoMp2yKrBkPrY5s36V9mR6JLlqVcA4BzJOrWwFFRVzRi2kgKbMg2p9eJCKR+PScDxcnvNNgKDR9cTQEEAEk8e8h71bc5Eiggv4PTFID5uKqWzSnnEq7UYzWMxf8hBXURngfzIqsTqOSCukSTehmJAPGZeQS1HbjmSbLMdODxM6WDSxUkimk0bBA7ts8SlsNg4rmUa5N8XIoxA6RLL+JbFboQJ7ipAq8mME8jJ8GM4AK2P4Mk8Tr0iwRZz7QJYgLg1gm4NqbGT8q+zKskVRsiJSSCWJGRYxctlOsZxtEbXbccSkyACar9YGhR1CQRSqpzXMap+GoGmxjeNwwYGqowB1DIo1j3i1WAXsaWGsliwrSIWwxZxnbcmUC2Tk348xHiRlGJIvg3GFY6iVo+kO4mxeeCIDtN7ivSLVYBqBUqLJwbjHTth+J3FbxKIAWibzV1xJGrZlGePlJ08DZJGkb0T5jsqAQRna+IMNIBBqv03h3EVvfpX2YHgJZgoxYq6MKOsqoB5lFmZaAPcIro+DErFEHVRtRtUFDmqwoP1jHwgFtvaDatWABkXXESsARURaW/eGzGzR3jU2TijUAWW7Lb+LsydVhq+SV06RJo6SdWxxmNSbvJvGOfWHcTqqsbVErFIrFXLDPpENQC4tr8wBKsKytfKWcLe9c+IlEOkWIHUssLxGbsrpFA5kqWGK5lkHBBPy4MSi1Bc2LORKZnwtj5RMWbBJPjFZ/uMlmSqaz+aoGRvWVGZbAlt8SaIABPrLQ2FBPw4MRoUdSgB2hTvLCjpoKQXzq58CS9g7VnI8S1vTdUc0biPEhSSboE5lDqG8VVQBZRVn6XBb5DEkVjFmJWAXRYkemZaq2liw7trk92qx8o1ZhnFAH2krkOiFUit6MB0iSv4tsReP4lkY3v1PEhSwGVzZ9IHh/FjSMYJ+/lGCRZDdx29I2vDKfXFYMXcxo3e2BErD1PpUdvF5hTFtKaSo3j7j06psir5gCVPI5i1StB/EAyo8QVXNBaCqax97RobQKxNgVx+sHBDDA3ziSeKCjp9IEIpB88yaybpD7cSkNg9uc0YBmFqSwzZFbk8wUaubsFdI9cSRdOxIBG2YLqB2Y44xZlHUW1em1Yk0zRXIOoUeSIZ7WHc1/ZgrEOGGaB4x7S2ogm7zVngRqSvSYsPxbbTeP4ja2JXSlA9x/X+pK6lOV3PHtNGDABgTjNYxJMatIsMLO3pB3Zgq2t+h8xMzOapmPtWY9THp1pbURV836STB1ayqAMo3z7TVlb8QD4V8SBY9CMit5fTY6FBJxXG/vBSVXqY00FDb+RKVB0eipVB/+X36xMrBvhG+cSkYEEVRzRvmBkRv8Ksf2Eper32NOhRt+kSs6kgltySNO5PPpBS4NkM2oV2/uYjIWQ/UY+KzNOmr6WLKL8j2ktq1aq42rEoMVdWGaB8VJUKKhSO43W/6/WMdEu4/F7tF0B+0o1Ro3WLI2kIzBsrucAf8AUDUfiKFFwe7H36RhimdQF7f9wIPay+5GMERszswBLNxtWf7iUHZ9KixeOfu4MG/EKpTDxfyjJfRVPZFXVm/SMWpBqq28yTW6nWu+n7/iQg6tjSwRVbf0l9NiUVWJFV4z7yOpqUrSiwRfoIAwg6PQQhLvfV+0NILMbCE3t4EpCGsVW9G4Keotg6zmzi7P8fOSah1DkqV0j1sfSC5DOxGKrPzi6YcNZDG8GufeXblvxKIxtx6xVSkRihZlFmgSOREoI0sBqa/MQZgQwNoAd9rm5UAHJaicn8o+8SaaV6LM4/FGrSSQAP0lMSxKFF3oyVLA5Ub8TVgcFdVDJFjcSKlIOk2GFtt6TRmcKFtb338/vIP4hw1t/wDjv/uahmbpaQHsitXr9mTST3fiFEGoci/aaFTrXxtMxakXisia9I0gVjRXjB+sikEXq6gEwoO+/wBiWvTXo9AMOmCTXxfoImUqwFc7ciWttQryAb5kUFljkBScfKaI5u1rSufS4lZ1xZ8nF3H09V5VjeCRyfWZkFJOtmO1VmadMPpJZBZxYk25YPVDxxLRtJsG1APtJpFRChsF7ljolmH4hJ032jbbaMkAb3nniSLvKjfjHBk0l2WLqVFA0TL1BchhnbyJOcMm3IxgyiXIo23y+8yKDLMVAx5OYzerQgVl5zHqc9Kqbar5u+IWcZAI+sipWQdQxgcXKROoPhPaDvDpXp0sar7zKNg1X6TOg1XR0wQB5z9+sfJJOkn9oKbJBHz9blBnW73395JBGN4ogfS5V3qYn2zAXebs4xz7xktqDVWNuJFSrpAkEstE+DDSd9zecwU1TDIANYEvFH83r4k0HoJbS+SCTX8SiSO0gVzJVu42vNYmoB0386mdQaWMgiaWSApqSC3Nn5TVC2mqYmt5lUel5DaVo+k0YaWAz8jM1U6vE0TCgEkTOsyCtdDAuaKujp2BVyc+I1Pbn6ySBzuFhC3EIifV3DMZFQE+8ukEdwi2gF2MQ2zJXcGOxp8xAX3bQBN2Y98RXYAu4AZ5EfO0LxDFnEDMXd4iu94GzEMGADXVVYiJsgysE2BIOBAJfVe3ymTnGRxLLHmZdVgPpHAwc+K9facbnPGnedHWYV4HpOXqUGNURQmkDl6tAWNvUVOXrPb35nR1GG2n5VObrANjgcS4HL1GIUHfPxHaczsxHirF+k36zFSFXk7eZizDnINgf6mocrlVbTfGfI9Zyde2AHb6e1bzo6pDUV7qPzE4+uQbs92/tKio5etXUA1Yc5pRfO5nmdcjS6ntOCQOBn9J6HVI7AUvPuBicbnpglhe9BuZccry42JYrpsKDnyZmzMC1AqQcrzXtNmULpY0W3BNn5+8zUlhktRbccipn7aMSoNMbGkYHgSecEHz4I8zXqlRQBF/p9JjYUmuxPMxrOoBK0GC6Wyd9vMjqBasKa8sK4lEKWtQKq65rEQ0VlKs4WhmRfqaxcj8U2ASdpmQwSyL7vi4E6GQO2lT2jjz6zI2rBVPN6RzIv1lWZ1Hk4vPpEaU0DVLZH8zfFm735/ic5I3ADG8ZyPvEipqWUkC9Jsb7Yiw1WKJz25lGiKsX4PAuZgBStqL38gYk1FQ1sGU7nPtJFmgBgHPrNgUssNxzz6zMpponfezM6lmTpYkKQbyPSGkbtYoYA4lL1CwNtudx7Q6hG9j3vH3tJSi/wDFhf8AHmZr4bSVbN3x5lk0KrSvkeJJrVYAoi5n6Im7RqG3kiSxH4hJG5x4l9pX4KzgVvEwVjpU4H023kFYypgAWsnVvxUQu9ji8+ktu0hFOb28yqDWSd5NJFAECztckgkC9J/qozp3qz77Rag9g0GmdMY6gz8R8ST8LDHrKWu3sv8AiMFLJHGxqZ08Qw1UVwLzcWrSTS6c7c1NNOmjWT+sSktuTRO49pFPEgcngbDiBNgUdxn28zR9JIoj6yMBdgo9P3kaeIW9jppsk3GygLseckSivditvnDtC5HOBUAWPxLP5tuYUQlkXm79LlEAtSnA/aI2O1c5GBEYF18JrIBHiUAoYWSLEatnLHN/Ykkas0rfvBQINgdp8e1R9rKCfiOaGfrBtPPxePEQ4BQH+JJ4LsEGhFhh2ilBz9+0saLNAkjY8xhdIDE78xKxGQTQO+3NSgBvkaRsIISQQScneWxBYURX6RHIQHKkZ+hEQ2GoLTbm+IxSgn4V/aIBdRIA2+cS8IhdJIujyRGxGuyNzQF4lLpr4edq3lEBqVdhfttEbMXpvSSbu+N5QJO2wsajtUL0mgc+JYo2STR+8RHCIFgXuLMDbUO30zuKgBeRRPvtAlSDnO3t6xLigQ2w7zwsW4OK8i6iXAUUD7ZAmg0Wa34Pm4lIUFypG1/WMXZ0grR22laMgmrJ5grY3Ygnce0R4FFi6OBgeBHd0QVNj6iNiBVbxA0NtI2sQMlJvNFT+wlOFAsE+5Emhr7RxKDKFvTzgVvA8Isp6h5vFcRkELdE5u5pQJAUYHEhrVgq1vtJVg3OOCaPpLUBTpvNXtGtEmzueYjpO1N4zlZKsICwKo+PaVYc5Hcf8c2IXdgkXwOPeC0K7Qf1AiVIQNgjmMHVWkULz5lAqxus+YBazi7uzzErEgkOdK0b29JYAIF4AGF8CCkkWSSCcfSU5UAEH5wVgBJrSRq/cQ4ohdLc3xEO0UF0j/IcRtWqlAo5k2nhsBo1AEr5I/WDMNVkXqwANvEa6avRVnat5RUMVUVQ4423iUkhvw7Nk3dxrqPBobG8VCyrfhjzt5misGbJ+K+ffb5xKLAIFtkWQcYiZWYKO0g7HyKiNHIAJ4s5EdhxRrV4PHrAGCvUW2+I7VyIfldT9Ac/9RYUKNIO1VkDE0VkILVkbGvMDZglgNOwOc5I/wCpfcGNKwzdbR/hlQGNEk4JzeY+mWIJ1HLYI32kqML5GFBoVtKXuA0kMa+og7KNmG+M4/3JBAwF0L5H7xGanyFZW3PoIHSBqF0Tuw9N4aVPUBXTRGPMtdIUkrWSQKy0Sktp12R8VAcito+7SSUJbVd/OVpUkImw3HHvJJKjStgk7DmBmC1EDjAN8S1VVKqbyLqUvcWLHcnH9fOZ2DkANRxnb5xGZ1NoypB+H1Eqw6jX8TbAZsesVqQwO/A8esLUaT+GG1HjIG8m0x8SupAF+MH3gT+JpCDF5rcy7StQ+RqPTQ1msnBaCivSzUCtH2NcylUNV2FAwPAiRmYE6jbHB+UtyukUR9cf7gZD8ulgxI//AGWMNTfChD83x5iGLpQijkfvEQD1MVVfOJSiFC6lsg8sK+cTMNZNBrAobgjb+ZSlSD/xkZJrTk5lFQxHTT4RxwcSTRT6SSuolrusbyl1FqF42a8V7xMSlKpokjAG/vNlouSxO5/6HzgaAFUqNRFrkbRm2VcqR+UnkSTpYnSoY3gXkfOVertsXmr49ZJqGl6DfEdtIux6wvDrjI+dXvAABUOgEWKruA3mgPT1Fqsjmt5NCVH4gGja/mfSWNQc0CpsHOCb+xHpHx2DnBJ9Y0ZmB7idR7SN9pFMIusgsCFAJCi8CaAk6SpBYj/9hzG5XStVvwcf7k/Bq0gIo5/mTUqBYH8rITn2HMbKtWt15Ir5ySqfiWtGxg3maKyZtKskgVv/AKkUi1DXq02SKrcVtLGsIxZWY3YPzlKoICJsIidNKpqzt595NJSEsSASaOG4AmiqqlRnuHiNSLtjgnF/xFStkDUR5ORM6D0k6cq1/D6iUrL1AAR3cAZsbRGnFE0eP7jFYIQNZFAZHMgHwy4zjwalA6gNAGCAfWNSnxEZ81K013k6s4J5zJSk6gx0oRkGWqhh8JFbDwIkZ3sgnJwa9Jq2kKP3vEikajCsrAmseojW/ClSeDxJHYTQAHkfvKpdWKyNzJoVSAWpJU81Ha/iaiAbFAcQX8OySlZsCt5eG7VIAva8TOkQJ0mxqN3fiUL1Gr9DeKiNrgGrP1myYPca++JFIBVwM5GxxDJK5U4r3ELFkr3Vt5EMMSCRfH9yNJY0smdzsBzGBWpdrHziWgAAt2ceBvNVKXdX4xvI1KB3VpG2KPMqyG7QRVY8wrnfOCTctCSbsxUKVfINUeOJaZ0lSCTt6xHTWDt9Ix2nGAOR+8zqGi8AaSDNFWu4ZF71IVV3FVmaLkGxpF+JlUel2A3nipWdJJFnfaIeF9IxewmdZnk5/WWoAGcXGN7OB4hVDyTt6SUnqPBxCLXCLQ+qyTmH8Q49Y7n3p0hURHi/8ovSBFZuAOyBe0eSL5iBrBN/zHEY5yYUVvERFnaPN3AAZPygSd+YHuyRCrbfERizqwPnCyIecwBr1xADmtvnJvVeb+cXqd5OwxHAnqEm74Ex6natA/ObMDOfq7YxUsOZj31RacvWwBYIFbVtOnqLpptWSeJydU0CSxwORL8m5eqxOKNnzjE5+qxKmyNs2aubvbLgaQozOXq9xoiakw6toLHxY+c43731WCVWyt7/ADnW7agQLbFCcvVYFe4bHxKhOXqMaO4IFVObrA9QkqhFbNW3vOnqKHcajS75zObr4vvJN7DappFxwdW82GxvQ/W5xP8AE2KVqF6t539R1BAosau6Ir0nD1lcMSaLVcbk+GJQv8TaiB3UZj1uoQjJeB4AsnEs2uR2k8DBOfPmI2rC0JGBgfOZ+2jnYfhqFU6jQ7v9SSTqI0lhxYlkHSyjDDezx7SNAC6w+WyfMyqazYMmdJA4Bq1mbEsK0sWPpWJdgDLPQBo1vJ7n6eF0gb6pmik1nciqyNW8kjQNXONxvB1ZsMorj9ZJDFa+IbDb9pF+orNhre2IOlbI8+lyCWonNjYTVz2WQfXiQenrembt3F5xIqKkqSSVQ/8At6esyJNbHAzQ/XE0ewxAa644kBgoUUzYuyCKk1CFY5P5Tiwd49Ja7YN5zGwdd6vcVJGDY7faZkjqEqCAe0b+pkkfhp2nVj4pqcNlSeDi5mwwwzq94k2IJq8FpOUybA8GrEsqFAbULPpmZ69JG5AGMHMyRgb4aokkYGRjzEbIy3uL3lHWwwlVmmkldV2tiRTP4RfOPXMy+NrLDtG3n0sTXfyaxx+0TNiyNt5Hr4WM80cHbYVAjUxOk+8sgM9Fu08SGNNvedl8TOjC1Yo2aGagCbuqX33EEf4VpjizvBtS+praRVKC6lybsZzvJLabUnHJ2sxqKzkcQs6r02DiZU0UUXBvG8Y57Wb+Yzyo+Lf3gFCrqDjJs4zJPC0kbhgPGLEQo4Kkk+cYuF4yzUBg0cys9RMLQrNwGCzWSPWzCtA1bnHzMenJDKCsKNadztxBWIou9k7DI/i4c83W0o1Vm8ekegOfAq4hhEMThDfDRA8dxPOJRwQQbo7VECAAKbbVttErDFk3XYR53lfExs6jzneIhxuLvMQ7SSDR++Yjw2YgEX9KFmLToTBuxv8A6lAANkb42uHBUXq94jwhdVRI48RtYzTKDxyIlWhevPtmMH1JA58wUNVD4SS3yxKBJG/FHMQt07RpxZDXGdRNaRR2k6eH8Iu80IlBZrY5A2/i41BvB9BGa/DujjeSvEhiNsGuIwpY2Om1eYaLfPw+uYz8RpicxHhi9skjcARKc5Hacb7wDBQo7iavbaVpcGyBdXEvDrUckNjNHiGsqrLeOTtZiArI7flv/UsKVbYkYBxzEaPgUV3Gvil8MNLN7xVuq3fvHpAQMWFnMDkLSRXaQANuY22oAkn5Yi+E/ExUXmpa2yAKp2s6otVId6hROBuL3qMLpzv7jfxEQboqM7QBOmt74r+IrVAW7WxGBZH8XHZ4DAgYEdjTkHH9QrW/ccb58SVYeWyFYVz6RDNLTGt6Hp6Q1APhr9ODBGC0KY0L2OPvMFYanN0NPvuJdFjTNq85kkOpJIHkD+4LatqGJJ4piQpAPbWaoXiA7Bg6sfFt+ktbxYvYbRDkUwb3qLVYRxdqxMCNP5WVfBqxBVGjVqFnNxiu0EnSM7HMR4N/ymztuLFzQWd2xyL3kC2UaU0jfuuPJFFbB2JgavhGrmh634+/WTf4nWBJBIFkY+liULogWRxt+0ZI0mwbGD/3EpIY8E2BgYlKC/w9Nhj4vEWkMw7tK70aO0ZOlsNdHYDBELTALHtNnzQwcekpPjJ/KcXq3ElW00DqbGrIOPvMsr1F3UWRiSagC+GbVjNGJnIDLqwBeoYs1EvabXB22/mXlWFixgfzEpIH4aAXqJF2P6li7IpjjB4iAyVrv98Rqv8Ax69d3k+YGCpUqSrKv+JAsesZurKEsdrsWLkg0w7m0gHJBlKz9RaVNJrVm4lLF8sK2NnccQ00NV8Y5vx9+smmPaU7TkSlBrGQMAYHptAFl+qC7C1yRwfTEBdbkEDAjY9uQe05+kNOt8mk9aOBIUpVLEV02v8Ay8e8F1aQMkgZob49IfCaVrzsIlYKEBDOQLNg9sDUjZ1bI2Cb+ISwC7UzajWaO8WnqKDaizlREtqSfhbb3/qBqLFQy2CvlcWa4iCnpItHVYst/FSgSCLWx8J5uH5iBqD77xGfldJIrHiFFSDpZF202LGd4KoXpay4s59ZIbvGpm0gHNX4wZKlWdPwszMMXYsXNFJ0AFqrBttx4maFuonYmk/EbBjINgFRpPmAaaQqhrzQo7+0Q/5OtbuLAJK4rfb0goYgjLKNhQHpt9Iyb6dlTa4ON6HmJRWTij2jYSwuojT0m9G8SSC7AFtKeudpRsOdL3R2XYjwZJhSwAFFiN6HxY3xLUktt2MKu9xJV9IQFWdviNg9v3ma6HViSAScgSaFFS7UzajWaO/p+sNRUFdXbWSKFmthJW17h2t+p+c1UlX+E6djzIpJA/D6Yo323q2+UoE3pAZvHi4NWoqNWo+tRoldPV+ILNHaRUmFKiyjKP8AE1fvKu1yCXPnF/WJT30WbSLzRPyP7RqzdVQEWvzG7/mRQ0TURV1ijbfpK06U1XxY5vapADbMo0nYzVQ1ULIGB48bSKQCnqdYMzAEZIsVvt6Q1G8EgqMARsb6ZsGxvQho1OBfaci87SKalXUcdNrPPiWpN1knmhvj0iyHsPsdhsYK4AUEFsWSQcSSaBiTYHbtvuJWXPc2o1kA5PpJ0OpsAHFgRrYbWO0+0ipqtWgab7ayQK4/6jCnp9PVYax7VAErkgsNrlk97KLDHasSKkUbyC3jHMekijRVc9p3iROzVqFnO3Ev/EFm0rfB+kmgwSfOri8S1sir4o5kdO3XtXT+Y2JppoAEYMzqV6e0EVZEeXYWReTXHtJUmqBJ4+ftNK7TYyu+N5nQkGwBnAFTQDOENea2khQ74alP8Sz2tWvY7AYMmkFLLggk843+k0TfJparfcTNWAAu2xeQcTSmGwF1YEkj022TeLIB4lXoFasemJAH5ryfSWCcYNbZk0jQaVGQ1i7moPuZAyxA3PylqAovUPpM6S1taNED/Gpop9LJ8zJeLLUL44my9y0BneZVl6aJYWy22N5QFZBvmSKAogSx4BsCZ2s6Z+IWYge3bbaUcqbG0Attk4kknP8AiYTS6/MIRaH0+Cbi5zHjbaPSP5n3x0ifHMdc7x+0VVi6gDoEZxHsPeJve46FExGWxoxn2yIgRqyIzRzAEdwSaxtD4h4joVtAkEWf0iUOP5gFH9wwBj6RabGP2gE/xFZPGKjatNYiGkLp25jhMWbJBJvzMep6Z9Zs++3rMnIO0uBydQDJ38ZnJ1ADkk+onY9A5u7PynH1z2miMen8zSG5er2oDeK+xOVyVar9KnV1AK1UKFYnK9FrIs7/AEmsJzdVaNUcbj79ZzMR26mvUNIXzOvqab1L7jG05mCg7cxhyOhdQSNJYYJP39mcvU0qvHv5nb1lBWyDQzfkTk6mkaiGqrxX6/pLinG/TFi2yCSbG/znn/8AyCCSQaUY8ACd7AEOMaiL1AcTg6wQaumunOLrEpyvxsHIcEnZebMwFgVdFrBM6B+HWgLo5vxxMSq6VxdGxYrP2Jn6asFOogdMa9QIJ22ksgB1CjnC3N1IshV8jfiYuFXqZwdV7fCJkis9Kvd9oB2X+ojS9MDVZP3UOpRFBgQB4g6qe4jAqhUzTWWr8NtJOTirkutMoomskcfdyjoLamAP7j0gwB0uMcgVtIv1nWOpe0k0SNNeRJCnqdJSRoJoKSdpppVbAAJJ4icWgNGqGfSRUVi2gHIH/t5j0hWq85JJ8x2mk01VeK3+6kBQScjOxA4kUkdTINXW3sItWpTewHBjZQAyDSAdzWILo1aTSGr9pDNB3oGrBBO0zLElfw7awRd4mxClFwMZz5gKLNQJsEfKKixzsgBJGkg7LcAqk2cBdwP6lsFR96N3tsJDtqWgwah43qZVOAkBbsEn7qSprAPjF7ymUAaqwKoVEFXXbZMigmXIBsjepBYF1zxVTU6bVgc7+0gqqkdo3kejxAUv0rPaTtqMR03WPFzQrqUYOKze8gaRsaOcVvM6MA6agnNe8lq3ANSgtkg1fkCIhaKDznEzpYPiW+ByDJXbO5uztLAQkqBR39oUCqihjz5mdVEDJGkarsb4qNkHdgEbAXLVlLED1wImAV7N73ttIVhBQxwcDjx8o8KN7vxvJY/lsNQ8RlVoXQC8VEMGVJF7YqBADgZ4x9+sdLr1NR49pVDDCheRBWIsWovfAEFUsl1p2okx6QpPaLJG0ZUMgwaFZveB4g0LJr/2l6RqvVnm4gVF01HNColzq2sjFDiI8Dc0aAxvtKyRZzQ3uLSFBQac7niWioDpGLz7cRaaFwPF4JgO7SF7ibG8srhTgV6bGNWskAYzsZOqxJ6aglxVcC49Kknwu4/1ClTq2cG79oGitWCAPER4KCiwbvxvBRpbfiqjKqVvgVQqGC51AZx6xKw2UagPqPv1itRpBbwAsrBplJGLAqIBVNUCSYl4lQXQFl08LZlABQbArlpRAZAKNefMXaLp63xW8R4YSjV5G5aDGxjAGBEq2xoWauwI6C6gdOdzFp4e6k8DkEwX13bk+JS6LojTeYq7QPB9sxKwlbVX4fddi9vlGyaSSoFcLfMtaBJUEjI3ialbI5v/ANYlYYCsSQduB/Udqqisn9ZLEHCkH5RsqgXQ0gChWfpErBekkE+lXGQNQwfJiFF7YDMugabk5oRDE2LXUd8VGEZ1GAp2BJ2j0hSbAJviWRq6Yu68xLxnQXBA8FppQU0TXqbiDJeHrehW/rEqgk7bYIHEWqw9QtiCwAx4qVesZyANwfSTVakGmzueJfTCXRpTX0kniVNWMi8WYWWAHTt7tbvaXpXSBYoG9o1ILkAHwBA0npgMSNNcLGNJbPwruL/iFAPZOSb9omYFQAwYe3391ErFWug5B+WYaipAJzVVcCq6Q9DSoFY/iBUN1NTgfLiAUV2FHyRv95i1La21cVLpTpcHfNfe0VKpyoyR/uIyVT1OlqK6Ce0WdvMYUKDqA8arl6dSVkDGfMF0rs2k2cVv6xGa9NVai1H18+8RIY2tgA0PSJQDqIAyMMBxDSLZBpzVmsGJS17xvqVRgj2/qAqsXm+7bH/UfT0fDWnm72gVVlAoUDecZ2gZAkkBO+7F3VfOUUVWJFEbBblqVLEKo52kkKHzyQdtoGelWfegu4H9RkhUvVk+N/vaSWBQKGDVZ23+/wCoaV0BiBQAoEfxIUoHSas2caSd42FMBXqR9+sRCl9Ti+PUTQAMQwxea8HeAZhl1JqatlAq41Q9TpgldB2XUdoUqtsLJvHrmaFNXRACkrWDviJSaVAQQP8A2ljpgN8dNzf9yVZFJKtWTxk+sEqy2DqGCoganrUdJoLgeglJ3rfCjBv74kkDphkFZ3asR9P8KtNFSfzeKiMLa5HONR8GAslfw/8AkY2t3VY8ym6YK8UDsRWdpSFS1KuMigZJobpBSSACuwF8ylReoTdALuB/UGCq9lSMg+wi6h7VCsrDJ+GCmgKp0visn6iSGKHfNVpJ32iKr+GGKgKAKBXx6GPSrNqcDxtkQCmUB1Uj1I35/uLUtpravygentNF0MqMMXkL4MkKvTb4QWZrxxJqiRD1EyoThdR2lgqt4Ff5cyioPSoqarfyI10jZ9OomgRv6yQoIOma16XuzqupRNuQt0P0zMunTlgQO4YIHE0VVUsg0i6tgMSaF9PvXewowb/qC4Nj8159D/qHTHT+H4D54FRt0wwGMA3tWdpFIlcGh0reyV1XtjzL/DVWJFaeFvmWhX8Q0PI3iKqvU7viJFD/AB+/5kVJ0jNjt07gf1LGlenereZsQwwwO+43mhRdFgdgqgRIoUp0Gie440k77S2ADAZvx8/7k9pe3AyfGVlhVfS4xfFbH+JFJNi0LNX5QPv3lIv4iKSAv5VswVVDWVyaM1IH4VAHHN75kU0rSLxj83M1XpgGr0k7k/3IXSG+KrJqxvKRdW3IxpHEmkq7PaDpGMcRr/yCtwo+K5OBqQV3DLcTTpDpg1Wjz6V9mRU0JQGLF8xqdh07c5X2xKHTGk+h+hEtSuvA2wBcipToFkitPC3zLADk8VuP9SdK67OoEkVjaVggAMG343kULUKi6tWT9ZWorY523knpjTeKAGKlUrvbAVtttIpL00QNuY7yLbTWAPSNQp0sCQTmvWMUCbAs+szpAC+nldPC2dowFQZGr1vMrTqSiCcb7xoBqwwsnFjeSlQUXpLU33zB2tsA0NgJCgE7g2MGpejSSO3ayak0ldPuHkDkGUu95zz6RKq6dNab54FSsVX+PnzJoCmwNB1GyL8CWqAm8V/jElBrA84llabYgkj5CZ0q0UWa2riagKATeZkCCK1WfaaBQyX+UDkTKsvS1sWL+sthwK8yFGrcY2xxNcbjfxM6zoG16q4AjGVo44Bh6neM5XbEkFgYwYR6VhFofUVkXHqxmLfcwxYqffXSD9RHioURtC/IgBQMmjzHnVcefOYAc+kATxtEf1jwBd5gBdxVjaMLfvA3fpJUVDOYGrIED7VAX8oBJqsbyWObMoqazdbyTRPp5lQVkzGhe94nO4BOJ0NVZur+cwcFVoXUuCObrd2+9b3vOTqAEt7zreiLYbfvOJgdW2RsfWXA5+qAAQf15nN1MOVrG06erqZd8nPM5uoNLc+00gczMQNS4Umcz6d6Pbt5vxOl1XAN2dhxMClsaBN3j19JQctaboZINjzOXrEacE6Txc7OoWDXuo3vecfWwuwNDNjmVPpxx9dADsc76Tx6zg64ADMbYihv9J6B1KoAOlFNkXQuvv6Th6vSYkgClHpkfdy3K8ON7Drqy7UBVxM5ZqcEtdDn5Q08sMX8R4ksqtbIWPfQ83Uz9NmTBe1QuBmhsDExvc5Awb39Js6lVIF0cenuZidVDXWocesz/iayKhrs3WKJkFRpJIbODZ3EsqQ60qhhsR58xMjMvcbezudpmism/wDsdQMDBMgOQtqO0mpfU6ZBHac7iJlXQAcMW24u5nUWM30khv8AHb0PiQlAmhlh9ZoemNTFbNE7+fSSxctjYCiDuJFRYzYCrU4J2v8AT0ksp03RPsZTis0CRk+8ShsAEqAcj18/fiRU2M2oKbtiK2MTXebLNgaZf4ZNgAafnY+7kVkEjn4mk1OFqJfN3ZAqZitgBjJHErQh1EEm2+crSVTnOL4kX4lBpgAd6wbmZW8ZOfNTXIPeB25r18zMKSwoKCOfWSEED82rbk7iDL3sBisGXpLLk93uZDKcbg71M6WErlVtfh1VvJIU0a9trvxKKjSLvfYcn1lL01tgA25+vpMaeIFqMAZveLt0jST7XKti1m6GM7iIjIwD5vzM6eEwFbE+t4kkAKTuRjeUistcD+YvwzkcfO5FGJbfy20rVZIJ2NeYlu8+eYBQQSCx7sYN3Uzp4gAbKLG5AlXqOfGD5lMNIF3RxcBekF6xuPWSWFWomyfTMDSob1Z8mIKQ4wARsfX5SmViNzq94lpIJcgbAVGj0vbgE1BlPjfJHEWldNGxZGP7gZsAaxt9bgoo3W428ygmTVk545jFhrrCjncRKxJrcE0fWBQV/uNgKvSDXkcxqrUASFF595OnhMDpJIJMnY9wOrYVL0Nq/wDH52IgByLF7mSeCyxNnmhEEUaVAFb44jKgscsc/O6l0VX0OD/uJWECCBZG3aQfp+8FBbVm/S+IDK94Bxfz8wAIYUFBH7wVgwBnbbJ3EZHcwAoQIZtydV5sxFTi92zX6xKw1Ygdt6bqPtNem3m4UqoLwb2EodM3sd/lcWqxKDSt1k3zuI8Va39ZR1XjjfzEQKBoEjJ94jwVQO5vwd4Y0kiyfeNAwUAfDznmAU5/xPvErCYmxeWOBNAxZ6a96FTMLZ7hedzK0pkgk5Hm7geEFzpAHymlAgAnjBuvveOii0CdO1xZAp6FZI9YlYVarJJsesWVGxA9+IBSK7QCOR5lspIyTqs5J/WSrBVOVUe/+o1bSLAxdZMTK2OCeIELpNkhr2H8xHh0pzW3tYMaYN0LO/rBelkkXvyMR2xo0aXcE5iUXAKk53FytJ975uIihfa1ZPvGuq8YF5zi/MRihobBJAqrgeLsscCoBST/AOPmCjGb33OIGstk354kBVBAA+XrGFUk9zEXXN3LC6VxgbX/AHECNNQOPBv9P1goF5J+sYDCi4GN/wC5Okh/hAIz84lHgDu1D3PEqiGYLihvcTK7WCbNnc/vGem1DNHxxEeGjUvbdXWbga6gBogD6g+IaRp7rFkCh78zQdMF2+InwRi4jxCYvFahm+ZWNNhjR3FwOq+aAzqwd94EDtNKdPxe8SsNlA2tvJBj7dDGi1AciCBgoUHSvNHF+YfhnUx/Lnz98wM+QSDqPaPv3l6rPfwaBmaqLGoahe5laEbUQWI1Dg3dSFEVBwi7myBVX4l9jFc1jBv6CPToW81VE759YLdD8WqqyPJ8wBABmN58At/UAAB+ZRtk1iIA6h2qCMmhXtiW2tr1G3s5J+V/WBhhTlVFUN79I1cqvZ8IIXNyCjdp2PI4l0gUhrUk0AP5gaqVqJBwfcg+kOnanI+IfWMdK3PJvY7XAs+oVfaKOrceDEYpdPaTRGc7HxGUC8MfUHf3gQDRKqxGWxzGquqhR2rfcBgExGO1UN2dIqrjuq1fEcCoh0ms/wCG53x94iVbBJyL+I4oQU1/F1dSm8+8z0LqAC+pArePT02ZjbMNQ4JN1NNJ6aA0a2J/uSCLKQPbta9vSAFlrORWCYCyR+JW1n+DEFOoHStrZNeeIlHQW71ADG/H2JRx1CEGwznHmBHUYZJ13vn28QZWAF4P+I2iM0YqOy9IIW7gdPUALAijzVhvSSVQIQbWyKA595qnTGohbLWcVQv7EDCdovTlgTvvKwEwTkZF83+kf/IpG5CDOrBxzGeCQract6mRTH4YVron1B395VL+G2SSorfPiLph1VQKC33C9znNzTQ1k7rk8/fIk1KbOoajk4GTNR1D+a7ugd6maJnIsXucSwqHXRYixdgk3IpHoUmgvqR6y8ELZrHab/SLR+GoIDVtfr6xremuoMDJA/eRSNAC2ST47vuveUMCzdbXe4+npIVDryqgiz8ztNiHIIZtT35/WRQPzkAYAlK9LSHtsDNyChCg7E8cSgqqnd2+l/vIoX2sbYHBztYMrp/FrC5a+d4L0wXNXYO2wuWNQYVfZvZ29ZBDBHaSARkE7SmBGaPyP7xYqyA1ZbG8pdWigaUnPqZFIAAKSSTpFb8bR5tS1gnAgEY84POfrGFonwDucSahrq/y3v6GKtJCge4HmACkt3NpsX5mqoVHPi/7kUFQYC7GMG6+UaAE9zHHrAYXvr19fWFU16RYs4mdJS5N5Hz4mm3U0qeN4FX5NtfnmLSaBIIOMcSKFq2kEiyAQMmUAjHI2J34Mgqunux98zRel3G+PpISOng3y1/OXjBB4yLi77rON7gANVkXW8gllRvk58yqBUnfSPMS6qCk0Oc7y9JJP+PJzEQ10q37CUGtqc7eshR71fM0CqWIskY95FIEAYA9SBNVA5+Rk6Svn3/uNTeH2/eZ0lqCRgzRCPMzA5oeRNgCRvZv6TOs/S0J1du36Sg1DtOJGk4skGVpUDu7fSZ1mZoi/H6SkBqz9PMB0xd8/pGFN34kkdX/ANwlahCSH0x9IQB8wIzPv7pBdxEZxAjEBXO0ABfO8BgHxHQJqFAQB+8Vd2docw+IUPnAAmtjgw9DCqG8XpJUKIzxDPmPEX7QBajM2OPlL5PmSTRNgSoKxOFN7zFjqFmhNmUtZ8zHqZNmXBHK65NYPrOVxeDkjmdPU0k5szmcqRQsfPMoOV1IXtsiYvRyck7CvrOjrLQBN58+flObq7YAJmpOZkDdQZAG+0wdgpCrnV6b+06eplbvfeYdTtBrS2oUBKhuJwGIDC8A4xUw6qsFax280Lm/V7SVs77TDqnpiydROc3iVFRw9ZQAumwRsBscTj6gayM6sETudNVkXR2o1U4OpQNgj1a8S3J/G5usBX/GL8Gt/J/WY6F6aXrJJyRW/wDqbsRdMFFjGgZMxZPxCwWgWx7AnaZ1yKx1F11nTtd17Yk6aPbhr+pmj9/ebwALEytTZN0xHO8zRWdAnI7qz25kaSEtSxWr98zQkMVCatud5HUUKq3kXsSLv5TOooJ7r+K8gVWdjMiutxsE9qmlnSdIU1+gksVYYJ9fHymVKxkWrqKi91+RvM6U4Oao4G01IK3QGlhQAmTUpK58Z4k1nSZWW7A0C/Wj6yNApKxW3riadgck6i2RviJV1V8VH2x9ZNTiAGsizeCJJo/ApPIP37ygADY03y0QIViGUDGNN3JqcZ6QqA68843k3rUOKqvH6TUp+IxphkYztcz6g1DURsB3CR6SgLyBRu/S4UNWR3VnGYABrL7E1vvHasqAavGTmZhmVNEAsR5vJzHzZ7ryPeNkwuo/U8/KIkqCFAPvIoxGjW44G9VvHqIYKM36VLJDpj5yNOk400RQUcTGjEUCKbIoHaBVgLoFfa8xHttc5xUsaNWdRJxgzP0adIpSL8itjiADbHBNV7xqurYtXgYz84loNdAnkzOqwiLUaRfjG8SoAgOqzd49pQPfTCsYreBXUSARZ29LmYxBYtTdoHmt4wOVGd4MCx1EVigRDDE2Mbe8kYV29NlucZiAIU0TpHrvH2sq6b+e+8GQACyT8+YDFfnybvYbZhWRfau+1QqrAAPpGW1Lvx9iByEDpcKBqvG0RW1HI/aUAUFbgigBE3bgX4qRVmQ1bdv1zJCjtKj2ljSGs2Ttd4iVe3F6TJVhjUDXJyMQwy0ovxiJQA14uMHupgBjjeCsCrQstZOcDeGvUuvYD0j06iarP6Q3F7UKuI8TpO4ABuUqnUA1aq8RAhzqJNXUdqxAGoe+TJ1WAKdJAsjf9ZWD6k5AAxckhRv3fyfltK4oBaESsL43BGFHErUdYUd1+lXCwRv/AFCtO1AEaaHiGniAARp3GDttLAYHbFZxeZO1j5Z4lLpvNknG+JJgKKWr9KHpKXVfqaqSF1HF0eMD94wOQRfJ8wWrGkaB8/WAUBL1ZJvA3xGppqYAX4GYyuotRFkfSB4Wov0wcV5qFXdCic/ODZBajjFiC6WYng495KsFWwBHdziAU6TV6d/9R4IULY8E7wKjTnIJzf8AqSeLFB7OTwK5k0GYC6X2j9gCfXgSiwZa+sDK66mlc36b+0MEU3ucZEYAF4FEUAIqAOnNVVGCsHcoz8MKFLQ28cxrpUgksWvGcX6xKoYY1Z42o/OIKUMWIBN4I/gStx2iycg19ZKgaiRvzKB0tRUVW43goKoXp3qyc4G+IwxZNQqq3qBGpsMLPEGFi/AqxJPBWLGGOYrvqCwNVZxmApiSfhwDmV2sqAWCf3iPAFxSliPN/pLBBYEgtnGKzJZKGfoayflK2FAA/wDt4iUWkM4s0pzVbytWlwozZoY/aVq1LQx5NRDp6RfaQwoAQPCABwwvF1W0vS4O3afOZDUpKi8jYy10aheq9rvF+sRpCilK/IAb49Za6rIJNmuP0HiJF19wtRtW37/KCgaiTRbkwNd2o0Lq5utzzJVQqFtVn0G+JasNXcBVYoG4tIZ9xqYff8yDLWeouosqjOagq1kYN3GbYajwKBEAwdiSTW0AYHf3r31nEYBUEKWCG7/qLtKqqah6sc3GUGkFr8UTz8oG0A1MCe68qK5qRo1MLOlfbeUDQoBT6NLDBkoELQySP2/WBpPU09YItGzW2+eJOlSoDbYJ7dpSppN4KkadMRXQdBDZAXJMRq0sprBXc4vMAqsFK4/xoVcpfww9MWLXQzj5w6a66ILUcVYH7/KSalDFmXNsMf0INTLSrqJzdbnmSqqrXa3sT8pYbv7lABFAgG4jJAoS9eonOx7sQDfiKOp21nNR6dbWNOoiucRsutbz241KN8xAlS7K9pu87GBFsNQ76ONOflAEOSbasCr3/iMaCFVNQO1nJu4LMKdDaSSpvPzmlgm2z4FfmmbdMKo1HF81v8pYwKCqfQxGnRqYX2p7cf6mmoL1ginVqsbevENQbpUMYz4x9mNR+ELGkhhQWv7k0AgHSpFjegNpY1qNiU55zM9Ojts5oVmaroDDVqLbb4v1kUJAUhNOORQoGarqJIJOo7Y+gkKocAgkBjtYFfX5SumFDkitQOScSaTRlGjsGrnVW5giDRqZ7ZvA3FQVwOrTABarG8CmvNiyPp/uTSNWbqJq7RvkD9JQUEEjDE36QILg4+EaSwEaENZJIXA95FI1st3gas325+UtUNMFLAG7b5xdjKoUMPfzK0BVskkXW4z42kUNBmvzcha3MRXUd9K71X39mMEj4QpPgygQ6VeaziZ0HYXqhU/NY23zxCrAVvcisiMApVVpI0gfrAqEAXusgYkpV3LsO3nmAUEDi8ihgyk0LWosW23x841XUMXTH2/eQFqCTRJztX7CVg6a7rzqreQK1nIvkywRq7hS1uN5NQrpqNOotZ9snEpSXUMKrOakhdVm6JG3iWRYv/EabEzoLSNwO4+NpSjvAcd3OJKgM9m623mvYaVQwJ53qZ0jo0QpOTkzVdxn2HrIKADJ/bP0lLtQ0yKVMLqrgb7SmP4b0PzGtvWPVqQDO2TxAEpVUQRVfrJSn4qv6VtNFVqwKB9JP/1grnNDM0UIMsWJut/3kAwgNH6VsYxqIzeRj+pK921i+Nv3lKoU/wDlyTxETSwRjPy5lBRVlrJzj2iVgX7qAqoVqO41H9JFJWrWvA9ajUDcb7xFbXPAq/Mrp9x1HaZ0mig2NR7pYHaaODvIBDABb+cvTS0dtjM6z9NVI0gn7MdWRmgfSJQNOAJpqBG9XuTMqzB7TQ9o9zn3IgDQxscCL4RXBxUkj0+G/WEfb9mEWh9MYzyRBQahscT7+6QXebis7Rhb34h7wAog+8AMXvAbVA5FbRKL+I+IEZxAgk7wA4oQusgRC/MdDSCBAA2Tt9JJUk52jPyENecViAS/PtIYYq8RsTpJO/ERBIJrJlQmTHG8w6nOJswPjMxcHVe9S4cc3UZiNNbbzl6grUASSea3nX1BwaFHOJysSrYIsiXA52XtNi8VOdgNVjedHVY2Fr3zOdgSxAyBvmUHO+RRyT+s5upWkKpP+/E6uqLfNgbe05iH0jjgy4HK5KtqCjAz7zm6uplNgUfyjfadbdMdNVGkZwb5M5X9SFOSZUV5ef1VLMCxY8AEDb1nJ/8AJCAHsxWanf1upkntpRgbzz+ux0O5IDcZM0jleHM60vb3Kd/3EyJHxXXjPxbYzNvw30NjSbqxmYMGUIVF6jWZnXIqD3ZIJFc+ZB6nU06NIBWrmg6LM4/E7yl42+Uzez2siij3GZ1DF1cMcsSbB8RKihWvuxVmppqPTFhhZyPIkOzGkseCfv5zOprMKpfF2OJJPBUkt61YjYMeoVWigIsXmU6n8Sj8PyqZ1NYtsVBazkeL8SNR6ZDBeBfvNFHUoEYF5xvJCjootdPVdb8yUVkxdrvbxJ0sWFltqG36y+TZCHn5Q17kaaA+Qk1KOoFFrpoVJI7aGRzxGb0M5q+MwVW0sWWjtJpI1DcWB6HxxIsm2zRH6/dS2BOmhZ2zcn8Mlgep3lbxtM6ktTkFNKgrVyCHDbnUcE8feJZpiRQGcmTqoYI1NkeZnfhJRaWiNViswAWzjNXUblmAU1xeZLC3oAHzMqYPxDUDbesRNLpF7WPQ+JTDvo9q+PEkayABQA3kU02UGrTxmQbcWx349poUHTUdtjF3zJI3NgHf5CY0kaTqFswFaRL6iqBWnFZ5j1ncadIG0mzoLncHGZn6MKtDF+sDRN0RvkZ+UYVqJoBvMWkqo0izM6ogNVmrFbHzAs+nQVojeNemzEfiDWVvETZYrS1eTJ/gxJVrsE6jgmNFXTm34F5laioPcLO3pAk6VUaeLzEeFpXVZG2Yf+JXJPmrj0sWIGRiVRL1sNqgaONNm2F+ntAlkOrTtvAK92O0Df1jHT/C6a9t+43knie5snAPFQUNYLE4FDb9Y6zwDKDEkkaaGwiMMEyNPGYwMWLo7xZAYtQPGYgraSWUA3vBahROqyBfn9JWTeDVZvzIAYAc5reNemWYHqdxW8SThksRoIoiIhgObP0jJs0VWgaJi1aTYOT+kSoaqB07Pdis5jUBm/e4mvC/zBgS9LRHMmqPcVW/rCvy6j6enpKN3p9JKh8G6F17wUL0nUF2GfeV3Nk7HMAoTpAhbBrJG8OSTSnc16STTpLEElsYFyyFqiuKzUAxNmxQHvCzpYmh4zEpWkacZ9IbtdbfdQAOnK0xiN0DubqClXm6NevBgGej06yIKjE11LbTmDZOkqLvJxFTIhgbs2bHoZSqAue4VQuTqK5sajt6RszUB2jzJOGANW1GBuwDZLeu8RBZiqgFcSyp15wP0gZbJpsm/oPSFle4Lxn5xLrxRAAOZQQdPpikBurvm9oHg7iSSQBvUKLZNihWagNzZCmXqN4rSIlYG07FaxRrzADGNjBSe5jV8Z5lIDpaxnaI8IEEniub/SO7JNHTWR4MVGgcHMY6Z1KOp3Fc1JUYZ9OjSLENLBrBOo71tA7laG9Ewus2Lb4fSBqRQFpl1Cq7oKqk+GqziDMxGmhfOYMCXpaI3IvaAUaG4Nk73AntrOf0PAlMDrqqXxJUPfbgA17xHgGrpjWF2GZR1OCWwpzXmAQdLpKR072vVDF3YVv6knidJsdzYGke3rNWXpgaSorY+8S9Q6tQ0aALAvEkE6GZjscZga67cXRyYAgm+5a+e3H1h00bSzMBfMRBABAtroiAMdxJNkVkHz4/WUHcJ+HoAKiA6LOy/ii9N4H7Rt3MV0qM0T9/KIy7wdS3rOCePvErpoAtG3AFC4lbTkMuo7ekHZiqr23jmJSlCudiDvtHvggkk1vV5/qIhixRO5cX6S2Uhwtdvj79IjK6Gm2zt4X0jspTAAkDuiC9S+3tCnJ3jXpr0ektIG82N74iM+98mgN6+/aSA3bqLUoIG0dEsbpWPAzgSlc6u3RpG3i/aIzdendacaaPvGV7ARZvJ9qkasO7UDeM7y+mraW1KLqiREAuk91kAHze3H1gpLHUbK1kNwYtLAKwybq7/WWvSZiPxu/SSdI/b2gZDqdQD8OqYAf9w71bV3ayKxkfWvSDGyy6F3on7+UoOVzqBJ24IgY6SAJ3d4AoaowiMxPdqq4Mz6Alrdjn7uNgx6mlQrDc5+UnVLsg0wJZjV3xf9RtRXTqI1fQHxBgfxFXIG1ekXTXq120ihsn0/qTTUCy02myB3fWUS3UzQ0mjQ5+6gqDpf8Axww6d3vq9eIwNTHZDfHiTUpVW1C2cBbUXX6zZx0x2lMEUZK9Rrxp0rdDiNfzOxHpn5yKRr8OBYb4pSkMbGpfUG+Ns+sEV9LEqNWNvaUFOGHc159fWTQoUSWN1WVPBjV3Ufh6cgfZkr0WZh+Kb02dNV8pbElihRd8+0zqQNYa7YscXgj9vSadFAo7u4AVnzJVtIsMM7ekvW+kKCt77yKBSkgVRq5Y+Kzdtjf1kMCzlV7l3IubMpDgEYH7SaKQwCCWz+h8SrZKYLkDu9IlD3amgpq/P+pQT8LoghQb3uRSALPk9q+IwCQCSaGBtBQbzSH+JovUIPbWleOJFSoqtadNYoxgUuBYOT7SVJOomsVWZp0lbSxK2ZnSNaY3tXP8RhrJPHIk0e00GN5zLXpksPxMgWaAkUqYLKNGnIFy+4HUCb9Isliukb0TGSFF2Dq29JNJXTUD4gWoVnOZQVS17ECLU2kLizvGVt9K01bi5FFX8O4NnG8YztdH9ImvWBx4lKGAoEAKd/viQiqUlRekesds1XzEqaEDDmt5Qsn/ABJxJJIWyLLBVwJtQ207YMlWa7GwFxqWXUxPtmRSUo7cZBGZS0Te3r/EShmFkZO8BdDk8yKFKAX1ccgzRXIXTQxJXplm7+LIH8Ss51AbyaRiw1gm5oi0uQT7yFbkETUMdNTOoqwRXrLB9ZAvXpFEb7y9JugJlWZgdu5EruUX43iprxVAyh2rdWTvISWsniEDZ4hFofTg5gdqEWWhnxP0A6Q7IGRG1j2EW0WTsYAMTVVHZK+sQoH0hxcSjzZ3gLIHpFeTCzQxzAGRAmxFmrjriAFn5xZu6OYyci6iNGrGYBDXZ8e0lsHbEZ8SW48SoSGzzMOp6jeasTZ95i9km8CXDjDqWBi/6nJ1SxfN1Xidb2aqv9TlvuzWnmXAw6hJWqbPNZnL1MWL+k6eoAoNWR5nN1CNZIGZcDI5sE1WJz9VTeRsc+k1YFR8PO8xayCvmxfpKhuYk0aWjXnec7s4tc82Kzm+Z0dQAWCaxZ4r1nP1NTbkUf2GxlQ/Lg6mpbbSTY4xZnD1tbMzAfI7T0eto6hUkEOc0Bc83rZR122sXRr+pccv8f1z6mRtQJZdNZ23/qT1FFV8XFkRNbkFRQBz5MyYsrHtIpttjRk+nIxmCxJDLuTgRuWB1KWoZ4NHMZS97wNqOJOWFKVJIyPK+Zkmsn1sa9PFfT6xOSykBWBbYkZlc9+nS2Sb48yOpSodPwtdlhUioZteQeAagvcArH4RX18wdl/FJOdWw/aQykC2Uk6r1SKkuphh21n6RAkrZwQMZhqNfXPpClB05GLkJrJi6irbnjOb5+9pILAsaY3/AI/vKcE6dWn09q3hQcgkU5zQFyahJ1FixBrgSAdDXdgLVHbf+oGqcGh5o/eJN6iCoGDI9E0emG+pdrImI1Dde6zsY86jgjORsa9oULBN4GAOJnSJ9VhlsAZ80Zm2pjmzXpU1BOKpgRm+R5kDHxadLZJviZX4MTZZNIU2eeZPPg8esrqUFsA0eSKklgep8O+JnSWDYok4FbDMzfUCMV5hRCZB3u+Idzb8bN6TOgDuTIzWM7xEuMWw+XMoKqmgSDV5kkGwBp9D6VMvSkgki/I459YNZJPHiVauLYENvQz9ZDNhhQz6zP0eBWKm1yAKriUR2735PpI+KtIpQfrDIJoEZzwamdGGoO5Hd4uo2uwVwN/YwUb6sUNvAgDkMCCa52I8yf4rEnUx5b5V9mMkstAOCRzEoOzAFW5viNgKsWLP5hJPC2OcUDUoG1AJIoV7ySRr8k/SLSQuVJa7u4jxTXYpaz9IDKnGffcwsk7bXR9IaRdC9riMW22fpzAXV0TY45MZDMK7dvqICnokEMeBmSrCo2SRjxBbVgdwBztvH8SnFec8REaq0+frDRizvg3WDIBb8w33AjUsCaFZyOagoBGbwNvSSrFG1Gq6H7GLLEA2b8CvveMcEENjzuIA1V6aPNwUO7RzZ59YrO9bfX2jNaLAOc5iNB7I3xXERxSGwFJyuNt4jqtaAqxsYqIXkm411Hjbb2gpYJYePW4u8IQS3PHMekAAHcjYxbkC1zt6iScgWwbom/HmOyTekjxiVhxZHcc4Fyb7WGREs8hwQbUDkYl7Lvq4siZjvqtufWHcGJCkZyNjUDNWYGiMk8SjhgynG/GDBVHINAbQA8FTj6iKngOomjnFbfeY+5l2YE8wHw1Xxc+kkigSASD5Ek5Dsgg/MS+n8CqeMH/clmUvnN4Agur8O8k3dwViiDV6R6iUL53o5uSt7eNmviUqhSN/P+4KwanBIJPtXMaliNmz45MWaF0fHqJQKvWoHV6C5J4Xczaqr0O3tKDFayaAxe0nfUMC9/aBtvhHbEbVqo1mtyZKkgkFc3sJPcGOkHBz7Sgu1g6QPoIjxTarDKT8q3zFbMaa2+VfZjF0NLAmueR5gt2SQrIefSBnqcpQVrI33Nxi7HFbSW0hbW6PJFQLr+JnN4rjxEeNEawoLVVA49OYnsMtDnPtIzpNqbu743ljVWmttm9PeSakbUu1eDe5iDOoIOoG843PvxBQoah42rNQokL8J2o+RAGur1JODXJjOtmLBeAc7e0a047tWo5pc49YibVx5381A8NWKtamwAfaaFbs3enyNhMgS1aRQvPrGLF6QRkemIgpWIPcOdgalMThlsDfjBkAAi2B0gYFRg3Wkgkjn8wiUGLthrPyrPzlguyldLWVrVWb9JKarApWV9yPAlMAq6hqN8kfrAzHaRwQMVL6bdoBYigPGZkxA6mRd4HiFPoJYFm1bn3/ALiNowbUKUVeRyI17lyKOQDclSxNZHAYnYSgF1AWRYyPSIzDdVbBJ8nFk3+0lS+rZjqwa8w7nC/C1/Cb3EoFeouQdZOAM2PWIxl3DUaIBriNWKNqXIF77STlXFVfrRq4DuVdG154JiDc5HmuTwJmpYGivO0QLK5KgrR2GDX3UtQCLIIUA0o4gZsWGkpdDJFg5jbWxyWbjarP9wBwNBBYj/8AYeYgSMEKQ3N8DmTaaiXKaSr2RWrc36fWFlW8bkeYn0aWZSdJPxEfrEWXXbC9QoC8eIlN+m1oFYkad9v1iYNYNcixzX3mZ0+liQSQ138/7miltVDcYDXiucyQ16fdiqNEA3BW6ikght7OOf4khEAAvcWbEfcUA7Te2fiEmkrp6xTUxJFY5MZLMdYFY2IxEtdQAMDqbYLmxKN94rJHGDV7yKRqSrAqSQAd9hN2rADH5jYTnXurSKANGueZY1Kx0gqbBrY5+xIpLUsCQVzewMog6QVvSKJGMERBdWSDpo0viWLABUgmvaxIqQSzYNtgjar/ANy9T6aprI+I736SUvUMIQxz7SnUKCU7gT8RFVIBreobXxNeme0K3G/+5lqGu25AAHHiUNf4dkFjd/fzk0VbAg0AK58zRSDj3o3zM1JBxeNm4qvMvpqo0rnu3BmdJSs4uybOTiNC16qbODXMnLgC1bx6iaUrZa9R2rMmpPvZrqrrHEsGqIO1n0kCiHF9x3IOd5QbVWkWB+szpNmydyec8SUsEkqN9hJUsC2ldORNFF7g1WPQSKVVRoEXXO2DAEsabNelZ/uKzS6WBPrzKFg5CsrftIpLUsUACnbfkH0lA+cHeSQukkXR5IjJGuznAGniTRVplQGJtfvMpu00ODJptJJUnO9SgGvbbY8SKmrXJqs5o3BGYXZPrjeSqqpAsgmX4AKngesmpA1WLvODXM1Nk6gtUPGBIQq4N78VGDuABnEika47geDNQLJINzEEsAVG36zUX+VSNpFBglb95ZJ0ihdZIkKATkHSNhGGBNjJz8x93IpLBbAOflNl1EAUfnMhQIOM+JoNIUkHHmRUelgHke00Q48V5mSVqsjE1yFIIszKs6o7/wARr9mT93LUY/iQR90JUIg+iqoAkwo+YiQcT9AujPFZi/SGVPmPHi4AY4h7wFDcVDcesSh8XtC6wMwuGVNwAvEV5gbbPjiH6GAF37xc7R1ZwDA7DGBAJJAoj6yGBBBOfBlg02BvJa+efEYYdxN3zM+qRYI5x6TVrJq8VMOotNxLhxh1CRxQnM1arFTqetqJnO3adjXiXA53AJ2sePMw6o1HSDgTfqAjg2f2mPUJrNUfWXCcr6rCja7qZGj8R81/qdDgoL5x85y9UFixJvSLI/oyjc3UAI1AaiDjyJy9UhgbIxsG4E6uoTRwb2mDi8qpH/lX7y4ry8/rUCpKgn1yBicT/h2Su/BrPnE7epebDWMkAf1OJ/jJqlON9xKcrw4uooQaye7eyT9feZ6mcG2JtrDDkTo6iHqEs7auTR3mPUYrqW+1byKFmKuVGfU00tHPvj7zMSdN0NC3gjxNCh6aijqNfF/qSd2XSxmdTWIA12KPIzFqUjPTycAVv7ym1JRoqtYUgWIiTXwksRzjHnMioqWAalQWovF4mLGnCqfzfCOZuxJHxAf5W28gqEIbnB9zxM/6mpUrnUbu5g1GyoDG8ZyP7mlW+pmyosrchidObwKEipQdLCrAbgHgSW7dIKWeMWBiaFdTWqMv/l6SAxrIbaz649JFTYkHp3qrI2apBWqY7nNnN+P2mn5yQKU4sHeSRqJ1G8ZoyaixmtsLLbnfzG5HDCz42j6hK6lxpzZFZMkr+H0wPix8Q/qRfhYgdoOAqcGT26rUCsHBmhOaClvFydJXNEDwdxMaaQV02Vr0rJgVUkKCSgvnFVD8uVLE/LHzlElk4F72d/EijGTEjtB/NdeZeKtj5+/rArpN2LxxJVS7amIwLK+fS5jQg1eBqN+ciDAFeL/YSgxob2BtAqGzpIofF4mdPEVQHZfO2BiV2fELxi4zkEUSQM1JDW98HF3vM6eJ00oY73d3BSWs2TqOCN/aaaS251GrMhyy2tgDzQyZnQGrABzJ+EYXSowDKZdIAu7HxVJJ/LpLe/MmmKBftC7Y8wBWsrXgeYEFRsQvg1cLNGwbPyx85moyoYgLkDf+5JxS3Rv6zTUfI9Re8RAUarvbeCoBRJz5x/UjDG6sjzvLCaupbN8Iyv8AVRZBrOBtFpjBFE93F8RXQHb6+axLrU2EO3xeJK9wqm2zQ9JJmNN6q+cVYB58kyhvZFDAu+IaTfcdR5owVhBjnJ33+UbaQMV/H3tExNEE0OTjJhWgCiDj4v8AURj4QaGkeYiAWBFVvHi9ifEZUqdio8UMZiVgsV8O5wPMrSDSqe3xeKi/LVGyPUc+suyRkjbPiB4zPb2qdzsJoO4mzmzQhRUBqs/WSBreyR2jK/xiJWEaIJq/Gdo7DYPxeDDJ9CBtUphqNhCP/KTp4kUNPb7cgSwEsnwcX/EkGwBRsZNDfEpctsdNb3uIKwFdORzmyf1gpOnmicEb7SiCbs3jNHeTZUFbxz6molSLYAAZ/qQcEj4B5BjI0qKOrHxCBzYK6ojwDTYoA4lDTpyvO1bwrTRogVtyMxAnO9nzjElStINKoNf6iJN6VOL28yhqIokXtV7xgFRfIrPmB4Aws2bsmIVpNCzxnaMU3UtmGBdX+knVWaIIFCI8O1YVdeh4gLFWl/rWJW7dqMK5iu8dxPOPSBqXQW1bkekAunuJ533gpOrAIU433laWbBOo1mjAyViQck2d5bMFAAYD9pOQCtiuTjJqGkom9mviH9SVYB2qRst1Y9oFRq7QKPMYvUcFr29Y6qu0gH8pr6xAkKV8HJxWTLpWbSNh9NpFkqbUkn5WPOZoLIqwMUbMkM2sUoO7XQ3M2FWSST6X77fOThFDXexs5vxEAep1AWYWBlcZ9LEAMEEgajxnI+crUCCCR6A8RBjzqFDC1L06ja9NvRvHvAyGlVXsB8eBiWCgJIq/NSBZoUzHmhvjfG0pMOTXacXe4goBfz4Y3uTvEjMwJ1N3GwRvtNNJY9x1GrOYmYqGUVXJHJqSDcrpFGvBuxELWxp0rdXF/wDWu4JonUAP2l7Y0lseIGkBW6naFI/WUrKQezT3HtAy2YgCuSrKv+JqxGWOnIbUdtxYv1iUvSrMFWtPi8bbyW7RpBo39ZSsdNFgMURfHiOtIDA2aHrfj79YgpSLJJxexPvt85BIayqhiDi9xHRfqAuwwCSMedsbRBieCCoFLX39iIHYYEGgRfaeIttNpd1XIEoLqNjpv/7ePeAZqC9x/wAqG+N8RGsN0xbVkc1+0AprVg53JOYlvXZHZVXq3E0CsRbNqxnSdxA2aOzKx1NTGww9pq7KqjI384+kguUUqGXTVkihZqIA9Pp/5kgnUOPSolQwQh7V0reCD+srSGa10nHzivcaS3jGIG1NlWVTY0kCxneBqVlzaEd11W80Kq1KpG+3G28zs6fgYk3V2t53zNVsiiaxRtuPEkIdtAHTTFkYHO286VpmIYkgk4v9pnp0LrNbAi8+KhnqdWywsCyuK32FbSCoNEmgCQeTtKsPfDcDgeslSauiNI25lhS9Femwx8VbSaQUUF7Bk+4E0XRZYDP3tI7qCkMTyAN/pK6bHVYHYcXq3EihYShr3zYLE5ldN2azqYgnB52j0nqEW+tqzR3EerSCurtAs1i8cSKSnKDCnbm7H6yV/wCO9KhR5H37xID00H5iQTY/apYBNgBmNeMSKBpUt2m7HnM0UqQbQ77Ab5iZSKJDKue0gWMx22nILE7XjmTUtNIYqiDtxYuS1qmlTRJyOfWWpO2oeDn6SlGk3vjxIClIs6s5+6ioEmgG8WdpI7+rZZQVFkXj29JWpgowbUYHMioWCGvORsIxgA6LBI2yI1UsF0o3uOILqNLknmhv9JFDVCtk1ZHNRlcajnOCc3EpGrbtIq73EpVLmibbagZnUhGZrOq7ODU0NAYYfLaRbKMHH7ygpXpg2Cauxj9JFILalgBpHkS9ILWNNVJXc/ERxYxcsAqtlSo/xMihVrytZwKlBRVA7H6yM2Tpsna+ZoGOASBwc8SamgkKNIOTsPM0Uizq+n9RAaQWHi/6hR6nUyRYyRxvtIJQAyR3ZwL2lWSKJkhj4IobSgC2Qh9xJoM0FHYCCeMiaDRkgfOpkWNjf1xv9JYPd4FcGTUqVTuc+CZSltwSbODGBqxdn0hZXtvFXe3EigzQz49Y1JViRge8gDQo5sTRaHF+JFIxVipotXRUgSdJWhVehlqCd9zM6j01XuoLv4lglVIBkqxIGal0QPlM6zql+I3tK/LYEzo9Rvioy/y+MTOkNUIfI/SEQfRi/aPfcQyYbHB3n6CdGPS4UFzcLsbXChvADmycQGciELFVzEoEfSGYh4jON4AXYuotzk1DF3fyion3gD43zFeQI6+kfFAwCGBBkHFEYuU+Tk7RNVHmMM/zbTB+fM2ODjmYvesUNUuHHOy0llgDMHOk3ZI9t50OgA1Cj6TBwL9PEuBzPqZbAqvSc/UFmiJ19TC+pnM5I2N+ly4TA2dgTwJh1aKaiDQPAm3UHcFzjeY9Qg1bVeAK3lG5OohdgCe2r+U5erak01kE4AwZ1shdBY0k7ZnN1FUDj38yory4uq6qwWiSBdkEVPP669RSdQs1x4npv01V/izub5M87/5FsWIJAGAfEty/DicaXJHa33z5kE6WAcYNDbnebdSmBYnbkTnyCR/lYLGKuTGbA0VBIPN/1I06F1BxbGz5+8ygfxGXRb2CNW2JDdMKSwII4W5FKsyw/MzUo3IPdF3dTpYWqFnVc109N2JLUFOw/TEiwvTFNn0kVFZdRSe1lwdri7roWwGBiU2DQOdtNyGWuoAb9vv1uZ36lD5UNR3z+kgp+J1aLUtWLoyywFKTkjSF9PaRoPU6YOkKcBSxkVKXw3xEnbF0ZGsBh8TUtk5FS200bA/9vv5Q0Ku7Z5vzIpWM3V0NtV1YEgLuwFN6b/WW5s4vTtjiDMW1McheQT97SKmxB1a6K+m0lqIIyG/iV8Jo7mxqkglnAS31WL2md+EnTS6iw3zUnVQFkmuSDmW3TAawAQdhcRUG+FB4/SZU8RbP06VaG5DCJhqNECrwZoRpT1Pj9pANWL9KuRSwtJK+ePsQcjTqKnG/EZWmAN44+/WSSLXUdxWmY0Ykrr6gBNLuLjNg3qs+BtFoPU6YYrpJqrP39mHaoogX5mdVhagKGSau6OItLKTgE+ksKAaDZ5uJu42DVY9pnTSMCx2k+keVbK4ONoE6ksjC8xKNPJBPMigipI05v3hpGiw2TEpDYXu1WL2jZFUkgBlOwuRRibpsliq81vAW/TpUrk6rj0q7E4oHb/UoDSt734mapEUWYgrYlZ47uOIAnpms8CrgRkAXjf794lHjTtscxFAziz28XFYJUMxF4Agql+mCRpNUtnaSeBiQ2DZ8DaCsFZR3HF7H78wwLqveWvTCtlqO5uI0lGUEmrOYLQOoHS18byrs4O36CFhgeQBg3BQ1U2RjA8+sQypA+L34goFVW/MFNkBO67F3USpDChV1BqJyYhg5Y49DmMoq5FFeBcdIzZOAciBpGp8qtYzdxgZoi72jukxkn9IKQrHOdqiM7Omt+PsQ3SyPfG8GXur55+/MV5AJztUlWAD8RqOF3F+IyaOGv0G0NOpMjTe1mFAbj53EeBXAVfiOLuiKjZX3YC9xGANVEi9zcfJK8beBBUhA0bA0n95QNAWCc1ECGU8gbGJcQXg3tRuY9OhQ+oWauJSGWl77sAyigywquBck8IHu7icWbzmUL6iYWvIMBpJzgDiHaowcn6xHgNnBUEHzKUkDyOIh28/K4yO+s+a8xKwX2XWxomBS2onSu+T4hY7dRq8Af6gF1LkaScCI8DWGrUSb2HMYbTpFM2OQcQ7Vu/a5YQDAaiN4xgIZTZq6uhBQw7tm22jOWNYo17Rg6hnOnYg7xHh3TEEHwYrNsoDA+/8AES2D78+kQNkaAepeLkmtR2aiws5iDdwtid80c/1AdPwAfAlKqknNBTsP0iBDV1EoLXJDQK2QCtjfzLwqA7H9pNlXqwTtV7xA6bjurHH7SibWyNjnFREU6g2azX36xAg6NT1+UD0gFsuvqABscXW0DhsNfoNjJVD1EBK6DstnaMhFx+vMFBGChcFjV7EVL0vZJUEnYcxhAGosQdzZ/mDUxxYA29IGSjNjtO00shhakrhfNyU7xZ2ArVf3xEvaSVsaua4kg6y6i9W++I1QadeoWTZkIwYgdPvORYxXzlHpKrErRXhbgZ3kamYqLzR+n8RqT1U7UK/mOq4wqsT+ULuB+mIyQnTJuyfrEZFTdMoKn95Q1flOoDHHtt5iBKNVm9qv2jZe8DuvcjP3vEDYg9K9JBXeh6RaNbjupTnOcCLUvZqbTfZW+I1Rup0xaheEsxGo4eg5NHZboyUYKEFMxqySCK+8wARVbA9W+/vE1VFWgTTXknaIxp6imyoLHIEAdLah2t7b/wBRswLdvaoxjiCHWN7VRgg81AxbBrYWNjz6w4ZQDrP7e0FHI/NycYiVrYfh27ZW9qx58RKNUGjWHFmjBT3gMzUBg0T8v4gUAYkUVOAt7/f0lqqs54C1YG3piSAmrqp2LpO51XKF3RUEeYwyqhN+mNwIKdBIDZONP0z9cSbQtNWihmsbAVxtKJ/48q3bvQ9PMTDIUk+SM/e8kMtpqbR+UDyPsyQsr+I4GqkO10bqWTpag1kHYA0RM0U9TpgsujhbO3mUAqA2KH+X7yak1cDQNLMavIOPvM0Cuh1FRqOVH9wVAN2pyck/3HeoHSCAv6SKDSw2sCjfjea6mUgVYwDzJVtSWLZVGCD6eklaG15sWcYkUl0CWUXq+gmnTFIX1jNHaZKwJGg6zZUHxjzNW6aqSRVcLciipF6u5m0i80fSapq6nSpVonJu5CorMRsBvX6TXC9PB/uRSMClFrg85lC6/wAvGB+0lSVsZ9r9pTr3hbN7kefMmkoEaMjK7/SAGpgCaX6xIcISxH5QsaLrWyoThbO0ioaMKNBzg7DaPpMFCrTMd8g4kKAu9eNU2XpgNRam3JuRQqnXu9MC4Jg6sg+28R+LBOCOdpanVzekTOko+oJG1+YE2xUb/pBfNfFtEuWAW3OQD4x5kVLRFpdWoAnO0oEBhqY15Ik6BuK9r5l6VO+FH7SKDW3yFHrvGbNAixABVF73t5jFq3rVUZNTVpdVuAJX5ao43xII0tVepEtWFAlqzVSSpkamHd2na5VEfm2z6SFGpKqicCXhBZHzkUGrfDjVWTjaUA1n6iIIBzk8mVvtsJFJY4aqMDvkekBkea2MBjPnmRSUo1EgbnaWAFGrV85mpF2DquxfiWFFkge0mkoEA2zGhL6dtspHrIADXefImyUq7yKj0oDHcssE+cSBY/3LrIH6TKs6tcpkVUbZIs1cWCN64hlhkVWBISf/AOQhHp9BCLRr6Ra9oY/1ETXMLn6BdMBX2YYHMVLfyjwRmABzA4zDjEXmAO8x/lk1k+IcwAqjcZznMRqo13xAxgCiflUnc/6jI8Qqh/uAS3wkAye2qlHNyGq/WMmbiluQeccTRiKzvMW32lHGHUAG/qdtpz9UDAu6E6uoOazOd6s8zQ3P1B23fsKnM9F9RH6ZnU9Vm/XM53FMwqhKgYPsCLvj0mDKq4A5nQWI8aSZg5BzW23v4lk5+qpOmwcb83OPqBQO1q3xVmdZ5NZo/MTn61UACc+u3pcqHHB1VD6hjbBA9Zw9dQNfTBWicmsTv63To8kH149Zw/8AyAKcnLAAS45n43HXTrSp083e3E53VCqmgQuaIrPibdUnUt/E1ATNupqw1k2QKzByWYK2Qi2KOAc1MnCK1mgbvOyiVoUMAB270ODBu5aOCB2m6v0kU6xetOGUhR48fzJ6iL8VDSCKBGZoRZO5+dTN1XLEMBVGzvM6ilSltbCz45FcSTp1K4I8geJVEdR1G2xO37SNRUWt6SQJnSs2I0ogrTm8xOLRbsAVmNgjDUcadr3vxIXCmhkj6iTWaQUogMBV4r9ZGnJH5iNwOLlnSDamwf8Ay+ouSyCtj7g4kUmbKKZMC92G0a/h/Ao0He+BxvBwtNdswobiJgQV31HAqZkzZFKKcYOxHPiNaLdo3vF8SmfU1NvkTLSNQVVsb14mdLA1L1LyDd/+oiZvBDUPEtiGC2aOnBur9JCizuTn2mdIMq1Z2FUCN5BosSw+m8rSAbOrOMniB+NlA23uZVRHT2sCc5A8SAqoSAAcy9Rq12uuZDFbVtO23kHxM6DYaumCQeM+ZAZRsQN6FZ95SilwLsZ9YjQ2ujxe0yoxH+QoGxggcfYjKqodBWeaxKKUKon2Mk0qsasgVVzL0DQIDp+E72eImXUt1gZ25gd+7c4la7NHcGr3kKC1XaLFESGAXqeDd54ESqNVBcbkCUSGIvBoUbk00k3pohvlBwCNRHw7AiMWfUji6uLHrWxs7zM8BC2GYenqJQqlYc5r1kmw7ALjnMYelsfDfmJSVVVxW58ympkBIOP1ERAIBI2OPQ+IKKG2T55iBWlWGrehWYKPiA3I3AjNA2Dg8XArQ5I9DEeEMWorO54lrpvSMHeSeTuRiBvWDWTgQUdAhcYB29ZQrVhfP0i192R3XiTpU4C43oGSqKIC9QajzeePv+YnIqgwah4lKobO2MG949PdfI9aiqollXRqI7RVWPEeCxJqTdcHAreUB3soFcbyVLoHSwxeRJpVNVueIBqXG2BvA6Wz/j9QYlGV1Dbxm4LprDVd0KiS6utx9RKsAYsqfWBpUAk+SL2jKqAy9ufG0ZX3PsYaRmxcSpDXTsBR3vxDSCoBqh6cxZxYyaAEsEljq4OKi1UgX82kGs+9SWAVs2M/SKhdaflKNEUMYwbkqJq4I2+svQCLOy+kQUWcn6xgADN1VZ8QApSxJrOB5lNpJU7ciQb1FR4jVsdu20DUAqnIyTG3/wBYxjHPEgkMdqIN+xglAEcsPrEalZfytRzxkxpkknJI3AiNbqSeN/5jIHAJA8GSZ4W0BUXviUmjCgaf2Eg1pPNCt49iLvwMwCiqsi3W9/OUpBagK3GDEOpZpvMkKCdIHuBxEFUEezYN2B4+/wCYMdgGDVnaOwwAusYNwC3ybPF1EpTKtaq7QBQIi7We2A+W4iFAfmoCsncR0R1CqisZzALFFlYHfIHgxKAmayTEj4tfhuo20miVoKTvuD4gFMNXTGDsM3dxKVo0wBs1fPr+8Sb4GSDfqIzp02LAPrt6enEkBaztkYIHEqlGpRQvc1j7xDQK5Y+8CAqua1FRQzxBS0/D+EdnrwsTKpAx8Js+h2iY5Grc4FXKD2TqPwn9YGrpkF6VdrERUL1PW7AOa+/5kBVvSAMmyOLl4YCyVJGDf0EQDEUKYN8vX7/SNkXQWrtVRisxVqBonB2uoYGwIG2T+ggZ9rPqejxttNLQlXA+LIXxIo/iFQuw84jXqaV7b0ghc3JM9KpstkkbH5/SWV1dIAqdt7ksqtmqC3vVqY0Gbr4v1EQClPyvVk1YyYJRLAZsYIHEMEWrbjIv9PSMrm+5h6Nv7wMtKoX6Y0925qxL6f4fwVpbzsBUil0knJUeflHdFdQ7jgC4lLKArn4QbIqs7SkZNRpCdxgxF+4h73wRmpARbC6c5JUcGINCqjqd2CxBzwPv94MwYAB1erO3391A0aBPHawP0H6w06nJJJri6/694jU6r+HroaVAoEePSUApfU6jwPSSAF3DAbWTViUBXU0qON79JBNRpIRxgk3XgyQFDXpBJN/zJRyqkphQQN5ZCsBgijzVgyaGjAHoqCLxv5AgpQClcKLNYyfWR0h6dxB+YlACrQn1F7f1JqT6YVmxRLDBUSzSh0tbNWeIgoVrGojnS37yu0BgRq0it+JAadNUUFKC3m+BURUEVWAbNjnbmI2FGq9RwMy/xCSQwODg+JNC0rUdKnnA3gyqOoLBGRQ8SQoulUb2QJeNIzxg3IqabbUGB3vH35mgVSuqhQAoEfxIVdTG28VmoIAP8qArJ49JBVYpupqaq2qsiX2sVfyb9j/Eiir6VAus5xKRtN1sKGZNJY0qt0NRIJl6SekBWw380ZGlWFkHHPIldMUxNWTe/MyqV9PQCKYDJ439Y0oknckYxJ0rpsMfXMvQBsCfnJpKoLqQEZqzxK6egDTVH9BUkBQl70BzHmhd+BM6FlBoqhQmigB8AjcUDMyxAonY7xhRdAe49ZFS1ICmzjI+UGYFcMCBfEBWkAmsYN/pBRqY0c+smhQUFdRFUBKoM41Df9JKgD/K/fiXZBIUcSKlRCsQ2cylVVFkDOcSOmRp7Sa2mh0scjn9YiqviXn3iFaviA9IIunIHcePMZqrXkedpnSgUAmxm9sTXAJUEZ54mYFbZHvNBQB/8RgSSPpqtAbX+kGUVY4NxXjNXUZJvO9+8ihotXYEdbXjaRQugObIlrVLfykVKlokU1zTFXx7SOmLbf8AWWo3+kipq8M/cL4mq0w1TKu7CzVCQLEzrOqHb84xlZLbSlwPeQk+2EPveEgPoAL3jKg/WM+ggMZJzP0G6YURFxtC7MAo4gDo3A5EQ3s+I9h6QBMuIbiubj29fSGSYAAeIU3kxXVAftA0RAwaJ2FxcY2lZ5kkZsQBFeeJA88XL9OaiYADHEZMSoo5IF/OQwrkzRqAu8zNja2a2lHGDZHdXtOdxkVVzoZfG+8xIGrO8uG521EZ+L1M5+otEfqJ0sKWwT5mTDFnN5wJUDk6irpA2JPymR6VtQ1Hf7E6HGphe3tvOdiQdIzd+konO2q7AwMd24nL1sLelTW/vOrqKGBBI84G05uqpUEEY9rzLi44W1IgF6U8Xz5+/E4ep0TkEUvzx93O/rKuK8YA9px9QNdG9W+P2EuOT4ea/TBYEi8/EcTAorFtJYjXjzdTs64XTSC/Brfz+85ioTparBY2SK3x+0blxmUPTXmji+PvEz7rA6gHkgG8y9evphjQFeMHaToo2uGP0k06yAZWHaAy8jz/AFJYOwyba+ST9ZdX1eNQHIozMKQvaWrc+WzM6io6iNqF77lZLVpo4OoUOPnNjnuPduQK55qZhdfVB2Teqr5yKn/EfhAk6Qbs44v0kNrDXwN9W4muvT1FRabV6bzI0wps7HA2kUrEMKHwjGT7yV1BVX4VG4vFyjqFgjtA8X9ZJRe2uNtI3FSKlI6beO3znEhRZ79r3M27rItgTR2/SQ1bIN+ax/qZ0mYVSWILEasebqMrpUjOcXxHWhbu29BviINrUMQAD6bzOkzNqR+Io816yApUqKUMvI8zXSd1Gf0uRWo9wzWcZ+9plRhOrOMnuzkn95LKQwJBvlRLplSgSV398xggn/InIAxMqbIqKF2CT9feA6XxabJz9ZWkN1BwvqKuJm7wgyW9N5l6NPdqvgDN7j1iIF3pB0745jYCs5G+2YiGUf8Aj9czOgAOABelbyL5khDpNilhpBII+Vc4ld2xu6EyoQq91nObuFK1kE7783Utga7Rf9yAtJeq7zgekgK7lU1dVV/2Ylu+/jNDzEG1gMaC+0QXuNYN/KRVFpIYGlBH7/LiDIWXfuO+YxZbuGa8ZgthaUtW9/xM6rEFW7fN5FYh26ACCCSO0bfOagBms5vb1PpJ06zjC7+JJkEGokcXxz6R2wbGyjN7iO9LhRnVjI3zJIBABN87QMMNiAprf3gqsqhRekb+8dMP/UHxeYFR20dtgNjiI8AViaNafWSANVkYvcy8km7v2jNaQFF+v7wPEABtWTQbB5upWkqu2+LgFGmybJ/qAOtQ1ihEApOz1jcesWQwGkAjx5MekhrU53PiA+KiBq9sxLhlWIyTquJlNi7vxGB2EAtX7y9zqPd4FcyapkwXTRwb2/uaKmWI3/S5OiyCcLvtLDgdQKou73ESh3AgG6G97yW3BKg1k+8KBWqB5rxDSym7tfrmCgmoUOLznmUqnPiTQ7aHsKwZfcWObPGP0iNKgXtqHkx6VOogk59buPFdosHmt4ADTqvJ/WSqHlBsQNohemnA9feJTqXUQNNb1KrON99ojIBtQwLHI8yiCwpjbepkj4sgXXjMrIBAJI3/AFgoiDvZ8kR9unSbGRUrnPdyBVZiI1Nf5TnbiIwqd5r/AFcolg4qyB53i1aHCjus7wxs1fLiKg8chTyccwUMAAMLzn+Y9JAzlecXEADVHO4ob4iNQU7cefWSBnNnO5lqG1bm6FY/SM1XaL5uoAtCEkgtv87l0VHNVv6+slFpbJtj4G+Ia9fTDYFDeojUpIoOPU/3JAIb4Vxz6xgUbA9fFwGSAwGqs4iM2VmNMe8HmDK1gkHVysKIB0kkHeWKNXknYAcwCCo09wKm6rznmaBBqIAJYbjgmQRZFil3IriXdPpXOrbG+eIAhr34Xe9xGVFDtDVk4iK57jjB22lUy5/L9cyTw0D0ADS3ZF8wXpsSRXb84lRewi/I07GaDVqIJYkgVj9BA2aLnIvO5xK0o2ogsRY3Fm4zTfCNXy3PMSoF6eovqvxziAXpKLuQDi/7MFJP/wBg4s158yVYugbAXPGPNQq7ZcHf0iBURRCqCM488TQq7CiTr1b3/XEndu8DVRvH1jCkKdN0bs4znaCgyNg/UDaWVTQQ1oSRgH95WCQzd15ArmLTqNfCp9KuSZr0xqarJvasX/MZZx1MbKM6jkesNWnqhFIbUTmt88SaBpTR5rTtEDNWG0q1CzY3MaDqL0wqnSt2wvc+YaWAwtpucXmCqulKHtWA31gox0yzGgSuTzYkql7ixe7YmgDklSTZGP6EZA0UgL3m63P8RBP4fTNtqYrYzVm5YVumt0wvc/3EqgJqL2T4F2KgH/EQOSoGc8e0kzW6H4gGMmv0MRUqwtFsWbGM8YjHTNMVw258E8Q26o10HrOM/KAW2tgVZyW1HJPyv6xsjWt3Zo0NolUhTpLUbs4+k2B/Mc3RCgVZkEzKr+H3FlJIwP5mq9JdRIu/FYv+5GnW4F6U9qJEsOE6oQUdVgY9eJNB994yF+LVuPWM1hioastEBmmAIOSANvuowrC8dm/mTSV0gy9MAEKL7s7mWvTZnb/HJ9R6yEVQEoeo04B+s2XVekk222P0EzpIUDV3dwJ3OJSr07aixyOCTGxBGATfNbmNOmNFlrP/AIjfEihaqyLzt8X9kQ7lWnrz/uCsXTVYAzmoBQSSFprv09JFIwG1C1GM4/TE1OtviYl75P6yADqpwNWeMx6O00TWSTiSkFW7W2PjjzNNKhe61zt/coVQJBPgVzEAGa7pPaRSWOn3kcn6GX3BhWQu9nPvJLBOqFWm1Y2/aBAIo+9AbSErGFzRrJxLXWFCjAsXR5kqG0j/AB3MdAhbI9Ao3kUmiobvjez5iUYqjXnaNQ2rc2R9iXg7Cz5rczOglRTqticj3moUr5rYmZqo0kk59BviWp1rqxQvNbSKShez0AMn18QUHX8IwSf6gR/iKP0Eaqbpx3H0/aRSWQzWGNm4FSApO54ESr2mrImlgEXnkD1kpIKAhU2DNFUFsWTfykAa6P5fMrV+G6qpB1Gv+pNJfcOCa3veSPNK1b4jrUc1R4AgAwHpIpRSAjANC8ia0dXpM1rSBf02M0BayCc/eJIpacn3jVVLEgmrHvKORjN5uLpqAMtZ9BJpNMjk15jAz3VIDFhYrxKCjce8ipWoII28zQDt7jm5moNAHepouAaMzqapVOLmigAZxmJRgH9hHWo7ipnWdUVBb7qWcCpDNpepYyBJSO2ENLQi0PorrFbQrEDvgQsbz9AumB5hVE5uF2bhZMAWOI8VVxEG7BjAxkXAD1GYGiIDeHO0AOPeImsCBzi47o3UDGLzdxVeeIzZEW+PpAFYEm85lMPpJI28Rhn1KYGuZm1EEnHymrURjEy3JvYiOBi1EnVZmL0RS37mbuTVVMepqvmziaG5+ouBZx4PmYPek0FnQ4BWiLmTKCd5Qc/UIZMUBzOd7C1QIYUBOhjnKmzMHGKs3v8A6lE5ephiucznfQCSbZjY3xOtyemdQXYZnN1NTjI7TkVuZcXHB1EJ21VwLGJxdQLqNVvkz0OojFrN7UNpx/8AyAhJ7D8P6zSOR4cDMFJDBfA0g39JydTph2bSQGYfQHgTs66V8IJG+KnK9E6wGUDY77cQcyMOodSa6qgMjYyBpZiWuicjz8pZGpiasEYzsZJfqV+FpCkYMmqZnS2nQSLH5jmR1EFDJIPkiyflNDrDHJ1GwaGD+kQRQhLDUKoat5FJlf8Ax0oVsfpExUrS4/1KCozkgHVvtvJ/9lNn13H/AFIqEFdAINFXGkADav8AuZP2nT3G8Zmxv4QxBOR4vxM2J6R1hbx3E+ZmVT2K195Yjzj5zPRqO5r5TRwXyT2tmgJlTs4JLYGkXUmpIaVNir5P7x6s6WAAOBQNx9VemB8NYzWciIiloCxvM6WIZC7EigW/niJiHGqtgBYlgg5ojxXNcTM5LHda58zOkgEM5JJGo1vvUXayqF1fM5uXqYL+Hp23k5D3Zs4JG0x9GhlBUWceL5+URsA6QpNVR4lhO3PdihqiVEZrzq5mVIFgy4xjMmtLUAKI00IbGqNt60SI7tdIOdx/Uz9HjNgLKgNmvOIHSGyWJ23wZZJXuC3QF+8htTZYCt6mVGEF1CwTXjGD84lAs7XyYaGJFl9qF1GyqD8OKz7zMxq/5CCAoIxQzEVDMaIBb9BKK9o0n1ix8WVr+OJNPEv3DV4FWOZK0xsk+MGpWDZ3H8xamClNABWZUYCVZQAG+ZzEydou/n5+UfeG3Opt8CoIoCUbasZkVQqgaVT7x4ZcfWIBdV0QdzHq7gCCWPr98TMxpKkgaaYUAJLULTPAoxk9ulSc7ePaO2Xvq8ZgslCjcsTnnBiClsi/rGbcm9t6AzJCsTRLYFDaAAAo7eplK2aKjbFbxkLpquKMDhcZBk6AVJY0RewxBu4as7VfEYIqwSK2+XEnJzR0+/MFBSDvt+8DpNUSD5beBZ6KUARvCmPknyNpKg6igSbH8/KVsMAH3gqqE7heKzmFBn9TmJR2GWwfeAXSaq7FAekM1VGzjfeK8aQSL2zj2gojQ7TeZSldW5v3j1FO4JkDMCCbJ+ggYVdTYJo+v9wUCznPJkhbIJY0MbS2C7VWMyDMeoAvGIEas8/YhpraypgCCCcitj59IKgoEE+BViIUx9No9zzVWfeGpvgr4fSJUgNNQWx7nNwKj8xx6+flDSwJNmzvtUpFAXuFgCu7eIyFjYKcbHiXYK1/1JpWYYN8w23BOqIzA03QBBFV/wBxN29t74zH4o7/AHUCSvdXGYA1Kht2J2viNRq5ajsBQi7znFHgRd1gktQFC6kqUAobFXyZYNHuFcCruSwVRtQrNf3GB2ChqU+npAHp1H/yIx84Hu7iK0irG0FN52A9fHEQNkk2RyPEAB3MbJo4PrK1KVUJfz3uGpgugL3CFMrWCbbFjb7xJMMoAGo/qM/SWK0doU+hiRRo7s0K7vMFVS3/AJVn+oGu9SYwazBVC7ZVhpA/7iBAwQbY1v6xk0ukXZ29D4gEkBbWjwNJ4lgIri9RPvjHBhqK9+myB3ehh3MLIAB4ERn0xqzbV4sD94IACaq+YtLGiWalBUXUtlVe0pis1zAwrd9MoHGBmBXU12NRHjaLSNOBYOTiVqsXla2ze3H1iInGoX/iNOobRDSz3ZqwD6/KVYZryVrIJ2MWtwv4elQy1A1WpChA+fJs3GyAqCzWNskZPyk96mwe82OCP29Jp00ULRtgBQvzJUPhXCqfQmUWU9PfNZxjaQoQtdENVnEo9ppgdRwDfF/1EDCnpiwAylarxzzE3Z2d2aGeIzWkLqPdn0HgQsrT6bx3ekAa6A41FidrvF+sEUMRROnxtn5/KDFupZIABzQ3x/1JpiVLMwCihYAxEa1VVY1Wq6JEpOoNVMqqpFDTdwZUUURxRoQ09gxYOTj0kmdB2wRZHjb/AHvA9x1G8CrXaFhzYsUd7vYbfWAa21NZTkHe4AlYM5OaOPeXSkLoDi+Sc3EHevwyoDAXCuoG1Akvt5Hjx6RUNCo/DBYmic2RvxtGpIXtUNfmHSVQtPbiqF/eYKqM2x1VnEkmitq6VXWM4NYjUHpkHBUitI+sgHJsG2xvXPpK2TRbDVwNhxUikK0Lpps0KNzVfww41ai2wN425k6m6aK4T4R3R2/UbVdA8DeTQfTXUwNsFPFgUfn8pahQcEarom5mA/5mYKoIFgTdggbSVrFGRQNQHUFqAhFCruUFLtYIsjxtx/ckKB08ZU+g8Slo2c7/AGJFSpxqGcaRViJCGYkkhcA53hhn2Onn3lq76fw9A1D6SKBaFVCEgnzvvKZAF7mw2MkfLaSutXLKSWOLoV+0tFUDORVZkpUL0mgp9DNMMm9YyePveZqq6uQauaeLFk439f8AuRSUvYdXaRVV+vMXwmsgmrEGoJQLUfovpKUsjBgM83M6VUukFb1E3W+PnLQamBs0eMDPzk9ziyKB4EFViwLFtK4F1IqWigBvJHP+pat3dwAHpE2hTRUeDUAtAVlTvIoXWpuLIlHIvfSKsCSjWvIr1lr3HUwx4MipIEOd6Boe8rUlALfziLtWkCPuBsHJ5kUlhaTJ9N/6jyoqgfQxdNa3yAOZQALZwa5kk0Uj8OtvJG0aducUeJO2SPaUPhrOf0k0ialXTm9qlqFDWSSbisghgLI3j7n3GDxzIpKRb2OD6y8V68naQlkjUTS44mlLtXGZNIg3dmqmgQk3zUzHw9t53moz8sb/AKSKSTsbFaRViUCCdzW3vDDNZ25uUuqtJAvydpFSpdOBnM0043uQLAsGV01AGTYEiprRMG6mi0w+KpmlWM7TQfDneZ1FUt7+Y8XEosVcdm7r3k1J4/8AKENZPEJmH0IuoUQYBiNtoH6z9COmG4zD3EAdoG69oArNXDNwJzUdkrVQAA7trgfiziB2xDJFHJEAQs8R1p4hfgQ3/wC4GOc1ceo+JOfP6R0dt4BJ2MVGjjMZsfOBsV4qMMmHgXfmZ6Tqo8TZhgczMkjJ5xHAweqyBvMmIrHP6TZ73F/1MXsipcNg9ntxMGBJqganS4sYBzMDeqpRMHW+pRGJzsr48bGdTAVRPviYdT4hQxdGpUNy9RdCLS35vmc3UWsmlJ39anW47bqjV74nM+sLQ1c8ZlnHH1WIB2IE87rFtDsa1X5np9TUGsg5HHJnD/8AJB1sQpr1lxyPDgZX/DYldJurE5eoGGlhRs0b952MxV8HtArbEw6qAjfVwSf5jc3w4R0S3UX8UF2UHtkdTuJUoALpjtNdTBsqecX7RdQNqDrenfjBzCrZB9I1BhbbeRI6hY6VNcD7/WUxdjRs8AAV8x9Y2YuhXQ1nkjMilWDKzOVABUHzzBxfUzheRcbWLFaWo16xg6lCls7HbP2ZFRWCjq6RxRo83DQOmiUmoGt+Y+oG/EFKAAc1xAElT20a3uZ0mJGeFJz9Iw25AWhkeJRLgFbN2cVm87SACM0xscbXJpYzbV+GzN8V47oBGCsxHde4lOCzE6TXjiSCQ3la+W8zpYnupKAJ2iHSOoHqdxUHE0YACvizRJHEzUkNRFknYTOhDgMdJQYNEiLUUzY1HIvcTTqXYZbrf2OZHU1MasnjaqMx9BDszBUBXi8/frJZSeoVXIHrNDZXSAbPJkNg4GePYzH0WGykvRFTNR1DVUADR9ZotlQGNUK4zIcEEYxz6TOggo6fSQaL83zEQdVmgf6lKNQ2pqwb3h3BatueOfP34mdUn8SmsFdKjAio6Sxq+MmNdQs0c76eY8k6qx+kzBBXCkkUx5mZBAXk7byw2ltQJNDnaNlHnF1Z8TOqxA6RJH4mdN0IjZYrpU5yYxatleTgRsaIK3Qze9GRRiQ1LgizkeYmY4UAXi8/frGdTkg5+VfZjtmFANkbzOiJZSz6RVA2cxmw4Gy+BAWDWbz7yl+AA4rEzVjNR1LBGAMH1jCjp9MUl4zfMGsEYAF/SNe5SKzX1gaT5sA/xKVjdgjSPpF3r22Rd8Zv7/aC6rvJv0xBQshGJOQcZlKppjpo+RFlm1eeM4jDEG91rbFbyTwqK0VAJJrJjXpszd+av/qUQAb3re/ElSRgiySYjxJssVKjG5jJCiwRZyIzam1Jrf2MG1s1b8bVEYJagCANriKn8TSANMvUxWgGut5OxuscRLxRB1gEkDxIUOxBGADXm5otmgTVDwJOkhhgb/SBmE/C6a0pO2/MW2TgmUu2ME3mLU9Hfc3jeBqDGs1pH0k2SrMTttGt1sciscwOonUB7Cv0kKw1VtJJXJ8RURmrMAx3BxV52l12+eLgaVRiwHU7qBNAQO9aQKOSYrIFEWSdpTWMi9voYlFq0iwRZyIHUFAqJnZjRN36SySV2Nkb1JMiraqAFciVnXXG0mj8WbG0sWQAeK4EAnS9isUYwoRFKrfv+kGwRj3lBtQ2IwazAJ00cCv9ekoOVNgChBS4JFnfat4gWu6bIrHMlR2e5icjbMpVNNagH0k9zPqrGPaUG0MCDgDbiALKgH4iTWZX4TMQHN1eP4jNVi/c8CIWCbBvxe+Pv6QMGja6BvR+/pGG0jVa6jt6RsDSsLoZ9jJYsxo2flzJNRZtIXtBxdGNgx6pVACMcxaiV00+Rv6x/CL2/qAWykOBWBipKL1KwaVTRO5lIxHTAJqhnbMlgbpRyL8iAUqDp9FaSxj4ufA/WAG+rBP7SgeKrxnmGrqAFTd+25iUYY3Y06VG0SlqZiRuKzGmqyaY2KxizBixbUFrFgVjaACK9FmHd5EVN2kGzdRqxVtQNiudpZ9DdckbRAl6TO4HVtitmv4gxJtdC1dE/fykqWVqZckkVLex3Ldb8YMRnq0i7Uk5EGZ9ITAODvExd20klgcbVZ/uWSxTAa63rmI0urFyBkWLF5mrKdSiseJmpKnwRdf16zTpsfwwpOnTV7frEEJ+IfgoBWonf95S9MdLoqQm9E6vXYfrE4If4Rgi/IEpSCCKzW97mBjTnhGz9BKHUIaxo0AY8SAzqSufJxkn0jXWCCQxsccmJRWSGZ9+De/MvpK9MXXuPIMVsxLheNqxtKDFHBBNAH2/3JIqYBWA1NfniUvRdnUdXOmzQHtiUwFHuv1PAmallwU52B9PP3tALaySp6Y3pjXG+4+UpWC5DAs2RfETauwgNp3IxgxnWzU1tePhrPz5k0zZn0qtgE1zG6t+JoQKy85+XMNTMmnS9kVdZvG31lZByaI2/qTUqZWDqKIAxQ8SukvU/LhVbJ3J8b8Q6Z7VU4qr2z7wOoGqAIORyBIpK/D/AAugp0BvOr9B+sY3JJCsbz6ecRL3Aggg5zfMas6sbxmzi7+cihonU7jp06V4vHiFkhnY7VWYunrDA02RRIG59ZZZnbUBihijUmg+mGosQNR30n0gAdCmrYHOd/swVijgggrR32mpyN7o+NpFSX4TFgOqLIs6QK42jzqYaFFHJ+/lENSmtPOAD6YlkMArLqrer2MiihCV7gVN5XzGzMVVcXjaIs5FZIP/AI/eZopZkoK2oj4qv6SakmB/E0qARi/PibUwYYriZJ8WRVczbp3SgtWnmh+sikSh8aTQU7ykT8PpghbHk/tEwPjaWjau2iBnIPMzpUVZsUk0XqHJAWh64iDNRskZuq3P8RIGDA5N4OnzIpLGba88ZldNCbYrkjgxEsxvTwPaUp0gMCaH0kUjAOm9yPX75lr0yzD8QWRZr5QOATv/ABErUaI5kVFMWSylRvRlhtNGwb2iyoGnbmPubH8feZFJYZitYvf9YUT1KAv5xhm0VRyKusiJT3C8VmTQtgSwldPVVChneC4FEkVGoIGBtJpALpQULvzHRFk0t/tKU6gcEb5uIMynO++0gNEJFVRAzUFJpmJx77wXUG/N8uYdzG6I2xxJSFB7iy5PiXR02N+ZCmlDb1c1I5smRSPQSw1+dowdwRJ1Vmt5pbUDRocesipUuDYz4lXeMZk2StfxNFJOCDftIqadWcC5tRG8zBKtNFPbRO3pMqikgNY87ygCFut4C6upSHUvr5kpK/SELIhEH0HtCzce3vAC95+g3TAesPYwNV6xbQB8xHaG5xDUKoj5QMbEmF1nPvHWcfSSTsPWAPcR0NrhzDEAMwvMV2Mx1nIgEsSR4ktlRNMSSumjcZovGBUyZcWdgJtv73IatNX7ygxYCu0g4+syNaqsVNGoXQAEzatXmUHO4A229ph1F7ySM8ek6WorttxUx6g1bEke8oVzMDWRm7uY9Q5Njzn0nT1DsFPO0z4yfMqCuJ1HJ9TMOoMWxFV54nT1ADsOfMweiKsY48S4J9cnU0tRN2c0Bf1nn9dbVht59p6XVwFOi/1nH1PwydSg+AfMqOR4eX1ASRpGFOfWcr2rEAEUxtRg1Xid7roAcnJ2JnJqO5LZa78ipbm/jcvUXFk6Qo28CZn/AMWViRn1GMzp6pUkVQPm8H7ucuF2BRNhR4iraIU22VBVsk2frI6mkLa2R5YfrLKr+INKqdvfccRa0CDUmL2rf3kJrN2H4xNE6sD/AFM2sKGIJYkZ4nQyqx0p8AvA/eZOacInm9I595JMiTenNixqvj3i0hWAviz/AHNl0myx3us/t85iQD3LTG8Hkf3M0oYM2n4cjBs7VA062fiNHSOfeNmVgQSL2F/lERoaf+Pn3Ax9/rIqWTG0dSKvxJvV8G15zvibL+HZaud63mZXQNXJ5Mzpsu5XJAPxZGxr2jrlhQA44EpWLCyfiO/kVH1NIqjng3g/eJnUooflIJIyPI8yBQXNUck3x5lXpGBoXYfSDKNVgCsV54xMabNqVbFm7yRE9Hq7ZO0u0o2lf+NbxlAxpNl8e0zpYwIOnIs6t4ZJrPv6SzqDaV82QOZQIN35Nf6mNPGVKpAvNWQcScmh2nGM8SmYHIGpgfORHgrR34vxM6EUvUHIcnYZ+sX5GHw38vMYUApa3fzAxtKGhWJr5+ZnRjP4iK+G4sq5wfi2mhXSoY55HMSMTZLHJ3kelIUD1AA28QAsdpBNZ9R5mjUCKIz64kABdgFG1zP0aVOchSrZJvjzBtIS1uj5EqhrJVRXHtFispztW8ysNBYfiZu2wIu7TZBJu/SaUrAKDgf1vEbBCg87DmQeIW9u7tvJvaUAFYC6xZvEtaayTvmQfQajeM5EBgNnSO1rwM7iozTgXYZs0P5gxDKdtXAPi4gtAWgztyBiSZXat559orDVpGLmvYDfyBreSUIOo5O9mJSbIYkXg7c1KVcWTsMUOIKxYWTdnBlMVoZ9R4+9olQhtgg3v6jzEpGqiBR3NwFC8aRxDSrNYUbYz9/YgqGwAXUL96iJGs4u9pQZSMrR8VvGwXUFGQOL9IlRADabI7tV+ZWdJo/MniSbU6RgXt5mq0bz8r/aI0gAduciFE6QaPjO4jIBGAGN49IEhgcjUNgYjId4zYJ8ZsRHOofI8GPFDt/TaaKENtvXPJiVIy3UUMcxm7JAIztzUen8xyb3jW2Jtjk4MSsJRqrUMAYHiPO4YEkfUSmNLYr64iwuANI8xBIBrIUq3rwI2wtgk53Mem3wBVQBUjas4FbxKkBHcSRd4AviGk1lbzvxLoEqq7Dj+YrKgKpr08xGBZNVtsT4jVRqFE7WQf4lLpvJ39f2iNWSo1G8eRAFbEKLBv8AaMAdQ5sMf1gSCKJph5iwK7Ac+4EADsw2vwaxcMsAE2Bz9/OWNG/PBreLSAA3JNgnmSDtlY0CM7bY5gBjPwgbDxGhLXZ3ODXpLbQFw2fN4gaRsCpBx9R5k7ADGlsnPAgvYKA0C/PpHpXXgD0zEAaAtSxBO5ETFT1Tf5thxX9SwVKEFeTit5WnVSqbA+kAzOoJZBY6sH5y1vYXjn0ibUO0HnbzNlPcQTzgfWBpVQKWyLHMMkKLDXgZ3EW+QASPXIuVYYkWL4BiUfay2QdZPwjOIs063RPyMFwEJW72rIl2mW5HMAyB1VoGP3lZUsV1DuutsGPTQ18b8m4+m7NdsTbYb79oiUBq+IEACwPAjWyAVIJI87jzG5VeR9cSQdOANK7A36byTCkg02lgdzfA5jbTptQSt7kVEVXV2gEV8/8AqUGWjakd21ZbMSgzKerbC7AAHHiLuCFiCW1XfzmmlWARMgccGQxKUisN9gN4A7Yms4Jpr495SqoKgk5FnFGUptiWbcmh9f5kt33ShiDizkfOBwHUwQWrA7G9xGAHXusOTsou/eGoNaki9gDxBaAS+mKJHqBvJplZOtSN8Ywd/wDUA2oDQMA8c8/tNF0atW5GzV5gOnQ1k2bsMTd5iCCzKzaQy5GLo1NEUMRYoUdKi8D1iTqMQSGOThgPSadRlVQQRfvj/fEQJSTRQhif/wChBWbalKsd74EF7L0qEW9x7bwCguQoGRvz9JIWyiiw1UfzFag7D8S2UHYAXjxLVko3067sDTvn9pWlWIRT8uDiIJAYJbKWN2Mev9y1LatOaF0xOK95JJUaFxZs1m/ebpudROmzQv75kUkqqqFXOR449I6bStFfQ3uJJAY2BrN4F5EosrAhj3cA8SKlqCOouSQzHFC795I//wBF248HeJQAFH4eqyNsjnE1UpZNajwa8yKSRbAaB2jxzzLtgx0rWR7kQ0kHWabOCx3h03ZtRtiCcGvSRRVKAxyO2sDwJQOFIIbVx/kOZTFQoyN/ynEgHS1AaVvf9zJqapCQCCFKnG/AlHTo1LZF5LCIKD8IBH6ywVo2tZ8byCF99kA2KA48Sl1AGwWIOI9I+FdvA2gGKClxfHmRSXqYtm/Q3ipXTChlXyP0jGTk198ScasDUePT5yaVX3HSCVYHY+RLWnW2sMdubiNMMnuGwglBR2jiuQJlRVE2rLjPg5j3ICDY/WUCm9Z4xzAqQQxzmwTzJqaYtWNYyK4u5ajUwvYcRAsdR1c4M0tQMHPvM6khutEMf3Ea4OwKt68RLhiANIveMKpbFZ9ZNSs1pJXbkkQBB6gLfKPUpskc7VvKC5AUjfaSKBqAJ3PpLUscAnGx9JHwih/3Nent3fKzJqaAAKFnI2kkFhXaeAfIlNkUFuvXIiw2CQfAmZttSutnB49ZPnjEfHwgnjmMV4uhvJQkZ2AxNc/lxkfSTpyTv78ylJIv13kiqABGduJSbijZ/cQYrpGR2xWVYkCvWRUtQe7FEESjW4zfNSQBuKqXye3HMipqhWob1NFBAJomSO/CyvTa5lUU15lLiLn+IXg8yalUItUIB9Fg5JkknbiG+wqPnafoJ0xVQj52hycxbZDQBk6RFm8jMBvm46sUIGOTDYXCuIWbgCyTd7R3cOMwIvmhADNfDCsVxDnBiwOLMAe59Is85jyM1JzuBVwMmNAzNu0HIOJp7+0hhwIwxOeLEzcEC6+U1K0o7pmbGScCaBgwNZmT5P75m5tkwMesxdbsEfWUKwYaRq3M52XU+okGhtOkk1V2Jh1NrrnMZuZxS4BvaYMt5Ct71+86uopZ98b7TnexdEncSoX9cnUGCCDjJnF1P/s/8WxvuJ3swFDuOLOCKnJ1ldSSQLq6lxv5ed1kPUJtrrJozk6zEKy/lztVkzt62O5cfofrxOdwVYagaNA+9yo5fhwsv4S6QQ2BbD+piRdjSWGKHmdHUFqQL1c3tXtM9GgBta2TZ8ynJjmKstEhgvg1YzIN6KKsWYbZXF+s01BWtmagNyD3CSb6nS7U08kNe3zmdFIksuTWO4XV+JJUoVa7ON+Y2y2llFXgxdxWsuOAK/aTUsWXU2piO1crj6AiQWOn81gbUJt1MgEg4OcV4mZ6et8ml3F0cSKmoZdRtUIBxqriuZOqwVNnzQx7y3LKSA11wLoiRqAKimfF6qIqRSwge667dt94irOaY6jWczRldS2Be8zODqHaxNYH8zOhLOQrIKob1QszMro6YAIOPiH9TbIYWPAyJm27KL1VMaTOzdaC0D2EYIFfCQLEvSFTVrFnJ8zPVm2ZtKg8HPvMqCYcUxNbGxi/WPdaLUOc7x2z9OglVk6v9yCLFMvsZnTPSUN84yRuZmP+R7ZroZF7+lzQXsCWG1VE1FQdqwcTKjGbGwT3doqotOo2qsMVq/uXoPUcC6Q5zEeQHJzsNjM6WILY5xvQ/qCnuODpOLveVqFrgkgXdEVCnXdRtdTM8BF5Y3QsyXuiuABeRQs1DZrAq/rK+FgCuDjaRTZ6dAFHUa+If1FiyCpbHylkEgqPi5gFpdWtbOTM6pBtatWAPBAuBzjSxJHNjHmMt32SaAOTzEpLpgacWdUypkGJ3PuLq/SUy6aO+3H0iYHVRWxH3aeW8fOZ08QF1OXJGBdefSKzV0RQ2Es/DZBFHNQK6+oBfbxeYDC022FIxv8A3ESSuQx80N/pKa1N3ZHHEnVSgZbFk5xIPFLd4HacXe4hVkljZrNGHcos6b3rxEtA2O07bQMmalK4oXZFCzEQUWsHG4/qXVNlcXXzixkZ1SVQvAALRGxkggEbEZGZeml1FgLNxCryzEAHNbiMyJNVRsj2xLVjponcZzECX6eFoVZBuDZaiorjMSoMqdR7jjfN+IVqfUWFgEkfxiMBuCT/AGYE2lkbbxGNRokXgVVStNnCHb4v7iK63rVjcXA4NBrrYeYlFm/hJ80N/pKVrP8A47Xe8kOtAZJqzd4j71BOL8RHKrSb7jqxZAMLKgreAM17SQdJsYMsb9wtdriVqDaoK7jXxf6leRkwG5xTRKlLeoWxHvEDAAIPcBWQa8wJJUim1Ee2IrIcEsaHpx/EBbpgVizcSpWi5AzXBzHVC7v358Sas0RvzKssANwNtufSI0/H1LYjAJIxn0jU+dxGT22d/SGnV1BmgRtAALqPah/9q2iJJNEN61ziMjuw2x2F1USsBpFMTV3RxAKBskkYOLB3Eekteo6sZoxU4a9IvcZgN7GG9pIUXIBAIryIlUooog43FftLG9EGjQ2iPK7t+lQNP5iCpYH6RldFYZR/iaxmCgKmrWLOdoA91MxoXxuP4iB7rdMT62MXLWyKJrg5krqdCAlcnVAgtgra8HMFLoqofF+v6RZ6nV1MwsC6x52Ea6ipAJYbAVGSChsVpwcekAQY0LBXSMASlXWbCte2rx7xaNbAWVSsXGWIOGyDsPERhSdNHVjfSN8ekam227SKsHcSVcUgILYvY4+8yyvUU3pFnIEAAjM3xXQzR3j1FVIDLQ3IrJriIAqQwOkzQWGAK4PbJCFXQigHUdN6h/UfkUzftAjLKAdRjRdI1/iCzmJRm1N0yrntIFxEsfytqO35cX6xBgGGpmqjkgm5S31EOlK5Oq4gpSdNE8UbNYj0hMsbsDJ/SS16qZbBlLewtgMAUN9toBP/ANnUDMyggXWK9rG0ASQMMKG3MtjaZUgg544iKauoBqpTkXnaBwwNT9qMPDePeIXenuJG9DfG+IySrYayDtnMS9RVCAhmxqJII0/eZNNfTNttSVWq9xLosRqOrGQDuJBXqAltIurAguO4dreayf6iCixQaQRprJFDNbQVD0+mtHXYNsP6jDEMtrYwpO+YxRJUatX6VJB3uNJb9v7gAUN6WVc9pAsRhKTWXFmjBG7wD1H0i8kHP3tJCjZX4WLNtxYuaAkrQbjSReJALdXp0vT0/mNgwaz2suDscyQ2C6BqvJAIvPtFnqdQFmUEZI+ewI2jSwNI7qwBQ32294ywCWVIK4Pr85NJAJsbihja5qF1kBUcY+LxIZNbjupTtzdSyWUgayaOwvMilVKSAAbPJobivSUlk4WlIr4txJR1VVFFmIs4OD93LOu9Vb5A9JFTVU3UOTqNZAMrUVUpxyRj6SFNNqXtbb78TQWFyCV22kJIAom9mj3fxUobkAFsfK49y6j4j8oIuhdetbOfWTSVpKZ0sF/xarEeokfAzNWLsXJU0/czFfNH6TRSXTC1zmZ0GuqqurFGzNFGldV8A5z7VMqOqiBR2mybAfFW1f1JIV+J1e4gEZIxXsPEFOqrBGMDmMnsax3LviGj8Rx3UtftJqVqL2Vr/wApSk1VG+aG/wBImBBoHY8bQRgEUdztV7HEzoWp7idk2sHcS9JY5a8cGSA2q6HmoxhtXwk+m8moWWIvIA5I5xBe1QQQccSheCbK7e8eASBuflM6AuD8JIMYXRwQP8akhQFJ1Cz6Sl3GompNS0slQTZP0lLqurA43iB1L2rV52hnkCpIq6pNXpYNRgFyLaiM1/ElCwUj4gOJddlHcbyamnqsUBVDaGkk/Cf/AGklSSM0vEo9rUGB9B4mZrFnFH5CUrHVjA2u9xEGwMEnfYyqbcgd2QJKBWo1mVecVVbyQeRiWvabINSRRRVRzziNfGY6tiFuNVtbsXIqWi9tHYeJebujchP/AGNeSJqO4UokVB9M/LiaXpzd1MgDdECWhJAHEzqKpu5gbhudtoNt4reA7gOLkUj/APxP0hHVfmEIB9BuLgMYgKO20COTP0E6YsXDT6RivEOYAc3HVCIgeYEVk/tAy2OOY62/aLGokx70agBzDcCx+sMekZAr6QMqAGYBRe8KXzAUef0gBe4qKsysDERo4qATdECRv62JZAixR9oBi60bImRUHPE2YeTzcycYq7mkJkwpZg9idDqLuvbEwdRrs5lG53FNscTJzSgH20zo6gFgihzMSAvGZUNzMhdbqrqYOoF39Z1uDpxfGZh1AAcGt8VxKJysgH5s1kmcf/yBYOSK/SdrKCCBz4nL1lW2UaR5NSo28PP6w1WxJpeZw9Qd/gtdkz03VASo7efQcTg6vTBVcLQNjHPiVHL8OEnWw0X1CwIvb5XMn6YUkiivC3OylshQSMzm6iqr9xo3ec0Pv95X9ciOY9NGOGpVNGuPlEwVUXk/+O/tK6pBQBXDAC9v5k9RFrX26RVAj+IvS2RbST5wKJicAOFFmslfP2ZRCs+tgD/FcR9ppweLA9ZFJjY7QzZYaAtbzL8M9XpgkaSaCkmbBEW1rn7EOoNXTG9ULPpIqWHaNxQx3RhFV6J7ufrFaAUGoi8Vn3iRQSaAvcEDiR/iSJGrBIo1EaZSSSQOb/qNlUK/TAXJ3rEE0Hsoreb8TOhkN6yCbzIwSNA12CL/AImrIDpIAIU3mC1kBDzgGZU2LdPuJABU7LcehW3Pap+ny+cbFFe2xm88CS5WqDBqXmZUiNL07Btj9ZIOlwLycVKdQAGIFCu2pJCatTD+xMqJAyANWSRmvP2ZDV221E9ukzXBAcH2HjmQEVRWkXf0mXo2ek9Tpg0FJoCzEQiiqAv801YWowRXJkWtEq1b1YyfWZ34MARQ2+dzclqJ2IA28D7EFUHVlSSLtRx/ECoXV0wBnc1iZ34ZV2ZsheRJoVj835pqgQHSBpxZ8CQyhq5Cnn9pnSxAOqglvqsb1BkAJIog5AlqFLYFgWKiIRGzg3eR8MzppKqxOdIG4H6R4RMc/WS1acMGr0/mUyrpvFLVCpnVJorY+VfzA0GAzYyRn73j7S+o0f49I7XtYYB7gPWZ00ah26mq8Af6iA1oLXSTtZlBVQ1WblML6YwwArMg8RSi7A/9o9ABABzENCjDVvisn1guWOxO+BEqA72AQBgcVC9SljZA5uKgNSjTZ3NY+spVS9NVzd7RFhAsDjF7ttJDWQFtybW/EplXSBilO0tasgA81BSB0lBxVcCOgx5UDx/UZCq2cZ5G0TsKoMDjeolA0uQRbfWFlcAm9quDBSoYgaRVCowFZ9TD/URnXcN8biKxizpsaal0vawrIv2kAKpIrNxGVHqdLYLeBnaOlBvSPGr5SmGpACDsMjkRL+GAaIF3io1H+GAdwGsk35g1E4sVjHEQzYxdb1Cgtpj3kGodyn05krYJ3tufSUunYDSf2iKqVGMDj+IjTq1UFticXe0ooLsVWwW5akBsLjIiZVD5xn6QMaRZI2Hj+oABVsVf6xMcCmDfLeNlUJZ2UDBiMgSuM+KuPSO2hXJH36wpS+pgP6l9p0uDfj0MQQCBpJarwBKVPxFyuk8aj9Y1CLmud4yA3TApqAGfMDSNIHvzLVc1fcd4gVokNW+KyYkAvIBJGDURqY2xIBofpBe4EmyFG/8A1DSArqNOcnEpR0wSBjm/EQJRVb2caiNhJB2CD8Q5F+JZUFRgUuTfmNQus0vkCjA0npgNYrTsBcsIrD/FVOR/qTSK+RVnkbff8wYjTQcNzkSTWSFS7yfqIgShrN7ZMGVa1UKAFAiFKz6mA3r/ANYBRUAhTY5r79YBgdBZtJ+ECpQ0kKwxeazgxBUQ5Wzf38oAkU9TpC10Nstn6x0FXIA/8rlsurpDfjPoJKlc04G5FjJ9YGoKq/m7tyTAmydONP6SUpgTSmxggcR0qF0FWdzWJJrHet5pRuD98SRjNnN5PgyumEvQO29zdAVEUDL/AOuc+dojSrEsB07c5F7V8+ZR6QBJWq4F7/f0lIRq7QayINoXqkt2m7AI2H3+8AFVGPhVOdP9SzpRbBs/qJmzAgaWDD/1942RdOqhpFUK+7iBhmVquvQmURTAMT5Iz5/uTSl7cCtsbiadraHGNWR6QCNS2lvp/KB5+USKep0ha6PypqO3mUFRbtRd39f4lsobpAaTgDPpFVIpEWyB/wC000AGi/dzq/uSug/CwGTxk+sOnR1bZFqQvH8STUzamNXQwPAh07fp74A+IH0iICF0Gnu+JqxL6Y6YGkDSckm/hqFCUNNj8993uBGrWw/DvqE2t38OPMf4alAMUDefO006ZTXSrW4AH36SaZN0wCWFaeFvcxqqsSNlByB/UCFDZxZBAOy/f8wOmu1lbfjf7/qSlqaXpXYN+NxJ1FTVkkYq/wBY+oiHph8BVANEZ+nMCobqamUePaSS2WnAs+SMxhu5Cz6fygekoBWVWU1q2BveCqinbuJBkUkhfxOllNHC2dvMsKFXYerSiNSbGtrvcXBNHDAZOCMn1kUlr09JA1AG7JP9x2C/5gF2kJVE4BIwQOJWgIGWls7txJSpbfO+kbiNLBsE910fSPpDpgaa0n3wKlaF07fCST+0ikStkBLc2Vu9pf4aqWYVp4W+Y0oPaqcYoQKori8GwaPEzoMKGJBJFVY/1NLCpd2f1qZnYDUreMSyqsmomlUCgRJpBWIO5var3vma6a0gc5I+/lMtIZrbTvXtNxpbS4548SCSWB0ktp40yumA6DUumsCztABVOrT3YMoC+kMHA3+cilRhVOB73LRBe9NvmIac0wGcWN/WJa1ZGSMUJFS0Bs4BAG3tKosOaA3v+pOkAMo02alqqbVpNb8CpFI+mTpNA55MoGz2nWdvaSF7SK2NkTUVrqtr2kkgoADQBHAuaBbO1Ab1JIXVZsGxiVjQDankYkJaA0MGz+tRKSHPdvEqLpvGkDxKIUuCRj9oqFHDL9alKRS6m0jaosEK3zzKACnYXdyE0BC6A1XAzH2g5A8avWVVrkbYuAC5pucCRSPpjO8vdsXjb0maZxi6xQl6a1KNPvJpADV4wPMtcH+ZKhRis/pK0A+13JoGCcHUbIuXpAYtQ9oJQIqUVCkk8/pM0qVbJE1ApbuZqAaoy9NoGFafaRWVMWu3Imijt59pBAPUz7YljJAr2mZAtjevSC7ZFesoVpzvEVsekmken2hHpEIB790f/KHvCh8vMeP1n6CdMWOBGQCYVp2hYqiIAqEe+Isg3GLoeYGVZIjzXpFWd48YF5gCBHiPb3hQO37QgYIBPmBER3/mMWBxADG8W3zjC3Chv4gEk+kRAGJVA88yayYBm1Hc+0zItia5mrY4HmZNerGJUJkQMjeZPvVYmzAnF5mTrnauZamBu7Hw3UxcKTdZ4/qbMo5wfEzKd+zbnEoOciuONvMw6o7eSD6zqe79vMw6gtcAGt8Sg5OogBH9zl6y9pbesTtKnFNQGfnObqdNs47THF+Xn9W6F/GaAE5OqxJ7/isjzO3qJe4J9TOTqIrE1qILb5u6xLcz8bzup001aQorepD9+5o6RRur+/4nV1emUBr2B4+f0mDKStdQVWa9ZTkxylA12SaOOMfxMWpVttWRRs7jxNwhRxShWH7/ACmfUV2XuPfZ5jvxoxcEdRkUYAon+og5C2thS1Sn6bAjVg76QPvzIZV0BSSrEjA2+cmkhtJo1gZ9QfESkaTjJGR5mv4QslQeeMX6SWL6sbDe9x8pBMWAvDGjXO3pJKBTmzwaO8tlvZQSMnHMkBlVV+FbyL5md+pxmVH4ZJttONxIOoMt2XYUBNdLNY/L58GQqnVkXZ+I4mfohr1N3XdmpmUUkAL6kDa5RVSxokjVg83UrSUWgKxV+vrMqbNqaie01g3v6SQLzm722mmQAH4GQPMzCEMtKNQ59f6mNJFACyCF94MDqZQtcGaMrFTZ7ifMhlahe+5EzoQrFR24W6iNEBqoDbbB8RlQEFmiW29fWC9OmbRZOcesyoSgCix+YfUQNVi/rL7tWL0gZvceImA0jCnTk8ZmdUh1AzRzyp3kkCmvLAAbzRVbQALVRk+8gIzAisfPH3czsGJaq7h3HAqVqJPdeoHGLk6Ti/O5j0KSSCx7sE73Uzpo0gHSBjcjx84+01xjBveXpKqfizsR+tye7SNdWM16yKC06iSeOL+6kUKo6vmdxKCnUKVQV/eDK7KAcvZ3NzKmmjrKgHwePpHr0g18N1mDK1gnDGrHERVQtEUSQK/uZ0wwViDpPbt5BiQGjirH6S16eTV5J9r9ImLfiXXw73uPWZ1RHGVODxf6XFpokAE/PEbLi9K4y1+YLqqhhLznnzEZFe1juVFcRG9zdnAA/iPQx22P1iC3vydzEeKB1Eht7rzJ0ZCgVyRK0obotV+Dd1LKlcC62v8AuBpw1G6xg3+kmtTYP61iOuH9/nEFph2KK8eeIgKXSbBHvzHkOwHzMohitEnVfmJkOoE2CdwJKzDY1L8N1EQpo1tkehhS6M9pJAq+fWMdPJIsm/GLjMl2+GtQ2ga/Lde+0q2Gc4873Eyn/FTpyYjDKAdieLv94UuljRNesaa1TSMKN81mMKbPjneSaD5Nm8CpZe/iu7oVmSq2c5zuYFEYtljRHvcRkFFaQo9hLJDEXjGDcekqOQNv+4CyacAc4gC0knz6XUQqrOoCqydxALRHaLGcHmUQx3J1X5iMiKcqBsN5SNS4urrMTI4AJ5/LHS6AGtbO0RmdJo1t+h8Q6eGo7kV7iP8ADoki+eKFyrbUMmlGbwRUDJjkEE54vb+oadPmvIMGBB2ViPixzBNQULdC8i+YjKsMTZKgbGOyBnfYVGFN/wDj8/MSjls5+I4iCtZNgjnEgKt6Qp8kR0rE5J7hnm5oq/hjnxf9wMrVtN4NYa/oI6LZyKgLCgdTgXjzEFIYdo1DOPPEmmagAEknGMncekorpchRx91Ah2HcSX1frJKuKsUT+XiI1KwUWpOkYzGwUgWKC5zVgydK6KNqSQKH8yx0x+I2my1nFYuAC1qutwfmIwRupPrnb0gSwOLpd7394sVekGstAKIyN29m394qUIxGSorcQ6auAABpW855jHTLM2LXyb8xGDgAMO44FSj1LNN5kaTryMX8RxiVpR2c6maiByTcQLSL0haG5A4Mo6SMn/1IO/p+soKVBrVRFf8AZHtELArqVjJrz5EAAusn387/ANQGBuQAKyePsSQDqHYtj5Z4xNCrsvdl73J5/wC4jFHWQo2Fb/zBHIQ6L0agAT6RMhpbwdyKxAqgFG1JIFD+YA2COMqRps5Gx9I+ng/D8QPO8a9MFmIBbNnGL+xKOrXdYXezkRUyoZIJo7i/uv7j06SBlvY7iBAq9IYgW2Of4gutE0XpF5zzJMu1UbGoqBi+NqlatibDHAo+sAj6jyPJux/qSq92RefiOP8AqFDX8Ql6fcHB34iHTANBas2R4MQRCzZYrqHBu6mwQ9NL7gKrUBz6mTTGHAF1jDX+n6xoNRJsmqxdXEl6a6gHk/3BVIIOhQRk15MipVVcEVjJ4+npKqnKqNhvxtxBldxkkvZzf3i4P0yoGoUTmhJJfTYqLUnQKXJlHS1EjCn6GQyqOlTEqSfh+fMsdK2bTbNe3FyaQ6ZFk0QT+olALVqTR4uHcrc0u97+8ojULKg1k4kUjYaTeW+f7yu3SxydIr5e0lA4AUfCSNWeZS9Nj4rNmziRUmTSgm7OBRmuuydZODjmjMdFtmznc4miqrFjbEWL83IpUFabSFo7kDz4muG02aFYbVBlPTOA1bE1+9QFmg/ua/eRQaqWJN3W2a+/eNe27LADG/HpJGGFgYzjGZrpdgQzW1yaRDDlQOPPpNOm9L22BYGZBQ6Rqxf5alDRpINqSaoH95BLOljdbHPoYuneq6y3rvK/DGoms+NluPu1YF6dwcEesilTxpBBOfXaMrpasn5xEALYAJGTiUmoDTeORcipXW530iMWMm/EQVi/gWY1Uc3V7nFSKTRWznzgx0AaAyd1kAKdWTVi/M10lc2fF/3JIYYD9DcarebJ25iWzhh6wWwcqMZMhKxjFnHrxKqjQ8QKswtjm43UgCKgK4AxxiXgkehmYoKb7bM1VReM524uQmmAd+T+0YFLht47bUMbbg7wFAZAJ3MikFpTYBI9JagZvOkSKYCgaF5zNKPjtO5uTSGSudzKDVYOPWSFz5HmMBST8pNC1U0BponeaUCu+KxIVazZzzNB8NOJmkIvmaqPN3Mxd/CJtZK1eZFZU67qENVGxtA8WaiqhyJmSrB9gfpGL+ZgFHzv5Ss8bDeTSGP8h9YRQgH0JI04EBVXdwBo5hpN35n6CdOA3MK7sbwsEXW0QPm4AxZhzdwx+WIgb7wB/v7QAs7w4x+sNxAC6xzA2TkwIrfYw9BvAxke0MeYWL9YAWMGAHEbXVCIVHi8mBpqhvJ2FnmWwF4kNUAkrnEyYUa5muCOZDAEdsqEyIzjaQ1ZO5mpUAZMzcmrAEo45mUFvA9pi4pqHPpOlzqWh85iw8bHAlhzMtg3+kxZDRzidDb1mZtpGTZMYcnUQVYx4F7zFweT3bzqKBtyc/pOZlAcmhZlw44v/kKAO0cYxvOLqIFW7tt8c4notpLFSK8UJxdXp/iFgpy2PaU5X4687qW6hyFArepzMhs6B3b0cZnd1hrXXVYAsczjamZrJq6rzLjmRgVOo6vjrOMzHSV6bUWK7/8AtmdDaG0BdW25Od5j1OmAgu6Pkjf3H3tCNYg2TZGonIFc7GpgUDuLYKt3tU3e1UaVVjXJ2+6kdQqwxjzJorPXThFp9Q8V9JiQt0SDgG6yJvpPTQrSlWGkDwB4+sxchbUXmhIpEVZQQaKV4vMz0r2gYraucTbsDZLMxvN4PvIXp6qILaa2FfzIoT35snVxiSaZaQHOxrB/reUAq9Qlasbn1j1AMQwAxjTd/SZ1OMdCquotZO+N5BJ6iq50154O02Ka2NEAkfp4Ehh+Ius44sbTKkjQbtB3HPjMkfFkd1eKMpaYkkmia33g2l9GgsMcnMyqkUQh0kkHJzkx4DZyTkCqzEyihqznmt/lD8lAA+8zpIZdTZNIfSoayrDpjuvG3yxLY2o08b7ySmnBogjTVbTGmzKrdMbGDtt95i7gDgaPrmU9AlbPsYDSGyzEm83iZ0J0jSK42A9oxqJok3gjGflGqWcFgPFjH1iAVWNEWdzcimRAUALknY1v5MQXSLLd3oDnEoHJBULYrG5gyBiaqzj2mdNmWPUQMxA9YtJ3UUb+plv3DWRtQsczOgzEm6JrfeZ0y05GoDUB4j00pomt5R0sFCh/nvJK6aDZzydz8pl6GHg5PdewA5mda2GaU+fEvOnAB8A8RtRFDArMz9BAYBwgptXpvEQCaPvgbSq0Aj8pFASG7QVz7TM1NrC3XbX6yQu1X6VziaAJqttRP6SQuust7STJdVkFjZqv6lcDSLsb19ZIVbJoXzKXBplAxit4lJUAC9VnfA3xDUWXVgWIVqbFWwx6XKNN3MCKFWJJkF3I+K/aA+LuHcRnGYhpZjZNHFXvKtSq6S2fO8SkgYNFqvPrLq+45O4xWZLIBV/r5+Ud4pQrHweIGNOt1yAu+0YYhwgzfpvGWDJi9oKuk1QYEVX/AHEadPDehwNoyCN/h385g2Dpz4zGNIOSS17wNCqKXTfoBzKGotpN3WMfoIKtmwTX35gvJxYOTcRmaoaR+m/mMAKmokE+g3xGp0tRAAoAVArrOCLI+kDRq1oGwB5H7QC9zaQdUo0Rq0kECrXaIUxJa6ON95IUFtqatVZxmIKRsWrJPrHYaqu/XJu4More/cjf5RGscE2SRgVzIKhjk0pztViX8K4AJ9YarQZgZa9LBVzqvj14k0LAbI322l1p8EEaQJDKFGnuzQIMlSjYOfh9ReYBF7a+VcxgprW9RY43x841GqiL08Davr8oGBq1kZuvsRsFIGkFr2xuYLpBIx6mUppu4AAji7gEqoVdRbJPA3xAMep0lawF81+kenWTVAnbEG7hqIqhVrtEZacWuCcxiy3eO6s4iHcxJutscyrVguktfBJzdyQaqdBCk0d/XO0qxqsnVeQAKzIZMW2QfNZPylDA7QD78CAGnU93S+Kr5yi2nqBQQS2Nqv2hY0bjbJ+X/cK0D8pBGkD/ALgE0MBqI3ONo6dRsCh9LibtLLngUblDQH7i5Pm/3kmNCaUIO2RWxx6xrrJILNqYCv6HiCpryC1fLx6xKoDmq1cm6gGhYNWget1uYkQKurXbE8D4sSlfu7gACKGkZi06rojURj0EAX4n4vTDEjAOePUfvGFskrvd+8GpskVpxqXmJackkkA0N9/lEahnqU/x5JxmCqQpCsxQ7nn2gdBVQmseCTm4MoCdxJB8kZPygGg+LUba8gVWfEzI1nek9Zd6VoKrHwfErUrdPBG2f9frAFr0dQICG1Ej9eIqDGmG4ugNpQB6YB7SrDSB/wByH7e22s0KMlSjrWwRa885iCghKNeK2b6ylCBhqLknF3+hgihqpmC+4FH5/KI1jVqIOokgVj9BGaIpF1Xm63PMzVV14rVsTdZmqsF6lFQFIoabs/7ipl01UJqLWT/jziUOo3U6YYkD1qx5qGjW5II11j08/wAxsQ1sR8I0hl95Kaari1FMTfoY1B1947qz2/tJWupqtjpwvvK7WCjp6u6997k06tQdLaSaySb9drmoqwT3XkADmZfhqOnbE1sdt+NtppsKUKx8HiShOnW9XpX2mhYJ1Aim7JAxvniIEOgo0ao+JQX8MEgKQRp0/wDcikWgVRo7HA2lKpVQcFD6XRkt2DR3bAZM06ejUBbE7b/vJqQirpQiheQAN5oNdkE9xGMfQCSi6yCCa8Yx9ZQADGiurk3M6R4YUou+a3PMvpL/AMdlrbfA3FRKw1UQAP8Ax3MenWSbFkeuJNIwzdRLwBn/AHGUtrGGvc7GMixtWkVqElWBJtjRob7/ACmdChuNdas8TVVIB0sdOczNdOkBdV5q95qUVV7j2neyMn5SaVUCKBbPIFc+Iq1PvQ39477cAGuD4jVrQC6sUfH1k1NWWCuFWjqsbftJI3DUQfTaMDTRoaSKqs+YmXSCM3gVIpLVWAqu2Uqra0a8aefrEgTUt6idt/3lKoajbVtWP5kUNFLaqY2SMYz7CUa0gVqJODW5maqLO13k36TQMAwDAUcY3mdQAABqLX7DO0oN+It45hpDtYqyMekZAa62UVYk0labNrd7xrf4mQL5xIUqzb423l9oyuq9rJzJJag2aN+Za0d7N7CuZnppbJrNbyxgWFW/EkhWa/LLDBGC3uZNgqM5I+UtaGQAVIqpFSAM5rMoqw2yOYsKKzKAAIvUTJoKhQ/jmaKSTQO/kSVXV7e8anvbAvzICzRIAyf3gFGkEmzGNN5GPSMrqa7oyKmhCW5xtNlXUbAyczEL21W2LE16ZBN2akVNWL1ZlC7wYdtUMwIFbyKzqxsP6hp1GhQEakhbofOPBW7kVNGrSce0dXvJHbGO39pNBkZ3EI6HP7QiD6DTR94WIZr1gL28z9BunLJ2j1HYfOFWMmGrNEQBbD3jWqhdGFkwAGYGhiobnEK8iAGNud4XWYUeNoUFO1wMbj+ogPI9o+fWGrG2IAEVvtHWfSLOnMa3VwMjR+UmvEr9TJF3mAIk7UJmykfOaNk5HvJMITLSBvIar59ZbZNATNrJriWcYkXgg53mT4NAn0nQ4/5COJgyv6AbSoGBtO6rmXUVmBsUPSbstKDpvGZlWLNbZlQOUqWOS2BQ2mXXVb+HidTckAUBOd9RQk73jMo44uslHtsrvOTqKL1DFGegyEIxoAzj6iGwQM85lxv+N5vVXUT4rF+ZzOzn/j00RvO5+izsC9kgHFTl6gJNFRg9x2lRzPLidXDdpNtd7VM9C6CGthVC50G1yCNRFjyJj1NTV08CiAc/frLbRgVRnvIbBojmZG7AIJZj7X9ib9RS/VKqAVFXnIk9Tpn8VRRC7SVsD8AUE5z8/Egk9OuoFsAC/f7qWB1SosBQDR5+WZOgdLooNGpfXk8SaVR3MDsBe3My0lmFk7aRdTSubAbf5CP8Q5PaVX6TOkjqKgPwVjiIqAMWQfT6R92hi1XeMxhX0MSlHyJlQx51CxWxveuIjbMTkpXPBlFWAQjJJqL8IsQeqCzC8DEzoZlupX4emiKuSQ42+I4JrBmrgG1KAZy20kNoWwVs7eRMqSFRR0zqGvgXvcVKzXm98iNmagtAbXmDam6mlQCo9czP0EneiGJPrWIiSAFDHOR7+JbA/iVkDaSq9Q1QoA0ebxMaaCT0yGC8Z95Pe1kilPA3M0HTHS6ahVsY3G8gjPCk5+QmdNH4ZLC2agKF1+sbhAKK8V85eo5K1oUbXIohGc4N4zIpHXbiz+kVXnKgZ964jVWySKY+DcnutSNyazM6qF8RO5FbeDFqPwFACN5Y6TM4/EBYi8VFRa1KgUaYzOhk2oE6dVsM0BRjCroN2+KzKvRkGyRYg5OkLgH3+/WZ2GgKGJxRIuH5qb4j61cZDMdIFqDKZTqF2BMqeMyRWkMc7f1AsUYPpO3d7xheppFABQav/uA6f4XTTs1XW/MzoI6nGVx4HMgKSwJZgAKzKC75pt/9ytRvGmluSpLKhxXGYFT6kGFHQxJF8ZlIppiwo+R95k0EKOQSPB9uIbtqyRWx8+P1io2uNVmswHTLMo6mavAkKg1t/wDXpAqoUwN51HfAqMnUSpA8EwBIW7WzkeRGYRFC2x1CqzEAjE73vUZZiFSh4NH7uJw2squVvOYjULB8k4xjmO+zSDk5Fbe0or3VVDaSNdDT2gHMSi1FCH03W8Xe12AB4lBfw+mCFsYyefEFA9Ad4GjScWWoChe80ZVB06axmNW79Q06V2HEV0GcnY+TEYqksZ5MBRbV3LpO49OIlVqbto+8DYAIzmoGeGJO4rY8GPU4XQVoiA6RYj8Q6tN4rjxG3caKrvRMkknWGsE6mwcYjVNK0e6hQuF0LtbO0bFsLS8XnaJQVVZrvNX7x882a5q4iDqKqAVwTmUVOsLWPAgCPwaQfiz7HxFq0ENWwzzBR1KoUoBrzHoCdMduoc3z4ElRnW/ou9CSFJoEtSihdR6fJAJ/YSw5s4XQvriBkyqv5eM1GAAuLIOTiIWUYsR6ZlIraWJGSOIAb92RR8/pD42JIJWsi+YhYCtVkmjmUvSLN/ygtpvAx8ojIOxX8PQLAzA61OMucGhiNqJKlRV9x+/lBTWbBvIkg0RVSm76FZ+8xdpbYgkXkRlm0quLxeYNqL6QAVwTmAPJNU1nG9XmM+LI1ZHgekZB1gVXpEo6lCiFAbJ3gDJK9wXYd1wOt+7g5xvBUVOgtJY/8ufEB3G8Kf4EkyAZmW3bSAVFgCW6oPiXijGHN2NOheOJIvSzEjG2YBWnsABsVn6QBDG7Kgc+3H1h01bSxZaY8jOIu5SpuzdbwB4LaqJWs3wY9fUA/DKAMBBeizuo6tmrOkCvlBidRBQDuott98RGWllawW1EEYAr7xL6SBUprYAVmGrSQbFnI8wdnKBO28XmIwNDP8NGs4uVqpqa7JrBqxf9SWDayqi1wTnaaFSeoNwo+/2gCOBpBYXt4U7AQ1MhDaMgd1/pEq9UkBAAFbfe/wDUoIOj0FKoWHOr9BEZHW2SKU5ocye611O2lRS2APrKAu9kJv6CUOp3WNOgDa7ERm69MdpWqFGUoAWxZDbyLLI7vWNs/OX0VYhmZe6vy5ipgEEk2VAO93sMj6y1JdrbUVrIPB+zJ7lCkCzeb/fHrLXoszD8VSdNnSMfKQmgO+n8IoNQj/5FbVqOvYmgR9flBmtypRd6JPj7qVqCtqDCzte4kkfR6ahM24ArMoFGasg1e0TMxATtv3ja9ehBqXnORJqaYvVkEknzXP8AVyzhNILWR5wPSJlK9RRVAYgg6gcBKUKcneRRV6mUBqut7lancnAVTnG5iRPw+ip0WP8Ay/QQq23Ck/sNpKTAJK6iwVQVGBNXVAQunijJDEnt06V2HEa3oLMbrbMikoLSDSLBFkSlIu8iub8DaLpq2gsV38QAIUEdx1C5NJpeo2e4VkHgwDMF0FKOOIx0nZgOpmr7QP0jHxMpRbuj9/SZ0FThiQSX8gYmnTUAdwLCqFyR2EkFbrHneMs2FwD/AHJpVVIaN1j3jB7qINn5RMG/E0qLGCcy2BDgAGpNTVDC6bPd+npDKgMBkbwUOfhpQDucywg6fSBC3znm+JFIlZ2yfhPEfcaJZqUUtiJRfCoxmqueAukccSKAdKkLpxzNFAoAWfMzX4WYnbazNEthenJG8zqFY3yK5/iIdzNdkVkHiGQATd3mMdJi9dTi/STSWGatBA+cDq14+P2gADalQODK1ULBHoJJK6YFZN0Kgum9uMwLMQFwOTmDE6yoGoDJzJJbDF5zGD2UDuPpHXcMUIgr7A4B3kVK1sdxGQM5lWWF1QMQ6Y6fTFL6m5SDF4Bk0JoirJobSiAMFc7GoBvFaRmo97O3sZAVjTdk4lLRbY3J6QOlsSwpC3zcioNcnys0VmrRp9ZKpdBuOBLWwaxj0kVFXkNvvAAV5jGM3GxOkYFyKmkoHgiaHB/mZ8gDMv8ANRBr3kVNNsLV7wFjIHENLHAOLgBoW+TvAHrJ4qEWfEIsD6IGOsXvEauhF8tzP0C6c7x/EOb2hAd2LEAWSY87QBh6/uIGOZQvAv8ASTeYthAHn0h8XpFfkGO85gBZ4MQvmPaPBHrAFncxixUXpUWTiBqI5k5hfpD5YgCfzIa/MuucG5IqAS10cTIgzZqqt5k28YZMLFH9pkwzgTVgdN1zvMyPPr9JcNg3cKrNb3vMSWFjP0nQy1MWU3uM+vEuEwYEA77cbTBwbJ+gqdTANk4a9gJzdQ4axR+kanO9qMbAVticvWX19LM6+qLoj4Rv6zk6t5AB329JcX4ee92Qy3vgGc3XDDuUmt+DRzO7qITd40jHpObrLgaaJrOdx5lRzfDg6ut8HOK25mfULFCNL5yDWTOjBOQpVsk3t6zDrKApIus5YekuN/LmZWBPGMVuYgdSaS1UK98S3/8AtJoEk9oO0yIOgEgk3vxBpEdXUpBqhefIma965HdVj1Mslzg3QsaifyydKr1NJPFmxRHrJp1nq6iqVJbJP5c2byPviRbXYBpv8diZo4LFQdO2KO4rBkY6gBqmOdIF/M/fEj0gNqstWK24kairWMqB8t4M3Y4qvS68yfjorhQc+sz9KU6grvfGoipiCwwVJNnAMrY9oIzkc1ADs7rAA28TKzYSepqUqy3pGeDRzIfUx9favpNKutJVicH1HmSDfxVpbJPtzMqSWLEUoayNzuYrIbeiB4j6g0jFm+WFSWI/Fs7ttmY2GoG1Clq4Jq7uZNdilAAOfSMAhbIs6r1cQtrvNi6JP5ZlQFOpTwa3uRbqCLYXd45mlLdA0av195LXgdpvY3uJFUlbDXROofl5MltWqwMe2JfxUSCGJ2Av5+0k5RgQAPfiZ0JDFGvcAc7RsuKJB4siT8VEYF5hZVrAIF5HNSKWErNdMuSTzKbVYI23HoZNXlhQAx6CMf8AiQxO49PMzpk2pjRz7CvswJYjSA1kb8wUmxqrS2d/1kvQFiwPJHpvM/SgbUbm64jU2tE/Dj3g9HqGucAcCStgWQSdW8ypk5sgEc/SMNqBscHNw7rrbBAb094BVGL45wfeZ08IF1FWeeOfv9olYk2AzahwKBMo6iVODe2eIhTC2Ol2PwjMijCbWW1bA7DiCuQ2DagbGIm1Ybf1D4qKbXxuZFNbDt88X6SFJG4yScCALKxqxnYbn5RgDnAAsDxJOGwOGXb9jJJZjRz/APjKFWpBDWM+3mJb/MBpbc34+/0iUCxIqmvzCtPpXpmBA02pNf5EfrE7AO2rJOKuAaKdQAJqsGS3xCgKsE+kk3g0Tm7+cAWrnH5r4kmtTqztjzAF1Urnm8WbPMFULS3xCmagdNcZ4gYVmuwDnxyYMXLk1xjxK7XyQQxOwzjzJ1drpx9IGpTpYHcAc7by8Ab/ADImWWygxz5MLIJABXPtgyQa+COTiWdQIIPrxvmQB5uq+HwJV4wQ2M+o8wOE5Y+vG0ZJOBqsjeoKBtQIbN3+sGpRalq9RURgdp8c/wCpabKCaK74EzNfiZF3sI6IBJts3fG8DDXe3I+UpfhOK8HzJDNdf43RvFe8ahQ4BbcZsUZJjW62O7c405uNCdwpth+UbmBtqHb6G9xGKcAkEMTwLuMyOo54x7frGHIYVtR9t4iSVcEV/UQtqCChefWSGrKM5sbWRsPWSrHVRXcnAPpEC2o0rCjt6UJYogE2AAaEAGDWCpxv7GDEsasn5Vn+8wz2lGUkjbyPMBvkCmvN/rJM7bTpCsCw3I5gpYG7ogYiYALYtgTuw9IiRrs0bwB/UDaI1oATkAXYv6xNa0ANt/QSe6iWBJ1XfG/9ytTXzgmmPiAWpDA2KNHN7yQ7qCDe+e3cnxGqgEANxZBEACVUdh4Gdx9/xJAXVq1EMdQrFZMZZmJIWhQxWI+11BIIY8AXfvJYmnWqv61AKV9JBBNAHHG8tlGwN8FiNpkO5Rp7QDn1lWyuxVSKO22IKCk3lbycecS21rpYWAM+xkqucilAwPA9ZQOAVZSzD5MMZiBFnciyTgj4ef7la3KVTAkb1m/T6xKx2IBVjmjwIOFAtdRBO5FcbxGsahuaq9syumxKqrGiAPn7zJyo6lkXdALxCnCMWBYlrvjeIKcsKobb+QJSnUpBBGDRvcyATdZwcNvj3lBVAVSbsXRGago1bqA0dQ3O25P3+kSarBpjYrAAsw7mVQCpxQzuN7lDT1B3WrE4AF37xAyWd9QFCtq7dpakqVN6lCncYmd//YAav5YuNO5QEGLz68yQ6CO00dVckVQ+8SFZgSCnOwPpiSCUJKA3qvwaPpLAwAboA0K2EkltqAVluhkjwRBi7MBlrwe2vswVu0aSrEj/APYeY1PdVKyvzfAkpMM56VFWDEfFzfpLQlTZxWf9esmhRZbKk/ER+sG0/iWy2aAAvH/UlLVL0KGOnSPAswYVQoVz5AkEGmJWzdj6ywzEkAk6dmJ495FFWlsaojBAPrHbqDuM38PMSKoZVvDC6IjIZlQWpvAN7iRUmhYtqIJvGOTLOpjenjArHtmIaXUFsOTis3H/AJqME/WrkUlaiuRkAHfaaEUMe1kVQmW4pBi85zKBN2oIo7bffEiktbG65vb5f9S2ZhTKTpGSPWSoDEarAA+koHYggkj6iRSIktV9w5xzLRjVd118R3+Uha9Crb54HMshatSSp/MRJJSg345/1LQnSBdaa4/eZgjVZA4AHEruCtYLG5FSu2DUBeRxLXuY48gG8SFLajvg9rXx7ylqwu2MipNIAuL387by+nrJBIbIo1zJpiFBKngG95oGV1zYbihdiRQM2GrFbViWpK1R8nbEkXTCt/G8ak1haFjbmRUtmGCLv1IkliB3LeawfSLILEA4PmUlNvdAHEikqjQZbrc+krUWNHPnG8kNtRWyPr6yxd1iifPEkh3VzdVf9SkuxmiIsDIyCdyIjp12QD6SSrVCa8UPEHUrVARZ0XV5lZOPGx3kJWrWDQIqxquUrMuM0fSQihaA5lZPIPAzuIga3exN4wJeonOw8cSbDLz6Vm4ZphzIStWKmxVC5rVgEftxMLsdomnTJDHFePMik0U5yP1ltYNgGuZK0WsgV4lgYFVczrOmGJORfylhmOKPvIvGwPzlgDJBx5qQkV37SuM7ycatoC6JyYgu6/qPcTMZP8yxgfxEQsiEcIB7/vvvGvrCrO8CcET9AOnBqG1cQ29Yc5FwAxcVjmM4zUUDP0GYibxWJV+f1h68wABxuYhQOBA5N2LhxADmGBxDPA+cL4gDsbiBpc8wGBUDmBlecx4r1ivBH6wqv7gCvOcSQBVSjv5ElgQNqgCIHiZsM77cTXNb3IY/T3jDnbcV5knT/wBzYgg+syYas3kSjc7DP8kzJ1GmhXtN3uvlM3BuwD7yoTmxQxkyH037cmbHnxziQdj/AHKU5HXSoJ38zkYNnOCTn0ncykju+dTn63wsoIob1W8qKjg/+RpKgggH3wZwsNLGhpF18p6PVTSlYJrJAxOPqLRK0X/mXHL/AB1wP06btVSK+dXtMuwplCM4Wt51upCg02ngULE5mvSAQxYj2x5zKcmOd+mGbSuy/Ljec7kqyoOTtO1ySpvbnO8wZT0s7sK944qVjizm7Jof1OdqPcoDMDjyP74m5AfqWxHauVxn0BG0xa7NggqANMK0jNtLqQascE7CZgABLT25AxtNyNTEjpsPDVxXMzyRVMaGaX03xJpYkDp6i3I/NJC0A15Juzn5ywTexCnAIO/rGys3xtZqzRmN/QYqxayxOT8XkVH1CoAo/rj7zH1HKgpdDNlasmpBX8JdIIYkVqG30md/R4zPaaC6VurBk6VLghQdq88YqaNVFQpbx6yaKuGIYLXIFiZWEntIyprhagyA6VQ2BxCycaWZj8secyslcmhVGjUzoZNa9oybyPMpbN2bsmgZRXR3HOxz5mZt31FharZW/wBAZjQgqGJKrrzjyP74gSGsN8VYvgSrtdjYFRAaj2odvirj1kWKZ/CR22fqBiXaXqXe9+fMNX5c+tDBiB7iSCFNZ8iZUIKlaYizZNmSupgbJyd/Spuys16jeLNHeQzFQy3gXZFDNSKRPWKP64+9pmCEOBoXawZen8MVgkr8Qr9oiQLXST+0yp4zFF+2qr+o7XQAUq9hWT7y2UqQTYFYFCxIJsDDazxkY+cj0ZlQTSHtHH8yMp2qRvt5mqliuWrgi4q0d25/fxMacAN3ZyZnQJLDu8eRKFsxLEYFkefQGLJXaqAxIqibIqxfHoLkihptP5rEvTZwhH/lFkYpjjNDf1xM6AAlkgWRsSN4ihA1VnyeY1Js4pff4o9LMMnjNSKaFJzZ3OGr0lsQCKNeM4iLGtNgAbkVk1ERoThsb/6kHCPaKA0D3iIUtQAqse3tLI37S3jGIiNJ/MABtQsZgogy18J32rJlaQaVTYHHyiJv8hLHbjEtSSPGKOf2/WAZM1di1d3Q5mq1Zs7k/Y+cRUqdW5oGJbfqWSDpFkefSSZUuSF1G8XvGaIO18DwI7JHN1tHWs2qt/7V+8DRjStJk58gYljRZJ3GxqTmtOSeQBviUN7o6SKu/iEAWkgatze55gCWBJY9xwflLClj3G8Zo7+kTFkVlxpqyRQJMkE5FCj+tj72iXtOBpW8GMD8NQN7X4hx8oZBI0s2OeYHCwXpQGFYzxKDLRtSM4WsmLToolSBXwkC47O2lmP0xcRmQpIVdgdoiSvYDkmyPMpSSN+MiMrpGvB2+fj79YGQIN584/qS1HuADG8ZzHlntiNrK2POwPEkkkcggVpkmuw1gkWLx4gKULaXnHgY2jC6zhWHhvEQNgDJ5ND+ozV2Ak8jmGnZtzd5NwF3dUhxd7xhSxpySdzRkhKMzAgscnDV6S2K0Dq/XERYqCtj108mtoUUQVpY1eof1AEKXYaRsCD+sNILYAI95Ww06S2MesDaUSrKP8SBYzJMDRpPYd9q3zK0KToQ4vb+ZIJ/xJY+4sX6zRdRAF1jSc1cDQ1odAO5GOTNFzqtsWcfXaIKV7jk4yefED/ydW2K2ASVx52BgEk6mYjuIPnIjtWw2CNrO0AbGxFDAlDuyOm2fzV+8kyWhotQb25qV/x3e5Gxr9pKs2nTTXzQ3x6Rqe667dgQdxAHWzXebBN5gjs1nVgnB+W0oKWPcbNcGBcopWxQGSKFmv5iM3YaRTfO8fP9JKkK2BoXyIlX8NBRDEj4h/Uo4JFFj7Y/uATQL9oXbGf4lh1IYlazsBk5/aLSVokEAD4SBY/1GWOg0pLnbcWL9YjWVBART2jge28kt+H2g1nbzNFsivke7jwP1hWgaz3GgRfPivvmIBXDWGPmhf7fOQ2Q2lQ5vncR56vW1MwFCyuK32EQY0MEUuFrMFCwSRYDbAH95a0NH/GKJFDcDeIDUe1G2+Lx7wBOkKQdu4Bd8ekQaL+HlgLI2JH7RDp1p6mDmwTzBCbuuwirB+Iek1CnqEams1nSZFTqek7MCSxOo4avSaPpAFEXfnEjWUBUVpAssuM1x+kNJ6SDIclT3Y+lSaS17CQq6B5GfnGFBchdNV5/iIYFUWxjEoKV7tLKB+U1YkAwy0xKVnYDJmukWEX4RxeDMrJBtSWIwNsXNgW06SeKIvjxJJBNDQu5O3mbdMgubOLP2IgukaybxeR9JK31OqCSLUWRY87ekmkptLAkDXR85jNFTZ7tgL29YgxZQQCKAMpRrICq1/5ePeRUktUnYCDxuOZsugnUBkennxM11AVR2yAN/pNEPddEKRW+4kUVdduq7zgmCuzAkEnUcGvSMKXbua8ZAO8TMUJA2AskADjiQhblaBVv1uCnTYA0r/kD+sgj8MLsSVJsS1GStM1DxiTQYA1doUivMtNNG1rJ4yYgpQWVKrnFZEo2G2tjtxJJRUGlXb94ElQFBqyMeY0s4OMZzKACjVzWLkVJoRe9CzQjwboXRFeRIy/V7mAIs1j6ShdYsaV2k0jNNhjniNawNN3t4lAXVK3i/EatkDOMmhv9JFC10kkkWfMqj8W+dyZKnN1S1XuJoFLnuz6DxIqUqxYMbOTgzQntsYkaipK2PUj+JVaQM6sXfpIpD4dgBnf+ZVePlDBNUdvlH8JFghRwZJKGmjYoXt5lkCwAZmT25sn+JqoYqB8jniSVI4wDV8TVCLztmZjAvfGDKyzjIGLMhJmmJwTHuM1fiAOoihVfWMA3hW94geAoOm/HiaLpycXM1uqAPnA3+k0U922KrfiQk1Wm1HnaWLY6vXeOiTk5rzGCdOkEZ5Eioq7H4Yzn3jBpsY8SFGjO5IJmq14mVRQANxkRgizioc3VDOIZDHe5JGBqIA3HEZr2NwXAonb1laaGrn2iBrWo3tC9V1Ee58mjUAc4FSQrVCF+kIB7/tCA7jAfDP0C6YjdVHsPi3gOYqGraAANGyY9wSBAdxIMYWgYGW8IbLDYwAsb1CiX3gYfluAPbmLVtiEIA4QhAxCEIBNVm4vc7SuSJJANfOALcGQRYoiaVYkkUN4BkwwR9Jm+RNn3EybeUGBUlsn1mfUBs5xNuqAF24mRA0nEs2BoUKLYzM2VlJ7d5uRYXi5Dr3YNYjJyMuk2Nz6TJhmiPT9bnR1fir5eJgdmN7GUvy4uqtagCb8+k4+p09HcHWybr7956PWFE3k1v8/9zz+sE1E6bANUTLjkeHG57rLGhyQe738TncHqLhNIAs3f8ztbpqesEyLJ9sGYlKVgDvi/lG5fmuHqKT2stg7GZsHZTR1eBU6XtF1XYsCveY9ZNNC7AF++LlT9xo53KlbK80cVMW6Wt8t2bgHNzoZSzst0EGmqwZzdUgoTWVAo3tHFeUOSpID2dtIuiPupmOooZQAznTd0RUs6WwFo3vztF0xrReoLsizZuTVoZeooNqL8f3Jwpx2nmhn9Zt1UotRoDAA+kyJvUM9mN/l/MzoI2GAdTRIG3MyrUGUXr59vaaqD+GWujtfOZl1CFYXZJU5vixiZ2EWnT0w2sWTeN5Oqj3OSFG5B7oyFR3AGEqhK0K3WXp1Qzttg/wC5j6UzN9TpkqlcnVf8yXUnDKM7WJr+UefPjFyG/wCPN3dCZ0k2xBFlqwMQYqVuiKNHETUzqDdHNX85Wn/kq8ABflMaGZ6et6LUN+7P3zJLMrUHJrgbGNgH6QaiKArO0QCkkaQLNXztMqDDp2imY1ZuxUTK6kkrneWqAoOpm2BbPoY2TJANYqSbEDSbXtJ38/6j2ZdQ7TQ2gTbspslAc3vxJXYjmt/nUigiBTKAS3MWnT09WsatzGxq8WdJz6XtIIW37cAhaJ/WZUCxdFmKgHJHxf1Du6i9qkUNRDX/ADKVVd1QihnaUAaq9+eRzM6bEgk0ygyjqOFOrxDKjVZINCveJs6PFaq/X+ZlTGoEWRsaMWnW4zS7jVAAnqBb+EVtuJBOpL2pRXpM6ItiQcPeapboiJWUFQAWNXsRUAASMUbonnaUP/qHVF2RqycyKuEVdb7B5AiXtaxgnehmWy9pN1wAOIytsynOgbyKaCdJ0lTVgbSasldmP7StOlCQc1vzmS3aaOTpOdsTOmAhADahZIMkGmBZjS81vBlVOqw02Aaoy9KnqBaoEE17GSZDV1E7VogWbv8AmKjsVscXNQmN8+ZJvpgtd7Cv1/iACkgVlq2xGx7b0nG+JNDWm9Eaqv5ymBDhbxVVxUDQy/iOBqAB2vxGcNQYn0GxkYfohqrSBWdpXTpie0DbPO0RgOvYMk1eQRUZXqKSSovcCAUadebPdn3ldQFWoGq2qAIdp1L2nnAv/UrYgMO3A2klu9kNnRzfy/mNcBvPn9JJg6aIs3BU0rYYFiQYnP4ahtzpOeasY/WIqodxWAaqIHjV3MdIBzXxSgW6iYSuSGiGluqvTogEn2xNFHbXqBe5zf8AUAyYEimXeWLIoWa2xA2gvUSLC1+sROFxirq/nEpTUUsj4TRiKa337TkXGts4UGgBp9xV/wAzPVr6RNVpAr0iNobUYe6Oy3RElHUaRTE1exFfeZSUaAFHk87QQBl1CwdzZu4AyOohNrk5Ai2Oodp9BNOomkNRIrAAk3ZZc9t5veIHdHuUkYBx84b2oNN78QVewknJxfviS5KA2STRz6fZkmpemVXXrFtnbMWo6hrJIF5IJv38SDp/GYacA7XNQqt1k6dUCT7YgYVm6iDSlV3G7j3wUwdpajB84F/MyST0wWu8QBiwAF7q2x8toFhpvSQwNHHpEQMHNFQxz84wCX038IrbjeAJkPUag3afJGwjJ0vQfI4W6MzLh+kaWqAAztc0RVNGhZIzuZJkvUFoDqY1ebFfeZejqD8gsjESL/xhwTZF5mjA68GqsCuIBmBR1L2n2z/qaX3UwxhdubkBtWpTdoDm95QGnWbyLF+m0Rg1ZUXqP3tBE0pqHUBLZkuT01uySFNH0+zJJUO40dooV9+8Rr1DX3OxUXnSTfpLBbrJSJWLIa5B0t/8gdIjGo7bGrmyjHzAvnJP9QCWy1MvbxKXVVA6lArb5RWemqtZIY6akvVLvRAJF/P+IgbOCh7SKNGh6eYHpl3A1Um4vwJQBtVDUAAtcUc/zMdav0S2kgoBpztv/UFNbKt2vsdhdER9PqKugUzmrOCK+8xdMKVvSLwL5yDK6YBRXFgkncxJWV6ikkqM5CmC0G1Clb2H2Jo/TrrMAxGm6A2kse4obOhSbvesSCWDRyp04U++/wDUK1MyrYY8HapPSwpbnOfTaD/8XTVssSpo7ECTTX0umdGvWCSb2zGGOoa2YgXkgnEy7F6jrptQdNX7TcKr9cdPTpBOw254kUiUt1l7Ur8x1X/Msd1BlxxKUAEYyaF+Lv8AqMA9O2DE4/eQRqSKHxVgY+W0piNGQQVwfpE1du/dTb+5/iMKSwAatKj5jeJJ6C7CjQPnwJV6WFPZB2HMx1q3SPbWkYztNemFOKomsyKDDAaAQWarNgj75l6XFmh6RdJR1OmXGDnfN1LIOrBoC6Hsf9yE2pFr3L2kY+/E2Bomx27XMtZLEEntUnetpYtbIPp9cRIUKYsou+I+kgHT1BgSSD6ySfwwD8Ro5MR0qzYsDj6SPQa7PliVF7j9JopZ1wlcm4qU9YdPTj9DLQYIs3jMgINg0wsGarZwMj0EzHaLBPiVdhfUavPJ/qTU1ZPbkZG+IiNTgDA9ZQUk6bqvTz/3IFHpMa+ECs7TOlGotThzjgbGCMBpGWO+QRF0yDuM0Dc06Y/EQsCQc+smiqpw3w3eRKFA2BRMCpDVexgTlgfyCZ1J3VHcbfOVuebMQFknm6iHaaOa2k0mir23qXzC9LdzHT5qSQocrWKEsaS1ESaVUhLJ2jO8Mk0RGorY8gQBoX6XJpVfFXdYlLscbSTsvrnPuf6lDDDxtIqVVb/Fg/xKJPn5CQTan/xAqV0ha53PMkGrqCook+xmmlgNgeQJmBbE+k2q29BsJNTTX4rE0GMzMfHp8D+Jr8Ksd+JnWdA2NXmWl6b1DMzHaReZTABiKwJFQocWdpXxLQXeJckAylULtIIuKO0pcYPElsAfSMYavOYjaEitq8ySDYF4O0fgQABUmtpIOq/MISNXpCAf/9k=";
const PAGE_THEMES={
  home:{bg:"#F0EBE1",barBg:"rgba(240,235,225,0.96)",barBorder:"#E0D8CE",logoColor:"#2C2420",metaColor:"#9A8A78",syncColor:"#6B8F5A"},
  stash:{bg:"#F0EBE1",barBg:"rgba(18,34,10,0.7)",barBorder:"rgba(240,235,225,0.1)",logoColor:"#E8E0D4",metaColor:"rgba(240,235,225,0.45)",syncColor:"#8BBF6A"},
  library:{bg:"#1A1410",barBg:"rgba(26,20,16,0.96)",barBorder:"rgba(232,224,212,0.06)",logoColor:"#E8E0D4",metaColor:"rgba(232,224,212,0.45)",syncColor:"#D4B888"},
  insights:{bg:"#1A1410",barBg:"rgba(26,20,16,0.96)",barBorder:"rgba(232,224,212,0.06)",logoColor:"#E8E0D4",metaColor:"rgba(232,224,212,0.45)",syncColor:"#D4B888"},
  compare:{bg:"#1E1628",barBg:"rgba(30,22,40,0.97)",barBorder:"rgba(200,184,232,0.06)",logoColor:"#E0D8F0",metaColor:"rgba(200,184,232,0.45)",syncColor:"#9B8ABE"},
  recommender:{bg:"#0F1420",barBg:"rgba(15,20,32,0.97)",barBorder:"rgba(200,212,232,0.06)",logoColor:"#C8D4E8",metaColor:"rgba(200,212,232,0.45)",syncColor:"#7A8FAA"},
};

const LEGACY_STRAINS=[
  {id:"L1",name:"Oreoz",type:"Indica",copAgain:"Yes",notes:"sleepy, giggly, funny high. feel it in the eyes"},
  {id:"L2",name:"Snow G",type:"",copAgain:"Yes",notes:"sativa dominant hybrid vibe. good high for chillin but not sleeping"},
  {id:"L3",name:"Runtz Mintz",type:"Indica",copAgain:"Yes",notes:""},
  {id:"L4",name:"Trop Cherry",type:"Hybrid",copAgain:"Yes",notes:"lazy body, active mind"},
  {id:"L5",name:"Cereal Milk",type:"",copAgain:"Yes",notes:"great taste and smell"},
  {id:"L6",name:"Lemonatti",type:"",copAgain:"Yes",notes:""},{id:"L7",name:"GlueChee",type:"",copAgain:"Yes",notes:""},
  {id:"L8",name:"Gello",type:"",copAgain:"Yes",notes:""},{id:"L9",name:"MAC",type:"",copAgain:"Yes",notes:""},
  {id:"L10",name:"Garlic Aioli",type:"",copAgain:"Yes",notes:""},{id:"L11",name:"Red Rum",type:"",copAgain:"Yes",notes:""},
  {id:"L12",name:"Ice Cream Cake",type:"",copAgain:"Yes",notes:""},{id:"L13",name:"Biscotti Cookies",type:"",copAgain:"Yes",notes:""},
  {id:"L14",name:"Jack Herer",type:"",copAgain:"Yes",notes:""},{id:"L15",name:"Mendo Breath",type:"",copAgain:"Yes",notes:""},
  {id:"L16",name:"Jokerz Candy",type:"",copAgain:"Yes",notes:""},{id:"L17",name:"Crenshaw Melon",type:"",copAgain:"Yes",notes:""},
  {id:"L18",name:"Gas Face",type:"",copAgain:"Yes",notes:""},{id:"L19",name:"Modified Grapes",type:"Indica",copAgain:"Yes",notes:""},
  {id:"L20",name:"LA Confidential",type:"",copAgain:"Yes",source:"TL",notes:"high is giggly, horny, good, hazy"},
  {id:"L21",name:"Medellin",type:"",copAgain:"Yes",notes:"not for sleeping, but great for productivity while still feeling high"},
  {id:"L22",name:"Delicata Grapes",type:"",copAgain:"Yes",notes:"put the blunt down halfway type shit. deep lovely INDICA vibes."},
  {id:"L23",name:"Blueberry Haze",type:"",copAgain:"Yes",source:"TL",notes:"my favorite productive strain ever"},
  {id:"L24",name:"Cake Batter",type:"",copAgain:"Maybe",notes:""},{id:"L25",name:"Kush Mint",type:"",copAgain:"Maybe",notes:""},
  {id:"L26",name:"Purple Punch",type:"",copAgain:"Maybe",notes:""},
  {id:"L27",name:"Sherbert",type:"",copAgain:"Never again",notes:""},{id:"L28",name:"Tropical Runtz",type:"",copAgain:"Never again",notes:""},
  {id:"L29",name:"Ooh La La",type:"",copAgain:"Yes",notes:"great outdoor strain"},{id:"L30",name:"God's Gift",type:"",copAgain:"Yes",notes:""},
  {id:"L31",name:"Pina Colada",type:"",copAgain:"Yes",source:"Dispensary",container:"Bag",brand:"So Dope",notes:"smoked outside and it was the best mix of chill and euphoria"},
];

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */
const Leaf=({filled,color=P.sage,size=20})=>(<svg width={size} height={size} viewBox="0 0 28 28"><path d="M14 4c-1 0-3 2-3 6s4 10 3 14c4-2 8-6 8-12S18 4 14 4z" fill={filled?color:P.border}/><path d="M14 4c1 0 3 2 3 6s-4 10-3 14c-4-2-8-6-8-12S10 4 14 4z" fill={filled?(color===P.sage?P.sageMid:color===P.plum?"#A585A5":"#D4956A"):P.surface}/></svg>);
const Pill=({children,active,color=P.sage,onClick,removable,style:s})=>(<button onClick={onClick} style={{fontSize:12,padding:"5px 12px",borderRadius:14,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.15s",background:active?color:P.bg,color:active?P.cream:P.textMuted,border:active?"none":`0.5px solid ${P.border}`,...s}}>{children}{removable&&active&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke={P.cream} strokeWidth="1.2" strokeLinecap="round"/></svg>}</button>);
const TypeBadge=({type})=>(<div style={{width:4,borderRadius:2,background:typeColor(type),flexShrink:0,alignSelf:"stretch"}}/>);
const SectionLabel=({children})=>(<p style={{fontSize:12,fontWeight:500,color:P.textMuted,letterSpacing:0.5,margin:"0 0 10px"}}>{children}</p>);
const BackBtn=({onClick})=>(<button onClick={onClick} style={{width:36,height:36,borderRadius:"50%",background:P.surface,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1L1 10M1 10h6M1 10V4" stroke={P.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>);
const ToggleGroup=({options,value,onChange,color=P.sage})=>(<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{options.map(o=>(<button key={o} onClick={()=>onChange(o)} style={{flex:options.length<=4?1:undefined,padding:"10px 14px",borderRadius:8,fontSize:13,fontFamily:"inherit",cursor:"pointer",transition:"all 0.15s",fontWeight:value===o?500:400,background:value===o?color:P.bg,color:value===o?P.cream:P.textMuted,border:value===o?"none":`0.5px solid ${P.border}`}}>{o==="TL"?"TL":o}</button>))}</div>);
const SubToggle=({options,value,onChange,color=P.sage,label="hybrid lean:"})=>(<div style={{paddingLeft:12,borderLeft:`2px solid ${color}`,marginTop:8}}><p style={{fontSize:11,color:P.textMuted,margin:"0 0 6px"}}>{label}</p><div style={{display:"flex",gap:6}}>{options.map(o=>(<button key={o} onClick={()=>onChange(o)} style={{flex:1,padding:8,borderRadius:6,fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:value===o?500:400,background:value===o?color:P.bg,color:value===o?P.cream:P.textMuted,border:value===o?"none":`0.5px solid ${P.border}`,transition:"all 0.15s"}}>{o.toLowerCase()}</button>))}</div></div>);
const SpectrumSlider=({left,right,value,onChange,color=P.plum})=>{const labels={[-3]:`deeply ${left.toLowerCase()}`,[-2]:left.toLowerCase(),[-1]:`leaning ${left.toLowerCase()}`,[0]:"neutral",[1]:`leaning ${right.toLowerCase()}`,[2]:right.toLowerCase(),[3]:`deeply ${right.toLowerCase()}`};return(<div style={{marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:P.text,fontWeight:500}}>{left.toLowerCase()}</span><span style={{fontSize:12,color:P.text,fontWeight:500}}>{right.toLowerCase()}</span></div><div style={{display:"flex",gap:4}}>{[-3,-2,-1,0,1,2,3].map(n=>(<button key={n} onClick={()=>onChange(n)} style={{flex:1,height:34,borderRadius:7,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",background:value===n?color:P.bg,border:value===n?"none":`0.5px solid ${P.border}`}}><div style={{width:value===n?(Math.abs(n)===3?16:12):5,height:value===n?(Math.abs(n)===3?16:12):5,borderRadius:"50%",margin:"0 auto",background:value===n?P.cream:P.borderDark,transition:"all 0.15s"}}/></button>))}</div><p style={{fontSize:11,color:P.textMuted,textAlign:"center",margin:"5px 0 0"}}>{labels[value]||"neutral"}</p></div>);};
const SpectrumDisplay=({left,right,val,color})=>(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:P.textMuted,marginBottom:3}}><span>{left.toLowerCase()}</span><span>{right.toLowerCase()}</span></div><div style={{display:"flex",gap:3}}>{[-3,-2,-1,0,1,2,3].map(n=>(<div key={n} style={{flex:1,height:20,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",background:val===n?color:P.bg,border:val===n?"none":`0.5px solid ${P.border}`}}><div style={{width:val===n?(Math.abs(n)===3?10:7):3,height:val===n?(Math.abs(n)===3?10:7):3,borderRadius:"50%",background:val===n?P.cream:P.borderDark}}/></div>))}</div></div>);
const DarkSpectrumDisplay=({left,right,val,theme})=>(<div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:5,color:theme.dimText}}><span>{left.toLowerCase()}</span><span>{right.toLowerCase()}</span></div><div style={{display:"flex",gap:3}}>{[-3,-2,-1,0,1,2,3].map(n=>(<div key={n} style={{flex:1,height:20,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",background:val===n?theme.accent:theme.cardBg,border:val===n?"none":`0.5px solid ${theme.cardBorder}`}}><div style={{width:val===n?(Math.abs(n)===3?10:7):3,height:val===n?(Math.abs(n)===3?10:7):3,borderRadius:"50%",background:val===n?"#fff":theme.dimText}}/></div>))}</div></div>);

const IntentBadge=({intent})=>{const b=intentBadge(intent);if(!b)return null;return <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:b.bg,color:b.color,border:b.border||"none"}}>{b.icon}</span>;};

const TerpeneSelector=({selected,onChange})=>{
  const[search,setSearch]=useState("");const[open,setOpen]=useState(false);
  const filtered=TERPENES.filter(t=>!selected.includes(t)&&t.toLowerCase().includes(search.toLowerCase()));
  return(<div style={{position:"relative"}}><div style={{background:P.bg,borderRadius:8,padding:"10px 14px",border:`0.5px solid ${P.border}`,display:"flex",alignItems:"center"}}><input value={search} onChange={e=>{setSearch(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="search terpenes..." style={{border:"none",background:"transparent",flex:1,fontSize:14,color:P.text,outline:"none",fontFamily:"inherit"}}/></div>{selected.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>{selected.map(t=><Pill key={t} active color={P.sage} removable onClick={()=>onChange(selected.filter(x=>x!==t))}>{t.toLowerCase()}</Pill>)}</div>}{open&&search&&filtered.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:P.card,border:`0.5px solid ${P.border}`,borderRadius:8,marginTop:4,maxHeight:150,overflowY:"auto"}}>{filtered.slice(0,6).map(t=><button key={t} onClick={()=>{onChange([...selected,t]);setSearch("");setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 14px",fontSize:13,color:P.text,background:"transparent",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>{t.toLowerCase()}</button>)}</div>}</div>);
};

const TagSelector=({tags,categories,selected,onChange,color=P.terracotta})=>{
  const[ci,setCi]=useState("");const[adding,setAdding]=useState(false);const[openCat,setOpenCat]=useState(null);
  const toggle=t=>onChange(selected.includes(t)?selected.filter(x=>x!==t):[...selected,t]);
  if(categories){
    const catEntries=Object.entries(categories);
    return(<div>
      {selected.length>0&&<div style={{marginBottom:10}}><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{selected.map(t=><Pill key={t} active color={color} removable onClick={()=>toggle(t)}>{t.toLowerCase()}</Pill>)}</div></div>}
      <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>{catEntries.map(([cat])=><button key={cat} onClick={()=>setOpenCat(openCat===cat?null:cat)} style={{padding:"6px 12px",borderRadius:8,fontSize:11,fontFamily:"inherit",cursor:"pointer",background:openCat===cat?P.text:P.bg,color:openCat===cat?P.cream:P.textMuted,border:openCat===cat?"none":`0.5px solid ${P.border}`,fontWeight:openCat===cat?500:400}}>{cat}</button>)}</div>
      {openCat&&<div style={{background:P.card,borderRadius:10,padding:12,border:`0.5px solid ${P.border}`,marginBottom:10}}><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(categories[openCat]||[]).map(t=><Pill key={t} active={selected.includes(t)} color={color} onClick={()=>toggle(t)}>{t.toLowerCase()}</Pill>)}</div></div>}
      <div style={{display:"flex",gap:5}}>{!adding&&<Pill onClick={()=>setAdding(true)} style={{borderStyle:"dashed",fontStyle:"italic"}}>+ custom</Pill>}{adding&&<><input value={ci} onChange={e=>setCi(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&ci.trim()){onChange([...selected,ci.trim()]);setCi("");setAdding(false);}if(e.key==="Escape"){setCi("");setAdding(false);}}} placeholder="type & enter" style={{fontSize:12,padding:"5px 10px",borderRadius:14,border:`0.5px solid ${P.border}`,background:P.bg,outline:"none",fontFamily:"inherit",width:100}}/><Pill onClick={()=>{if(ci.trim())onChange([...selected,ci.trim()]);setCi("");setAdding(false);}} color={color} active>add</Pill></>}</div>
    </div>);
  }
  return null;
};

/* ═══════════════════════════════════════════
   MENU OVERLAY
   ═══════════════════════════════════════════ */
function MenuOverlay({open,currentPage,onNavigate,onClose,strainCount,mixCount,reupCount}){
  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,maxWidth:480,margin:"0 auto",background:"#2C2420",zIndex:300,display:"flex",flexDirection:"column"}}>
    <div style={{padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid rgba(232,224,212,0.08)"}}>
      <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:500,color:"#E8E0D4",margin:0}}>cLOUD</p>
      <button onClick={onClose} style={{fontSize:18,color:"rgba(232,224,212,0.35)",cursor:"pointer",background:"none",border:"none",fontFamily:"inherit",padding:4}}>✕</button>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 24px",gap:4}}>
      {PAGES.map(p=>(<button key={p.id} onClick={()=>onNavigate(p.id)} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderRadius:14,cursor:"pointer",background:"transparent",border:"none",width:"100%",textAlign:"left",fontFamily:"inherit"}}>
        <span style={{fontSize:22,width:32,textAlign:"center",flexShrink:0}}>{p.icon}</span>
        <span style={{flex:1}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:400,color:"#E8E0D4",display:"block",marginBottom:2}}>{p.name}</span><span style={{fontSize:11,color:"rgba(232,224,212,0.3)",display:"block"}}>{p.sub}</span></span>
        {currentPage===p.id?<span style={{width:5,height:5,borderRadius:"50%",background:"#D4B888",flexShrink:0}}/>:<span style={{fontSize:14,color:"rgba(232,224,212,0.15)"}}>→</span>}
      </button>))}
    </div>
    <div style={{padding:"20px 24px 36px",borderTop:"0.5px solid rgba(232,224,212,0.06)",display:"flex",justifyContent:"space-between"}}>
      <p style={{fontSize:10,color:"rgba(232,224,212,0.2)",margin:0}}>cLOUD · your terpene journal</p>
      <p style={{fontSize:10,color:"rgba(232,224,212,0.2)",margin:0}}>{strainCount} strain{strainCount!==1?"s":""} · {mixCount} mix{mixCount!==1?"es":""} · {reupCount} re-up{reupCount!==1?"s":""}</p>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════
   TOP BAR
   ═══════════════════════════════════════════ */
function TopBar({page,onMenuOpen,synced,onHandCount}){
  const t=PAGE_THEMES[page]||PAGE_THEMES.library;
  return(<div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:"14px 24px",zIndex:200,display:"flex",justifyContent:"space-between",alignItems:"center",background:t.barBg,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderBottom:`0.5px solid ${t.barBorder}`}}>
    <p onClick={onMenuOpen} style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:500,color:t.logoColor,cursor:"pointer",margin:0,letterSpacing:0.3}}>cLOUD</p>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:11,color:t.metaColor}}>{today()}</span>
      {onHandCount>0&&<span style={{fontSize:11,color:t.metaColor}}>{onHandCount} on hand</span>}
      <span style={{width:6,height:6,borderRadius:"50%",background:t.syncColor,boxShadow:synced?`0 0 6px ${t.syncColor}`:"none",opacity:synced?1:0.4}}/>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════
   PLACEHOLDER PAGES
   ═══════════════════════════════════════════ */
function PlaceholderPage({id,title,sub,desc}){
  const dark=id!=="home";
  return(<div style={{background:PAGE_THEMES[id]?.bg,minHeight:"100vh",color:dark?"#E8E0D4":"#2C2420"}}><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto"}}>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:400,marginBottom:6}}>{title}</h1>
    <p style={{fontSize:11,color:dark?"rgba(232,224,212,0.45)":"#9A8A78",marginBottom:24}}>{sub}</p>
    <p style={{fontSize:13,color:dark?"rgba(232,224,212,0.3)":"#9A8A78",fontStyle:"italic"}}>{desc}</p>
  </div></div>);
}

/* ═══════════════════════════════════════════
   HOW TO USE MODAL
   ═══════════════════════════════════════════ */
const HOW_TO_SECTIONS=[
  {title:"home",icon:"🏠",lines:["your dashboard. on-hand strains grouped by intent, active re-ups, mix queue count.","saved comparisons and saved tips show up here when you have them — otherwise the space stays clean.","everything links out to the relevant page."]},
  {title:"stash",icon:"🌿",lines:["your active world. log a new cop, track what's on hand, what's ready to try, what needs a mix review.","tap a strain name to open its full detail. note · experience · mix expand inline — no page jump.","mix two on-hand strains from stash — they land in the mix queue for review later.","finished ✓ closes a cop and asks if you'd still cop again."]},
  {title:"re-ups",icon:"📦",lines:["re-ups group cops from the same haul. up to 2 open at a time, auto-numbered from your history.","a re-up closes itself once every cop in it is finished and nothing's left to review.","an empty re-up can be deleted — the numbers close up behind it, no gaps."]},
  {title:"lite re-ups",icon:"🌬️",lines:["for bud you already started smoking before you logged it. skips the first sesh entirely and drops straight into on hand.","same full cop form, same re-up numbering — you just don't get asked for a rating, spectrums, taste or vibes up front.","set the cop date to when you actually picked it up. the re-up backdates itself to its earliest cop.","you can still rate a lite cop any time from its detail page, vote cop-again when you finish it, and log notes / experiences / mixes forever.","until you rate one it stays out of every average, so it can't drag your numbers down.","spectrums, smokes-like and the first-sesh tag snapshot are gone for good on these — that's the tradeoff."]},
  {title:"library",icon:"📚",lines:["everything you've ever had, in timeline order. strains / mixes / legacy tabs.","filter by starred, cop-again, or rating. search by name, parent, terpene, or vibe tag.","legacy tab holds strains you remember but never formally logged in cLOUD."]},
  {title:"insights",icon:"📊",lines:["a social media-style feed of your own data. seven accounts post insights about your patterns — terpenes, mixes, outdoor, bedtime, brands, body type, intent.","dismiss posts from your feed. they still live on each account's profile page.","save posts to your profile with 🔖. tap your avatar to see saved insights and the accounts you follow.","unrated cops sit out of every average — a strain only counts once you've actually rated it."]},
  {title:"compare",icon:"⚖️",lines:["pick two strains (A/B), see them side by side on spectrums, terpenes, vibes, sesh notes.","save a comparison — it shows up on home.","only rated strains show up in the picker."]},
  {title:"recommender",icon:"✦",lines:["your terpene fingerprint by intent — overall, asleep, awake, adventure.","top terps, winning combos (pairs + trios), and a tip card you can save.","saved tips show up on home as your what-to-cop reference.","'might enjoy' tab surfaces parent strains of your 5★, starred, and cop-again-yes strains that you haven't tried yet.","terp search (🔍) lets you hunt by terpene."]},
  {title:"cop form",icon:"📋",lines:["intent (🌙☀️🏕️) and amount live at the top of the form.","re-cop an existing strain by selecting it from suggestions — keeps your history connected.","lite cops get an extra date field so you can backdate them."]},
  {title:"strain detail",icon:"🔍",lines:["type-themed background (indica purple, sativa gold, hybrid green).","four tabs: overview (spectrums, terpenes, vibes), notes, experiences, mixes.","tabs hide themselves when they're empty and there's nothing you could add — finished cops stop showing you dead ends.","add experiences from stash or detail — captures setting, bedtime, vibes, and free notes.","re-copped a strain? the cop switcher pills at the top move between batches. you land on the most recent one."]},
  {title:"desktop",icon:"🖥️",lines:["add #desktop to the url on a big screen for the full desktop shell.","stash is an overlay there, not a page — it slides in over whatever you're looking at.","library and recommender get browser-style chrome; insights reads like a feed.","everything syncs live with mobile — same data, same second."]},
];

function HowToModal({onClose}){
  const sections=HOW_TO_SECTIONS;
  return(<div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(44,36,32,0.4)"}}/>
    <div style={{position:"relative",background:"#FAF6F0",borderRadius:"20px 20px 0 0",padding:"28px 24px 48px",width:"100%",height:"92vh",overflowY:"auto",boxShadow:"0 -4px 32px rgba(44,36,32,0.12)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:400,color:"#2C2420",margin:"0 0 3px"}}>how cLOUD works</p>
          <p style={{fontSize:11,color:"#9A8A78",margin:0}}>a reminder of your own system</p>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,color:"#B8A898",cursor:"pointer",padding:4,lineHeight:1,marginTop:2}}>✕</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {sections.map(s=><div key={s.title}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
            <span style={{fontSize:13}}>{s.icon}</span>
            <p style={{fontSize:11,fontWeight:500,color:"#9A8A78",letterSpacing:0.6,textTransform:"uppercase",margin:0}}>{s.title}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {s.lines.map((l,i)=><p key={i} style={{fontSize:13,color:"#2C2420",margin:0,lineHeight:1.55,paddingLeft:20}}>{l}</p>)}
          </div>
        </div>)}
      </div>
      <p style={{fontSize:11,color:"#B8A898",marginTop:24,paddingTop:16,borderTop:"0.5px solid #E0D8CE",lineHeight:1.5}}>your V1 archive lives at <a href="https://leonnariley18-ui.github.io/the-cloud/" target="_blank" rel="noopener noreferrer" style={{color:"#9A8A78",textDecoration:"underline",textDecorationColor:"rgba(154,138,120,0.4)"}}>leonnariley18-ui.github.io/the-cloud/</a> — everything you logged before June 2026.</p>
    </div>
  </div>);
}


function HomePage({strains,onHand,coppedEntries,mixQueue=[],finishedReups,onNavigate,onLogCop,onOpenDetail,savedComparisons,savedTips}){
  const[showHelp,setShowHelp]=useState(false);
  const grouped={asleep:[],awake:[],adventure:[],none:[]};
  onHand.forEach(o=>{const s=strains.find(ss=>ss.id===o.strainId);const intent=s?.intent||"none";grouped[intent]?.push({...o,strain:s});});
  const intentOrder=[{key:"asleep",icon:"🌙",label:"bedtime"},{key:"awake",icon:"☀️",label:"daytime"},{key:"adventure",icon:"🏕️",label:"adventure"}];

  return(<div style={{background:"#F0EBE1",minHeight:"100vh",color:"#2C2420",position:"relative"}}><div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,height:"100vh",zIndex:0,backgroundImage:`url(${HOME_BG})`,backgroundSize:"cover",backgroundPosition:"center",opacity:0.5}}/><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto",position:"relative",zIndex:1}}>
    {showHelp&&<HowToModal onClose={()=>setShowHelp(false)}/>}
    <button onClick={onLogCop} style={{width:"100%",padding:15,borderRadius:12,fontSize:14,fontWeight:500,fontFamily:"inherit",cursor:"pointer",background:"#2C2420",color:"#F0EBE1",border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:24}}>✦ &nbsp; log a new cop</button>

    {/* on hand by intent */}
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <p style={{fontSize:10,fontWeight:500,color:"#9A8A78",letterSpacing:0.7,textTransform:"uppercase",margin:0}}>on hand</p>
          {mixQueue.length>0&&<p onClick={()=>onNavigate("stash")} style={{fontSize:10,color:"#8B6D8B",margin:0,cursor:"pointer"}}>{mixQueue.length} mix{mixQueue.length!==1?"es":""} to review</p>}
        </div>
        <p onClick={()=>onNavigate("stash")} style={{fontSize:11,color:"#2C2420",cursor:"pointer",margin:0}}>stash →</p>
      </div>
      {intentOrder.map(({key,icon,label})=>(grouped[key].length>0&&<div key={key} style={{marginBottom:14}}>
        <p style={{fontSize:10,color:"#9A8A78",margin:"0 0 8px",display:"flex",alignItems:"center",gap:5}}>{icon} {label}</p>
        {grouped[key].map(o=>(<div key={o.copId} style={{background:"#FAF6F0",borderRadius:10,padding:"11px 14px",border:"0.5px solid #E0D8CE",marginBottom:5,display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>o.strain&&onOpenDetail(o.strain)}>
          <span style={{fontSize:14,fontWeight:500,color:"#2C2420"}}>{o.strainName}</span>
          <span style={{fontSize:10,color:"#6B8F5A"}}>on hand</span>
        </div>))}
      </div>))}
      {grouped.none.length>0&&<div style={{marginBottom:14}}>
        {grouped.none.map(o=>(<div key={o.copId} style={{background:"#FAF6F0",borderRadius:10,padding:"11px 14px",border:"0.5px solid #E0D8CE",marginBottom:5,display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>o.strain&&onOpenDetail(o.strain)}>
          <span style={{fontSize:14,fontWeight:500,color:"#2C2420"}}>{o.strainName}</span>
          <span style={{fontSize:10,color:"#6B8F5A"}}>on hand</span>
        </div>))}
      </div>}
      {coppedEntries.length>0&&coppedEntries.map(e=>(<div key={e.id} style={{background:"#FFF8F0",borderRadius:10,padding:"11px 14px",border:"1px solid rgba(193,127,74,0.25)",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>onNavigate("stash")}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:500,color:"#2C2420"}}>{e.strainName}</span>
          <span style={{fontSize:10,color:"#C17F4A",background:"rgba(193,127,74,0.12)",padding:"2px 8px",borderRadius:8}}>ready to try</span>
        </div>
        <span style={{fontSize:11,color:"#C17F4A",fontWeight:500}}>log session →</span>
      </div>))}
      {onHand.length===0&&coppedEntries.length===0&&<p style={{fontSize:13,color:"#9A8A78",fontStyle:"italic"}}>nothing on hand yet — log your first cop</p>}
    </div>

    <div style={{height:0.5,background:"#E0D8CE",margin:"20px 0"}}/>

    {/* last comparison */}
    {savedComparisons.length>0&&<div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
        <p style={{fontSize:10,fontWeight:500,color:"#9A8A78",letterSpacing:0.7,textTransform:"uppercase",margin:0}}>last comparison</p>
        <p onClick={()=>onNavigate("compare")} style={{fontSize:11,color:"#2C2420",cursor:"pointer",margin:0}}>compare →</p>
      </div>
      <div onClick={()=>onNavigate("compare")} style={{background:"#1E1828",borderRadius:14,padding:18,cursor:"pointer"}}>
        <p style={{fontSize:13,color:"#C4B8D8",margin:"0 0 2px"}}>{savedComparisons[0].a} vs {savedComparisons[0].b}</p>
        <p style={{fontSize:10,color:"#4A3E60",margin:0}}>{savedComparisons[0].date}</p>
      </div>
    </div>}

    {/* saved tips */}
    {savedTips.length>0&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
        <p style={{fontSize:10,fontWeight:500,color:"#9A8A78",letterSpacing:0.7,textTransform:"uppercase",margin:0}}>saved tips</p>
        <p onClick={()=>onNavigate("recommender")} style={{fontSize:11,color:"#2C2420",cursor:"pointer",margin:0}}>recommender →</p>
      </div>
      <div style={{background:"#1A1F2E",borderRadius:14,padding:16}}>
        {savedTips.slice(0,3).map((st,i)=><div key={st.id} style={{marginBottom:i<Math.min(savedTips.length,3)-1?10:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{fontSize:10,color:"#3A4460"}}>{st.intent==="asleep"?"🌙":st.intent==="awake"?"☀️":st.intent==="adventure"?"🏕️":"✦"}</span>
            <span style={{fontSize:9,color:"#3A4460"}}>{st.date}</span>
          </div>
          <p style={{fontSize:12,color:"#C4CCE0",margin:0,lineHeight:1.4}}>{st.tip}</p>
        </div>)}
        {savedTips.length>3&&<p style={{fontSize:10,color:"#3A4460",margin:"10px 0 0",cursor:"pointer"}} onClick={()=>onNavigate("recommender")}>+{savedTips.length-3} more</p>}
      </div>
    </div>}
    <div style={{textAlign:"center",marginTop:32}}>
      <button onClick={()=>setShowHelp(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#B8A898",fontFamily:"inherit",padding:"8px 16px",letterSpacing:0.3}}>? how cLOUD works</button>
    </div>
  </div></div>);
}

/* ═══════════════════════════════════════════
   STASH PAGE
   ═══════════════════════════════════════════ */
function StrainNameInput({initialValue,strains,legacyStrains,existingStrainId,onSelect,onBlur,onFocus,showSugg,setShowSugg}){
  const[nameInput,setNameInput]=useState(initialValue||"");
  const nameSuggs=nameInput.length>0?strains.filter(s=>s.name.toLowerCase().includes(nameInput.toLowerCase())):[];
  const legacySuggs=nameInput.length>0?legacyStrains.filter(l=>l.name.toLowerCase().includes(nameInput.toLowerCase())&&!nameSuggs.some(s=>s.name.toLowerCase()===l.name.toLowerCase())):[];
  const getLatestCop=s=>s.cops[s.cops.length-1];
  return(
    <div style={{position:"relative"}}>
      <input value={nameInput} onChange={e=>{setNameInput(e.target.value);setShowSugg(true);}} onBlur={e=>onBlur(e.target.value)} onFocus={()=>{setShowSugg(true);if(onFocus)onFocus();}} placeholder="enter strain name..." style={{width:"100%",boxSizing:"border-box",background:"rgba(240,235,225,0.06)",borderRadius:8,padding:"10px 14px",fontSize:15,color:"#F0EBE1",border:"0.5px solid rgba(240,235,225,0.1)",fontFamily:"inherit",outline:"none",marginBottom:existingStrainId?4:20}}/>
      {showSugg&&(nameSuggs.length>0||legacySuggs.length>0)&&!existingStrainId&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#2C2420",border:"0.5px solid rgba(240,235,225,0.15)",borderRadius:8,marginTop:2,maxHeight:160,overflowY:"auto"}}>
        {nameSuggs.map(s=><button key={s.id} onClick={()=>{setNameInput(s.name);onSelect(s);setShowSugg(false);}} style={{display:"flex",width:"100%",padding:"10px 14px",fontSize:13,color:"#F0EBE1",background:"transparent",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",alignItems:"center",gap:8}}><div style={{width:4,height:24,borderRadius:2,background:typeColor(getLatestCop(s).type)}}/><span style={{fontWeight:500}}>{s.name}</span><span style={{fontSize:11,color:"rgba(240,235,225,0.4)"}}>{s.cops.length} cop{s.cops.length>1?"s":""}</span></button>)}
        {legacySuggs.map(l=><button key={l.id} onClick={()=>{setNameInput(l.name);onSelect({legacy:true,...l});setShowSugg(false);}} style={{display:"flex",width:"100%",padding:"10px 14px",fontSize:13,color:"#F0EBE1",background:"transparent",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",alignItems:"center",gap:8}}><div style={{width:4,height:24,borderRadius:2,background:l.type?typeColor(l.type):"#4A3E38"}}/><span style={{fontWeight:500}}>{l.name}</span><span style={{fontSize:11,color:"rgba(240,235,225,0.4)"}}>legacy</span></button>)}
      </div>}
    </div>
  );
}

function StashPage({strains,coppedEntries,onHand,mixQueue,reups,finishedReups,
  view,setView,cop,setCop,session,setSession,editEntry,setEditEntry,
  activeReupId,setActiveReupId,mixSess,setMixSess,
  finishingCop,finishCopAgain,setFinishCopAgain,
  handleSaveCop,handleSaveLiteCop,handleSaveSession,handleMarkDone,handleConfirmDone,
  handleReviewMix,handleSaveMixReview,
  setCoppedIntent,setCoppedAmount,setFinishingCop,
  openDetail,openDetailTab,reset,showSugg,setShowSugg,legacyStrains,handleAddReup,handleDeleteReup,confirmDeleteItem,
  handleInlineNote,handleInlineExperience,onAddMixQueue}){

  const getLatestCop=s=>s.cops[s.cops.length-1];
  const isNeverAgain=s=>s.cops.some(c=>c.session?.copAgain==="Never again");
  const fmtSource=s=>s==="TL"?"TL":s?.toLowerCase();
  const nameSuggs=[];
  const legacySuggs=[];

  const handleSelectExisting=strain=>{setCop({...cop,name:strain.name,type:getLatestCop(strain).type||"",lean:getLatestCop(strain).lean||"",parent1:strain.parents?.[0]||"",parent2:strain.parents?.[1]||"",existingStrainId:strain.id});setNameInput(strain.name);setShowSugg(false);};

  const[inlineCard,setInlineCard]=useState(null);
  const[inlineText,setInlineText]=useState("");
  const[inlineMixWith,setInlineMixWith]=useState("");
  const[expSheet,setExpSheet]=useState(null);
  const[mixReviewSheet,setMixReviewSheet]=useState(false);
  const closeInline=()=>{setInlineCard(null);setInlineText("");setInlineMixWith("");};

  const activeReup=reups.find(r=>r.id===activeReupId);
  const isLite=!!activeReup?.lite;
  const liteAdded=isLite?strains.flatMap(s=>s.cops.filter(c=>(activeReup.copIds||[]).includes(c.id)).map(()=>s.name)):[];

  const mismatch=editEntry&&session.smokesLike&&editEntry.type&&(()=>{
    const label=editEntry.lean?`${editEntry.lean.toLowerCase()} ${editEntry.type.toLowerCase()}`:editEntry.type.toLowerCase();
    if(editEntry.type==="Hybrid"&&session.smokesLike!=="Hybrid")return`labeled ${label} but smokes like ${session.smokesLike.toLowerCase()}`;
    if(editEntry.type!=="Hybrid"&&session.smokesLike!==editEntry.type)return`labeled ${label} but smokes like ${session.smokesLike.toLowerCase()}`;
    return null;
  })();

  const Wrapper=({children})=>(<div style={{minHeight:"100vh",position:"relative"}}><div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,height:"100vh",zIndex:0,backgroundImage:`url(${STASH_BG})`,backgroundSize:"280%",backgroundPosition:"60% 40%",backgroundRepeat:"no-repeat",backgroundColor:"#0E1A08"}}><div style={{position:"absolute",inset:0,background:"rgba(18,34,10,0.35)"}}/></div><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto",position:"relative",zIndex:1}}>{children}</div></div>);
  const GlassCard=({children,style:s,...rest})=>(<div style={{background:"rgba(240,235,225,0.08)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:12,padding:16,border:"0.5px solid rgba(240,235,225,0.12)",...s}} {...rest}>{children}</div>);
  const SolidCard=({children,style:s,...rest})=>(<div style={{background:"#2A3A22",borderRadius:12,padding:16,border:"0.5px solid rgba(240,235,225,0.1)",...s}} {...rest}>{children}</div>);
  const StashLabel=({children})=>(<p style={{fontSize:12,fontWeight:500,color:"#D4CAAC",letterSpacing:0.5,margin:"0 0 10px"}}>{children}</p>);

  // ═══ RE-UP PICKER ═══
  if(view==="reupPicker")return(<Wrapper>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}><BackBtn onClick={()=>{setActiveReupId(null);setView(null);}}/><div><h2 style={{fontSize:20,fontWeight:500,margin:0,color:"#F0EBE1"}}>which re-up?</h2><p style={{fontSize:12,color:"rgba(240,235,225,0.5)",margin:"2px 0 0"}}>add this cop to a haul</p></div></div>
    <GlassCard>
      {reups.filter(r=>!r.closed).length>0&&<>{reups.filter(r=>!r.closed).map(r=>{
        const cops=strains.flatMap(s=>s.cops.filter(c=>r.copIds.includes(c.id)).map(c=>({...c,strain:s})));
        const copped=coppedEntries.filter(c=>r.coppedIds?.includes(c.id));
        const total=cops.length+copped.length;
        return(<div key={r.id} style={{display:"block",width:"100%",textAlign:"left",background:"rgba(240,235,225,0.06)",borderRadius:10,padding:14,marginBottom:8,border:"0.5px solid rgba(240,235,225,0.1)",fontFamily:"inherit"}}>
          <button onClick={()=>{setActiveReupId(r.id);setView("cop");}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:14,fontWeight:500,color:"#F0EBE1"}}>re-up #{r.number||"?"} · {r.date}{r.lite&&<span style={{fontSize:9,marginLeft:6,padding:"2px 7px",borderRadius:8,background:"rgba(240,235,225,0.12)",color:"rgba(240,235,225,0.55)",fontWeight:400,letterSpacing:0.3}}>lite 🌬️</span>}</span>
              <span style={{fontSize:11,color:"rgba(240,235,225,0.5)"}}>{total} strain{total!==1?"s":""}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {cops.map(c=><span key={c.id} style={{fontSize:10,background:"rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.7)",padding:"2px 6px",borderRadius:6}}>{c.strain.name}</span>)}
              {copped.map(c=><span key={c.id} style={{fontSize:10,background:"rgba(193,127,74,0.2)",color:"#C17F4A",padding:"2px 6px",borderRadius:6}}>{c.strainName}</span>)}
            </div>
          </button>
          {total===0&&<button onClick={()=>handleDeleteReup(r.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#C15A4A",fontFamily:"inherit",padding:0,marginTop:8}}>{confirmDeleteItem==="reup-"+r.id?"confirm delete?":"delete empty re-up"}</button>}
        </div>);
      })}</>}
      {reups.filter(r=>!r.closed).length<2&&<><button onClick={()=>{const newId="r"+Date.now();const newReup={id:newId,...stamp(),closed:false,copIds:[],coppedIds:[]};handleAddReup(newReup);setActiveReupId(newId);setView("cop");}} style={{width:"100%",padding:12,borderRadius:10,fontSize:13,fontWeight:500,background:P.terracotta,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit",marginTop:reups.filter(r=>!r.closed).length>0?8:0}}>+ start a new re-up</button>
      <button onClick={()=>{const newId="r"+Date.now();const newReup={id:newId,...stamp(),closed:false,copIds:[],coppedIds:[],lite:true};handleAddReup(newReup);setActiveReupId(newId);setView("cop");}} style={{width:"100%",padding:12,borderRadius:10,fontSize:13,fontWeight:500,background:"transparent",color:"rgba(240,235,225,0.65)",border:"0.5px solid rgba(240,235,225,0.18)",cursor:"pointer",fontFamily:"inherit",marginTop:8}}>+ start a lite re-up</button>
      <p style={{fontSize:10,color:"rgba(240,235,225,0.35)",margin:"6px 0 0",textAlign:"center",lineHeight:1.4}}>skips the first sesh — for what you're already smoking 🌿</p></>}
      {reups.filter(r=>!r.closed).length>=2&&<p style={{fontSize:11,color:"rgba(240,235,225,0.4)",margin:"8px 0 0",fontStyle:"italic",textAlign:"center"}}>you can have up to 2 open re-ups at a time</p>}
    </GlassCard>
  </Wrapper>);

  // ═══ COP FORM (V2: intent + amount at top) ═══
  if(view==="cop")return(<Wrapper>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}><BackBtn onClick={()=>{reset("cop");setActiveReupId(null);setView(null);}}/><div><h2 style={{fontSize:20,fontWeight:500,margin:0,color:"#F0EBE1"}}>{isLite?"lite cop":"new cop"}</h2><p style={{fontSize:12,color:"rgba(240,235,225,0.5)",margin:"2px 0 0"}}>{isLite?"no first sesh — goes straight to the stash 🌿":"log what you just picked up"}</p></div></div>
    {isLite&&liteAdded.length>0&&<GlassCard style={{marginBottom:12,padding:"10px 14px"}}>
      <p style={{fontSize:11,color:"rgba(240,235,225,0.5)",margin:"0 0 6px"}}>already in re-up #{activeReup?.number||"?"} ✅</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{liteAdded.map((n,i)=><span key={i} style={{fontSize:10,background:"rgba(91,138,114,0.25)",color:"#9CC4A8",padding:"2px 8px",borderRadius:8}}>{n}</span>)}</div>
    </GlassCard>}
    <GlassCard>
      {isLite&&<><label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>when'd you cop this? 📅</label>
      <input type="date" value={cop.copDate||todayIso()} max={todayIso()} onChange={e=>setCop({...cop,copDate:e.target.value})} style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"rgba(240,235,225,0.06)",color:"#F0EBE1",border:"0.5px solid rgba(240,235,225,0.12)",outline:"none",marginBottom:6}}/>
      <p style={{fontSize:10,color:"rgba(240,235,225,0.35)",margin:"0 0 20px",lineHeight:1.4}}>backdate it to when you actually picked it up</p></>}

      {/* V2: intent at top */}
      <label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>what's it for?</label>
      <div style={{display:"flex",gap:6,marginBottom:20}}>{["awake","asleep","adventure"].map(i=><button key={i} onClick={()=>setCop({...cop,intent:cop.intent===i?"":i})} style={{flex:1,padding:"10px 8px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:cop.intent===i?500:400,background:cop.intent===i?(intentBadge(i)?.bg||P.bg):"rgba(240,235,225,0.06)",color:cop.intent===i?(intentBadge(i)?.color||P.cream):"rgba(240,235,225,0.5)",border:cop.intent===i?"none":"0.5px solid rgba(240,235,225,0.1)"}}>{i==="asleep"?"🌙 asleep":i==="awake"?"☀️ awake":"🏕️ adventure"}</button>)}</div>
      {/* V2: amount at top */}
      <label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>amount</label>
      <div style={{display:"flex",gap:6,marginBottom:20}}>{["8th","quarter","half","oz"].map(a=><button key={a} onClick={()=>setCop({...cop,amount:cop.amount===a?"":a})} style={{flex:1,padding:"10px 8px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:cop.amount===a?500:400,background:cop.amount===a?P.sage:"rgba(240,235,225,0.06)",color:cop.amount===a?P.cream:"rgba(240,235,225,0.5)",border:cop.amount===a?"none":"0.5px solid rgba(240,235,225,0.1)"}}>{a}</button>)}</div>
      <div style={{borderTop:"0.5px solid rgba(240,235,225,0.1)",paddingTop:16,marginBottom:0}}/>
      <label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>strain name</label>
      <StrainNameInput
        initialValue={cop.name}
        strains={strains}
        legacyStrains={legacyStrains}
        existingStrainId={cop.existingStrainId}
        showSugg={showSugg}
        setShowSugg={setShowSugg}
        onBlur={name=>setCop({...cop,name,existingStrainId:null})}
        onSelect={s=>{
          if(s.legacy){setCop({...cop,name:s.name,type:s.type||cop.type});}
          else{const lc=s.cops[s.cops.length-1];setCop({...cop,name:s.name,type:lc.type||"",lean:lc.lean||"",parent1:s.parents?.[0]||"",parent2:s.parents?.[1]||"",existingStrainId:s.id});}
        }}
      />
      {cop.existingStrainId&&<p style={{fontSize:11,color:P.sage,margin:"0 0 16px"}}>✓ new cop of existing strain</p>}
      <label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>type</label>
      <ToggleGroup options={["Sativa","Indica","Hybrid"]} value={cop.type} onChange={v=>setCop({...cop,type:v,lean:""})}/>
      {cop.type==="Hybrid"&&<SubToggle options={["Sativa-lean","Indica-lean","Balanced"]} value={cop.lean} onChange={v=>setCop({...cop,lean:v})}/>}<div style={{marginBottom:20}}/>
      <label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>source</label>
      <ToggleGroup options={["TL","Dispensary"]} value={cop.source} onChange={v=>setCop({...cop,source:v,container:"",brand:""})}/>
      {cop.source==="Dispensary"&&<><SubToggle options={["Bag","Jar"]} value={cop.container} onChange={v=>setCop({...cop,container:v})} color={P.terracotta} label="packaging:"/>
        <SubToggle options={["Indoor grown","Greenhouse grown","Outdoor grown"]} value={cop.growType} onChange={v=>setCop({...cop,growType:v})} color={P.sage} label="grow type:"/>
        <div style={{marginTop:10}}><label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>brand <span style={{fontWeight:400,fontStyle:"italic"}}>(optional)</span></label>
        <input defaultValue={cop.brand} onBlur={e=>setCop({...cop,brand:e.target.value})} placeholder="e.g. cookies, jungle boys..." style={{width:"100%",boxSizing:"border-box",background:"rgba(240,235,225,0.06)",borderRadius:8,padding:"10px 14px",fontSize:14,color:"#F0EBE1",border:"0.5px solid rgba(240,235,225,0.1)",fontFamily:"inherit",outline:"none"}}/></div>
      </>}<div style={{marginBottom:20}}/>
      <label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>terpenes</label>
      <TerpeneSelector selected={cop.terpenes} onChange={t=>setCop({...cop,terpenes:t})}/><div style={{marginBottom:20}}/>
      {!cop.existingStrainId&&<><label style={{fontSize:12,fontWeight:500,color:"rgba(240,235,225,0.5)",display:"block",marginBottom:6}}>parent strains <span style={{fontWeight:400,fontStyle:"italic"}}>(optional)</span></label>
        {!cop.unknownLineage&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input defaultValue={cop.parent1} onBlur={e=>setCop({...cop,parent1:e.target.value})} placeholder="parent 1" style={{flex:1,background:"rgba(240,235,225,0.06)",borderRadius:8,padding:"10px 14px",fontSize:14,color:"#F0EBE1",border:"0.5px solid rgba(240,235,225,0.1)",fontFamily:"inherit",outline:"none"}}/>
              <button onClick={()=>setCop({...cop,parent1:cop.parent1==="unknown"?"":"unknown"})} style={{fontSize:10,padding:"4px 8px",borderRadius:8,background:cop.parent1==="unknown"?"rgba(240,235,225,0.15)":"transparent",color:cop.parent1==="unknown"?"#F0EBE1":"rgba(240,235,225,0.4)",border:"0.5px solid rgba(240,235,225,0.15)",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>unknown</button>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input defaultValue={cop.parent2} onBlur={e=>setCop({...cop,parent2:e.target.value})} placeholder="parent 2" style={{flex:1,background:"rgba(240,235,225,0.06)",borderRadius:8,padding:"10px 14px",fontSize:14,color:"#F0EBE1",border:"0.5px solid rgba(240,235,225,0.1)",fontFamily:"inherit",outline:"none"}}/>
              <button onClick={()=>setCop({...cop,parent2:cop.parent2==="unknown"?"":"unknown"})} style={{fontSize:10,padding:"4px 8px",borderRadius:8,background:cop.parent2==="unknown"?"rgba(240,235,225,0.15)":"transparent",color:cop.parent2==="unknown"?"#F0EBE1":"rgba(240,235,225,0.4)",border:"0.5px solid rgba(240,235,225,0.15)",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>unknown</button>
            </div>
          </div>}
        <button onClick={()=>setCop({...cop,unknownLineage:!cop.unknownLineage,parent1:"",parent2:""})} style={{fontSize:11,padding:"4px 12px",borderRadius:8,background:cop.unknownLineage?"rgba(240,235,225,0.15)":"transparent",color:cop.unknownLineage?"#F0EBE1":"rgba(240,235,225,0.4)",border:"0.5px solid rgba(240,235,225,0.15)",cursor:"pointer",fontFamily:"inherit",marginBottom:20}}>unknown lineage{cop.unknownLineage?" ✓":""}</button>
      </>}
      <button onClick={isLite?handleSaveLiteCop:handleSaveCop} style={{width:"100%",padding:14,borderRadius:10,fontSize:15,fontWeight:500,background:P.terracotta,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit"}}>{isLite?"add to lite re-up":"save cop"}</button>
      {isLite&&<button onClick={()=>{reset("cop");setActiveReupId(null);setView(null);}} style={{width:"100%",padding:12,borderRadius:10,fontSize:13,marginTop:8,background:"transparent",color:"rgba(240,235,225,0.5)",border:"0.5px solid rgba(240,235,225,0.15)",cursor:"pointer",fontFamily:"inherit"}}>done adding 🤙🏾</button>}
    </GlassCard>
  </Wrapper>);

  // ═══ SESSION FORM ═══
  if(view==="session"&&editEntry)return(<Wrapper>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><BackBtn onClick={()=>{reset("session");setEditEntry(null);setView(null);}}/><div><h2 style={{fontSize:20,fontWeight:500,margin:0,color:"#F0EBE1"}}>{editEntry.strainName}</h2><p style={{fontSize:12,color:"rgba(240,235,225,0.5)",margin:"2px 0 0"}}>{[editEntry.type?.toLowerCase(),editEntry.lean?.toLowerCase(),fmtSource(editEntry.source),editEntry.date].filter(Boolean).join(" · ")}</p></div></div>
    {editEntry.terpenes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:20}}>{editEntry.terpenes.map(t=><span key={t} style={{fontSize:11,background:P.sage,color:P.cream,padding:"3px 10px",borderRadius:10}}>{t.toLowerCase()}</span>)}</div>}
    <div style={{background:P.card,borderRadius:12,padding:20,border:`0.5px solid ${P.border}`}}>
      <p style={{fontSize:14,fontWeight:500,color:P.text,margin:"0 0 20px"}}>first session — how'd it hit on its own?</p>
      <div style={{textAlign:"center",marginBottom:20,paddingBottom:16,borderBottom:`0.5px solid ${P.border}`}}><p style={{fontSize:12,color:P.textMuted,margin:"0 0 8px"}}>overall vibe</p><div style={{display:"flex",justifyContent:"center",gap:6}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setSession({...session,rating:n})} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Leaf filled={n<=session.rating}/></button>)}</div>{session.rating>0&&<p style={{fontSize:11,color:P.sage,margin:"6px 0 0",fontWeight:500}}>{session.rating} / 5</p>}</div>
      <SectionLabel>setting</SectionLabel>
      <ToggleGroup options={["indoor","outdoor"]} value={session.setting} onChange={v=>setSession({...session,setting:v,bedtime:v==="outdoor"?false:session.bedtime})} color={P.onHand}/>
      {session.setting==="indoor"&&<button onClick={()=>setSession({...session,bedtime:!session.bedtime})} style={{display:"flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",background:session.bedtime?"#2C2C4A":"transparent",color:session.bedtime?"#C9B8F0":P.textMuted,border:session.bedtime?"none":`0.5px solid ${P.border}`}}>🌙 bedtime blunt{session.bedtime&&" ✓"}</button>}
      <div style={{marginBottom:20}}/>
      <SectionLabel>smokes like</SectionLabel>
      <ToggleGroup options={["Sativa","Indica","Hybrid"]} value={session.smokesLike} onChange={v=>setSession({...session,smokesLike:v,smokesLikeLean:""})} color={P.terracotta}/>
      {session.smokesLike==="Hybrid"&&<SubToggle options={["Sativa-lean","Indica-lean","Balanced"]} value={session.smokesLikeLean} onChange={v=>setSession({...session,smokesLikeLean:v})} color={P.terracotta}/>}
      {mismatch&&<div style={{background:P.terracottaLight,borderRadius:8,padding:"8px 12px",marginTop:8,display:"flex",alignItems:"center",gap:6}}><span>👀</span><p style={{fontSize:11,color:"#9A6530",margin:0}}>{mismatch}</p></div>}<div style={{marginBottom:20}}/>
      <SectionLabel>the spectrums</SectionLabel>
      <SpectrumSlider left="Couch-locked" right="Active" value={session.sw} onChange={v=>setSession({...session,sw:v})}/>
      <SpectrumSlider left="Dreamy" right="Analytical" value={session.sf} onChange={v=>setSession({...session,sf:v})} color={P.sage}/>
      <div style={{borderTop:`0.5px solid ${P.border}`,paddingTop:16,marginBottom:16}}><SectionLabel>the smoke</SectionLabel><SpectrumSlider left="Smooth" right="Harsh" value={session.pull} onChange={v=>setSession({...session,pull:v})} color={P.sage}/></div>
      <div style={{borderTop:`0.5px solid ${P.border}`,paddingTop:16,marginBottom:16}}><p style={{fontSize:13,fontWeight:500,color:P.text,margin:"0 0 10px"}}>vibe + taste tags</p><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={[...session.vibeTags,...session.tasteTags]} onChange={v=>{const tasteSet=new Set(VIBE_CATEGORIES["👅"]);setSession({...session,vibeTags:v.filter(t=>!tasteSet.has(t)),tasteTags:v.filter(t=>tasteSet.has(t))});}} /></div>
      <div style={{borderTop:`0.5px solid ${P.border}`,paddingTop:16,marginBottom:16}}><p style={{fontSize:13,fontWeight:500,color:P.text,margin:"0 0 8px"}}>session notes <span style={{fontWeight:400,color:P.textMuted,fontStyle:"italic"}}>(optional)</span></p><textarea defaultValue={session.notes} onBlur={e=>setSession({...session,notes:e.target.value})} placeholder="anything else worth noting..." rows={2} style={{width:"100%",boxSizing:"border-box",background:P.bg,borderRadius:8,padding:"10px 14px",fontSize:14,color:P.text,border:`0.5px solid ${P.border}`,fontFamily:"inherit",outline:"none",resize:"vertical"}}/></div>
      <div style={{borderTop:`0.5px solid ${P.border}`,paddingTop:16,marginBottom:20}}><p style={{fontSize:13,fontWeight:500,color:P.text,margin:"0 0 10px"}}>would i cop again?</p><div style={{display:"flex",gap:6}}>{["Yes","Maybe","No","Never again"].map(o=><button key={o} onClick={()=>setSession({...session,copAgain:o})} style={{flex:1,padding:"10px 4px",borderRadius:8,fontSize:o==="Never again"?10:13,fontFamily:"inherit",cursor:"pointer",fontWeight:session.copAgain===o?500:400,background:session.copAgain===o?copAgainColor(o):P.bg,color:session.copAgain===o?P.cream:P.textMuted,border:session.copAgain===o?"none":`0.5px solid ${P.border}`,transition:"all 0.15s"}}>{o.toLowerCase()}</button>)}</div></div>
      <button onClick={handleSaveSession} style={{width:"100%",padding:14,borderRadius:10,fontSize:15,fontWeight:500,background:P.terracotta,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit"}}>save first session</button>
    </div>
  </Wrapper>);

  // ═══ MIX REVIEW ═══
  if(view==="reviewMix"&&editEntry){setView(null);setMixReviewSheet(true);}

  // ═══ MAIN STASH VIEW ═══
  return(<Wrapper>
    <GlassCard style={{marginTop:20,marginBottom:24,textAlign:"center",padding:"24px 20px"}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:400,color:"#F0EBE1",marginBottom:4,marginTop:0}}>stash</h1>
      <p style={{fontSize:11,color:"rgba(240,235,225,0.5)",marginBottom:16}}>
        {coppedEntries.length} ready to try · {onHand.length} on hand{mixQueue.length>0?` · ${mixQueue.length} mix${mixQueue.length!==1?"es":""} to review`:""}
      </p>
      <button onClick={()=>setView("reupPicker")} style={{width:"100%",padding:14,borderRadius:12,fontSize:14,fontWeight:500,fontFamily:"inherit",cursor:"pointer",background:"rgba(240,235,225,0.12)",color:"#F0EBE1",border:"0.5px solid rgba(240,235,225,0.15)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>+ log a new cop</button>
    </GlassCard>

    {/* Mix queue */}
    {mixQueue.length>0&&<><StashLabel>needs review</StashLabel>{mixQueue.map(q=><SolidCard key={q.id} style={{marginBottom:8,border:"1.5px dashed rgba(139,109,139,0.4)"}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:500,color:"#F0EBE1"}}>{q.primaryStrain}</span>
        <span style={{fontSize:11,color:"rgba(240,235,225,0.4)"}}>x</span>
        <span style={{fontSize:13,fontWeight:500,color:"#F0EBE1"}}>{q.withStrain}</span>
        <span style={{fontSize:10,background:P.plum,color:P.cream,padding:"2px 8px",borderRadius:10,marginLeft:"auto"}}>mix</span>
      </div>
      <button onClick={()=>{setEditEntry(q);setMixReviewSheet(true);}} style={{width:"100%",padding:10,borderRadius:8,fontSize:13,fontWeight:500,background:P.plum,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit"}}>review this mix</button>
    </SolidCard>)}<div style={{margin:"16px 0",borderTop:"0.5px solid rgba(240,235,225,0.08)"}}/></>}

    {/* Ready to try */}
    {coppedEntries.length>0&&<><StashLabel>ready to try</StashLabel>{coppedEntries.map(e=><SolidCard key={e.id} style={{marginBottom:8,border:"1.5px dashed rgba(193,127,74,0.3)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><TypeBadge type={e.type}/><p style={{fontWeight:500,fontSize:15,margin:0,color:"#F0EBE1"}}>{e.strainName}</p><span style={{fontSize:10,background:P.terracotta,color:P.cream,padding:"2px 8px",borderRadius:10,fontWeight:500}}>copped</span>{e.strainId&&<span style={{fontSize:10,color:P.sage}}>re-cop</span>}{e.intent&&<IntentBadge intent={e.intent}/>}{e.amount&&<span style={{fontSize:10,color:"rgba(240,235,225,0.5)"}}>{e.amount}</span>}</div>
      <p style={{fontSize:12,color:"rgba(240,235,225,0.5)",margin:"2px 0 6px"}}>{[e.type?.toLowerCase(),e.lean?.toLowerCase(),e.source==="TL"?"TL":e.source?.toLowerCase(),e.date].filter(Boolean).join(" · ")}</p>
      {e.terpenes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:6}}>{e.terpenes.map(t=><span key={t} style={{fontSize:10,background:"rgba(107,127,90,0.2)",color:P.sage,padding:"2px 6px",borderRadius:8}}>{t.toLowerCase()}</span>)}</div>}
      {!e.intent&&<div style={{display:"flex",gap:4,marginBottom:8}}>{["asleep","awake","adventure"].map(i=><button key={i} onClick={()=>setCoppedIntent(e.id,i)} style={{fontSize:10,padding:"3px 9px",borderRadius:8,border:"0.5px solid rgba(240,235,225,0.15)",background:"rgba(240,235,225,0.06)",color:"rgba(240,235,225,0.5)",cursor:"pointer",fontFamily:"inherit"}}>{i==="asleep"?"🌙":i==="awake"?"☀️":"🏕️"} {i}</button>)}</div>}
      {!e.amount&&<div style={{display:"flex",gap:4,marginBottom:8}}>{["8th","quarter","half","oz"].map(a=><button key={a} onClick={()=>setCoppedAmount(e.id,a)} style={{fontSize:10,padding:"3px 9px",borderRadius:8,border:"0.5px solid rgba(240,235,225,0.15)",background:"rgba(240,235,225,0.06)",color:"rgba(240,235,225,0.5)",cursor:"pointer",fontFamily:"inherit"}}>{a}</button>)}</div>}
      <button onClick={()=>{setEditEntry(e);setView("session");}} style={{width:"100%",padding:10,borderRadius:8,fontSize:13,fontWeight:500,background:P.terracotta,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit"}}>log first session</button>
    </SolidCard>)}<div style={{margin:"16px 0",borderTop:"0.5px solid rgba(240,235,225,0.08)"}}/></>}

    {/* On hand */}
    {onHand.length>0&&<><StashLabel>on hand</StashLabel>{onHand.map(o=>{const s=strains.find(ss=>ss.id===o.strainId);const intent=s?.intent;return(<SolidCard key={o.copId} style={{marginBottom:8,border:`1px solid rgba(91,138,114,0.3)`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><TypeBadge type={o.type}/><button onClick={()=>openDetail(s,undefined,"stash")} style={{fontWeight:500,fontSize:15,margin:0,color:"#F0EBE1",background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>{o.strainName}</button><span style={{fontSize:10,background:P.onHand,color:P.cream,padding:"2px 8px",borderRadius:10,fontWeight:500}}>on hand</span>{o.lite&&<span style={{fontSize:10,background:"rgba(240,235,225,0.12)",color:"rgba(240,235,225,0.55)",padding:"2px 8px",borderRadius:10}}>lite 🌬️</span>}{intent&&<IntentBadge intent={intent}/>}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:8}}>{o.terpenes?.map(t=><span key={t} style={{fontSize:10,background:"rgba(107,127,90,0.2)",color:P.sage,padding:"2px 6px",borderRadius:8}}>{t.toLowerCase()}</span>)}</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {["note","mix"].map(mode=>s&&<button key={mode} onClick={()=>inlineCard?.copId===o.copId&&inlineCard?.mode===mode?closeInline():setInlineCard({copId:o.copId,mode})} style={{flex:1,padding:8,borderRadius:8,fontSize:11,background:inlineCard?.copId===o.copId&&inlineCard?.mode===mode?"rgba(240,235,225,0.14)":"rgba(240,235,225,0.06)",color:inlineCard?.copId===o.copId&&inlineCard?.mode===mode?"#F0EBE1":"rgba(240,235,225,0.5)",border:"0.5px solid rgba(240,235,225,0.1)",cursor:"pointer",fontFamily:"inherit"}}>{mode}</button>)}
        {s&&<button onClick={()=>setExpSheet({strain:s,copId:o.copId})} style={{flex:1,padding:8,borderRadius:8,fontSize:11,background:"rgba(240,235,225,0.06)",color:"rgba(240,235,225,0.5)",border:"0.5px solid rgba(240,235,225,0.1)",cursor:"pointer",fontFamily:"inherit"}}>experience</button>}
        <button onClick={()=>handleMarkDone(o)} style={{flex:1,padding:8,borderRadius:8,fontSize:11,background:"rgba(240,235,225,0.06)",color:"rgba(240,235,225,0.5)",border:"none",cursor:"pointer",fontFamily:"inherit"}}>finished ✓</button>
      </div>
      {inlineCard?.copId===o.copId&&inlineCard?.mode==="note"&&<div style={{marginTop:10,paddingTop:10,borderTop:"0.5px solid rgba(240,235,225,0.08)"}}>
        <textarea defaultValue={inlineText} onBlur={e=>setInlineText(e.target.value)} placeholder="add a note..." rows={3} style={{width:"100%",background:"rgba(240,235,225,0.06)",border:"0.5px solid rgba(240,235,225,0.12)",borderRadius:8,padding:10,fontSize:13,color:"#F0EBE1",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        <div style={{display:"flex",gap:6,marginTop:6}}>
          <button onClick={closeInline} style={{flex:1,padding:8,borderRadius:8,fontSize:12,background:"transparent",color:"rgba(240,235,225,0.4)",border:"0.5px solid rgba(240,235,225,0.1)",cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
          <button onClick={()=>{if(inlineText.trim()&&s){handleInlineNote(s.id,o.copId,inlineText);closeInline();}}} style={{flex:2,padding:8,borderRadius:8,fontSize:12,fontWeight:500,background:P.sage,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit"}}>save note</button>
        </div>
      </div>}
      {inlineCard?.copId===o.copId&&inlineCard?.mode==="mix"&&<div style={{marginTop:10,paddingTop:10,borderTop:"0.5px solid rgba(240,235,225,0.08)"}}>
        <p style={{fontSize:11,color:"rgba(240,235,225,0.5)",margin:"0 0 8px"}}>mix {o.strainName} with...</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
          {onHand.filter(x=>x.copId!==o.copId).map(x=><button key={x.copId} onClick={()=>setInlineMixWith(x.strainName)} style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:inlineMixWith===x.strainName?"rgba(139,109,139,0.4)":"rgba(240,235,225,0.06)",color:inlineMixWith===x.strainName?"#F0EBE1":"rgba(240,235,225,0.5)",border:`0.5px solid ${inlineMixWith===x.strainName?"rgba(139,109,139,0.6)":"rgba(240,235,225,0.1)"}`,cursor:"pointer",fontFamily:"inherit"}}>{x.strainName}</button>)}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={closeInline} style={{flex:1,padding:8,borderRadius:8,fontSize:12,background:"transparent",color:"rgba(240,235,225,0.4)",border:"0.5px solid rgba(240,235,225,0.1)",cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
          <button onClick={()=>{if(inlineMixWith&&s){const withEntry=onHand.find(x=>x.strainName===inlineMixWith);if(withEntry){const me={id:Date.now(),primaryStrain:s.name,primaryStrainId:s.id,primaryType:s.cops[s.cops.length-1]?.type,withStrain:inlineMixWith,withStrainId:withEntry.strainId,withCopId:withEntry.copId,withType:withEntry.type,combinedTerpenes:[...new Set([...(s.cops[s.cops.length-1]?.terpenes||[]),...(withEntry.terpenes||[])])],combinedTaste:[],sharedId:Date.now(),status:"pending",date:today()};onAddMixQueue(s.id,o.copId,me);}closeInline();}}} style={{flex:2,padding:8,borderRadius:8,fontSize:12,fontWeight:500,background:P.plum,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit",opacity:inlineMixWith?1:0.4}}>add to mix queue</button>
        </div>
      </div>}
      {finishingCop?.copId===o.copId&&<div style={{marginTop:10,paddingTop:10,borderTop:"0.5px solid rgba(240,235,225,0.1)"}}>
        <p style={{fontSize:12,fontWeight:500,color:"#F0EBE1",margin:"0 0 8px"}}>would you still cop again?</p>
        <div style={{display:"flex",gap:5,marginBottom:10}}>{["Yes","Maybe","No","Never again"].map(v=><button key={v} onClick={()=>setFinishCopAgain(v)} style={{flex:1,padding:"8px 2px",borderRadius:8,fontSize:v==="Never again"?10:12,fontFamily:"inherit",cursor:"pointer",fontWeight:finishCopAgain===v?500:400,background:finishCopAgain===v?copAgainColor(v):"rgba(240,235,225,0.06)",color:finishCopAgain===v?P.cream:"rgba(240,235,225,0.5)",border:finishCopAgain===v?"none":"0.5px solid rgba(240,235,225,0.12)"}}>{v.toLowerCase()}</button>)}</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{setFinishingCop(null);setFinishCopAgain("");}} style={{flex:1,padding:8,borderRadius:8,fontSize:12,background:"rgba(240,235,225,0.06)",color:"rgba(240,235,225,0.5)",border:"0.5px solid rgba(240,235,225,0.12)",cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
          <button onClick={handleConfirmDone} style={{flex:1,padding:8,borderRadius:8,fontSize:12,fontWeight:500,background:P.sage,color:P.cream,border:"none",cursor:"pointer",fontFamily:"inherit"}}>{finishCopAgain?"confirm":"keep original"}</button>
        </div>
      </div>}
    </SolidCard>);})}<div style={{margin:"16px 0",borderTop:"0.5px solid rgba(240,235,225,0.08)"}}/></>}

    {coppedEntries.length===0&&onHand.length===0&&mixQueue.length===0&&<SolidCard style={{textAlign:"center",marginBottom:20}}><p style={{fontSize:14,color:"rgba(240,235,225,0.5)",margin:0}}>nothing active — tap + to log a new cop</p></SolidCard>}

    {/* Finished re-ups */}
    {finishedReups.length>0&&<><StashLabel>finished re-ups</StashLabel>{[...finishedReups].sort((a,b)=>(b.number||0)-(a.number||0)).slice(0,5).map(r=><SolidCard key={r.id} style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:13,fontWeight:500,color:"#F0EBE1"}}>📦 re-up #{r.number||"?"} · {r.date}</span>
        <span style={{fontSize:10,color:"rgba(240,235,225,0.4)"}}>closed {r.closedDate}</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{r.strainNames?.map((n,i)=><span key={i} style={{fontSize:11,background:"rgba(240,235,225,0.08)",color:"rgba(240,235,225,0.6)",padding:"3px 8px",borderRadius:8}}>{n}</span>)}</div>
    </SolidCard>)}</>}
    {expSheet&&<ExperienceSheet strain={expSheet.strain} copId={expSheet.copId} onClose={()=>setExpSheet(null)} onSave={(text,setting,bedtime,vibes)=>handleInlineExperience(expSheet.strain.id,expSheet.copId,text,setting,bedtime,vibes)}/>}
    {mixReviewSheet&&editEntry&&<MixReviewSheet entry={editEntry} mixSess={mixSess} setMixSess={setMixSess} onClose={()=>{setMixReviewSheet(false);setEditEntry(null);}} onSave={()=>{handleSaveMixReview();setMixReviewSheet(false);}}/>}
  </Wrapper>);
}


/* ═══════════════════════════════════════════
   LIBRARY PAGE
   ═══════════════════════════════════════════ */
function LibraryPage({strains,legacyStrains,onOpenDetail,onPeek}){
  const[libSearch,setLibSearch]=useState("");
  const[copAgainFilter,setCopAgainFilter]=useState("");
  const[ratingFilter,setRatingFilter]=useState(0);
  const[libTab,setLibTab]=useState("strains");
  const[starredOnly,setStarredOnly]=useState(false);
  const[collapsedMonths,setCollapsedMonths]=useState({});
  const[expandedLegacy,setExpandedLegacy]=useState({});
  const toggleMonth=m=>setCollapsedMonths(prev=>({...prev,[m]:!prev[m]}));
  const toggleLegacy=id=>setExpandedLegacy(prev=>({...prev,[id]:!prev[id]}));
  const isNeverAgain=s=>s.cops.some(c=>c.session?.copAgain==="Never again");
  const getLatestCop=s=>s.cops[s.cops.length-1];
  const activeStrains=strains.filter(s=>{
    if(s.legacy)return false;
    if(starredOnly&&!s.starred)return false;
    const lc=s.cops[s.cops.length-1];const ls=lc?.session;
    if(copAgainFilter&&ls?.copAgain!==copAgainFilter)return false;
    if(ratingFilter&&(!ls||(ls.rating||0)<ratingFilter))return false;
    if(libSearch){const q=libSearch.toLowerCase();const haystack=[s.name,...(s.parents||[]),...(lc?.terpenes||[]),...(ls?.vibeTags||[]),...(ls?.tasteTags||[]),...(lc?.notes||[]).map(n=>n.text)].join(" ").toLowerCase();if(!haystack.includes(q))return false;}
    return true;
  });
  const monthGroups={};
  activeStrains.forEach(s=>{
    const lc=getLatestCop(s);if(!lc)return;
    const month=monthKeyOf(lc);
    if(!monthGroups[month])monthGroups[month]=[];
    monthGroups[month].push(s);
  });
  const monthOrder=sortMonthKeys(Object.keys(monthGroups));
  const allMixes=strains.flatMap(s=>s.cops.flatMap(c=>(c.mixes||[]).filter(m=>m.status==="reviewed").map(m=>({...m,strainName:s.name,strainId:s.id,copType:c.type}))));
  const uniqueMixes=[];const seenShared=new Set();
  allMixes.forEach(m=>{if(m.sharedId&&seenShared.has(m.sharedId))return;if(m.sharedId)seenShared.add(m.sharedId);uniqueMixes.push(m);});
  const D={bg:"#1A1410",card:"rgba(232,224,212,0.04)",border:"rgba(232,224,212,0.08)",text:"#E8E0D4",muted:"rgba(232,224,212,0.4)",amber:"#D4B888"};
  const legacyHasContent=l=>!!(l.notes||l.source||l.brand||l.container);

  return(<div style={{background:D.bg,minHeight:"100vh",color:D.text}}><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto"}}>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:400,marginBottom:4,marginTop:20}}>library</h1>
    <p style={{fontSize:11,color:D.muted,marginBottom:20}}>{strains.filter(s=>!s.legacy).length} strains · {uniqueMixes.length} mix{uniqueMixes.length!==1?"es":""} · {legacyStrains.length} legacy</p>
    <div style={{display:"flex",gap:6,marginBottom:20,alignItems:"center"}}>
      {["strains","mixes","legacy"].map(t=><button key={t} onClick={()=>setLibTab(t)} style={{padding:"8px 18px",borderRadius:20,fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:libTab===t?500:400,background:libTab===t?(t==="mixes"?"#8B6D8B":t==="legacy"?D.amber:"#E8E0D4"):"transparent",color:libTab===t?(t==="legacy"?"#1A1410":"#1A1410"):D.muted,border:libTab===t?"none":`0.5px solid ${D.border}`}}>{t}</button>)}
      <a href="https://leonnariley18-ui.github.io/the-cloud/" target="_blank" rel="noopener noreferrer" style={{marginLeft:"auto",padding:"8px 14px",borderRadius:20,fontSize:11,fontFamily:"inherit",cursor:"pointer",background:"transparent",color:D.muted,border:`0.5px solid ${D.border}`,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>V1 ↗</a>
    </div>
    {libTab==="strains"&&<>
      <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="search strains, terpenes, parents..." style={{width:"100%",boxSizing:"border-box",background:D.card,borderRadius:8,padding:"10px 14px",fontSize:13,color:D.text,border:`0.5px solid ${D.border}`,fontFamily:"inherit",outline:"none",marginBottom:10}}/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>
        <button onClick={()=>setStarredOnly(!starredOnly)} style={{padding:"5px 12px",borderRadius:20,fontSize:10,fontFamily:"inherit",cursor:"pointer",background:starredOnly?D.amber:"transparent",color:starredOnly?"#1A1410":D.muted,border:starredOnly?"none":`0.5px solid ${D.border}`}}>⭐ starred</button>
        {["Yes","Maybe","No","Never again"].map(ca=><button key={ca} onClick={()=>setCopAgainFilter(copAgainFilter===ca?"":ca)} style={{padding:"5px 10px",borderRadius:20,fontSize:10,fontFamily:"inherit",cursor:"pointer",background:copAgainFilter===ca?copAgainColor(ca):"transparent",color:copAgainFilter===ca?"#E8E0D4":D.muted,border:copAgainFilter===ca?"none":`0.5px solid ${D.border}`}}>{ca.toLowerCase()}</button>)}
        {[3,4,5].map(r=><button key={r} onClick={()=>setRatingFilter(ratingFilter===r?0:r)} style={{padding:"5px 10px",borderRadius:20,fontSize:10,fontFamily:"inherit",cursor:"pointer",background:ratingFilter===r?D.amber:"transparent",color:ratingFilter===r?"#1A1410":D.muted,border:ratingFilter===r?"none":`0.5px solid ${D.border}`}}>{r}+ ⭐</button>)}
      </div>
    </>}
    {libTab==="strains"&&<div>
      {monthOrder.length===0&&<p style={{fontSize:13,color:D.muted}}>no strains logged yet</p>}
      {monthOrder.map(month=><div key={month} style={{marginBottom:28}}>
        <div onClick={()=>toggleMonth(month)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",marginBottom:collapsedMonths[month]?0:14,borderBottom:`0.5px solid ${D.border}`,paddingBottom:8}}>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:400,color:D.amber,margin:0}}>{monthLabel(month)}</p>
          <span style={{fontSize:11,color:D.muted,userSelect:"none"}}>{collapsedMonths[month]?`${monthGroups[month].length} strain${monthGroups[month].length!==1?"s":""}  ▸`:"▾"}</span>
        </div>
        {!collapsedMonths[month]&&monthGroups[month].map(s=>{const lc=getLatestCop(s);const ls=lc?.session;const locked=isNeverAgain(s);
          return(<div key={s.id} onClick={()=>onOpenDetail(s)} style={{display:"flex",gap:12,marginBottom:10,cursor:"pointer",padding:"12px 14px",borderRadius:12,background:D.card,border:`0.5px solid ${D.border}`}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:4}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:typeColor(lc?.type),boxShadow:lc?.status==="on-hand"?`0 0 8px ${typeColor(lc?.type)}, 0 0 16px ${typeColor(lc?.type)}80`:`0 0 6px ${typeColor(lc?.type)}40`}}/>
              <div style={{width:1,flex:1,background:D.border,marginTop:4}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14,fontWeight:500,color:D.text}}>{s.name}</span>
                  {s.starred&&<span style={{fontSize:12}}>⭐</span>}
                  {locked&&<span style={{fontSize:10}}>🔒</span>}
                </div>
                {ls&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=ls.rating} size={14} color={locked?"#C15A4A":"#6B7F5A"}/>)}</div>}
              </div>
              {lc?.terpenes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:6}}>{lc.terpenes.map(t=><span key={t} style={{fontSize:9,padding:"2px 7px",borderRadius:8,background:`${typeColor(lc.type)}20`,color:typeColor(lc.type)}}>{t.toLowerCase()}</span>)}</div>}
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {ls&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:`${copAgainColor(ls.copAgain)}30`,color:copAgainColor(ls.copAgain)}}>{"🔄 "+ls.copAgain.toLowerCase()}</span>}
                {s.cops.length>1&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:"rgba(212,184,136,0.15)",color:D.amber}}>{s.cops.length} cops</span>}
                {s.intent&&<IntentBadge intent={s.intent}/>}
              </div>
            </div>
          </div>);})}
      </div>)}
    </div>}

    {libTab==="mixes"&&<div>
      {uniqueMixes.length===0&&<p style={{fontSize:13,color:D.muted}}>no reviewed mixes yet</p>}
      {uniqueMixes.map(m=>{
        const primaryStrain=strains.find(s=>s.id===m.primaryStrainId||s.name===m.primaryStrain);
        const withStrain=strains.find(s=>s.id===m.withStrainId||s.name===m.withStrain);
        return(<div key={m.id} style={{background:"rgba(139,109,139,0.08)",borderRadius:12,padding:14,marginBottom:8,border:"0.5px solid rgba(139,109,139,0.15)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
            <div style={{width:3,height:14,borderRadius:1,background:typeColor(m.primaryType||m.copType)}}/>
            <button onClick={e=>{e.stopPropagation();primaryStrain&&onPeek(primaryStrain);}} style={{fontSize:13,fontWeight:500,color:"#C4B0C4",background:"none",border:"none",padding:0,cursor:primaryStrain?"pointer":"default",fontFamily:"inherit",borderBottom:primaryStrain?"0.5px solid rgba(196,176,196,0.3)":"none",paddingBottom:primaryStrain?1:0}}>{m.primaryStrain||m.strainName}</button>
            <span style={{fontSize:11,color:D.muted}}>x</span>
            <div style={{width:3,height:14,borderRadius:1,background:typeColor(m.withType)}}/>
            <button onClick={e=>{e.stopPropagation();withStrain&&onPeek(withStrain);}} style={{fontSize:13,fontWeight:500,color:"#C4B0C4",background:"none",border:"none",padding:0,cursor:withStrain?"pointer":"default",fontFamily:"inherit",borderBottom:withStrain?"0.5px solid rgba(196,176,196,0.3)":"none",paddingBottom:withStrain?1:0}}>{m.withStrain}</button>
            <div style={{display:"flex",gap:1,marginLeft:"auto"}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=m.rating} size={12} color="#8B6D8B"/>)}</div>
          </div>
          {m.combinedTerpenes&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:7}}>{m.combinedTerpenes.map(t=><span key={t} style={{fontSize:9,background:"rgba(139,109,139,0.2)",color:"#C4B0C4",padding:"2px 6px",borderRadius:6}}>{t.toLowerCase()}</span>)}</div>}
          {m.bedtime&&<span style={{display:"inline-block",fontSize:9,padding:"2px 7px",borderRadius:6,background:"rgba(44,44,74,0.5)",color:"#C9B8F0",marginBottom:7}}>🌙 bedtime</span>}
          {m.vibeTags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:7}}>{m.vibeTags.map(v=><span key={v} style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:"rgba(139,109,139,0.12)",color:"rgba(196,176,196,0.65)"}}>{v.toLowerCase()}</span>)}</div>}
          {m.notes&&<p style={{fontSize:11,color:D.muted,margin:"0 0 4px",lineHeight:1.55}}>{m.notes}</p>}
          <p style={{fontSize:10,color:"rgba(232,224,212,0.25)",margin:0}}>{m.date}</p>
        </div>);
      })}
    </div>}

    {libTab==="legacy"&&<div>
      {["Yes","Maybe","Never again"].map(status=>{
        const group=legacyStrains.filter(l=>l.copAgain===status).sort((a,b)=>legacyHasContent(b)?1:legacyHasContent(a)?-1:0);
        if(group.length===0)return null;
        const isNever=status==="Never again";
        return(<div key={status} style={{marginBottom:20}}>
          <p style={{fontSize:10,fontWeight:500,color:D.amber,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>{status==="Yes"?"would cop again":status==="Maybe"?"maybe cop again":"never again"}</p>
          {group.map(l=>{
            const hasContent=legacyHasContent(l);
            const isOpen=expandedLegacy[l.id];
            return(<div key={l.id} onClick={hasContent&&!isNever?()=>toggleLegacy(l.id):undefined}
              style={{background:"rgba(212,184,136,0.06)",borderRadius:10,marginBottom:5,border:`0.5px solid ${isOpen?"rgba(212,184,136,0.18)":"rgba(212,184,136,0.1)"}`,overflow:"hidden",cursor:hasContent&&!isNever?"pointer":"default",opacity:isNever?0.4:1}}>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:8}}>
                {l.type&&<div style={{width:3,height:16,borderRadius:2,background:typeColor(l.type),flexShrink:0,alignSelf:"stretch"}}/>}
                <span style={{fontSize:13,fontWeight:500,color:D.text,flex:1}}>{l.name}</span>
                {l.type&&<span style={{fontSize:10,color:D.muted}}>{l.type.toLowerCase()}</span>}
                {hasContent&&!isNever&&<span style={{fontSize:10,color:"rgba(232,224,212,0.2)"}}>{isOpen?"▴":"▾"}</span>}
              </div>
              {isOpen&&hasContent&&<div style={{borderTop:"0.5px solid rgba(212,184,136,0.08)",padding:"10px 14px 13px",display:"flex",flexDirection:"column",gap:7}}>
                {(l.brand||l.source||l.container)&&<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {l.brand&&<span style={{fontSize:12,fontWeight:500,color:"rgba(212,184,136,0.85)"}}>🏷️ {l.brand}</span>}
                  {(l.source||l.container)&&<span style={{fontSize:10,color:"rgba(212,184,136,0.5)"}}>{[l.source?.toLowerCase(),l.container?.toLowerCase()].filter(Boolean).join(" · ")}</span>}
                </div>}
                {l.notes&&<p style={{fontSize:12,color:"rgba(232,224,212,0.8)",margin:0,lineHeight:1.55}}>{l.notes}</p>}
              </div>}
            </div>);
          })}
        </div>);
      })}
    </div>}
  </div></div>);
}

/* ═══════════════════════════════════════════
   STRAIN DETAIL PAGE
   ═══════════════════════════════════════════ */
function StrainDetailPage({strain,copIdx,setCopIdx,tab:tabProp,setTab,onBack,onStar,onUpdateRating,onUpdateParents,onMarkDone,
  updateNote,setUpdateNote,onSaveNote,mixMode,setMixMode,
  expNote,setExpNote,onSaveExperience,onHand,strains,
  deleteFromCop,editNoteText,editingItem,setEditingItem,editText,setEditText,confirmDeleteItem,
  handleCreateMix,mixWith,setMixWith,mixSess,setMixSess,
  finishingCop,finishCopAgain,setFinishCopAgain,handleConfirmDone,setFinishingCop}){
  const[editingParents,setEditingParents]=useState(false);
  const[p1,setP1]=useState("");
  const[p2,setP2]=useState("");
  const[unknownLineage,setUnknownLineage]=useState(false);
  const cop=strain?.cops?.[copIdx];
  // reads tabProp, not the derived `tab` below — a dep array is evaluated during
  // render, so referencing the later const would hit the temporal dead zone
  useEffect(()=>{
    if(!cop)return;
    if(cop.status==="done"&&tabProp!=="overview"){
      const hasContent=tabProp==="notes"?(cop.notes||[]).length>0:tabProp==="experiences"?(cop.experiences||[]).length>0:tabProp==="mixes"?(cop.mixes||[]).length>0:true;
      if(!hasContent)setTab("overview");
    }
  },[cop?.id,cop?.status,tabProp]);
  if(!strain)return null;
  const s=cop?.session;
  const locked=strain.cops.some(c=>c.session?.copAgain==="Never again");
  // a tab is hidden when it's empty AND there's nothing you could add to it
  const canAddToCop=!locked&&cop?.status==="on-hand";
  const tabHasContent=t=>t==="notes"?(cop?.notes||[]).length>0:t==="experiences"?(cop?.experiences||[]).length>0:t==="mixes"?(cop?.mixes||[]).length>0:true;
  const visibleTabs=["overview","notes","experiences","mixes"].filter(t=>t==="overview"||tabHasContent(t)||canAddToCop);
  const tab=visibleTabs.includes(tabProp)?tabProp:"overview";
  const allDone=strain.cops.every(c=>c.status==="done");
  const canEditParents=!allDone&&!locked;
  const typeTheme={Indica:{bg:"#130E1C",text:"#D4C8E8",muted:"rgba(212,200,232,0.4)",accent:"#7B6B9E",cardBg:"rgba(212,200,232,0.05)",cardBorder:"rgba(212,200,232,0.08)"},
    Sativa:{bg:"#FBF4E4",text:"#3A3228",muted:"#8C7E6A",accent:"#C9A84C",cardBg:"rgba(201,168,76,0.06)",cardBorder:"rgba(201,168,76,0.12)"},
    Hybrid:{bg:"#111C11",text:"#D4E0D4",muted:"rgba(212,224,212,0.4)",accent:"#6B7F5A",cardBg:"rgba(107,127,90,0.06)",cardBorder:"rgba(107,127,90,0.1)"}}[cop?.type]||{bg:"#1A1410",text:"#E8E0D4",muted:"rgba(232,224,212,0.4)",accent:"#D4B888",cardBg:"rgba(232,224,212,0.04)",cardBorder:"rgba(232,224,212,0.08)"};

  return(<div style={{background:typeTheme.bg,minHeight:"100vh",color:typeTheme.text}}><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <button onClick={onBack} style={{width:36,height:36,borderRadius:"50%",background:typeTheme.cardBg,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1L1 10M1 10h6M1 10V4" stroke={typeTheme.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      <div style={{flex:1}}>
        <h2 style={{fontSize:22,fontWeight:500,margin:0,fontFamily:"'Playfair Display',serif"}}>{strain.name}</h2>
        {!editingParents&&<p onClick={canEditParents?()=>{setP1(strain.parents?.[0]||"");setP2(strain.parents?.[1]||"");setUnknownLineage(strain.parents?.includes("unknown lineage")||false);setEditingParents(true);}:undefined} style={{fontSize:12,color:typeTheme.muted,margin:"2px 0 0",cursor:canEditParents?"pointer":"default"}}>
          {strain.parents?.length>0?strain.parents.join(" x "):<span style={{opacity:0.4}}>{canEditParents?"tap to add parents":""}</span>}
          {canEditParents&&<span style={{fontSize:10,opacity:0.3,marginLeft:6}}>✎</span>}
        </p>}
        {editingParents&&<div style={{marginTop:6}}>
          {!unknownLineage&&<div style={{display:"flex",gap:6,marginBottom:6}}>
            <input defaultValue={p1} onBlur={e=>setP1(e.target.value)} placeholder="parent 1" style={{flex:1,background:typeTheme.cardBg,borderRadius:6,padding:"6px 10px",fontSize:12,color:typeTheme.text,border:`0.5px solid ${typeTheme.accent}40`,fontFamily:"inherit",outline:"none"}}/>
            <input defaultValue={p2} onBlur={e=>setP2(e.target.value)} placeholder="parent 2" style={{flex:1,background:typeTheme.cardBg,borderRadius:6,padding:"6px 10px",fontSize:12,color:typeTheme.text,border:`0.5px solid ${typeTheme.accent}40`,fontFamily:"inherit",outline:"none"}}/>
          </div>}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <button onClick={()=>setUnknownLineage(!unknownLineage)} style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:unknownLineage?`${typeTheme.accent}30`:"transparent",color:unknownLineage?typeTheme.accent:typeTheme.muted,border:`0.5px solid ${typeTheme.accent}30`,cursor:"pointer",fontFamily:"inherit"}}>unknown lineage</button>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setEditingParents(false)} style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
            <button onClick={()=>{const parents=unknownLineage?["unknown lineage"]:[p1,p2].filter(x=>x.trim());onUpdateParents(strain.id,parents);setEditingParents(false);}} style={{fontSize:11,padding:"4px 12px",borderRadius:8,background:typeTheme.accent,color:cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>save</button>
          </div>
        </div>}
      </div>
      {!locked&&<button onClick={onStar} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill={strain.starred?"#C9A84C":"none"} stroke={strain.starred?"#C9A84C":typeTheme.muted} strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round"/></svg>
      </button>}
      {locked&&<span style={{fontSize:16}}>🔒</span>}
    </div>

    {/* Intent + Amount badges */}
    <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
      {strain.intent&&<IntentBadge intent={strain.intent}/>}
      {cop?.amount&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:typeTheme.cardBg,color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`}}>⚖️ {cop.amount}</span>}
      <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:`${typeTheme.accent}20`,color:typeTheme.accent}}>{cop?.type?.toLowerCase()}{cop?.lean?` · ${cop.lean.toLowerCase()}`:""}</span>
      {cop?.status==="on-hand"&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:"rgba(91,138,114,0.15)",color:"#6B8F5A"}}>on hand</span>}
      {cop?.lite&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:`${typeTheme.accent}18`,color:typeTheme.muted}}>lite 🌬️</span>}
    </div>
    {/* Dates line */}
    <p style={{fontSize:11,color:typeTheme.muted,margin:"0 0 14px"}}>{[cop?.date&&`copped ${cop.date}`,s?.date&&`first session ${s.date}`,cop?.finishedDate&&`finished ${cop.finishedDate}`].filter(Boolean).join(" · ")}</p>

    {/* Cop switcher */}
    {strain.cops.length>1&&<div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>{strain.cops.map((c,i)=><button key={c.id} onClick={()=>setCopIdx(i)} style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap",fontWeight:copIdx===i?500:400,background:copIdx===i?typeTheme.accent:"transparent",color:copIdx===i?(cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4"):typeTheme.muted,border:copIdx===i?"none":`0.5px solid ${typeTheme.cardBorder}`}}>cop #{i+1} · {c.date}{c.amount?` · ${c.amount}`:""}</button>)}</div>}

    {/* Detail tabs */}
    {visibleTabs.length>1&&<div style={{display:"flex",gap:4,marginBottom:20}}>{visibleTabs.map(t=>(
      <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 6px",borderRadius:8,fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:tab===t?500:400,background:tab===t?typeTheme.accent:"transparent",color:tab===t?(cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4"):typeTheme.muted,border:tab===t?"none":`0.5px solid ${typeTheme.cardBorder}`}}>{t}</button>
    ))}</div>}

    {/* ── OVERVIEW TAB ── */}
    {tab==="overview"&&<div>
      {!s&&<p style={{fontSize:11,color:typeTheme.muted,textAlign:"center",margin:"0 0 16px",lineHeight:1.5}}>no first sesh on this one — logged after the fact 🤷🏾 rate it below, notes / experiences / mixes all still work</p>}
      {/* Rating — stays clickable with no session so lite cops can still be rated */}
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"center",gap:6}}>{[1,2,3,4,5].map(n=>cop?.status!=="done"?<button key={n} onClick={()=>onUpdateRating(n)} style={{background:"none",border:"none",cursor:"pointer",padding:1}}><Leaf filled={n<=(s?.rating||0)} size={22} color={locked?"#C15A4A":typeTheme.accent}/></button>:<Leaf key={n} filled={n<=(s?.rating||0)} size={22} color={locked?"#C15A4A":typeTheme.accent}/>)}</div>
        <span style={{fontSize:10,color:typeTheme.muted,marginTop:4,display:"block"}}>{s?.copAgain?.toLowerCase()||(!s?"tap a leaf to rate 🍃":"")}</span>
      </div>

      {/* Terpenes */}
      {cop?.terpenes?.length>0&&<div style={{marginBottom:16}}>
        <p style={{fontSize:10,fontWeight:500,color:typeTheme.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>terpenes</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{cop.terpenes.map(t=><span key={t} style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:`${typeTheme.accent}20`,color:typeTheme.accent}}>{t.toLowerCase()}</span>)}</div>
      </div>}

      {/* Spectrums */}
      {s&&<div style={{marginBottom:16}}>
        <p style={{fontSize:10,fontWeight:500,color:typeTheme.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>spectrums</p>
        <SpectrumDisplay left="Couch-locked" right="Active" val={s.spectrums?.sw} color={typeTheme.accent}/>
        <SpectrumDisplay left="Dreamy" right="Analytical" val={s.spectrums?.sf} color={typeTheme.accent}/>
        <SpectrumDisplay left="Smooth" right="Harsh" val={s.pull} color={typeTheme.accent}/>
      </div>}

      {/* Detail grid */}
      <div style={{background:typeTheme.cardBg,borderRadius:12,padding:14,border:`0.5px solid ${typeTheme.cardBorder}`,marginBottom:16}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {cop?.source&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:typeTheme.cardBg,color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`}}>{cop.source==="TL"?"TL":cop.source?.toLowerCase()}{cop.container?` · ${cop.container.toLowerCase()}`:""}</span>}
          {cop?.brand&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:typeTheme.cardBg,color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`}}>{cop.brand}</span>}
          {cop?.growType&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:typeTheme.cardBg,color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`}}>{cop.growType.toLowerCase()}</span>}
          {s&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:s.setting==="outdoor"?"rgba(91,138,114,0.2)":s.bedtime?"rgba(44,44,74,0.5)":typeTheme.cardBg,color:s.setting==="outdoor"?"#6B8F5A":s.bedtime?"#C9B8F0":typeTheme.muted}}>{s.setting==="outdoor"?"outdoor":s.bedtime?"bedtime":"indoor"}</span>}
          {s?.smokesLike&&s.smokesLike!==cop?.type&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:"rgba(193,127,74,0.15)",color:"#C17F4A"}}>smokes {s.smokesLike.toLowerCase()}</span>}
        </div>
        {(()=>{const fi=cop?.firstNotes||(cop?.notes?.length>0?cop.notes[0].text:null)||cop?.session?.notes||null;if(!fi)return null;const fiDate=cop?.firstNotes?cop?.date:cop?.notes?.[0]?.date||cop?.date;return(<div style={{marginTop:8}}><p style={{fontSize:10,color:typeTheme.muted,margin:"0 0 2px"}}>first impressions{fiDate?` · ${fiDate}`:""}</p><p style={{fontSize:12,color:typeTheme.text,margin:0,lineHeight:1.4,opacity:0.8}}>{fi}</p></div>);})()}
      </div>

      {/* Vibes + taste */}
      {(s?.vibeTags?.length>0||s?.tasteTags?.length>0)&&<div style={{marginBottom:16}}>
        <p style={{fontSize:10,fontWeight:500,color:typeTheme.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>vibes</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
          {s?.tasteTags?.map(t=><span key={t} style={{fontSize:10,padding:"3px 8px",borderRadius:8,background:"rgba(193,127,74,0.15)",color:"#C17F4A"}}>{t.toLowerCase()}</span>)}
          {s?.vibeTags?.map(t=><span key={t} style={{fontSize:10,padding:"3px 8px",borderRadius:8,background:typeTheme.cardBg,color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`}}>{t.toLowerCase()}</span>)}
        </div>
      </div>}



      {/* Mark finished with cop-again confirmation */}
      {!locked&&cop?.status==="on-hand"&&!finishingCop&&<button onClick={()=>onMarkDone({strainName:strain.name,strainId:strain.id,copId:cop.id,type:cop.type,terpenes:cop.terpenes})} style={{width:"100%",padding:10,borderRadius:8,fontSize:12,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit",marginTop:10}}>mark finished</button>}
      {finishingCop?.copId===cop?.id&&<div style={{background:typeTheme.cardBg,borderRadius:12,padding:16,border:`0.5px solid ${typeTheme.cardBorder}`,marginTop:12}}>
        <p style={{fontSize:12,fontWeight:500,color:typeTheme.text,margin:"0 0 8px"}}>would you still cop again?</p>
        <div style={{display:"flex",gap:5,marginBottom:10}}>{["Yes","Maybe","No","Never again"].map(v=><button key={v} onClick={()=>setFinishCopAgain(v)} style={{flex:1,padding:"8px 2px",borderRadius:8,fontSize:v==="Never again"?10:12,fontFamily:"inherit",cursor:"pointer",fontWeight:finishCopAgain===v?500:400,background:finishCopAgain===v?copAgainColor(v):typeTheme.cardBg,color:finishCopAgain===v?"#E8E0D4":typeTheme.muted,border:finishCopAgain===v?"none":`0.5px solid ${typeTheme.cardBorder}`}}>{ v.toLowerCase()}</button>)}</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{setFinishingCop(null);setFinishCopAgain("");}} style={{flex:1,padding:8,borderRadius:8,fontSize:12,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
          <button onClick={handleConfirmDone} style={{flex:1,padding:8,borderRadius:8,fontSize:12,fontWeight:500,background:typeTheme.accent,color:cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>{finishCopAgain?"confirm":"keep original"}</button>
        </div>
      </div>}


      {mixMode==="experience"&&tab==="overview"&&<div style={{background:typeTheme.cardBg,borderRadius:12,padding:16,border:`0.5px solid ${typeTheme.cardBorder}`,marginTop:12}}>
        <p style={{fontSize:12,fontWeight:500,color:typeTheme.text,margin:"0 0 12px"}}>log an experience — {today()}</p>
        <div style={{marginBottom:12}}><ToggleGroup options={["indoor","outdoor"]} value={expNote.setting} onChange={v=>setExpNote({...expNote,setting:v,bedtime:v==="outdoor"?false:expNote.bedtime})} color={typeTheme.accent}/>
        {expNote.setting==="indoor"&&<button onClick={()=>setExpNote({...expNote,bedtime:!expNote.bedtime})} style={{display:"flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",background:expNote.bedtime?"#2C2C4A":"transparent",color:expNote.bedtime?"#C9B8F0":typeTheme.muted,border:expNote.bedtime?"none":`0.5px solid ${typeTheme.cardBorder}`}}>bedtime{expNote.bedtime&&" ✓"}</button>}</div>
        <textarea defaultValue={expNote.note} onBlur={e=>setExpNote({...expNote,note:e.target.value})} placeholder="what was different this time..." rows={3} style={{width:"100%",boxSizing:"border-box",background:"transparent",borderRadius:8,padding:"10px 14px",fontSize:14,color:typeTheme.text,border:`0.5px solid ${typeTheme.cardBorder}`,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:12}}/>
        <div style={{marginBottom:12}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={expNote.vibeTags} onChange={v=>setExpNote({...expNote,vibeTags:v})} color={typeTheme.accent}/></div>
        {/* Mixed with picker */}
        <div style={{marginBottom:12}}>
          <p style={{fontSize:11,color:typeTheme.muted,margin:"0 0 6px"}}>mixed with another strain?</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            <button onClick={()=>setExpNote({...expNote,mixedWith:null})} style={{fontSize:10,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",background:!expNote.mixedWith?typeTheme.accent:"transparent",color:!expNote.mixedWith?(cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4"):typeTheme.muted,border:!expNote.mixedWith?"none":`0.5px solid ${typeTheme.cardBorder}`}}>solo</button>
            {onHand.filter(o=>o.strainId!==strain.id).map(o=><button key={o.copId} onClick={()=>setExpNote({...expNote,mixedWith:o.strainName})} style={{fontSize:10,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",background:expNote.mixedWith===o.strainName?"#8B6D8B":"transparent",color:expNote.mixedWith===o.strainName?"#E8E0D4":typeTheme.muted,border:expNote.mixedWith===o.strainName?"none":`0.5px solid ${typeTheme.cardBorder}`}}>{o.strainName}</button>)}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setMixMode(null)} style={{flex:1,padding:10,borderRadius:8,fontSize:12,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button><button onClick={onSaveExperience} style={{flex:1,padding:10,borderRadius:8,fontSize:12,fontWeight:500,background:typeTheme.accent,color:cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>save</button></div>
      </div>}
    </div>}

    {/* ── NOTES TAB ── */}
    {tab==="notes"&&<div>
      {!locked&&cop?.status==="on-hand"&&!mixMode&&<button onClick={()=>{setMixMode("note");setUpdateNote("");}} style={{width:"100%",padding:10,borderRadius:8,fontSize:12,background:typeTheme.cardBg,color:typeTheme.text,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>+ add note</button>}
      {mixMode==="note"&&tab==="notes"&&<div style={{background:typeTheme.cardBg,borderRadius:12,padding:16,border:`0.5px solid ${typeTheme.cardBorder}`,marginBottom:12}}>
        <p style={{fontSize:12,fontWeight:500,color:typeTheme.text,margin:"0 0 10px"}}>add a note</p>
        <textarea defaultValue={updateNote} onBlur={e=>setUpdateNote(e.target.value)} placeholder="what\u2019s on your mind..." rows={3} style={{width:"100%",boxSizing:"border-box",background:"transparent",borderRadius:8,padding:"10px 14px",fontSize:14,color:typeTheme.text,border:`0.5px solid ${typeTheme.cardBorder}`,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:12}}/>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setMixMode(null)} style={{flex:1,padding:10,borderRadius:8,fontSize:12,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button><button onClick={onSaveNote} style={{flex:1,padding:10,borderRadius:8,fontSize:12,fontWeight:500,background:typeTheme.accent,color:cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>save note</button></div>
      </div>}
      {(cop?.notes||[]).length===0&&!mixMode&&<p style={{fontSize:13,color:typeTheme.muted,fontStyle:"italic"}}>no notes yet</p>}
      {(cop?.notes||[]).map((n,ni)=>{const isFirstImpression=!cop?.firstNotes&&ni===0;return(<div key={n.id} style={{background:typeTheme.cardBg,borderRadius:10,padding:12,marginBottom:6,border:`0.5px solid ${typeTheme.cardBorder}`,borderLeft:`3px solid ${isFirstImpression?typeTheme.muted:typeTheme.accent}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:typeTheme.muted}}>{n.date}</span>
            {isFirstImpression&&<span style={{fontSize:9,color:typeTheme.muted,opacity:0.6,fontStyle:"italic"}}>first impressions</span>}
          </div>
          {!locked&&cop?.status==="on-hand"&&<div style={{display:"flex",gap:6}}>
            <button onClick={()=>{setEditingItem(n.id);setEditText(n.text);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:typeTheme.muted,fontFamily:"inherit"}}>edit</button>
            <button onClick={()=>deleteFromCop("notes",n.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#C15A4A",fontFamily:"inherit"}}>{confirmDeleteItem==="notes-"+n.id?"confirm?":"delete"}</button>
          </div>}
        </div>
        {editingItem===n.id?<div><textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={2} style={{width:"100%",boxSizing:"border-box",background:"transparent",borderRadius:6,padding:"8px 10px",fontSize:12,color:typeTheme.text,border:`0.5px solid ${typeTheme.cardBorder}`,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:6}}/><div style={{display:"flex",gap:6}}><button onClick={()=>{setEditingItem(null);setEditText("");}} style={{fontSize:10,color:typeTheme.muted,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>cancel</button><button onClick={()=>editNoteText(n.id,editText)} style={{fontSize:10,color:typeTheme.accent,fontWeight:500,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>save</button></div></div>:<p style={{fontSize:12,color:typeTheme.text,margin:"0",lineHeight:1.4}}>{n.text}</p>}
      </div>);})}
    </div>}

    {/* ── EXPERIENCES TAB ── */}
    {tab==="experiences"&&<div>
      {!locked&&cop?.status==="on-hand"&&!mixMode&&<button onClick={()=>setMixMode("experience")} style={{width:"100%",padding:10,borderRadius:8,fontSize:12,background:typeTheme.accent,color:cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>+ log experience</button>}
      {mixMode==="experience"&&tab==="experiences"&&<div style={{background:typeTheme.cardBg,borderRadius:12,padding:16,border:`0.5px solid ${typeTheme.cardBorder}`,marginBottom:12}}>
        <p style={{fontSize:12,fontWeight:500,color:typeTheme.text,margin:"0 0 12px"}}>log an experience</p>
        <div style={{marginBottom:12}}><ToggleGroup options={["indoor","outdoor"]} value={expNote.setting} onChange={v=>setExpNote({...expNote,setting:v,bedtime:v==="outdoor"?false:expNote.bedtime})} color={typeTheme.accent}/>
        {expNote.setting==="indoor"&&<button onClick={()=>setExpNote({...expNote,bedtime:!expNote.bedtime})} style={{display:"flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",background:expNote.bedtime?"#2C2C4A":"transparent",color:expNote.bedtime?"#C9B8F0":typeTheme.muted,border:expNote.bedtime?"none":`0.5px solid ${typeTheme.cardBorder}`}}>bedtime{expNote.bedtime&&" \u2713"}</button>}</div>
        <textarea defaultValue={expNote.note} onBlur={e=>setExpNote({...expNote,note:e.target.value})} placeholder="what was different this time..." rows={3} style={{width:"100%",boxSizing:"border-box",background:"transparent",borderRadius:8,padding:"10px 14px",fontSize:14,color:typeTheme.text,border:`0.5px solid ${typeTheme.cardBorder}`,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:12}}/>
        <div style={{marginBottom:12}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={expNote.vibeTags} onChange={v=>setExpNote({...expNote,vibeTags:v})} color={typeTheme.accent}/></div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setMixMode(null)} style={{flex:1,padding:10,borderRadius:8,fontSize:12,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button><button onClick={onSaveExperience} style={{flex:1,padding:10,borderRadius:8,fontSize:12,fontWeight:500,background:typeTheme.accent,color:cop?.type==="Sativa"?"#FBF4E4":"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>save</button></div>
      </div>}
      {(cop?.experiences||[]).length===0&&!mixMode&&<p style={{fontSize:13,color:typeTheme.muted,fontStyle:"italic"}}>no experiences logged yet</p>}
      {(cop?.experiences||[]).map(exp=><div key={exp.id} style={{background:typeTheme.cardBg,borderRadius:10,padding:12,marginBottom:6,border:`0.5px solid ${typeTheme.cardBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{fontSize:10,color:typeTheme.muted}}>{exp.date}</span>
          <span style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:exp.setting==="outdoor"?"rgba(91,138,114,0.2)":exp.bedtime?"rgba(44,44,74,0.5)":typeTheme.cardBg,color:exp.setting==="outdoor"?"#6B8F5A":exp.bedtime?"#C9B8F0":typeTheme.muted}}>{exp.setting==="outdoor"?"outdoor":exp.bedtime?"bedtime":"indoor"}</span>
        </div>
        {exp.note&&<p style={{fontSize:12,color:typeTheme.text,margin:"0 0 4px",lineHeight:1.4}}>{exp.note}</p>}
        {exp.vibeTags?.length>0&&<div style={{display:"flex",gap:3}}>{exp.vibeTags.map(t=><span key={t} style={{fontSize:9,background:`${typeTheme.accent}20`,color:typeTheme.accent,padding:"1px 5px",borderRadius:6}}>{t.toLowerCase()}</span>)}</div>}
        {exp.mixedWith&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}><span style={{fontSize:10,color:"#8B6D8B"}}>mixed with</span><span style={{fontSize:11,fontWeight:500,color:"#C4B0C4"}}>{exp.mixedWith.name}</span></div>}
      </div>)}
    </div>}

    {/* ── MIXES TAB ── */}
    {tab==="mixes"&&<div>
      {/* Log mix button + picker */}
      {!locked&&cop?.status==="on-hand"&&!mixMode&&<button onClick={()=>setMixMode("mix")} style={{width:"100%",padding:10,borderRadius:8,fontSize:12,background:"#8B6D8B",color:"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>+ log a mix</button>}
      {mixMode==="mix"&&<div style={{background:"rgba(139,109,139,0.08)",borderRadius:12,padding:16,border:"0.5px solid rgba(139,109,139,0.15)",marginBottom:16}}>
        <p style={{fontSize:12,fontWeight:500,color:"#C4B0C4",margin:"0 0 10px"}}>mix {strain.name} with:</p>
        <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
          {onHand.filter(o=>o.strainId!==strain.id).map(o=><button key={o.copId} onClick={()=>setMixWith(strains.find(s=>s.id===o.strainId))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",background:mixWith?.id===o.strainId?"#8B6D8B":"transparent",color:mixWith?.id===o.strainId?"#E8E0D4":"#C4B0C4",border:mixWith?.id===o.strainId?"none":"0.5px solid rgba(139,109,139,0.15)",textAlign:"left"}}><div style={{width:3,height:16,borderRadius:1,background:typeColor(o.type)}}/>{o.strainName}</button>)}
          {onHand.filter(o=>o.strainId!==strain.id).length===0&&<p style={{fontSize:11,color:typeTheme.muted}}>no other on-hand strains to mix with</p>}
        </div>
        {mixWith&&<>
          <SpectrumSlider left="Couch-locked" right="Active" value={mixSess.sw} onChange={v=>setMixSess({...mixSess,sw:v})} color="#8B6D8B"/>
          <SpectrumSlider left="Dreamy" right="Analytical" value={mixSess.sf} onChange={v=>setMixSess({...mixSess,sf:v})} color="#8B6D8B"/>
          <SpectrumSlider left="Smooth" right="Harsh" value={mixSess.pull} onChange={v=>setMixSess({...mixSess,pull:v})} color="#8B6D8B"/>
          <button onClick={()=>setMixSess({...mixSess,bedtime:!mixSess.bedtime})} style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",background:mixSess.bedtime?"#2C2C4A":"transparent",color:mixSess.bedtime?"#C9B8F0":"rgba(232,224,212,0.4)",border:mixSess.bedtime?"none":"0.5px solid rgba(139,109,139,0.2)"}}>🌙 bedtime{mixSess.bedtime&&" ✓"}</button>
          <div style={{marginBottom:12}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={mixSess.vibeTags} onChange={v=>setMixSess({...mixSess,vibeTags:v})} color="#8B6D8B"/></div>
          <textarea defaultValue={mixSess.notes} onBlur={e=>setMixSess({...mixSess,notes:e.target.value})} placeholder="how'd the combo play together..." rows={2} style={{width:"100%",boxSizing:"border-box",background:"transparent",borderRadius:8,padding:"10px 14px",fontSize:14,color:typeTheme.text,border:"0.5px solid rgba(139,109,139,0.15)",fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:12}}/>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{setMixMode(null);setMixWith(null);}} style={{flex:1,padding:10,borderRadius:8,fontSize:12,background:"transparent",color:typeTheme.muted,border:`0.5px solid ${typeTheme.cardBorder}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
            <button onClick={()=>handleCreateMix(true)} style={{flex:1,padding:10,borderRadius:8,fontSize:12,background:"rgba(139,109,139,0.2)",color:"#C4B0C4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>rate later</button>
            <button onClick={()=>handleCreateMix(false)} style={{flex:1,padding:10,borderRadius:8,fontSize:12,fontWeight:500,background:"#8B6D8B",color:"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>save mix</button>
          </div>
        </>}
      </div>}
      {(cop?.mixes||[]).length===0&&!mixMode&&<p style={{fontSize:13,color:typeTheme.muted,fontStyle:"italic"}}>no mixes logged yet</p>}
      {(cop?.mixes||[]).map(m=><div key={m.id} style={{background:"rgba(139,109,139,0.08)",borderRadius:10,padding:12,marginBottom:6,border:"0.5px solid rgba(139,109,139,0.12)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13,fontWeight:500,color:"#C4B0C4"}}>{strain.name}</span>
            <span style={{fontSize:11,color:typeTheme.muted}}>x</span>
            <span style={{fontSize:13,fontWeight:500,color:"#C4B0C4"}}>{m.withStrain}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {m.status==="reviewed"&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=m.rating} size={12} color="#8B6D8B"/>)}</div>}
            {!locked&&cop?.status==="on-hand"&&<button onClick={()=>deleteFromCop("mixes",m.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#C15A4A",fontFamily:"inherit"}}>{confirmDeleteItem==="mixes-"+m.id?"confirm?":"delete"}</button>}
          </div>
        </div>
        {m.combinedTerpenes&&<div style={{display:"flex",flexWrap:"wrap",gap:2}}>{m.combinedTerpenes.map(t=><span key={t} style={{fontSize:9,background:"rgba(139,109,139,0.2)",color:"#C4B0C4",padding:"2px 6px",borderRadius:6}}>{t.toLowerCase()}</span>)}</div>}
        {m.notes&&<p style={{fontSize:11,color:typeTheme.muted,margin:"4px 0 0"}}>{m.notes}</p>}
        <p style={{fontSize:10,color:typeTheme.muted,margin:"3px 0 0"}}>{m.date}</p>
      </div>)}
    </div>}
  </div></div>);
}


/* ═══════════════════════════════════════════
   INSIGHTS PAGE
   ═══════════════════════════════════════════ */
function InsightsPage({strains,onHand,onPeek,dismissed,setDismissed,saved,setSaved,desktopPanel=false}){
  const[profileOpen,setProfileOpen]=useState(false);
  const[expandedPinned,setExpandedPinned]=useState({});
  const[expandedMix,setExpandedMix]=useState(null);
  const[expandedBedtimeNote,setExpandedBedtimeNote]=useState(null);
  const[dotsOpen,setDotsOpen]=useState(null);
  const[saveConfirm,setSaveConfirm]=useState(null);

  const togglePinned=id=>setExpandedPinned(prev=>({...prev,[id]:!prev[id]}));
  const dismiss=id=>{setDismissed(prev=>[...prev,id]);setDotsOpen(null);};
  const savePost=(post)=>{setSaved(prev=>[{...post,savedAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})},  ...prev]);setSaveConfirm(post.id);setDotsOpen(null);setTimeout(()=>setSaveConfirm(null),2000);};
  const unsave=id=>setSaved(prev=>prev.filter(p=>p.id!==id));

  // ── All data aggregation ──
  const allCops=strains.flatMap(s=>s.cops.filter(c=>c.session).map(c=>({...c,strainName:s.name,strainId:s.id,intent:s.intent,starred:s.starred})));
  const totalSessions=allCops.length;
  // rated/voted subsets — a cop with no rating must not be averaged in as a zero
  const ratedCops=allCops.filter(c=>(c.session?.rating||0)>0);
  const votedCops=allCops.filter(c=>c.session?.copAgain);
  const avgRating=ratedCops.length>0?(ratedCops.reduce((s,c)=>s+(c.session?.rating||0),0)/ratedCops.length).toFixed(1):"—";
  const copAgainYes=votedCops.filter(c=>c.session?.copAgain==="Yes").length;
  const copAgainPct=votedCops.length>0?Math.round(copAgainYes/votedCops.length*100):0;

  const allMixes=strains.flatMap(s=>s.cops.flatMap(c=>(c.mixes||[]).filter(m=>m.status==="reviewed").map(m=>({...m,strainName:s.name}))));
  const uniqueMixes=[];const seenShared=new Set();
  allMixes.forEach(m=>{if(m.sharedId&&seenShared.has(m.sharedId))return;if(m.sharedId)seenShared.add(m.sharedId);uniqueMixes.push(m);});

  // Terpenes
  const terpCounts={};const terpRatings={};const terpCopAgain={};
  allCops.forEach(c=>{(c.terpenes||[]).forEach(t=>{terpCounts[t]=(terpCounts[t]||0)+1;if(!terpRatings[t])terpRatings[t]=[];if((c.session?.rating||0)>0)terpRatings[t].push(c.session.rating);if(!terpCopAgain[t])terpCopAgain[t]={yes:0,total:0};terpCopAgain[t].total++;if(c.session?.copAgain==="Yes")terpCopAgain[t].yes++;});});
  const terpEntries=Object.entries(terpCounts).sort((a,b)=>b[1]-a[1]);
  const maxTerpCount=terpEntries.length>0?terpEntries[0][1]:1;
  const topTerp=terpEntries[0];

  // Mixes vs solos
  const mixAvg=uniqueMixes.length>0?(uniqueMixes.reduce((s,m)=>s+(m.rating||0),0)/uniqueMixes.length).toFixed(1):"—";
  const soloAvg=avgRating;
  const mixesBetter=uniqueMixes.length>0&&Number(mixAvg)>Number(soloAvg);

  // Types
  const typeCounts={Indica:0,Sativa:0,Hybrid:0};const typeRatings={Indica:[],Sativa:[],Hybrid:[]};
  allCops.forEach(c=>{const t=c.type;if(typeCounts[t]!==undefined){typeCounts[t]++;if((c.session?.rating||0)>0)typeRatings[t].push(c.session.rating);}});
  const typeAvgs={};Object.entries(typeRatings).forEach(([t,r])=>{typeAvgs[t]=r.length>0?(r.reduce((a,b)=>a+b,0)/r.length).toFixed(1):"—";});
  const allFiveStars=allCops.filter(c=>(c.session?.rating||0)>=5);
  const fiveStarTypes=[...new Set(allFiveStars.map(c=>c.type))];
  const labelMatches={Sativa:{match:0,total:0},Indica:{match:0,total:0},Hybrid:{match:0,total:0}};
  allCops.filter(c=>c.type&&c.session?.smokesLike).forEach(c=>{if(labelMatches[c.type]){labelMatches[c.type].total++;if(c.session.smokesLike===c.type)labelMatches[c.type].match++;}});
  const totalLabeled=Object.values(labelMatches).reduce((a,b)=>a+b.total,0);
  const totalMatched=Object.values(labelMatches).reduce((a,b)=>a+b.match,0);
  const labelPct=totalLabeled>0?Math.round(totalMatched/totalLabeled*100):0;

  // Brands
  const tlCops=allCops.filter(c=>c.source==="TL");const dispCops=allCops.filter(c=>c.source==="Dispensary");
  const tlRated=tlCops.filter(c=>(c.session?.rating||0)>0);const dispRated=dispCops.filter(c=>(c.session?.rating||0)>0);
  const tlAvg=tlRated.length>0?(tlRated.reduce((s,c)=>s+c.session.rating,0)/tlRated.length).toFixed(1):"—";
  const dispAvg=dispRated.length>0?(dispRated.reduce((s,c)=>s+c.session.rating,0)/dispRated.length).toFixed(1):"—";
  const brandCounts={};const brandRatings={};
  dispCops.filter(c=>c.brand).forEach(c=>{const b=c.brand;brandCounts[b]=(brandCounts[b]||0)+1;if(!brandRatings[b])brandRatings[b]=[];if((c.session?.rating||0)>0)brandRatings[b].push(c.session.rating);});
  const brandEntries=Object.entries(brandCounts).sort((a,b)=>b[1]-a[1]);
  const growCounts={};const growRatings={};const growCopAgain={};
  dispCops.filter(c=>c.growType).forEach(c=>{const g=c.growType;growCounts[g]=(growCounts[g]||0)+1;if(!growRatings[g])growRatings[g]=[];if((c.session?.rating||0)>0)growRatings[g].push(c.session.rating);if(!growCopAgain[g])growCopAgain[g]={yes:0,maybe:0,no:0};if(c.session?.copAgain==="Yes")growCopAgain[g].yes++;else if(c.session?.copAgain==="Maybe")growCopAgain[g].maybe++;else growCopAgain[g].no++;});
  const growEntries=Object.entries(growCounts).sort((a,b)=>{const avgA=growRatings[a[0]].reduce((x,y)=>x+y,0)/a[1];const avgB=growRatings[b[0]].reduce((x,y)=>x+y,0)/b[1];return avgB-avgA;});

  // Outdoor
  const outdoorCops=allCops.filter(c=>c.session?.setting==="outdoor");const indoorCops=allCops.filter(c=>c.session?.setting==="indoor");
  const outdoorAvg=outdoorCops.length>0?(outdoorCops.reduce((s,c)=>s+(c.session?.rating||0),0)/outdoorCops.length).toFixed(1):"—";
  const indoorAvg=indoorCops.length>0?(indoorCops.reduce((s,c)=>s+(c.session?.rating||0),0)/indoorCops.length).toFixed(1):"—";
  const outdoorTerps={};outdoorCops.forEach(c=>(c.terpenes||[]).forEach(t=>{outdoorTerps[t]=(outdoorTerps[t]||0)+1;}));
  const topOutdoorTerps=Object.entries(outdoorTerps).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const outdoorVibes={};outdoorCops.forEach(c=>(c.session?.vibeTags||[]).forEach(v=>{outdoorVibes[v]=(outdoorVibes[v]||0)+1;}));
  const topOutdoorVibes=Object.entries(outdoorVibes).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Bedtime
  const WRONG_VIBES=["Energized","Restless","Laser focused","Get things done","Clean mode","Conversational"];
  const isWrongCall=e=>(e.spectrums?.sw>0)||(e.vibeTags||[]).some(t=>WRONG_VIBES.includes(t));
  const bedtimeCops=allCops.filter(c=>c.session?.bedtime);
  const bedtimeMixes=strains.flatMap(s=>s.cops.flatMap(c=>(c.mixes||[]).filter(m=>m.bedtime&&m.status==="reviewed").map(m=>({...m,strainName:s.name,strainId:s.id}))));
  const seenBedtimeMix=new Set();const uniqueBedtimeMixes=[];
  bedtimeMixes.forEach(m=>{if(m.sharedId&&seenBedtimeMix.has(m.sharedId))return;if(m.sharedId)seenBedtimeMix.add(m.sharedId);uniqueBedtimeMixes.push(m);});
  const allBedtime=[
    ...bedtimeCops.map(c=>({type:"session",id:c.id,name:c.strainName,rating:c.session?.rating||0,terpenes:c.terpenes||[],spectrums:c.session?.spectrums,vibeTags:c.session?.vibeTags||[],intentConfirmed:strains.find(s=>s.cops.some(cc=>cc.id===c.id))?.intent==="asleep"})),
    ...uniqueBedtimeMixes.map(m=>({type:"mix",id:m.id,name:`${m.primaryStrain||m.strainName} x ${m.withStrain}`,rating:m.rating||0,terpenes:m.combinedTerpenes||[],spectrums:m.spectrums,vibeTags:m.vibeTags||[],intentConfirmed:false}))
  ];
  const wrongCalls=allBedtime.filter(isWrongCall);
  const goodCalls=allBedtime.filter(e=>!isWrongCall(e));
  const bdTerpAgg={};allBedtime.forEach(e=>(e.terpenes||[]).forEach(t=>{if(!bdTerpAgg[t])bdTerpAgg[t]={total:0,count:0};bdTerpAgg[t].total+=e.rating;bdTerpAgg[t].count++;}));
  const bdTerpRanked=Object.entries(bdTerpAgg).map(([name,d])=>({name,avg:+(d.total/d.count).toFixed(1),count:d.count})).sort((a,b)=>b.avg-a.avg).slice(0,5);
  const bedtimeSessionNotes=allCops.filter(c=>c.session?.bedtime&&c.session?.notes&&c.session.notes.trim().length>0).map(c=>({id:"session-"+c.id,strainName:c.strainName,strainType:c.type,note:c.session.notes,date:c.session?.date||c.date}));
  const bedtimeExpNotes=strains.flatMap(s=>s.cops.flatMap(c=>(c.experiences||[]).filter(e=>e.bedtime&&e.note&&e.note.trim().length>0).map(e=>({...e,id:"exp-"+e.id,strainName:s.name,strainType:c.type}))));
  const bedtimeExps=[...bedtimeSessionNotes,...bedtimeExpNotes];

  // Intent
  const intentCounts={asleep:0,awake:0,adventure:0};const intentRatings={asleep:[],awake:[],adventure:[]};
  allCops.forEach(c=>{const i=c.intent;if(i&&intentCounts[i]!==undefined){intentCounts[i]++;if((c.session?.rating||0)>0)intentRatings[i].push(c.session.rating);}});
  const intentAvgs={};Object.entries(intentRatings).forEach(([k,r])=>{intentAvgs[k]=r.length>0?(r.reduce((a,b)=>a+b,0)/r.length).toFixed(1):"—";});
  const intentTerpsMap={};["asleep","awake","adventure"].forEach(k=>{const cops=allCops.filter(c=>c.intent===k);const t={};cops.forEach(c=>(c.terpenes||[]).forEach(terp=>{t[terp]=(t[terp]||0)+1;}));intentTerpsMap[k]=Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,3);});

  // Bedtime wrong call terps
  const wrongCallTerps={};wrongCalls.forEach(e=>(e.terpenes||[]).forEach(t=>{wrongCallTerps[t]=(wrongCallTerps[t]||0)+1;}));
  const wcTerpSuspect=Object.entries(wrongCallTerps).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1])[0];

  // Theme
  const IS={bg:"#F2EDE4",paper:"#EDE6D9",postBg:"#F8F4ED",darkBg:"#1A1208",border:"#D4C9B4",text:"#2A1F14",muted:"#7A6A52",amber:"#8B5E1A",amberLight:"#C9A84C"};

  // Feed posts config
  const feedPosts=[
    {id:"terp",account:"@terp.talk",emoji:"🌿",color:"#8B5E1A",bg:"rgba(139,94,26,0.1)",borderColor:"rgba(139,94,26,0.2)",tagline:"your terpene patterns",
      body:topTerp?<p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}><strong>{topTerp[0].toLowerCase()}</strong> might be your anchor terp. it shows up in <strong>{topTerp[1]} of {totalSessions}</strong> sessions with a <strong>{Math.round((terpCopAgain[topTerp[0]]?.yes||0)/(terpCopAgain[topTerp[0]]?.total||1)*100)}% cop-again rate</strong> — the most consistent signal in your data.</p>:null,
      extra:<div style={{marginTop:4}}>{terpEntries.slice(0,4).map(([terp,count])=>{const avg=terpRatings[terp]?(terpRatings[terp].reduce((a,b)=>a+b,0)/terpRatings[terp].length).toFixed(1):"—";return(<div key={terp} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}><span style={{fontSize:10,color:IS.muted,width:84,flexShrink:0}}>{terp.toLowerCase()}</span><div style={{flex:1,height:3,background:"#DDD5C4",borderRadius:2}}><div style={{height:3,background:IS.amberLight,borderRadius:2,width:`${(count/maxTerpCount)*100}%`}}/></div><span style={{fontSize:9,color:"#9A8A72",width:52,textAlign:"right"}}>{count}x · {avg}★</span></div>);})}</div>,
      hasProfile:true,timestamp:"just now"},
    {id:"mix",account:"@the.mix",emoji:"🎛️",color:"#6B4A6B",bg:"rgba(107,74,107,0.1)",borderColor:"rgba(107,74,107,0.2)",tagline:"your mix activity",
      body:uniqueMixes.length>0?<p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}>your <strong>mixes are {mixesBetter?"outrating":"close to"} your solos</strong>. reviewed mixes avg <strong>{mixAvg}</strong> vs solo sessions at <strong>{soloAvg}</strong>{mixesBetter?" — those intentional 50/50s are hitting harder than going it alone.":"."}</p>:<p style={{fontSize:12.5,color:IS.muted,lineHeight:1.55,margin:"0 0 8px"}}>log more mix reviews to unlock mix insights.</p>,
      tags:uniqueMixes.length>0?[{label:`${uniqueMixes.length} reviewed`,color:"#6B4A6B",bg:"rgba(107,74,107,0.1)",border:"rgba(107,74,107,0.2)"},{label:`${mixAvg} mix avg`,color:"#6B4A6B",bg:"rgba(107,74,107,0.1)",border:"rgba(107,74,107,0.2)"},{label:`${soloAvg} solo avg`,color:"#6B4A6B",bg:"rgba(107,74,107,0.1)",border:"rgba(107,74,107,0.2)"}]:null,
      hasProfile:true,timestamp:"new",isNew:true},
    {id:"outdoor",account:"@outside.hours",emoji:"🌤️",color:"#3A6B2A",bg:"rgba(58,107,42,0.1)",borderColor:"rgba(58,107,42,0.2)",tagline:"your outdoor sessions",
      body:outdoorCops.length>0?<p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}><strong>outdoor is your {Number(outdoorAvg)>=Number(indoorAvg)?"highest-rated":"lower-rated"} context</strong>. when you're outside, avg rating {Number(outdoorAvg)>Number(indoorAvg)?"jumps to":"sits at"} <strong>{outdoorAvg}</strong> vs <strong>{indoorAvg}</strong> indoor.</p>:<p style={{fontSize:12.5,color:IS.muted,lineHeight:1.55,margin:"0 0 8px"}}>no outdoor sessions logged yet.</p>,
      tags:outdoorCops.length>0?[{label:`outdoor · ${outdoorAvg} avg`,color:"#3A6B2A",bg:"rgba(58,107,42,0.1)",border:"rgba(58,107,42,0.2)"},{label:`indoor · ${indoorAvg} avg`,color:IS.muted,bg:"rgba(42,31,20,0.06)",border:"rgba(42,31,20,0.12)"}]:null,
      hasProfile:true,timestamp:"Jun 27"},
    {id:"nightnight",account:"@night.night",emoji:"🌙",color:"#5B4A7A",bg:"rgba(91,74,122,0.1)",borderColor:"rgba(91,74,122,0.2)",tagline:"your bedtime sessions",
      body:allBedtime.length>0?(wcTerpSuspect?<p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}>heads up — <strong>{wcTerpSuspect[0].toLowerCase()} showed up in {wcTerpSuspect[1]} wrong calls</strong>. might be keeping you wired when you're trying to wind down.</p>:<p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}>you've logged <strong>{allBedtime.length} bedtime session{allBedtime.length!==1?"s":""}</strong> — <strong>{goodCalls.length} good call{goodCalls.length!==1?"s":""}</strong> and <strong>{wrongCalls.length} wrong call{wrongCalls.length!==1?"s":""}</strong>.</p>):<p style={{fontSize:12.5,color:IS.muted,lineHeight:1.55,margin:"0 0 8px"}}>no bedtime sessions yet — toggle 🌙 when logging.</p>,
      tags:allBedtime.length>0?[{label:`${wrongCalls.length} wrong call${wrongCalls.length!==1?"s":""}`,color:"#8B3A2A",bg:"rgba(193,90,74,0.1)",border:"rgba(193,90,74,0.2)"},{label:`${goodCalls.length} good call${goodCalls.length!==1?"s":""}`,color:"#3A6B2A",bg:"rgba(58,107,42,0.1)",border:"rgba(58,107,42,0.2)"}]:null,
      hasProfile:true,timestamp:"Jun 22"},
    {id:"label",account:"@the.label",emoji:"🏷️",color:"#8B5E1A",bg:"rgba(139,94,26,0.1)",borderColor:"rgba(139,94,26,0.2)",tagline:"brands · sources · grow types",
      body:<p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}><strong>{Number(tlAvg)>=Number(dispAvg)?"TL is outperforming dispensary":"dispensary is outperforming TL"}</strong> right now — TL avg <strong>{tlAvg}</strong> vs dispensary avg <strong>{dispAvg}</strong>.</p>,
      tags:[{label:`TL · ${tlAvg} avg`,color:"#8B5E1A",bg:"rgba(139,94,26,0.1)",border:"rgba(139,94,26,0.2)"},{label:`dispensary · ${dispAvg} avg`,color:IS.muted,bg:"rgba(42,31,20,0.06)",border:"rgba(42,31,20,0.12)"}],
      hasProfile:true,timestamp:"Jun 20"},
  ];

  // Pinned posts data
  const bodyTypePost={
    id:"bodytype",account:"@body.type",emoji:"⚗️",color:IS.muted,tagline:"indica · sativa · hybrid",
    summary:<><p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}>{fiveStarTypes.length>0?<>every <strong>5-star you've logged is {fiveStarTypes.map(t=>t.toLowerCase()).join(" or ")}</strong>. {fiveStarTypes.length===1&&typeCounts[fiveStarTypes[0]]>0?"that's your sweet spot.":`nothing else has hit that ceiling.`}</>:<>your type breakdown is building. keep logging.</>}</p>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{["Hybrid","Indica","Sativa"].filter(t=>typeCounts[t]>0).map(t=><span key={t} style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:"rgba(42,31,20,0.06)",color:IS.muted,border:"1px solid rgba(42,31,20,0.12)"}}>{t.toLowerCase()} · {typeAvgs[t]}</span>)}</div></>,
    expanded:<><p style={{fontSize:8,letterSpacing:1,textTransform:"uppercase",color:"#B8A88A",margin:"0 0 7px"}}>full breakdown</p>
      {["Hybrid","Indica","Sativa"].map(t=>{const count=typeCounts[t];const avg=typeAvgs[t];return(<div key={t} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,marginBottom:4,background:`${typeColor(t)}10`,border:`1px solid ${typeColor(t)}20`}}><div style={{width:3,height:16,borderRadius:1,background:typeColor(t)}}/><span style={{fontSize:12,fontWeight:500,color:IS.text,flex:1}}>{t.toLowerCase()}</span><span style={{fontSize:10,color:IS.muted}}>{count} cop{count!==1?"s":""}</span><span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:IS.amber,marginLeft:4}}>{avg}</span></div>);})}</>
  };
  const onPurposePost={
    id:"onpurpose",account:"@on.purpose",emoji:"🎯",color:"#3A6B2A",tagline:"your intent breakdown",
    summary:<><p style={{fontSize:12.5,color:IS.text,lineHeight:1.55,margin:"0 0 8px"}}>your <strong>asleep intent is your highest-rated</strong> at <strong>{intentAvgs.asleep}</strong> avg — you're really dialing in what you reach for at night.</p>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}><span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:"rgba(123,107,158,0.1)",color:"#5B4A7A",border:"1px solid rgba(123,107,158,0.2)"}}>🌙 asleep · {intentAvgs.asleep}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:"rgba(201,168,76,0.1)",color:"#8B6A1A",border:"1px solid rgba(201,168,76,0.2)"}}>☀️ awake · {intentAvgs.awake}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:"rgba(107,143,90,0.1)",color:"#3A6B2A",border:"1px solid rgba(107,127,90,0.2)"}}>🏕️ adventure · {intentAvgs.adventure}</span></div></>,
    expanded:<><p style={{fontSize:8,letterSpacing:1,textTransform:"uppercase",color:"#B8A88A",margin:"0 0 7px"}}>full breakdown</p>
      {[{key:"asleep",icon:"🌙",color:"#5B4A7A",bg:"rgba(123,107,158,0.1)",border:"rgba(123,107,158,0.18)"},{key:"awake",icon:"☀️",color:"#8B6A1A",bg:"rgba(201,168,76,0.08)",border:"rgba(201,168,76,0.15)"},{key:"adventure",icon:"🏕️",color:"#3A6B2A",bg:"rgba(107,127,90,0.08)",border:"rgba(107,127,90,0.15)"}].map(({key,icon,color,bg,border})=>{
        const terps=intentTerpsMap[key]||[];return(<div key={key} style={{borderRadius:7,padding:"8px 10px",marginBottom:4,background:bg,border:`1px solid ${border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:terps.length>0?4:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:13}}>{icon}</span><span style={{fontSize:13,fontWeight:500,color:IS.text}}>{key}</span><span style={{fontSize:10,color:IS.muted}}>{intentCounts[key]} cop{intentCounts[key]!==1?"s":""}</span></div>
            <p style={{fontFamily:"'Playfair Display',serif",fontSize:17,color,margin:0}}>{intentAvgs[key]}</p>
          </div>
          {terps.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{terps.map(([t])=><span key={t} style={{fontSize:8,padding:"2px 5px",borderRadius:4,background:bg,color,border:`1px solid ${border}`}}>{t.toLowerCase()}</span>)}</div>}
        </div>);})}</>
  };

  // Profile page data
  const terpProfile=<div>
    <p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>terpene affinity — pure</p>
    {terpEntries.map(([terp,count])=>{const avg=terpRatings[terp]?(terpRatings[terp].reduce((a,b)=>a+b,0)/terpRatings[terp].length).toFixed(1):"—";return(<div key={terp} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:IS.text}}>{terp.toLowerCase()}</span><span style={{fontSize:10,color:IS.muted}}>{count}x · {avg} avg</span></div><div style={{height:4,background:"#DDD5C4",borderRadius:2}}><div style={{height:4,background:IS.amberLight,borderRadius:2,width:`${(count/maxTerpCount)*100}%`}}/></div></div>);})}
    {terpEntries.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"20px 0 10px"}}>cop again rates</p>{terpEntries.filter(([t])=>terpCopAgain[t]?.total>0).map(([terp])=>{const ca=terpCopAgain[terp];const pct=Math.round(ca.yes/ca.total*100);return(<div key={terp+"ca"} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:IS.text}}>{terp.toLowerCase()}</span><span style={{fontSize:10,color:IS.muted}}>{pct}%</span></div><div style={{height:3,background:"#DDD5C4",borderRadius:2}}><div style={{height:3,background:"#4A6B3A",borderRadius:2,width:`${pct}%`}}/></div></div>);})}</>}
  </div>;

  const getSoloRating=(strainId)=>{const s=strains.find(x=>x.id===strainId);if(!s)return null;const cop=s.cops.find(c=>c.session?.rating);return cop?cop.session.rating:null;};
  const getStrainType=(name)=>{const s=strains.find(x=>x.name===name);return s?.cops?.[s.cops.length-1]?.type||null;};
  const peekByName=(name)=>{const s=strains.find(x=>x.name===name);if(s&&onPeek)onPeek(s);};
  const mixProfile=<div>
    <p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>reviewed mixes</p>
    {uniqueMixes.length===0&&<p style={{fontSize:12,color:IS.muted}}>no reviewed mixes yet</p>}
    {uniqueMixes.map(m=>{const isOpen=expandedMix===m.id;const pName=m.primaryStrain||m.strainName;const wName=m.withStrain;const pSolo=getSoloRating(m.primaryStrainId);const wSolo=getSoloRating(m.withStrainId);const pType=getStrainType(pName);const wType=getStrainType(wName);const soloAvg=pSolo&&wSolo?((pSolo+wSolo)/2):null;const mixRating=m.rating||0;const delta=soloAvg?((mixRating-soloAvg)).toFixed(1):null;return(<div key={m.id} style={{background:isOpen?"rgba(107,74,107,0.1)":"rgba(107,74,107,0.08)",borderRadius:8,marginBottom:6,border:isOpen?"1px solid rgba(107,74,107,0.25)":"1px solid rgba(107,74,107,0.15)",overflow:"hidden"}}>
      <div onClick={()=>setExpandedMix(isOpen?null:m.id)} style={{padding:"10px 12px",cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:m.vibeTags?.length>0?4:0}}>
          <span style={{fontSize:12,fontWeight:500,color:IS.text}}>{pName} x {wName}</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=m.rating} size={11} color="#6B4A6B"/>)}</div>
            <span style={{fontSize:10,color:"rgba(107,74,107,0.4)"}}>{isOpen?"↑":"↓"}</span>
          </div>
        </div>
        {m.vibeTags?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{m.vibeTags.slice(0,4).map(v=><span key={v} style={{fontSize:9,padding:"2px 5px",borderRadius:4,background:"rgba(107,74,107,0.1)",color:"#6B4A6B",border:"0.5px solid rgba(107,74,107,0.2)"}}>{v.toLowerCase()}</span>)}</div>}
      </div>
      {isOpen&&<div style={{borderTop:"0.5px solid rgba(107,74,107,0.15)",padding:"12px"}}>
        {m.notes&&<p style={{fontSize:11,color:IS.text,margin:"0 0 12px",lineHeight:1.5}}>{m.notes}</p>}
        <p style={{fontSize:9,letterSpacing:0.5,textTransform:"uppercase",color:"rgba(107,74,107,0.5)",margin:"0 0 8px"}}>solo vs mixed</p>
        {[{name:pName,type:pType,solo:pSolo,id:m.primaryStrainId},{name:wName,type:wType,solo:wSolo,id:m.withStrainId}].map(s=><div key={s.name} style={{background:"rgba(107,74,107,0.06)",borderRadius:8,padding:"10px 12px",marginBottom:6,border:"0.5px solid rgba(107,74,107,0.1)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span onClick={(e)=>{e.stopPropagation();peekByName(s.name);}} style={{fontSize:11,fontWeight:500,color:IS.text,cursor:"pointer",textDecoration:"underline",textDecorationColor:"rgba(107,74,107,0.3)",textUnderlineOffset:2,textDecorationThickness:"0.5px"}}>{s.name}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {s.type&&<span style={{fontSize:9,color:IS.muted}}>{s.type.toLowerCase()}</span>}
              <span style={{fontSize:15,color:s.solo?IS.text:"rgba(107,74,107,0.3)"}}>{s.solo||"—"}</span>
            </div>
          </div>
        </div>)}
        {soloAvg!==null&&<div style={{background:"rgba(107,74,107,0.08)",borderRadius:8,padding:"10px 12px",marginTop:2,border:"0.5px solid rgba(107,74,107,0.15)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{textAlign:"center"}}><p style={{fontSize:8,color:IS.muted,margin:"0 0 1px"}}>solo avg</p><p style={{fontSize:17,color:"rgba(107,74,107,0.5)",margin:0}}>{soloAvg.toFixed(1)}</p></div>
              <span style={{color:"rgba(107,74,107,0.25)",fontSize:10}}>→</span>
              <div style={{textAlign:"center"}}><p style={{fontSize:8,color:IS.muted,margin:"0 0 1px"}}>mixed</p><p style={{fontSize:17,color:IS.text,margin:0}}>{mixRating.toFixed(1)}</p></div>
            </div>
            {delta&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:Number(delta)>=0?"rgba(90,138,74,0.1)":"rgba(193,90,74,0.1)",color:Number(delta)>=0?"#5A8A4A":"#8B3A2A"}}>{Number(delta)>=0?"+":""}{delta} {Number(delta)>=0?"↑":"↓"}</span>}
          </div>
        </div>}
      </div>}
    </div>);})}
  </div>;

  const outdoorProfile=<div>
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      <div style={{flex:1,background:"rgba(58,107,42,0.08)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(58,107,42,0.15)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#3A6B2A",margin:0}}>{outdoorAvg}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>outdoor avg</p></div>
      <div style={{flex:1,background:"rgba(42,31,20,0.05)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(42,31,20,0.1)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:IS.amber,margin:0}}>{indoorAvg}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>indoor avg</p></div>
    </div>
    {topOutdoorTerps.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>outdoor terpenes</p>{topOutdoorTerps.map(([t,c])=><div key={t} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:IS.text}}>{t.toLowerCase()}</span><span style={{fontSize:10,color:IS.muted}}>{c}x</span></div><div style={{height:3,background:"#DDD5C4",borderRadius:2}}><div style={{height:3,background:"#4A6B3A",borderRadius:2,width:`${(c/topOutdoorTerps[0][1])*100}%`}}/></div></div>)}</>}
    {topOutdoorVibes.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>outdoor vibes</p><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{topOutdoorVibes.map(([v,c])=><span key={v} style={{fontSize:9,padding:"2px 8px",borderRadius:6,background:"rgba(58,107,42,0.08)",color:"#3A6B2A",border:"0.5px solid rgba(58,107,42,0.2)"}}>{v.toLowerCase()} ({c})</span>)}</div></>}
    {outdoorCops.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>best outdoor strains</p>{outdoorCops.sort((a,b)=>(b.session?.rating||0)-(a.session?.rating||0)).map(c=>{const s=strains.find(x=>x.cops.some(cc=>cc.id===c.id));return(<div key={c.id} onClick={()=>s&&onPeek&&onPeek(s)} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,background:"rgba(42,31,20,0.04)",borderRadius:7,padding:"7px 10px",border:"1px solid #E0D8C8",cursor:s?"pointer":"default"}}><div style={{width:3,height:14,borderRadius:1,background:typeColor(c.type)}}/><span style={{fontSize:12,fontWeight:500,color:IS.text,flex:1}}>{c.strainName}</span><div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=c.session?.rating} size={12} color="#4A6B3A"/>)}</div></div>);})}  </>}
  </div>;

  const nightProfile=<div>
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      <div style={{flex:1,background:"rgba(91,74,122,0.1)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(91,74,122,0.18)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#5B4A7A",margin:0}}>{allBedtime.length}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>blunts</p></div>
      <div style={{flex:1,background:"rgba(58,107,42,0.08)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(58,107,42,0.15)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#3A6B2A",margin:0}}>{goodCalls.length}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>good calls</p></div>
      <div style={{flex:1,background:"rgba(193,90,74,0.08)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(193,90,74,0.15)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#8B3A2A",margin:0}}>{wrongCalls.length}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>wrong calls</p></div>
    </div>
    {goodCalls.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>🌙 best bedtime strains</p>{[...goodCalls].sort((a,b)=>b.rating-a.rating).slice(0,5).map((e,i)=>{const s=e.type==="session"?strains.find(x=>x.cops.some(c=>c.id===e.id)):null;return(<div key={i} onClick={()=>s&&onPeek&&onPeek(s)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,padding:"7px 10px",background:"rgba(91,74,122,0.08)",borderRadius:7,border:"0.5px solid rgba(91,74,122,0.15)",cursor:s?"pointer":"default"}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:12,color:"#5B4A7A",fontWeight:500}}>{e.name}</span>{e.type==="mix"&&<span style={{fontSize:9,color:IS.muted}}>mix</span>}</div><div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=e.rating} size={12} color="#5B4A7A"/>)}</div></div>);})} </>}
    {bdTerpRanked.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>bedtime terpene affinity</p>{bdTerpRanked.map((t,i)=><div key={t.name} style={{marginBottom:i<bdTerpRanked.length-1?8:0}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:IS.text}}>{t.name.toLowerCase()}</span><span style={{fontSize:10,color:"#5B4A7A"}}>{t.avg} avg · {t.count}x</span></div><div style={{height:3,background:"#DDD5C4",borderRadius:2}}><div style={{height:3,background:"#5B4A7A",borderRadius:2,width:`${(t.avg/5)*100}%`}}/></div></div>)}</>}
    {wrongCalls.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>😬 wrong call list</p>{wrongCalls.map((e,i)=>{const reasons=[];if(e.spectrums?.sw>0)reasons.push("hit active");(e.vibeTags||[]).filter(t=>WRONG_VIBES.includes(t)).forEach(v=>reasons.push(v.toLowerCase()));return(<div key={i} style={{background:"rgba(193,90,74,0.07)",borderRadius:7,padding:"8px 10px",marginBottom:5,border:"0.5px solid rgba(193,90,74,0.15)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:reasons.length>0?4:0}}><span style={{fontSize:12,fontWeight:500,color:IS.text}}>{e.name}</span><div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=e.rating} size={11} color="#8B3A2A"/>)}</div></div>{reasons.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{reasons.map((r,ri)=><span key={ri} style={{fontSize:9,background:"rgba(193,90,74,0.1)",color:"#8B3A2A",padding:"2px 6px",borderRadius:4,border:"0.5px solid rgba(193,90,74,0.2)"}}>{r}</span>)}</div>}</div>);})} </>}
    {bedtimeExps.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>bedtime notes</p>
      <div style={{background:"rgba(91,74,122,0.04)",borderRadius:10,padding:8,border:"0.5px solid rgba(91,74,122,0.1)"}}>
        {bedtimeExps.map(e=>{const isOpen=expandedBedtimeNote===e.id;return(<div key={e.id} style={{background:isOpen?"rgba(91,74,122,0.09)":"rgba(91,74,122,0.06)",borderRadius:7,marginBottom:5,border:isOpen?"1px solid rgba(91,74,122,0.22)":"0.5px solid rgba(91,74,122,0.12)",overflow:"hidden"}}>
          <div onClick={()=>setExpandedBedtimeNote(isOpen?null:e.id)} style={{padding:"9px 10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:500,color:"#5B4A7A"}}>{e.strainName}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:9,color:IS.muted}}>{e.date}</span>
              <span style={{fontSize:10,color:"rgba(91,74,122,0.4)"}}>{isOpen?"↑":"↓"}</span>
            </div>
          </div>
          {isOpen&&e.note&&<p style={{fontSize:11,color:IS.text,margin:0,lineHeight:1.5,padding:"0 10px 10px"}}>{e.note}</p>}
        </div>);})}
      </div>
    </>}
  </div>;

  const labelProfile=<div>
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      <div style={{flex:1,background:"rgba(139,94,26,0.08)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(139,94,26,0.15)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:IS.amber,margin:0}}>{tlAvg}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>TL avg</p><p style={{fontSize:8,color:"#B8A88A",margin:"1px 0 0"}}>{tlCops.length} cops</p></div>
      <div style={{flex:1,background:"rgba(42,31,20,0.05)",borderRadius:8,padding:10,textAlign:"center",border:"1px solid rgba(42,31,20,0.1)"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:IS.amber,margin:0}}>{dispAvg}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>dispensary avg</p><p style={{fontSize:8,color:"#B8A88A",margin:"1px 0 0"}}>{dispCops.length} cops</p></div>
    </div>
    {brandEntries.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>dispensary brands</p>{brandEntries.map(([brand,count])=>{const avg=(brandRatings[brand].reduce((a,b)=>a+b,0)/brandRatings[brand].length).toFixed(1);return(<div key={brand} style={{background:"rgba(42,31,20,0.04)",borderRadius:7,padding:"9px 12px",marginBottom:5,border:"1px solid #E0D8C8"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:500,color:IS.text}}>🏷️ {brand}</span><span style={{fontSize:12,fontWeight:500,color:IS.amber}}>{avg}</span></div><p style={{fontSize:10,color:IS.muted,margin:"2px 0 0"}}>{count} cop{count!==1?"s":""}</p></div>);})}</>}
    {growEntries.length>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>grow type preference</p>{growEntries.map(([grow,count],i)=>{const avg=(growRatings[grow].reduce((a,b)=>a+b,0)/count).toFixed(1);const ca=growCopAgain[grow]||{yes:0,maybe:0,no:0};return(<div key={grow} style={{background:"rgba(42,31,20,0.04)",borderRadius:7,padding:"9px 12px",marginBottom:5,border:"1px solid #E0D8C8"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,fontWeight:500,color:IS.text}}>{grow.toLowerCase()}</span><div style={{display:"flex",alignItems:"center",gap:5}}>{i===0&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:4,background:IS.amberLight,color:"#FFF7E6",fontWeight:500}}>top</span>}<span style={{fontSize:12,fontWeight:500,color:IS.amber}}>{avg} avg</span></div></div><div style={{display:"flex",gap:3}}><span style={{flex:1,padding:"3px 6px",borderRadius:5,background:"rgba(74,107,58,0.1)",color:"#3A6B2A",fontSize:9,textAlign:"center",border:"0.5px solid rgba(74,107,58,0.2)"}}>{ca.yes} yes</span><span style={{flex:1,padding:"3px 6px",borderRadius:5,background:"rgba(193,127,74,0.1)",color:"#8B5E1A",fontSize:9,textAlign:"center",border:"0.5px solid rgba(193,127,74,0.2)"}}>{ca.maybe} maybe</span><span style={{flex:1,padding:"3px 6px",borderRadius:5,background:"rgba(42,31,20,0.08)",color:IS.muted,fontSize:9,textAlign:"center",border:"0.5px solid rgba(42,31,20,0.15)"}}>{ca.no} no</span></div></div>);})}</>}
    {totalLabeled>0&&<><p style={{fontSize:10,fontWeight:500,color:IS.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"14px 0 8px"}}>label vs reality</p><p style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:IS.amber,margin:"0 0 4px"}}>{labelPct}%</p><p style={{fontSize:11,color:IS.muted,margin:"0 0 10px"}}>of strains smoke as labeled ({totalMatched} of {totalLabeled})</p>{["Sativa","Indica","Hybrid"].filter(t=>labelMatches[t].total>0).map(t=>{const pct=Math.round(labelMatches[t].match/labelMatches[t].total*100);return(<div key={t} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:IS.text}}>{t.toLowerCase()}</span><span style={{fontSize:10,color:IS.muted}}>{pct}%</span></div><div style={{height:3,background:"#DDD5C4",borderRadius:2}}><div style={{height:3,background:typeColor(t),borderRadius:2,width:`${pct}%`}}/></div></div>);})}</>}
  </div>;

  const profileContent={terp:terpProfile,mix:mixProfile,outdoor:outdoorProfile,nightnight:nightProfile,label:labelProfile};
  const profileTitles={terp:"@terp.talk",mix:"@the.mix",outdoor:"@outside.hours",nightnight:"@night.night",label:"@the.label"};
  const profileEmojis={terp:"🌿",mix:"🎛️",outdoor:"🌤️",nightnight:"🌙",label:"🏷️"};
  const profileColors={terp:"#8B5E1A",mix:"#6B4A6B",outdoor:"#3A6B2A",nightnight:"#5B4A7A",label:"#8B5E1A"};
  const profileTaglines={terp:"your terpene patterns",mix:"your mix activity",outdoor:"your outdoor sessions",nightnight:"your bedtime sessions",label:"brands · sources · grow types"};

  const PostCard=({post,isPinned=false,showDismissed=false})=>{
    const isSaved=saved.some(s=>s.id===post.id);
    const isConfirmed=saveConfirm===post.id;
    const isDismissed=dismissed.includes(post.id);
    if(isDismissed&&!isPinned&&!showDismissed)return null;
    return(<div style={{background:IS.postBg,borderBottom:`1px solid ${IS.border}`,padding:"12px 14px",position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
        <div onClick={()=>post.hasProfile&&setProfileOpen(post.id)} style={{width:34,height:34,borderRadius:"50%",background:IS.darkBg,border:`1px solid ${post.borderColor||IS.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,cursor:post.hasProfile?"pointer":"default"}}>{post.emoji}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center"}}>
            {post.hasProfile?<button onClick={()=>setProfileOpen(post.id)} style={{fontSize:12,fontWeight:600,color:post.color,background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",textUnderlineOffset:2,textDecorationColor:`${post.color}50`,textDecorationThickness:"0.5px"}}>{post.account}</button>:<span style={{fontSize:12,fontWeight:600,color:IS.muted}}>{post.account}</span>}
            {post.isNew&&<span style={{width:6,height:6,borderRadius:"50%",background:IS.amberLight,display:"inline-block",marginLeft:5,verticalAlign:"middle"}}/>}
            <span style={{fontSize:10,color:"#9A8A72",marginLeft:5}}>{post.timestamp}</span>
          </div>
          <p style={{fontSize:9,color:"#9A8A72",margin:"1px 0 0"}}>{post.tagline}</p>
        </div>
        {!isPinned&&!showDismissed&&<button onClick={()=>setDotsOpen(dotsOpen===post.id?null:post.id)} style={{fontSize:14,color:"#B8A88A",background:"none",border:"none",cursor:"pointer",padding:"0 3px",letterSpacing:1,lineHeight:1}}>···</button>}
      </div>
      {post.body}
      {post.extra}
      {post.tags&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:isPinned?6:0}}>{post.tags.map((tag,i)=><span key={i} style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:tag.bg,color:tag.color,border:`1px solid ${tag.border}`}}>{tag.label}</span>)}</div>}
      {isPinned&&<div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={()=>togglePinned(post.id)} style={{fontSize:9,color:IS.muted,background:"none",border:"none",fontFamily:"inherit",cursor:"pointer",padding:0}}>{expandedPinned[post.id]?"see less ↑":"see more ↓"}</button></div>}
      {isPinned&&expandedPinned[post.id]&&post.expanded&&<div style={{borderTop:`1px solid ${IS.border}`,paddingTop:10,marginTop:8}}>{post.expanded}</div>}
      {dotsOpen===post.id&&!isPinned&&!showDismissed&&<div style={{background:IS.darkBg,borderRadius:8,padding:"4px 0",border:`0.5px solid rgba(212,184,136,0.2)`,marginTop:6,boxShadow:`0 4px 16px rgba(0,0,0,0.25)`}}>
        {!isSaved&&<div onClick={()=>savePost({...post,summaryText:post.account+" post",emoji:post.emoji||"",account:post.account,tagline:post.tagline})} style={{padding:"9px 14px",fontSize:12,color:"rgba(232,224,212,0.75)",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>🔖 <span>save this</span></div>}
        {isSaved&&<div style={{padding:"9px 14px",fontSize:12,color:"rgba(212,184,136,0.5)",display:"flex",alignItems:"center",gap:8}}>🔖 <span>already saved</span></div>}
        <div style={{height:"0.5px",background:"rgba(212,184,136,0.1)",margin:"2px 0"}}/>
        <div onClick={()=>dismiss(post.id)} style={{padding:"9px 14px",fontSize:12,color:"rgba(193,90,74,0.8)",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>✕ <span>dismiss</span></div>
      </div>}
      {isConfirmed&&<div style={{fontSize:10,color:IS.amber,background:"rgba(201,168,76,0.1)",border:`0.5px solid rgba(201,168,76,0.25)`,borderRadius:6,padding:"4px 10px",marginTop:6,display:"inline-block"}}>🔖 saved to your profile</div>}
    </div>);
  };

  // Profile page view
  const renderProfileView=()=>{
    if(!profileOpen)return null;
    if(profileOpen!=="you"){const pId=profileOpen;return(<div style={{background:IS.bg,color:IS.text}}>
      {!desktopPanel&&<div style={{background:IS.darkBg,padding:"12px 16px",borderBottom:`2px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#E8D9B8"}}>insights</span><span style={{fontSize:9,color:"rgba(212,184,136,0.5)",letterSpacing:2,textTransform:"uppercase",marginLeft:7}}>by cLOUD</span></div></div>}
      <div style={{background:IS.paper,padding:"10px 14px",borderBottom:`1px solid ${IS.border}`,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setProfileOpen(false)}><span style={{fontSize:13,color:IS.amber}}>←</span><span style={{fontSize:11,color:IS.amber,fontWeight:500}}>back to feed</span></div>
      <div style={{background:IS.paper,padding:"14px 16px 0",borderBottom:`1px solid ${IS.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:IS.darkBg,border:`2px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{profileEmojis[pId]}</div>
          <div><p style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:IS.text,margin:"0 0 1px"}}>{profileTitles[pId].slice(1)}</p><p style={{fontSize:10,color:IS.amber,margin:"0 0 3px",fontWeight:500}}>{profileTitles[pId]}</p><p style={{fontSize:10,color:IS.muted,margin:0}}>{profileTaglines[pId]}</p></div>
        </div>
      </div>
      <div style={{padding:"14px 16px 0",maxWidth:480,margin:"0 auto"}}>{profileContent[pId]}</div>
      <div style={{background:IS.darkBg,padding:"6px 14px",borderBottom:`1px solid #2E2010`,marginTop:0}}><span style={{fontSize:9,fontWeight:500,color:IS.amberLight,letterSpacing:0.5,textTransform:"uppercase"}}>posts</span></div>
      {feedPosts.filter(p=>p.id===pId).map(p=><PostCard key={p.id} post={p} showDismissed={true}/>)}
      {feedPosts.filter(p=>p.id===pId).length===0&&<div style={{padding:"20px 16px",textAlign:"center"}}><p style={{fontSize:12,color:IS.muted}}>no posts yet</p></div>}
    </div>);}

    // Your profile page
    return(<div style={{background:IS.bg,color:IS.text}}>
      {!desktopPanel&&<div style={{background:IS.darkBg,padding:"12px 16px",borderBottom:`2px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#E8D9B8"}}>insights</span><span style={{fontSize:9,color:"rgba(212,184,136,0.5)",letterSpacing:2,textTransform:"uppercase",marginLeft:7}}>by cLOUD</span></div></div>}
      <div style={{background:IS.paper,padding:"10px 14px",borderBottom:`1px solid ${IS.border}`,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setProfileOpen(false)}><span style={{fontSize:13,color:IS.amber}}>←</span><span style={{fontSize:11,color:IS.amber,fontWeight:500}}>back to feed</span></div>
      <div style={{background:IS.paper,padding:"14px 16px 0",borderBottom:`1px solid ${IS.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <div style={{width:62,height:62,borderRadius:"50%",background:IS.darkBg,border:`2px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:24,color:IS.amberLight,flexShrink:0}}>L</div>
          <div><p style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:IS.text,margin:"0 0 2px"}}>Leonna</p><p style={{fontSize:11,color:IS.amber,margin:"0 0 3px",fontWeight:500}}>cLOUD V2</p><p style={{fontSize:10,color:IS.muted,margin:0}}>{strains.length} strains tracked · hybrid loyalist</p></div>
        </div>
        <div style={{display:"flex",gap:0,border:`1px solid ${IS.border}`,borderRadius:9,overflow:"hidden"}}>
          {[{n:totalSessions,l:"sessions"},{n:avgRating,l:"avg rating",s:"out of 5"},{n:`${copAgainPct}%`,l:"cop again",s:`${copAgainYes} of ${totalSessions}`}].map((st,i)=><div key={i} style={{flex:1,padding:"9px 6px",textAlign:"center",borderRight:i<2?`1px solid ${IS.border}`:"none"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:IS.amberLight,margin:0}}>{st.n}</p><p style={{fontSize:9,color:IS.muted,margin:"2px 0 0"}}>{st.l}</p>{st.s&&<p style={{fontSize:8,color:"#B8A88A",margin:"1px 0 0"}}>{st.s}</p>}</div>)}
        </div>
      </div>
      <div style={{background:IS.darkBg,padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid #2E2010`}}><span style={{fontSize:9,fontWeight:500,color:IS.amberLight,letterSpacing:0.5,textTransform:"uppercase"}}>🔖 saved insights</span><span style={{fontSize:9,color:"rgba(212,184,136,0.4)"}}>{saved.length} saved</span></div>
      <div style={{padding:"0 0 40px",maxWidth:480,margin:"0 auto"}}>
        {saved.length===0&&<div style={{padding:"28px 20px",textAlign:"center"}}><p style={{fontSize:28,margin:"0 0 10px"}}>🔖</p><p style={{fontSize:13,color:IS.muted}}>nothing saved yet</p><p style={{fontSize:11,color:"#B8A88A",marginTop:5}}>tap ··· on any post to save it here</p></div>}
        {saved.map((sp,i)=><div key={i} style={{background:IS.postBg,borderBottom:`1px solid ${IS.border}`,padding:"11px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:IS.darkBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,border:`1px solid ${IS.border}`}}>{sp.emoji}</div>
            <div><p style={{fontSize:11,fontWeight:600,color:profileColors[sp.id]||IS.amber,margin:0}}>{sp.account}</p><p style={{fontSize:9,color:IS.muted,margin:0}}>{sp.tagline}</p></div>
            <span style={{fontSize:9,color:IS.muted,marginLeft:"auto"}}>{sp.savedAt}</span>
          </div>
          <p style={{fontSize:11.5,color:IS.text,lineHeight:1.5,margin:"0 0 6px"}}>{sp.summaryText}</p>
          <button onClick={()=>unsave(sp.id)} style={{fontSize:9,color:"#B8A88A",background:"none",border:"none",fontFamily:"inherit",cursor:"pointer",padding:0}}>remove from saved</button>
        </div>)}
      </div>
      <div style={{background:IS.darkBg,padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid #2E2010`}}><span style={{fontSize:9,fontWeight:500,color:IS.amberLight,letterSpacing:0.5,textTransform:"uppercase"}}>following</span><span style={{fontSize:9,color:"rgba(212,184,136,0.4)"}}>{Object.keys(profileTitles).length} accounts</span></div>
      <div style={{padding:"0 0 40px"}}>
        {Object.keys(profileTitles).map(pId=><div key={pId} onClick={()=>setProfileOpen(pId)} style={{background:IS.postBg,borderBottom:`1px solid ${IS.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:IS.darkBg,border:`1px solid ${IS.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{profileEmojis[pId]}</div>
          <div style={{flex:1}}>
            <p style={{fontSize:12,fontWeight:600,color:profileColors[pId],margin:0}}>{profileTitles[pId].slice(1)}</p>
            <p style={{fontSize:9,color:IS.muted,margin:"1px 0 0"}}>{profileTaglines[pId]}</p>
          </div>
          <span style={{fontSize:11,color:"rgba(212,184,136,0.3)"}}>→</span>
        </div>)}
      </div>
    </div>);
  };

  if(profileOpen&&!desktopPanel)return renderProfileView();

  return(<>
  {desktopPanel?(
    <div style={{background:IS.bg,minHeight:"100%",display:"flex",justifyContent:"center",gap:24,padding:"28px 32px 60px"}} onClick={()=>dotsOpen&&setDotsOpen(null)}>
      {/* Main feed column */}
      <div style={{width:600,flexShrink:0,minWidth:0}}>
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:IS.text}}>insights</div>
          <p style={{fontSize:12,color:IS.muted,margin:"4px 0 0"}}>terpene patterns, mix performance, and session trends — computed from your real data</p>
        </div>
        <div style={{fontSize:10,fontWeight:600,color:IS.amber,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>📌 pinned</div>
        <div style={{border:`1px solid ${IS.border}`,borderRadius:12,overflow:"hidden",marginBottom:24,background:IS.postBg}}>
          <PostCard post={bodyTypePost} isPinned={true}/>
          <PostCard post={onPurposePost} isPinned={true}/>
        </div>
        <div style={{fontSize:10,fontWeight:600,color:IS.amber,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>your feed</div>
        <div style={{border:`1px solid ${IS.border}`,borderRadius:12,overflow:"hidden",background:IS.postBg}}>
          {feedPosts.map(p=><PostCard key={p.id} post={p}/>)}
          {feedPosts.every(p=>dismissed.includes(p.id))&&<div style={{padding:"28px 20px",textAlign:"center"}}><p style={{fontSize:13,color:IS.muted}}>feed is clear — check back after logging more sessions</p></div>}
        </div>
      </div>
      {/* Right rail */}
      <div style={{width:280,flexShrink:0}}>
        <div style={{position:"sticky",top:28}}>
          <div onClick={()=>setProfileOpen("you")} style={{background:IS.paper,borderRadius:12,padding:16,border:`1px solid ${IS.border}`,cursor:"pointer",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:IS.darkBg,border:`1.5px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:19,color:IS.amberLight}}>L</div>
              <div>
                <p style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:IS.text,margin:0}}>Leonna</p>
                <p style={{fontSize:10,color:IS.muted,margin:0}}>{strains.length} strains tracked</p>
              </div>
            </div>
            <div style={{display:"flex",border:`1px solid ${IS.border}`,borderRadius:8,overflow:"hidden"}}>
              {[{n:totalSessions,l:"sessions"},{n:avgRating,l:"avg"},{n:`${copAgainPct}%`,l:"cop again"}].map((st,i)=>(
                <div key={i} style={{flex:1,padding:"8px 4px",textAlign:"center",borderRight:i<2?`1px solid ${IS.border}`:"none"}}>
                  <p style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:IS.amber,margin:0}}>{st.n}</p>
                  <p style={{fontSize:8,color:IS.muted,margin:"2px 0 0"}}>{st.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:IS.paper,borderRadius:12,border:`1px solid ${IS.border}`,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${IS.border}`,fontSize:10,fontWeight:600,color:IS.amber,letterSpacing:0.5,textTransform:"uppercase"}}>following</div>
            {Object.keys(profileTitles).map(pId=>(
              <div key={pId} onClick={()=>setProfileOpen(pId)} style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:`1px solid ${IS.border}`}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:IS.darkBg,border:`1px solid ${IS.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{profileEmojis[pId]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:11,fontWeight:600,color:profileColors[pId],margin:0}}>{profileTitles[pId].slice(1)}</p>
                  <p style={{fontSize:9,color:IS.muted,margin:"1px 0 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{profileTaglines[pId]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ):(
  <div style={{background:IS.bg,minHeight:"100vh",color:IS.text}} onClick={()=>dotsOpen&&setDotsOpen(null)}>
    {/* Logo bar */}
    <div style={{background:IS.darkBg,padding:"12px 16px",borderBottom:`2px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div><span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#E8D9B8"}}>insights</span><span style={{fontSize:9,color:"rgba(212,184,136,0.5)",letterSpacing:2,textTransform:"uppercase",marginLeft:7}}>by cLOUD</span></div>
    </div>
    {/* Your profile card */}
    <div style={{background:IS.paper,padding:"12px 16px",borderBottom:`1px solid ${IS.border}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setProfileOpen("you")}>
      <div style={{width:44,height:44,borderRadius:"50%",background:IS.darkBg,border:`1.5px solid ${IS.amberLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:19,color:IS.amberLight,flexShrink:0}}>L</div>
      <div style={{flex:1}}>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:IS.text,margin:"0 0 1px"}}>Leonna</p>
        <p style={{fontSize:10,color:IS.amber,margin:"0 0 2px",fontWeight:500}}>cLOUD V2</p>
        <p style={{fontSize:10,color:IS.muted,margin:0}}>{strains.length} strains tracked · hybrid loyalist</p>
      </div>
    </div>
    {/* Stats bar */}
    <div style={{background:IS.darkBg,display:"flex",borderBottom:`1px solid #2E2010`}}>
      {[{n:totalSessions,l:"sessions"},{n:avgRating,l:"avg rating"},{n:`${copAgainPct}%`,l:"cop again"}].map((st,i)=><div key={i} style={{flex:1,padding:"8px 6px",textAlign:"center",borderRight:i<2?`1px solid #2E2010`:"none"}}><p style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:IS.amberLight,margin:0}}>{st.n}</p><p style={{fontSize:9,color:"rgba(212,184,136,0.45)",margin:"2px 0 0"}}>{st.l}</p></div>)}
    </div>
    {/* Pinned section */}
    <div style={{background:IS.darkBg,padding:"6px 14px",borderBottom:`1px solid #2E2010`}}><span style={{fontSize:9,fontWeight:500,color:IS.amberLight,letterSpacing:0.5,textTransform:"uppercase"}}>📌 pinned</span></div>
    <PostCard post={bodyTypePost} isPinned={true}/>
    <PostCard post={onPurposePost} isPinned={true}/>
    {/* Feed section */}
    <div style={{background:IS.darkBg,padding:"6px 14px",borderBottom:`1px solid #2E2010`}}><span style={{fontSize:9,fontWeight:500,color:IS.amberLight,letterSpacing:0.5,textTransform:"uppercase"}}>your feed</span></div>
    {feedPosts.map(p=><PostCard key={p.id} post={p}/>)}
    {feedPosts.every(p=>dismissed.includes(p.id))&&<div style={{padding:"28px 20px",textAlign:"center"}}><p style={{fontSize:13,color:IS.muted}}>feed is clear — check back after logging more sessions</p></div>}
  </div>
  )}
  {desktopPanel&&profileOpen&&(<>
    <div onClick={()=>setProfileOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200}}/>
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:420,maxWidth:"90vw",zIndex:201,background:IS.bg,boxShadow:"-8px 0 24px rgba(0,0,0,0.4)",overflowY:"auto",borderLeft:"2.5px solid rgba(232,200,154,0.5)"}}>
      <div style={{background:"linear-gradient(90deg,#2C1D07,#4A2E0A)",padding:"7px 12px",display:"flex",alignItems:"center",gap:8,borderBottom:"2px solid rgba(232,200,154,0.3)",position:"sticky",top:0,zIndex:1}}>
        <div style={{display:"flex",gap:4}}>
          <div onClick={()=>setProfileOpen(false)} style={{width:14,height:14,borderRadius:"50%",border:"1px solid rgba(200,100,100,0.4)",color:"rgba(200,100,100,0.6)",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</div>
          <div style={{width:14,height:14,borderRadius:"50%",border:"1px solid rgba(232,200,154,0.3)",color:"rgba(232,200,154,0.5)",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center"}}>−</div>
          <div style={{width:14,height:14,borderRadius:"50%",border:"1px solid rgba(232,200,154,0.3)",color:"rgba(232,200,154,0.5)",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center"}}>□</div>
        </div>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(232,200,154,0.7)",letterSpacing:1}}>PROFILE</span>
      </div>
      {renderProfileView()}
    </div>
  </>)}
  </>);
}


/* ═══════════════════════════════════════════
   COMPARE PAGE
   ═══════════════════════════════════════════ */
function ComparePage({strains,reups=[],savedComparisons,onSaveComparison,onDeleteComparison,onPeek}){
  const[pickA,setPickA]=useState(null);
  const[pickB,setPickB]=useState(null);
  const[showSaved,setShowSaved]=useState(false);
  const[expandedSaved,setExpandedSaved]=useState(null);
  const[confirmDelete,setConfirmDelete]=useState(null);
  const strainA=strains.find(s=>s.id===pickA);
  const strainB=strains.find(s=>s.id===pickB);
  const copA=strainA?.cops[strainA.cops.length-1];const copB=strainB?.cops[strainB.cops.length-1];
  const sA=copA?.session;const sB=copB?.session;
  const ready=strainA&&strainB&&sA&&sB&&pickA!==pickB;
  const eligible=strains.filter(s=>s.cops.some(c=>c.session));

  // shared re-up detection — checks copIds first, falls back to strainNames
  const sharedReup=ready?(reups.find(r=>{
    if(r.copIds&&r.copIds.length>1&&r.copIds.includes(copA?.id)&&r.copIds.includes(copB?.id))return true;
    if(r.strainNames&&r.strainNames.includes(strainA.name)&&r.strainNames.includes(strainB.name))return true;
    return false;
  })||HISTORICAL_REUPS.find(h=>h.strainNames.includes(strainA.name)&&h.strainNames.includes(strainB.name))):null;

  const D={bg:"#1E1628",card:"rgba(200,184,232,0.05)",border:"rgba(200,184,232,0.08)",text:"#E0D8F0",muted:"rgba(200,184,232,0.4)",accent:"#9B8ABE"};
  const cA="#7B6B9E";const cB="#6B8F5A";

  const CompSpectrum=({left,right,valA,valB})=>(<div style={{marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:D.muted,marginBottom:3}}><span>{left.toLowerCase()}</span><span>{right.toLowerCase()}</span></div>
    <div style={{display:"flex",gap:2}}>{[-3,-2,-1,0,1,2,3].map(n=>{const isA=valA===n;const isB=valB===n;
      return(<div key={n} style={{flex:1,height:24,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",gap:2,background:(isA||isB)?`${isA?cA:cB}15`:D.card,border:`0.5px solid ${(isA||isB)?`${isA?cA:cB}30`:D.border}`}}>
        {isA&&<div style={{width:isB?6:8,height:isB?6:8,borderRadius:"50%",background:cA}}/>}
        {isB&&<div style={{width:isA?6:8,height:isA?6:8,borderRadius:"50%",background:cB}}/>}
        {!isA&&!isB&&<div style={{width:3,height:3,borderRadius:"50%",background:D.border}}/>}
      </div>);
    })}</div>
  </div>);

  const generateVerdict=()=>{
    if(!ready)return null;
    const ratingDiff=sA.rating-sB.rating;const winner=ratingDiff>0?strainA.name:ratingDiff<0?strainB.name:null;
    const bodyA=sA.spectrums?.sw||0;const bodyB=sB.spectrums?.sw||0;
    const mindA=sA.spectrums?.sf||0;const mindB=sB.spectrums?.sf||0;
    let read=winner?`${winner} rated higher overall.`:"rated equally.";
    if(Math.abs(bodyA-bodyB)>=3)read+=` ${bodyA<bodyB?strainA.name:strainB.name} locks you down more.`;
    if(Math.abs(mindA-mindB)>=3)read+=` ${mindA<mindB?strainA.name:strainB.name} is dreamier.`;
    const sharedTerps=(copA?.terpenes||[]).filter(t=>(copB?.terpenes||[]).includes(t));
    if(sharedTerps.length>0)read+=` both share ${sharedTerps.map(t=>t.toLowerCase()).join(", ")}.`;
    return read;
  };

  return(<div style={{background:D.bg,minHeight:"100vh",color:D.text}}><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto"}}>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:400,marginBottom:4,marginTop:20}}>compare</h1>
    <p style={{fontSize:11,color:D.muted,marginBottom:16}}>assign A and B to compare</p>

    {/* Selected indicators */}
    <div style={{display:"flex",gap:8,marginBottom:sharedReup?6:14}}>
      <div style={{flex:1,background:pickA?`${cA}10`:"transparent",borderRadius:8,padding:"8px 12px",border:`1.5px ${pickA?"solid":"dashed"} ${pickA?cA:`${cA}40`}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,fontWeight:500,color:cA,background:`${cA}20`,padding:"2px 8px",borderRadius:4}}>A</span>
        <span style={{fontSize:13,fontWeight:pickA?500:400,color:pickA?D.text:D.muted}}>{strainA?.name||"pick strain A"}</span>
      </div>
      <div style={{flex:1,background:pickB?`${cB}10`:"transparent",borderRadius:8,padding:"8px 12px",border:`1.5px ${pickB?"solid":"dashed"} ${pickB?cB:`${cB}40`}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,fontWeight:500,color:cB,background:`${cB}20`,padding:"2px 8px",borderRadius:4}}>B</span>
        <span style={{fontSize:13,fontWeight:pickB?500:400,color:pickB?D.text:D.muted}}>{strainB?.name||"pick strain B"}</span>
      </div>
    </div>
    {sharedReup&&<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:14,padding:"5px 10px",borderRadius:8,background:"rgba(212,184,136,0.08)",border:"0.5px solid rgba(212,184,136,0.2)"}}>
      <span style={{fontSize:11}}>📦</span>
      <span style={{fontSize:11,color:"#D4B888"}}>same re-up · {sharedReup.date}</span>
    </div>}

    {/* Draft pick list */}
    <div style={{borderRadius:10,overflow:"hidden",border:`0.5px solid ${D.border}`,marginBottom:24,maxHeight:260,overflowY:"auto"}}>
      {eligible.map(s=>{const isA=pickA===s.id;const isB=pickB===s.id;const lc=s.cops[s.cops.length-1];const ls=lc?.session;
        return(<div key={s.id} style={{display:"flex",alignItems:"center",padding:"8px 12px",background:isA?`${cA}08`:isB?`${cB}08`:D.card,borderBottom:`0.5px solid ${D.border}`}}>
          <div style={{width:4,height:20,borderRadius:2,background:typeColor(lc?.type),marginRight:10,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontSize:13,fontWeight:500,color:D.text}}>{s.name}</span>
            <span style={{fontSize:10,color:D.muted,marginLeft:6}}>{lc?.type?.toLowerCase()}{s.intent?` · ${s.intent==="asleep"?"🌙":s.intent==="awake"?"☀️":"🏕️"}`:""} · {ls?.rating||"?"}/5</span>
          </div>
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            <button onClick={()=>setPickA(isA?null:s.id)} style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:isA?500:400,background:isA?cA:D.card,color:isA?"#E8E0D4":D.muted,border:isA?"none":`0.5px solid ${D.border}`}}>A</button>
            <button onClick={()=>setPickB(isB?null:s.id)} style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:isB?500:400,background:isB?cB:D.card,color:isB?"#E8E0D4":D.muted,border:isB?"none":`0.5px solid ${D.border}`}}>B</button>
          </div>
        </div>);
      })}
      {eligible.length===0&&<p style={{padding:16,fontSize:13,color:D.muted,textAlign:"center",margin:0}}>log a first session on a strain to compare</p>}
    </div>

    {ready&&<>
      {/* Spectrums */}
      <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>spectrums</p>
      <div style={{display:"flex",gap:6,marginBottom:8}}><span style={{fontSize:10,display:"flex",alignItems:"center",gap:4,color:D.muted}}><div style={{width:6,height:6,borderRadius:"50%",background:cA}}/>{strainA.name}</span><span style={{fontSize:10,display:"flex",alignItems:"center",gap:4,color:D.muted}}><div style={{width:6,height:6,borderRadius:"50%",background:cB}}/>{strainB.name}</span></div>
      <CompSpectrum left="Couch-locked" right="Active" valA={sA.spectrums?.sw} valB={sB.spectrums?.sw}/>
      <CompSpectrum left="Dreamy" right="Analytical" valA={sA.spectrums?.sf} valB={sB.spectrums?.sf}/>
      <CompSpectrum left="Smooth" right="Harsh" valA={sA.pull} valB={sB.pull}/>

      {/* Terpenes three columns */}
      <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"20px 0 10px"}}>terpenes</p>
      {(()=>{const tA=new Set(copA?.terpenes||[]);const tB=new Set(copB?.terpenes||[]);const shared=[...tA].filter(t=>tB.has(t));const onlyA=[...tA].filter(t=>!tB.has(t));const onlyB=[...tB].filter(t=>!tA.has(t));
        return(<div style={{display:"flex",gap:6}}>
          <div style={{flex:1}}><p style={{fontSize:9,color:cA,margin:"0 0 6px",textAlign:"center"}}>{strainA.name}</p>{onlyA.map(t=><div key={t} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${cA}15`,color:cA,marginBottom:3,textAlign:"center"}}>{t.toLowerCase()}</div>)}</div>
          <div style={{flex:1}}><p style={{fontSize:9,color:D.accent,margin:"0 0 6px",textAlign:"center"}}>shared</p>{shared.map(t=><div key={t} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:D.card,color:D.accent,marginBottom:3,textAlign:"center",border:`0.5px solid ${D.border}`}}>{t.toLowerCase()}</div>)}{shared.length===0&&<p style={{fontSize:10,color:D.muted,textAlign:"center"}}>none</p>}</div>
          <div style={{flex:1}}><p style={{fontSize:9,color:cB,margin:"0 0 6px",textAlign:"center"}}>{strainB.name}</p>{onlyB.map(t=><div key={t} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${cB}15`,color:cB,marginBottom:3,textAlign:"center"}}>{t.toLowerCase()}</div>)}</div>
        </div>);
      })()}

      {/* Sesh notes */}
      <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"20px 0 10px"}}>sesh notes</p>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <div style={{flex:1,background:D.card,borderRadius:10,padding:12,borderLeft:`3px solid ${cA}`,borderRadius:0}}>
          {sA.notes?<p style={{fontSize:11,color:D.text,margin:0,lineHeight:1.4}}>{sA.notes}</p>:<p style={{fontSize:11,color:D.muted,margin:0}}>no session notes</p>}
          {sA.vibeTags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:6}}>{sA.vibeTags.map(v=><span key={v} style={{fontSize:9,padding:"2px 5px",borderRadius:4,background:`${cA}15`,color:cA}}>{v.toLowerCase()}</span>)}</div>}
        </div>
        <div style={{flex:1,background:D.card,borderRadius:10,padding:12,borderLeft:`3px solid ${cB}`,borderRadius:0}}>
          {sB.notes?<p style={{fontSize:11,color:D.text,margin:0,lineHeight:1.4}}>{sB.notes}</p>:<p style={{fontSize:11,color:D.muted,margin:0}}>no session notes</p>}
          {sB.vibeTags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:6}}>{sB.vibeTags.map(v=><span key={v} style={{fontSize:9,padding:"2px 5px",borderRadius:4,background:`${cB}15`,color:cB}}>{v.toLowerCase()}</span>)}</div>}
        </div>
      </div>

      {/* The verdict */}
      <div style={{background:D.card,borderRadius:14,padding:20,border:`0.5px solid ${D.border}`,marginBottom:16}}>
        <p style={{fontSize:9,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>the verdict</p>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:D.text,margin:0,lineHeight:1.5}}>{generateVerdict()}</p>
      </div>

      <button onClick={()=>onSaveComparison({id:Date.now(),a:strainA.name,b:strainB.name,typeA:copA?.type,typeB:copB?.type,ratingA:sA.rating,ratingB:sB.rating,specA:sA.spectrums,specB:sB.spectrums,pullA:sA.pull,pullB:sB.pull,terpA:copA?.terpenes||[],terpB:copB?.terpenes||[],vibesA:sA.vibeTags||[],vibesB:sB.vibeTags||[],notesA:sA.notes||"",notesB:sB.notes||"",verdict:generateVerdict(),date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})})} style={{width:"100%",padding:14,borderRadius:10,fontSize:14,fontWeight:500,background:D.accent,color:"#1E1628",border:"none",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:20}}>save comparison</button>
    </>}

    {/* Saved comparisons */}
    {savedComparisons.length>0&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,marginTop:8}}>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:0}}>saved comparisons</p>
        <span style={{fontSize:10,color:D.muted}}>{savedComparisons.length}</span>
      </div>
      {savedComparisons.map(sc=><div key={sc.id} style={{background:D.card,borderRadius:10,marginBottom:6,border:`0.5px solid ${D.border}`,overflow:"hidden"}}>
        <div onClick={()=>setExpandedSaved(expandedSaved===sc.id?null:sc.id)} style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
          <div>
            <p style={{fontSize:12,fontWeight:500,color:D.text,margin:"0 0 2px"}}>{sc.a} vs {sc.b}</p>
            <p style={{fontSize:10,color:D.muted,margin:0}}>{sc.date}</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12,color:D.muted}}>{expandedSaved===sc.id?"▾":"▸"}</span>
            {confirmDelete===sc.id?<div style={{display:"flex",gap:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}><button onClick={()=>{onDeleteComparison(sc.id);setConfirmDelete(null);}} style={{fontSize:10,padding:"4px 10px",borderRadius:6,background:"#C15A4A",color:"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>delete</button><button onClick={()=>setConfirmDelete(null)} style={{fontSize:10,padding:"4px 8px",borderRadius:6,background:"transparent",color:D.muted,border:`0.5px solid ${D.border}`,cursor:"pointer",fontFamily:"inherit"}}>cancel</button></div>:<button onClick={e=>{e.stopPropagation();setConfirmDelete(sc.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:D.muted,padding:4}}>✕</button>}
          </div>
        </div>
        {expandedSaved===sc.id&&<div style={{padding:"0 14px 14px"}}>
          {/* Verdict */}
          <div style={{background:`${D.card}`,borderRadius:10,padding:"10px 12px",border:`0.5px solid ${D.border}`,marginBottom:12}}>
            <p style={{fontSize:9,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 4px"}}>the verdict</p>
            <p style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:D.text,margin:0,lineHeight:1.4}}>{sc.verdict}</p>
          </div>
          {/* Ratings */}
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <div style={{flex:1,textAlign:"center"}}><p style={{fontSize:10,color:cA,margin:"0 0 2px"}}>{sc.a}</p><p style={{fontSize:18,fontFamily:"'Playfair Display',serif",color:cA,margin:0}}>{sc.ratingA}/5</p></div>
            <div style={{flex:1,textAlign:"center"}}><p style={{fontSize:10,color:cB,margin:"0 0 2px"}}>{sc.b}</p><p style={{fontSize:18,fontFamily:"'Playfair Display',serif",color:cB,margin:0}}>{sc.ratingB}/5</p></div>
          </div>
          {/* Terpenes */}
          {(sc.terpA?.length>0||sc.terpB?.length>0)&&<div style={{display:"flex",gap:6,marginBottom:12}}>
            <div style={{flex:1}}>{sc.terpA?.map(t=><div key={t} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${cA}15`,color:cA,marginBottom:2,textAlign:"center"}}>{t.toLowerCase()}</div>)}</div>
            <div style={{flex:1}}>{sc.terpB?.map(t=><div key={t} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${cB}15`,color:cB,marginBottom:2,textAlign:"center"}}>{t.toLowerCase()}</div>)}</div>
          </div>}
          {/* Sesh notes */}
          {(sc.notesA||sc.notesB)&&<div style={{display:"flex",gap:6}}>
            <div style={{flex:1,borderLeft:`2px solid ${cA}`,padding:"4px 8px",borderRadius:0}}><p style={{fontSize:10,color:D.text,margin:0,lineHeight:1.3}}>{sc.notesA||"—"}</p></div>
            <div style={{flex:1,borderLeft:`2px solid ${cB}`,padding:"4px 8px",borderRadius:0}}><p style={{fontSize:10,color:D.text,margin:0,lineHeight:1.3}}>{sc.notesB||"—"}</p></div>
          </div>}
        </div>}
      </div>)}
    </>}
  </div></div>);
}

/* ═══════════════════════════════════════════
   RECOMMENDER PAGE
   ═══════════════════════════════════════════ */
function TerpSearch({strains,reups,onClose,onPeek}){
  const D={bg:"#0F1420",card:"rgba(200,212,232,0.04)",border:"rgba(200,212,232,0.06)",text:"#C8D4E8",muted:"rgba(200,212,232,0.35)",navy:"#7A8FAA"};
  const[search,setSearch]=useState("");
  const[selected,setSelected]=useState([]);

  const allCops=strains.flatMap(s=>s.cops.filter(c=>c.session).map(c=>({...c,strainName:s.name,strainId:s.id,strainIntent:s.intent})));

  // derive personal terp list from actual logged cops, sorted by frequency
  const terpFreq={};
  allCops.forEach(c=>(c.terpenes||[]).forEach(t=>{terpFreq[t]=(terpFreq[t]||0)+1;}));
  const myTerps=Object.entries(terpFreq).sort((a,b)=>b[1]-a[1]).map(([t])=>t);
  const visibleTerps=myTerps.filter(t=>!selected.includes(t)&&(!search||t.toLowerCase().includes(search.toLowerCase())));

  const matchingCops=selected.length===0?[]:allCops.filter(c=>selected.every(t=>(c.terpenes||[]).includes(t)));

  // vibes — sorted by frequency
  const vibeCounts={};
  matchingCops.forEach(c=>(c.session?.vibeTags||[]).forEach(v=>{vibeCounts[v]=(vibeCounts[v]||0)+1;}));
  const topVibes=Object.entries(vibeCounts).sort((a,b)=>b[1]-a[1]).map(([v])=>v);

  // notes
  const sessionNotes=matchingCops.map(c=>({note:c.session?.notes,strain:c.strainName,date:c.session?.date})).filter(n=>n.note&&n.note.trim().length>0).reverse();

  // conditions
  const total=matchingCops.length;
  const bedtimeCount=matchingCops.filter(c=>c.session?.bedtime).length;
  const outdoorCount=matchingCops.filter(c=>c.session?.setting==="outdoor").length;
  const indoorCount=total-outdoorCount;

  // intent lean
  const intentCounts={asleep:0,awake:0,adventure:0};
  matchingCops.forEach(c=>{if(c.strainIntent)intentCounts[c.strainIntent]=(intentCounts[c.strainIntent]||0)+1;});

  // type lean
  const typeCounts={Indica:0,Sativa:0,Hybrid:0};
  matchingCops.forEach(c=>{if(c.type)typeCounts[c.type]=(typeCounts[c.type]||0)+1;});
  const typeEntries=Object.entries(typeCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);

  const hasData=matchingCops.length>0;
  const atMax=selected.length>=3;

  // Trio nudge — when exactly 2 terps selected, suggest most common third from 4+ rated sessions
  const trioNudge=selected.length===2?(()=>{
    const [t1,t2]=selected;
    const thirds={};
    allCops.filter(c=>(c.session?.rating||0)>=4&&(c.terpenes||[]).includes(t1)&&(c.terpenes||[]).includes(t2))
      .forEach(c=>(c.terpenes||[]).forEach(t=>{if(t!==t1&&t!==t2)thirds[t]=(thirds[t]||0)+1;}));
    const top=Object.entries(thirds).sort((a,b)=>b[1]-a[1])[0];
    return top&&top[1]>=1?top[0]:null;
  })():null;

  return(<div style={{background:D.bg,minHeight:"100vh",color:D.text}}><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
      <button onClick={onClose} style={{width:36,height:36,borderRadius:"50%",background:"rgba(200,212,232,0.08)",border:"0.5px solid rgba(200,212,232,0.15)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1L1 10M1 10h6M1 10V4" stroke={D.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:400,margin:0,color:D.text}}>terp search</h2>
        <p style={{fontSize:11,color:D.muted,margin:"2px 0 0"}}>what does this terpene do for you</p>
      </div>
    </div>

    {/* selected pills */}
    {selected.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
      {selected.map(t=><button key={t} onClick={()=>setSelected(selected.filter(x=>x!==t))} style={{fontSize:12,padding:"6px 14px",borderRadius:14,background:"#2A1E48",color:"#C4B8D8",border:"0.5px solid rgba(196,184,216,0.25)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>{t.toLowerCase()} <span style={{opacity:0.5,fontSize:10}}>✕</span></button>)}
      {atMax&&<span style={{fontSize:11,color:D.muted,alignSelf:"center",paddingLeft:4}}>max 3</span>}
    </div>}

    {/* trio nudge */}
    {trioNudge&&!atMax&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(122,143,170,0.07)",borderRadius:8,padding:"8px 11px",border:"0.5px solid rgba(122,143,170,0.15)",marginBottom:16}}>
      <span style={{fontSize:14}}>💡</span>
      <p style={{fontSize:11,color:"rgba(200,212,232,0.5)",flex:1,margin:0,lineHeight:1.4}}>your data suggests <span style={{color:D.navy,fontWeight:500}}>{trioNudge.toLowerCase()}</span> often completes this pair in high-rated sessions</p>
      <button onClick={()=>setSelected([...selected,trioNudge])} style={{fontSize:10,color:D.navy,background:"rgba(122,143,170,0.15)",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>+ add</button>
    </div>}

    {/* picker — only show when under max */}
    {!atMax&&<div style={{marginBottom:selected.length>0?20:0}}>
      {myTerps.length>6&&<div style={{background:"rgba(200,212,232,0.06)",borderRadius:10,padding:"9px 14px",border:"0.5px solid rgba(200,212,232,0.12)",display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke={D.navy} strokeWidth="1.3"/><path d="M10 10l3 3" stroke={D.navy} strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="filter..." style={{border:"none",background:"transparent",flex:1,fontSize:13,color:D.text,outline:"none",fontFamily:"inherit"}}/>
        {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:D.muted,fontSize:14,padding:0,lineHeight:1}}>✕</button>}
      </div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {visibleTerps.map(t=><button key={t} onClick={()=>setSelected([...selected,t])} style={{fontSize:12,padding:"6px 14px",borderRadius:14,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`,cursor:"pointer",fontFamily:"inherit"}}>
          {t.toLowerCase()}
          <span style={{fontSize:9,color:"rgba(200,212,232,0.2)",marginLeft:6}}>{terpFreq[t]}x</span>
        </button>)}
      </div>
    </div>}

    {selected.length===0&&myTerps.length===0&&<p style={{fontSize:13,color:D.muted,margin:"20px 0"}}>no terpenes logged yet — add them when you cop.</p>}
    {selected.length===1&&!hasData&&<p style={{fontSize:13,color:D.muted,margin:"20px 0"}}>no sessions logged with {selected[0].toLowerCase()} yet.</p>}
    {selected.length>1&&!hasData&&<div style={{margin:"20px 0",borderLeft:"2px solid rgba(200,212,232,0.1)",paddingLeft:12}}>
      <p style={{fontSize:13,color:D.text,margin:"0 0 6px"}}>no sessions with {selected.map(t=>t.toLowerCase()).join(" + ")} together.</p>
      <p style={{fontSize:11,color:D.muted,margin:0}}>try removing one to see individual data, or search a different combo.</p>
    </div>}

    {hasData&&<div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* vibes */}
      {topVibes.length>0&&<div>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>vibes</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {topVibes.map((v,i)=><span key={v} style={{fontSize:12,padding:"4px 12px",borderRadius:12,background:i<3?"rgba(200,212,232,0.12)":"rgba(200,212,232,0.05)",color:i<3?D.text:D.muted,border:`0.5px solid ${D.border}`}}>{v.toLowerCase()}</span>)}
        </div>
      </div>}

      {/* session notes */}
      {sessionNotes.length>0&&<div>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>your notes</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sessionNotes.map((n,i)=><div key={i} style={{borderLeft:"2px solid rgba(200,212,232,0.1)",paddingLeft:12}}>
            <p style={{fontSize:13,color:D.text,margin:"0 0 3px",lineHeight:1.5}}>{n.note}</p>
            <p style={{fontSize:10,color:D.muted,margin:0}}>{n.strain}{n.date?` · ${n.date}`:""}</p>
          </div>)}
        </div>
      </div>}

      {/* conditions */}
      {total>0&&<div>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>conditions</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {bedtimeCount>0&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`}}>🌙 bedtime {bedtimeCount}x</span>}
          {outdoorCount>0&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`}}>🌿 outdoor {outdoorCount}x</span>}
          {indoorCount>0&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`}}>🏠 indoor {indoorCount}x</span>}
        </div>
      </div>}

      {/* intent lean */}
      {Object.values(intentCounts).some(n=>n>0)&&<div>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>intent</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {intentCounts.asleep>0&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`}}>🌙 asleep {intentCounts.asleep}x</span>}
          {intentCounts.awake>0&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`}}>☀️ awake {intentCounts.awake}x</span>}
          {intentCounts.adventure>0&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`}}>🏕️ adventure {intentCounts.adventure}x</span>}
        </div>
      </div>}

      {/* type lean */}
      {typeEntries.length>0&&<div>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>type</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {typeEntries.map(([type,count])=><span key={type} style={{fontSize:11,padding:"4px 10px",borderRadius:8,background:"rgba(200,212,232,0.06)",color:typeColor(type),border:`0.5px solid ${D.border}`}}>{type.toLowerCase()} {count}x</span>)}
        </div>
      </div>}

      {/* strain list */}
      {(()=>{
        const strainMap=matchingCops.reduce((acc,c)=>{
          if(!acc[c.strainId])acc[c.strainId]={name:c.strainName,type:c.type,count:0,strainId:c.strainId};
          acc[c.strainId].count++;return acc;
        },{});
        const entries=Object.values(strainMap);
        return(<div>
          <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>strains{entries.length>0?` · ${entries.length}`:""}</p>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {entries.map(s=>{const strain=strains.find(x=>x.id===s.strainId||x.name===s.name);return(<div key={s.name} onClick={()=>strain&&onPeek&&onPeek(strain)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:D.card,border:`0.5px solid ${D.border}`,cursor:strain&&onPeek?"pointer":"default"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:typeColor(s.type),flexShrink:0}}/>
              <span style={{fontSize:13,color:D.text}}>{s.name}</span>
              <span style={{fontSize:10,color:D.muted,marginLeft:"auto"}}>{s.type?.toLowerCase()}</span>
              {s.count>1&&<span style={{fontSize:10,color:D.muted}}>{s.count} cops</span>}
            </div>);})}
          </div>
        </div>);
      })()}

    </div>}
  </div></div>);
}

function RecommenderPage({strains,reups,savedTips,onSaveTip,onDeleteTip,onPeek}){
  const[intentTab,setIntentTab]=useState("overall");
  const[confirmDeleteTip,setConfirmDeleteTip]=useState(null);
  const[showSearch,setShowSearch]=useState(false);
  const[tipMode,setTipMode]=useState("pairs"); // pairs | trios
  const[comboMode,setComboMode]=useState("pairs"); // pairs | trios
  const D={bg:"#0F1420",card:"rgba(200,212,232,0.04)",border:"rgba(200,212,232,0.06)",text:"#C8D4E8",muted:"rgba(200,212,232,0.35)",navy:"#7A8FAA"};

  if(showSearch)return <TerpSearch strains={strains} reups={reups} onClose={()=>setShowSearch(false)} onPeek={onPeek}/>;

  const allCops=strains.flatMap(s=>s.cops.filter(c=>c.session).map(c=>({...c,strainName:s.name,strainId:s.id,intent:s.intent})));
  const filtered=intentTab==="overall"||intentTab==="enjoy"?allCops:allCops.filter(c=>c.intent===intentTab);
  const highRated=filtered.filter(c=>(c.session?.rating||0)>=4);

  // Terpene affinity
  const terpRatings={};
  filtered.forEach(c=>(c.terpenes||[]).forEach(t=>{if(!terpRatings[t])terpRatings[t]=[];if((c.session?.rating||0)>0)terpRatings[t].push(c.session.rating);}));
  const topTerps=Object.entries(terpRatings).map(([t,ratings])=>({name:t,avg:(ratings.reduce((a,b)=>a+b,0)/ratings.length),count:ratings.length})).sort((a,b)=>b.avg-a.avg).slice(0,8);

  // Winning pairs
  const combos={};const comboRatings={};
  highRated.forEach(c=>{const terps=c.terpenes||[];for(let i=0;i<terps.length;i++)for(let j=i+1;j<terps.length;j++){const key=[terps[i],terps[j]].sort().join(" + ");combos[key]=(combos[key]||0)+1;if(!comboRatings[key])comboRatings[key]=[];comboRatings[key].push(c.session?.rating||0);}});
  const topCombos=Object.entries(combos).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Trios — for each top pair, find most common third terp in 4+ sessions
  const getThird=(pair)=>{
    const [t1,t2]=pair.split(" + ");
    const thirds={};
    highRated.forEach(c=>{const terps=c.terpenes||[];if(terps.includes(t1)&&terps.includes(t2)){terps.forEach(t=>{if(t!==t1&&t!==t2)thirds[t]=(thirds[t]||0)+1;});}});
    const top=Object.entries(thirds).sort((a,b)=>b[1]-a[1])[0];
    return top?{name:top[0],count:top[1]}:null;
  };

  // Tip generation
  const generateTip=()=>{
    if(topTerps.length===0)return"log more sessions to unlock recommendations";
    const intentLabel=intentTab==="overall"?"overall":intentTab==="asleep"?"bedtime":intentTab==="awake"?"daytime":"adventure";
    if(tipMode==="pairs"){
      const best=topTerps[0];
      let tip=`for ${intentLabel}, look for ${best.name.toLowerCase()}`;
      if(topTerps.length>1)tip+=` paired with ${topTerps[1].name.toLowerCase()}`;
      tip+=`. your avg rating with ${best.name.toLowerCase()} is ${best.avg.toFixed(1)}/5`;
      if(topCombos.length>0)tip+=`. the combo ${topCombos[0][0].toLowerCase()} has hit ${topCombos[0][1]} time${topCombos[0][1]!==1?"s":""}`;
      return tip+".";
    } else {
      // trios
      if(topCombos.length===0)return"log more 4+ rated sessions to unlock trio recommendations";
      const topPair=topCombos[0][0];const third=getThird(topPair);
      if(!third)return`for ${intentLabel}, look for ${topPair.toLowerCase()} — add more sessions to find your third terp.`;
      return`for ${intentLabel}, look for ${topPair.toLowerCase()} + ${third.name.toLowerCase()}. this trio appears most in your highest-rated sessions.`;
    }
  };

  // Might enjoy — parents of 5★, starred, cop-again yes strains
  const coppedNames=new Set(strains.map(s=>s.name.toLowerCase()));
  const enjoyParents=new Set();
  strains.forEach(s=>{
    const cops=s.cops.filter(c=>c.session);
    const isFiveStar=cops.some(c=>(c.session?.rating||0)>=5);
    const isStarred=s.starred;
    const isCopAgainYes=cops.some(c=>c.session?.copAgain==="Yes");
    if(isFiveStar||isStarred||isCopAgainYes){(s.parents||[]).filter(Boolean).forEach(p=>{if(!coppedNames.has(p.toLowerCase()))enjoyParents.add(p);});}
  });
  const enjoyList=[...enjoyParents].sort();

  const IntTab=({id,label,special=false})=>(<button onClick={()=>setIntentTab(id)} style={{width:"100%",textAlign:"center",padding:"7px 14px",borderRadius:20,fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:intentTab===id?500:400,background:intentTab===id?(special?"#7A8FAA":"#C8D4E8"):"transparent",color:intentTab===id?"#0F1420":special?"rgba(122,143,170,0.7)":D.muted,border:intentTab===id?"none":special?`0.5px solid rgba(122,143,170,0.25)`:`0.5px solid ${D.border}`}}>{label}</button>);

  const ModeToggle=({value,onChange})=>(<div style={{display:"flex",gap:0,border:`0.5px solid ${D.border}`,borderRadius:8,overflow:"hidden",marginBottom:12}}>
    {["pairs","trios"].map(m=><button key={m} onClick={()=>onChange(m)} style={{flex:1,padding:"6px 0",textAlign:"center",fontSize:11,fontFamily:"inherit",cursor:"pointer",border:"none",background:value===m?"rgba(122,143,170,0.2)":"transparent",color:value===m?D.text:D.muted,fontWeight:value===m?500:400}}>{m}</button>)}
  </div>);

  return(<div style={{background:D.bg,minHeight:"100vh",color:D.text}}><div style={{padding:"72px 24px 60px",maxWidth:480,margin:"0 auto"}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4,marginTop:20}}>
      <div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:400,margin:0}}>recommender</h1>
        <p style={{fontSize:11,color:D.muted,margin:"4px 0 0"}}>your terpene fingerprint</p>
      </div>
      <button onClick={()=>setShowSearch(true)} title="terp search" style={{width:36,height:36,borderRadius:"50%",background:"rgba(200,212,232,0.08)",border:"0.5px solid rgba(200,212,232,0.15)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4,flexShrink:0}}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke={D.navy} strokeWidth="1.3"/><path d="M10 10l3 3" stroke={D.navy} strokeWidth="1.3" strokeLinecap="round"/></svg>
      </button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:20,marginBottom:6}}>
      <IntTab id="overall" label="✦ overall"/>
      <IntTab id="asleep" label="🌙 asleep"/>
      <IntTab id="awake" label="☀️ awake"/>
      <IntTab id="adventure" label="🏕️ adventure"/>
    </div>
    <div style={{marginBottom:24}}>
      <IntTab id="enjoy" label="might enjoy" special={true}/>
    </div>

    {/* ── MIGHT ENJOY TAB ── */}
    {intentTab==="enjoy"&&<div>
      <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 6px"}}>strains you might enjoy</p>
      <p style={{fontSize:10,color:D.muted,margin:"0 0 16px",lineHeight:1.4}}>parent strains of your 5★, starred, and cop-again yes strains · updates as you log</p>
      {enjoyList.length===0&&<p style={{fontSize:13,color:D.muted,textAlign:"center",marginTop:20}}>log more sessions and mark cop-again to unlock this list</p>}
      {enjoyList.map(name=><div key={name} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,background:D.card,border:`0.5px solid ${D.border}`,marginBottom:5}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(200,212,232,0.25)",flexShrink:0}}/>
        <span style={{fontSize:13,color:D.text}}>{name}</span>
      </div>)}
    </div>}

    {/* ── MAIN TABS (overall/asleep/awake/adventure) ── */}
    {intentTab!=="enjoy"&&<>
      {/* Tip card */}
      {topTerps.length>0&&<div style={{background:"rgba(122,143,170,0.1)",borderRadius:12,padding:14,marginBottom:20,border:"0.5px solid rgba(122,143,170,0.2)"}}>
        <p style={{fontSize:9,fontWeight:500,color:D.navy,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px"}}>your tip</p>
        <ModeToggle value={tipMode} onChange={setTipMode}/>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:D.text,margin:"0 0 10px",lineHeight:1.5}}>{generateTip()}</p>
        <button onClick={()=>onSaveTip({id:Date.now(),intent:intentTab,tip:generateTip(),date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})})} style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontFamily:"inherit",cursor:"pointer",background:"rgba(200,212,232,0.08)",color:"rgba(200,212,232,0.5)",border:`0.5px solid ${D.border}`}}>save tip</button>
      </div>}

      {/* Terpene affinity */}
      {topTerps.length>0&&<div style={{marginBottom:24}}>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 12px"}}>terpene affinity</p>
        {topTerps.map((t,i)=>(<div key={t.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:11,color:D.muted,width:16,textAlign:"right"}}>{i+1}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:12,fontWeight:500,color:D.text}}>{t.name.toLowerCase()}</span>
              <span style={{fontSize:11,color:D.navy}}>{t.avg.toFixed(1)} avg · {t.count}x</span>
            </div>
            <div style={{height:4,borderRadius:2,background:D.card}}><div style={{height:4,borderRadius:2,background:D.navy,width:`${(t.avg/5)*100}%`}}/></div>
          </div>
        </div>))}
      </div>}

      {/* Winning combos */}
      {topCombos.length>0&&<div style={{marginBottom:24}}>
        <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 6px"}}>winning combos</p>
        <p style={{fontSize:10,color:D.muted,margin:"0 0 10px"}}>terpene pairs in your 4+ rated sessions</p>
        <ModeToggle value={comboMode} onChange={setComboMode}/>
        {topCombos.map(([combo,count])=>{const third=comboMode==="trios"?getThird(combo):null;return(<div key={combo} style={{background:D.card,borderRadius:8,padding:"10px 14px",marginBottom:5,border:`0.5px solid ${D.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:comboMode==="trios"?4:0}}>
            <span style={{fontSize:12,color:D.text,fontWeight:500}}>{combo.toLowerCase()}</span>
            <span style={{fontSize:11,color:D.navy}}>{count}x in 4★+</span>
          </div>
          {comboMode==="trios"&&<p style={{fontSize:11,color:"rgba(200,212,232,0.5)",margin:0}}>third: {third?<span style={{color:D.navy,fontWeight:500}}>{third.name.toLowerCase()} <span style={{fontWeight:400,color:"rgba(200,212,232,0.4)"}}>— appeared together {third.count}x</span></span>:<span style={{color:"rgba(200,212,232,0.25)"}}>not enough data yet</span>}</p>}
        </div>);})}
      </div>}

      {/* Saved tips */}
      {(()=>{const filteredTips=savedTips.filter(st=>st.intent===intentTab);return filteredTips.length>0?<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{fontSize:10,fontWeight:500,color:D.muted,letterSpacing:0.5,textTransform:"uppercase",margin:0}}>saved {intentTab} tips</p>
          <span style={{fontSize:10,color:D.muted}}>{filteredTips.length}</span>
        </div>
        {filteredTips.map(st=><div key={st.id} style={{background:D.card,borderRadius:10,padding:"12px 14px",marginBottom:6,border:`0.5px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <p style={{fontSize:10,color:D.muted,margin:"0 0 4px"}}>{st.date}</p>
            <p style={{fontSize:11,color:D.text,margin:0,lineHeight:1.4}}>{st.tip}</p>
          </div>
          {confirmDeleteTip===st.id?<div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}><button onClick={()=>{onDeleteTip(st.id);setConfirmDeleteTip(null);}} style={{fontSize:10,padding:"4px 10px",borderRadius:6,background:"#C15A4A",color:"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>delete</button><button onClick={()=>setConfirmDeleteTip(null)} style={{fontSize:10,padding:"4px 8px",borderRadius:6,background:"transparent",color:D.muted,border:`0.5px solid ${D.border}`,cursor:"pointer",fontFamily:"inherit"}}>nvm</button></div>:<button onClick={()=>setConfirmDeleteTip(st.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:D.muted,padding:4,flexShrink:0}}>✕</button>}
        </div>)}
      </>:null;})()}

      {filtered.length===0&&<p style={{fontSize:13,color:D.muted,textAlign:"center"}}>no sessions logged{intentTab!=="overall"?` for ${intentTab}`:""} yet</p>}
    </>}
  </div></div>);
}


/* ═══════════════════════════════════════════
   MIX REVIEW SHEET
   ═══════════════════════════════════════════ */
function MixReviewSheet({entry,mixSess,setMixSess,onClose,onSave}){
  if(!entry)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)"}}/>
      <div style={{position:"relative",background:"#1A1228",borderRadius:"20px 20px 0 0",padding:"20px 20px 44px",width:"100%",boxShadow:"0 -4px 32px rgba(0,0,0,0.5)",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{width:36,height:3,background:"rgba(232,224,212,0.15)",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:4,height:16,borderRadius:2,background:typeColor(entry.primaryType)}}/><span style={{fontSize:14,fontWeight:500,color:"#C4B0C4"}}>{entry.primaryStrain}</span></div>
          <span style={{fontSize:12,color:"rgba(196,176,196,0.4)"}}>x</span>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:4,height:16,borderRadius:2,background:typeColor(entry.withType)}}/><span style={{fontSize:14,fontWeight:500,color:"#C4B0C4"}}>{entry.withStrain}</span></div>
        </div>
        <p style={{fontSize:13,fontWeight:500,color:"rgba(196,176,196,0.7)",margin:"0 0 14px"}}>how'd the mix hit?</p>
        <div style={{textAlign:"center",marginBottom:14,paddingBottom:12,borderBottom:"0.5px solid rgba(139,109,139,0.2)"}}>
          <div style={{display:"flex",justifyContent:"center",gap:6}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setMixSess({...mixSess,rating:n})} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Leaf filled={n<=mixSess.rating} color="#8B6D8B" size={28}/></button>)}</div>
        </div>
        <SpectrumSlider left="Couch-locked" right="Active" value={mixSess.sw} onChange={v=>setMixSess({...mixSess,sw:v})} color="#8B6D8B"/>
        <SpectrumSlider left="Dreamy" right="Analytical" value={mixSess.sf} onChange={v=>setMixSess({...mixSess,sf:v})} color="#8B6D8B"/>
        <SpectrumSlider left="Smooth" right="Harsh" value={mixSess.pull} onChange={v=>setMixSess({...mixSess,pull:v})} color="#8B6D8B"/>
        <button onClick={()=>setMixSess({...mixSess,bedtime:!mixSess.bedtime})} style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",background:mixSess.bedtime?"#2C2C4A":"transparent",color:mixSess.bedtime?"#C9B8F0":"rgba(196,176,196,0.4)",border:mixSess.bedtime?"none":"0.5px solid rgba(139,109,139,0.2)"}}>🌙 bedtime{mixSess.bedtime&&" ✓"}</button>
        <div style={{marginBottom:14}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={mixSess.vibeTags} onChange={v=>setMixSess({...mixSess,vibeTags:v})} color="#8B6D8B"/></div>
        <textarea defaultValue={mixSess.notes} onBlur={e=>setMixSess({...mixSess,notes:e.target.value})} placeholder="how'd the combo play together..." rows={2} style={{width:"100%",boxSizing:"border-box",background:"rgba(232,224,212,0.04)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#C4B0C4",border:"0.5px solid rgba(139,109,139,0.2)",fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:14}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:12,borderRadius:10,fontSize:13,background:"transparent",color:"rgba(196,176,196,0.4)",border:"0.5px solid rgba(139,109,139,0.2)",cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
          <button onClick={onSave} style={{flex:2,padding:12,borderRadius:10,fontSize:13,fontWeight:500,background:"#8B6D8B",color:"#E8E0D4",border:"none",cursor:"pointer",fontFamily:"inherit"}}>save mix review</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EXPERIENCE SHEET (stash inline experience)
   ═══════════════════════════════════════════ */
function ExperienceSheet({strain,copId,onClose,onSave}){
  if(!strain)return null;
  const lc=strain.cops[strain.cops.length-1];
  const[setting,setSetting]=useState("indoor");
  const[bedtime,setBedtime]=useState(false);
  const[vibes,setVibes]=useState([]);
  const[note,setNote]=useState("");
  const canSave=note.trim()||vibes.length>0;
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)"}}/>
      <div style={{position:"relative",background:"#1A2A14",borderRadius:"20px 20px 0 0",padding:"20px 20px 44px",width:"100%",boxShadow:"0 -4px 32px rgba(0,0,0,0.5)",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{width:36,height:3,background:"rgba(240,235,225,0.15)",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          {lc?.type&&<div style={{width:4,height:20,borderRadius:2,background:typeColor(lc.type),flexShrink:0}}/>}
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:500,color:"#D4E0D4"}}>{strain.name}</span>
          <span style={{fontSize:11,color:"rgba(212,224,212,0.4)"}}>experience</span>
        </div>
        <div style={{marginBottom:12}}>
          <ToggleGroup options={["indoor","outdoor"]} value={setting} onChange={v=>{setSetting(v);if(v==="outdoor")setBedtime(false);}} color="#8BAF7A"/>
          {setting==="indoor"&&<button onClick={()=>setBedtime(!bedtime)} style={{display:"flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:"inherit",cursor:"pointer",background:bedtime?"#2C2C4A":"transparent",color:bedtime?"#C9B8F0":"rgba(212,224,212,0.5)",border:bedtime?"none":"0.5px solid rgba(240,235,225,0.1)"}}>bedtime{bedtime&&" ✓"}</button>}
        </div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="what was different this time..." rows={3} style={{width:"100%",boxSizing:"border-box",background:"rgba(240,235,225,0.06)",border:"0.5px solid rgba(240,235,225,0.12)",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#D4E0D4",fontFamily:"inherit",outline:"none",resize:"none",marginBottom:12}}/>
        <div style={{marginBottom:16}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={vibes} onChange={setVibes} color="#8BAF7A"/></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:12,borderRadius:10,fontSize:13,background:"transparent",color:"rgba(240,235,225,0.4)",border:"0.5px solid rgba(240,235,225,0.1)",cursor:"pointer",fontFamily:"inherit"}}>cancel</button>
          <button onClick={()=>{if(canSave){onSave(note,setting,bedtime,vibes);onClose();}}} style={{flex:2,padding:12,borderRadius:10,fontSize:13,fontWeight:500,background:canSave?"#6B7F5A":"rgba(107,127,90,0.2)",color:canSave?"#E8F0E8":"rgba(212,224,212,0.3)",border:"none",cursor:canSave?"pointer":"default",fontFamily:"inherit"}}>save experience</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STRAIN PEEK SHEET
   ═══════════════════════════════════════════ */
function PeekSheet({strain,strains,onClose,onOpenDetail,pageBg}){
  if(!strain)return null;
  const s=strains.find(x=>x.id===strain.id)||strain;
  const lc=s.cops[s.cops.length-1];
  const allSessions=s.cops.filter(c=>c.session);
  const ratedSessions=allSessions.filter(c=>(c.session?.rating||0)>0);
  const avgRating=ratedSessions.length>0?(ratedSessions.reduce((a,c)=>a+c.session.rating,0)/ratedSessions.length):0;
  const topVibes={};allSessions.forEach(c=>(c.session?.vibeTags||[]).forEach(v=>{topVibes[v]=(topVibes[v]||0)+1;}));
  const vibes=Object.entries(topVibes).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([v])=>v);
  const lastCop=allSessions[allSessions.length-1];
  const lastDate=lastCop?.date||lc?.date||"";
  const isAmber=pageBg==="amber";
  const accentColor=isAmber?"#D4B888":pageBg==="compare"?"#C9B8F0":pageBg==="recommender"?"#7A8FAA":"#D4B888";
  const sheetBg=isAmber?"#1F1A12":pageBg==="compare"?"#251C30":pageBg==="recommender"?"#131926":"#1F1A12";
  const terpColor=isAmber?"rgba(212,184,136,0.15)":pageBg==="compare"?"rgba(201,168,76,0.12)":"rgba(212,184,136,0.12)";
  const terpText=isAmber?"#D4B888":pageBg==="compare"?"#C9A84C":"#D4B888";
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}}/>
      <div style={{position:"relative",background:sheetBg,borderRadius:"20px 20px 0 0",padding:"20px 20px 40px",width:"100%",boxShadow:"0 -4px 32px rgba(0,0,0,0.4)"}}>
        <div style={{width:36,height:3,background:"rgba(232,224,212,0.15)",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          {lc?.type&&<div style={{width:4,height:22,borderRadius:2,background:typeColor(lc.type),flexShrink:0}}/>}
          <span style={{fontSize:18,fontWeight:500,color:"#E8E0D4",fontFamily:"'Playfair Display',serif"}}>{s.name}</span>
          {lc?.type&&<span style={{fontSize:11,color:"rgba(232,224,212,0.35)"}}>{lc.type.toLowerCase()}</span>}
          {avgRating>0&&<div style={{display:"flex",gap:1,marginLeft:"auto"}}>{[1,2,3,4,5,6].map(n=><Leaf key={n} filled={n<=Math.round(avgRating)} size={14} color="#6B8F5A"/>)}</div>}
        </div>
        {lc?.terpenes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
          {lc.terpenes.map(t=><span key={t} style={{fontSize:10,background:terpColor,color:terpText,padding:"3px 8px",borderRadius:6}}>{t.toLowerCase()}</span>)}
        </div>}
        {vibes.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:14}}>
          {vibes.map(v=><span key={v} style={{fontSize:10,background:"rgba(232,224,212,0.06)",color:"rgba(232,224,212,0.45)",padding:"3px 8px",borderRadius:6}}>{v.toLowerCase()}</span>)}
        </div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"0.5px solid rgba(232,224,212,0.08)",paddingTop:10}}>
          <span style={{fontSize:11,color:"rgba(232,224,212,0.3)"}}>{allSessions.length} cop{allSessions.length!==1?"s":""}{lastDate?` · last ${lastDate}`:""}</span>
          <button onClick={()=>{onClose();onOpenDetail(s);}} style={{fontSize:11,color:accentColor,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0}}>open in library →</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   useCloudData — shared data hook
   Both MobileShell and DesktopShell use this.
   Owns all persistent state + Supabase sync.
   dataLoaded boolean gates saves — DO NOT REMOVE.
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

  const loadData=async()=>{
    const{data:rows,error}=await supabase.from("cloud_data").select("*").eq("user_id",USER_ID).maybeSingle();
    console.log("loadData rows:",rows,"error:",error);
    const initialData=rows?.data||{};
    // backfillIso is idempotent — it only fills where dateIso is absent, so this
    // is safe to leave in place and safe to re-run. Persists via the autosave effect.
    const migratedStrains=(initialData.strains||[]).map(s=>({...s,
      parents:s.unknownLineage?["unknown lineage"]:(s.parents||[]).map(p=>p.trim()).filter(Boolean),
      cops:(s.cops||[]).map(backfillIso)}));
    setStrains(migratedStrains);
    setCoppedEntries((initialData.coppedEntries||[]).map(backfillIso));
    setOnHand((initialData.onHand||[]).map(backfillIso));
    setMixQueue(initialData.mixQueue||[]);
    const rawReups=(initialData.reups||[]).map(backfillIso);
    const rawFinished=(initialData.finishedReups||[]).map(backfillIso);
    const{finished:numberedFinished,active:numberedActive}=assignReupNumbers(rawFinished,rawReups);
    setReups(numberedActive);
    setFinishedReups(numberedFinished);
    setSavedComparisons(initialData.savedComparisons||[]);
    setSavedTips(initialData.savedTips||[]);
    setInsightsDismissed(initialData.insightsDismissed||[]);
    setInsightsSaved(initialData.insightsSaved||[]);
    setDataLoaded(true);
  };

  useEffect(()=>{loadData();},[]);

  const saveToCloud=useCallback(async(newData)=>{
    setSynced(false);
    const{error}=await supabase.from("cloud_data").upsert({user_id:USER_ID,data:newData,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    console.log("saveToCloud error:",error);
    setSynced(!error);
  },[]);

  useEffect(()=>{
    if(!dataLoaded)return;
    const d={strains,coppedEntries,onHand,mixQueue,reups,finishedReups,savedComparisons,savedTips,insightsDismissed,insightsSaved};
    saveToCloud(d);
  },[strains,coppedEntries,onHand,mixQueue,reups,finishedReups,savedComparisons,savedTips,insightsDismissed,insightsSaved]);

  return{dataLoaded,synced,strains,setStrains,coppedEntries,setCoppedEntries,onHand,setOnHand,mixQueue,setMixQueue,reups,setReups,finishedReups,setFinishedReups,savedComparisons,setSavedComparisons,savedTips,setSavedTips,insightsDismissed,setInsightsDismissed,insightsSaved,setInsightsSaved,legacyStrains};
}

/* ═══════════════════════════════════════════
   DESKTOP — retro style helpers
   ═══════════════════════════════════════════ */
const retroCard={border:"1.5px solid rgba(232,200,154,0.2)",background:"rgba(255,255,255,0.06)",borderRadius:4,position:"relative",overflow:"hidden"};
const retroCardTop={content:"",position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,rgba(232,200,154,0.25),rgba(232,200,154,0.05))"};
function RetroCard({children,style,onClick}){
  return(
    <div onClick={onClick} style={{...retroCard,cursor:onClick?"pointer":"default",...style}}>
      <div style={retroCardTop}/>
      {children}
    </div>
  );
}
function RetroHeader({children}){
  return(
    <div style={{background:"linear-gradient(90deg,rgba(232,200,154,0.1),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(232,200,154,0.3)",marginBottom:8}}>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.45)",letterSpacing:1,textTransform:"uppercase"}}>{children}</span>
    </div>
  );
}
function RetroWindow({title,badge,children,onClose}){
  return(
    <div style={{border:"2.5px solid rgba(232,200,154,0.5)",background:"#120D06",boxShadow:"5px 5px 0 rgba(0,0,0,0.5)"}}>
      <div style={{background:"linear-gradient(90deg,#2C1D07,#4A2E0A)",padding:"6px 10px",display:"flex",alignItems:"center",gap:8,borderBottom:"2px solid rgba(232,200,154,0.2)"}}>
        <div style={{display:"flex",gap:4}}>
          <div onClick={onClose} style={{width:14,height:14,border:"2px solid rgba(200,80,40,0.5)",color:"rgba(200,80,40,0.6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontFamily:"monospace",cursor:"pointer"}}>✕</div>
          <div style={{width:14,height:14,border:"2px solid rgba(232,200,154,0.3)",color:"rgba(232,200,154,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontFamily:"monospace"}}>−</div>
          <div style={{width:14,height:14,border:"2px solid rgba(232,200,154,0.3)",color:"rgba(232,200,154,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontFamily:"monospace"}}>□</div>
        </div>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(232,200,154,0.5)",letterSpacing:1}}>{title}</span>
        {badge&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.3)",marginLeft:"auto"}}>{badge}</span>}
      </div>
      <div style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(8px)",padding:"18px 20px"}}>
        {children}
      </div>
    </div>
  );
}
const PILL_ON={padding:"6px 14px",borderRadius:20,fontSize:11,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.18)",cursor:"pointer"};
const PILL_OFF={padding:"6px 14px",borderRadius:20,fontSize:11,color:"rgba(255,255,255,0.3)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer"};
const FIELD_BOX={background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"rgba(255,255,255,0.6)",marginBottom:16};

/* ═══════════════════════════════════════════
   DESKTOP — Home page
   ═══════════════════════════════════════════ */
function DesktopHomePage({strains,setStrains,legacyStrains,onHand,setOnHand,coppedEntries,setCoppedEntries,reups,setReups,finishedReups,setFinishedReups,savedComparisons,savedTips,onNavigate}){
  const hasSaved=savedComparisons.length>0||savedTips.length>0;
  const openReups=reups||[];

  const[formOpen,setFormOpen]=useState(!hasSaved);
  const[activeReupId,setActiveReupId]=useState(openReups[0]?.id||null);
  const[cop,setCop]=useState({name:"",type:"",lean:"",source:"",container:"",brand:"",growType:"",terpenes:[],parent1:"",parent2:"",unknownLineage:false,notes:"",existingStrainId:null,intent:"",amount:"",copDate:""});
  const[showSugg,setShowSugg]=useState(false);

  const resetCop=()=>setCop({name:"",type:"",lean:"",source:"",container:"",brand:"",growType:"",terpenes:[],parent1:"",parent2:"",unknownLineage:false,notes:"",existingStrainId:null,intent:"",amount:"",copDate:""});

  const handleAddReup=(lite=false)=>{
    if(openReups.length>=2)return;
    const newId="r"+Date.now();
    const allAssignedNumbers=[...finishedReups,...openReups].map(x=>x.number||0);
    const nextNum=allAssignedNumbers.length>0?Math.max(...allAssignedNumbers)+1:HISTORICAL_REUPS.length+1;
    setReups([...openReups,{id:newId,...stamp(),closed:false,copIds:[],coppedIds:[],number:nextNum,...(lite?{lite:true}:{})}]);
    setActiveReupId(newId);
  };

  const activeReup=openReups.find(r=>r.id===activeReupId);
  const isLite=!!activeReup?.lite;
  const[confirmDeleteReup,setConfirmDeleteReup]=useState(null);

  // same rules as mobile: only empty re-ups, two-tap confirm, renumber after
  const handleDeleteReup=reupId=>{
    const target=openReups.find(r=>r.id===reupId);
    if(!target)return;
    if((target.copIds||[]).length!==0||(target.coppedIds||[]).length!==0)return;
    if(confirmDeleteReup!==reupId){setConfirmDeleteReup(reupId);return;}
    const remainingActive=openReups.filter(r=>r.id!==reupId);
    const sortedFinished=[...finishedReups].sort((a,b)=>(a.number||0)-(b.number||0)).map(({number,...rest})=>rest);
    const sortedActive=[...remainingActive].sort((a,b)=>(a.number||0)-(b.number||0)).map(({number,...rest})=>rest);
    const{finished:renumberedFinished,active:renumberedActive}=assignReupNumbers(sortedFinished,sortedActive);
    setFinishedReups(renumberedFinished);
    setReups(renumberedActive);
    setConfirmDeleteReup(null);
    if(activeReupId===reupId)setActiveReupId(null);
  };

  const handleSaveCop=()=>{
    if(!cop.name.trim())return;
    const newId=Date.now();
    setCoppedEntries([{id:newId,strainName:cop.name.trim(),strainId:cop.existingStrainId,reupId:activeReupId,type:cop.type,lean:cop.lean,source:cop.source,container:cop.container,brand:cop.brand,growType:cop.growType,terpenes:[...cop.terpenes],parent1:cop.parent1,parent2:cop.parent2,...stamp(),firstNotes:cop.notes,intent:cop.intent||null,amount:cop.amount||null},...coppedEntries]);
    if(activeReupId)setReups(openReups.map(r=>r.id!==activeReupId?r:{...r,coppedIds:[...(r.coppedIds||[]),newId]}));
    resetCop();
    setFormOpen(false);
  };

  // Lite cop — straight to on-hand, no first session. Mirrors mobile's handleSaveLiteCop.
  const handleSaveLiteCop=()=>{
    if(!cop.name.trim())return;
    const{copId,strainId,newCop,onHandEntry,copDate,copIso}=makeLiteCop(cop,activeReupId);
    if(cop.existingStrainId){setStrains(strains.map(s=>s.id!==cop.existingStrainId?s:{...s,intent:s.intent||cop.intent||null,cops:[...s.cops,newCop]}));
    }else{setStrains([{id:strainId,name:cop.name.trim(),parents:cop.unknownLineage?["unknown lineage"]:[cop.parent1,cop.parent2].filter(Boolean),intent:cop.intent||null,cops:[newCop]},...strains]);}
    if(activeReupId)setReups(addLiteCopToReup(openReups,activeReupId,copId,copDate,copIso));
    setOnHand([onHandEntry,...onHand]);
    resetCop();
  };

  return(
    <div style={{flex:1,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`url(${DESKTOP_HOME_BG})`,backgroundSize:"cover",backgroundPosition:"center"}}/>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.48)"}}/>
      <div style={{position:"relative",height:"100%",overflowY:"auto",padding:"32px 36px"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"rgba(255,255,255,0.9)",marginBottom:20}}>home</div>

        {!formOpen&&(
          <RetroCard onClick={()=>setFormOpen(true)} style={{padding:14,marginBottom:24,textAlign:"center"}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.8)"}}>+ log a new cop</span>
          </RetroCard>
        )}

        {!formOpen&&hasSaved&&(
          <div style={{display:"flex",gap:12,marginTop:24}}>
            {savedComparisons.length>0&&(
              <div onClick={()=>onNavigate("compare")} style={{flex:1,border:"1.5px solid rgba(196,184,216,0.2)",background:"rgba(30,24,40,0.5)",borderRadius:4,padding:16,backdropFilter:"blur(12px)",position:"relative",overflow:"hidden",cursor:"pointer"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,rgba(196,184,216,0.3),rgba(196,184,216,0.05))"}}/>
                <div style={{background:"linear-gradient(90deg,rgba(196,184,216,0.12),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(196,184,216,0.4)",marginBottom:10}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(196,184,216,0.5)",letterSpacing:1}}>LAST COMPARISON</span>
                </div>
                <div style={{fontSize:13,color:"rgba(196,184,216,0.85)",marginBottom:2}}>{savedComparisons[0].a} vs {savedComparisons[0].b}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(196,184,216,0.3)"}}>{savedComparisons[0].date}</div>
              </div>
            )}
            {savedTips.length>0&&(
              <div onClick={()=>onNavigate("recommender")} style={{flex:1,border:"1.5px solid rgba(200,212,232,0.12)",background:"rgba(26,31,46,0.5)",borderRadius:4,padding:16,backdropFilter:"blur(12px)",position:"relative",overflow:"hidden",cursor:"pointer"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,rgba(200,212,232,0.2),rgba(200,212,232,0.03))"}}/>
                <div style={{background:"linear-gradient(90deg,rgba(200,212,232,0.08),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(200,212,232,0.3)",marginBottom:10}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.4)",letterSpacing:1}}>SAVED TIPS</span>
                </div>
                {savedTips.slice(0,2).map(t=>(
                  <div key={t.id} style={{fontSize:11,color:"rgba(200,212,232,0.75)",marginBottom:4}}>{(t.terpenes||[]).join(" + ")}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {formOpen&&(
          <>
            <div style={{display:"flex",gap:8,margin:"16px 0"}}>
              {openReups.map(r=>(
                <div key={r.id} onClick={()=>setActiveReupId(r.id)} style={{cursor:"pointer"}}>
                  <RetroWindow title={"RE-UP #"+r.number+(r.lite?" · LITE":"")} badge={activeReupId===r.id?"SELECTED":null}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.3)"}}>{(r.coppedIds?.length||0)+(r.copIds?.length||0)} STRAIN(S)</div>
                    {(r.coppedIds?.length||0)+(r.copIds?.length||0)===0&&<div onClick={e=>{e.stopPropagation();handleDeleteReup(r.id);}} style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,80,40,0.75)",cursor:"pointer",marginTop:6}}>{confirmDeleteReup===r.id?"CONFIRM DELETE?":"DELETE EMPTY RE-UP"}</div>}
                  </RetroWindow>
                </div>
              ))}
              {openReups.length<2&&<><div onClick={()=>handleAddReup(false)} style={{padding:"10px 16px",border:"2px dashed rgba(232,200,154,0.12)",display:"flex",alignItems:"center",cursor:"pointer"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.2)"}}>+ NEW</span>
              </div>
              <div onClick={()=>handleAddReup(true)} title="skips the first sesh — for what you're already smoking" style={{padding:"10px 16px",border:"2px dashed rgba(232,200,154,0.12)",display:"flex",alignItems:"center",cursor:"pointer"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.2)"}}>+ NEW LITE</span>
              </div></>}
            </div>

            <RetroWindow title={isLite?"LOG A LITE COP":"LOG A NEW COP"} badge={isLite?"→ NO FIRST SESH 🌿":activeReupId?"→ SELECTED RE-UP":null} onClose={()=>setFormOpen(false)}>
              <div style={{display:"flex",gap:20}}>
                <div style={{flex:1}}>
                  {isLite&&<><RetroHeader>cop date</RetroHeader>
                  <input type="date" value={cop.copDate||todayIso()} max={todayIso()} onChange={e=>setCop({...cop,copDate:e.target.value})} style={{width:"100%",boxSizing:"border-box",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"rgba(255,255,255,0.75)",fontFamily:"inherit",outline:"none",marginBottom:16,colorScheme:"dark"}}/></>}
                  <RetroHeader>intent</RetroHeader>
                  <div style={{display:"flex",gap:5,marginBottom:16}}>
                    {[["asleep","🌙 asleep"],["awake","☀️ awake"],["adventure","🏕️ adventure"]].map(([v,label])=>(
                      <span key={v} onClick={()=>setCop({...cop,intent:cop.intent===v?"":v})} style={cop.intent===v?PILL_ON:PILL_OFF}>{label}</span>
                    ))}
                  </div>
                  <RetroHeader>strain name</RetroHeader>
                  <div style={{marginBottom:16}}>
                    <StrainNameInput
                      initialValue={cop.name}
                      strains={strains}
                      legacyStrains={legacyStrains}
                      existingStrainId={cop.existingStrainId}
                      showSugg={showSugg}
                      setShowSugg={setShowSugg}
                      onBlur={name=>setCop({...cop,name,existingStrainId:null})}
                      onSelect={s=>{
                        if(s.legacy){setCop({...cop,name:s.name,type:s.type||cop.type});}
                        else{const lc=s.cops[s.cops.length-1];setCop({...cop,name:s.name,type:lc.type||"",lean:lc.lean||"",parent1:s.parents?.[0]||"",parent2:s.parents?.[1]||"",existingStrainId:s.id});}
                      }}
                    />
                  </div>
                  <RetroHeader>type</RetroHeader>
                  <div style={{display:"flex",gap:5}}>
                    {["Sativa","Hybrid","Indica"].map(t=>(
                      <span key={t} onClick={()=>setCop({...cop,type:t,lean:""})} style={cop.type===t?PILL_ON:PILL_OFF}>{t}</span>
                    ))}
                  </div>
                  {cop.type==="Hybrid"&&<div style={{display:"flex",gap:5,marginTop:8}}>
                    {["Sativa-lean","Indica-lean","Balanced"].map(l=>(
                      <span key={l} onClick={()=>setCop({...cop,lean:l})} style={{...(cop.lean===l?PILL_ON:PILL_OFF),fontSize:10}}>{l}</span>
                    ))}
                  </div>}
                </div>
                <div style={{flex:1}}>
                  <RetroHeader>amount</RetroHeader>
                  <div style={{display:"flex",gap:5,marginBottom:16}}>
                    {[["8th","⅛"],["quarter","¼"],["half","½"],["oz","oz"]].map(([v,label])=>(
                      <span key={v} onClick={()=>setCop({...cop,amount:cop.amount===v?"":v})} style={cop.amount===v?PILL_ON:PILL_OFF}>{label}</span>
                    ))}
                  </div>
                  <RetroHeader>terpenes</RetroHeader>
                  <div style={{marginBottom:16}}>
                    <TerpeneSelector selected={cop.terpenes} onChange={t=>setCop({...cop,terpenes:t})}/>
                  </div>
                  <RetroHeader>source</RetroHeader>
                  <div style={{display:"flex",gap:5,marginBottom:8}}>
                    {["TL","Dispensary"].map(s=>(
                      <span key={s} onClick={()=>setCop({...cop,source:s,container:"",brand:""})} style={cop.source===s?PILL_ON:PILL_OFF}>{s}</span>
                    ))}
                  </div>
                  {cop.source==="Dispensary"&&(<>
                    <div style={{display:"flex",gap:5,marginBottom:8}}>
                      {["Bag","Jar"].map(c=>(
                        <span key={c} onClick={()=>setCop({...cop,container:c})} style={{...(cop.container===c?PILL_ON:PILL_OFF),fontSize:10}}>{c}</span>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:5,marginBottom:8}}>
                      {["Indoor grown","Greenhouse grown","Outdoor grown"].map(g=>(
                        <span key={g} onClick={()=>setCop({...cop,growType:g})} style={{...(cop.growType===g?PILL_ON:PILL_OFF),fontSize:10}}>{g}</span>
                      ))}
                    </div>
                    <input value={cop.brand} onChange={e=>setCop({...cop,brand:e.target.value})} placeholder="brand (optional)" style={{...FIELD_BOX,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}/>
                  </>)}
                </div>
              </div>
              {!cop.existingStrainId&&(
                <div style={{marginTop:8}}>
                  <RetroHeader>parent strains (optional)</RetroHeader>
                  {!cop.unknownLineage&&<div style={{display:"flex",gap:8,marginBottom:8}}>
                    <input value={cop.parent1} onChange={e=>setCop({...cop,parent1:e.target.value})} placeholder="parent 1" style={{...FIELD_BOX,flex:1,marginBottom:0,outline:"none",fontFamily:"inherit"}}/>
                    <input value={cop.parent2} onChange={e=>setCop({...cop,parent2:e.target.value})} placeholder="parent 2" style={{...FIELD_BOX,flex:1,marginBottom:0,outline:"none",fontFamily:"inherit"}}/>
                  </div>}
                  <span onClick={()=>setCop({...cop,unknownLineage:!cop.unknownLineage,parent1:"",parent2:""})} style={{...(cop.unknownLineage?PILL_ON:PILL_OFF),fontSize:10}}>unknown lineage{cop.unknownLineage?" ✓":""}</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                <button onClick={isLite?handleSaveLiteCop:handleSaveCop} disabled={!cop.name.trim()} style={{padding:"10px 24px",background:cop.name.trim()?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)",border:"1.5px solid rgba(232,200,154,0.3)",borderRadius:8,color:cop.name.trim()?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.35)",fontSize:12,fontFamily:"inherit",cursor:cop.name.trim()?"pointer":"default"}}>{isLite?"add to lite re-up":"save cop"}</button>
              </div>
            </RetroWindow>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STASH SIDEBAR OVERLAY (Desktop)
   ═══════════════════════════════════════════ */
function StashSidebar({stashOpen,setStashOpen,strains,onHand,coppedEntries,finishedReups,onSelectStrain}){
  if(!stashOpen)return null;
  const getTypeColor=t=>({"Sativa":"#C9A84C","Indica":"#7B6B9E","Hybrid":"#6B7F5A"}[t]||"#8C7E6A");
  // takes the record so it can use dateIso; falls back to inferring from the
  // year-less display string for anything predating that field
  const daysSince=rec=>{
    const iso=typeof rec==="string"?inferIso(rec):resolveIso(rec);
    if(!iso)return null;
    const d=new Date(iso+"T00:00:00");
    if(isNaN(d.getTime()))return null;
    return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));
  };

  const StrainCard=({name,type,meta,onClick})=>{
    const typeColor=getTypeColor(type);
    return(
      <div onClick={onClick}
        style={{padding:"12px 14px",borderRadius:6,marginBottom:6,position:"relative",overflow:"hidden",background:"rgba(10,8,5,0.75)",border:"1.5px solid rgba(91,138,114,0.18)",cursor:"pointer"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,${typeColor}50,transparent)`}}/>
        <div style={{fontSize:15,color:"rgba(255,255,255,0.9)",fontWeight:500}}>{name}</div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:3}}>{meta}</div>
      </div>
    );
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:100,display:"flex",pointerEvents:"auto"}}>
      <div style={{width:"30vw",minWidth:340,maxWidth:560,flexShrink:0,position:"relative",background:"#081A08",borderRight:"0.5px solid rgba(232,200,154,0.08)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Botanical background SVG pattern */}
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

        {/* Content */}
        <div style={{position:"relative",padding:"26px 24px 18px",flex:1,overflowY:"auto",zIndex:1}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#E8C89A",letterSpacing:1,marginBottom:20}}>cLOUD</div>

          {/* Stash header */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(58,107,42,0.15)",border:"1.5px solid rgba(58,107,42,0.3)",borderRadius:8,marginBottom:22}}>
            <span style={{fontSize:16,color:"rgba(140,200,140,0.8)"}}>◈</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"rgba(140,200,140,0.8)"}}>STASH</span>
            <span onClick={()=>setStashOpen(false)} style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"rgba(140,200,140,0.4)",marginLeft:"auto",cursor:"pointer"}}>✕</span>
          </div>

          {/* Needs Review */}
          <div style={{padding:"6px 10px",borderRadius:"0 4px 4px 0",marginBottom:10,display:"flex",alignItems:"center",background:"linear-gradient(90deg,rgba(139,109,139,0.2),rgba(10,8,5,0.6))",borderLeft:"2px solid rgba(139,109,139,0.5)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1,color:"rgba(139,109,139,0.7)"}}>NEEDS REVIEW · {coppedEntries.length}</span>
          </div>
          {coppedEntries.map(e=>(
            <StrainCard key={e.id} name={e.strainName} type={e.type}
              meta={`${(e.type||"unknown").toUpperCase()} · logged ${e.date||"—"}`}
              onClick={()=>onSelectStrain({id:e.id,name:e.strainName,type:e.type,cops:[{id:e.id,type:e.type,lean:e.lean,terpenes:e.terpenes||[],date:e.date,notes:e.firstNotes?[e.firstNotes]:[],experiences:[],mixes:[]}]})}
            />
          ))}

          {/* On Hand */}
          <div style={{padding:"6px 10px",borderRadius:"0 4px 4px 0",marginBottom:10,marginTop:20,display:"flex",alignItems:"center",background:"linear-gradient(90deg,rgba(91,138,114,0.2),rgba(10,8,5,0.6))",borderLeft:"2px solid rgba(91,138,114,0.5)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1,color:"rgba(91,138,114,0.8)"}}>ON HAND · {onHand.length}</span>
          </div>
          {onHand.map(oh=>{
            const strain=strains.find(s=>s.id===oh.strainId);
            if(!strain)return null;
            const days=daysSince(oh);
            const type=oh.type||strain.type;
            return(
              <StrainCard key={oh.copId||oh.strainId} name={strain.name} type={type}
                meta={`${(type||"unknown").toUpperCase()}${days!==null?` · day ${days}`:""}${oh.lite?" · LITE 🌬️":""}`}
                onClick={()=>onSelectStrain(strain)}
              />
            );
          })}

          {/* Finished Re-ups */}
          <div style={{padding:"6px 10px",borderRadius:"0 4px 4px 0",marginBottom:10,marginTop:20,display:"flex",alignItems:"center",background:"linear-gradient(90deg,rgba(232,200,154,0.12),rgba(10,8,5,0.6))",borderLeft:"2px solid rgba(232,200,154,0.3)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1,color:"rgba(232,200,154,0.55)"}}>FINISHED RE-UPS</span>
          </div>
          {[...finishedReups].sort((a,b)=>(b.number||0)-(a.number||0)).slice(0,5).map(rup=>(
            <div key={rup.id} style={{padding:"12px 14px",borderRadius:6,marginBottom:8,background:"rgba(10,8,5,0.65)",border:"1.5px solid rgba(232,200,154,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:500,color:"rgba(232,200,154,0.85)"}}>📦 re-up #{rup.number||"?"} · {rup.date}</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(232,200,154,0.3)"}}>closed {rup.closedDate}</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(rup.strainNames||[]).map((n,i)=><span key={i} style={{fontSize:11,background:"rgba(232,200,154,0.08)",color:"rgba(232,200,154,0.6)",padding:"3px 8px",borderRadius:8}}>{n}</span>)}</div>
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

/* ═══════════════════════════════════════════
   STRAIN DETAIL WINDOW (Desktop)
   ═══════════════════════════════════════════ */
function StrainDetailWindow({selectedStrain,detailTab:detailTabProp,setDetailTab,onClose,strains,onHand,onAddNote,onEditNote,onDeleteNote,onAddExperience,onFinishCop,onCreateMix}){
  if(!selectedStrain)return null;

  const liveStrain=strains.find(s=>s.id===selectedStrain.id)||null;
  const isReal=!!liveStrain;
  const strain=liveStrain||selectedStrain;
  const cops=strain.cops||[];
  // default to the most recent cop — cops[] is appended to, so [0] is the oldest
  const[copIdx,setCopIdx]=useState(Math.max(0,cops.length-1));
  const cop=cops[Math.min(copIdx,cops.length-1)];
  const session=cop?.session;
  const canEdit=isReal&&cop?.status==="on-hand";
  // same rule as mobile — hide a tab that's empty and can't be added to
  const tabHasContent=t=>t==="notes"?(cop?.notes||[]).length>0:t==="experiences"?(cop?.experiences||[]).length>0:t==="mixes"?(cop?.mixes||[]).length>0:true;
  const visibleTabs=["overview","notes","experiences","mixes"].filter(t=>t==="overview"||tabHasContent(t)||canEdit);
  const detailTab=visibleTabs.includes(detailTabProp)?detailTabProp:"overview";

  const[addingNote,setAddingNote]=useState(false);
  const[noteDraft,setNoteDraft]=useState("");
  const[editingNoteId,setEditingNoteId]=useState(null);
  const[editNoteDraft,setEditNoteDraft]=useState("");
  const[confirmDeleteNoteId,setConfirmDeleteNoteId]=useState(null);
  const[addingExp,setAddingExp]=useState(false);
  const[expDraft,setExpDraft]=useState({text:"",setting:"indoor",bedtime:false,vibeTags:[]});
  const[finishing,setFinishing]=useState(false);
  const[copAgainChoice,setCopAgainChoice]=useState("");
  const[mixMode,setMixMode]=useState(false);
  const[mixWith,setMixWith]=useState(null);
  const[mixSess,setMixSess]=useState({rating:0,sw:0,sf:0,pull:0,bedtime:false,vibeTags:[],notes:""});

  const saveNote=()=>{
    if(!isReal||!noteDraft.trim())return;
    onAddNote(strain.id,cop.id,noteDraft);
    setNoteDraft("");setAddingNote(false);
  };
  const saveEditNote=noteId=>{
    if(!editNoteDraft.trim())return;
    onEditNote(strain.id,cop.id,noteId,editNoteDraft);
    setEditingNoteId(null);setEditNoteDraft("");
  };
  const deleteNote=noteId=>{
    if(confirmDeleteNoteId!==noteId){setConfirmDeleteNoteId(noteId);return;}
    onDeleteNote(strain.id,cop.id,noteId);
    setConfirmDeleteNoteId(null);
  };
  const saveExperience=()=>{
    if(!isReal)return;
    if(!expDraft.text.trim()&&expDraft.vibeTags.length===0)return;
    onAddExperience(strain.id,cop.id,expDraft.text,expDraft.setting,expDraft.bedtime,expDraft.vibeTags);
    setExpDraft({text:"",setting:"indoor",bedtime:false,vibeTags:[]});setAddingExp(false);
  };
  const confirmFinish=()=>{
    onFinishCop({strainId:strain.id,copId:cop.id},copAgainChoice);
    onClose();
  };
  const saveMix=rateLater=>{
    if(!mixWith)return;
    onCreateMix(strain,cop,mixWith,mixSess,rateLater);
    setMixWith(null);setMixMode(false);setMixSess({rating:0,sw:0,sf:0,pull:0,bedtime:false,vibeTags:[],notes:""});
  };

  const typeThemes={
    Indica:{border:"rgba(139,109,180,0.6)",gradient:"linear-gradient(90deg,#1A1028,#2E1A3A,#1A1028)",accent:"rgba(139,109,180)",text:"rgba(196,184,216)",lightText:"rgba(196,184,216,0.7)",dimText:"rgba(139,109,180,0.5)",cardBg:"rgba(139,109,180,0.06)",cardBorder:"rgba(139,109,180,0.12)",buttonBg:"rgba(139,109,180,0.15)",buttonBorder:"rgba(139,109,180,0.3)"},
    Sativa:{border:"rgba(200,170,80,0.6)",gradient:"linear-gradient(90deg,#2C1D07,#4A3010,#2C1D07)",accent:"rgba(200,170,80)",text:"rgba(232,210,160)",lightText:"rgba(232,210,160,0.7)",dimText:"rgba(200,170,80,0.5)",cardBg:"rgba(200,170,80,0.06)",cardBorder:"rgba(200,170,80,0.12)",buttonBg:"rgba(200,170,80,0.08)",buttonBorder:"rgba(200,170,80,0.2)"},
    Hybrid:{border:"rgba(91,138,114,0.6)",gradient:"linear-gradient(90deg,#0A1A10,#1A2E20,#0A1A10)",accent:"rgba(91,138,114)",text:"rgba(160,210,180)",lightText:"rgba(160,210,180,0.7)",dimText:"rgba(91,138,114,0.5)",cardBg:"rgba(91,138,114,0.06)",cardBorder:"rgba(91,138,114,0.12)",buttonBg:"rgba(91,138,114,0.08)",buttonBorder:"rgba(91,138,114,0.2)"}
  };
  const theme=typeThemes[cop?.type]||typeThemes.Hybrid;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:150,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px",overflowY:"auto",pointerEvents:"auto"}}>
      <div style={{position:"relative",zIndex:2,width:"100%",maxWidth:420,borderRadius:0,border:`2.5px solid ${theme.border}`,background:"rgba(18,13,6,0.92)",boxShadow:"6px 6px 0 rgba(0,0,0,0.5)",overflow:"hidden",marginTop:"20px"}}>
        {/* Title bar */}
        <div style={{background:theme.gradient,borderBottom:`2px solid ${theme.border}`,padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",gap:4}}>
            <div style={{width:14,height:14,borderRadius:"50%",border:`1px solid rgba(200,100,100,0.4)`,color:"rgba(200,100,100,0.6)",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</div>
            <div style={{width:14,height:14,borderRadius:"50%",border:`1px solid ${theme.border}`,color:theme.dimText,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>−</div>
            <div style={{width:14,height:14,borderRadius:"50%",border:`1px solid ${theme.border}`,color:theme.dimText,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>□</div>
          </div>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:theme.text,letterSpacing:1}}>{strain.name.toUpperCase()}</span>
          <span style={{fontSize:9,color:theme.dimText,marginLeft:"auto"}}>{cop?.type?.toLowerCase()}</span>
        </div>

        {/* Body */}
        <div style={{padding:"12px 16px 14px",background:`linear-gradient(180deg,${theme.accent}15,transparent 50%)`}}>
          {/* Cop info */}
          <div style={{display:"flex",gap:4,marginBottom:10}}>
            <span style={{padding:"4px 10px",borderRadius:12,fontSize:10,background:`${theme.accent}30`,color:theme.text,border:`0.5px solid ${theme.accent}40`}}>cop 1 · {cop?.date||"—"}</span>
          </div>

          {/* Cop switcher — re-copped strains keep every cop's own notes/experiences */}
          {cops.length>1&&<div style={{display:"flex",gap:3,marginBottom:8,overflowX:"auto"}}>
            {cops.map((c,i)=>(
              <button key={c.id} onClick={()=>setCopIdx(i)} style={{padding:"4px 10px",borderRadius:16,fontSize:9,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap",cursor:"pointer",background:copIdx===i?`${theme.accent}30`:"transparent",border:`1px solid ${copIdx===i?theme.accent:theme.cardBorder}`,color:copIdx===i?theme.text:theme.dimText}}>cop #{i+1}{c.date?` · ${c.date}`:""}</button>
            ))}
          </div>}

          {/* Tabs */}
          <div style={{display:"flex",gap:3,marginBottom:12}}>
            {visibleTabs.map(t=>(
              <button key={t} onClick={()=>setDetailTab(t)} style={{flex:1,padding:"5px 12px",borderRadius:16,fontSize:11,fontFamily:"inherit",cursor:"pointer",background:detailTab===t?`${theme.accent}30`:"transparent",color:detailTab===t?theme.text:theme.dimText,border:detailTab===t?`0.5px solid ${theme.accent}60`:`0.5px solid ${theme.accent}20`,fontWeight:detailTab===t?500:400}}>{t}</button>
            ))}
          </div>

          {/* Tab content */}
          {detailTab==="overview"&&(
            <div>
              {/* Rating */}
              {session&&<div style={{textAlign:"center",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"center",gap:4}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=session.rating} size={16} color={theme.accent}/>)}</div>
                {session.copAgain&&<span style={{fontSize:9,color:theme.dimText,marginTop:3,display:"block"}}>{session.copAgain.toLowerCase()}</span>}
              </div>}

              {/* Spectrums */}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>SPECTRUMS</div>
                {session?.spectrums?(<>
                  <DarkSpectrumDisplay left="couch" right="active" val={session.spectrums.sw} theme={theme}/>
                  <DarkSpectrumDisplay left="dreamy" right="analytical" val={session.spectrums.sf} theme={theme}/>
                  <DarkSpectrumDisplay left="smooth" right="harsh" val={session.pull} theme={theme}/>
                </>):(
                  <p style={{fontSize:10,color:theme.dimText}}>{cop?.lite?"no spectrums — this one skipped the first sesh 🤷🏾":"no session review yet"}</p>
                )}
              </div>

              {/* Terpenes */}
              {cop?.terpenes?.length>0&&<div style={{marginBottom:10}}>
                <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>TERPENES</div>
                <div>
                  {cop.terpenes.map(t=>(
                    <span key={t} style={{padding:"4px 11px",borderRadius:16,fontSize:10,display:"inline-block",margin:"0 4px 4px 0",background:`${theme.accent}20`,color:theme.text,border:`1px solid ${theme.accent}40`}}>{t.toLowerCase()}</span>
                  ))}
                </div>
              </div>}

              {/* Details */}
              {(cop?.source||cop?.brand||cop?.growType||session)&&<div style={{marginBottom:10}}>
                <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>DETAILS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                  {cop?.source&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:theme.cardBg,color:theme.dimText,border:`0.5px solid ${theme.cardBorder}`}}>{cop.source==="TL"?"TL":cop.source?.toLowerCase()}{cop.container?` · ${cop.container.toLowerCase()}`:""}</span>}
                  {cop?.brand&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:theme.cardBg,color:theme.dimText,border:`0.5px solid ${theme.cardBorder}`}}>{cop.brand}</span>}
                  {cop?.growType&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:theme.cardBg,color:theme.dimText,border:`0.5px solid ${theme.cardBorder}`}}>{cop.growType.toLowerCase()}</span>}
                  {session&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:session.setting==="outdoor"?"rgba(91,138,114,0.2)":session.bedtime?"rgba(44,44,74,0.5)":theme.cardBg,color:session.setting==="outdoor"?"#6B8F5A":session.bedtime?"#C9B8F0":theme.dimText}}>{session.setting==="outdoor"?"outdoor":session.bedtime?"bedtime":"indoor"}</span>}
                  {session?.smokesLike&&session.smokesLike!==cop?.type&&<span style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:"rgba(193,127,74,0.15)",color:"#C17F4A"}}>smokes {session.smokesLike.toLowerCase()}</span>}
                </div>
                {(()=>{const fi=cop?.firstNotes||(cop?.notes?.length>0?cop.notes[0].text:null)||session?.notes||null;if(!fi)return null;const fiDate=cop?.firstNotes?cop?.date:cop?.notes?.[0]?.date||cop?.date;return(<div>
                  <div style={{fontSize:9,color:theme.dimText,marginBottom:2}}>first impressions{fiDate?` · ${fiDate}`:""}</div>
                  <div style={{fontSize:11,color:theme.text,lineHeight:1.4,opacity:0.85}}>{fi}</div>
                </div>);})()}
              </div>}

              {/* Vibes + taste */}
              {session&&(session.vibeTags?.length>0||session.tasteTags?.length>0)&&<div style={{marginBottom:10}}>
                <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 8px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>VIBES</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {session.tasteTags?.map(t=><span key={t} style={{fontSize:9,padding:"3px 8px",borderRadius:8,background:"rgba(193,127,74,0.15)",color:"#C17F4A"}}>{t.toLowerCase()}</span>)}
                  {session.vibeTags?.map(t=><span key={t} style={{fontSize:9,padding:"3px 8px",borderRadius:8,background:theme.cardBg,color:theme.dimText,border:`0.5px solid ${theme.cardBorder}`}}>{t.toLowerCase()}</span>)}
                </div>
              </div>}

              {/* Action buttons */}
              <div style={{display:"flex",gap:6,paddingTop:10,marginTop:10,borderTop:`0.5px solid ${theme.accent}30`}}>
                <button onClick={()=>{setDetailTab("notes");setAddingNote(true);}} disabled={!isReal} style={{flex:1,padding:"8px",fontSize:9,fontFamily:"'DM Mono',monospace",cursor:isReal?"pointer":"default",textAlign:"center",borderRadius:0,background:theme.buttonBg,border:`1px solid ${theme.buttonBorder}`,color:theme.text,opacity:isReal?1:0.4}}>+ NOTE</button>
                <button onClick={()=>{setDetailTab("experiences");setAddingExp(true);}} disabled={!isReal} style={{flex:1,padding:"8px",fontSize:9,fontFamily:"'DM Mono',monospace",cursor:isReal?"pointer":"default",textAlign:"center",borderRadius:0,background:theme.buttonBg,border:`1px solid ${theme.buttonBorder}`,color:theme.text,opacity:isReal?1:0.4}}>+ EXPERIENCE</button>
                <button onClick={()=>setFinishing(true)} disabled={!canEdit} style={{flex:1,padding:"8px",fontSize:9,fontFamily:"'DM Mono',monospace",cursor:canEdit?"pointer":"default",textAlign:"center",borderRadius:0,background:"rgba(91,138,114,0.1)",border:"1px solid rgba(91,138,114,0.25)",color:"rgba(91,138,114,0.7)",opacity:canEdit?1:0.4}}>{cop?.status==="done"?"FINISHED":"FINISHED"}</button>
              </div>
              {!isReal&&<p style={{fontSize:10,color:theme.dimText,marginTop:8,fontStyle:"italic"}}>finish reviewing this cop to add notes or experiences</p>}
              {isReal&&cop?.status==="done"&&<p style={{fontSize:10,color:theme.dimText,marginTop:8,fontStyle:"italic"}}>this cop is already finished</p>}
              {finishing&&(
                <div style={{marginTop:10,padding:10,background:theme.cardBg,border:`1px solid ${theme.cardBorder}`,borderRadius:4}}>
                  <div style={{fontSize:11,color:theme.text,marginBottom:8}}>would you cop again?</div>
                  <div style={{display:"flex",gap:5,marginBottom:10}}>
                    {["Yes","Maybe","No","Never again"].map(o=>(
                      <span key={o} onClick={()=>setCopAgainChoice(o)} style={{flex:1,padding:"6px 4px",borderRadius:4,fontSize:9,textAlign:"center",cursor:"pointer",background:copAgainChoice===o?copAgainColor(o):"transparent",color:copAgainChoice===o?"#fff":theme.dimText,border:copAgainChoice===o?"none":`0.5px solid ${theme.cardBorder}`}}>{o.toLowerCase()}</span>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <span onClick={()=>{setFinishing(false);setCopAgainChoice("");}} style={{padding:"6px 16px",fontSize:11,color:theme.dimText,cursor:"pointer"}}>cancel</span>
                    <span onClick={confirmFinish} style={{padding:"6px 16px",fontSize:11,background:`${theme.accent}30`,border:`1px solid ${theme.accent}50`,color:theme.text,cursor:"pointer",borderRadius:4}}>confirm</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {detailTab==="notes"&&(
            <div>
              <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 12px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>NOTES</div>
              {isReal&&!addingNote&&<button onClick={()=>setAddingNote(true)} style={{width:"100%",padding:8,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:theme.buttonBg,border:`1px solid ${theme.buttonBorder}`,color:theme.text,marginBottom:12}}>+ add note</button>}
              {addingNote&&(
                <div>
                  <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="write your note..." rows={3} style={{width:"100%",boxSizing:"border-box",background:theme.cardBg,border:`1px solid ${theme.cardBorder}`,borderRadius:4,padding:10,fontSize:12,color:theme.text,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:8}}/>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:12}}>
                    <span onClick={()=>{setAddingNote(false);setNoteDraft("");}} style={{padding:"6px 16px",fontSize:11,color:theme.dimText,cursor:"pointer"}}>cancel</span>
                    <span onClick={saveNote} style={{padding:"6px 16px",fontSize:11,background:`${theme.accent}30`,border:`1px solid ${theme.accent}50`,color:theme.text,cursor:"pointer",borderRadius:4}}>save note</span>
                  </div>
                </div>
              )}
              {(!cop?.notes||cop.notes.length===0)&&!addingNote&&<p style={{fontSize:11,color:theme.dimText,fontStyle:"italic"}}>no notes yet</p>}
              {(cop?.notes||[]).slice().reverse().map(n=>(
                <div key={n.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:6,background:theme.cardBg,border:`0.5px solid ${theme.cardBorder}`}}>
                  {editingNoteId===n.id?(
                    <div>
                      <textarea value={editNoteDraft} onChange={e=>setEditNoteDraft(e.target.value)} rows={3} style={{width:"100%",boxSizing:"border-box",background:"transparent",border:`1px solid ${theme.cardBorder}`,borderRadius:4,padding:8,fontSize:12,color:theme.text,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:6}}/>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <span onClick={()=>{setEditingNoteId(null);setEditNoteDraft("");}} style={{fontSize:10,color:theme.dimText,cursor:"pointer"}}>cancel</span>
                        <span onClick={()=>saveEditNote(n.id)} style={{fontSize:10,color:theme.accent,fontWeight:500,cursor:"pointer"}}>save</span>
                      </div>
                    </div>
                  ):(
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{fontSize:12,color:theme.text,marginBottom:4,flex:1}}>{n.text}</div>
                        {canEdit&&(
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <span onClick={()=>{setEditingNoteId(n.id);setEditNoteDraft(n.text);}} style={{fontSize:9,color:theme.dimText,cursor:"pointer"}}>edit</span>
                            <span onClick={()=>deleteNote(n.id)} style={{fontSize:9,color:"#C15A4A",cursor:"pointer"}}>{confirmDeleteNoteId===n.id?"confirm?":"delete"}</span>
                          </div>
                        )}
                      </div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:theme.dimText}}>{n.date}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {detailTab==="experiences"&&(
            <div>
              <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 12px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>EXPERIENCES</div>
              {isReal&&!addingExp&&<button onClick={()=>setAddingExp(true)} style={{width:"100%",padding:8,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:theme.buttonBg,border:`1px solid ${theme.buttonBorder}`,color:theme.text,marginBottom:12}}>+ log experience</button>}
              {addingExp&&(
                <div style={{background:theme.cardBg,border:`1px solid ${theme.cardBorder}`,borderRadius:4,padding:10,marginBottom:12}}>
                  <div style={{display:"flex",gap:5,marginBottom:8}}>
                    {["indoor","outdoor"].map(s=>(
                      <span key={s} onClick={()=>setExpDraft({...expDraft,setting:s,bedtime:s==="outdoor"?false:expDraft.bedtime})} style={{padding:"5px 12px",borderRadius:16,fontSize:10,cursor:"pointer",background:expDraft.setting===s?`${theme.accent}30`:"transparent",color:expDraft.setting===s?theme.text:theme.dimText,border:expDraft.setting===s?`0.5px solid ${theme.accent}60`:`0.5px solid ${theme.accent}20`}}>{s}</span>
                    ))}
                    {expDraft.setting==="indoor"&&<span onClick={()=>setExpDraft({...expDraft,bedtime:!expDraft.bedtime})} style={{padding:"5px 12px",borderRadius:16,fontSize:10,cursor:"pointer",background:expDraft.bedtime?`${theme.accent}30`:"transparent",color:expDraft.bedtime?theme.text:theme.dimText,border:expDraft.bedtime?`0.5px solid ${theme.accent}60`:`0.5px solid ${theme.accent}20`}}>🌙 bedtime</span>}
                  </div>
                  <textarea value={expDraft.text} onChange={e=>setExpDraft({...expDraft,text:e.target.value})} placeholder="what was different this time..." rows={3} style={{width:"100%",boxSizing:"border-box",background:"transparent",border:`1px solid ${theme.cardBorder}`,borderRadius:4,padding:10,fontSize:12,color:theme.text,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:8}}/>
                  <div style={{marginBottom:8}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={expDraft.vibeTags} onChange={v=>setExpDraft({...expDraft,vibeTags:v})} color={theme.accent}/></div>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <span onClick={()=>{setAddingExp(false);setExpDraft({text:"",setting:"indoor",bedtime:false,vibeTags:[]});}} style={{padding:"6px 16px",fontSize:11,color:theme.dimText,cursor:"pointer"}}>cancel</span>
                    <span onClick={saveExperience} style={{padding:"6px 16px",fontSize:11,background:`${theme.accent}30`,border:`1px solid ${theme.accent}50`,color:theme.text,cursor:"pointer",borderRadius:4}}>save</span>
                  </div>
                </div>
              )}
              {(!cop?.experiences||cop.experiences.length===0)&&!addingExp&&<p style={{fontSize:11,color:theme.dimText,fontStyle:"italic"}}>no experiences logged yet</p>}
              {(cop?.experiences||[]).slice().reverse().map(exp=>(
                <div key={exp.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:6,background:theme.cardBg,border:`0.5px solid ${theme.cardBorder}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:theme.dimText}}>{exp.date}</span>
                    <span style={{fontSize:9,padding:"1px 6px",borderRadius:6,background:`${theme.accent}20`,color:theme.dimText}}>{exp.bedtime?"bedtime":exp.setting}</span>
                  </div>
                  {exp.note&&<p style={{fontSize:12,color:theme.text,margin:"0 0 4px"}}>{exp.note}</p>}
                  {exp.vibeTags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{exp.vibeTags.map(t=><span key={t} style={{fontSize:9,background:`${theme.accent}20`,color:theme.text,padding:"1px 6px",borderRadius:6}}>{t.toLowerCase()}</span>)}</div>}
                </div>
              ))}
            </div>
          )}

          {detailTab==="mixes"&&(
            <div>
              <div style={{fontSize:8,fontWeight:500,color:theme.dimText,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 12px",borderLeft:`2px solid ${theme.accent}`,background:`linear-gradient(90deg,${theme.accent}30,transparent)`,padding:"4px 8px"}}>MIXES</div>

              {canEdit&&!mixMode&&<button onClick={()=>setMixMode(true)} style={{width:"100%",padding:8,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer",background:theme.buttonBg,border:`1px solid ${theme.buttonBorder}`,color:theme.text,marginBottom:12}}>+ log a mix</button>}

              {mixMode&&(
                <div style={{background:theme.cardBg,border:`1px solid ${theme.cardBorder}`,borderRadius:4,padding:10,marginBottom:12}}>
                  <div style={{fontSize:11,color:theme.text,marginBottom:8}}>mix {strain.name} with:</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
                    {onHand.filter(o=>o.strainId!==strain.id).map(o=>(
                      <span key={o.copId} onClick={()=>setMixWith(strains.find(s=>s.id===o.strainId))} style={{padding:"6px 10px",borderRadius:4,fontSize:11,cursor:"pointer",background:mixWith?.id===o.strainId?`${theme.accent}30`:"transparent",color:mixWith?.id===o.strainId?theme.text:theme.dimText,border:mixWith?.id===o.strainId?`0.5px solid ${theme.accent}60`:`0.5px solid ${theme.cardBorder}`}}>{o.strainName}</span>
                    ))}
                    {onHand.filter(o=>o.strainId!==strain.id).length===0&&<p style={{fontSize:10,color:theme.dimText}}>no other on-hand strains to mix with</p>}
                  </div>
                  {mixWith&&(<>
                    <SpectrumSlider left="Couch-locked" right="Active" value={mixSess.sw} onChange={v=>setMixSess({...mixSess,sw:v})} color={theme.accent}/>
                    <SpectrumSlider left="Dreamy" right="Analytical" value={mixSess.sf} onChange={v=>setMixSess({...mixSess,sf:v})} color={theme.accent}/>
                    <SpectrumSlider left="Smooth" right="Harsh" value={mixSess.pull} onChange={v=>setMixSess({...mixSess,pull:v})} color={theme.accent}/>
                    <span onClick={()=>setMixSess({...mixSess,bedtime:!mixSess.bedtime})} style={{display:"inline-block",marginBottom:10,padding:"5px 12px",borderRadius:16,fontSize:10,cursor:"pointer",background:mixSess.bedtime?`${theme.accent}30`:"transparent",color:mixSess.bedtime?theme.text:theme.dimText,border:mixSess.bedtime?`0.5px solid ${theme.accent}60`:`0.5px solid ${theme.accent}20`}}>🌙 bedtime</span>
                    <div style={{marginBottom:10}}><TagSelector categories={VIBE_CATEGORIES} tags={VIBE_TAGS} selected={mixSess.vibeTags} onChange={v=>setMixSess({...mixSess,vibeTags:v})} color={theme.accent}/></div>
                    <textarea value={mixSess.notes} onChange={e=>setMixSess({...mixSess,notes:e.target.value})} placeholder="how'd the combo play together..." rows={2} style={{width:"100%",boxSizing:"border-box",background:"transparent",border:`1px solid ${theme.cardBorder}`,borderRadius:4,padding:10,fontSize:12,color:theme.text,fontFamily:"inherit",outline:"none",resize:"vertical",marginBottom:10}}/>
                    <div style={{display:"flex",gap:6}}>
                      <span onClick={()=>{setMixMode(false);setMixWith(null);}} style={{flex:1,textAlign:"center",padding:"6px 4px",fontSize:10,color:theme.dimText,cursor:"pointer",border:`0.5px solid ${theme.cardBorder}`,borderRadius:4}}>cancel</span>
                      <span onClick={()=>saveMix(true)} style={{flex:1,textAlign:"center",padding:"6px 4px",fontSize:10,background:`${theme.accent}15`,color:theme.text,cursor:"pointer",borderRadius:4}}>rate later</span>
                      <span onClick={()=>saveMix(false)} style={{flex:1,textAlign:"center",padding:"6px 4px",fontSize:10,background:`${theme.accent}30`,border:`1px solid ${theme.accent}50`,color:theme.text,cursor:"pointer",borderRadius:4}}>save mix</span>
                    </div>
                  </>)}
                </div>
              )}

              {(!cop?.mixes||cop.mixes.length===0)&&!mixMode&&<p style={{color:theme.dimText,fontSize:11,fontStyle:"italic"}}>no mixes logged yet</p>}
              {(cop?.mixes||[]).map(m=>(
                <div key={m.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:6,background:theme.cardBg,border:`0.5px solid ${theme.cardBorder}`}}>
                  <div style={{fontSize:12,color:theme.text}}>{strain.name} × {m.withStrain}</div>
                  {m.status==="queued"&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:theme.dimText,marginTop:2}}>queued for rating</div>}
                  {m.notes&&<div style={{fontSize:11,color:theme.dimText,marginTop:2}}>{m.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1}}/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DESKTOP SHELL
   ═══════════════════════════════════════════ */
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

function DesktopHowToModal({onClose}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)"}}/>
      <div style={{position:"relative",zIndex:2,width:"100%",maxWidth:720,maxHeight:"86vh",display:"flex",flexDirection:"column",border:"2.5px solid rgba(232,200,154,0.5)",background:"#120D06",boxShadow:"6px 6px 0 rgba(0,0,0,0.5)"}}>
        <div style={{background:"linear-gradient(90deg,#2C1D07,#4A2E0A,#2C1D07)",borderBottom:"2px solid rgba(232,200,154,0.2)",padding:"7px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div onClick={onClose} style={{width:14,height:14,border:"2px solid rgba(200,80,40,0.5)",color:"rgba(200,80,40,0.7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontFamily:"monospace",cursor:"pointer"}}>✕</div>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(232,200,154,0.6)",letterSpacing:1}}>HOW cLOUD WORKS</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.3)",marginLeft:"auto"}}>a reminder of your own system</span>
        </div>
        <div style={{overflowY:"auto",padding:"20px 24px 28px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"20px 28px",alignItems:"start"}}>
          {HOW_TO_SECTIONS.map(sec=>(
            <div key={sec.title}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,background:"linear-gradient(90deg,rgba(232,200,154,0.12),transparent)",borderLeft:"2px solid rgba(232,200,154,0.35)",padding:"4px 8px"}}>
                <span style={{fontSize:12}}>{sec.icon}</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(232,200,154,0.6)",letterSpacing:1,textTransform:"uppercase"}}>{sec.title}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,paddingLeft:10}}>
                {sec.lines.map((l,i)=><p key={i} style={{fontSize:11.5,color:"rgba(255,255,255,0.68)",margin:0,lineHeight:1.55}}>{l}</p>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{flexShrink:0,borderTop:"0.5px solid rgba(232,200,154,0.15)",padding:"10px 24px",fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.3)"}}>
          V1 ARCHIVE · leonnariley18-ui.github.io/the-cloud
        </div>
      </div>
    </div>
  );
}

function DesktopSidebar({currentPage,onNavigate,synced,stashOpen,onOpenHelp}){
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
        <div onClick={onOpenHelp} style={{display:"flex",alignItems:"center",gap:16,padding:"0 20px",height:44,cursor:"pointer"}}>
          <span style={{fontSize:18,width:24,textAlign:"center",flexShrink:0,color:"rgba(232,200,154,0.45)"}}>?</span>
          {hovered&&<span style={{fontSize:13,color:"rgba(232,200,154,0.45)",whiteSpace:"nowrap"}}>how it works</span>}
        </div>
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

function DesktopPlaceholder({page,strainCount,onHandCount,reupCount}){
  const colors={home:"#3A3228",stash:"#E8E0D4",library:"#E8E0D4",insights:"#E8E0D4",compare:"#E0D8F0",recommender:"#C8D4E8"};
  const c=colors[page]||"#E8E0D4";
  return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:c,opacity:0.6}}>{page}</span>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:c,opacity:0.3,letterSpacing:1,textTransform:"uppercase"}}>desktop layout — coming soon</span>
      <div style={{display:"flex",gap:24,marginTop:8}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:c,opacity:0.35}}>{strainCount} strains</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:c,opacity:0.35}}>{onHandCount} on-hand</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:c,opacity:0.35}}>{reupCount} re-ups</span>
      </div>
    </div>
  );
}

function DesktopLibraryPage({strains,legacyStrains,onSelectStrain}){
  const[libSearch,setLibSearch]=useState("");
  const[copAgainFilter,setCopAgainFilter]=useState("");
  const[ratingFilter,setRatingFilter]=useState(0);
  const[libTab,setLibTab]=useState("strains");
  const[starredOnly,setStarredOnly]=useState(false);
  const[monthIndex,setMonthIndex]=useState(0);
  const[expandedLegacy,setExpandedLegacy]=useState({});
  const toggleLegacy=id=>setExpandedLegacy(prev=>({...prev,[id]:!prev[id]}));
  const isNeverAgain=s=>s.cops.some(c=>c.session?.copAgain==="Never again");
  const getLatestCop=s=>s.cops[s.cops.length-1];
  const copAgainOptions=["","Yes","Maybe","No","Never again"];
  const cycleCopAgain=()=>setCopAgainFilter(prev=>copAgainOptions[(copAgainOptions.indexOf(prev)+1)%copAgainOptions.length]);
  const cycleRating=()=>setRatingFilter(prev=>prev>=5?0:prev+1);

  const activeStrains=strains.filter(s=>{
    if(s.legacy)return false;
    if(starredOnly&&!s.starred)return false;
    const lc=s.cops[s.cops.length-1];const ls=lc?.session;
    if(copAgainFilter&&ls?.copAgain!==copAgainFilter)return false;
    if(ratingFilter&&(!ls||(ls.rating||0)<ratingFilter))return false;
    if(libSearch){const q=libSearch.toLowerCase();const haystack=[s.name,...(s.parents||[]),...(lc?.terpenes||[]),...(ls?.vibeTags||[]),...(ls?.tasteTags||[]),...(lc?.notes||[]).map(n=>n.text)].join(" ").toLowerCase();if(!haystack.includes(q))return false;}
    return true;
  });
  const monthGroups={};
  activeStrains.forEach(s=>{
    const lc=getLatestCop(s);if(!lc)return;
    const month=monthKeyOf(lc);
    if(!monthGroups[month])monthGroups[month]=[];
    monthGroups[month].push(s);
  });
  const monthOrder=sortMonthKeys(Object.keys(monthGroups));
  const safeMonthIndex=Math.min(monthIndex,Math.max(0,monthOrder.length-1));
  const currentMonth=monthOrder[safeMonthIndex];
  const currentMonthStrains=currentMonth?monthGroups[currentMonth]:[];

  const allMixes=strains.flatMap(s=>s.cops.flatMap(c=>(c.mixes||[]).filter(m=>m.status==="reviewed").map(m=>({...m,strainName:s.name,strainId:s.id,copType:c.type}))));
  const uniqueMixes=[];const seenShared=new Set();
  allMixes.forEach(m=>{if(m.sharedId&&seenShared.has(m.sharedId))return;if(m.sharedId)seenShared.add(m.sharedId);uniqueMixes.push(m);});
  const legacyHasContent=l=>!!(l.notes||l.source||l.brand||l.container);

  const A="#E8C89A";
  const tabCounts={strains:strains.filter(s=>!s.legacy).length,mixes:uniqueMixes.length,legacy:legacyStrains.length};

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#1A1510"}}>
      {/* Browser-chrome tab bar */}
      <div style={{flexShrink:0,background:"linear-gradient(180deg,#2A2018,#1E1810)"}}>
        <div style={{display:"flex",alignItems:"flex-end",padding:"0 12px"}}>
          {["strains","mixes","legacy"].map(t=>(
            <div key={t} onClick={()=>setLibTab(t)} style={libTab===t?{padding:"7px 20px",background:"#1A1510",border:`1.5px solid rgba(232,200,154,0.2)`,borderBottom:"none",borderRadius:"6px 6px 0 0",position:"relative",marginBottom:-1,zIndex:2,cursor:"pointer"}:{padding:"6px 18px",background:"#15110C",border:"1px solid rgba(232,200,154,0.08)",borderBottom:"none",borderRadius:"6px 6px 0 0",marginBottom:-1,cursor:"pointer"}}>
              {libTab===t&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${A}66,${A}1a)`,borderRadius:"6px 6px 0 0"}}/>}
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,color:libTab===t?A:"rgba(232,200,154,0.3)"}}>{t.toUpperCase()}</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:libTab===t?"rgba(232,200,154,0.3)":"rgba(232,200,154,0.15)",marginLeft:6}}>{tabCounts[t]}</span>
            </div>
          ))}
          <div style={{marginLeft:"auto",padding:"6px 12px",marginBottom:-1}}>
            <a href="https://leonnariley18-ui.github.io/the-cloud/" target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:"rgba(232,200,154,0.2)",textDecoration:"underline",cursor:"pointer"}}>v1 archive ↗</a>
          </div>
        </div>

        {libTab==="strains"&&(
          <div style={{padding:"8px 12px",borderTop:"1.5px solid rgba(232,200,154,0.15)",borderBottom:"2px solid rgba(232,200,154,0.1)",display:"flex",alignItems:"center",gap:8,background:"linear-gradient(180deg,#1E1810,#1A1510)"}}>
            <div style={{display:"flex",gap:3}}>
              <div onClick={()=>setMonthIndex(Math.max(0,safeMonthIndex-1))} style={{width:22,height:22,border:"1.5px solid rgba(232,200,154,0.15)",background:"rgba(232,200,154,0.04)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,fontSize:10,color:safeMonthIndex>0?"rgba(232,200,154,0.6)":"rgba(232,200,154,0.2)",cursor:safeMonthIndex>0?"pointer":"default"}}>◂</div>
              <div onClick={()=>setMonthIndex(Math.min(monthOrder.length-1,safeMonthIndex+1))} style={{width:22,height:22,border:"1.5px solid rgba(232,200,154,0.15)",background:"rgba(232,200,154,0.04)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,fontSize:10,color:safeMonthIndex<monthOrder.length-1?"rgba(232,200,154,0.6)":"rgba(232,200,154,0.2)",cursor:safeMonthIndex<monthOrder.length-1?"pointer":"default"}}>▸</div>
            </div>
            <div style={{flex:1,background:"rgba(232,200,154,0.04)",border:"1.5px solid rgba(232,200,154,0.12)",borderRadius:4,padding:"6px 12px",display:"flex",alignItems:"center",gap:8,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,rgba(232,200,154,0.15),transparent)"}}/>
              <span style={{fontSize:11,color:"rgba(232,200,154,0.3)"}}>🔍</span>
              <input value={libSearch} onChange={e=>{setLibSearch(e.target.value);setMonthIndex(0);}} placeholder="search by name, parent, terpene, or vibe..." style={{flex:1,background:"transparent",border:"none",outline:"none",fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(232,200,154,0.7)"}}/>
            </div>
            <div style={{display:"flex",gap:3}}>
              <div onClick={()=>setStarredOnly(!starredOnly)} style={{padding:"4px 10px",border:`1.5px solid ${starredOnly?A+"66":"rgba(232,200,154,0.1)"}`,borderRadius:3,cursor:"pointer",background:starredOnly?"rgba(232,200,154,0.1)":"transparent"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:starredOnly?A:"rgba(232,200,154,0.3)"}}>⭐</span>
              </div>
              <div onClick={cycleCopAgain} style={{padding:"4px 10px",border:`1.5px solid ${copAgainFilter?A+"66":"rgba(232,200,154,0.1)"}`,borderRadius:3,cursor:"pointer",background:copAgainFilter?"rgba(232,200,154,0.1)":"transparent"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:copAgainFilter?A:"rgba(232,200,154,0.3)"}}>{copAgainFilter?`COP AGAIN: ${copAgainFilter.toUpperCase()}`:"COP AGAIN"}</span>
              </div>
              <div onClick={cycleRating} style={{padding:"4px 10px",border:`1.5px solid ${ratingFilter?A+"66":"rgba(232,200,154,0.1)"}`,borderRadius:3,cursor:"pointer",background:ratingFilter?"rgba(232,200,154,0.1)":"transparent"}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:ratingFilter?A:"rgba(232,200,154,0.3)"}}>{ratingFilter?`${ratingFilter}★+`:"★+"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        {libTab==="strains"&&(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:A}}>library</div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(232,200,154,0.25)"}}>{activeStrains.length} STRAINS</span>
          </div>

          {monthOrder.length===0&&<p style={{fontSize:13,color:"rgba(232,200,154,0.3)"}}>no strains logged yet</p>}

          {currentMonth&&(<>
            <div style={{background:`linear-gradient(90deg,${A}1f,rgba(26,21,16,0.8))`,padding:"5px 10px",borderLeft:`2px solid ${A}59`,marginBottom:12,borderRadius:"0 4px 4px 0"}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:`${A}8c`,letterSpacing:1}}>{monthLabel(currentMonth).toUpperCase()} · {currentMonthStrains.length} STRAIN{currentMonthStrains.length!==1?"S":""}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {currentMonthStrains.map(s=>{
                const lc=getLatestCop(s);const ls=lc?.session;const locked=isNeverAgain(s);
                const tc=typeColor(lc?.type);
                return(
                  <div key={s.id} onClick={()=>onSelectStrain(s)} style={{padding:"10px 12px",background:`${tc}0d`,border:`1.5px solid ${tc}30`,borderRadius:4,cursor:"pointer",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${tc},${tc}33)`}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:500,color:"rgba(232,200,154,0.85)"}}>{s.name}</span>
                      <div style={{display:"flex",gap:1.5}}>{[1,2,3,4,5].map(n=><div key={n} style={{width:6,height:6,borderRadius:"50%",background:ls&&n<=ls.rating?tc:`${tc}30`}}/>)}</div>
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:`${tc}b3`}}>
                      {(lc?.type||"unknown").toUpperCase()}{s.starred?" · ⭐":""}{locked?" · 🔒":""}{ls?.copAgain?` · COP AGAIN ${ls.copAgain.toUpperCase()}`:""}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:16,padding:"6px 10px",borderTop:"1px solid rgba(232,200,154,0.06)",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.15)"}}>SHOWING {currentMonthStrains.length} OF {activeStrains.length} STRAINS</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(232,200,154,0.15)"}}>{monthLabel(currentMonth).toUpperCase()}</span>
            </div>
          </>)}
        </>)}

        {libTab==="mixes"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:10}}>
            {uniqueMixes.length===0&&<p style={{fontSize:13,color:"rgba(232,200,154,0.3)"}}>no reviewed mixes yet</p>}
            {uniqueMixes.map(m=>(
              <div key={m.id} style={{background:"rgba(139,109,139,0.08)",borderRadius:4,padding:14,border:"0.5px solid rgba(139,109,139,0.15)"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                  <div style={{width:3,height:14,borderRadius:1,background:typeColor(m.primaryType||m.copType)}}/>
                  <span style={{fontSize:13,fontWeight:500,color:"#C4B0C4"}}>{m.primaryStrain||m.strainName}</span>
                  <span style={{fontSize:11,color:"rgba(232,200,154,0.3)"}}>x</span>
                  <div style={{width:3,height:14,borderRadius:1,background:typeColor(m.withType)}}/>
                  <span style={{fontSize:13,fontWeight:500,color:"#C4B0C4"}}>{m.withStrain}</span>
                  <div style={{display:"flex",gap:1,marginLeft:"auto"}}>{[1,2,3,4,5].map(n=><Leaf key={n} filled={n<=m.rating} size={11} color="#8B6D8B"/>)}</div>
                </div>
                {m.combinedTerpenes&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:7}}>{m.combinedTerpenes.map(t=><span key={t} style={{fontSize:9,background:"rgba(139,109,139,0.2)",color:"#C4B0C4",padding:"2px 6px",borderRadius:6}}>{t.toLowerCase()}</span>)}</div>}
                {m.bedtime&&<span style={{display:"inline-block",fontSize:9,padding:"2px 7px",borderRadius:6,background:"rgba(44,44,74,0.5)",color:"#C9B8F0",marginBottom:7}}>🌙 bedtime</span>}
                {m.vibeTags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:7}}>{m.vibeTags.map(v=><span key={v} style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:"rgba(139,109,139,0.12)",color:"rgba(196,176,196,0.65)"}}>{v.toLowerCase()}</span>)}</div>}
                {m.notes&&<p style={{fontSize:11,color:"rgba(232,200,154,0.4)",margin:"0 0 4px",lineHeight:1.55}}>{m.notes}</p>}
                <p style={{fontSize:10,color:"rgba(232,200,154,0.2)",margin:0}}>{m.date}</p>
              </div>
            ))}
          </div>
        )}

        {libTab==="legacy"&&(
          <div>
            {["Yes","Maybe","Never again"].map(status=>{
              const group=legacyStrains.filter(l=>l.copAgain===status).sort((a,b)=>legacyHasContent(b)?1:legacyHasContent(a)?-1:0);
              if(group.length===0)return null;
              const isNever=status==="Never again";
              return(
                <div key={status} style={{marginBottom:20}}>
                  <p style={{fontSize:10,fontWeight:500,color:A,letterSpacing:0.5,textTransform:"uppercase",margin:"0 0 10px"}}>{status==="Yes"?"would cop again":status==="Maybe"?"maybe cop again":"never again"}</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:6}}>
                    {group.map(l=>{
                      const hasContent=legacyHasContent(l);
                      const isOpen=expandedLegacy[l.id];
                      return(
                        <div key={l.id} onClick={hasContent&&!isNever?()=>toggleLegacy(l.id):undefined}
                          style={{background:"rgba(232,200,154,0.04)",borderRadius:4,border:`0.5px solid ${isOpen?"rgba(232,200,154,0.18)":"rgba(232,200,154,0.1)"}`,overflow:"hidden",cursor:hasContent&&!isNever?"pointer":"default",opacity:isNever?0.4:1}}>
                          <div style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:8}}>
                            {l.type&&<div style={{width:3,height:16,borderRadius:2,background:typeColor(l.type),flexShrink:0}}/>}
                            <span style={{fontSize:13,fontWeight:500,color:"rgba(232,200,154,0.85)",flex:1}}>{l.name}</span>
                            {l.type&&<span style={{fontSize:10,color:"rgba(232,200,154,0.3)"}}>{l.type.toLowerCase()}</span>}
                            {hasContent&&!isNever&&<span style={{fontSize:10,color:"rgba(232,200,154,0.2)"}}>{isOpen?"▴":"▾"}</span>}
                          </div>
                          {isOpen&&hasContent&&(
                            <div style={{borderTop:"0.5px solid rgba(232,200,154,0.08)",padding:"10px 14px 13px",display:"flex",flexDirection:"column",gap:7}}>
                              {(l.brand||l.source||l.container)&&<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                {l.brand&&<span style={{fontSize:12,fontWeight:500,color:`${A}d9`}}>🏷️ {l.brand}</span>}
                                {(l.source||l.container)&&<span style={{fontSize:10,color:`${A}80`}}>{[l.source?.toLowerCase(),l.container?.toLowerCase()].filter(Boolean).join(" · ")}</span>}
                              </div>}
                              {l.notes&&<p style={{fontSize:12,color:"rgba(232,200,154,0.7)",margin:0,lineHeight:1.55}}>{l.notes}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DesktopRecommenderPage({strains,savedTips,onSaveTip,onDeleteTip,onSelectStrain}){
  const[intentTab,setIntentTab]=useState("overall");
  const[tipMode,setTipMode]=useState("pairs");
  const[comboMode,setComboMode]=useState("pairs");
  const[confirmDeleteTip,setConfirmDeleteTip]=useState(null);
  const[searchMode,setSearchMode]=useState(false);
  const[termSearch,setTermSearch]=useState("");
  const[selectedTerps,setSelectedTerps]=useState([]);
  const D={bg:"#0F1420",card:"rgba(200,212,232,0.04)",border:"rgba(200,212,232,0.08)",text:"#C8D4E8",muted:"rgba(200,212,232,0.35)",navy:"#7A8FAA"};
  const B="#7A8FAA";

  const allCops=strains.flatMap(s=>s.cops.filter(c=>c.session).map(c=>({...c,strainName:s.name,strainId:s.id,intent:s.intent})));
  const filtered=intentTab==="overall"||intentTab==="enjoy"?allCops:allCops.filter(c=>c.intent===intentTab);
  const highRated=filtered.filter(c=>(c.session?.rating||0)>=4);

  const terpRatings={};
  filtered.forEach(c=>(c.terpenes||[]).forEach(t=>{if(!terpRatings[t])terpRatings[t]=[];if((c.session?.rating||0)>0)terpRatings[t].push(c.session.rating);}));
  const topTerps=Object.entries(terpRatings).map(([t,ratings])=>({name:t,avg:(ratings.reduce((a,b)=>a+b,0)/ratings.length),count:ratings.length})).sort((a,b)=>b.avg-a.avg).slice(0,8);

  const combos={};
  highRated.forEach(c=>{const terps=c.terpenes||[];for(let i=0;i<terps.length;i++)for(let j=i+1;j<terps.length;j++){const key=[terps[i],terps[j]].sort().join(" + ");combos[key]=(combos[key]||0)+1;}});
  const topCombos=Object.entries(combos).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const getThird=pair=>{
    const[t1,t2]=pair.split(" + ");
    const thirds={};
    highRated.forEach(c=>{const terps=c.terpenes||[];if(terps.includes(t1)&&terps.includes(t2)){terps.forEach(t=>{if(t!==t1&&t!==t2)thirds[t]=(thirds[t]||0)+1;});}});
    const top=Object.entries(thirds).sort((a,b)=>b[1]-a[1])[0];
    return top?{name:top[0],count:top[1]}:null;
  };

  const generateTip=()=>{
    if(topTerps.length===0)return"log more sessions to unlock recommendations";
    const intentLabel=intentTab==="overall"?"overall":intentTab==="asleep"?"bedtime":intentTab==="awake"?"daytime":"adventure";
    if(tipMode==="pairs"){
      const best=topTerps[0];
      let tip=`for ${intentLabel}, look for ${best.name.toLowerCase()}`;
      if(topTerps.length>1)tip+=` paired with ${topTerps[1].name.toLowerCase()}`;
      tip+=`. your avg rating with ${best.name.toLowerCase()} is ${best.avg.toFixed(1)}/5`;
      if(topCombos.length>0)tip+=`. the combo ${topCombos[0][0].toLowerCase()} has hit ${topCombos[0][1]} time${topCombos[0][1]!==1?"s":""}`;
      return tip+".";
    }
    if(topCombos.length===0)return"log more 4+ rated sessions to unlock trio recommendations";
    const topPair=topCombos[0][0];const third=getThird(topPair);
    if(!third)return`for ${intentLabel}, look for ${topPair.toLowerCase()} — add more sessions to find your third terp.`;
    return`for ${intentLabel}, look for ${topPair.toLowerCase()} + ${third.name.toLowerCase()}. this trio appears most in your highest-rated sessions.`;
  };

  const coppedNames=new Set(strains.map(s=>s.name.toLowerCase()));
  const enjoyParents=new Set();
  strains.forEach(s=>{
    const cops=s.cops.filter(c=>c.session);
    const isFiveStar=cops.some(c=>(c.session?.rating||0)>=5);
    const isStarred=s.starred;
    const isCopAgainYes=cops.some(c=>c.session?.copAgain==="Yes");
    if(isFiveStar||isStarred||isCopAgainYes){(s.parents||[]).filter(Boolean).forEach(p=>{if(!coppedNames.has(p.toLowerCase()))enjoyParents.add(p);});}
  });
  const enjoyList=[...enjoyParents].sort();

  // Terp search (address bar) logic
  const terpFreq={};
  allCops.forEach(c=>(c.terpenes||[]).forEach(t=>{terpFreq[t]=(terpFreq[t]||0)+1;}));
  const myTerps=Object.entries(terpFreq).sort((a,b)=>b[1]-a[1]).map(([t])=>t);
  const visibleTerps=myTerps.filter(t=>!selectedTerps.includes(t)&&(!termSearch||t.toLowerCase().includes(termSearch.toLowerCase())));
  const matchingCops=selectedTerps.length===0?[]:allCops.filter(c=>selectedTerps.every(t=>(c.terpenes||[]).includes(t)));
  const vibeCounts={};
  matchingCops.forEach(c=>(c.session?.vibeTags||[]).forEach(v=>{vibeCounts[v]=(vibeCounts[v]||0)+1;}));
  const topVibes=Object.entries(vibeCounts).sort((a,b)=>b[1]-a[1]).map(([v])=>v);
  const sessionNotes=matchingCops.map(c=>({note:c.session?.notes,strain:c.strainName,date:c.session?.date})).filter(n=>n.note&&n.note.trim().length>0).reverse();
  const total=matchingCops.length;
  const bedtimeCount=matchingCops.filter(c=>c.session?.bedtime).length;
  const outdoorCount=matchingCops.filter(c=>c.session?.setting==="outdoor").length;
  const indoorCount=total-outdoorCount;
  const intentCounts={asleep:0,awake:0,adventure:0};
  matchingCops.forEach(c=>{if(c.intent&&intentCounts[c.intent]!==undefined)intentCounts[c.intent]++;});
  const typeCounts={Indica:0,Sativa:0,Hybrid:0};
  matchingCops.forEach(c=>{if(c.type&&typeCounts[c.type]!==undefined)typeCounts[c.type]++;});
  const typeEntries=Object.entries(typeCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  const hasSearchData=matchingCops.length>0;
  const matchingRated=matchingCops.filter(c=>(c.session?.rating||0)>0);
  const matchingAvgRating=matchingRated.length>0?(matchingRated.reduce((s,c)=>s+c.session.rating,0)/matchingRated.length).toFixed(1):"—";
  const atMax=selectedTerps.length>=3;
  const trioNudge=selectedTerps.length===2?(()=>{
    const[t1,t2]=selectedTerps;
    const thirds={};
    allCops.filter(c=>(c.session?.rating||0)>=4&&(c.terpenes||[]).includes(t1)&&(c.terpenes||[]).includes(t2))
      .forEach(c=>(c.terpenes||[]).forEach(t=>{if(t!==t1&&t!==t2)thirds[t]=(thirds[t]||0)+1;}));
    const top=Object.entries(thirds).sort((a,b)=>b[1]-a[1])[0];
    return top&&top[1]>=1?top[0]:null;
  })():null;
  const strainMap=matchingCops.reduce((acc,c)=>{
    if(!acc[c.strainId])acc[c.strainId]={name:c.strainName,type:c.type,count:0,strainId:c.strainId,ratingSum:0};
    acc[c.strainId].count++;if((c.session?.rating||0)>0){acc[c.strainId].ratingSum+=c.session.rating;acc[c.strainId].ratedCount=(acc[c.strainId].ratedCount||0)+1;}return acc;
  },{});
  const matchingStrains=Object.values(strainMap).map(s=>({...s,avgRating:(s.ratedCount||0)>0?s.ratingSum/s.ratedCount:0}));
  const intentEntries=Object.entries(intentCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  const topIntent=intentEntries[0];
  const topIntentPct=topIntent&&total>0?Math.round(topIntent[1]/total*100):0;
  const typeCountsByStrain={Indica:0,Sativa:0,Hybrid:0};
  matchingStrains.forEach(s=>{if(s.type&&typeCountsByStrain[s.type]!==undefined)typeCountsByStrain[s.type]++;});
  const topTypeEntry=Object.entries(typeCountsByStrain).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1])[0];
  const topTypePct=topTypeEntry&&matchingStrains.length>0?Math.round(topTypeEntry[1]/matchingStrains.length*100):0;
  const intentIcon={asleep:"🌙",awake:"☀️",adventure:"🏕️"};

  const intentTabs=[["overall","✦ overall"],["asleep","🌙 asleep"],["awake","☀️ awake"],["adventure","🏕️ adventure"],["enjoy","might enjoy"]];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:D.bg}}>
      {/* Browser-chrome tab bar */}
      <div style={{flexShrink:0,background:"linear-gradient(180deg,#141B2C,#0F1420)"}}>
        <div style={{display:"flex",alignItems:"flex-end",padding:"0 12px"}}>
          {intentTabs.map(([id,label])=>{
            const active=intentTab===id&&!searchMode;
            return(
              <div key={id} onClick={()=>{setIntentTab(id);setSearchMode(false);}} style={active?{padding:"7px 20px",background:D.bg,border:`1.5px solid ${B}33`,borderBottom:"none",borderRadius:"6px 6px 0 0",position:"relative",marginBottom:-1,zIndex:2,cursor:"pointer"}:{padding:"6px 18px",background:"#0B0F18",border:"1px solid rgba(200,212,232,0.06)",borderBottom:"none",borderRadius:"6px 6px 0 0",marginBottom:-1,cursor:"pointer"}}>
                {active&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${B}66,${B}1a)`,borderRadius:"6px 6px 0 0"}}/>}
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,color:active?D.text:D.muted}}>{label.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        {/* Toolbar: address bar (terp search) + pairs/trios + save tip */}
        <div style={{padding:"8px 12px",borderTop:"1.5px solid rgba(200,212,232,0.1)",borderBottom:`2px solid ${searchMode?"rgba(122,143,170,0.2)":"rgba(200,212,232,0.1)"}`,display:"flex",alignItems:"center",gap:8,background:"linear-gradient(180deg,#141B2C,#0F1420)"}}>
          <div onClick={()=>setSearchMode(true)} style={{flex:1,background:searchMode?"rgba(122,143,170,0.08)":"rgba(200,212,232,0.04)",border:`1.5px solid ${searchMode?B+"66":"rgba(200,212,232,0.12)"}`,borderRadius:4,padding:"5px 10px",display:"flex",alignItems:"center",gap:6,cursor:"text",flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:D.muted}}>🔍</span>
            {selectedTerps.map(t=>(
              <span key={t} onClick={e=>{e.stopPropagation();setSelectedTerps(selectedTerps.filter(x=>x!==t));}} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:`${B}30`,color:D.text,border:`1px solid ${B}4d`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>{t.toLowerCase()} <span style={{opacity:0.6}}>✕</span></span>
            ))}
            {searchMode&&!atMax&&<input autoFocus value={termSearch} onChange={e=>setTermSearch(e.target.value)} placeholder="" style={{width:1,minWidth:1,background:"transparent",border:"none",outline:"none",padding:0}}/>}
            {searchMode&&!atMax&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted}}>+ add terp ({3-selectedTerps.length} left)</span>}
            {!searchMode&&selectedTerps.length===0&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:D.muted}}>search terpenes to see what they do for you...</span>}
          </div>
          {searchMode&&<div onClick={()=>{setSearchMode(false);setSelectedTerps([]);setTermSearch("");}} style={{padding:"5px 12px",border:"1.5px solid rgba(200,212,232,0.08)",borderRadius:4,cursor:"pointer"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:D.muted}}>CLEAR</span>
          </div>}
          {!searchMode&&(<>
            <div style={{display:"flex",border:"1.5px solid rgba(200,212,232,0.12)",borderRadius:3,overflow:"hidden"}}>
              {["pairs","trios"].map(m=>(
                <div key={m} onClick={()=>setTipMode(m)} style={{padding:"4px 10px",cursor:"pointer",background:tipMode===m?`${B}30`:"transparent"}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:tipMode===m?D.text:D.muted}}>{m.toUpperCase()}</span>
                </div>
              ))}
            </div>
            <div onClick={()=>onSaveTip({id:Date.now(),intent:intentTab,tip:generateTip(),date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})})} style={{padding:"4px 10px",border:"1.5px solid rgba(200,212,232,0.12)",borderRadius:3,cursor:"pointer"}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:D.muted}}>💾 SAVE TIP</span>
            </div>
          </>)}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        {searchMode?(<>
          {!atMax&&visibleTerps.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
            {visibleTerps.map(t=>(
              <span key={t} onClick={()=>{setSelectedTerps([...selectedTerps,t]);setTermSearch("");}} style={{fontSize:11,padding:"5px 12px",borderRadius:14,background:"rgba(200,212,232,0.06)",color:D.muted,border:`0.5px solid ${D.border}`,cursor:"pointer"}}>{t.toLowerCase()} <span style={{fontSize:9,opacity:0.4}}>{terpFreq[t]}x</span></span>
            ))}
          </div>}
          {trioNudge&&!atMax&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(122,143,170,0.07)",borderRadius:8,padding:"8px 11px",border:"0.5px solid rgba(122,143,170,0.15)",marginBottom:16}}>
            <span style={{fontSize:14}}>💡</span>
            <p style={{fontSize:11,color:"rgba(200,212,232,0.5)",flex:1,margin:0}}>your data suggests <span style={{color:D.navy,fontWeight:500}}>{trioNudge.toLowerCase()}</span> often completes this pair</p>
            <span onClick={()=>setSelectedTerps([...selectedTerps,trioNudge])} style={{fontSize:10,color:D.navy,background:"rgba(122,143,170,0.15)",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>+ add</span>
          </div>}
          {selectedTerps.length===0&&<p style={{fontSize:13,color:D.muted}}>select up to 3 terpenes to see what they do for you</p>}
          {selectedTerps.length>0&&!hasSearchData&&<p style={{fontSize:13,color:D.text}}>no sessions logged with {selectedTerps.map(t=>t.toLowerCase()).join(" + ")} yet.</p>}
          {hasSearchData&&(<>
            <div style={{background:"linear-gradient(90deg,rgba(122,143,170,0.1),transparent)",padding:"3px 8px",borderLeft:`2px solid ${B}59`,marginBottom:6}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:`${B}99`,letterSpacing:1}}>TERP SEARCH · {selectedTerps.map(t=>t.toUpperCase()).join(" + ")}</span>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(200,212,232,0.2)",marginBottom:20}}>FOUND IN {matchingStrains.length} STRAIN{matchingStrains.length!==1?"S":""} · {total} SESSION{total!==1?"S":""}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div>
                <div style={{background:"linear-gradient(90deg,rgba(200,212,232,0.06),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(200,212,232,0.2)",marginBottom:10}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:D.muted,letterSpacing:1}}>STRAINS</span></div>
                {matchingStrains.map(s=>{const strain=strains.find(x=>x.id===s.strainId||x.name===s.name);return(
                  <div key={s.name} onClick={()=>strain&&onSelectStrain&&onSelectStrain(strain)} style={{padding:"10px 12px",background:D.card,border:`1.5px solid ${D.border}`,borderRadius:4,marginBottom:5,cursor:strain?"pointer":"default",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1.5,background:"linear-gradient(90deg,rgba(200,212,232,0.12),transparent)"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,color:D.text,textDecoration:"underline",textDecorationColor:"rgba(200,212,232,0.2)",textUnderlineOffset:2}}>{s.name}</span>
                      <div style={{display:"flex",gap:1.5}}>{[1,2,3,4,5].map(n=><div key={n} style={{width:5,height:5,borderRadius:"50%",background:n<=Math.round(s.avgRating)?B:`${B}30`}}/>)}</div>
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.25)"}}>{(s.type||"unknown").toUpperCase()} · {s.avgRating.toFixed(1)}{s.count>1?` · ${s.count} cops`:""}</div>
                  </div>
                );})}
                {matchingStrains.length===0&&<p style={{fontSize:12,color:D.muted}}>no matching strains</p>}
              </div>
              <div>
                <div style={{background:"linear-gradient(90deg,rgba(200,212,232,0.06),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(200,212,232,0.2)",marginBottom:10}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:D.muted,letterSpacing:1}}>WHAT THIS COMBO DOES FOR YOU</span></div>
                {topVibes.length>0&&<div style={{marginBottom:14}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.25)",marginBottom:6}}>TOP VIBES</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{topVibes.slice(0,6).map(v=><span key={v} style={{fontSize:10,padding:"3px 10px",borderRadius:4,background:"rgba(200,212,232,0.06)",color:"rgba(200,212,232,0.6)",border:`1px solid ${D.border}`}}>{v.toLowerCase()}</span>)}</div>
                </div>}
                {(topIntent||topTypeEntry)&&<div style={{display:"flex",gap:10,marginBottom:14}}>
                  {topIntent&&<div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.25)",marginBottom:6}}>INTENT LEAN</div>
                    <div style={{padding:"7px 10px",background:D.card,border:`1px solid ${D.border}`,borderRadius:4}}>
                      <div style={{fontSize:12,color:D.text}}>{intentIcon[topIntent[0]]} {topIntent[0]}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.25)"}}>{topIntentPct}% OF SESSIONS</div>
                    </div>
                  </div>}
                  {topTypeEntry&&<div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.25)",marginBottom:6}}>TYPE LEAN</div>
                    <div style={{padding:"7px 10px",background:D.card,border:`1px solid ${D.border}`,borderRadius:4}}>
                      <div style={{fontSize:12,color:D.text}}>{topTypeEntry[0].toLowerCase()}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.25)"}}>{topTypePct}% OF STRAINS</div>
                    </div>
                  </div>}
                </div>}
                {sessionNotes.length>0&&(<>
                  <div style={{background:"linear-gradient(90deg,rgba(200,212,232,0.06),transparent)",padding:"3px 8px",borderLeft:"2px solid rgba(200,212,232,0.2)",marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:D.muted,letterSpacing:1}}>YOUR NOTES WITH THESE TERPS</span></div>
                  <p style={{fontSize:11,color:"rgba(200,212,232,0.5)",lineHeight:1.6,margin:0}}>{sessionNotes.slice(0,6).map(n=>`"${n.note.length>36?n.note.slice(0,36)+"…":n.note}"`).join(" · ")}</p>
                </>)}
              </div>
            </div>
          </>)}
        </>):intentTab==="enjoy"?(
          <div style={{maxWidth:600}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:B,marginBottom:6}}>might enjoy</div>
            <p style={{fontSize:11,color:D.muted,marginBottom:16}}>parent strains of your 5★, starred, and cop-again-yes strains</p>
            {enjoyList.length===0&&<p style={{fontSize:13,color:D.muted}}>log more sessions and mark cop-again to unlock this list</p>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {enjoyList.map(name=>(
                <div key={name} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:6,background:D.card,border:`0.5px solid ${D.border}`}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:"rgba(200,212,232,0.25)"}}/>
                  <span style={{fontSize:13,color:D.text}}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        ):(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:B}}>recommender</div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted}}>{filtered.length} SESSIONS</span>
          </div>
          {topTerps.length>0&&<div style={{background:"rgba(122,143,170,0.08)",borderRadius:6,padding:12,marginBottom:20,border:"0.5px solid rgba(122,143,170,0.18)"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:B,letterSpacing:1,marginBottom:6}}>YOUR TIP · {tipMode.toUpperCase()}</div>
            <p style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:D.text,margin:0,lineHeight:1.5}}>{generateTip()}</p>
          </div>}
          {topTerps.length===0&&<p style={{fontSize:13,color:D.muted,marginBottom:20}}>log more sessions{intentTab!=="overall"?` for ${intentTab}`:""} to unlock recommendations</p>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            <div>
              {topTerps.length>0&&<div style={{marginBottom:20}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted,letterSpacing:1,marginBottom:10}}>TERPENE AFFINITY</div>
                {topTerps.map((t,i)=>(
                  <div key={t.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:10,color:D.muted,width:14,textAlign:"right"}}>{i+1}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:11,fontWeight:500,color:D.text}}>{t.name.toLowerCase()}</span>
                        <span style={{fontSize:10,color:D.navy}}>{t.avg.toFixed(1)} · {t.count}x</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:D.card}}><div style={{height:3,borderRadius:2,background:D.navy,width:`${(t.avg/5)*100}%`}}/></div>
                    </div>
                  </div>
                ))}
              </div>}
            </div>
            <div>
              {topCombos.length>0&&<div style={{marginBottom:20}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted,letterSpacing:1,marginBottom:10}}>WINNING COMBOS · {comboMode.toUpperCase()}</div>
                {topCombos.map(([combo,count])=>{const third=comboMode==="trios"?getThird(combo):null;return(
                  <div key={combo} style={{background:D.card,borderRadius:6,padding:"8px 12px",marginBottom:5,border:`0.5px solid ${D.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:D.text,fontWeight:500}}>{combo.toLowerCase()}</span>
                      <span style={{fontSize:10,color:D.navy}}>{count}x in 4★+</span>
                    </div>
                    {comboMode==="trios"&&<p style={{fontSize:10,color:"rgba(200,212,232,0.5)",margin:"4px 0 0"}}>third: {third?<span style={{color:D.navy,fontWeight:500}}>{third.name.toLowerCase()}</span>:<span style={{color:"rgba(200,212,232,0.25)"}}>not enough data</span>}</p>}
                  </div>
                );})}
              </div>}
            </div>
          </div>
          {(()=>{const filteredTips=savedTips.filter(st=>st.intent===intentTab);return filteredTips.length>0?(
            <div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted,letterSpacing:1,marginBottom:10}}>SAVED {intentTab.toUpperCase()} TIPS · {filteredTips.length}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {filteredTips.map(st=>(
                  <div key={st.id} style={{background:D.card,borderRadius:6,padding:"10px 12px",border:`0.5px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div>
                      <p style={{fontSize:9,color:D.muted,margin:"0 0 3px"}}>{st.date}</p>
                      <p style={{fontSize:10,color:D.text,margin:0,lineHeight:1.4}}>{st.tip}</p>
                    </div>
                    {confirmDeleteTip===st.id?(
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        <span onClick={()=>{onDeleteTip(st.id);setConfirmDeleteTip(null);}} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"#C15A4A",color:"#fff",cursor:"pointer"}}>delete</span>
                        <span onClick={()=>setConfirmDeleteTip(null)} style={{fontSize:9,padding:"3px 8px",borderRadius:4,border:`0.5px solid ${D.border}`,color:D.muted,cursor:"pointer"}}>nvm</span>
                      </div>
                    ):(
                      <span onClick={()=>setConfirmDeleteTip(st.id)} style={{fontSize:12,color:D.muted,cursor:"pointer",flexShrink:0}}>✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ):null;})()}
        </>)}
      </div>

      {/* Status bar */}
      <div style={{flexShrink:0,padding:"6px 24px",borderTop:"1px solid rgba(200,212,232,0.06)",display:"flex",justifyContent:"space-between",background:D.bg}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.15)"}}>{searchMode?`TERP SEARCH · ${selectedTerps.length} SELECTED · ${matchingStrains.length} MATCHES`:`${filtered.length} SESSIONS`}</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(200,212,232,0.15)"}}>{searchMode?`AVG RATING ${matchingAvgRating}`:`${tipMode.toUpperCase()} · ${intentTab.toUpperCase()}`}</span>
      </div>
    </div>
  );
}

function DesktopComparePage({strains,reups=[],savedComparisons,onSaveComparison,onDeleteComparison,onSelectStrain}){
  const[pickA,setPickA]=useState(null);
  const[pickB,setPickB]=useState(null);
  const[openDropdown,setOpenDropdown]=useState(null);
  const[expandedSaved,setExpandedSaved]=useState(null);
  const[confirmDelete,setConfirmDelete]=useState(null);

  const strainA=strains.find(s=>s.id===pickA);
  const strainB=strains.find(s=>s.id===pickB);
  const copA=strainA?.cops[strainA.cops.length-1];const copB=strainB?.cops[strainB.cops.length-1];
  const sA=copA?.session;const sB=copB?.session;
  const ready=strainA&&strainB&&sA&&sB&&pickA!==pickB;
  const eligible=strains.filter(s=>s.cops.some(c=>c.session));

  const sharedReup=ready?(reups.find(r=>{
    if(r.copIds&&r.copIds.length>1&&r.copIds.includes(copA?.id)&&r.copIds.includes(copB?.id))return true;
    if(r.strainNames&&r.strainNames.includes(strainA.name)&&r.strainNames.includes(strainB.name))return true;
    return false;
  })||HISTORICAL_REUPS.find(h=>h.strainNames.includes(strainA.name)&&h.strainNames.includes(strainB.name))):null;

  const cA="#8B7AAE";const cB="#6B9A5A";
  const D={bg:"#1A1028",card:"rgba(200,184,232,0.04)",border:"rgba(200,184,232,0.08)",text:"#E0D8F0",muted:"rgba(200,184,232,0.4)"};

  const generateVerdict=()=>{
    if(!ready)return null;
    const ratingDiff=sA.rating-sB.rating;const winner=ratingDiff>0?strainA.name:ratingDiff<0?strainB.name:null;
    const bodyA=sA.spectrums?.sw||0;const bodyB=sB.spectrums?.sw||0;
    const mindA=sA.spectrums?.sf||0;const mindB=sB.spectrums?.sf||0;
    let read=winner?`${winner} rated higher overall.`:"rated equally.";
    if(Math.abs(bodyA-bodyB)>=3)read+=` ${bodyA<bodyB?strainA.name:strainB.name} locks you down more.`;
    if(Math.abs(mindA-mindB)>=3)read+=` ${mindA<mindB?strainA.name:strainB.name} is dreamier.`;
    const sharedTerps=(copA?.terpenes||[]).filter(t=>(copB?.terpenes||[]).includes(t));
    if(sharedTerps.length>0)read+=` both share ${sharedTerps.map(t=>t.toLowerCase()).join(", ")}.`;
    return read;
  };

  const CompSpectrumDots=({left,right,valA,valB})=>(
    <div style={{marginBottom:22}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"rgba(200,184,232,0.2)",marginBottom:6}}><span>{left}</span><span>{right}</span></div>
      <div style={{height:3,background:"rgba(139,109,180,0.1)",borderRadius:2,position:"relative"}}>
        <div style={{position:"absolute",left:`${((valA||0)+3)/6*100}%`,top:-4,width:10,height:10,borderRadius:"50%",background:cA,border:"2px solid rgba(139,109,180,0.5)",boxShadow:"0 0 6px rgba(139,109,180,0.3)",transform:"translateX(-50%)"}}/>
        <div style={{position:"absolute",left:`${((valB||0)+3)/6*100}%`,top:-4,width:10,height:10,borderRadius:"50%",background:cB,border:"2px solid rgba(58,107,42,0.5)",boxShadow:"0 0 6px rgba(58,107,42,0.3)",transform:"translateX(-50%)"}}/>
      </div>
    </div>
  );

  const Picker=({side,pick,setPick,strain,cop,color,open})=>(
    <div style={{flex:1,position:"relative",zIndex:open?10:1}}>
      <div onClick={e=>{e.stopPropagation();setOpenDropdown(open?null:side);}} style={{padding:"10px 14px",border:`1.5px solid ${color}59`,borderRadius:4,background:`${color}14`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color}66,transparent)`}}/>
        <div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:`${color}80`,letterSpacing:1,marginBottom:2}}>STRAIN {side}</div>
          <div style={{fontSize:14,fontWeight:500,color:strain?D.text:D.muted}}>{strain?.name||`pick strain ${side}`}</div>
          {strain&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted}}>{cop?.type?.toUpperCase()} · {cop?.session?.rating||"?"}.0{strain.starred?" · ⭐":""}</div>}
        </div>
        <span style={{fontSize:10,color:D.muted}}>▾</span>
      </div>
      {open&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"100%",left:0,right:0,marginTop:2,background:"rgba(20,14,30,0.97)",border:`1.5px solid ${color}40`,borderRadius:4,boxShadow:"0 8px 24px rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",overflow:"hidden",maxHeight:280,overflowY:"auto"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1.5,background:`linear-gradient(90deg,${color}4d,transparent)`}}/>
          {eligible.map(s=>{
            const lc=s.cops[s.cops.length-1];const isSelected=pick===s.id;
            return(
              <div key={s.id} onClick={()=>{setPick(isSelected?null:s.id);setOpenDropdown(null);}} style={{padding:"8px 12px",borderBottom:`0.5px solid ${color}1a`,cursor:"pointer",background:isSelected?`${color}1a`:"transparent"}}>
                <span style={{fontSize:11,color:D.text,fontWeight:isSelected?500:400}}>{s.name}</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:isSelected?`${color}b3`:"rgba(224,216,240,0.2)",marginLeft:6}}>{isSelected?"SELECTED":`${(lc?.type||"?").toUpperCase()} · ${lc?.session?.rating||"?"}.0`}</span>
              </div>
            );
          })}
          {eligible.length===0&&<div style={{padding:16,fontSize:12,color:D.muted,textAlign:"center"}}>log a first session to compare</div>}
        </div>
      )}
    </div>
  );

  return(
    <div style={{flex:1,overflowY:"auto",padding:"24px 28px",background:D.bg,color:D.text}} onClick={()=>openDropdown&&setOpenDropdown(null)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"rgba(196,184,216,0.85)"}}>compare</div>
        {sharedReup&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:4,background:"rgba(212,184,136,0.08)",border:"1px solid rgba(212,184,136,0.15)"}}>
          <span style={{fontSize:10}}>📦</span><span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(212,184,136,0.6)"}}>SAME RE-UP · {sharedReup.date}</span>
        </div>}
      </div>

      <div style={{display:"flex",gap:16,marginBottom:20,position:"relative"}}>
        <Picker side="A" pick={pickA} setPick={setPickA} strain={strainA} cop={copA} color={cA} open={openDropdown==="A"}/>
        <Picker side="B" pick={pickB} setPick={setPickB} strain={strainB} cop={copB} color={cB} open={openDropdown==="B"}/>
      </div>

      {ready?(<>
        <div style={{display:"flex",gap:0}}>
          <div style={{flex:1,padding:16,border:`1.5px solid ${cA}26`,borderRadius:"4px 0 0 4px",background:`${cA}08`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${cA}4d,transparent)`}}/>
            <div style={{background:`linear-gradient(90deg,${cA}1a,transparent)`,padding:"3px 8px",borderLeft:`2px solid ${cA}66`,marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(196,184,216,0.45)",letterSpacing:1}}>TERPENES</span></div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:14}}>{(copA.terpenes||[]).map(t=><span key={t} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:`${cA}14`,color:"rgba(196,184,216,0.7)",border:`1px solid ${cA}26`}}>{t.toLowerCase()}</span>)}{(!copA.terpenes||copA.terpenes.length===0)&&<span style={{fontSize:10,color:D.muted}}>none logged</span>}</div>
            <div style={{background:`linear-gradient(90deg,${cA}1a,transparent)`,padding:"3px 8px",borderLeft:`2px solid ${cA}66`,marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(196,184,216,0.45)",letterSpacing:1}}>VIBES</span></div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:14}}>{(sA.vibeTags||[]).concat(sA.tasteTags||[]).map(t=><span key={t} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"rgba(196,184,216,0.05)",color:"rgba(196,184,216,0.45)",border:"1px solid rgba(196,184,216,0.08)"}}>{t.toLowerCase()}</span>)}{(!sA.vibeTags||sA.vibeTags.length===0)&&(!sA.tasteTags||sA.tasteTags.length===0)&&<span style={{fontSize:10,color:D.muted}}>none logged</span>}</div>
            <div style={{background:`linear-gradient(90deg,${cA}1a,transparent)`,padding:"3px 8px",borderLeft:`2px solid ${cA}66`,marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(196,184,216,0.45)",letterSpacing:1}}>SESSION NOTES</span></div>
            <div style={{fontSize:11,color:"rgba(196,184,216,0.5)",lineHeight:1.5}}>{sA.notes||"no session notes"}</div>
          </div>

          <div style={{width:160,flexShrink:0,padding:"16px 10px",background:`${cA}05`,borderTop:`1.5px solid ${cA}0f`,borderBottom:`1.5px solid ${cA}0f`}}>
            <div style={{textAlign:"center",marginBottom:10}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:"rgba(196,184,216,0.3)",letterSpacing:1}}>SPECTRUMS</span></div>
            <CompSpectrumDots left="couch" right="active" valA={sA.spectrums?.sw} valB={sB.spectrums?.sw}/>
            <CompSpectrumDots left="dreamy" right="analytical" valA={sA.spectrums?.sf} valB={sB.spectrums?.sf}/>
            <CompSpectrumDots left="smooth" right="harsh" valA={sA.pull} valB={sB.pull}/>
          </div>

          <div style={{flex:1,padding:16,border:`1.5px solid ${cB}26`,borderRadius:"0 4px 4px 0",background:`${cB}08`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${cB}4d,transparent)`}}/>
            <div style={{background:`linear-gradient(90deg,${cB}1f,transparent)`,padding:"3px 8px",borderLeft:`2px solid ${cB}66`,marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(140,200,140,0.5)",letterSpacing:1}}>TERPENES</span></div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:14}}>{(copB.terpenes||[]).map(t=><span key={t} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:`${cB}14`,color:"rgba(140,200,140,0.7)",border:`1px solid ${cB}26`}}>{t.toLowerCase()}</span>)}{(!copB.terpenes||copB.terpenes.length===0)&&<span style={{fontSize:10,color:D.muted}}>none logged</span>}</div>
            <div style={{background:`linear-gradient(90deg,${cB}1f,transparent)`,padding:"3px 8px",borderLeft:`2px solid ${cB}66`,marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(140,200,140,0.5)",letterSpacing:1}}>VIBES</span></div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:14}}>{(sB.vibeTags||[]).concat(sB.tasteTags||[]).map(t=><span key={t} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"rgba(140,200,140,0.05)",color:"rgba(140,200,140,0.5)",border:"1px solid rgba(140,200,140,0.08)"}}>{t.toLowerCase()}</span>)}{(!sB.vibeTags||sB.vibeTags.length===0)&&(!sB.tasteTags||sB.tasteTags.length===0)&&<span style={{fontSize:10,color:D.muted}}>none logged</span>}</div>
            <div style={{background:`linear-gradient(90deg,${cB}1f,transparent)`,padding:"3px 8px",borderLeft:`2px solid ${cB}66`,marginBottom:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(140,200,140,0.5)",letterSpacing:1}}>SESSION NOTES</span></div>
            <div style={{fontSize:11,color:"rgba(140,200,140,0.5)",lineHeight:1.5}}>{sB.notes||"no session notes"}</div>
          </div>
        </div>

        <div style={{background:D.card,borderRadius:8,padding:16,border:`1px solid ${D.border}`,margin:"16px 0"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:D.muted,letterSpacing:1,marginBottom:6}}>THE VERDICT</div>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:D.text,margin:0,lineHeight:1.5}}>{generateVerdict()}</p>
        </div>

        <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
          <button onClick={()=>onSaveComparison({id:Date.now(),a:strainA.name,b:strainB.name,typeA:copA?.type,typeB:copB?.type,ratingA:sA.rating,ratingB:sB.rating,specA:sA.spectrums,specB:sB.spectrums,pullA:sA.pull,pullB:sB.pull,terpA:copA?.terpenes||[],terpB:copB?.terpenes||[],vibesA:sA.vibeTags||[],vibesB:sB.vibeTags||[],notesA:sA.notes||"",notesB:sB.notes||"",verdict:generateVerdict(),date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})})} style={{padding:"10px 28px",border:"1.5px solid rgba(196,184,216,0.2)",borderRadius:4,background:"rgba(196,184,216,0.06)",color:"rgba(196,184,216,0.7)",cursor:"pointer",fontFamily:"inherit",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1.5,background:"linear-gradient(90deg,rgba(196,184,216,0.25),transparent)"}}/>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:0.5}}>SAVE COMPARISON</span>
          </button>
        </div>
      </>):(
        <div style={{padding:"40px 0",textAlign:"center"}}>
          <p style={{fontSize:13,color:D.muted}}>pick two different strains with logged sessions to compare</p>
        </div>
      )}

      {savedComparisons.length>0&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:D.muted,letterSpacing:1}}>SAVED COMPARISONS</span>
            <span style={{fontSize:10,color:D.muted}}>{savedComparisons.length}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {savedComparisons.map(sc=>(
              <div key={sc.id} style={{background:D.card,borderRadius:6,border:`1px solid ${D.border}`,overflow:"hidden"}}>
                <div onClick={()=>setExpandedSaved(expandedSaved===sc.id?null:sc.id)} style={{padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                  <div>
                    <p style={{fontSize:11,fontWeight:500,color:D.text,margin:"0 0 2px"}}>{sc.a} vs {sc.b}</p>
                    <p style={{fontSize:9,color:D.muted,margin:0}}>{sc.date}</p>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:10,color:D.muted}}>{expandedSaved===sc.id?"▾":"▸"}</span>
                    {confirmDelete===sc.id?(
                      <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                        <span onClick={()=>{onDeleteComparison(sc.id);setConfirmDelete(null);}} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"#C15A4A",color:"#fff",cursor:"pointer"}}>delete</span>
                        <span onClick={()=>setConfirmDelete(null)} style={{fontSize:9,padding:"3px 8px",borderRadius:4,border:`0.5px solid ${D.border}`,color:D.muted,cursor:"pointer"}}>cancel</span>
                      </div>
                    ):(
                      <span onClick={e=>{e.stopPropagation();setConfirmDelete(sc.id);}} style={{fontSize:12,color:D.muted,cursor:"pointer"}}>✕</span>
                    )}
                  </div>
                </div>
                {expandedSaved===sc.id&&(
                  <div style={{padding:"0 12px 12px"}}>
                    <p style={{fontFamily:"'Playfair Display',serif",fontSize:12,color:D.text,margin:"0 0 8px",lineHeight:1.4}}>{sc.verdict}</p>
                    <div style={{display:"flex",gap:8}}>
                      <div style={{flex:1,textAlign:"center"}}><p style={{fontSize:9,color:cA,margin:"0 0 2px"}}>{sc.a}</p><p style={{fontSize:14,fontFamily:"'Playfair Display',serif",color:cA,margin:0}}>{sc.ratingA}/5</p></div>
                      <div style={{flex:1,textAlign:"center"}}><p style={{fontSize:9,color:cB,margin:"0 0 2px"}}>{sc.b}</p><p style={{fontSize:14,fontFamily:"'Playfair Display',serif",color:cB,margin:0}}>{sc.ratingB}/5</p></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopShell(){
  const{synced,strains,setStrains,legacyStrains,onHand,setOnHand,coppedEntries,setCoppedEntries,mixQueue,setMixQueue,reups,setReups,finishedReups,setFinishedReups,savedComparisons,setSavedComparisons,savedTips,setSavedTips,insightsDismissed,setInsightsDismissed,insightsSaved,setInsightsSaved}=useCloudData();
  const[page,setPage]=useState("home");
  const[stashOpen,setStashOpen]=useState(false);
  const[helpOpen,setHelpOpen]=useState(false);
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

  const handleAddNote=(strainId,copId,text)=>{
    if(!text.trim())return;
    const note={id:Date.now(),date:today(),text:text.trim()};
    setStrains(prev=>prev.map(s=>{if(s.id!==strainId)return s;return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,notes:[...(c.notes||[]),note]})};}));
  };

  const handleEditNote=(strainId,copId,noteId,newText)=>{
    if(!newText.trim())return;
    setStrains(prev=>prev.map(s=>{if(s.id!==strainId)return s;return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,notes:(c.notes||[]).map(n=>n.id!==noteId?n:{...n,text:newText.trim()})})};}));
  };

  const handleDeleteNote=(strainId,copId,noteId)=>{
    setStrains(prev=>prev.map(s=>{if(s.id!==strainId)return s;return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,notes:(c.notes||[]).filter(n=>n.id!==noteId)})};}));
  };

  const handleAddExperience=(strainId,copId,text,setting,bedtime,vibeTags)=>{
    if(!text.trim()&&(!vibeTags||vibeTags.length===0))return;
    const exp={id:Date.now(),date:today(),setting,bedtime,note:text.trim(),vibeTags:[...vibeTags],mixedWith:null};
    setStrains(prev=>prev.map(s=>{if(s.id!==strainId)return s;return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,experiences:[...(c.experiences||[]),exp]})};}));
  };

  const handleFinishCop=(item,copAgainChoice)=>{
    const newOnHand=onHand.filter(o=>o.copId!==item.copId);
    const newStrains=strains.map(s=>s.id!==item.strainId?s:{...s,cops:s.cops.map(c=>c.id!==item.copId?c:{...c,status:"done",finishedDate:today(),session:{...c.session,copAgain:copAgainChoice||c.session?.copAgain}})});
    setOnHand(newOnHand);setStrains(newStrains);
    const reupForCop=reups.find(r=>r.copIds.includes(item.copId));
    if(reupForCop){
      const allDone=reupForCop.copIds.every(cId=>{const c=newStrains.flatMap(s=>s.cops).find(cc=>cc.id===cId);return c?.status==="done";});
      const noPending=(reupForCop.coppedIds||[]).length===0;
      if(allDone&&noPending){
        const fr={...reupForCop,closed:true,closedDate:today(),strainNames:reupForCop.copIds.map(cId=>{const strain=newStrains.find(s=>s.cops.some(c=>c.id===cId));return strain?.name;}).filter(Boolean)};
        const allAssignedNumbers=[...finishedReups,...reups].map(r=>r.number||0);
        const nextNum=reupForCop.number||(allAssignedNumbers.length>0?Math.max(...allAssignedNumbers)+1:HISTORICAL_REUPS.length+1);
        setFinishedReups([{...fr,number:nextNum},...finishedReups]);
        setReups(reups.filter(r=>r.id!==reupForCop.id));
      }
    }
  };

  const handleCreateMix=(strain,cop,mixWith,mixSess,rateLater)=>{
    const mwCop=mixWith.cops[mixWith.cops.length-1];
    const ct=[...new Set([...(cop.terpenes||[]),...(mwCop?.terpenes||[])])];
    const cTaste=[...new Set([...(cop.session?.tasteTags||[]),...(mwCop?.session?.tasteTags||[])])];
    const mixSharedId=Date.now();
    const me={id:mixSharedId,sharedId:mixSharedId,withStrain:mixWith.name,withStrainId:mixWith.id,primaryStrain:strain.name,primaryStrainId:strain.id,primaryType:cop.type,withType:mwCop?.type,status:rateLater?"queued":"reviewed",rating:mixSess.rating,spectrums:{sw:mixSess.sw,sf:mixSess.sf},pull:mixSess.pull,bedtime:mixSess.bedtime,vibeTags:[...mixSess.vibeTags],combinedTerpenes:ct,combinedTaste:cTaste,notes:mixSess.notes,date:today()};
    const mirror={...me,id:mixSharedId+1,withStrain:strain.name,withStrainId:strain.id,primaryStrain:mixWith.name,primaryStrainId:mixWith.id,primaryType:mwCop?.type,withType:cop.type};
    if(rateLater)setMixQueue(prev=>[{...me,copId:cop.id},...prev]);
    setStrains(prev=>prev.map(s=>{
      if(s.id===strain.id)return{...s,cops:s.cops.map(cc=>cc.id!==cop.id?cc:{...cc,mixes:[...(cc.mixes||[]),me]})};
      if(s.id===mixWith.id)return{...s,cops:s.cops.map(cc=>cc.id!==mwCop?.id?cc:{...cc,mixes:[...(cc.mixes||[]),mirror]})};
      return s;
    }));
  };

  const bg=stashOpen?"#120D06":(DESKTOP_BG[page]||"#120D06");
  const strainCount=strains.length;
  const onHandCount=onHand.length;
  const reupCount=reups.length;

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",display:"flex",height:"100vh",background:bg,transition:"background 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <DesktopSidebar currentPage={page} onNavigate={navigate} synced={synced} stashOpen={stashOpen} onOpenHelp={()=>setHelpOpen(true)}/>
      {!stashOpen&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <DesktopTopBar page={page}/>
          {page==="home"
            ?<DesktopHomePage strains={strains} setStrains={setStrains} legacyStrains={legacyStrains} onHand={onHand} setOnHand={setOnHand} coppedEntries={coppedEntries} setCoppedEntries={setCoppedEntries} reups={reups} setReups={setReups} finishedReups={finishedReups} setFinishedReups={setFinishedReups} savedComparisons={savedComparisons} savedTips={savedTips} onNavigate={navigate}/>
            :page==="library"
            ?<DesktopLibraryPage strains={strains} legacyStrains={legacyStrains} onSelectStrain={handleSelectStrain}/>
            :page==="insights"
            ?(<div style={{flex:1,background:"#FAF6F0",overflowY:"auto"}}>
                <InsightsPage strains={strains} onHand={onHand} onPeek={handleSelectStrain} dismissed={insightsDismissed} setDismissed={setInsightsDismissed} saved={insightsSaved} setSaved={setInsightsSaved} desktopPanel={true}/>
              </div>)
            :page==="recommender"
            ?<DesktopRecommenderPage strains={strains} savedTips={savedTips} onSaveTip={t=>setSavedTips(prev=>[t,...prev])} onDeleteTip={id=>setSavedTips(prev=>prev.filter(t=>t.id!==id))} onSelectStrain={handleSelectStrain}/>
            :page==="compare"
            ?<DesktopComparePage strains={strains} reups={[...reups,...finishedReups]} savedComparisons={savedComparisons} onSaveComparison={c=>setSavedComparisons(prev=>[c,...prev])} onDeleteComparison={id=>setSavedComparisons(prev=>prev.filter(c=>c.id!==id))} onSelectStrain={handleSelectStrain}/>
            :<DesktopPlaceholder page={page} strainCount={strainCount} onHandCount={onHandCount} reupCount={reupCount}/>}
        </div>
      )}

      {helpOpen&&<DesktopHowToModal onClose={()=>setHelpOpen(false)}/>}

      {/* Stash overlay */}
      <StashSidebar
        stashOpen={stashOpen}
        setStashOpen={setStashOpen}
        strains={strains}
        onHand={onHand}
        coppedEntries={coppedEntries}
        finishedReups={finishedReups}
        onSelectStrain={handleSelectStrain}
      />

      {/* Detail window overlay */}
      {selectedStrain&&<StrainDetailWindow
        key={selectedStrain.id}
        selectedStrain={selectedStrain}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        onClose={()=>setSelectedStrain(null)}
        strains={strains}
        onHand={onHand}
        onAddNote={handleAddNote}
        onEditNote={handleEditNote}
        onDeleteNote={handleDeleteNote}
        onAddExperience={handleAddExperience}
        onFinishCop={handleFinishCop}
        onCreateMix={handleCreateMix}
      />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHELL ROUTER (hash-based)
   base URL            → MobileShell
   base URL + #desktop → DesktopShell
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

/* ═══════════════════════════════════════════
   MOBILE SHELL
   ═══════════════════════════════════════════ */
function MobileShell(){
  const{dataLoaded,synced,strains,setStrains,coppedEntries,setCoppedEntries,onHand,setOnHand,mixQueue,setMixQueue,reups,setReups,finishedReups,setFinishedReups,savedComparisons,setSavedComparisons,savedTips,setSavedTips,insightsDismissed,setInsightsDismissed,insightsSaved,setInsightsSaved,legacyStrains}=useCloudData();

  const[page,setPage]=useState("home");
  const[menuOpen,setMenuOpen]=useState(false);

  // ── UI state ──
  const[view,setView]=useState(null);
  const[cop,setCop]=useState({name:"",type:"",lean:"",source:"",container:"",brand:"",growType:"",terpenes:[],parent1:"",parent2:"",unknownLineage:false,notes:"",existingStrainId:null,intent:"",amount:"",copDate:""});
  const[showSugg,setShowSugg]=useState(false);
  const[editEntry,setEditEntry]=useState(null);
  const[session,setSession]=useState({rating:0,smokesLike:"",smokesLikeLean:"",sw:0,sf:0,pull:0,setting:"indoor",bedtime:false,tasteTags:[],vibeTags:[],notes:"",copAgain:""});
  const[activeReupId,setActiveReupId]=useState(null);
  const[mixSess,setMixSess]=useState({rating:0,sw:0,sf:0,pull:0,bedtime:false,vibeTags:[],notes:""});
  const[finishingCop,setFinishingCop]=useState(null);
  const[finishCopAgain,setFinishCopAgain]=useState("");
  const[detailStrain,setDetailStrain]=useState(null);
  const[detailCopIdx,setDetailCopIdx]=useState(0);
  const[detailTab,setDetailTab]=useState("overview");
  const[detailOrigin,setDetailOrigin]=useState("library");
  const[updateNote,setUpdateNote]=useState("");
  const[mixMode,setMixMode]=useState(null);
  const[mixWith,setMixWith]=useState(null);
  const[expNote,setExpNote]=useState({note:"",setting:"indoor",bedtime:false,vibeTags:[],mixedWith:null});
  const[editingItem,setEditingItem]=useState(null);
  const[editText,setEditText]=useState("");
  const[confirmDeleteItem,setConfirmDeleteItem]=useState(null);
  const[peekStrain,setPeekStrain]=useState(null);

  // ── Helpers ──
  const getLatestCop=s=>s.cops[s.cops.length-1];
  const isNeverAgain=s=>s.cops.some(c=>c.session?.copAgain==="Never again");
  const reset=what=>{
    if(what==="cop")setCop({name:"",type:"",lean:"",source:"",container:"",brand:"",growType:"",terpenes:[],parent1:"",parent2:"",unknownLineage:false,notes:"",existingStrainId:null,intent:"",amount:"",copDate:""});
    if(what==="session")setSession({rating:0,smokesLike:"",smokesLikeLean:"",sw:0,sf:0,pull:0,setting:"indoor",bedtime:false,tasteTags:[],vibeTags:[],notes:"",copAgain:""});
    if(what==="mix")setMixSess({rating:0,sw:0,sf:0,pull:0,bedtime:false,vibeTags:[],notes:""});
  };
  const handleAddReup=r=>{
    if(r.number){setReups([...reups,r]);return;}
    const allAssignedNumbers=[...finishedReups,...reups].map(x=>x.number||0);
    const nextNum=allAssignedNumbers.length>0?Math.max(...allAssignedNumbers)+1:HISTORICAL_REUPS.length+1;
    setReups([...reups,{...r,number:nextNum}]);
  };
  const handleDeleteReup=reupId=>{
    const target=reups.find(r=>r.id===reupId);
    if(!target)return;
    const isEmpty=(target.copIds||[]).length===0&&(target.coppedIds||[]).length===0;
    if(!isEmpty)return;
    if(confirmDeleteItem!=="reup-"+reupId){setConfirmDeleteItem("reup-"+reupId);return;}
    const remainingActive=reups.filter(r=>r.id!==reupId);
    const sortedFinished=[...finishedReups].sort((a,b)=>(a.number||0)-(b.number||0)).map(({number,...rest})=>rest);
    const sortedActive=[...remainingActive].sort((a,b)=>(a.number||0)-(b.number||0)).map(({number,...rest})=>rest);
    const{finished:renumberedFinished,active:renumberedActive}=assignReupNumbers(sortedFinished,sortedActive);
    setFinishedReups(renumberedFinished);
    setReups(renumberedActive);
    setConfirmDeleteItem(null);
    if(activeReupId===reupId)setActiveReupId(null);
  };

  // ── Handlers ──
  const handleSaveCop=()=>{
    if(!cop.name.trim())return;
    const newId=Date.now();
    setCoppedEntries([{id:newId,strainName:cop.name.trim(),strainId:cop.existingStrainId,reupId:activeReupId,type:cop.type,lean:cop.lean,source:cop.source,container:cop.container,brand:cop.brand,growType:cop.growType,terpenes:[...cop.terpenes],parent1:cop.parent1,parent2:cop.parent2,...stamp(),firstNotes:cop.notes,intent:cop.intent||null,amount:cop.amount||null},...coppedEntries]);
    if(activeReupId)setReups(reups.map(r=>r.id!==activeReupId?r:{...r,coppedIds:[...(r.coppedIds||[]),newId]}));
    reset("cop");setActiveReupId(null);setView(null);
  };

  // Lite cop: straight to on-hand, no first session. session stays null and lite:true
  // keeps it out of every analytics surface (they all filter c.session).
  const handleSaveLiteCop=()=>{
    if(!cop.name.trim())return;
    const{copId,strainId,newCop,onHandEntry,copDate,copIso}=makeLiteCop(cop,activeReupId);
    if(cop.existingStrainId){setStrains(strains.map(s=>s.id!==cop.existingStrainId?s:{...s,intent:s.intent||cop.intent||null,cops:[...s.cops,newCop]}));
    }else{setStrains([{id:strainId,name:cop.name.trim(),parents:cop.unknownLineage?["unknown lineage"]:[cop.parent1,cop.parent2].filter(Boolean),intent:cop.intent||null,cops:[newCop]},...strains]);}
    if(activeReupId)setReups(addLiteCopToReup(reups,activeReupId,copId,copDate,copIso));
    setOnHand([onHandEntry,...onHand]);
    reset("cop");
  };

  const handleSaveSession=()=>{
    if(!editEntry)return;
    const copId=Date.now();const strainId=editEntry.strainId||copId+1;
    const newCop={id:copId,type:editEntry.type,lean:editEntry.lean,source:editEntry.source,container:editEntry.container,brand:editEntry.brand||"",growType:editEntry.growType||"",terpenes:[...editEntry.terpenes],date:editEntry.date,dateIso:resolveIso(editEntry),firstNotes:editEntry.firstNotes,status:session.copAgain==="Never again"?"done":"on-hand",intent:editEntry.intent||null,amount:editEntry.amount||null,reupId:editEntry.reupId||null,
      session:{rating:session.rating,smokesLike:session.smokesLike,smokesLikeLean:session.smokesLikeLean,setting:session.setting,bedtime:session.bedtime,spectrums:{sw:session.sw,sf:session.sf},pull:session.pull,tasteTags:[...session.tasteTags],vibeTags:[...session.vibeTags],notes:session.notes,copAgain:session.copAgain,date:today()},
      experiences:[],mixes:[],notes:[]};
    const intentForStrain=editEntry.intent||null;
    if(editEntry.strainId){setStrains(strains.map(s=>s.id!==editEntry.strainId?s:{...s,intent:s.intent||intentForStrain,cops:[...s.cops,newCop]}));
    }else{setStrains([{id:strainId,name:editEntry.strainName,parents:editEntry.unknownLineage?["unknown lineage"]:[editEntry.parent1,editEntry.parent2].filter(Boolean),intent:intentForStrain,cops:[newCop]},...strains]);}
    if(editEntry.reupId)setReups(reups.map(r=>r.id!==editEntry.reupId?r:{...r,coppedIds:(r.coppedIds||[]).filter(id=>id!==editEntry.id),copIds:[...r.copIds,copId]}));
    if(session.copAgain!=="Never again")setOnHand([{strainName:editEntry.strainName,strainId:strainId,copId:copId,type:editEntry.type,terpenes:[...editEntry.terpenes],date:editEntry.date,dateIso:resolveIso(editEntry),rating:session.rating},...onHand]);
    setCoppedEntries(coppedEntries.filter(e=>e.id!==editEntry.id));
    reset("session");setEditEntry(null);setView(null);
  };

  const handleMarkDone=item=>{setFinishingCop(item);setFinishCopAgain("");};
  const handleConfirmDone=()=>{
    if(!finishingCop)return;const fc=finishingCop;
    const newOnHand=onHand.filter(o=>o.copId!==fc.copId);
    const newStrains=strains.map(s=>s.id!==fc.strainId?s:{...s,cops:s.cops.map(c=>c.id!==fc.copId?c:{...c,status:"done",finishedDate:today(),session:{...c.session,copAgain:finishCopAgain||c.session?.copAgain}})});
    setOnHand(newOnHand);setStrains(newStrains);
    const reupForCop=reups.find(r=>r.copIds.includes(fc.copId));
    if(reupForCop){const allDone=reupForCop.copIds.every(cId=>{const c=newStrains.flatMap(s=>s.cops).find(cc=>cc.id===cId);return c?.status==="done";});
      const noPending=(reupForCop.coppedIds||[]).length===0;
      if(allDone&&noPending){const fr={...reupForCop,closed:true,closedDate:today(),strainNames:reupForCop.copIds.map(cId=>{const strain=newStrains.find(s=>s.cops.some(c=>c.id===cId));return strain?.name;}).filter(Boolean)};
        const allAssignedNumbers=[...finishedReups,...reups].map(r=>r.number||0);
        const nextNum=reupForCop.number||(allAssignedNumbers.length>0?Math.max(...allAssignedNumbers)+1:HISTORICAL_REUPS.length+1);
        setFinishedReups([{...fr,number:nextNum},...finishedReups]);setReups(reups.filter(r=>r.id!==reupForCop.id));
      }}
    setFinishingCop(null);setFinishCopAgain("");
  };

  const setCoppedIntent=(id,intent)=>setCoppedEntries(prev=>prev.map(e=>e.id!==id?e:e.intent?e:{...e,intent}));
  const setCoppedAmount=(id,amount)=>setCoppedEntries(prev=>prev.map(e=>e.id!==id?e:e.amount?e:{...e,amount}));

  const toggleStar=()=>{if(!detailStrain)return;const updated=strains.map(s=>s.id!==detailStrain.id?s:{...s,starred:!s.starred});setStrains(updated);setDetailStrain({...detailStrain,starred:!detailStrain.starred});};

  const handleSaveNote=()=>{
    if(!detailStrain||!updateNote.trim())return;
    const note={id:Date.now(),date:today(),text:updateNote.trim()};
    const sid=detailStrain.id;const cidx=detailCopIdx;
    setStrains(prev=>{const updated=prev.map(s=>{if(s.id!==sid)return s;const tc=s.cops[cidx];if(!tc)return s;return{...s,cops:s.cops.map(cc=>cc.id!==tc.id?cc:{...cc,notes:[...(cc.notes||[]),note]})};});setDetailStrain(updated.find(s=>s.id===sid));return updated;});
    setUpdateNote("");setMixMode(null);
  };

  const handleInlineNote=(strainId,copId,text)=>{
    if(!text.trim())return;
    const note={id:Date.now(),date:today(),text:text.trim()};
    setStrains(prev=>prev.map(s=>{if(s.id!==strainId)return s;return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,notes:[...(c.notes||[]),note]})};}));
  };

  const handleInlineExperience=(strainId,copId,text,setting="indoor",bedtime=false,vibeTags=[])=>{
    if(!text.trim()&&vibeTags.length===0)return;
    const exp={id:Date.now(),date:today(),setting,bedtime,note:text.trim(),vibeTags:[...vibeTags],mixedWith:null};
    setStrains(prev=>prev.map(s=>{if(s.id!==strainId)return s;return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,experiences:[...(c.experiences||[]),exp]})};}));
  };

  const handleSaveExperience=()=>{
    if(!detailStrain||(!expNote.note.trim()&&expNote.vibeTags.length===0))return;
    const exp={id:Date.now(),date:today(),setting:expNote.setting,bedtime:expNote.bedtime,note:expNote.note.trim(),vibeTags:[...expNote.vibeTags],mixedWith:expNote.mixedWith||null};
    const sid=detailStrain.id;const cidx=detailCopIdx;
    setStrains(prev=>{const updated=prev.map(s=>{if(s.id!==sid)return s;const tc=s.cops[cidx];if(!tc)return s;return{...s,cops:s.cops.map(cc=>cc.id!==tc.id?cc:{...cc,experiences:[...(cc.experiences||[]),exp]})};});setDetailStrain(updated.find(s=>s.id===sid));return updated;});
    setExpNote({note:"",setting:"indoor",bedtime:false,vibeTags:[]});setMixMode(null);
  };

  const handleUpdateParents=(strainId,parents)=>{
    setStrains(prev=>prev.map(s=>s.id!==strainId?s:{...s,parents}));
  };

  const handleUpdateRating=(newRating)=>{
    if(!detailStrain)return;const sid=detailStrain.id;const cidx=detailCopIdx;
    setStrains(prev=>{const updated=prev.map(s=>{if(s.id!==sid)return s;const tc=s.cops[cidx];if(!tc)return s;return{...s,cops:s.cops.map(cc=>cc.id!==tc.id?cc:{...cc,session:{...cc.session,rating:newRating}})};});setDetailStrain(updated.find(s=>s.id===sid));return updated;});
    const copId=detailStrain.cops[detailCopIdx]?.id;
    if(copId!=null)setOnHand(prev=>prev.map(o=>o.copId!==copId?o:{...o,rating:newRating}));
  };

  const deleteFromCop=(field,itemId)=>{
    if(!detailStrain)return;
    if(confirmDeleteItem!==field+"-"+itemId){setConfirmDeleteItem(field+"-"+itemId);return;}
    const sid=detailStrain.id;const cidx=detailCopIdx;
    setStrains(prev=>{
      let sharedId=null;
      if(field==="mixes"){const tc=prev.find(s=>s.id===sid)?.cops[cidx];const mix=(tc?.mixes||[]).find(m=>m.id===itemId);sharedId=mix?.sharedId;}
      const updated=prev.map(s=>{
        if(field==="mixes"&&sharedId)return{...s,cops:s.cops.map(cc=>({...cc,mixes:(cc.mixes||[]).filter(m=>m.sharedId!==sharedId)}))};
        if(s.id!==sid)return s;const tc=s.cops[cidx];if(!tc)return s;
        return{...s,cops:s.cops.map(cc=>cc.id!==tc.id?cc:{...cc,[field]:(cc[field]||[]).filter(x=>x.id!==itemId)})};
      });setDetailStrain(updated.find(s=>s.id===sid));return updated;
    });setConfirmDeleteItem(null);setEditingItem(null);
  };

  const editNoteText=(noteId,newText)=>{
    if(!detailStrain||!newText.trim())return;
    const sid=detailStrain.id;const cidx=detailCopIdx;
    setStrains(prev=>{const updated=prev.map(s=>{if(s.id!==sid)return s;const tc=s.cops[cidx];if(!tc)return s;return{...s,cops:s.cops.map(cc=>cc.id!==tc.id?cc:{...cc,notes:(cc.notes||[]).map(n=>n.id!==noteId?n:{...n,text:newText.trim()})})};});setDetailStrain(updated.find(s=>s.id===sid));return updated;});
    setEditingItem(null);setEditText("");
  };

  const handleAddToMixQueue=(strainId,copId,mix)=>{
    const mirror={...mix,id:mix.id+1,withStrain:mix.primaryStrain,withStrainId:mix.primaryStrainId,withType:mix.primaryType,primaryStrain:mix.withStrain,primaryStrainId:mix.withStrainId,primaryType:mix.withType};
    setStrains(prev=>prev.map(s=>{
      if(s.id===strainId)return{...s,cops:s.cops.map(c=>c.id!==copId?c:{...c,mixes:[...(c.mixes||[]),mix]})};
      if(s.id===mix.withStrainId)return{...s,cops:s.cops.map(c=>{const isWithCop=c.id===mix.withCopId||(s.cops.length===1);return !isWithCop?c:{...c,mixes:[...(c.mixes||[]),mirror]};})};
      return s;
    }));
    setMixQueue(prev=>[{...mix,copId},...prev]);
  };

  const handleCreateMix=(rateLater)=>{
    if(!detailStrain||!mixWith)return;
    const c=detailStrain.cops[detailCopIdx];const mwCop=mixWith.cops[mixWith.cops.length-1];
    const ct=[...new Set([...(c.terpenes||[]),...(mwCop?.terpenes||[])])];
    const cTaste=[...new Set([...(c.session?.tasteTags||[]),...(mwCop?.session?.tasteTags||[])])];
    const mixSharedId=Date.now();
    const me={id:mixSharedId,sharedId:mixSharedId,withStrain:mixWith.name,withStrainId:mixWith.id,primaryStrain:detailStrain.name,primaryStrainId:detailStrain.id,primaryType:c.type,withType:mwCop?.type,status:rateLater?"queued":"reviewed",rating:mixSess.rating,spectrums:{sw:mixSess.sw,sf:mixSess.sf},pull:mixSess.pull,bedtime:mixSess.bedtime,vibeTags:[...mixSess.vibeTags],combinedTerpenes:ct,combinedTaste:cTaste,notes:mixSess.notes,date:today()};
    const mirror={...me,id:mixSharedId+1,withStrain:detailStrain.name,withStrainId:detailStrain.id,primaryStrain:mixWith.name,primaryStrainId:mixWith.id,primaryType:mwCop?.type,withType:c.type};
    if(rateLater)setMixQueue(prev=>[{...me,copId:c.id},...prev]);
    const updated=strains.map(s=>{
      if(s.id===detailStrain.id)return{...s,cops:s.cops.map(cc=>cc.id!==c.id?cc:{...cc,mixes:[...(cc.mixes||[]),me]})};
      if(s.id===mixWith.id)return{...s,cops:s.cops.map(cc=>cc.id!==mwCop?.id?cc:{...cc,mixes:[...(cc.mixes||[]),mirror]})};
      return s;
    });
    setStrains(updated);setDetailStrain(updated.find(s=>s.id===detailStrain.id));
    setMixWith(null);setMixMode(null);reset("mix");
  };

  const handleReviewMix=qItem=>{setMixSess({rating:0,sw:0,sf:0,pull:0,vibeTags:[],notes:""});setEditEntry(qItem);setView("reviewMix");};
  const handleSaveMixReview=()=>{
    if(!editEntry)return;const sharedId=editEntry.sharedId||editEntry.id;
    const reviewUpdate={status:"reviewed",rating:mixSess.rating,spectrums:{sw:mixSess.sw,sf:mixSess.sf},pull:mixSess.pull,bedtime:mixSess.bedtime,vibeTags:[...mixSess.vibeTags],notes:mixSess.notes};
    const updated=strains.map(s=>({...s,cops:s.cops.map(c=>({...c,mixes:(c.mixes||[]).map(m=>m.sharedId===sharedId?{...m,...reviewUpdate}:m)}))}));
    setStrains(updated);setMixQueue(mixQueue.filter(q=>q.id!==editEntry.id));reset("mix");setEditEntry(null);setView(null);
  };

  const openDetail=(s,copIdx,origin)=>{setDetailStrain(s);setDetailCopIdx(copIdx??Math.max(0,(s.cops?.length||1)-1));setDetailTab("overview");setDetailOrigin(origin||page);setPage("detail");setMenuOpen(false);setMixMode(null);setMixWith(null);window.scrollTo(0,0);};
  const openDetailTab=(s,tab,origin)=>{setDetailStrain(s);setDetailCopIdx(s.cops.length-1);setDetailTab(tab);setDetailOrigin(origin||page);setPage("detail");setMenuOpen(false);setMixMode(null);setMixWith(null);window.scrollTo(0,0);};

  // ── Navigation ──
  const navigate=pageId=>{setPage(pageId);setMenuOpen(false);setView(null);window.scrollTo(0,0);};
  const onHandCount=onHand.length;
  const mixCount=strains.reduce((n,s)=>n+s.cops?.reduce((m,c)=>m+(c.mixes?.length||0),0)||0,0);
  const reupCount=reups.length;



  const renderPage=()=>{
    switch(page){
      case "home": return <HomePage strains={strains} onHand={onHand} coppedEntries={coppedEntries} mixQueue={mixQueue} finishedReups={finishedReups} onNavigate={navigate} onLogCop={()=>{setPage("stash");setMenuOpen(false);setView("reupPicker");window.scrollTo(0,0);}} onOpenDetail={openDetail} savedComparisons={savedComparisons} savedTips={savedTips}/>;
      case "stash": return <StashPage strains={strains} coppedEntries={coppedEntries} onHand={onHand} mixQueue={mixQueue} reups={reups} finishedReups={finishedReups} view={view} setView={setView} cop={cop} setCop={setCop} session={session} setSession={setSession} editEntry={editEntry} setEditEntry={setEditEntry} activeReupId={activeReupId} setActiveReupId={setActiveReupId} mixSess={mixSess} setMixSess={setMixSess} finishingCop={finishingCop} finishCopAgain={finishCopAgain} setFinishCopAgain={setFinishCopAgain} handleSaveCop={handleSaveCop} handleSaveLiteCop={handleSaveLiteCop} handleSaveSession={handleSaveSession} handleMarkDone={handleMarkDone} handleConfirmDone={handleConfirmDone} handleReviewMix={handleReviewMix} handleSaveMixReview={handleSaveMixReview} setCoppedIntent={setCoppedIntent} setCoppedAmount={setCoppedAmount} setFinishingCop={setFinishingCop} openDetail={openDetail} openDetailTab={openDetailTab} reset={reset} showSugg={showSugg} setShowSugg={setShowSugg} legacyStrains={legacyStrains} handleAddReup={handleAddReup} handleDeleteReup={handleDeleteReup} confirmDeleteItem={confirmDeleteItem} handleInlineNote={handleInlineNote} handleInlineExperience={handleInlineExperience} onAddMixQueue={handleAddToMixQueue}/>;
      case "library": return <LibraryPage strains={strains} legacyStrains={legacyStrains} onOpenDetail={openDetail} onPeek={s=>setPeekStrain(s)}/>;
      case "detail": return <StrainDetailPage strain={detailStrain} copIdx={detailCopIdx} setCopIdx={setDetailCopIdx} tab={detailTab} setTab={setDetailTab} onBack={()=>{setPage(detailOrigin);setDetailStrain(null);}} onStar={toggleStar} onUpdateRating={handleUpdateRating} onUpdateParents={handleUpdateParents} updateNote={updateNote} setUpdateNote={setUpdateNote} onSaveNote={handleSaveNote} mixMode={mixMode} setMixMode={setMixMode} expNote={expNote} setExpNote={setExpNote} onSaveExperience={handleSaveExperience} onHand={onHand} strains={strains} onMarkDone={handleMarkDone} finishingCop={finishingCop} finishCopAgain={finishCopAgain} setFinishCopAgain={setFinishCopAgain} handleConfirmDone={handleConfirmDone} setFinishingCop={setFinishingCop} deleteFromCop={deleteFromCop} editNoteText={editNoteText} editingItem={editingItem} setEditingItem={setEditingItem} editText={editText} setEditText={setEditText} confirmDeleteItem={confirmDeleteItem} handleCreateMix={handleCreateMix} mixWith={mixWith} setMixWith={setMixWith} mixSess={mixSess} setMixSess={setMixSess}/>;
      case "insights": return <InsightsPage strains={strains} onHand={onHand} onPeek={s=>setPeekStrain(s)} dismissed={insightsDismissed} setDismissed={setInsightsDismissed} saved={insightsSaved} setSaved={setInsightsSaved}/>;
      case "compare": return <ComparePage strains={strains} reups={[...reups,...finishedReups]} savedComparisons={savedComparisons} onSaveComparison={c=>{setSavedComparisons(prev=>[c,...prev]);}} onDeleteComparison={id=>setSavedComparisons(prev=>prev.filter(c=>c.id!==id))} onPeek={s=>setPeekStrain(s)}/>;
      case "recommender": return <RecommenderPage strains={strains} reups={[...reups,...finishedReups]} savedTips={savedTips} onSaveTip={t=>setSavedTips(prev=>[t,...prev])} onDeleteTip={id=>setSavedTips(prev=>prev.filter(t=>t.id!==id))} onPeek={s=>setPeekStrain(s)}/>;
      default: return <HomePage strains={strains} onHand={onHand} coppedEntries={coppedEntries} mixQueue={mixQueue} finishedReups={finishedReups} onNavigate={navigate}/>;
    }
  };

  return(<div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:480,margin:"0 auto",minHeight:"100vh"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Playfair+Display:wght@400;500&display=swap" rel="stylesheet"/>
    <TopBar page={page} onMenuOpen={()=>setMenuOpen(true)} synced={synced} onHandCount={onHandCount}/>
    <MenuOverlay open={menuOpen} currentPage={page} onNavigate={navigate} onClose={()=>setMenuOpen(false)} strainCount={strains.length} mixCount={mixCount} reupCount={reupCount}/>
    {renderPage()}
    {peekStrain&&<PeekSheet strain={peekStrain} strains={strains} onClose={()=>setPeekStrain(null)} onOpenDetail={openDetail} pageBg={page==="compare"?"compare":page==="recommender"?"recommender":"amber"}/>}
  </div>);
}