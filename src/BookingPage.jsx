import { useState } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://dntaugbgyzubnjvgxrtr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudGF1Z2JneXp1Ym5qdmd4cnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTk4MzYsImV4cCI6MjA4NzEzNTgzNn0.F2foV74Bl7HgjBicA16z4oASSbYwq2H7ni59eysgqzA";
const RESEND_KEY   = "re_6Tmu1cxw_CNRqgkVYTxJoGKWB6LbkftfK";
const BOB_EMAIL    = "info@bobshealing.com";

// ─── Offices ──────────────────────────────────────────────────────────────────
const OFFICES = {
  nevada: { id:"nevada", name:"Nevada City", address:"Nevada City, CA", hasEecp:true, color:"#b9875a", hours:{ 1:[9*60,17*60], 2:[9*60,17*60], 3:null, 4:[14*60,17*60], 5:[11*60,16*60] } },
  auburn: { id:"auburn", name:"Auburn",       address:"Auburn, CA",      hasEecp:false, color:"#4a8a78", hours:{ 1:null, 2:null, 3:[9*60,18*60], 4:[9*60,13*60], 5:null } },
};
const officesOpenOn    = dow => Object.values(OFFICES).filter(o=>o.hours[dow]!=null);
const getOfficesForDay = (dow,eecpOnly=false) => { const o=officesOpenOn(dow); return eecpOnly?o.filter(x=>x.hasEecp):o; };

// ─── Services ─────────────────────────────────────────────────────────────────
const ALL_SERVICES = [
  { id:"omt60",          name:"Osteopathic Manual Therapy",  duration:"60 min",        price:200, mins:60,  eecpOnly:false, description:"Hands-on therapy working with your body's structure, nervous system, and natural healing rhythms." },
  { id:"omt30",          name:"Osteopathic Manual Therapy",  duration:"30 min",        price:100, mins:30,  eecpOnly:false, description:"A focused hands-on session addressing a specific area or concern." },
  { id:"softwave",       name:"SoftWave Shockwave Therapy",  duration:"15 min",        price:150, mins:15,  eecpOnly:false, description:"Non-invasive cellular healing for chronic pain, injuries, and post-surgical recovery." },
  { id:"softwave-addon", name:"Add SoftWave to Session",     duration:"No extra time", price:100, mins:0,   eecpOnly:false, tag:"Add-on",     description:"Enhance your existing session with SoftWave therapy — no extra time needed." },
  { id:"eecp",           name:"EECP Heart Therapy",          duration:"75 min",        price:150, mins:75,  eecpOnly:true,  description:"FDA-cleared therapy improving circulation, reducing chest pain, and restoring energy." },
  { id:"softwave-intro", name:"SoftWave Intro Special",      duration:"30 min",        price:79,  mins:30,  eecpOnly:false, tag:"Intro Offer", description:"Experience SoftWave at a special introductory rate." },
  { id:"eecp-intro",     name:"EECP Intro Special",          duration:"30 min",        price:79,  mins:30,  eecpOnly:true,  tag:"Intro Offer", description:"Try EECP Heart Therapy at an introductory rate." },
  { id:"consult",        name:"Free Initial Consultation",   duration:"15 min",        price:0,   mins:15,  eecpOnly:false, description:"Discuss your health concerns with Bob." },
];

// ─── Scheduling Logic ─────────────────────────────────────────────────────────
const SLOT_INTERVAL=15, EECP_SETUP=15, EECP_IDS=["eecp","eecp-intro"];
const DISPLAY_START=9*60, DISPLAY_END=18*60, PX_PER_MIN=1;
const TOTAL_H=(DISPLAY_END-DISPLAY_START)*PX_PER_MIN;
const HOUR_ROWS=Array.from({length:(DISPLAY_END-DISPLAY_START)/60},(_,i)=>DISPLAY_START+i*60);

function minsToLabel(m){const h=Math.floor(m/60),min=m%60,ap=h<12?"AM":"PM",h12=h===0?12:h>12?h-12:h;return `${h12}:${String(min).padStart(2,"0")} ${ap}`;}
function labelToMins(l){const[t,ap]=l.split(" ");let[h,m]=t.split(":").map(Number);if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;return h*60+m;}
function getSlotsForOfficeDay(oid,dow){const hrs=OFFICES[oid].hours[dow];if(!hrs)return[];const s=[];for(let m=hrs[0];m<hrs[1];m+=SLOT_INTERVAL)s.push(minsToLabel(m));return s;}
function getAvailableSlots(oid,dow,booked,sid){
  const hrs=OFFICES[oid].hours[dow];if(!hrs)return[];
  const[,dayEnd]=hrs,svc=ALL_SERVICES.find(s=>s.id===sid),dur=svc?.mins||15,isEecp=EECP_IDS.includes(sid);
  return getSlotsForOfficeDay(oid,dow).filter(lbl=>{
    const st=labelToMins(lbl),en=st+(dur||SLOT_INTERVAL);
    if(en>dayEnd)return false;
    for(const a of booked){
      if(a.isEecp){const be=a.startMins+EECP_SETUP;if(isEecp){if(st<a.endMins&&en>a.startMins)return false;}else{if(st<be&&en>a.startMins)return false;}}
      else{if(st<a.endMins&&en>a.startMins)return false;if(isEecp&&(st+EECP_SETUP>a.startMins&&st<a.endMins))return false;}
    }
    return true;
  });
}

function toDateStr(d){return d.toISOString().slice(0,10);}
function getStartOfNextWeek(){const t=new Date(),day=t.getDay(),m=new Date(t);m.setDate(t.getDate()+(day===0?1:8-day));return m;}
function getWeekOf(d){const w=new Date(d),day=w.getDay(),mon=new Date(w);mon.setDate(w.getDate()-(day===0?6:day-1));return Array.from({length:7},(_,i)=>{const dd=new Date(mon);dd.setDate(mon.getDate()+i);return dd;});}
function getNext14Days(){const days=[],today=new Date();for(let i=1;i<=35;i++){const d=new Date(today);d.setDate(today.getDate()+i);if(getOfficesForDay(d.getDay()).length>0)days.push(d);if(days.length===14)break;}return days;}

const DAYS_S=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_F=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_S=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtHrs(oid,dow){const h=OFFICES[oid].hours[dow];return h?`${minsToLabel(h[0])} – ${minsToLabel(h[1])}`:"Closed";}
function topPx(m){return(m-DISPLAY_START)*PX_PER_MIN;}
function htPx(m){return Math.max(m*PX_PER_MIN,16);}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.bk{min-height:100vh;background:#f5f1ec;font-family:'Jost',sans-serif;color:#1e1a17}
.bk-hero{background:#1e1a17;padding:48px 24px 40px;text-align:center;position:relative;overflow:hidden}
.bk-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 60% 0%,rgba(185,135,90,.18) 0%,transparent 65%);pointer-events:none}
.bk-eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b9875a;margin-bottom:10px}
.bk-title{font-family:'Cormorant Garamond',serif;font-size:clamp(28px,4vw,46px);font-weight:500;color:#f0ebe4;line-height:1.15;margin-bottom:10px}
.bk-title em{font-style:italic;color:#c9a07a}
.bk-sub{font-size:13px;font-weight:300;color:#8a7f76;max-width:440px;margin:0 auto;line-height:1.7}
.bk-steps{display:flex;justify-content:center;background:#2a2420;padding:0 24px}
.bk-step{display:flex;align-items:center;gap:7px;padding:11px 15px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6a5f57;transition:color .2s}
.bk-step.active{color:#c9a07a}.bk-step.done{color:#7a9e7a}
.bk-step-num{width:19px;height:19px;border-radius:50%;border:1px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
.bk-step.done .bk-step-num{background:#7a9e7a;border-color:#7a9e7a;color:white}
.bk-step-div{width:18px;height:1px;background:#3a3330;align-self:center}
.bk-body{max-width:980px;margin:0 auto;padding:36px 20px 80px}
.bk-h2{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:500;margin-bottom:5px}
.bk-p{font-size:13px;color:#9a8a7e;margin-bottom:20px;font-weight:300}
.view-toggle{display:inline-flex;background:white;border-radius:8px;border:1px solid #e0d8d0;overflow:hidden;margin-bottom:20px}
.view-btn{padding:8px 18px;font-size:12px;font-family:'Jost',sans-serif;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border:none;background:transparent;color:#9a8a7e;transition:all .15s;display:flex;align-items:center;gap:6px}
.view-btn.active{background:#1e1a17;color:#c9a07a}.view-btn:hover:not(.active){background:#f5f0ea}
.bk-services{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:12px}
.bk-svc{background:white;border-radius:10px;padding:18px;border:2px solid transparent;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.bk-svc::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#b9875a,#c9a07a);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.bk-svc:hover{border-color:#e8ddd4;box-shadow:0 4px 16px rgba(0,0,0,.06)}.bk-svc:hover::after,.bk-svc.sel::after{transform:scaleX(1)}
.bk-svc.sel{border-color:#b9875a}
.bk-svc-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
.bk-svc-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#1e1a17;line-height:1.2}
.bk-svc-price{font-size:16px;font-weight:500;color:#b9875a;white-space:nowrap;margin-left:8px}
.bk-svc-dur{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#b0a090;margin-bottom:6px}
.bk-svc-desc{font-size:12px;color:#7a6a5e;line-height:1.5;font-weight:300}
.bk-chk{position:absolute;top:12px;right:12px;width:18px;height:18px;border-radius:50%;background:#b9875a;color:white;display:flex;align-items:center;justify-content:center;font-size:10px;opacity:0;transition:opacity .2s}
.bk-svc.sel .bk-chk{opacity:1}
.bk-tag{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.bk-tag-i{background:#fef3e2;color:#c17f24}.bk-tag-a{background:#e8f4ee;color:#2d7a4f}
.list-dates{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px}
.list-date{display:flex;flex-direction:column;align-items:center;padding:10px 9px;border-radius:10px;background:white;border:2px solid transparent;cursor:pointer;transition:all .15s;min-width:50px}
.list-date:hover:not(.closed){border-color:#e8ddd4}.list-date.sel{background:#1e1a17;border-color:#1e1a17}.list-date.closed{opacity:.3;cursor:not-allowed}
.list-date-dow{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#b0a090;margin-bottom:2px}
.list-date.sel .list-date-dow{color:#8a7f76}
.list-date-num{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#1e1a17;line-height:1}
.list-date.sel .list-date-num{color:#f0ebe4}
.list-date-mon{font-size:10px;color:#b0a090;margin-top:2px;text-transform:uppercase;letter-spacing:1px}
.list-date.sel .list-date-mon{color:#8a7f76}
.list-date-office{font-size:9px;margin-top:3px;letter-spacing:.5px;text-transform:uppercase;font-weight:500;text-align:center;line-height:1.3}
.list-date.sel .list-date-office{color:#c9a07a}
.thu-btns{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.thu-btn{flex:1;min-width:150px;padding:12px 16px;border-radius:10px;border:2px solid #e0d8d0;background:white;cursor:pointer;transition:all .2s;text-align:left}
.thu-btn:hover{border-color:#c9a07a}.thu-btn.sel{border-color:#b9875a;background:#fdf8f4}
.thu-btn-name{font-size:13px;font-weight:500;margin-bottom:2px}
.thu-btn-hrs{font-size:11px;color:#9a8a7e}
.list-times{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.list-time{padding:8px 14px;border-radius:7px;background:white;border:2px solid transparent;font-size:12px;cursor:pointer;transition:all .15s;color:#1e1a17}
.list-time:hover:not(.na){border-color:#b9875a}.list-time.sel{background:#b9875a;color:white;border-color:#b9875a}.list-time.na{opacity:.3;cursor:not-allowed;text-decoration:line-through}
.cal-wrap{background:white;border-radius:12px;border:1px solid #ede8e2;overflow:hidden;margin-bottom:16px}
.cal-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #f0ebe6}
.cal-topbar-title{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600}
.cal-topbar-sub{font-size:11px;color:#9a8a7e;margin-top:1px}
.cal-nav-btns{display:flex;gap:6px}
.cal-nav-btn{width:30px;height:30px;border-radius:7px;border:1px solid #e0d8d0;background:white;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .15s;color:#5a4a3e}
.cal-nav-btn:hover{background:#f5f0ea;border-color:#c9a07a}
.cal-outer{display:flex}
.cal-gutter{width:48px;flex-shrink:0;border-right:1px solid #f0ebe6;padding-top:42px}
.cal-gutter-hr{height:60px;display:flex;align-items:flex-start;justify-content:flex-end;padding-right:6px;font-size:9px;color:#b0a090;letter-spacing:.3px;margin-top:-5px}
.cal-cols{flex:1;display:grid;grid-template-columns:repeat(7,1fr)}
.cal-dh{padding:6px 2px 8px;text-align:center;border-right:1px solid #f5f0eb}
.cal-dh:last-child{border-right:none}
.cal-dh-dow{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#b0a090}
.cal-dh-num{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:#1e1a17;width:30px;height:30px;display:flex;align-items:center;justify-content:center;margin:2px auto 0}
.cal-dh.today .cal-dh-num{background:#b9875a;color:white;border-radius:50%}
.cal-dh.closed .cal-dh-dow,.cal-dh.closed .cal-dh-num{color:#ddd}
.cal-off-tag{font-size:8px;text-transform:uppercase;letter-spacing:.4px;padding:2px 5px;border-radius:3px;margin-top:2px;display:inline-block;font-weight:500;line-height:1.4}
.cal-db{border-right:1px solid #f5f0eb;position:relative}
.cal-db:last-child{border-right:none}
.cal-hr-line{position:absolute;left:0;right:0;border-top:1px solid #f5f0eb;pointer-events:none}
.cal-hr-half{position:absolute;left:0;right:0;border-top:1px dashed #f8f4f0;pointer-events:none}
.cal-closed-bg{position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent,transparent 5px,rgba(0,0,0,.018) 5px,rgba(0,0,0,.018) 10px);pointer-events:none}
.cal-zone{position:absolute;left:2px;right:2px;border-radius:3px}
.cal-slot{position:absolute;left:3px;right:3px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;cursor:pointer;transition:all .15s;z-index:2;font-weight:500;overflow:hidden;white-space:nowrap;letter-spacing:.3px}
.cal-slot:hover{filter:brightness(.9);transform:scaleY(1.04)}.cal-slot.picked{outline:2px solid #1e1a17;outline-offset:1px;z-index:3}
.sel-bar{background:#1e1a17;border-radius:10px;padding:13px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:8px}
.sel-bar-info{color:#f0ebe4;font-size:13px}
.sel-bar-info strong{color:#c9a07a;font-family:'Cormorant Garamond',serif;font-size:16px}
.sel-bar-clear{font-size:11px;color:#8a7f76;cursor:pointer;background:none;border:none;font-family:'Jost',sans-serif}
.sel-bar-clear:hover{color:#c9a07a}
.office-banner{display:flex;align-items:center;gap:8px;padding:10px 14px;background:white;border-radius:7px;border-left:3px solid #b9875a;font-size:12px;color:#5a4a3e;margin-bottom:16px}
.note-box{margin-top:14px;padding:11px 14px;background:#fef9f4;border-radius:7px;border-left:3px solid #b9875a;font-size:12px;color:#7a6a5e;line-height:1.6}
.key-note{font-size:12px;color:#7a6a5e;background:#fdf8f4;border-radius:7px;padding:9px 13px;border-left:3px solid #b9875a;margin-bottom:16px;line-height:1.6}
.bk-sum{background:#1e1a17;border-radius:12px;padding:24px;margin-bottom:22px;color:#f0ebe4}
.bk-sum-title{font-family:'Cormorant Garamond',serif;font-size:19px;margin-bottom:14px;color:#c9a07a}
.bk-sum-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2e2a27;font-size:13px}
.bk-sum-row:last-child{border-bottom:none}
.bk-sum-lbl{color:#8a7f76}.bk-sum-val{font-weight:500}
.bk-sum-office{background:#2e2a27;border-radius:5px;padding:7px 12px;margin-top:12px;font-size:11px;display:flex;align-items:center;gap:7px;color:#c9a07a}
.bk-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bk-ff{grid-column:1/-1}
.bk-lbl{display:block;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#9a8a7e;margin-bottom:5px}
.bk-input,.bk-textarea{width:100%;padding:10px 13px;border:1px solid #e0d8d0;border-radius:7px;font-size:13px;font-family:'Jost',sans-serif;color:#1e1a17;background:white;outline:none;transition:border .2s}
.bk-input:focus,.bk-textarea:focus{border-color:#b9875a}
.bk-textarea{resize:vertical;min-height:80px;line-height:1.6}
.bk-consent{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:#7a6a5e;line-height:1.6}
.bk-consent input{margin-top:3px;accent-color:#b9875a;flex-shrink:0}
.bk-nav{display:flex;justify-content:space-between;align-items:center;margin-top:28px}
.bk-btn{padding:12px 26px;border-radius:7px;font-size:11px;font-family:'Jost',sans-serif;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border:none;transition:all .2s;font-weight:500}
.bk-btn-p{background:#b9875a;color:white}.bk-btn-p:hover{background:#a87648}.bk-btn-p:disabled{opacity:.4;cursor:not-allowed}
.bk-btn-g{background:transparent;color:#9a8a7e;border:1px solid #d0c8c0}.bk-btn-g:hover{background:#ede8e2}
.bk-confirm{text-align:center;padding:52px 24px;max-width:500px;margin:0 auto}
.bk-conf-icon{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#b9875a,#c9a07a);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 22px;color:white}
.bk-conf-title{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:500;margin-bottom:10px}
.bk-conf-sub{font-size:13px;color:#7a6a5e;line-height:1.8;font-weight:300;margin-bottom:22px}
.bk-conf-loc{background:#fdf8f4;border-radius:7px;padding:12px 16px;border-left:3px solid #b9875a;text-align:left;margin-bottom:18px;font-size:13px;color:#5a4a3e;line-height:1.8}
.bk-conf-loc strong{color:#b9875a;display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
.bk-conf-box{background:white;border-radius:10px;padding:18px;text-align:left;margin-bottom:16px;border:1px solid #e8e0d8}
.bk-conf-row{display:flex;justify-content:space-between;padding:7px 0;font-size:12px;border-bottom:1px solid #f0ebe4}
.bk-conf-row:last-child{border-bottom:none}
.bk-conf-lbl{color:#9a8a7e}.bk-conf-val{font-weight:500;color:#1e1a17}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;margin-right:8px}
@keyframes spin{to{transform:rotate(360deg)}}
.err-box{background:#fff0f0;border:1px solid #fcc;border-radius:7px;padding:12px 16px;font-size:13px;color:#c0392b;margin-top:16px;line-height:1.6}
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const today    = new Date();
  const todayStr = toDateStr(today);

  const [step,      setStep]      = useState(1);
  const [service,   setService]   = useState(null);
  const [viewMode,  setViewMode]  = useState("list");
  const [selDate,   setSelDate]   = useState(null);
  const [selOffice, setSelOffice] = useState(null);
  const [selTime,   setSelTime]   = useState(null);
  const [weekStart, setWeekStart] = useState(getStartOfNextWeek());
  const [form,      setForm]      = useState({first:"",last:"",email:"",phone:"",notes:"",consent:false});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const week   = getWeekOf(weekStart);
  const days14 = getNext14Days();
  const sel    = ALL_SERVICES.find(s=>s.id===service);
  const selectedOffice = selOffice ? OFFICES[selOffice] : null;
  const isEecp = EECP_IDS.includes(service);

  function pickDate(d) {
    const valid=getOfficesForDay(d.getDay(),sel?.eecpOnly);
    setSelDate(d); setSelTime(null);
    setSelOffice(valid.length===1 ? valid[0].id : null);
  }
  function clearSel(){ setSelDate(null); setSelOffice(null); setSelTime(null); }
  function prevWeek(){ const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); clearSel(); }
  function nextWeek(){ const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); clearSel(); }

  const booked     = [];
  const availSlots = (selDate&&selOffice&&service) ? getAvailableSlots(selOffice,selDate.getDay(),booked,service) : [];
  const isThursday = selDate?.getDay()===4 && !sel?.eecpOnly;

  const canNext1  = !!service;
  const canNext2  = !!selDate && !!selOffice && !!selTime;
  const canSubmit = form.first&&form.last&&form.email&&form.phone&&form.consent;

  const monthLabel = (() => {
    const s=MONTHS[week[0].getMonth()],e=MONTHS[week[6].getMonth()];
    return s===e?`${s} ${week[0].getFullYear()}`:`${s} – ${e} ${week[6].getFullYear()}`;
  })();

  async function handleSubmit() {
    if(!canSubmit) return;
    setLoading(true); setError(null);
    try {
      // 1. Save to Supabase
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          first_name:       form.first,
          last_name:        form.last,
          email:            form.email,
          phone:            form.phone,
          service_id:       sel.id,
          service_name:     sel.name,
          service_duration: sel.duration,
          service_price:    sel.price,
          date:             toDateStr(selDate),
          time:             selTime,
          office_id:        selOffice,
          office_name:      selectedOffice.name,
          notes:            form.notes || null,
          status:           "pending",
        }),
      });
      if (!dbRes.ok) {
        const err = await dbRes.text();
        throw new Error("Database error: " + err);
      }

      // 2. Send emails via Resend
      const DAYS_F2   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const MONTHS_S2 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const dateFormatted = `${DAYS_F2[selDate.getDay()]}, ${MONTHS_S2[selDate.getMonth()]} ${selDate.getDate()}`;
      const priceStr = sel.price === 0 ? "Free" : `$${sel.price}`;
      const clientName = `${form.first} ${form.last}`;

      const clientHtml = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1e1a17"><div style="background:#1e1a17;padding:32px;text-align:center"><h1 style="font-family:Georgia,serif;color:#c9a07a;font-size:28px;margin:0">Bob's Healing Practice</h1><p style="color:#8a7f76;font-size:13px;margin-top:8px;letter-spacing:2px;text-transform:uppercase">Appointment Request Received</p></div><div style="padding:32px;background:#fdf9f5"><p style="font-size:15px;line-height:1.7">Hi ${form.first},</p><p style="font-size:14px;line-height:1.7;color:#5a4a3e">Your appointment request has been received and will be confirmed shortly.</p><div style="background:white;border-radius:10px;padding:24px;margin:24px 0;border:1px solid #ede8e2"><table style="width:100%;font-size:13px;border-collapse:collapse"><tr><td style="padding:8px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Service</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${sel.name} (${sel.duration})</td></tr><tr><td style="padding:8px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Date</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${dateFormatted}</td></tr><tr><td style="padding:8px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Time</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${selTime}</td></tr><tr><td style="padding:8px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Office</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">📍 ${selectedOffice.name}, CA</td></tr><tr><td style="padding:8px 0;color:#9a8a7e">Amount Due</td><td style="padding:8px 0;font-weight:600;color:#b9875a;text-align:right">${priceStr}</td></tr></table></div><p style="font-size:13px;color:#7a6a5e;line-height:1.7">To reschedule or cancel, reply to this email or call <strong>530-802-0801</strong>.</p><p style="font-size:13px;color:#7a6a5e;margin-top:16px">Looking forward to seeing you,<br/><strong>Bob DeLuca</strong><br/><span style="color:#b9875a">Bob's Healing Practice</span></p></div><div style="background:#2a2420;padding:16px;text-align:center"><p style="color:#6a5f57;font-size:11px;margin:0">bobshealing.com · Nevada City & Auburn, CA · 530-802-0801</p></div></div>`;

      const bobHtml = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto"><div style="background:#1e1a17;padding:24px;text-align:center"><h1 style="color:#c9a07a;font-size:22px;margin:0">New Booking: ${clientName}</h1></div><div style="padding:28px;background:#fdf9f5"><table style="width:100%;font-size:13px;border-collapse:collapse"><tr><td style="padding:7px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Client</td><td style="padding:7px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${clientName}</td></tr><tr><td style="padding:7px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Email</td><td style="padding:7px 0;border-bottom:1px solid #f5f0eb;text-align:right">${form.email}</td></tr><tr><td style="padding:7px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Phone</td><td style="padding:7px 0;border-bottom:1px solid #f5f0eb;text-align:right">${form.phone}</td></tr><tr><td style="padding:7px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Service</td><td style="padding:7px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${sel.name} (${sel.duration})</td></tr><tr><td style="padding:7px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Date & Time</td><td style="padding:7px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${dateFormatted} at ${selTime}</td></tr><tr><td style="padding:7px 0;color:#9a8a7e;border-bottom:1px solid #f5f0eb">Office</td><td style="padding:7px 0;font-weight:600;border-bottom:1px solid #f5f0eb;text-align:right">${selectedOffice.name}</td></tr><tr><td style="padding:7px 0;color:#9a8a7e">Amount</td><td style="padding:7px 0;font-weight:600;color:#b9875a;text-align:right">${priceStr}</td></tr></table>${form.notes ? `<div style="margin-top:16px;padding:12px;background:#fdf8f4;border-radius:6px;border-left:3px solid #b9875a;font-size:13px;color:#5a4a3e"><strong>Notes:</strong><br/>${form.notes}</div>` : ""}</div></div>`;

      // Emails sent best-effort — don't block confirmation on email success
      Promise.allSettled([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({ from: "Bob's Healing <onboarding@resend.dev>", to: [form.email], subject: `Appointment Request — ${sel.name} on ${dateFormatted}`, html: clientHtml }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({ from: "Booking System <onboarding@resend.dev>", to: [BOB_EMAIL], subject: `New Booking: ${clientName} — ${dateFormatted} at ${selTime}`, html: bobHtml }),
        }),
      ]).catch(() => {}); // ignore email errors — booking is already saved

      setSubmitted(true);
    } catch(e) {
      setError("Something went wrong saving your booking. Please try again or call 530-802-0801.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ── Confirmation screen ──
  if(submitted){
    const dateFormatted=`${DAYS_F[selDate.getDay()]}, ${MONTHS_S[selDate.getMonth()]} ${selDate.getDate()}`;
    return(
      <div className="bk"><style>{css}</style>
        <div className="bk-hero"><div className="bk-eyebrow">Bob's Healing Practice</div><div className="bk-title">Book Your <em>Session</em></div></div>
        <div className="bk-body"><div className="bk-confirm">
          <div className="bk-conf-icon">✦</div>
          <div className="bk-conf-title">You're all set, {form.first}.</div>
          <div className="bk-conf-sub">A confirmation has been sent to <strong>{form.email}</strong>. To reschedule, reply to your confirmation or call <strong>530-802-0801</strong>.</div>
          <div className="bk-conf-loc"><strong>📍 Your Appointment Location</strong>{selectedOffice?.name} Office · {selectedOffice?.address}<br/>{dateFormatted} at {selTime}</div>
          <div className="bk-conf-box">
            <div className="bk-conf-row"><span className="bk-conf-lbl">Service</span><span className="bk-conf-val">{sel?.name} ({sel?.duration})</span></div>
            <div className="bk-conf-row"><span className="bk-conf-lbl">Office</span><span className="bk-conf-val">{selectedOffice?.name}, CA</span></div>
            <div className="bk-conf-row"><span className="bk-conf-lbl">Date</span><span className="bk-conf-val">{dateFormatted}</span></div>
            <div className="bk-conf-row"><span className="bk-conf-lbl">Time</span><span className="bk-conf-val">{selTime}</span></div>
            <div className="bk-conf-row"><span className="bk-conf-lbl">Amount due</span><span className="bk-conf-val" style={{color:"#b9875a"}}>{sel?.price===0?"Free":`$${sel?.price}`}</span></div>
          </div>
          <p style={{fontSize:12,color:"#9a8a7e",fontWeight:300}}>Questions? <a href="tel:5308020801" style={{color:"#b9875a"}}>530-802-0801</a></p>
        </div></div>
      </div>
    );
  }

  return(
    <div className="bk"><style>{css}</style>
      <div className="bk-hero">
        <div className="bk-eyebrow">Bob's Healing Practice · Nevada City & Auburn, CA</div>
        <div className="bk-title">Book Your <em>Session</em></div>
        <div className="bk-sub">Heart-centered care combining advanced osteopathic therapy with cutting-edge healing technologies.</div>
      </div>
      <div className="bk-steps">
        {[["1","Service"],["2","Date & Time"],["3","Your Info"]].map(([n,label],i)=>(
          <div key={n} style={{display:"flex",alignItems:"center"}}>
            {i>0&&<div className="bk-step-div"/>}
            <div className={`bk-step ${step===i+1?"active":step>i+1?"done":""}`}>
              <div className="bk-step-num">{step>i+1?"✓":n}</div>{label}
            </div>
          </div>
        ))}
      </div>

      <div className="bk-body">

        {/* Step 1 */}
        {step===1&&(<>
          <div className="bk-h2">Choose Your Treatment</div>
          <div className="bk-p">Select a service — your office location shows automatically in the next step.</div>
          <div className="bk-services">
            {ALL_SERVICES.map(s=>(
              <div key={s.id} className={`bk-svc ${service===s.id?"sel":""}`} onClick={()=>setService(s.id)}>
                <div className="bk-chk">✓</div>
                {s.tag&&<div className={`bk-tag ${s.tag==="Intro Offer"?"bk-tag-i":"bk-tag-a"}`}>{s.tag}</div>}
                <div className="bk-svc-row"><div className="bk-svc-name">{s.name}</div><div className="bk-svc-price">{s.price===0?"Free":`$${s.price}`}</div></div>
                <div className="bk-svc-dur">{s.duration}</div>
                <div className="bk-svc-desc">{s.description}</div>
                {s.eecpOnly&&<div style={{marginTop:6,fontSize:10,color:"#b9875a",fontStyle:"italic"}}>Nevada City only</div>}
              </div>
            ))}
          </div>
          <div className="bk-nav"><span/><button className="bk-btn bk-btn-p" disabled={!canNext1} onClick={()=>setStep(2)}>Continue →</button></div>
        </>)}

        {/* Step 2 */}
        {step===2&&(<>
          <div className="bk-h2">Select a Date & Time</div>
          <div className="bk-p">{isEecp?"EECP is available at Nevada City only. ":""}Thursdays have two offices: Auburn (9 AM–1 PM) and Nevada City (2–5 PM).</div>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode==="list"?"active":""}`} onClick={()=>setViewMode("list")}>☰ List</button>
            <button className={`view-btn ${viewMode==="calendar"?"active":""}`} onClick={()=>setViewMode("calendar")}>▦ Calendar</button>
          </div>

          {/* List view */}
          {viewMode==="list"&&(<>
            <div className="list-dates">
              {days14.map((d,i)=>{
                const dow=d.getDay(),valid=getOfficesForDay(dow,sel?.eecpOnly),isOpen=valid.length>0;
                const isThu=dow===4&&valid.length>1,officeLabel=isThu?"Both":valid.length===1?valid[0].name:"";
                const officeColor=isThu?"#8a6a4a":valid.length===1?valid[0].color:"#ccc";
                const isSel=selDate&&toDateStr(selDate)===toDateStr(d);
                return(
                  <div key={i} className={`list-date ${isSel?"sel":""} ${!isOpen?"closed":""}`} onClick={()=>isOpen&&pickDate(d)}>
                    <div className="list-date-dow">{DAYS_S[dow]}</div>
                    <div className="list-date-num">{d.getDate()}</div>
                    <div className="list-date-mon">{MONTHS_S[d.getMonth()]}</div>
                    {isOpen&&<div className="list-date-office" style={{color:isSel?"#c9a07a":officeColor}}>{officeLabel}</div>}
                  </div>
                );
              })}
            </div>
            {isThursday&&selDate&&!selOffice&&(<>
              <div style={{fontSize:12,color:"#9a8a7e",marginBottom:10}}>Thursday has two offices — choose your location:</div>
              <div className="thu-btns">
                {getOfficesForDay(4,false).map(o=>(
                  <div key={o.id} className={`thu-btn ${selOffice===o.id?"sel":""}`} onClick={()=>{setSelOffice(o.id);setSelTime(null);}}>
                    <div className="thu-btn-name" style={{color:o.color}}>📍 {o.name}</div>
                    <div className="thu-btn-hrs">{fmtHrs(o.id,4)}</div>
                    {!o.hasEecp&&<div style={{fontSize:10,color:"#b9875a",marginTop:3,fontStyle:"italic"}}>No EECP here</div>}
                  </div>
                ))}
              </div>
            </>)}
            {isThursday&&selDate&&selOffice&&(
              <div className="office-banner">📍 <strong>{selectedOffice?.name}</strong> &nbsp;·&nbsp; {fmtHrs(selOffice,4)}&nbsp;<button style={{fontSize:11,color:"#b9875a",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setSelOffice(null)}>Change</button></div>
            )}
            {selDate&&selOffice&&!isThursday&&(
              <div className="office-banner">📍 <strong>{selectedOffice?.name}</strong> &nbsp;·&nbsp; {selectedOffice?.address}</div>
            )}
            {selDate&&selOffice&&(<>
              <div style={{fontSize:12,color:"#9a8a7e",marginBottom:4}}>{availSlots.length===0?"No availability — try another date.":`Available times · ${DAYS_F[selDate.getDay()]}, ${MONTHS_S[selDate.getMonth()]} ${selDate.getDate()}`}</div>
              <div className="list-times">
                {getSlotsForOfficeDay(selOffice,selDate.getDay()).map(t=>{
                  const ok=availSlots.includes(t);
                  return <div key={t} className={`list-time ${!ok?"na":""} ${selTime===t?"sel":""}`} onClick={()=>ok&&setSelTime(t)}>{t}</div>;
                })}
              </div>
              {isEecp&&<div className="note-box"><strong style={{color:"#b9875a"}}>EECP note:</strong> Bob sets you up in ~15 min, then the machine runs your session automatically.</div>}
            </>)}
          </>)}

          {/* Calendar view */}
          {viewMode==="calendar"&&(<>
            <div className="key-note">
              <span style={{display:"inline-flex",alignItems:"center",gap:5,marginRight:14}}><span style={{width:9,height:9,borderRadius:2,background:"#b9875a",display:"inline-block"}}/><strong>Nevada City</strong> — Mon, Tue, Thu 2–5 PM, Fri 11–4</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:9,height:9,borderRadius:2,background:"#4a8a78",display:"inline-block"}}/><strong>Auburn</strong> — Wed 9–6, Thu 9–1 PM</span>
              &nbsp;·&nbsp; Click any slot to select.
            </div>
            <div className="cal-wrap">
              <div className="cal-topbar">
                <div><div className="cal-topbar-title">{monthLabel}</div><div className="cal-topbar-sub">Week of {DAYS_S[week[0].getDay()]} {MONTHS_S[week[0].getMonth()]} {week[0].getDate()}</div></div>
                <div className="cal-nav-btns"><button className="cal-nav-btn" onClick={prevWeek}>‹</button><button className="cal-nav-btn" onClick={nextWeek}>›</button></div>
              </div>
              <div className="cal-outer">
                <div className="cal-gutter">{HOUR_ROWS.map(m=><div key={m} className="cal-gutter-hr">{minsToLabel(m)}</div>)}</div>
                <div className="cal-cols">
                  {week.map((d,i)=>{
                    const dow=d.getDay(),isToday=toDateStr(d)===todayStr;
                    const offices=getOfficesForDay(dow,sel?.eecpOnly),isPast=d<=today,isClosed=offices.length===0||isPast;
                    return(
                      <div key={i} className={`cal-dh ${isToday?"today":""} ${isClosed?"closed":""}`}>
                        <div className="cal-dh-dow">{DAYS_S[dow]}</div>
                        <div className="cal-dh-num">{d.getDate()}</div>
                        {!isClosed&&offices.map(o=><div key={o.id} className="cal-off-tag" style={{background:o.color+"22",color:o.color}}>{o.name}</div>)}
                      </div>
                    );
                  })}
                  {week.map((d,i)=>{
                    const dow=d.getDay(),isPast=d<=today;
                    const offices=getOfficesForDay(dow,sel?.eecpOnly),isClosed=offices.length===0||isPast;
                    const ds=toDateStr(d),slotMins=sel?.mins||15;
                    return(
                      <div key={i} className="cal-db" style={{height:TOTAL_H}}>
                        {HOUR_ROWS.map(m=><div key={m} className="cal-hr-line" style={{top:topPx(m)}}/>)}
                        {HOUR_ROWS.map(m=><div key={m+"h"} className="cal-hr-half" style={{top:topPx(m+30)}}/>)}
                        {isClosed&&<div className="cal-closed-bg"/>}
                        {!isClosed&&offices.map(o=>{
                          const hrs=o.hours[dow],aSlots=getAvailableSlots(o.id,dow,[],service);
                          return(
                            <div key={o.id}>
                              <div className="cal-zone" style={{top:topPx(hrs[0]),height:htPx(hrs[1]-hrs[0]),background:o.color+"0e",borderLeft:`2px solid ${o.color}30`}}/>
                              {aSlots.map(lbl=>{
                                const sm=labelToMins(lbl),isPicked=selDate&&toDateStr(selDate)===ds&&selOffice===o.id&&selTime===lbl;
                                return(
                                  <div key={lbl} className={`cal-slot ${isPicked?"picked":""}`}
                                    style={{top:topPx(sm)+1,height:htPx(slotMins)-2,background:isPicked?"#1e1a17":o.color,color:"white",opacity:isPicked?1:0.85}}
                                    onClick={()=>{setSelDate(d);setSelOffice(o.id);setSelTime(lbl);}}
                                    title={`${lbl} · ${o.name}`}>
                                    {slotMins>=20?lbl:""}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {isEecp&&<div className="note-box"><strong style={{color:"#b9875a"}}>EECP note:</strong> Bob sets you up in ~15 min, then the machine runs your session automatically.</div>}
          </>)}

          {canNext2&&(
            <div className="sel-bar">
              <div className="sel-bar-info">Selected: <strong>{DAYS_F[selDate.getDay()]}, {MONTHS_S[selDate.getMonth()]} {selDate.getDate()} at {selTime}</strong> &nbsp;·&nbsp; <span style={{color:"#8a7f76",fontSize:12}}>{selectedOffice?.name} Office</span></div>
              <button className="sel-bar-clear" onClick={clearSel}>✕ Clear</button>
            </div>
          )}
          {!canNext2&&<div style={{fontSize:12,color:"#b0a090",textAlign:"center",padding:"10px 0"}}>{viewMode==="calendar"?"Click a colored slot to select your time":"Select a date then time above"}</div>}
          <div className="bk-nav">
            <button className="bk-btn bk-btn-g" onClick={()=>setStep(1)}>← Back</button>
            <button className="bk-btn bk-btn-p" disabled={!canNext2} onClick={()=>setStep(3)}>Continue →</button>
          </div>
        </>)}

        {/* Step 3 */}
        {step===3&&(<>
          <div className="bk-sum">
            <div className="bk-sum-title">Booking Summary</div>
            <div className="bk-sum-row"><span className="bk-sum-lbl">Service</span><span className="bk-sum-val">{sel?.name} ({sel?.duration})</span></div>
            <div className="bk-sum-row"><span className="bk-sum-lbl">Date & Time</span><span className="bk-sum-val">{DAYS_F[selDate?.getDay()]}, {MONTHS_S[selDate?.getMonth()]} {selDate?.getDate()} · {selTime}</span></div>
            <div className="bk-sum-row" style={{borderBottom:"none"}}>
              <span className="bk-sum-lbl">Total</span>
              <span className="bk-sum-val" style={{fontSize:17,color:"#c9a07a",fontFamily:"'Cormorant Garamond',serif"}}>{sel?.price===0?"Free":`$${sel?.price}`}</span>
            </div>
            <div className="bk-sum-office">📍 {selectedOffice?.name} Office &nbsp;·&nbsp; {selectedOffice?.address}</div>
          </div>
          <div className="bk-h2">Your Information</div>
          <div className="bk-p">We keep your information private and use it only for your appointment.</div>
          <div className="bk-form">
            <div><label className="bk-lbl">First Name</label><input className="bk-input" value={form.first} onChange={e=>setForm({...form,first:e.target.value})} placeholder="Jane"/></div>
            <div><label className="bk-lbl">Last Name</label><input className="bk-input" value={form.last} onChange={e=>setForm({...form,last:e.target.value})} placeholder="Smith"/></div>
            <div><label className="bk-lbl">Email</label><input className="bk-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@email.com"/></div>
            <div><label className="bk-lbl">Phone</label><input className="bk-input" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="530-000-0000"/></div>
            <div className="bk-ff"><label className="bk-lbl">Health concerns or notes for Bob (optional)</label><textarea className="bk-textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="What brings you in, areas of focus, health history…"/></div>
            <div className="bk-ff"><div className="bk-consent"><input type="checkbox" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>I understand this booking is a request and will be confirmed by Bob's office. I agree to provide 24 hours notice for cancellations.</span></div></div>
          </div>
          {error&&<div className="err-box">{error}</div>}
          <div className="bk-nav">
            <button className="bk-btn bk-btn-g" onClick={()=>setStep(2)}>← Back</button>
            <button className="bk-btn bk-btn-p" disabled={!canSubmit||loading} onClick={handleSubmit}>
              {loading&&<span className="spinner"/>}{loading?"Booking…":"Request Appointment ✦"}
            </button>
          </div>
        </>)}

      </div>
    </div>
  );
}
