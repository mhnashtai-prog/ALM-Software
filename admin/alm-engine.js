/* ═══════════════════════════════════════════════════════════════
   ALM ENGINE  ·  alm-engine.js  ·  Session-first architecture
   ───────────────────────────────────────────────────────────────
   KEY CHANGE v2: Sessions are independent, not paired.
   proposed_turma now stores a JSON array of two session keys:
     ["dayIdx|startMins", "dayIdx|startMins"]
   e.g. ["0|870", "4|1020"] = SEG 14:30 + SEX 17:00
   Each session key maps to one row in the classes table (one day).
   Two students can share Session A but attend different Session B.
   This matches how Decision Centre already certifies: per-session.
═══════════════════════════════════════════════════════════════ */

/* ── SUPABASE ─────────────────────────────────────────────── */
const SB  = 'https://oapygbeliocdvitbdjbq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcHlnYmVsaW9jZHZpdGJkamJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjQzNjAsImV4cCI6MjA5MjA0MDM2MH0.-9Uj9Bg3q8sIlqzfzw2Sc1JziaueeyYGNwep-qWhWWg';
const H   = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const AY  = '2026/2027';
let _failCount = 0;

function setConn(ok) {
  const dot = document.getElementById('live-dot'), lbl = document.getElementById('live-lbl');
  if (ok) { _failCount=0; dot.className='tb-live-dot'; lbl.style.color='var(--green)'; lbl.textContent='LIVE'; }
  else { _failCount++; dot.className=_failCount<=2?'tb-live-dot amber':'tb-live-dot red'; lbl.textContent=_failCount<=2?'LENTO':'OFFLINE'; }
}

async function sbGet(table, qs) {
  let all=[], page=0, ps=1000;
  while(true){
    const s=page*ps, e=s+ps-1;
    const r=await fetch(`${SB}/rest/v1/${table}?${qs}`,{headers:{...H,Range:`${s}-${e}`,Prefer:'count=none'}});
    if(!r.ok) throw new Error(`${table} HTTP ${r.status}`);
    const d=await r.json(); all=all.concat(d);
    if(d.length<ps)break; page++; if(page>9)break;
  }
  return all;
}

/* ── CONSTANTS ────────────────────────────────────────────── */
const ALL_HRS   = [8,9,10,11,null,14,15,16,17,18,19,20];
const HOUR_COLS = ALL_HRS.filter(h=>h!==null);
const DAYS_PT   = ['SEG','TER','QUA','QUI','SEX','SÁB'];
const DAYS_FULL = {SEG:'Segunda',TER:'Terça',QUA:'Quarta',QUI:'Quinta',SEX:'Sexta','SÁB':'Sábado'};
const CLASS_DUR = 90;
const MIN_G=5, MAX_G=17, ASSIGN_MIN=8;
const HEALTHY_TARGET=13;
const RIGID_MAX_WINDOWS=2;
const SOLO_PREFIX = 'SOLO';

/* ── SESSION KEY HELPERS ──────────────────────────────────────
   A session key is "dayIdx|startMins" e.g. "0|870" = SEG 14:30
   proposed_turma stores JSON array of exactly 2 session keys,
   one per weekly session, with independent times.
   Legacy pair keys ("dayA-dayB|startMins|ordinal") are detected
   and transparently converted on read so old data still works.
   ─────────────────────────────────────────────────────────── */
const isSoloKey    = k => k && typeof k === 'string' && k.startsWith(SOLO_PREFIX+'|');
const isSessionKey = k => k && typeof k === 'string' && /^\d+\|\d+$/.test(k);
const isLegacyKey  = k => k && typeof k === 'string' && /^\d+-\d+\|\d+/.test(k);

function parseProposedTurma(raw){
  // Returns array of 0, 1 or 2 session-key strings
  if(!raw) return [];
  if(Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    if(Array.isArray(p)) return p;
  } catch {}
  // Single string — legacy pair key or solo key
  return [raw];
}

function sessionKeyToMins(k){
  // "dayIdx|startMins" → {dayIdx, startMins}
  const [d,s] = k.split('|').map(Number);
  return {dayIdx:d, startMins:s};
}

function legacyKeyToSessions(k){
  // "dayA-dayB|startMins|ordinal" → ["dayA|startMins","dayB|startMins"]
  const parts = k.split('|');
  const [dA,dB] = (parts[0]||'0-0').split('-').map(Number);
  const startMins = +parts[1]||0;
  if(dA===dB) return [`${dA}|${startMins}`];
  return [`${dA}|${startMins}`, `${dB}|${startMins}`];
}

function classifyTier(n){
  if(n>=MAX_G)      return {tier:'full',    color:'#C9A84C', label:'CHEIA'};
  if(n>=ASSIGN_MIN) return {tier:'healthy', color:'#3DE8A8', label:'SAUDÁVEL'};
  if(n>=MIN_G)      return {tier:'viable',  color:'#E8A020', label:'VIÁVEL'};
  return                   {tier:'forming', color:'#4A8FF5', label:'A FORMAR'};
}

/* ALM_PAIRS kept for UI display and legacy compat only.
   Engine placement no longer uses pair-level logic. */
const ALM_PAIRS = (function(){
  const wd = [0,1,2,3,4];
  const out = [];
  for(let i=0;i<wd.length;i++)
    for(let j=i+1;j<wd.length;j++)
      out.push({a:wd[i],b:wd[j],aL:DAYS_PT[wd[i]],bL:DAYS_PT[wd[j]],label:`${DAYS_PT[wd[i]]}+${DAYS_PT[wd[j]]}`});
  out.push({a:5,b:5,aL:'SÁB',bL:'SÁB',label:'SÁB',examOnly:true});
  return out;
})();

const DAY_NORM = {
  monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,
  segunda:0,terca:1,'terça':1,quarta:2,quinta:3,sexta:4,sabado:5,'sábado':5,
  seg:0,ter:1,qua:2,qui:3,sex:4,sab:5,'sáb':5,
  mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,
  'segunda-feira':0,'terça-feira':1,'quarta-feira':2,'quinta-feira':3,'sexta-feira':4
};

const LEVEL_MAP = {
  'kids|PI1':{dept:'kids',label:'PI 1',color:'var(--c-inf)',order:1,maxCap:60},
  'kids|PI2':{dept:'kids',label:'PI 2',color:'var(--c-inf)',order:2,maxCap:60},
  'kids|PI3':{dept:'kids',label:'PI 3',color:'var(--c-inf)',order:3,maxCap:60},
  'kids|PI4':{dept:'kids',label:'PI 4',color:'var(--c-inf)',order:4,maxCap:60},
  'kids_juv|PJ1':{dept:'kids_juv',label:'PJ 1',color:'var(--c-juv)',order:5,maxCap:90},
  'kids_juv|PJ2':{dept:'kids_juv',label:'PJ 2',color:'var(--c-juv)',order:6,maxCap:90},
  'kids_juv|PJ3':{dept:'kids_juv',label:'PJ 3',color:'var(--c-juv)',order:7,maxCap:90},
  'adults|1':{dept:'adults',label:'Ano 1',color:'var(--c-ger)',order:8,maxCap:200},
  'adults|2':{dept:'adults',label:'Ano 2',color:'var(--c-ger)',order:9,maxCap:200},
  'adults|3':{dept:'adults',label:'Ano 3',color:'var(--c-ger)',order:10,maxCap:200},
  'adults|4':{dept:'adults',label:'Ano 4',color:'var(--c-ger)',order:11,maxCap:200},
  'adults|5':{dept:'adults',label:'Ano 5',color:'var(--c-ger)',order:12,maxCap:200},
  'adults|Portugues':{dept:'adults',label:'Português',color:'var(--c-ger)',order:13,maxCap:200},
  'exam|6':{dept:'exam',label:'Ano 6 FCE',color:'var(--c-exa)',order:14,maxCap:60},
  'exam|7':{dept:'exam',label:'Ano 7 CAE',color:'var(--c-exa)',order:15,maxCap:60},
  'exam|8':{dept:'exam',label:'Ano 8 CPE',color:'var(--c-exa)',order:16,maxCap:60},
};

const DEPT_CFG = {
  kids:{label:'Infantil',color:'var(--c-inf)'},
  kids_juv:{label:'Juvenil',color:'var(--c-juv)'},
  adults:{label:'Geral',color:'var(--c-ger)'},
  exam:{label:'Exames',color:'var(--c-exa)'},
};
const DEPT_ORDER = ['kids','kids_juv','adults','exam'];
const DEPT_GRADS = {
  kids:'linear-gradient(145deg,#1A3A6A,#0D2248)',
  kids_juv:'linear-gradient(145deg,#0D4A3A,#062A20)',
  adults:'linear-gradient(145deg,#3A2A10,#201408)',
  exam:'linear-gradient(145deg,#3A1A3A,#200D20)',
};
const COURSE_ACCENT={kids:'#6AABFF',kids_juv:'#3DE8A8',adults:'#C8A44A',exam:'#C080F0'};
const BRANCH_LABELS={FUNCHAL:'Funchal',CAMARA_LOBOS:'C. Lobos',SANTA_CRUZ:'S. Cruz',MACHICO:'Machico',RIBEIRA_BRAVA:'R. Brava',CALHETA:'Calheta'};
const BC={FUNCHAL:'FUN',CAMARA_LOBOS:'CLB',SANTA_CRUZ:'SCZ',MACHICO:'MAC',RIBEIRA_BRAVA:'RBR',CALHETA:'CAL'};
const BRANCH_ORDER=['FUNCHAL','CAMARA_LOBOS','SANTA_CRUZ','MACHICO','RIBEIRA_BRAVA','CALHETA'];
const ALM_DISP={'PI1':'PI 1','PI2':'PI 2','PI3':'PI 3','PI4':'PI 4','PJ1':'PJ 1','PJ2':'PJ 2','PJ3':'PJ 3','1':'Ano 1','2':'Ano 2','3':'Ano 3','4':'Ano 4','5':'Ano 5','Portugues':'Português','6':'Ano 6 FCE','7':'Ano 7 CAE','8':'Ano 8 CPE'};

/* ── STATE ────────────────────────────────────────────────── */
let allE=[],allR=[],rByRef={};
let activeLoc='FUNCHAL',activeLevelKey=null;
let openDepts={kids:true,kids_juv:false,adults:false,exam:true};
let _ovOpenDepts2={kids:true,kids_juv:false,adults:false,exam:true};
let _lastResult=null;
let _allResults={};
let _auditResults={};
let _groupCodes={};
let _retiredCodes=new Set();
let _exceptionQueue=[];
let _bootComplete=false;
let _liveMode=false, _liveTimer=null;
let _dsData={},_dsTTLoaded=false;
let auditFilters={branch:'all',status:'all',dept:'all',levelKey:null};
let _sinalOpen=false;
let _ovActiveLevel=null,_ovActiveLoc='FUNCHAL';
let _decActiveIdx=null,_decActiveBranch='all';
let _nextSeqBase={};
let _lockedRefs={};
let _lockMeta={};
let _proposalCache={};
let READ_PROPOSED = true;
let _proposedByRef = {};  // ref -> parsed session keys array [sessionKey, sessionKey]

/* ── HELPERS ──────────────────────────────────────────────── */
const normB=b=>(b||'').toUpperCase().replace(/[\s\-]+/g,'_').replace(/_+/g,'_').trim();
const normS=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const lk=e=>`${(e.family||'').toLowerCase()}|${(e.level_code||e.level_cefr||'').trim()}`;
const getLM=e=>LEVEL_MAP[lk(e)]||{dept:(e.family||'adults'),label:(e.level_code||e.level_cefr||'—'),color:'var(--t3)',order:99,maxCap:60};
const locStu=()=>activeLoc==='all'?allE:allE.filter(e=>normB(e.branch)===activeLoc);
const minsToT=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

function avCol(name){
  let h=0;for(let i=0;i<(name||'?').length;i++)h=(h*31+(name||'?').charCodeAt(i))&0xffffffff;
  const p=[{bg:'#3A2244',t:'#C8A0E0'},{bg:'#1E2E50',t:'#7AABEE'},{bg:'#1A3A2A',t:'#5EC888'},{bg:'#3A2A14',t:'#D4944A'},{bg:'#3A1A1A',t:'#E07878'},{bg:'#1A2A3A',t:'#5A9EC8'},{bg:'#282838',t:'#9898D8'},{bg:'#2A3820',t:'#80B850'}];
  return p[Math.abs(h)%p.length];
}
function avInit(n){return(n||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}

function slotCol(dayIdx,startMins){
  const palette=['#ABCBA0','#C7A2A2','#50732A','#9B7B4A','#6B5B8A','#7A9EC8','#C8A44A','#4A7C6F','#8A6B4A','#5A8A6B','#A07A5A','#6A4A8A','#8A7A4A','#4A6B8A','#7A4A6B','#5A7A4A'];
  const hour=Math.floor((startMins||0)/60);
  return palette[((dayIdx||0)*13+hour)%palette.length];
}

function parseDayPrefs(raw){
  if(!raw)return[];if(Array.isArray(raw))return raw;
  try{const p=JSON.parse(raw);return Array.isArray(p)?p:[];}catch{return[];}
}
function timeToMins(t){
  if(!t)return null;const parts=(t+'').trim().split(':');
  const h=parseInt(parts[0],10),m=parseInt(parts[1]||'0',10);
  return isNaN(h)?null:h*60+m;
}
function normDay(raw){
  if(raw===null||raw===undefined)return null;
  const n=parseInt(raw);
  if(!isNaN(n)&&n>=1&&n<=6)return n-1;
  if(!isNaN(n)&&n>=0&&n<=5)return n;
  const key=(raw+'').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return DAY_NORM[key]??null;
}
function parseSlot(p){
  if(p.available===false)return null;
  const rawDay=p.day_short||p.day||p.weekday||p.dia||p.day_code||'';
  let dayIdx=normDay(rawDay);if(dayIdx===null)return null;
  const rawStart=p.from||p.session_start||p.start_time||p.time||(p.hour!==undefined?`${p.hour}:00`:null);
  const fromMins=timeToMins(rawStart);if(fromMins===null)return null;
  const rawEnd=p.to||p.end_time;
  const toMins=rawEnd?timeToMins(rawEnd):fromMins+CLASS_DUR;
  return{dayIdx,fromMins,toMins:toMins||fromMins+CLASS_DUR};
}
function analysePrefs(ref){
  const req=rByRef[ref];if(!req)return null;
  const raw=parseDayPrefs(req.slots||req.day_preferences);if(!raw.length)return null;
  const byDay={};
  raw.forEach(p=>{
    const s=parseSlot(p);if(!s)return;
    if(!byDay[s.dayIdx])byDay[s.dayIdx]={dayIdx:s.dayIdx,earliest:s.fromMins,latest:s.toMins};
    else{if(s.fromMins<byDay[s.dayIdx].earliest)byDay[s.dayIdx].earliest=s.fromMins;if(s.toMins>byDay[s.dayIdx].latest)byDay[s.dayIdx].latest=s.toMins;}
  });
  const windows=Object.values(byDay),dayIdxs=windows.map(w=>w.dayIdx);
  const sameDay=new Set(dayIdxs).size===1&&windows.length>=2;
  return{windows,dayIdxs,sameDay};
}

function toMins(t){
  if(t==null)return null;
  if(typeof t==='number')return t*60;
  const parts=String(t).split(':').map(Number);
  return(parts[0]||0)*60+(parts[1]||0);
}

/* ── LOAD PROPOSED ────────────────────────────────────────────
   _proposedByRef[ref] = array of session keys, e.g. ["0|870","4|1020"]
   Handles legacy pair keys transparently.
   ─────────────────────────────────────────────────────────── */
async function loadProposed(){
  _proposedByRef = {};
  if(!READ_PROPOSED) return;
  try{
    const rows = await sbGet('timetable_requests',
      `select=ref,proposed_turma&academic_year=eq.${AY}&proposed_turma=not.is.null`);
    rows.forEach(r=>{
      if(!r.proposed_turma) return;
      const raw = parseProposedTurma(r.proposed_turma);
      // Convert legacy pair keys to session keys
      const sessions = [];
      raw.forEach(k=>{
        if(isLegacyKey(k)) sessions.push(...legacyKeyToSessions(k));
        else if(isSessionKey(k) || isSoloKey(k)) sessions.push(k);
      });
      if(sessions.length) _proposedByRef[r.ref] = sessions;
    });
  }catch(e){ console.warn('loadProposed failed', e); }
}

/* ── buildFromProposed ────────────────────────────────────────
   Session-first: each student has up to 2 independent session
   keys. Groups are reconstructed per session (one day at a time).
   For the grid display we still need a "group" object with a
   pair of days — we reconstruct it by matching students who
   share both sessions.
   ─────────────────────────────────────────────────────────── */
function buildFromProposed(levelKey, branch){
  const all = allE.filter(e=>{
    if(lk(e)!==levelKey) return false;
    if(branch!=='all' && normB(e.branch)!==branch) return false;
    return true;
  });
  const withReq = all.filter(e=>!!rByRef[e.ref]);

  // Bucket students by each individual session key
  // sessionBuckets["dayIdx|startMins"] = [enrolment, ...]
  const sessionBuckets = {};
  const soloStudents   = [];
  const placed         = new Set();

  withReq.forEach(e=>{
    const sessions = _proposedByRef[e.ref];
    if(!sessions || !sessions.length) return;

    // Solo queue
    if(sessions.length === 1 && isSoloKey(sessions[0])){
      soloStudents.push({e, soloKey: sessions[0]});
      placed.add(e.ref);
      return;
    }

    // Normal sessions
    sessions.forEach(sk=>{
      if(!isSessionKey(sk)) return;
      const bk = normB(e.branch)+'§'+sk;
      (sessionBuckets[bk] = sessionBuckets[bk] || {sk, students:[]}).students.push(e);
      placed.add(e.ref);
    });
  });

  if(!Object.keys(sessionBuckets).length && !soloStudents.length) return null;

  // Build group objects from session buckets
  // Each unique session = one group object for the grid
  const groups = [];
  Object.values(sessionBuckets).forEach(({sk, students})=>{
    const {dayIdx, startMins} = sessionKeyToMins(sk);
    // Deduplicate students (a student appears in each of their sessions)
    const seen = new Set();
    const uniq = students.filter(e=>{ if(seen.has(e.ref)) return false; seen.add(e.ref); return true; });
    const t = classifyTier(uniq.length);
    // Find a compatible pairDef for display purposes only
    const pairDef = ALM_PAIRS.find(p=>p.a===dayIdx) || null;
    groups.push({
      pairDef,
      dayIdx_A: dayIdx, dayIdx_B: dayIdx,  // single session — same day both sides
      dayL_A: DAYS_PT[dayIdx]||'?', dayL_B: DAYS_PT[dayIdx]||'?',
      dayL: DAYS_PT[dayIdx]||'?', dayIdx,
      startMins,
      startTime: minsToT(startMins),
      endTime:   minsToT(startMins+CLASS_DUR),
      students:  uniq,
      tier: t.tier, tierColor: t.color, tierLabel: t.label,
      _fromProposed: true,
      _sessionKey: sk,
    });
  });

  // Solo sinalizados
  const sinalizados = [];
  soloStudents.forEach(({e, soloKey})=>{
    const parts = soloKey.split('|');
    const dayIdx = +parts[1]||0;
    const startMins = +parts[2]||0;
    sinalizados.push({
      e,
      reason: 'solo-queue',
      why: `À espera de turma · ${DAYS_PT[dayIdx]||'?'} ${minsToT(startMins)} · aguarda mais alunos`,
      soloKey,
    });
  });

  const placedCount = placed.size;
  const tierCounts  = {forming:0, viable:0, healthy:0, full:0};
  groups.forEach(g=>tierCounts[g.tier]++);

  return {
    groups,
    sinalizados,
    total:        all.length,
    withRequest:  withReq.length,
    placed:       placedCount,
    invalidWinCt: 0,
    noGroupCt:    withReq.length - placedCount,
    tierCounts,
  };
}

/* ── buildProposals ───────────────────────────────────────────
   Session-first compute path (used when no stored data exists).
   Each student gets two independent session placements — one per
   available day. Sessions are scored independently per day.
   ─────────────────────────────────────────────────────────── */
function buildProposals(levelKey, branch){
  if(READ_PROPOSED){
    const fromStore = buildFromProposed(levelKey, branch);
    if(fromStore) return fromStore;
  }

  const STEP = 30;
  const dept = (levelKey.split('|')[0]||'adults').toLowerCase();
  const all  = allE.filter(e=>{
    if(lk(e)!==levelKey) return false;
    if(branch!=='all' && normB(e.branch)!==branch) return false;
    return true;
  });
  const withReq = all.filter(e=>!!rByRef[e.ref]);

  // Parse each student's available windows per day
  const studentWindows = {};
  withReq.forEach(e=>{
    const req = rByRef[e.ref]; if(!req) return;
    const raw = parseDayPrefs(req.slots||req.day_preferences);
    const parsed = raw.map(p=>parseSlot(p)).filter(Boolean);
    if(parsed.length) studentWindows[e.ref] = parsed;
  });

  const SLOTS = []; for(let t=8*60;t<=20*60-CLASS_DUR;t+=STEP) SLOTS.push(t);
  const allowedDays = dept==='exam' ? [0,1,2,3,4,5] : [0,1,2,3,4];

  // coversSession: does student window cover a specific day+startMins?
  const coversSession = (w, dayIdx, startMins) =>
    w.some(x => x.dayIdx===dayIdx && x.fromMins<=startMins+15 && x.toMins>=startMins+CLASS_DUR-15);

  // For each student, find all valid session keys per day
  const fitsByStudentPerDay = {};  // ref -> {dayIdx -> [startMins,...]}
  withReq.forEach(e=>{
    const w = studentWindows[e.ref]; if(!w){ fitsByStudentPerDay[e.ref]={}; return; }
    const byDay = {};
    allowedDays.forEach(d=>{
      const fits = SLOTS.filter(s=>coversSession(w, d, s));
      if(fits.length) byDay[d] = fits;
    });
    fitsByStudentPerDay[e.ref] = byDay;
  });

  // Build sessions independently per day
  // sessionGroups["dayIdx|startMins"] -> [refs]
  const sessionGroups = {};
  const placedPerDay  = {};  // ref -> Set of dayIdx already placed

  withReq.forEach(e=>{ placedPerDay[e.ref] = new Set(); });

  // Greedy: for each day, find the slot with the most fitting students
  allowedDays.forEach(dayIdx=>{
    let guard = 0;
    while(guard++<300){
      // Count unplaced students available at each slot on this day
      const slotCount = {};
      withReq.forEach(e=>{
        if(placedPerDay[e.ref].has(dayIdx)) return;
        const fits = fitsByStudentPerDay[e.ref][dayIdx] || [];
        fits.forEach(s=>{
          slotCount[s] = (slotCount[s]||0) + 1;
        });
      });

      const best = Object.entries(slotCount).sort((a,b)=>b[1]-a[1])[0];
      if(!best || best[1]===0) break;

      const startMins = +best[0];
      const sk = `${dayIdx}|${startMins}`;
      const eligible = withReq.filter(e=>
        !placedPerDay[e.ref].has(dayIdx) &&
        (fitsByStudentPerDay[e.ref][dayIdx]||[]).includes(startMins)
      );

      if(!eligible.length) break;

      const take = eligible.slice(0, HEALTHY_TARGET);
      if(!sessionGroups[sk]) sessionGroups[sk] = [];
      take.forEach(e=>{
        sessionGroups[sk].push(e.ref);
        placedPerDay[e.ref].add(dayIdx);
      });
    }
  });

  // Students need to be placed on exactly 2 days
  // Find students placed on <2 days and try to fill remaining days
  withReq.forEach(e=>{
    const byDay = fitsByStudentPerDay[e.ref];
    const placed = placedPerDay[e.ref];
    const missingDays = allowedDays.filter(d=>!placed.has(d) && byDay[d]?.length);
    missingDays.forEach(dayIdx=>{
      if(placed.size >= 2) return; // already have 2 sessions
      const fits = byDay[dayIdx] || [];
      // Try to join an existing session on this day
      const hit = fits.find(s=>{
        const sk = `${dayIdx}|${s}`;
        return sessionGroups[sk] && sessionGroups[sk].length < MAX_G;
      });
      if(hit){
        const sk = `${dayIdx}|${hit}`;
        sessionGroups[sk].push(e.ref);
        placedPerDay[e.ref].add(dayIdx);
      } else {
        // Create new solo session for this day
        const s = fits[0];
        const sk = `${dayIdx}|${s}`;
        if(!sessionGroups[sk]) sessionGroups[sk] = [];
        sessionGroups[sk].push(e.ref);
        placedPerDay[e.ref].add(dayIdx);
      }
    });
  });

  // Build group objects for each session
  const groups = [];
  Object.entries(sessionGroups).forEach(([sk, refs])=>{
    if(!refs.length) return;
    const {dayIdx, startMins} = sessionKeyToMins(sk);
    const seen = new Set();
    const students = refs.map(r=>withReq.find(e=>e.ref===r)).filter(e=>e && !seen.has(e.ref) && seen.add(e.ref));
    if(!students.length) return;
    const t = classifyTier(students.length);
    const pairDef = ALM_PAIRS.find(p=>p.a===dayIdx)||null;
    groups.push({
      pairDef,
      dayIdx_A:dayIdx, dayIdx_B:dayIdx,
      dayL_A:DAYS_PT[dayIdx]||'?', dayL_B:DAYS_PT[dayIdx]||'?',
      dayL:DAYS_PT[dayIdx]||'?', dayIdx,
      startMins,
      startTime:minsToT(startMins), endTime:minsToT(startMins+CLASS_DUR),
      students, tier:t.tier, tierColor:t.color, tierLabel:t.label,
      _sessionKey: sk,
    });
  });

  // Students with no valid windows at all
  const noWindows = withReq.filter(e=>!studentWindows[e.ref]);
  // Students with windows but placed on <2 days
  const fullyPlaced = new Set(withReq.filter(e=>placedPerDay[e.ref].size>=2).map(e=>e.ref));
  const noGroup = withReq.filter(e=>studentWindows[e.ref] && !fullyPlaced.has(e.ref));

  const sinalizados = [
    ...noWindows.map(e=>({e,reason:'invalid-window',why:'Horário sem janelas válidas reconhecidas'})),
    ...noGroup.map(e=>({e,reason:'no-group',why:`Apenas ${placedPerDay[e.ref].size} sessão/ões encontrada(s) — necessita 2 dias disponíveis`})),
  ];

  const tierCounts={forming:0,viable:0,healthy:0,full:0};
  groups.forEach(g=>tierCounts[g.tier]++);

  return{
    groups, sinalizados,
    total:all.length, withRequest:withReq.length,
    placed:fullyPlaced.size,
    invalidWinCt:noWindows.length, noGroupCt:noGroup.length,
    tierCounts,
  };
}

/* ── planIncremental ──────────────────────────────────────────
   Session-first incremental placement.
   For each awaiting student, independently assigns:
     - Session A: best available slot on their preferred day A
     - Session B: best available slot on their preferred day B
   Writes proposed_turma as JSON array: ["dayA|startMins","dayB|startMins"]
   Students alone at a slot get a SOLO key for that session.
   ─────────────────────────────────────────────────────────── */
function planIncremental(levelKey, branch){
  const proposedByRef = _proposedByRef;
  const dept = (levelKey.split('|')[0]||'adults').toLowerCase();
  const STEP = 30;
  const SLOTS = []; for(let t=8*60;t<=20*60-CLASS_DUR;t+=STEP) SLOTS.push(t);
  const allowedDays = dept==='exam' ? [0,1,2,3,4,5] : [0,1,2,3,4];

  const coversSession = (w, dayIdx, startMins) =>
    w.some(x => x.dayIdx===dayIdx && x.fromMins<=startMins+15 && x.toMins>=startMins+CLASS_DUR-15);

  const inScope = e => lk(e)===levelKey && (branch==='all'||normB(e.branch)===branch) && !!rByRef[e.ref];
  const scope   = allE.filter(inScope);

  // Build snapshot of existing sessions from placed students
  // sessionRoster["dayIdx|startMins"] -> Set of refs
  const sessionRoster = {};
  scope.forEach(e=>{
    const sessions = proposedByRef[e.ref];
    if(!sessions) return;
    sessions.forEach(sk=>{
      if(!isSessionKey(sk)) return;
      (sessionRoster[sk] = sessionRoster[sk] || new Set()).add(e.ref);
    });
  });

  // Solo roster: dayIdx|startMins -> Set of refs currently in solo
  const soloRoster = {};
  scope.forEach(e=>{
    const sessions = proposedByRef[e.ref];
    if(!sessions) return;
    sessions.forEach(sk=>{
      if(!isSoloKey(sk)) return;
      // SOLO|dayIdx|startMins
      const parts = sk.split('|');
      const realSk = `${parts[1]}|${parts[2]}`;
      (soloRoster[realSk] = soloRoster[realSk] || new Set()).add(e.ref);
    });
  });

  // Awaiting = no proposed_turma at all
  const awaiting = scope.filter(e=>!proposedByRef[e.ref]).map(e=>{
    const req = rByRef[e.ref];
    const raw = parseDayPrefs(req.slots||req.day_preferences);
    const w   = raw.map(p=>parseSlot(p)).filter(Boolean);
    // fitsByDay: dayIdx -> [startMins that fit]
    const fitsByDay = {};
    allowedDays.forEach(d=>{
      const fits = SLOTS.filter(s=>coversSession(w, d, s));
      if(fits.length) fitsByDay[d] = fits;
    });
    return {ref:e.ref, w, fitsByDay};
  });

  const plan = {};
  let foldedExisting=0, newSessions=0, soloQueued=0, soloPromoted=0, pending=0;
  const pendingRefs = [], soloRefs = [];

  awaiting.forEach(a=>{
    const days = Object.keys(a.fitsByDay).map(Number);
    if(days.length < 2){
      // Can't form 2 sessions — true pending
      pending++;
      pendingRefs.push(a.ref);
      return;
    }

    // For each of the 2 most-available days, find the best session
    // "Best" = existing session with most room, else solo/new
    const sessionKeys = [];

    // Sort days by number of available slots descending (most flexible first)
    const sortedDays = days.sort((a,b)=>(a.fitsByDay?.[b]||[]).length - (a.fitsByDay?.[a]||[]).length);
    // Take exactly 2 days
    const chosenDays = sortedDays.slice(0,2);

    let canPlace = true;
    chosenDays.forEach(dayIdx=>{
      const fits = a.fitsByDay[dayIdx] || [];

      // Try to fold into existing session
      const hit = fits.find(s=>{
        const sk = `${dayIdx}|${s}`;
        return sessionRoster[sk] && sessionRoster[sk].size < MAX_G;
      });

      if(hit){
        const sk = `${dayIdx}|${hit}`;
        (sessionRoster[sk] = sessionRoster[sk] || new Set()).add(a.ref);
        sessionKeys.push(sk);
        foldedExisting++;
        return;
      }

      // Check if solo promotion is possible (existing solos + this student >= MIN_G)
      const soloHit = fits.find(s=>{
        const sk = `${dayIdx}|${s}`;
        return (soloRoster[sk]?.size||0) + 1 >= MIN_G;
      });

      if(soloHit){
        const sk = `${dayIdx}|${soloHit}`;
        // Promote all solos at this slot to a real session
        (soloRoster[sk]||new Set()).forEach(r=>{
          // Update their plan to real session key
          plan[r] = plan[r] || {};
          plan[r][dayIdx] = sk;
          soloPromoted++;
        });
        (sessionRoster[sk] = sessionRoster[sk] || new Set()).add(a.ref);
        soloRoster[sk] = new Set(); // consumed
        sessionKeys.push(sk);
        newSessions++;
        return;
      }

      // No existing session fits — queue as solo for this day
      const s = fits[0];
      const sk = `${dayIdx}|${s}`;
      const soloKey = `${SOLO_PREFIX}|${dayIdx}|${s}`;
      (soloRoster[sk] = soloRoster[sk] || new Set()).add(a.ref);
      sessionKeys.push(soloKey);
      soloQueued++;
    });

    if(sessionKeys.length >= 2){
      plan[a.ref] = { sessions: sessionKeys, how: sessionKeys.some(isSoloKey) ? 'solo-queue' : 'placed' };
      if(sessionKeys.some(isSoloKey)) soloRefs.push(a.ref);
    } else {
      pending++;
      pendingRefs.push(a.ref);
    }
  });

  // Handle solo promotions: students already in solo who need their key updated
  Object.entries(soloRoster).forEach(([sk, refs])=>{
    if(!refs.size) return; // consumed by promotion above
    // These are EXISTING solo students — check if now promotable
    // (This handles the case where multiple new arrivals push the count over MIN_G)
    if(refs.size >= MIN_G){
      refs.forEach(r=>{
        if(!plan[r]){
          // Find which session this solo belongs to and update
          const sessions = proposedByRef[r];
          if(!sessions) return;
          const updated = sessions.map(s=>{
            if(isSoloKey(s)){
              const parts = s.split('|');
              const realSk = `${parts[1]}|${parts[2]}`;
              return realSk === sk ? sk : s; // promote this day's solo to real
            }
            return s;
          });
          plan[r] = { sessions: updated, how: 'solo-promoted' };
          soloPromoted++;
        }
      });
    }
  });

  return {
    plan,
    counts:{ awaiting:awaiting.length, foldedExisting, newSessions, soloQueued, soloPromoted, pending },
    pendingRefs,
    soloRefs,
  };
}

function chunk(arr, n){ const out=[]; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

/* ── applyIncremental ─────────────────────────────────────────
   Writes proposed_turma as JSON array of session keys.
   ["0|870","4|1020"] = SEG 14:30 + SEX 17:00 (independent times)
   ─────────────────────────────────────────────────────────── */
async function applyIncremental(){
  const toWrite = {};  // ref -> JSON string of session array
  let tA=0,tF=0,tNS=0,tSQ=0,tSP=0,tP=0;

  for(const levelKey of Object.keys(LEVEL_MAP)){
    for(const branch of BRANCH_ORDER){
      const here = allE.filter(e=>lk(e)===levelKey && normB(e.branch)===branch && !!rByRef[e.ref]);
      if(!here.length) continue;
      const hasAwaiting = here.some(e=>!_proposedByRef[e.ref]);
      const hasSolo     = here.some(e=>(_proposedByRef[e.ref]||[]).some(isSoloKey));
      if(!hasAwaiting && !hasSolo) continue;

      const r = planIncremental(levelKey, branch);
      tA+=r.counts.awaiting; tF+=r.counts.foldedExisting;
      tNS+=r.counts.newSessions; tSQ+=r.counts.soloQueued;
      tSP+=r.counts.soloPromoted; tP+=r.counts.pending;

      Object.entries(r.plan).forEach(([ref, entry])=>{
        toWrite[ref] = JSON.stringify(entry.sessions);
      });
    }
  }

  let written = 0;
  const refs = Object.keys(toWrite);
  for(const part of chunk(refs, 80)){
    for(const ref of part){
      const rr = await fetch(
        `${SB}/rest/v1/timetable_requests?ref=eq.${encodeURIComponent(ref)}&academic_year=eq.${AY}`,
        { method:'PATCH',
          headers:{...H,'Content-Type':'application/json',Prefer:'return=minimal'},
          body: JSON.stringify({ proposed_turma: toWrite[ref] }),
        }
      );
      if(!rr.ok) throw new Error(`applyIncremental: write failed for ${ref} (HTTP ${rr.status})`);
      written++;
    }
  }

  return {
    counts:{awaiting:tA, foldedExisting:tF, newSessions:tNS, soloQueued:tSQ, soloPromoted:tSP, pending:tP},
    written,
  };
}

function countAguardarTurma(){
  let basket=0, incompleteAddress=0;
  const byLevel={}, basketRefs=[], incompleteRefs=[];
  for(const levelKey of Object.keys(LEVEL_MAP)){
    for(const branch of BRANCH_ORDER){
      const here = allE.filter(e=>lk(e)===levelKey && normB(e.branch)===branch && !!rByRef[e.ref]);
      if(!here.length) continue;
      if(!here.some(e=>!_proposedByRef[e.ref])) continue;
      const r = planIncremental(levelKey, branch);
      if(!r.pendingRefs.length) continue;
      r.pendingRefs.forEach(ref=>{
        const req=rByRef[ref]; if(!req) return;
        const raw=parseDayPrefs(req.slots||req.day_preferences);
        const w=raw.map(p=>parseSlot(p)).filter(Boolean);
        const days=[...new Set(w.map(x=>x.dayIdx))];
        const hasFit = days.length >= 2;
        if(!byLevel[levelKey]) byLevel[levelKey]={basket:0,incomplete:0};
        if(hasFit){ basket++; byLevel[levelKey].basket++; basketRefs.push(ref); }
        else       { incompleteAddress++; byLevel[levelKey].incomplete++; incompleteRefs.push(ref); }
      });
    }
  }
  return { basket, incompleteAddress, byLevel, basketRefs, incompleteRefs };
}

function buildProposalsCached(levelKey, branch){
  const cacheKey = `${levelKey}│${branch}`;
  if(_proposalCache[cacheKey]) return _proposalCache[cacheKey];
  const result = buildProposals(levelKey, branch);
  if(result && (result.groups.length || result.sinalizados.length)){
    _proposalCache[cacheKey] = result;
  }
  return result;
}

/* ── AUDIT ────────────────────────────────────────────────── */
function auditGroupSync(g){
  const log={};
  let passCount=0,warnCount=0,failCount=0;

  g.students.forEach(e=>{
    const req=rByRef[e.ref];
    if(!req){log[e.ref]={verdict:'fail',reason:'Sem pedido registado'};failCount++;return;}
    const raw=parseDayPrefs(req.slots||req.day_preferences);
    const slots=raw.map(p=>parseSlot(p)).filter(Boolean);
    const dayIdx = g.dayIdx_A ?? g.dayIdx;
    const startMins = g.startMins;
    const daySlots = slots.filter(s=>s.dayIdx===dayIdx);
    const hasDay   = daySlots.length > 0;
    const fitsTime = daySlots.some(s=>s.fromMins<=startMins+15 && s.toMins>=startMins+CLASS_DUR-15);
    let verdict='pass', reason='Sessão confirmada';
    if(!hasDay){ verdict='fail'; reason=`Não pediu ${DAYS_PT[dayIdx]||'?'}`; }
    else if(!fitsTime){ verdict='warn'; reason=`${DAYS_PT[dayIdx]||'?'} ${minsToT(startMins)}–${minsToT(startMins+CLASS_DUR)} não cabe na janela declarada`; }
    log[e.ref]={verdict,reason};
    if(verdict==='pass')passCount++;else if(verdict==='warn')warnCount++;else failCount++;
  });

  const sizeStatus=g.students.length<ASSIGN_MIN?'warn':'pass';
  const auditStatus=failCount>0?'fail':(warnCount>0||sizeStatus==='warn')?'warn':'pass';
  if(sizeStatus==='warn'){Object.keys(log).forEach(ref=>{if(log[ref].verdict==='pass')log[ref].sizeWarn=`Sessão com ${g.students.length} alunos — mínimo para abertura é ${ASSIGN_MIN}`;});}
  const tier=classifyTier(g.students.length);
  return{status:auditStatus,passCount,warnCount:warnCount+(sizeStatus==='warn'?1:0),failCount,log,sizeWarn:sizeStatus==='warn',tier:tier.tier,tierColor:tier.color,tierLabel:tier.label};
}

/* ── COMMIT ───────────────────────────────────────────────── */
async function loadNextSeqBase(){
  try{
    const rows=await sbGet('classes',`select=turma_code&academic_year=eq.${AY}&limit=500`);
    const maxByBranch={};
    rows.forEach(r=>{const m=(r.turma_code||'').match(/^([A-Z]{2,4})-(\d+)[AB]?$/);if(!m)return;const bc=m[1],n=parseInt(m[2],10);if(!maxByBranch[bc]||n>maxByBranch[bc])maxByBranch[bc]=n;});
    Object.keys(maxByBranch).forEach(bc=>{_nextSeqBase[bc]=maxByBranch[bc]+1;});
  }catch(e){console.warn('loadNextSeqBase failed',e);}
}

function generateTurmaCodeSync(branch){
  const bc=BC[normB(branch)]||'XXX';
  if(_nextSeqBase[bc]===undefined)_nextSeqBase[bc]=1;
  const n=_nextSeqBase[bc]++;
  return`${bc}-${String(n).padStart(2,'0')}`;
}

async function commitGroup(levelKey,groupIdx){
  const result=_allResults[levelKey];if(!result)return null;
  const g=result.groups[groupIdx];if(!g)return null;
  const meta=LEVEL_MAP[levelKey]||{};
  const branch=activeLoc==='all'?(normB(g.students[0]?.branch)||'FUNCHAL'):activeLoc;
  const seqNum=generateTurmaCodeSync(branch);
  const codeA=`${seqNum}A`,codeB=`${seqNum}B`,groupCode=`${seqNum}`;
  const ar=(_auditResults[levelKey]||{})[groupIdx]||{};
  const studentRefs=g.students.map(s=>s.ref);
  const dayIdx = g.dayIdx_A ?? g.dayIdx;
  const baseRow={
    group_code:groupCode,academic_year:AY,branch,
    lang:((g.students[0]||{}).lang||'EN').toUpperCase().slice(0,2),
    department:meta.dept||'adults',
    level_code:(levelKey.split('|')[1]||'').trim(),
    level_display:meta.label||'',
    start_time:g.startTime,end_time:g.endTime,duration_min:CLASS_DUR,
    student_refs:studentRefs,status:'confirmed',locked:true,
    assignment_source:'decision_panel',
    audit_log:ar.log||{},audited_at:new Date().toISOString(),
    pass_count:ar.passCount||g.students.length,warn_count:ar.warnCount||0,fail_count:ar.failCount||0,
  };
  // Each session is one row — single day
  const rowA={...baseRow,turma_code:codeA,day_of_week:g.dayL_A||g.dayL,hour:Math.floor(g.startMins/60)};
  const rows=[rowA];
  const r=await fetch(`${SB}/rest/v1/classes`,{method:'POST',headers:{...H,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(rows)});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  _retiredCodes.add(groupCode);_retiredCodes.add(codeA);
  if(!_groupCodes[levelKey])_groupCodes[levelKey]={};
  _groupCodes[levelKey][groupIdx]={turmaCode:groupCode,turmaCodeA:codeA,turmaCodeB:codeA,sentAt:new Date().toISOString(),status:ar.status||'pass',locked:true};
  const sealBase={group_code:groupCode,level_code:(levelKey.split('|')[1]||'').trim(),department:meta.dept||'adults',branch,start_time:g.startTime,end_time:g.endTime,student_refs:studentRefs,academic_year:AY};
  await fetch(`${SB}/rest/v1/certification_seals`,{method:'POST',headers:{...H,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify([
    {...sealBase,turma_code:codeA,day:g.dayL_A||g.dayL},
  ])});
  return groupCode;
}

/* ── LOCKS ────────────────────────────────────────────────── */
async function loadLocks(){
  _lockedRefs={}; _lockMeta={};
  try{
    const rows=await sbGet('classes',`select=turma_code,group_code,level_code,department,student_refs,locked,assignment_source,override_tier,override_by,override_reason&academic_year=eq.${AY}&locked=eq.true`);
    rows.forEach(c=>{
      const key=`${(c.department||c.family||'').toLowerCase()}|${(c.level_code||'').trim()}`;
      const refs=Array.isArray(c.student_refs)?c.student_refs:[];
      if(!_lockedRefs[key])_lockedRefs[key]=new Set();
      refs.forEach(r=>{
        _lockedRefs[key].add(r);
        _lockMeta[r]={turma_code:c.turma_code,group_code:c.group_code,source:c.assignment_source||'engine',tier:c.override_tier||null,by:c.override_by||null,reason:c.override_reason||null};
      });
    });
  }catch(e){ console.warn('loadLocks failed',e); }
}

async function reconstructLockedGroups(){
  let rows;
  try{
    rows=await sbGet('classes',`select=turma_code,group_code,level_code,department,day_of_week,start_time,end_time,student_refs,locked,assignment_source&academic_year=eq.${AY}&locked=eq.true`);
  }catch(e){ console.warn('reconstructLockedGroups fetch failed',e); return; }
  if(!rows?.length) return;

  // Each row is now an independent session
  rows.forEach(c=>{
    const levelKey=`${(c.department||'').toLowerCase()}|${(c.level_code||'').trim()}`;
    const refs=Array.isArray(c.student_refs)?c.student_refs:[];
    const students=refs.map(r=>allE.find(e=>e.ref===r)).filter(Boolean);
    if(!students.length) return;
    const dayRaw=(c.day_of_week||'').toUpperCase().trim();
    const dayIdx=DAYS_PT.indexOf(dayRaw); if(dayIdx<0) return;
    const startMins=timeToMins(c.start_time)??8*60;
    const pairDef=ALM_PAIRS.find(p=>p.a===dayIdx)||null;
    const lockedGroup={
      pairDef,
      dayIdx_A:dayIdx, dayIdx_B:dayIdx,
      dayL_A:DAYS_PT[dayIdx], dayL_B:DAYS_PT[dayIdx],
      dayIdx, dayL:DAYS_PT[dayIdx],
      startMins, startTime:minsToT(startMins), endTime:minsToT(startMins+CLASS_DUR),
      students, _locked:true, _lockSource:c.assignment_source||'staff_move',
      _sessionKey:`${dayIdx}|${startMins}`,
    };
    if(!_allResults[levelKey]){
      _allResults[levelKey]={groups:[],sinalizados:[],total:students.length,withRequest:students.length,placed:students.length};
    }
    const idx=_allResults[levelKey].groups.length;
    _allResults[levelKey].groups.push(lockedGroup);
    if(!_groupCodes[levelKey])_groupCodes[levelKey]={};
    const tc=c.turma_code||c.group_code||`${BC[normB(students[0]?.branch)]||'X'}-??`;
    _groupCodes[levelKey][idx]={turmaCode:tc,turmaCodeA:tc,turmaCodeB:tc,sentAt:'',status:'pass',locked:true};
    if(!_auditResults[levelKey])_auditResults[levelKey]={};
    _auditResults[levelKey][idx]=auditGroupSync(lockedGroup);
  });
}

/* ── BOOT AUDIT ───────────────────────────────────────────── */
function setBootProgress(pct){const f=document.getElementById('boot-bar-fill');if(f)f.style.width=pct+'%';}
function setBoot(msg){const s=document.getElementById('boot-sub');if(s)s.textContent=msg;}

async function runBootAudit(){
  const levelKeys=Object.keys(LEVEL_MAP);
  const total=levelKeys.length; let done=0;

  await loadNextSeqBase();
  _proposalCache={};
  await loadProposed();

  setBoot('A agrupar e auditar todos os níveis…');

  for(const key of levelKeys){
    const allGroups=[], allSinal=[];
    let totalPlaced=0, totalWithReq=0, totalAll=0;

    for(const branch of BRANCH_ORDER){
      const result=buildProposals(key, branch);
      if(!result.groups.length && !result.sinalizados.length) continue;
      const offset=allGroups.length;
      allGroups.push(...result.groups);
      allSinal.push(...result.sinalizados);
      totalPlaced   += result.placed;
      totalWithReq  += result.withRequest;
      totalAll      += result.total;
      if(!_auditResults[key]) _auditResults[key]={};
      result.groups.forEach((g,i)=>{ _auditResults[key][offset+i]=auditGroupSync(g); });
    }

    if(allGroups.length||allSinal.length){
      _allResults[key]={groups:allGroups,sinalizados:allSinal,total:totalAll,withRequest:totalWithReq,placed:totalPlaced};
    }
    done++; setBootProgress(40+Math.round(done/total*40));
  }

  _proposalCache={};
  setBoot('A verificar turmas existentes…');

  try{
    const existing=await sbGet('classes',`select=turma_code,group_code,level_code,department,student_refs&academic_year=eq.${AY}`);
    if(!window._dbPlacedByLevel)window._dbPlacedByLevel={};
    existing.forEach(c=>{
      if(c.turma_code)_retiredCodes.add(c.turma_code);
      const key=`${(c.department||c.family||'').toLowerCase()}|${(c.level_code||'').trim()}`;
      const refs=Array.isArray(c.student_refs)?c.student_refs:[];
      if(!window._dbPlacedByLevel[key])window._dbPlacedByLevel[key]=new Set();
      refs.forEach(r=>window._dbPlacedByLevel[key].add(r));
    });
    existing.forEach(c=>{
      const gc=c.group_code||(c.turma_code?(c.turma_code.replace(/[AB]$/,'')):null);if(!gc)return;
      const key=`${(c.department||c.family||'').toLowerCase()}|${(c.level_code||'').trim()}`;
      const result=_allResults[key];if(!result)return;
      const dbRefs=new Set(Array.isArray(c.student_refs)?c.student_refs:[]);
      result.groups.forEach((g,i)=>{
        if((_groupCodes[key]||{})[i])return;
        const overlap=g.students.filter(s=>dbRefs.has(s.ref)).length;
        if(overlap>=Math.floor(g.students.length*0.7)){
          if(!_groupCodes[key])_groupCodes[key]={};
          const codeA=`${gc}A`;
          _groupCodes[key][i]={turmaCode:gc,turmaCodeA:codeA,turmaCodeB:codeA,sentAt:'',status:'pass'};
        }
      });
    });
  }catch(dbErr){console.warn('ALM: DB fetch failed',dbErr);}

  setBootProgress(85);
  await reconstructLockedGroups();

  _exceptionQueue=[];
  for(const key of Object.keys(_allResults)){
    const result=_allResults[key];
    result.groups.forEach((g,i)=>{
      const ar=(_auditResults[key]||{})[i];
      if(!ar||ar.status==='pass')return;
      if((_groupCodes[key]||{})[i])return;
      _exceptionQueue.push({levelKey:key,groupIdx:i,group:g,auditResult:ar});
    });
  }

  setBootProgress(100);

  (function reconcileDBvsEngine(){
    const warnings=[];
    Object.keys(window._dbPlacedByLevel||{}).forEach(key=>{
      const dbCount=(window._dbPlacedByLevel[key]?.size)||0;
      const engineCount=_allResults[key]?.placed||0;
      const diff=Math.abs(dbCount-engineCount);
      if(diff>2){const label=(LEVEL_MAP[key]||{}).label||key;warnings.push(`${label}: DB=${dbCount} / Engine=${engineCount}`);}
    });
    if(warnings.length){console.warn('⚠ ALM reconciliation divergence:\n'+warnings.join('\n'));showToast(`⚠ ${warnings.length} nível${warnings.length!==1?'is':''} com divergência DB/engine`,'warn');}
  })();

  return{committed:0,exceptions:_exceptionQueue.length};
}

/* ── DATA REFRESH ─────────────────────────────────────────── */
async function refreshData(){
  try{
    const [enrol,reqs]=await Promise.all([
      sbGet('enrolments',`select=ref,name,branch,lang,family,level_code,level_cefr&academic_year=eq.${AY}&order=ref`),
      sbGet('timetable_requests',`select=ref,branch,family,level_code,level_cefr,slots,day_preferences,status&academic_year=eq.${AY}`),
    ]);
    setConn(true);
    allE=enrol||[];allR=reqs||[];rByRef={};
    allR.forEach(r=>{rByRef[r.ref]=r;});
    _proposalCache={};
    await loadProposed();
    document.getElementById('pill-total').textContent=`${allE.length} al`;
    for(const key of Object.keys(LEVEL_MAP)){
      const withReq=allE.filter(e=>lk(e)===key&&!!rByRef[e.ref]);
      if(withReq.length>=MIN_G){
        _allResults[key]=buildProposals(key,'all');
        _auditResults[key]={};
        _allResults[key].groups.forEach((g,i)=>{if(!(_groupCodes[key]||{})[i])_auditResults[key][i]=auditGroupSync(g);});
      } else {delete _allResults[key];}
    }
    await reconstructLockedGroups();
    updateSidebarKPIs();initBranchStrip();renderExcBar();renderTree();
    if(activeLevelKey){_lastResult=_allResults[activeLevelKey]||null;renderLevelContent();}
    document.getElementById('badge-audit').textContent=allE.filter(e=>!rByRef[e.ref]).length||'0';
    document.getElementById('badge-pending').textContent=allE.filter(e=>{const r=rByRef[e.ref];return r&&normS(r.status)==='pendente';}).length||'0';
  }catch(err){setConn(false);console.warn('refreshData error',err);}
}

/* ── UTILITIES ────────────────────────────────────────────── */
function levelAuditDot(key){
  const ar=_auditResults[key];if(!ar)return'pending';
  const vals=Object.values(ar);if(!vals.length)return'pending';
  if(vals.some(v=>v.status==='fail'))return'fail';
  if(vals.some(v=>v.status==='warn'))return'warn';
  return'pass';
}

function dlCSV(content,filename){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));
  a.download=filename.replace(/\s+/g,'_');
  a.click();
}

/* ── DOSSIER DATA ─────────────────────────────────────────── */
function parseSlotsForRuler(req){
  if(!req)return[];
  const raw=parseDayPrefs(req.slots||req.day_preferences);
  return raw.map(p=>parseSlot(p)).filter(Boolean).map(s=>({dayIdx:s.dayIdx,day:DAYS_PT[s.dayIdx]||'?',fromMins:s.fromMins,toMins:s.toMins,startLabel:minsToT(s.fromMins),endLabel:minsToT(s.toMins)}));
}

async function fetchDossierData(ref){
  return Promise.all([
    sbGet('enrolments',`ref=eq.${encodeURIComponent(ref)}&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_code,level_cefr,enrolment_date,academic_year,returning_student,guardian_name,guardian_phone,notes&limit=1`).catch(()=>[]),
    sbGet('timetable_requests',`ref=eq.${encodeURIComponent(ref)}&academic_year=eq.${AY}&select=ref,slots,day_preferences,sessions_per_week,status,created_at,notes&limit=1`).catch(()=>[]),
    sbGet('turma_students',`ref=eq.${encodeURIComponent(ref)}&select=ref,turma_code,academic_year,level_cefr,family,outcome,absences,grade_final,notes&order=academic_year.desc`).catch(()=>[]),
  ]);
}
async function dsSaveNote(ref){
  const txt=document.getElementById('ds-note')?.value?.trim();if(txt==null)return;
  const ok=await fetch(`${SB}/rest/v1/enrolments?ref=eq.${encodeURIComponent(ref)}`,{method:'PATCH',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({notes:txt})}).then(r=>r.ok).catch(()=>false);
  showToast(ok?'Nota guardada ✓':'Erro ao guardar',ok?'ok':'err');
}
async function dsClearNote(ref){
  if(!confirm('Limpar a nota?'))return;
  const ok=await fetch(`${SB}/rest/v1/enrolments?ref=eq.${encodeURIComponent(ref)}`,{method:'PATCH',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({notes:''})}).then(r=>r.ok).catch(()=>false);
  if(ok)document.getElementById('ds-note').value='';
  showToast(ok?'Nota removida':'Erro',ok?'ok':'err');
