(function(){

/* ══════════════════════════════════════════════════════
   ALM DOSSIER v10  —  refined aesthetic
   Inspired by the compact, monospace-accented style of
   the turma modal: smaller labels, tighter rows,
   monospace refs, muted palette, no visual clutter.
══════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --bg:     #18181A;
  --bg2:    #232325;
  --bg3:    #2E2E30;
  --bg4:    #3A3A3C;
  --sep:    rgba(255,255,255,.08);
  --sep2:   rgba(255,255,255,.04);
  --label:  rgba(255,255,255,.35);
  --text:   #F2F2F7;
  --sub:    #8E8E93;
  --tint:   #3A8EFF;
  --red:    #FF4E4E;
  --green:  #30C060;
  --amber:  #F5A020;
  --f:      'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --mono:   'SF Mono', 'Fira Mono', 'Menlo', monospace;
}
*{box-sizing:border-box;margin:0;padding:0;}

.ds-overlay{
  display:none;position:fixed;inset:0;z-index:2000;
  background:rgba(0,0,0,.55);
  backdrop-filter:blur(24px) saturate(180%);
  -webkit-backdrop-filter:blur(24px) saturate(180%);
  align-items:flex-end;justify-content:center;
}
.ds-overlay.open{display:flex;}

.ds-sheet{
  width:min(520px,100vw);max-height:91dvh;
  background:var(--bg);
  border-radius:18px 18px 0 0;
  border-top:.5px solid rgba(255,255,255,.10);
  display:flex;flex-direction:column;overflow:hidden;
  animation:shUp .32s cubic-bezier(.32,.72,0,1);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
.ds-sheet.ds-exit{animation:shDn .25s cubic-bezier(.32,.72,0,1) forwards;}
@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes shDn{to{transform:translateY(100%)}}

/* ── Banner ── */
.ds-banner{
  position:relative;flex-shrink:0;
  padding:20px 16px 14px;
  display:flex;align-items:flex-start;gap:13px;
  min-height:80px;overflow:hidden;
}
.ds-banner-bg{position:absolute;inset:0;}
.ds-banner-scrim{
  position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to bottom,rgba(0,0,0,.22) 0%,rgba(0,0,0,.54) 100%);
}
.ds-handle{
  position:absolute;top:9px;left:50%;transform:translateX(-50%);
  width:34px;height:4px;border-radius:99px;
  background:rgba(255,255,255,.28);z-index:10;
}
.ds-close{
  position:absolute;top:13px;right:14px;z-index:10;
  width:26px;height:26px;border-radius:50%;
  background:rgba(0,0,0,.32);border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.80);font-size:12px;font-weight:600;
  font-family:var(--f);transition:background .12s;
}
.ds-close:hover{background:rgba(0,0,0,.55);}
.ds-dept{
  position:absolute;top:13px;left:16px;z-index:10;
  font-family:var(--mono);font-size:8px;font-weight:400;
  letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,255,255,.48);
}
.ds-avatar{
  position:relative;z-index:5;margin-top:16px;
  width:44px;height:44px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:600;font-family:var(--f);
  border:1.5px solid rgba(255,255,255,.30);
}
.ds-hinfo{position:relative;z-index:5;flex:1;min-width:0;margin-top:16px;}
.ds-name{
  font-family:var(--f);font-size:15px;font-weight:600;color:#fff;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  letter-spacing:-.01em;
}
.ds-ref{
  font-family:var(--mono);font-size:10px;color:rgba(255,255,255,.50);
  margin-top:2px;letter-spacing:.03em;
}

/* ── Contact strip ── */
.ds-strip{
  display:flex;align-items:center;gap:0;flex-shrink:0;
  padding:7px 16px;border-bottom:.5px solid var(--sep);
  overflow-x:auto;scrollbar-width:none;background:var(--bg2);
}
.ds-strip::-webkit-scrollbar{display:none;}
.ds-ci{
  font-family:var(--f);font-size:11px;color:var(--sub);
  white-space:nowrap;flex-shrink:0;text-decoration:none;
}
.ds-ci-link{color:var(--tint);}
.ds-ci-link:hover{opacity:.78;}
.ds-ci-sep{font-size:9px;color:var(--sep);padding:0 8px;flex-shrink:0;opacity:.6;}

/* ── Body ── */
.ds-body{
  flex:1;overflow-y:auto;
  scrollbar-width:thin;scrollbar-color:var(--bg3) transparent;
}
.ds-body::-webkit-scrollbar{width:3px;}
.ds-body::-webkit-scrollbar-thumb{background:var(--bg3);border-radius:99px;}

/* ── Section ── */
.ds-section{border-bottom:.5px solid var(--sep);}
.ds-section-hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:11px 16px 10px;cursor:pointer;
  transition:background .10s;
}
.ds-section-hdr:hover{background:var(--bg2);}
.ds-section-title{
  display:flex;align-items:center;gap:8px;
  font-family:var(--f);font-size:12px;font-weight:500;color:var(--text);
  letter-spacing:.01em;
}
.ds-section-icon{font-size:13px;opacity:.80;}
.ds-section-r{display:flex;align-items:center;gap:4px;}
.ds-section-meta{
  font-family:var(--mono);font-size:10px;color:var(--sub);letter-spacing:.02em;
}
.ds-section-chv{
  font-size:11px;color:var(--label);
  transition:transform .18s;margin-left:2px;
}
.ds-section-hdr.open .ds-section-chv{transform:rotate(90deg);}
.ds-section-body{display:none;padding:4px 16px 14px;}
.ds-section-hdr.open + .ds-section-body{display:block;}

/* ── Rows ── */
.ds-row{
  display:flex;align-items:baseline;justify-content:space-between;
  gap:12px;padding:5px 0;
  border-bottom:.5px solid var(--sep2);
}
.ds-row:last-child{border-bottom:none;}
.ds-rk{
  font-family:var(--mono);font-size:10px;color:var(--label);
  flex-shrink:0;min-width:100px;letter-spacing:.04em;text-transform:uppercase;
}
.ds-rv{
  font-family:var(--f);font-size:12px;color:var(--text);
  text-align:right;flex:1;
}
.ds-rv.tint {color:var(--tint);}
.ds-rv.green{color:var(--green);}
.ds-rv.amber{color:var(--amber);}
.ds-rv.red  {color:var(--red);}

/* ── Sub-header inside section ── */
.ds-sub-hdr{
  font-family:var(--mono);font-size:8.5px;letter-spacing:.10em;text-transform:uppercase;
  color:var(--label);padding:10px 0 5px;
}

/* ── Slots ── */
.ds-slots{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;}
.ds-slot{
  font-family:var(--mono);font-size:10px;color:var(--tint);
  background:rgba(58,142,255,.08);
  padding:2px 7px;border-radius:5px;letter-spacing:.02em;
}

/* ── Availability grid ── */
.ds-avail-label{
  font-family:var(--mono);font-size:8.5px;letter-spacing:.10em;
  text-transform:uppercase;color:var(--label);padding:10px 0 6px;
}
.ds-avail-grid{
  display:grid;
  grid-template-columns:28px repeat(4,1fr) 4px repeat(7,1fr);
  gap:2px;
}
.ds-ag-h{height:11px;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:7px;color:var(--label);}
.ds-ag-day{height:11px;display:flex;align-items:center;font-family:var(--mono);font-size:7px;font-weight:600;color:var(--label);}
.ds-ag-cell{height:11px;border-radius:2px;background:var(--bg3);}
.ds-ag-cell.req {background:var(--amber);}
.ds-ag-cell.conf{background:var(--green);}
.ds-avail-leg{display:flex;gap:12px;margin-top:6px;}
.ds-leg-item{display:flex;align-items:center;gap:5px;font-family:var(--f);font-size:10px;color:var(--sub);}
.ds-leg-dot{width:7px;height:7px;border-radius:2px;}

/* ── History ── */
.ds-yr{border-radius:8px;background:var(--bg2);margin-bottom:6px;overflow:hidden;}
.ds-yr-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;cursor:pointer;}
.ds-yr-left{display:flex;align-items:center;gap:9px;}
.ds-yr-year{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text);letter-spacing:.03em;}
.ds-yr-turma{font-family:var(--mono);font-size:10px;color:var(--sub);letter-spacing:.02em;}
.ds-yr-outcome{font-family:var(--f);font-size:11px;font-weight:500;}
.ds-yr-outcome.ok  {color:var(--green);}
.ds-yr-outcome.warn{color:var(--red);}
.ds-yr-outcome.na  {color:var(--sub);}
.ds-yr-body{display:none;padding:0 12px 10px;border-top:.5px solid var(--sep);}
.ds-yr-hdr.open + .ds-yr-body{display:block;}
.ds-att-bar{height:3px;border-radius:2px;background:var(--bg3);margin-top:6px;overflow:hidden;}
.ds-att-fill{height:100%;border-radius:2px;transition:width .3s;}

/* ── Notes ── */
.ds-flags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:9px;}
.ds-flag{
  font-family:var(--f);font-size:10px;font-weight:500;color:var(--sub);
  padding:4px 10px;border-radius:6px;background:var(--bg2);
  border:.5px solid var(--sep);cursor:pointer;transition:all .12s;
}
.ds-flag.on{color:var(--red);background:rgba(255,78,78,.12);border-color:rgba(255,78,78,.28);}
.ds-note{
  width:100%;padding:9px 11px;border-radius:8px;background:var(--bg2);
  border:.5px solid var(--sep);font-family:var(--f);font-size:12px;
  color:var(--text);outline:none;resize:none;min-height:64px;line-height:1.55;
}
.ds-note::placeholder{color:var(--label);}
.ds-note:focus{border-color:rgba(58,142,255,.35);background:var(--bg3);}
.ds-btn-row{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap;}
.ds-btn{
  font-family:var(--f);font-size:11px;font-weight:600;
  padding:7px 14px;border-radius:8px;border:none;cursor:pointer;
  transition:opacity .12s;
}
.ds-btn:hover{opacity:.85;}
.ds-btn.primary{background:var(--tint);color:#fff;}
.ds-btn.ghost  {background:var(--bg2);color:var(--text);border:.5px solid var(--sep);}
.ds-btn.danger {background:rgba(255,78,78,.10);color:var(--red);}

/* ── Status badge ── */
.ds-badge{
  display:inline-block;font-family:var(--mono);font-size:9px;
  font-weight:500;letter-spacing:.06em;text-transform:uppercase;
  padding:2px 7px;border-radius:4px;
}
.ds-badge.green{background:rgba(48,192,96,.12);color:var(--green);}
.ds-badge.amber{background:rgba(245,160,32,.12);color:var(--amber);}
.ds-badge.red  {background:rgba(255,78,78,.12);color:var(--red);}
.ds-badge.gray {background:var(--bg3);color:var(--sub);}

.ds-empty{padding:14px 0;font-family:var(--f);font-size:12px;color:var(--sub);text-align:center;}

/* ── Toast ── */
.ds-toast{
  position:fixed;bottom:28px;left:50%;
  transform:translateX(-50%) translateY(6px);
  background:rgba(28,28,30,.94);color:var(--text);
  font-family:var(--f);font-size:12px;font-weight:500;
  padding:8px 18px;border-radius:16px;
  opacity:0;transition:opacity .18s,transform .18s;
  pointer-events:none;z-index:3000;white-space:nowrap;
  backdrop-filter:blur(12px);border:.5px solid var(--sep);
}
.ds-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.ds-toast.ok  {color:var(--green);}
.ds-toast.err {color:var(--red);}
.ds-toast.warn{color:var(--amber);}
`;

const HTML = `
<div class="ds-overlay" id="ds-overlay" onclick="if(event.target===this)closeDossier()">
  <div class="ds-sheet" id="ds-sheet">
    <div class="ds-banner" id="ds-banner">
      <div class="ds-banner-bg" id="ds-banner-bg"></div>
      <div class="ds-banner-scrim"></div>
      <div class="ds-handle"></div>
      <div class="ds-dept" id="ds-dept"></div>
      <button class="ds-close" onclick="closeDossier()">✕</button>
      <div class="ds-avatar" id="ds-avatar"></div>
      <div class="ds-hinfo">
        <div class="ds-name" id="ds-name">—</div>
        <div class="ds-ref"  id="ds-ref">—</div>
      </div>
    </div>
    <div class="ds-strip" id="ds-strip"></div>
    <div class="ds-body"  id="ds-body"></div>
  </div>
</div>
<div class="ds-toast" id="ds-toast"></div>
`;

/* ── Constants ── */
const FLAGS    = {EN:'🇬🇧',PT:'🇵🇹',FR:'🇫🇷',ES:'🇪🇸',DE:'🇩🇪'};
const DAYS     = ['SEG','TER','QUA','QUI','SEX','SÁB'];
const HRS_MORN = [8,9,10,11];
const HRS_AFT  = [14,15,16,17,18,19,20];

const DAY_EN_TO_PT = {
  monday:'SEG',tuesday:'TER',wednesday:'QUA',
  thursday:'QUI',friday:'SEX',saturday:'SÁB',
  mon:'SEG',tue:'TER',wed:'QUA',thu:'QUI',fri:'SEX',sat:'SÁB',
  1:'SEG',2:'TER',3:'QUA',4:'QUI',5:'SEX',6:'SÁB',
};

const COURSE_GRAD = {
  kids:   'linear-gradient(160deg,#2D6A6A,#1A3F4A)',
  adults: 'linear-gradient(160deg,#243B8A,#131E55)',
  exam:   'linear-gradient(160deg,#6B430E,#3A200A)',
};
const COURSE_DEPT  = {kids:'JUVENIL',adults:'GERAL',exam:'EXAMES'};

/* ── State ── */
let DS_REF=null, DS_ROLE='staff';
let DS_ENROL=null, DS_REQ=null, DS_HIST=[];
let _toast_t=null, _ttLoaded=false;

/* ── Supabase ── */
function sbH(){
  const K=window.KEY||'';
  return{'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'};
}
function sbGet(t,q){
  const B=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  return fetch(`${B}/rest/v1/${t}?${q}`,{headers:sbH()})
    .then(r=>r.ok?r.json():[]).catch(()=>[]);
}
function sbPatch(t,q,body){
  const B=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  return fetch(`${B}/rest/v1/${t}?${q}`,{
    method:'PATCH',headers:sbH(),body:JSON.stringify(body)
  }).then(r=>r.ok?r.json():null).catch(()=>null);
}

/* ── Inject ── */
function inject(){
  if(document.getElementById('ds-overlay')) return;
  const s=document.createElement('style');s.textContent=CSS;
  document.head.appendChild(s);
  const d=document.createElement('div');d.innerHTML=HTML;
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
  renderSkeleton(ref);

  const [enrols,reqs,hist] = await Promise.all([
    sbGet('enrolments',
      `ref=eq.${encodeURIComponent(ref)}&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_cefr,level_raw,enrolment_date,academic_year,returning_student,payment_method,guardian_name,guardian_phone,notes,school,school_year,occupation,naturalidade,nif,postal_code,locality&limit=1`),
    sbGet('timetable_requests',
      `ref=eq.${encodeURIComponent(ref)}&academic_year=eq.2026%2F2027&select=ref,student_name,branch,lang,family,level_cefr,day_preferences,sessions_per_week,status,created_at,mode_used,has_id_photo,has_school_timetable,notes&limit=1`),
    sbGet('turma_students',
      `ref=eq.${encodeURIComponent(ref)}&select=ref,turma_code,academic_year,level_cefr,family,outcome,absences,grade_final,notes&order=academic_year.desc`),
  ]);

  DS_ENROL=enrols?.[0]||null;
  DS_REQ  =reqs?.[0]  ||null;
  DS_HIST =hist||[];

  let turmaCode=null, turmaDay=null, turmaH=null;
  const CM=window.CELL_MAP||{};
  Object.entries(CM).forEach(([key,cell])=>{
    if(cell.studentRefs?.includes(ref)){
      turmaCode=cell.turmaCode;
      const p=key.split('_');
      turmaDay=p[0]; turmaH=parseInt(p[1]||0);
    }
  });

  const course=inferCourse(DS_ENROL||DS_REQ);
  const cefr=(DS_ENROL?.level_cefr||DS_REQ?.level_cefr||'A1').toUpperCase();

  renderCover({name:DS_ENROL?.name||ref,ref,
    lang:DS_ENROL?.lang||DS_REQ?.lang||'EN',
    course,cefr,
    branch:DS_ENROL?.branch||DS_REQ?.branch||'—',
    turmaCode,turmaDay,turmaH});

  renderBody(turmaCode,turmaDay,turmaH,course);
};

window.closeDossier = function(){
  const s=document.getElementById('ds-sheet');if(!s)return;
  s.classList.add('ds-exit');
  setTimeout(()=>{
    document.getElementById('ds-overlay')?.classList.remove('open');
    s.classList.remove('ds-exit');
  },250);
};

/* ── Skeleton ── */
function renderSkeleton(ref){
  document.getElementById('ds-banner-bg').style.background=COURSE_GRAD.adults;
  document.getElementById('ds-dept').textContent='…';
  document.getElementById('ds-name').textContent=ref;
  document.getElementById('ds-ref').textContent='carregando…';
  document.getElementById('ds-strip').innerHTML='';
  document.getElementById('ds-body').innerHTML=`<div class="ds-empty" style="padding:48px 0">a carregar…</div>`;
  const av=document.getElementById('ds-avatar');
  const col=avCol(ref);
  av.style.cssText=`background:${col.bg};color:${col.text}`;
  av.textContent=ref.slice(-2);
}

/* ── Cover ── */
function renderCover(d){
  const course=d.course||'adults';
  const lvl=displayLevel(d.cefr,course);

  document.getElementById('ds-banner-bg').style.background=COURSE_GRAD[course]||COURSE_GRAD.adults;
  document.getElementById('ds-dept').textContent=COURSE_DEPT[course]||'GERAL';

  const av=document.getElementById('ds-avatar');
  const col=avCol(d.name||d.ref||'?');
  av.style.cssText=`background:${col.bg};color:${col.text}`;
  av.textContent=(d.name||d.ref||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  document.getElementById('ds-name').textContent=d.name||d.ref||'—';
  document.getElementById('ds-ref').textContent=
    `${d.ref}  ·  ${lvl}  ·  ${FLAGS[d.lang]||''}${d.lang}${d.turmaCode?'  ·  '+d.turmaCode:''}`;

  const e=DS_ENROL;
  const items=[];
  if(e?.age)   items.push(`<span class="ds-ci">${e.age} anos</span>`);
  if(e?.school)items.push(`<span class="ds-ci">${e.school}</span>`);
  if(e?.phone) items.push(`<a class="ds-ci ds-ci-link" href="tel:${e.phone}">📞 ${e.phone}</a>`);
  if(e?.email) items.push(`<a class="ds-ci ds-ci-link" href="mailto:${e.email}">✉ ${e.email}</a>`);
  items.push(`<span class="ds-ci ds-ci-link" onclick="dsSendMsg()" style="cursor:pointer">Mensagem</span>`);
  document.getElementById('ds-strip').innerHTML=
    items.join(`<span class="ds-ci-sep">·</span>`);
}

/* ── Body ── */
function renderBody(turmaCode,turmaDay,turmaH,course){
  const body=document.getElementById('ds-body');
  body.innerHTML=[
    sec('ds-s-inscricao','📋','Inscrição',
      DS_ENROL?DS_ENROL.academic_year||'—':'—',
      buildEnrol()),
    sec('ds-s-hist','🎓','Historial',
      DS_HIST.length?`${DS_HIST.length} ano${DS_HIST.length>1?'s':''}` :'—',
      buildHistorial()),
    sec('ds-s-horario','🗓','Horário · Disponibilidade',
      DS_REQ?`${parsePrefs(DS_REQ).length} slots`:'—',
      `<div id="ds-tt-content"><div class="ds-empty">Clique para expandir</div></div>`),
    sec('ds-s-notas','🚩','Notas Internas',
      DS_ENROL?.notes?'com nota':'',
      buildNotes()),
  ].join('');

  body.querySelectorAll('.ds-section-hdr').forEach(hdr=>{
    hdr.addEventListener('click',()=>{
      const wasOpen=hdr.classList.contains('open');
      hdr.classList.toggle('open');
      if(!wasOpen&&hdr.closest('#ds-s-horario')) loadTimetable(turmaDay,turmaH);
    });
  });
}

/* ── Horário lazy load ── */
let _ttLoaded2=false;
async function loadTimetable(confDay,confH){
  if(_ttLoaded2)return;
  _ttLoaded2=true;
  const el=document.getElementById('ds-tt-content');
  if(!el)return;

  const prefs=parsePrefs(DS_REQ);
  let gridHtml='';
  if(prefs.length||confDay){
    gridHtml=`<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:.5px solid var(--sep2)">
      <div class="ds-avail-label">Disponibilidade · Pedido</div>
      <div class="ds-avail-grid" id="ds-avail-grid-inner"></div>
      <div class="ds-avail-leg">
        <div class="ds-leg-item"><div class="ds-leg-dot" style="background:var(--amber)"></div>Pedido</div>
        <div class="ds-leg-item"><div class="ds-leg-dot" style="background:var(--green)"></div>Confirmado</div>
      </div>
    </div>`;
  }

  el.innerHTML=gridHtml+buildRequestSlots(DS_REQ,confDay,confH);

  if(prefs.length||confDay){
    const grid=document.getElementById('ds-avail-grid-inner');
    if(grid){
      let h=`<div></div>`;
      HRS_MORN.forEach(hr=>h+=`<div class="ds-ag-h">${hr}</div>`);
      h+=`<div></div>`;
      HRS_AFT.forEach(hr=>h+=`<div class="ds-ag-h">${hr}</div>`);
      DAYS.forEach(day=>{
        h+=`<div class="ds-ag-day">${day}</div>`;
        HRS_MORN.forEach(hr=>{
          const iC=confDay===day&&confH===hr;
          const iR=prefs.some(p=>p.day===day&&p.h===hr);
          h+=`<div class="ds-ag-cell${iC?' conf':iR?' req':''}"></div>`;
        });
        h+=`<div></div>`;
        HRS_AFT.forEach(hr=>{
          const iC=confDay===day&&confH===hr;
          const iR=prefs.some(p=>p.day===day&&p.h===hr);
          h+=`<div class="ds-ag-cell${iC?' conf':iR?' req':''}"></div>`;
        });
      });
      grid.innerHTML=h;
    }
  }
}

/* ── Section helper ── */
function sec(id,icon,title,meta,content){
  return `<div class="ds-section" id="${id}">
    <div class="ds-section-hdr">
      <div class="ds-section-title">
        <span class="ds-section-icon">${icon}</span>${title}
      </div>
      <div class="ds-section-r">
        <span class="ds-section-meta">${meta}</span>
        <span class="ds-section-chv">›</span>
      </div>
    </div>
    <div class="ds-section-body">${content}</div>
  </div>`;
}

/* ── Content builders ── */
function buildRequestSlots(req,confDay,confH){
  if(!req)return`<div class="ds-empty">Nenhum pedido registado.</div>`;
  const prefs=parsePrefs(req);
  let html='';
  if(confDay&&confH!==null) html+=row('Confirmado',`${confDay} · ${confH}:00`,'green');
  if(prefs.length){
    const slotHtml=`<div class="ds-slots">${prefs.map(p=>`<span class="ds-slot">${p.day} ${p.start}</span>`).join('')}</div>`;
    html+=`<div class="ds-row"><div class="ds-rk">Slots</div><div class="ds-rv">${slotHtml}</div></div>`;
  }else{
    html+=row('Slots','Sem slots registados');
  }
  const dateStr=req.created_at
    ?new Date(req.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})
    :'—';
  const statusCls=req.status==='atribuido'?'green':req.status==='pendente'?'amber':'gray';
  html+=[
    row('Sessões/sem',req.sessions_per_week||'—'),
    row('Modo',req.mode_used==='avail'?'Disponibilidade':'Preferência'),
    `<div class="ds-row"><div class="ds-rk">Estado</div><div class="ds-rv"><span class="ds-badge ${statusCls}">${req.status||'—'}</span></div></div>`,
    row('Submetido',dateStr),
    req.has_id_photo         ?row('Foto ID','Enviada','green'):'',
    req.has_school_timetable ?row('Hor. Escolar','Enviado','green'):'',
    req.notes?row('Nota',req.notes):'',
  ].filter(Boolean).join('');
  return html;
}

function buildEnrol(){
  if(!DS_ENROL)return`<div class="ds-empty">Matrícula não encontrada.</div>`;
  const e=DS_ENROL;
  const course=inferCourse(e);
  const lvl=displayLevel((e.level_cefr||'A1').toUpperCase(),course);
  const dept=COURSE_DEPT[course]||'GERAL';
  const dob=e.date_of_birth
    ?new Date(e.date_of_birth).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})
    :null;

  const personal=[
    row('Ref',e.ref||'—','tint'),
    row('Nome',e.name||'—'),
    dob?row('Nasc.',`${dob}${e.age?' · '+e.age+' anos':''}`):'',
    e.gender?row('Género',e.gender==='M'?'Masculino':e.gender==='F'?'Feminino':e.gender):'',
    e.email    ?row('Email',e.email,'tint'):'',
    e.phone    ?row('Tel.',e.phone):'',
    e.guardian_name ?row('Encarregado',e.guardian_name):'',
    e.guardian_phone?row('Tel. EE',e.guardian_phone):'',
    e.locality  ?row('Localidade',e.locality):'',
    e.postal_code?row('Código postal',e.postal_code):'',
    e.naturalidade?row('Naturalidade',e.naturalidade):'',
    e.nif       ?row('NIF',e.nif):'',
    e.occupation?row('Profissão',e.occupation):'',
  ].filter(Boolean).join('');

  const academic=[
    row('Nível',lvl),
    row('Dept.',dept),
    row('Filial',(e.branch||'—').replace(/_/g,' ')),
    row('Língua',`${FLAGS[e.lang]||''} ${e.lang||'—'}`),
    e.academic_year  ?row('Ano lectivo',e.academic_year):'',
    e.enrolment_date ?row('Matrícula',new Date(e.enrolment_date).toLocaleDateString('pt-PT')):'',
    e.returning_student!=null?row('Tipo',e.returning_student?'Recorrente':'Novo'):'',
    e.payment_method ?row('Pagamento',e.payment_method):'',
    e.school         ?row('Escola',e.school):'',
    e.school_year    ?row('Ano escolar',e.school_year):'',
    e.level_raw      ?row('Nível orig.',e.level_raw):'',
  ].filter(Boolean).join('');

  return `<div class="ds-sub-hdr">Dados pessoais</div>${personal}
    <div class="ds-sub-hdr">Dados académicos</div>${academic}`;
}

function buildHistorial(){
  if(!DS_HIST.length)return`<div class="ds-empty">Sem historial registado.</div>`;
  return DS_HIST.map(yr=>{
    const course=inferCourse(yr);
    const lvl=displayLevel((yr.level_cefr||'').toUpperCase(),course);
    const cls=yr.outcome==='aprovado'?'ok':yr.outcome==='reprovado'?'warn':'na';
    const lbl=yr.outcome==='aprovado'?'Aprovado':yr.outcome==='reprovado'?'Reprovado':yr.outcome||'Em curso';
    const att=yr.absences!=null?Math.max(0,100-yr.absences*5):null;
    return `<div class="ds-yr">
      <div class="ds-yr-hdr" onclick="this.classList.toggle('open')">
        <div class="ds-yr-left">
          <span class="ds-yr-year">${yr.academic_year||'—'}</span>
          <span class="ds-yr-turma">${yr.turma_code||'—'} · ${lvl}</span>
        </div>
        <span class="ds-yr-outcome ${cls}">${lbl}</span>
      </div>
      <div class="ds-yr-body">
        ${yr.grade_final!=null?row('Nota final',yr.grade_final+'%'):''}
        ${yr.absences!=null?row('Faltas',yr.absences):''}
        ${att!=null?`<div class="ds-att-bar"><div class="ds-att-fill" style="width:${att}%;background:${att>75?'var(--green)':att>50?'var(--amber)':'var(--red)'}"></div></div>`:''}
        ${yr.notes?row('Notas',yr.notes):''}
      </div>
    </div>`;
  }).join('');
}

function buildNotes(){
  const existing=DS_ENROL?.notes||'';
  return `<div class="ds-flags" id="ds-flags">
    <button class="ds-flag" onclick="dsToggleFlag(this)">⚠ Comportamento</button>
    <button class="ds-flag" onclick="dsToggleFlag(this)">💳 Pagamento</button>
    <button class="ds-flag" onclick="dsToggleFlag(this)">📉 Desempenho</button>
    <button class="ds-flag" onclick="dsToggleFlag(this)">📅 Faltas</button>
    <button class="ds-flag" onclick="dsToggleFlag(this)">♿ Nec. especial</button>
  </div>
  <textarea class="ds-note" id="ds-note" placeholder="Nota visível para toda a equipa…">${existing}</textarea>
  <div class="ds-btn-row">
    <button class="ds-btn primary" onclick="dsSaveNote()">Guardar nota</button>
    ${existing?`<button class="ds-btn ghost" onclick="dsClearNote()">Limpar</button>`:''}
  </div>`;
}

/* ── Actions ── */
window.dsSendMsg=function(){
  const email=DS_ENROL?.email,phone=DS_ENROL?.phone;
  if(email)      window.open(`mailto:${email}`,'_blank');
  else if(phone) window.open(`tel:${phone}`,'_blank');
  else dsToast('Sem contacto registado','warn');
};
window.dsToggleFlag=function(btn){btn.classList.toggle('on');};
window.dsSaveNote=async function(){
  const txt=document.getElementById('ds-note')?.value?.trim();
  if(txt==null){dsToast('Erro','err');return;}
  const ok=await sbPatch('enrolments',`ref=eq.${encodeURIComponent(DS_REF)}`,{notes:txt});
  if(ok!==null){if(DS_ENROL)DS_ENROL.notes=txt;dsToast('Nota guardada ✓','ok');}
  else dsToast('Erro ao guardar','err');
};
window.dsClearNote=async function(){
  if(!confirm('Limpar a nota?'))return;
  const ok=await sbPatch('enrolments',`ref=eq.${encodeURIComponent(DS_REF)}`,{notes:''});
  if(ok!==null){
    document.getElementById('ds-note').value='';
    if(DS_ENROL)DS_ENROL.notes='';
    dsToast('Nota removida','ok');
  }else dsToast('Erro ao remover','err');
};

/* ── Helpers ── */
function parsePrefs(req){
  if(!req?.day_preferences)return[];
  try{
    const dp=typeof req.day_preferences==='string'
      ?JSON.parse(req.day_preferences):req.day_preferences;
    if(!Array.isArray(dp))return[];
    return dp.map(p=>{
      const rawDay=(p.day||p.weekday||p.dia||'').toString().toLowerCase().trim();
      const day=DAY_EN_TO_PT[rawDay]||DAY_EN_TO_PT[parseInt(rawDay)]||null;
      const start=p.session_start||p.start_time||(p.hour?`${p.hour}:00`:'—');
      const h=parseInt((start+'').split(':')[0]);
      return{day,start,h:isNaN(h)?null:h};
    }).filter(p=>p.day);
  }catch(e){return[];}
}

function row(k,v,c){
  return`<div class="ds-row"><div class="ds-rk">${k}</div><div class="ds-rv ${c||''}">${v}</div></div>`;
}

function inferCourse(e){
  if(!e)return'adults';
  const s=[e.family,e.course,e.department,e.level_cefr,e.notes].filter(Boolean).join(' ').toLowerCase();
  if(/exam|exame/.test(s))return'exam';
  if(/kid|juven|junior|infant|prep|infantil/.test(s))return'kids';
  return'adults';
}

function displayLevel(cefr,course){
  const map={
    kids:  {A1:'PI-a1',A2:'PI-a2',B1:'Pj1',B2:'Pj2',C1:'Pj3'},
    adults:{A1:'1º Ano',A2:'2º Ano',B1:'3º Ano',B2:'4º Ano',C1:'5º Ano',C2:'6º Ano'},
    exam:  {B1:'4º Ano',B2:'6º Ano',C1:'7º Ano',C2:'8º Ano'},
  };
  return map[course]?.[cefr]||cefr||'—';
}

function avCol(name){
  let h=0;for(let i=0;i<(name||'?').length;i++)h=(h*31+(name||'?').charCodeAt(i))&0xffffffff;
  const p=[
    {bg:'#3A2244',text:'#C8A0E0'},{bg:'#1E2E50',text:'#7AABEE'},
    {bg:'#1A3A2A',text:'#5EC888'},{bg:'#3A2A14',text:'#D4944A'},
    {bg:'#3A1A1A',text:'#E07878'},{bg:'#1A2A3A',text:'#5A9EC8'},
    {bg:'#282838',text:'#9898D8'},{bg:'#2A3820',text:'#80B850'},
  ];
  return p[Math.abs(h)%p.length];
}

function dsToast(msg,type=''){
  const t=document.getElementById('ds-toast');if(!t)return;
  t.textContent=msg;t.className='ds-toast '+type+' show';
  clearTimeout(_toast_t);
  _toast_t=setTimeout(()=>t.classList.remove('show'),2600);
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('ds-overlay')?.classList.contains('open'))
    closeDossier();
});

window.nmToast=dsToast;
console.log('[ALM Dossier v10 — refined] loaded ✓');
})();
