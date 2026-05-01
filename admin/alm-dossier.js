(function(){

/* ══════════════════════════════════════════════════════
   ALM DOSSIER v6  —  real schema edition
   ──────────────────────────────────────────────────────
   Real tables used:
     enrolments          → student identity + contact + level
     timetable_requests  → day_preferences (string days), family
     turma_students      → historic class membership
     lesson_summaries    → attendance / lesson records
   
   Tables that don't exist (removed):
     student_requests    → was wrong name
     student_documents   → doesn't exist (upload removed for now)
     student_history     → doesn't exist (built from turma_students)

   day_preferences real shape:
     [{"day":"wednesday","session_start":"11:00",...}, ...]
   
   enrolments real columns used:
     ref, name, date_of_birth, age, gender, phone, email,
     branch, lang, family, level_cefr, level_raw,
     enrolment_date, academic_year, returning_student,
     payment_method, guardian_name, guardian_phone,
     notes, school, school_year, occupation,
     naturalidade, nif, postal_code, locality
══════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --bg:    #1C1C1E;
  --bg2:   #2C2C2E;
  --bg3:   #3A3A3C;
  --sep:   rgba(255,255,255,.10);
  --sep2:  rgba(255,255,255,.05);
  --label: rgba(255,255,255,.45);
  --text:  #FFFFFF;
  --sub:   #98989D;
  --tint:  #0A84FF;
  --red:   #FF453A;
  --green: #32D74B;
  --amber: #FF9F0A;
  --f: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }

.ds-overlay {
  display: none; position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,.4);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  align-items: flex-end; justify-content: center;
}
.ds-overlay.open { display: flex; }

.ds-sheet {
  width: min(540px, 100vw); max-height: 92dvh;
  background: var(--bg); border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
  animation: sheetUp .35s cubic-bezier(.32,.72,0,1);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.ds-sheet.ds-exit { animation: sheetDown .28s cubic-bezier(.32,.72,0,1) forwards; }
@keyframes sheetUp   { from { transform: translateY(100%) } to { transform: none } }
@keyframes sheetDown { to   { transform: translateY(100%) } }

.ds-banner {
  position: relative; flex-shrink: 0;
  padding: 14px 14px 12px;
  display: flex; align-items: flex-start; gap: 12px;
  min-height: 110px; overflow: hidden;
}
.ds-banner-bg { position: absolute; inset: 0; transition: background .3s; }
.ds-banner-noise {
  position: absolute; inset: 0; opacity: .04; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.ds-banner-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top, rgba(0,0,0,.28) 0%, transparent 60%);
}
.ds-handle {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  width: 36px; height: 5px; border-radius: 999px;
  background: rgba(255,255,255,.38); z-index: 10;
}
.ds-close {
  position: absolute; top: 14px; right: 16px; z-index: 10;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,.22); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.90); font-size: 13px; font-weight: 600;
  font-family: var(--f); backdrop-filter: blur(4px); transition: background .12s;
}
.ds-close:hover { background: rgba(255,255,255,.38); }
.ds-dept-badge {
  position: absolute; top: 10px; left: 14px; z-index: 10;
  font-family: var(--f); font-size: 9px; font-weight: 600;
  letter-spacing: .10em; text-transform: uppercase;
  color: rgba(255,255,255,.55);
}
.ds-avatar {
  position: relative; z-index: 5;
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; font-family: var(--f);
  flex-shrink: 0; overflow: hidden;
  border: 2px solid rgba(255,255,255,.45);
  box-shadow: 0 3px 12px rgba(0,0,0,.22); margin-top: 20px;
}
.ds-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ds-hinfo { position: relative; z-index: 5; flex: 1; min-width: 0; margin-top: 20px; }
.ds-name {
  font-family: var(--f); font-size: 16px; font-weight: 700; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(0,0,0,.18);
}
.ds-ref { font-family: var(--f); font-size: 11px; font-weight: 400; color: rgba(255,255,255,.58); margin-top: 1px; }
.ds-banner-acts { display: flex; gap: 0; margin-top: 7px; overflow-x: auto; scrollbar-width: none; }
.ds-banner-acts::-webkit-scrollbar { display: none; }
.ds-act {
  font-family: var(--f); font-size: 11px; font-weight: 500;
  color: rgba(255,255,255,.72); cursor: pointer;
  padding: 3px 10px 3px 0; white-space: nowrap; flex-shrink: 0;
  border: none; background: none; transition: color .12s;
}
.ds-act:hover { color: #fff; }
.ds-act + .ds-act { border-left: .5px solid rgba(255,255,255,.25); padding-left: 10px; }

.ds-tags {
  display: flex; align-items: center; gap: 0;
  padding: 6px 14px; border-bottom: .5px solid var(--sep);
  flex-shrink: 0; overflow-x: auto; scrollbar-width: none;
  flex-wrap: nowrap;
}
.ds-tags::-webkit-scrollbar { display: none; }
.ds-ci {
  font-family: var(--f); font-size: 11px; font-weight: 400;
  color: var(--sub); white-space: nowrap; flex-shrink: 0;
  text-decoration: none;
}
.ds-ci-link { color: var(--tint); }
.ds-ci-link:hover { opacity: .78; }
.ds-ci-sep {
  font-size: 10px; color: var(--sep); padding: 0 7px; flex-shrink: 0;
}

/* Avail mini-grid */
.ds-avail { padding: 12px 20px; border-bottom: .5px solid var(--sep); flex-shrink: 0; }
.ds-avail-label {
  font-family: var(--f); font-size: 11px; font-weight: 500;
  color: var(--label); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px;
}
.ds-avail-grid {
  display: grid;
  grid-template-columns: 32px repeat(4,1fr) 6px repeat(7,1fr);
  gap: 2px;
}
.ds-ag-h { height:12px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:7px;color:var(--label); }
.ds-ag-day { height:12px;display:flex;align-items:center;font-family:monospace;font-size:7px;font-weight:700;color:var(--label); }
.ds-ag-cell { height:12px;border-radius:2px;background:#48484A; }
.ds-ag-cell.req  { background:#FF9F0A; }
.ds-ag-cell.conf { background:#32D74B; }
.ds-avail-leg { display:flex;gap:14px;margin-top:6px; }
.ds-leg-item { display:flex;align-items:center;gap:5px;font-family:var(--f);font-size:11px;color:var(--label); }
.ds-leg-dot { width:8px;height:8px;border-radius:2px; }

.ds-body {
  flex: 1; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--sep) transparent;
}
.ds-body::-webkit-scrollbar { width: 3px; }
.ds-body::-webkit-scrollbar-thumb { background: var(--sep); border-radius: 99px; }

.ds-section { border-bottom: .5px solid var(--sep); }
.ds-section-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 12px; cursor: pointer;
}
.ds-section-title { font-family: var(--f); font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; }
.ds-section-icon { font-size: 15px; }
.ds-section-meta { font-family: var(--f); font-size: 12px; color: var(--sub); }
.ds-section-chv { font-size: 12px; color: var(--label); transition: transform .2s; margin-left: 6px; }
.ds-section-hdr.open .ds-section-chv { transform: rotate(90deg); }
.ds-section-body { display: none; padding: 0 20px 14px; }
.ds-section-hdr.open + .ds-section-body { display: block; }

.ds-row { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:.5px solid var(--sep2); }
.ds-row:last-child { border-bottom: none; }
.ds-rk { font-family:var(--f);font-size:13px;color:var(--sub);flex-shrink:0;min-width:110px; }
.ds-rv { font-family:var(--f);font-size:13px;color:var(--text);text-align:right;flex:1; }
.ds-rv.tint  { color:var(--tint); }
.ds-rv.green { color:var(--green); }
.ds-rv.amber { color:var(--amber); }
.ds-rv.red   { color:var(--red); }

.ds-slots { display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end; }
.ds-slot { font-family:var(--f);font-size:12px;color:var(--tint);background:rgba(0,122,255,.07);padding:3px 8px;border-radius:6px; }

/* History */
.ds-yr { border-radius:10px;background:var(--bg2);margin-bottom:8px;overflow:hidden; }
.ds-yr-hdr { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer; }
.ds-yr-left { display:flex;align-items:center;gap:10px; }
.ds-yr-year { font-family:var(--f);font-size:13px;font-weight:600;color:var(--text); }
.ds-yr-turma { font-family:var(--f);font-size:12px;color:var(--sub); }
.ds-yr-outcome { font-family:var(--f);font-size:12px;font-weight:500; }
.ds-yr-outcome.ok   { color:var(--green); }
.ds-yr-outcome.warn { color:var(--red); }
.ds-yr-outcome.na   { color:var(--sub); }
.ds-yr-body { display:none;padding:0 14px 12px;border-top:.5px solid var(--sep); }
.ds-yr-hdr.open + .ds-yr-body { display:block; }

/* Attendance bar */
.ds-att-bar { height:4px;border-radius:2px;background:var(--bg3);margin-top:6px;overflow:hidden; }
.ds-att-fill { height:100%;border-radius:2px;transition:width .3s; }

/* Notes */
.ds-flags { display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px; }
.ds-flag {
  font-family:var(--f);font-size:12px;font-weight:500;color:var(--sub);
  padding:6px 12px;border-radius:8px;background:var(--bg2);
  border:.5px solid var(--sep);cursor:pointer;transition:all .12s;
}
.ds-flag.on { color:#FF453A;background:rgba(255,69,58,.15);border-color:rgba(255,69,58,.3); }
.ds-note {
  width:100%;padding:10px 12px;border-radius:10px;background:var(--bg2);
  border:none;font-family:var(--f);font-size:13px;color:var(--text);
  outline:none;resize:none;min-height:72px;line-height:1.55;
}
.ds-note::placeholder { color:var(--label); }
.ds-btn-row { display:flex;gap:8px;margin-top:12px;flex-wrap:wrap; }
.ds-btn { font-family:var(--f);font-size:13px;font-weight:600;padding:9px 18px;border-radius:10px;border:none;cursor:pointer; }
.ds-btn.primary { background:var(--tint);color:#fff; }
.ds-btn.ghost   { background:var(--bg2);color:var(--text); }
.ds-btn.danger  { background:rgba(255,59,48,.10);color:var(--red); }

/* Move */
.ds-select {
  width:100%;padding:10px 12px;border-radius:10px;background:var(--bg2);
  border:none;font-family:var(--f);font-size:13px;font-weight:500;color:var(--text);
  outline:none;margin-bottom:10px;cursor:pointer;appearance:none;-webkit-appearance:none;
}
.ds-select:focus { background:var(--bg3); }

.ds-empty { padding:16px 0;font-family:var(--f);font-size:13px;color:var(--sub);text-align:center; }

.ds-toast {
  position:fixed;bottom:32px;left:50%;
  transform:translateX(-50%) translateY(8px);
  background:rgba(30,30,32,.90);color:#fff;
  font-family:var(--f);font-size:13px;font-weight:500;
  padding:9px 20px;border-radius:20px;
  opacity:0;transition:opacity .2s,transform .2s;
  pointer-events:none;z-index:3000;white-space:nowrap;
  backdrop-filter:blur(10px);
}
.ds-toast.show { opacity:1;transform:translateX(-50%) translateY(0); }
.ds-toast.ok   { color:#7FE4A0; }
.ds-toast.err  { color:#FF8080; }
.ds-toast.warn { color:#FFD060; }
`;

const HTML = `
<div class="ds-overlay" id="ds-overlay" onclick="if(event.target===this)closeDossier()">
  <div class="ds-sheet" id="ds-sheet">
    <div class="ds-banner" id="ds-banner">
      <div class="ds-banner-bg" id="ds-banner-bg"></div>
      <div class="ds-banner-noise"></div>
      <div class="ds-banner-scrim"></div>
      <div class="ds-handle"></div>
      <div class="ds-dept-badge" id="ds-dept-badge"></div>
      <button class="ds-close" onclick="closeDossier()">✕</button>
      <div class="ds-avatar" id="ds-avatar">?</div>
      <div class="ds-hinfo">
        <div class="ds-name" id="ds-name">—</div>
        <div class="ds-ref"  id="ds-ref">—</div>
        <div class="ds-banner-acts" id="ds-actions"></div>
      </div>
    </div>
    <div class="ds-tags" id="ds-tags"></div>
    <div class="ds-avail" id="ds-avail" style="display:none">
      <div class="ds-avail-label">Disponibilidade · Pedido</div>
      <div class="ds-avail-grid" id="ds-avail-grid"></div>
      <div class="ds-avail-leg">
        <div class="ds-leg-item"><div class="ds-leg-dot" style="background:#FF9F0A"></div>Pedido</div>
        <div class="ds-leg-item"><div class="ds-leg-dot" style="background:#32D74B"></div>Confirmado</div>
      </div>
    </div>
    <div class="ds-body" id="ds-body"></div>
  </div>
</div>
<div class="ds-toast" id="ds-toast"></div>
`;

/* ── Constants ── */
const FLAGS   = {EN:'🇬🇧',PT:'🇵🇹',FR:'🇫🇷',ES:'🇪🇸',DE:'🇩🇪'};
const DAYS    = ['SEG','TER','QUA','QUI','SEX','SÁB'];
const HRS_MORN= [8,9,10,11];
const HRS_AFT = [14,15,16,17,18,19,20];

// Real day_preferences uses English day names (lowercase strings)
const DAY_EN_TO_PT = {
  monday:'SEG', tuesday:'TER', wednesday:'QUA',
  thursday:'QUI', friday:'SEX', saturday:'SÁB',
  // also handle trimmed variants
  mon:'SEG', tue:'TER', wed:'QUA', thu:'QUI', fri:'SEX', sat:'SÁB',
  // numeric fallback (legacy)
  1:'SEG', 2:'TER', 3:'QUA', 4:'QUI', 5:'SEX', 6:'SÁB',
};

const COURSE_GRAD = {
  kids:   'linear-gradient(145deg,#5AACAC,#2E7E7E)',
  adults: 'linear-gradient(145deg,#5A78E8,#3050C0)',
  exam:   'linear-gradient(145deg,#C8904A,#8A5A20)',
};
const COURSE_DEPT = { kids:'Juvenil', adults:'Geral', exam:'Exames' };
const COURSE_COL  = { kids:'green', adults:'', exam:'amber' };

/* ── State ── */
let DS_REF=null, DS_ROLE='staff';
let DS_ENROL=null, DS_REQ=null, DS_HIST=[];
let _toast_t=null, _ttLoaded=false;

/* ── Supabase ── */
function sbH(){
  const KEY=window.KEY||'';
  return {'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
}
function sbGet(table,q){
  const BASE=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  return fetch(`${BASE}/rest/v1/${table}?${q}`,{headers:sbH()})
    .then(r=>r.ok?r.json():[])
    .catch(()=>[]);
}
function sbPatch(table,q,body){
  const BASE=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  return fetch(`${BASE}/rest/v1/${table}?${q}`,{
    method:'PATCH', headers:sbH(), body:JSON.stringify(body)
  }).then(r=>r.ok?r.json():null).catch(()=>null);
}

/* ── Inject ── */
function inject(){
  if(document.getElementById('ds-overlay')) return;
  const s=document.createElement('style'); s.textContent=CSS;
  document.head.appendChild(s);
  const d=document.createElement('div'); d.innerHTML=HTML;
  while(d.firstElementChild) document.body.appendChild(d.firstElementChild);
}

/* ══════════════════════════════════════
   OPEN
══════════════════════════════════════ */
window.openDossier = async function(ref, role){
  inject();
  DS_REF=ref; DS_ROLE=role||'staff';
  DS_ENROL=null; DS_REQ=null; DS_HIST=[];
  _ttLoaded=false;

  document.getElementById('ds-overlay').classList.add('open');
  document.getElementById('ds-avail').style.display='none';
  renderSkeleton(ref);

  // ── Fetch from real tables ──
  const [enrols, reqs, hist] = await Promise.all([
    sbGet('enrolments',
      `ref=eq.${encodeURIComponent(ref)}&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_cefr,level_raw,enrolment_date,academic_year,returning_student,payment_method,guardian_name,guardian_phone,notes,school,school_year,occupation,naturalidade,nif,postal_code,locality&limit=1`),

    sbGet('timetable_requests',
      `ref=eq.${encodeURIComponent(ref)}&academic_year=eq.2026%2F2027&select=ref,student_name,branch,lang,family,level_cefr,day_preferences,sessions_per_week,status,created_at,mode_used,has_id_photo,has_school_timetable,notes&limit=1`),

    sbGet('turma_students',
      `ref=eq.${encodeURIComponent(ref)}&select=ref,turma_code,academic_year,level_cefr,family,outcome,absences,grade_final,notes&order=academic_year.desc`),
  ]);

  DS_ENROL = enrols?.[0] || null;
  DS_REQ   = reqs?.[0]   || null;
  DS_HIST  = hist || [];

  // ── Resolve turma from CELL_MAP (localStorage) ──
  let turmaCode=null, turmaDay=null, turmaH=null;
  const CM = window.CELL_MAP || {};
  Object.entries(CM).forEach(([key, cell]) => {
    if(cell.studentRefs?.includes(ref)){
      turmaCode = cell.turmaCode;
      const parts = key.split('_');
      turmaDay = parts[0];
      turmaH   = parseInt(parts[1] || 0);
    }
  });

  const course = inferCourse(DS_ENROL || DS_REQ);
  const cefr   = (DS_ENROL?.level_cefr || DS_REQ?.level_cefr || 'A1').toUpperCase();

  renderCover({ name: DS_ENROL?.name || ref, ref,
    lang: DS_ENROL?.lang || DS_REQ?.lang || 'EN',
    course, cefr,
    branch: DS_ENROL?.branch || DS_REQ?.branch || '—',
    turmaCode, turmaDay, turmaH,
  });

  renderAvailGrid(ref, course, turmaDay, turmaH);
  renderBody(turmaCode, turmaDay, turmaH, course);
};

/* ── Close ── */
window.closeDossier = function(){
  const s = document.getElementById('ds-sheet'); if(!s) return;
  s.classList.add('ds-exit');
  setTimeout(()=>{
    document.getElementById('ds-overlay')?.classList.remove('open');
    s.classList.remove('ds-exit');
  }, 280);
};

/* ── Skeleton while loading ── */
function renderSkeleton(ref){
  document.getElementById('ds-banner-bg').style.background = COURSE_GRAD.adults;
  document.getElementById('ds-dept-badge').textContent = '…';
  document.getElementById('ds-name').textContent = ref;
  document.getElementById('ds-ref').textContent = '…';
  document.getElementById('ds-tags').innerHTML = '';
  document.getElementById('ds-actions').innerHTML = '';
  document.getElementById('ds-body').innerHTML = `<div class="ds-empty" style="padding:40px 0">A carregar…</div>`;
  const av = document.getElementById('ds-avatar');
  const col = avCol(ref);
  av.style.cssText = `background:${col.bg};color:${col.text}`;
  av.textContent = ref.slice(-2);
}

/* ── Cover ── */
function renderCover(d){
  const course = d.course || 'adults';
  const lvl    = displayLevel(d.cefr, course);

  document.getElementById('ds-banner-bg').style.background = COURSE_GRAD[course] || COURSE_GRAD.adults;
  document.getElementById('ds-dept-badge').textContent = COURSE_DEPT[course] || 'Geral';

  const av = document.getElementById('ds-avatar');
  const col = avCol(d.name || d.ref || '?');
  av.style.cssText = `background:${col.bg};color:${col.text}`;
  av.textContent = (d.name || d.ref || '?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  document.getElementById('ds-name').textContent = d.name || d.ref || '—';
  document.getElementById('ds-ref').textContent  =
    `${d.ref} · ${lvl} · ${FLAGS[d.lang]||''}${d.lang}${d.turmaCode?' · '+d.turmaCode:''}`;

  // ── Contact strip ──
  const e   = DS_ENROL;
  const age = e?.age ? `${e.age} anos` : null;
  const sch = e?.school || null;
  const ph  = e?.phone  || null;
  const em  = e?.email  || null;

  const items = [];
  if(age) items.push(`<span class="ds-ci">${age}</span>`);
  if(sch) items.push(`<span class="ds-ci">${sch}</span>`);
  if(ph)  items.push(`<a class="ds-ci ds-ci-link" href="tel:${ph}">📞 ${ph}</a>`);
  if(em)  items.push(`<a class="ds-ci ds-ci-link" href="mailto:${em}">✉ ${em}</a>`);
  items.push(`<span class="ds-ci ds-ci-link" onclick="dsSendMsg()" style="cursor:pointer">Mensagem</span>`);

  document.getElementById('ds-tags').innerHTML = items.join(
    `<span class="ds-ci-sep">·</span>`);

  // ── Quick-action links (non-contact) ──
  const acts = [
    {lbl:'Matrícula', fn:`dsScrollTo('ds-s-inscricao')`},
    {lbl:'Pedido',    fn:`dsScrollTo('ds-s-pedido')`},
    {lbl:'Historial', fn:`dsScrollTo('ds-s-hist')`},
    {lbl:'Mover',     fn:`dsScrollTo('ds-s-mover')`},
    {lbl:'Notas',     fn:`dsScrollTo('ds-s-notas')`},
  ];
  document.getElementById('ds-actions').innerHTML = acts.map(a=>
    `<span class="ds-act" onclick="${a.fn}">${a.lbl}</span>`).join('');
}

/* ── Availability mini-grid ── */
function renderAvailGrid(ref, course, confDay, confH){
  const prefs = parsePrefs(DS_REQ);
  if(!prefs.length && !confDay){
    document.getElementById('ds-avail').style.display = 'none';
    return;
  }
  document.getElementById('ds-avail').style.display = 'block';
  const grid = document.getElementById('ds-avail-grid');

  let html = `<div></div>`; // corner
  HRS_MORN.forEach(h => html += `<div class="ds-ag-h">${h}</div>`);
  html += `<div></div>`; // break
  HRS_AFT.forEach(h => html += `<div class="ds-ag-h">${h}</div>`);

  DAYS.forEach(day => {
    html += `<div class="ds-ag-day">${day}</div>`;
    HRS_MORN.forEach(h => {
      const isConf = confDay===day && confH===h;
      const isReq  = prefs.some(p => p.day===day && p.h===h);
      html += `<div class="ds-ag-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
    html += `<div></div>`;
    HRS_AFT.forEach(h => {
      const isConf = confDay===day && confH===h;
      const isReq  = prefs.some(p => p.day===day && p.h===h);
      html += `<div class="ds-ag-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
  });
  grid.innerHTML = html;
}

/* ── Body ── */
function renderBody(turmaCode, turmaDay, turmaH, course){
  const body = document.getElementById('ds-body');
  body.innerHTML = [
    sec('ds-s-inscricao', '📋','Inscrição',
      DS_ENROL ? DS_ENROL.academic_year || 'Carregado' : '—',
      buildEnrol()),
    sec('ds-s-pedido',    '📝','Pedido de Horário',
      DS_REQ ? (DS_REQ.status || 'Submetido') : 'Sem pedido',
      buildRequest()),
    sec('ds-s-hist',      '🎓','Historial',
      DS_HIST.length ? `${DS_HIST.length} anos` : '—',
      buildHistorial()),
    sec('ds-s-horario',   '🗓','Horário · Disponibilidade',
      DS_REQ ? `${parsePrefs(DS_REQ).length} slots` : 'Sem pedido',
      `<div id="ds-tt-content"><div class="ds-empty">Clique para ver detalhe</div></div>`),
    sec('ds-s-mover',     '🔄','Mover Aluno',
      turmaCode || 'Sem turma',
      buildMove(turmaCode)),
    sec('ds-s-notas',     '🚩','Notas Internas',
      DS_ENROL?.notes ? 'Com nota' : '',
      buildNotes()),
  ].join('');

  body.querySelectorAll('.ds-section-hdr').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const wasOpen = hdr.classList.contains('open');
      hdr.classList.toggle('open');
      if(!wasOpen && hdr.closest('#ds-s-horario')) loadTimetable(turmaDay, turmaH);
    });
  });
}

/* ── Horário section (lazy) ── */
let _ttLoaded2 = false;
async function loadTimetable(confDay, confH){
  if(_ttLoaded2) return;
  _ttLoaded2 = true;
  const el = document.getElementById('ds-tt-content');
  if(el) el.innerHTML = buildRequestSlots(DS_REQ, confDay, confH);
}

/* ── Section builder ── */
function sec(id, icon, title, meta, content){
  return `<div class="ds-section" id="${id}">
    <div class="ds-section-hdr">
      <div class="ds-section-title">
        <span class="ds-section-icon">${icon}</span>${title}
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <span class="ds-section-meta">${meta}</span>
        <span class="ds-section-chv">›</span>
      </div>
    </div>
    <div class="ds-section-body">${content}</div>
  </div>`;
}

/* ── Content builders ── */
function buildRequestSlots(req, confDay, confH){
  if(!req) return `<div class="ds-empty">Nenhum pedido registado.</div>`;
  const prefs = parsePrefs(req);

  let html = '';
  if(confDay && confH !== null){
    html += row('Confirmado', `${confDay} · ${confH}:00`, 'green');
  }

  if(prefs.length){
    prefs.forEach((p, i) => {
      const label = i===0 ? '1ª opção' : i===1 ? '2ª opção' : `Opção ${i+1}`;
      html += row(label, `${p.day} · ${p.start}`);
    });
  } else {
    html += row('Slots', 'Sem slots registados');
  }

  const dateStr = req.created_at
    ? new Date(req.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})
    : '—';

  html += [
    row('Sessões/sem', req.sessions_per_week || '—'),
    row('Modo', req.mode_used === 'avail' ? 'Disponibilidade' : 'Preferência'),
    row('Estado', req.status || '—', req.status === 'atribuido' ? 'green' : req.status === 'pendente' ? 'amber' : ''),
    row('Submetido', dateStr),
    req.has_id_photo         ? row('Foto ID',       'Enviada', 'green') : '',
    req.has_school_timetable ? row('Hor. Escolar',  'Enviado', 'green') : '',
    req.notes ? row('Nota', req.notes) : '',
  ].filter(Boolean).join('');

  return html;
}

function buildEnrol(){
  if(!DS_ENROL) return `<div class="ds-empty">Matrícula não encontrada.</div>`;
  const e = DS_ENROL;
  const course = inferCourse(e);
  const lvl    = displayLevel((e.level_cefr||'A1').toUpperCase(), course);
  const dept   = COURSE_DEPT[course] || 'Geral';
  const dob    = e.date_of_birth
    ? new Date(e.date_of_birth).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})
    : null;

  // ── Personal data first ──
  const personal = [
    row('Referência',    e.ref||'—', 'tint'),
    row('Nome completo', e.name||'—'),
    dob ? row('Data nasc.', `${dob}${e.age ? ' · '+e.age+' anos' : ''}`) : '',
    e.gender ? row('Género', e.gender==='M'?'Masculino':e.gender==='F'?'Feminino':e.gender) : '',
    e.email        ? row('Email',       e.email, 'tint') : '',
    e.phone        ? row('Telefone',    e.phone) : '',
    e.guardian_name  ? row('Encarregado', e.guardian_name) : '',
    e.guardian_phone ? row('Tel. EE',     e.guardian_phone) : '',
    e.locality     ? row('Localidade',    e.locality) : '',
    e.postal_code  ? row('Código postal', e.postal_code) : '',
    e.naturalidade ? row('Naturalidade',  e.naturalidade) : '',
    e.nif          ? row('NIF',           e.nif) : '',
    e.occupation   ? row('Profissão',     e.occupation) : '',
  ].filter(Boolean).join('');

  // ── Academic data second ──
  const academic = [
    row('Nível',         lvl),
    row('Departamento',  dept),
    row('Filial',        (e.branch||'—').replace(/_/g,' ')),
    row('Língua',        `${FLAGS[e.lang]||''} ${e.lang||'—'}`),
    e.academic_year    ? row('Ano lectivo',      e.academic_year) : '',
    e.enrolment_date   ? row('Data matrícula',   new Date(e.enrolment_date).toLocaleDateString('pt-PT')) : '',
    e.returning_student != null ? row('Tipo', e.returning_student ? 'Recorrente' : 'Novo') : '',
    e.payment_method   ? row('Pagamento',        e.payment_method) : '',
    e.school           ? row('Escola',           e.school) : '',
    e.school_year      ? row('Ano escolar',      e.school_year) : '',
    e.level_raw        ? row('Nível (original)', e.level_raw) : '',
  ].filter(Boolean).join('');

  return `
    <div style="font-family:var(--f);font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--label);padding:6px 0 4px">Dados pessoais</div>
    ${personal}
    <div style="font-family:var(--f);font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--label);padding:14px 0 4px">Dados académicos</div>
    ${academic}
  `;
}

function buildRequest(){
  if(!DS_REQ) return `<div class="ds-empty">Nenhum pedido submetido.</div>`;
  const r = DS_REQ;
  const prefs = parsePrefs(r);
  const slotHtml = prefs.length
    ? `<div class="ds-slots">${prefs.map(p=>`<span class="ds-slot">${p.day} ${p.start}</span>`).join('')}</div>`
    : '—';
  const dateStr = r.created_at
    ? new Date(r.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})
    : '—';
  return [
    `<div class="ds-row"><div class="ds-rk">Slots</div><div class="ds-rv">${slotHtml}</div></div>`,
    row('Sessões/sem', r.sessions_per_week || '—'),
    row('Modo', r.mode_used === 'avail' ? 'Disponibilidade' : 'Preferência'),
    row('Estado', r.status || '—', r.status==='atribuido'?'green':r.status==='pendente'?'amber':''),
    row('Submetido', dateStr),
    r.has_id_photo         ? row('Foto ID',      'Enviada','green') : '',
    r.has_school_timetable ? row('Hor. Escolar', 'Enviado','green') : '',
    r.notes ? row('Nota', r.notes) : '',
  ].filter(Boolean).join('');
}

function buildHistorial(){
  if(!DS_HIST.length) return `<div class="ds-empty">Sem historial registado.</div>`;

  return DS_HIST.map(yr => {
    const course  = inferCourse(yr);
    const lvl     = displayLevel((yr.level_cefr||'').toUpperCase(), course);
    const cls     = yr.outcome === 'aprovado' ? 'ok' : yr.outcome === 'reprovado' ? 'warn' : 'na';
    const lbl     = yr.outcome === 'aprovado' ? 'Aprovado' : yr.outcome === 'reprovado' ? 'Reprovado' : yr.outcome || 'Em curso';
    const att     = yr.absences != null ? Math.max(0, 100 - yr.absences * 5) : null;

    return `<div class="ds-yr">
      <div class="ds-yr-hdr" onclick="this.classList.toggle('open')">
        <div class="ds-yr-left">
          <span class="ds-yr-year">${yr.academic_year || '—'}</span>
          <span class="ds-yr-turma">${yr.turma_code||'—'} · ${lvl}</span>
        </div>
        <span class="ds-yr-outcome ${cls}">${lbl}</span>
      </div>
      <div class="ds-yr-body">
        ${yr.grade_final != null ? row('Nota final', yr.grade_final + '%') : ''}
        ${yr.absences != null ? row('Faltas', yr.absences) : ''}
        ${att != null ? `<div class="ds-att-bar"><div class="ds-att-fill" style="width:${att}%;background:${att>75?'#32D74B':att>50?'#FF9F0A':'#FF453A'}"></div></div>` : ''}
        ${yr.notes ? row('Notas', yr.notes) : ''}
      </div>
    </div>`;
  }).join('');
}

function buildMove(currentCode){
  const CM    = window.CELL_MAP || {};
  const codes = [...new Set(Object.values(CM).map(c=>c.turmaCode).filter(c=>c&&c!==currentCode))].sort();

  return `${row('Turma actual', currentCode||'Sem turma', currentCode?'tint':'')}
  <div style="margin-top:12px">
    <select class="ds-select" id="ds-move-sel">
      <option value="">Escolher turma destino</option>
      ${codes.map(c=>{
        const cell = Object.values(CM).find(x=>x.turmaCode===c);
        const meta = cell ? ` · ${cell.day||''} ${cell.h||''}h · ${cell.n||'?'} al` : '';
        return `<option value="${c}">${c}${meta}</option>`;
      }).join('')}
    </select>
    <div class="ds-btn-row">
      <button class="ds-btn primary" onclick="dsMoveStudent()">Mover</button>
      ${currentCode ? `<button class="ds-btn danger" onclick="dsRemove('${currentCode}')">Remover da turma</button>` : ''}
    </div>
  </div>`;
}

function buildNotes(){
  const existing = DS_ENROL?.notes || '';
  return `<div class="ds-flags" id="ds-flags">
    <button class="ds-flag" data-flag="comportamento"    onclick="dsToggleFlag(this)">⚠ Comportamento</button>
    <button class="ds-flag" data-flag="pagamento"        onclick="dsToggleFlag(this)">💳 Pagamento</button>
    <button class="ds-flag" data-flag="desempenho"       onclick="dsToggleFlag(this)">📉 Desempenho</button>
    <button class="ds-flag" data-flag="faltas"           onclick="dsToggleFlag(this)">📅 Faltas</button>
    <button class="ds-flag" data-flag="necessidade_esp"  onclick="dsToggleFlag(this)">♿ Nec. especial</button>
  </div>
  <textarea class="ds-note" id="ds-note" placeholder="Nota visível para toda a equipa…">${existing}</textarea>
  <div class="ds-btn-row">
    <button class="ds-btn primary" onclick="dsSaveNote()">Guardar nota</button>
    ${existing ? `<button class="ds-btn ghost" onclick="dsClearNote()">Limpar</button>` : ''}
  </div>`;
}

/* ══════════════════════════════════════
   ACTIONS
══════════════════════════════════════ */
window.dsScrollTo = function(id){
  const el = document.getElementById(id); if(!el) return;
  el.querySelector('.ds-section-hdr')?.classList.add('open');
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
};

window.dsSendMsg = function(){
  const email = DS_ENROL?.email;
  const phone  = DS_ENROL?.phone;
  if(email)      window.open(`mailto:${email}`, '_blank');
  else if(phone) window.open(`tel:${phone}`, '_blank');
  else dsToast('Sem contacto registado', 'warn');
};

window.dsToggleFlag = function(btn){
  btn.classList.toggle('on');
};

window.dsSaveNote = async function(){
  const txt = document.getElementById('ds-note')?.value?.trim();
  if(txt == null){ dsToast('Erro ao ler nota','err'); return; }
  const ok = await sbPatch('enrolments', `ref=eq.${encodeURIComponent(DS_REF)}`, { notes: txt });
  if(ok !== null){
    if(DS_ENROL) DS_ENROL.notes = txt;
    dsToast('Nota guardada ✓', 'ok');
  } else {
    dsToast('Erro ao guardar','err');
  }
};

window.dsClearNote = async function(){
  if(!confirm('Limpar a nota?')) return;
  const ok = await sbPatch('enrolments', `ref=eq.${encodeURIComponent(DS_REF)}`, { notes: '' });
  if(ok !== null){
    document.getElementById('ds-note').value = '';
    if(DS_ENROL) DS_ENROL.notes = '';
    dsToast('Nota removida', 'ok');
  } else {
    dsToast('Erro ao remover', 'err');
  }
};

window.dsMoveStudent = function(){
  const code = document.getElementById('ds-move-sel')?.value;
  if(!code){ dsToast('Escolha uma turma destino','warn'); return; }
  const CM = window.CELL_MAP || {};

  // Remove from current turma
  Object.entries(CM).forEach(([key, cell]) => {
    if(cell.studentRefs?.includes(DS_REF)){
      cell.studentRefs = cell.studentRefs.filter(r=>r!==DS_REF);
      cell.n = cell.studentRefs.length;
    }
  });

  // Add to destination
  const destKey = Object.keys(CM).find(k => CM[k].turmaCode === code);
  if(destKey){
    if(!CM[destKey].studentRefs) CM[destKey].studentRefs = [];
    if(!CM[destKey].studentRefs.includes(DS_REF)){
      CM[destKey].studentRefs.push(DS_REF);
      CM[destKey].n = CM[destKey].studentRefs.length;
    }
  }

  // Persist to localStorage
  try{ localStorage.setItem('alm-cells-2627', JSON.stringify(CM)); }catch(e){}

  // Notify parent page to re-render
  if(window.renderAll) window.renderAll();
  dsToast(`Movido para ${code} ✓`, 'ok');
  setTimeout(()=>openDossier(DS_REF, DS_ROLE), 600);
};

window.dsRemove = function(code){
  if(!confirm(`Remover ${DS_REF} de ${code}?`)) return;
  const CM = window.CELL_MAP || {};
  Object.entries(CM).forEach(([key, cell]) => {
    if(cell.turmaCode === code && cell.studentRefs?.includes(DS_REF)){
      cell.studentRefs = cell.studentRefs.filter(r=>r!==DS_REF);
      cell.n = cell.studentRefs.length;
    }
  });
  try{ localStorage.setItem('alm-cells-2627', JSON.stringify(CM)); }catch(e){}
  if(window.renderAll) window.renderAll();
  dsToast(`Removido de ${code}`, 'ok');
  setTimeout(()=>openDossier(DS_REF, DS_ROLE), 600);
};

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */

// Parse day_preferences — handles both real string days ("wednesday")
// and legacy numeric days (1-6)
function parsePrefs(req){
  if(!req?.day_preferences) return [];
  try{
    const dp = typeof req.day_preferences === 'string'
      ? JSON.parse(req.day_preferences)
      : req.day_preferences;
    if(!Array.isArray(dp)) return [];
    return dp.map(p => {
      const rawDay = (p.day || p.weekday || p.dia || '').toString().toLowerCase().trim();
      const day = DAY_EN_TO_PT[rawDay] || DAY_EN_TO_PT[parseInt(rawDay)] || null;
      const start = p.session_start || p.start_time || (p.hour ? `${p.hour}:00` : '—');
      const h = parseInt((start+'').split(':')[0]);
      return { day, start, h: isNaN(h) ? null : h };
    }).filter(p => p.day);
  }catch(e){ return []; }
}

function row(k, v, c){
  return `<div class="ds-row"><div class="ds-rk">${k}</div><div class="ds-rv ${c||''}">${v}</div></div>`;
}

function inferCourse(e){
  if(!e) return 'adults';
  const str = [e.family, e.course, e.department, e.level_cefr, e.notes]
    .filter(Boolean).join(' ').toLowerCase();
  if(/exam|exame/.test(str))              return 'exam';
  if(/kid|juven|junior|infant|prep|infantil/.test(str)) return 'kids';
  return 'adults';
}

function displayLevel(cefr, course){
  const map = {
    kids:   {A1:'PI-a1',A2:'PI-a2',B1:'Pj1',B2:'Pj2',C1:'Pj3'},
    adults: {A1:'1º Ano',A2:'2º Ano',B1:'3º Ano',B2:'4º Ano',C1:'5º Ano',C2:'6º Ano'},
    exam:   {B1:'4º Ano',B2:'6º Ano',C1:'7º Ano',C2:'8º Ano'},
  };
  return map[course]?.[cefr] || cefr || '—';
}

function avCol(name){
  let h=0; for(let i=0;i<(name||'?').length;i++) h=(h*31+(name||'?').charCodeAt(i))&0xffffffff;
  const p=[
    {bg:'#EAC8D8',text:'#7A1840'},{bg:'#C8D8EC',text:'#143870'},
    {bg:'#C8ECD8',text:'#145830'},{bg:'#DCC8EC',text:'#481890'},
    {bg:'#ECDCC8',text:'#784010'},{bg:'#C8ECE8',text:'#145850'},
    {bg:'#ECE8C8',text:'#706010'},{bg:'#F0C8C8',text:'#801818'},
  ];
  return p[Math.abs(h)%p.length];
}

function dsToast(msg, type=''){
  const t = document.getElementById('ds-toast'); if(!t) return;
  t.textContent = msg;
  t.className = 'ds-toast ' + type + ' show';
  clearTimeout(_toast_t);
  _toast_t = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ── Keyboard ── */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && document.getElementById('ds-overlay')?.classList.contains('open'))
    closeDossier();
});

/* ── Compat aliases ── */
window.nmScrollTo      = window.dsScrollTo;
window.nmToast         = dsToast;

console.log('[ALM Dossier v8 — contact strip] loaded ✓');
})();
