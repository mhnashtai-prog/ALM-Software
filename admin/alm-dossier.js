(function(){
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
  display: none;
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,.4);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
.ds-overlay.open { display: flex; }

.ds-sheet {
  width: min(540px, 100vw);
  max-height: 92dvh;
  background: var(--bg);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: sheetUp .35s cubic-bezier(.32,.72,0,1);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.ds-sheet.ds-exit {
  animation: sheetDown .28s cubic-bezier(.32,.72,0,1) forwards;
}
@keyframes sheetUp   { from { transform: translateY(100%) } to { transform: none } }
@keyframes sheetDown { to   { transform: translateY(100%) } }

/* ── BANNER HEADER ── */
.ds-banner {
  position: relative;
  flex-shrink: 0;
  padding: 22px 20px 18px;
  display: flex;
  align-items: flex-end;
  gap: 16px;
  min-height: 140px;
  overflow: hidden;
}
.ds-banner-bg {
  position: absolute; inset: 0;
  transition: background .3s;
}
.ds-banner-noise {
  position: absolute; inset: 0;
  opacity: .04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
}
.ds-banner-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.28) 0%, transparent 60%);
  pointer-events: none;
}
/* Grab handle sits on top of banner */
.ds-handle {
  position: absolute;
  top: 10px; left: 50%; transform: translateX(-50%);
  width: 36px; height: 5px;
  border-radius: 999px;
  background: rgba(255,255,255,.38);
  z-index: 10;
}
.ds-close {
  position: absolute;
  top: 14px; right: 16px;
  z-index: 10;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,.22);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.90);
  font-size: 13px; font-weight: 600;
  font-family: var(--f);
  backdrop-filter: blur(4px);
  transition: background .12s;
}
.ds-close:hover { background: rgba(255,255,255,.38); }
.ds-dept-badge {
  position: absolute;
  top: 14px; left: 16px;
  z-index: 10;
  font-family: var(--f);
  font-size: 10px; font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: rgba(255,255,255,.85);
  background: rgba(255,255,255,.18);
  padding: 4px 11px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.ds-avatar {
  position: relative; z-index: 5;
  width: 72px; height: 72px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700;
  font-family: var(--f);
  flex-shrink: 0;
  overflow: hidden;
  border: 3px solid rgba(255,255,255,.55);
  box-shadow: 0 4px 18px rgba(0,0,0,.22);
}
.ds-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ds-hinfo {
  position: relative; z-index: 5;
  flex: 1; min-width: 0;
  margin-bottom: 2px;
}
.ds-name {
  font-family: var(--f);
  font-size: 20px; font-weight: 700;
  color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-shadow: 0 1px 8px rgba(0,0,0,.18);
}
.ds-ref {
  font-family: var(--f);
  font-size: 12px; font-weight: 500;
  color: rgba(255,255,255,.68);
  margin-top: 2px;
  letter-spacing: .02em;
}

/* Tag row */
.ds-tags {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px;
  border-bottom: .5px solid var(--sep);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.ds-tags::-webkit-scrollbar { display: none; }
.ds-tag {
  font-family: var(--f);
  font-size: 12px; font-weight: 500;
  color: #6AB4FF;
  background: rgba(10,132,255,.18);
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.ds-tag.green { color: #32D74B; background: rgba(50,215,75,.15); }
.ds-tag.amber { color: #FF9F0A; background: rgba(255,159,10,.15); }
.ds-tag.red   { color: #FF453A; background: rgba(255,69,58,.15); }

/* Quick actions */
.ds-actions {
  display: flex;
  padding: 12px 20px;
  gap: 8px;
  border-bottom: .5px solid var(--sep);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.ds-actions::-webkit-scrollbar { display: none; }
.ds-act {
  display: flex; flex-direction: column;
  align-items: center; gap: 5px;
  flex-shrink: 0;
  cursor: pointer;
}
.ds-act-icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  background: var(--bg2);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  transition: background .12s;
}
.ds-act:hover .ds-act-icon { background: var(--bg3); }
.ds-act-lbl {
  font-family: var(--f);
  font-size: 10px; font-weight: 500;
  color: var(--sub);
  white-space: nowrap;
}

/* Availability mini */
.ds-avail {
  padding: 12px 20px;
  border-bottom: .5px solid var(--sep);
  flex-shrink: 0;
}
.ds-avail-label {
  font-family: var(--f);
  font-size: 11px; font-weight: 500;
  color: var(--label);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 8px;
}
.ds-avail-grid {
  display: grid;
  grid-template-columns: 32px repeat(11, 1fr) 6px repeat(7, 1fr);
  gap: 2px;
}
.ds-ag-corner { }
.ds-ag-h {
  height: 12px;
  display: flex; align-items: center; justify-content: center;
  font-family: monospace; font-size: 7px;
  color: var(--label);
}
.ds-ag-brk { }
.ds-ag-day {
  height: 12px;
  display: flex; align-items: center;
  font-family: monospace; font-size: 7px; font-weight: 700;
  color: var(--label);
}
.ds-ag-cell {
  height: 12px;
  border-radius: 2px;
  background: #48484A;
}
.ds-ag-cell.req  { background: #FF9F0A; }
.ds-ag-cell.conf { background: #32D74B; }
.ds-avail-leg {
  display: flex; gap: 14px; margin-top: 6px;
}
.ds-leg-item {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--f); font-size: 11px; color: var(--label);
}
.ds-leg-dot {
  width: 8px; height: 8px; border-radius: 2px;
}

/* Scrollable body */
.ds-body {
  flex: 1; overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sep) transparent;
}
.ds-body::-webkit-scrollbar { width: 3px; }
.ds-body::-webkit-scrollbar-thumb { background: var(--sep); border-radius: 99px; }

/* Section */
.ds-section {
  border-bottom: .5px solid var(--sep);
}
.ds-section-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 12px;
  cursor: pointer;
}
.ds-section-title {
  font-family: var(--f);
  font-size: 13px; font-weight: 600;
  color: var(--text);
  display: flex; align-items: center; gap: 8px;
}
.ds-section-icon { font-size: 15px; }
.ds-section-meta {
  font-family: var(--f);
  font-size: 12px; color: var(--sub);
}
.ds-section-chv {
  font-size: 12px; color: var(--label);
  transition: transform .2s;
  margin-left: 6px;
}
.ds-section-hdr.open .ds-section-chv { transform: rotate(90deg); }
.ds-section-body { display: none; padding: 0 20px 14px; }
.ds-section-hdr.open + .ds-section-body { display: block; }

/* Horizontal data rows — key left, value right */
.ds-row {
  display: flex; align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
  border-bottom: .5px solid var(--sep2);
}
.ds-row:last-child { border-bottom: none; }
.ds-rk {
  font-family: var(--f);
  font-size: 13px; color: var(--sub);
  flex-shrink: 0;
  min-width: 90px;
}
.ds-rv {
  font-family: var(--f);
  font-size: 13px; color: var(--text);
  text-align: right;
  flex: 1;
}
.ds-rv.tint   { color: var(--tint); }
.ds-rv.green  { color: var(--green); }
.ds-rv.amber  { color: var(--amber); }
.ds-rv.red    { color: var(--red); }

/* Slot list */
.ds-slots { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.ds-slot {
  font-family: var(--f);
  font-size: 12px; color: var(--tint);
  background: rgba(0,122,255,.07);
  padding: 3px 8px; border-radius: 6px;
}

/* Cambridge scores */
.ds-camb {
  display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;
}
.ds-camb-cell {
  flex: 1; min-width: 52px;
  text-align: center;
  padding: 8px 4px;
  border-radius: 10px;
  background: var(--bg2);
}
.ds-camb-score {
  font-family: var(--f); font-size: 18px; font-weight: 600;
  color: var(--text);
}
.ds-camb-lbl {
  font-family: var(--f); font-size: 9px; color: var(--sub);
  text-transform: uppercase; letter-spacing: .05em;
  margin-top: 2px;
}
.ds-camb-cell.pass .ds-camb-score { color: var(--green); }
.ds-camb-cell.fail .ds-camb-score { color: var(--red); }

/* Year history */
.ds-yr {
  border-radius: 10px;
  background: var(--bg2);
  margin-bottom: 8px;
  overflow: hidden;
}
.ds-yr-hdr {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
}
.ds-yr-left { display: flex; align-items: center; gap: 10px; }
.ds-yr-year {
  font-family: var(--f); font-size: 13px; font-weight: 600;
  color: var(--text);
}
.ds-yr-turma {
  font-family: var(--f); font-size: 12px; color: var(--sub);
}
.ds-yr-outcome {
  font-family: var(--f); font-size: 12px; font-weight: 500;
}
.ds-yr-outcome.ok   { color: var(--green); }
.ds-yr-outcome.warn { color: var(--red); }
.ds-yr-outcome.na   { color: var(--sub); }
.ds-yr-body { display: none; padding: 0 14px 12px; border-top: .5px solid var(--sep); }
.ds-yr-hdr.open + .ds-yr-body { display: block; }

/* Document list */
.ds-doc {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0;
  border-bottom: .5px solid var(--sep2);
}
.ds-doc:last-child { border-bottom: none; }
.ds-doc-icon { font-size: 22px; flex-shrink: 0; }
.ds-doc-info { flex: 1; min-width: 0; }
.ds-doc-name {
  font-family: var(--f); font-size: 13px; font-weight: 500;
  color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ds-doc-meta {
  font-family: var(--f); font-size: 11px; color: var(--sub);
  margin-top: 1px;
}
.ds-doc-btns { display: flex; gap: 6px; flex-shrink: 0; }
.ds-doc-btn {
  font-family: var(--f); font-size: 12px; font-weight: 500;
  color: var(--tint);
  background: none; border: none; cursor: pointer; padding: 0;
}
.ds-doc-btn.del { color: var(--red); }

/* Upload area */
.ds-upload {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--bg2);
  border: none; cursor: pointer;
  width: 100%; margin-top: 10px;
}
.ds-upload-lbl {
  font-family: var(--f); font-size: 13px;
  color: var(--tint);
}

/* Select */
.ds-select {
  width: 100%; padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg2);
  border: none;
  font-family: var(--f); font-size: 13px; font-weight: 500;
  color: var(--text);
  outline: none;
  margin-bottom: 10px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.ds-select:focus { background: var(--bg3); }

/* Flags */
.ds-flags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.ds-flag {
  font-family: var(--f); font-size: 12px; font-weight: 500;
  color: var(--sub);
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--bg2);
  border: .5px solid var(--sep);
  cursor: pointer;
}
.ds-flag.on { color: #FF453A; background: rgba(255,69,58,.15); border-color: rgba(255,69,58,.3); }

/* Note textarea */
.ds-note {
  width: 100%; padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg2);
  border: none;
  font-family: var(--f); font-size: 13px;
  color: var(--text);
  outline: none;
  resize: none;
  min-height: 72px;
  line-height: 1.55;
}
.ds-note::placeholder { color: var(--label); }

/* Buttons */
.ds-btn-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.ds-btn {
  font-family: var(--f); font-size: 13px; font-weight: 600;
  padding: 9px 18px; border-radius: 10px;
  border: none; cursor: pointer;
}
.ds-btn.primary { background: var(--tint); color: #fff; }
.ds-btn.ghost   { background: var(--bg2); color: var(--text); }
.ds-btn.danger  { background: rgba(255,59,48,.10); color: var(--red); }

/* Empty state */
.ds-empty {
  padding: 16px 0;
  font-family: var(--f); font-size: 13px;
  color: var(--sub); text-align: center;
}

/* Toast */
.ds-toast {
  position: fixed; bottom: 32px; left: 50%;
  transform: translateX(-50%) translateY(8px);
  background: rgba(30,30,32,.90);
  color: #fff;
  font-family: var(--f); font-size: 13px; font-weight: 500;
  padding: 9px 20px; border-radius: 20px;
  opacity: 0; transition: opacity .2s, transform .2s;
  pointer-events: none; z-index: 3000;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}
.ds-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.ds-toast.ok   { color: #7FE4A0; }
.ds-toast.err  { color: #FF8080; }
.ds-toast.warn { color: #FFD060; }

input.ds-file-inp { display: none; }
`;

const HTML = `
<div class="ds-overlay" id="ds-overlay" onclick="if(event.target===this)closeDossier()">
  <div class="ds-sheet" id="ds-sheet">

    <div class="ds-banner" id="ds-banner">
      <div class="ds-banner-bg"    id="ds-banner-bg"></div>
      <div class="ds-banner-noise"></div>
      <div class="ds-banner-scrim"></div>
      <div class="ds-handle"></div>
      <div class="ds-dept-badge"   id="ds-dept-badge"></div>
      <button class="ds-close" onclick="closeDossier()">✕</button>
      <div class="ds-avatar" id="ds-avatar">?</div>
      <div class="ds-hinfo">
        <div class="ds-name" id="ds-name">—</div>
        <div class="ds-ref"  id="ds-ref">—</div>
      </div>
    </div>

    <div class="ds-tags" id="ds-tags"></div>

    <div class="ds-actions" id="ds-actions"></div>

    <div class="ds-avail" id="ds-avail" style="display:none">
      <div class="ds-avail-label">Disponibilidade semanal</div>
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
<input type="file" id="ds-file-inp" class="ds-file-inp" accept=".pdf,image/*"/>
`;

/* ── Constants ── */
const DAYS     = ['SEG','TER','QUA','QUI','SEX','SÁB'];
const HRS_MORN = [8,9,10,11];
const HRS_AFT  = [14,15,16,17,18,19,20];
const ALL_HRS  = [...HRS_MORN,...HRS_AFT];
const FLAGS    = {EN:'🇬🇧',PT:'🇵🇹',FR:'🇫🇷',ES:'🇪🇸',DE:'🇩🇪'};
const DAY_NUM  = {1:'SEG',2:'TER',3:'QUA',4:'QUI',5:'SEX',6:'SÁB'};

const COURSE_CHIP = {
  kids:   {label:'Juvenil',   col:'green'},
  adults: {label:'Geral',     col:''},
  exam:   {label:'Exames',    col:'amber'},
};

/* ── State ── */
let DS_REF=null, DS_ROLE='staff';
let DS_ENROL=null, DS_REQ=null, DS_DOCS=[], DS_HIST=[];
let DS_UPLOAD_CTX=null;
let _toast_t=null;

/* ── Inject ── */
function inject(){
  if(document.getElementById('ds-overlay')) return;
  const s=document.createElement('style'); s.textContent=CSS;
  document.head.appendChild(s);
  const d=document.createElement('div'); d.innerHTML=HTML;
  while(d.firstElementChild) document.body.appendChild(d.firstElementChild);
  document.getElementById('ds-file-inp').addEventListener('change', onFile);
}

/* ── Open ── */
window.openDossier = async function(ref, role){
  inject();
  DS_REF=ref; DS_ROLE=role||'staff';
  DS_ENROL=null; DS_REQ=null; DS_DOCS=[]; DS_HIST=[];

  document.getElementById('ds-overlay').classList.add('open');
  renderCover({name:ref,ref,lang:'EN',course:'adults',cefr:'A1',branch:'—'});
  document.getElementById('ds-body').innerHTML='';

  const BASE=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  const KEY=window.KEY||'';
  const H={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
  const get=(t,q)=>fetch(`${BASE}/rest/v1/${t}?${q}`,{headers:H}).then(r=>r.json()).catch(()=>[]);

  const [enrols,reqs,docs,hist]=await Promise.all([
    get('enrolments',`ref=eq.${encodeURIComponent(ref)}&limit=1`),
    get('student_requests',`ref=eq.${encodeURIComponent(ref)}&academic_year=eq.2026%2F2027&limit=1`),
    get('student_documents',`ref=eq.${encodeURIComponent(ref)}&order=uploaded_at.desc`),
    get('student_history',`ref=eq.${encodeURIComponent(ref)}&order=academic_year.desc`),
  ]);

  DS_ENROL=enrols?.[0]||null;
  DS_REQ  =reqs?.[0]  ||null;
  DS_DOCS =docs||[];
  DS_HIST =hist||[];

  let turmaCode=null, turmaDay=null, turmaH=null;
  const CM=window.CELL_MAP||{};
  Object.entries(CM).forEach(([key,cell])=>{
    if(cell.studentRefs?.includes(ref)){
      turmaCode=cell.turmaCode;
      const parts=key.split('_');
      turmaDay=parts[0]; turmaH=parseInt(parts[1]||0);
    }
  });

  const course=inferCourse(DS_ENROL);
  const cefr=(DS_ENROL?.level_cefr||'A1').toUpperCase();
  const idPhoto=DS_DOCS.find(d=>d.document_type==='id_photo')?.public_url||null;

  renderCover({
    name:DS_ENROL?.name||ref, ref,
    lang:DS_ENROL?.lang||'EN',
    course, cefr,
    branch:DS_ENROL?.branch||'—',
    status:DS_ENROL?.status||null,
    turmaCode, turmaDay, turmaH,
    idPhoto,
  });

  renderAvail(ref, course, turmaDay, turmaH);
  renderBody(turmaCode, turmaDay, turmaH);
};

/* ── Close ── */
window.closeDossier = function(){
  const s=document.getElementById('ds-sheet');
  if(!s) return;
  s.classList.add('ds-exit');
  setTimeout(()=>{
    document.getElementById('ds-overlay')?.classList.remove('open');
    s.classList.remove('ds-exit');
  },280);
};

const COURSE_GRAD = {
  kids:   'linear-gradient(145deg,#5AACAC,#2E7E7E)',
  adults: 'linear-gradient(145deg,#5A78E8,#3050C0)',
  exam:   'linear-gradient(145deg,#C8904A,#8A5A20)',
};
const COURSE_DEPT = {
  kids:   'Juvenil',
  adults: 'Geral',
  exam:   'Exames',
};

/* ── Cover ── */
function renderCover(d){
  const course=d.course||'adults';
  const cc=COURSE_CHIP[course]||COURSE_CHIP.adults;
  const lvl=displayLevel(d.cefr, course);

  // Banner
  document.getElementById('ds-banner-bg').style.background=COURSE_GRAD[course]||COURSE_GRAD.adults;
  document.getElementById('ds-dept-badge').textContent=COURSE_DEPT[course]||'Geral';

  // Avatar
  const av=document.getElementById('ds-avatar');
  if(d.idPhoto){
    av.innerHTML=`<img src="${d.idPhoto}" alt="${d.name}"/>`;
    av.style.background='transparent';
  } else {
    const col=avCol(d.name||d.ref||'?');
    av.style.cssText=`background:${col.bg};color:${col.text}`;
    av.textContent=(d.name||d.ref||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  }

  document.getElementById('ds-name').textContent=d.name||d.ref||'—';
  document.getElementById('ds-ref').textContent=`${d.ref} · ${(d.branch||'').replace(/_/g,' ')}`;

  // Tags
  const tags=[];
  tags.push({label:lvl, col:cc.col});
  tags.push({label:`${FLAGS[d.lang]||''} ${d.lang}`, col:''});
  if(d.turmaCode) tags.push({label:d.turmaCode, col:'green'});
  if(d.status==='active') tags.push({label:'Activo', col:'green'});
  else if(d.status) tags.push({label:d.status, col:'amber'});
  document.getElementById('ds-tags').innerHTML=tags.map(t=>
    `<span class="ds-tag ${t.col}">${t.label}</span>`
  ).join('');

  // Actions
  const acts=[
    {icon:'📋',lbl:'Matrícula',   fn:`dsScrollTo('ds-s-inscricao')`},
    {icon:'✉️', lbl:'Mensagem',    fn:`dsSendMsg()`},
    {icon:'🗓', lbl:'Pedido',      fn:`dsScrollTo('ds-s-pedido')`},
    {icon:'🔄', lbl:'Mover',      fn:`dsScrollTo('ds-s-mover')`},
    {icon:'🚩', lbl:'Sinalizar',  fn:`dsScrollTo('ds-s-notas')`},
  ];
  document.getElementById('ds-actions').innerHTML=acts.map(a=>
    `<div class="ds-act" onclick="${a.fn}">
      <div class="ds-act-icon">${a.icon}</div>
      <div class="ds-act-lbl">${a.lbl}</div>
    </div>`
  ).join('');
}

/* ── Availability ── */
function renderAvail(ref, course, confDay, confH){
  const prefs=getPrefs(ref, course);
  if(!prefs.length&&!confDay){
    document.getElementById('ds-avail').style.display='none';
    return;
  }
  document.getElementById('ds-avail').style.display='block';
  const grid=document.getElementById('ds-avail-grid');

  let html=`<div class="ds-ag-corner"></div>`;
  HRS_MORN.forEach(h=>html+=`<div class="ds-ag-h">${h}</div>`);
  html+=`<div class="ds-ag-brk"></div>`;
  HRS_AFT.forEach(h=>html+=`<div class="ds-ag-h">${h}</div>`);

  DAYS.forEach(day=>{
    html+=`<div class="ds-ag-day">${day}</div>`;
    HRS_MORN.forEach(h=>{
      const isConf=confDay===day&&confH===h;
      const isReq=prefs.some(p=>p.day===day&&p.h===h);
      html+=`<div class="ds-ag-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
    html+=`<div class="ds-ag-brk"></div>`;
    HRS_AFT.forEach(h=>{
      const isConf=confDay===day&&confH===h;
      const isReq=prefs.some(p=>p.day===day&&p.h===h);
      html+=`<div class="ds-ag-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
  });
  grid.innerHTML=html;
}

/* ── Body ── */
function renderBody(turmaCode, turmaDay, turmaH){
  const body=document.getElementById('ds-body');
  const course=inferCourse(DS_ENROL);
  const prefs=getPrefs(DS_REF, course);

  body.innerHTML=[
    sec('ds-s-horario',  '🗓','Horário',       prefs.length?`${prefs.length} slots`:'Sem pedido', buildTimetable(prefs,turmaDay,turmaH)),
    sec('ds-s-inscricao','📋','Inscrição',      DS_ENROL?'Carregado':'—',                          buildEnrol()),
    sec('ds-s-pedido',   '📝','Pedido Horário', DS_REQ?'Submetido':'Sem pedido',                   buildRequest()),
    sec('ds-s-hist',     '🎓','Historial',      DS_HIST.length?`${DS_HIST.length} anos`:'—',        buildHistorial()),
    sec('ds-s-docs',     '📎','Documentos',     DS_DOCS.length?`${DS_DOCS.length} ficheiros`:'—',  buildDocs()),
    sec('ds-s-mover',    '🔄','Mover Aluno',    turmaCode||'Sem turma',                            buildMove(turmaCode)),
    sec('ds-s-notas',    '🚩','Notas',          '',                                                buildNotes()),
  ].join('');

  body.querySelectorAll('.ds-section-hdr').forEach(h=>{
    h.addEventListener('click',()=>h.classList.toggle('open'));
  });
}

function sec(id,icon,title,meta,content){
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

/* ── Scroll to ── */
window.dsScrollTo = function(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.querySelector('.ds-section-hdr')?.classList.add('open');
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
};

window.dsSendMsg = function(){
  const email=DS_ENROL?.email;
  const phone=DS_ENROL?.phone;
  if(email) window.open(`mailto:${email}`,'_blank');
  else if(phone) window.open(`tel:${phone}`,'_blank');
  else dsToast('Sem contacto registado','warn');
};

/* ── Sections ── */
function buildTimetable(prefs, confDay, confH){
  if(!prefs.length&&!confDay) return `<div class="ds-empty">Nenhum horário pedido.</div>`;
  const hCols=ALL_HRS.length;
  let html=`<div style="overflow-x:auto;margin-bottom:10px"><div style="display:grid;grid-template-columns:26px repeat(${hCols},1fr);gap:2px;min-width:260px">`;
  html+=`<div></div>`;
  ALL_HRS.forEach((h,i)=>{
    html+=`<div style="height:12px;display:flex;align-items:center;justify-content:center;font-size:7px;color:var(--sub);font-family:monospace">${h}</div>`;
  });
  DAYS.forEach(day=>{
    html+=`<div style="height:12px;display:flex;align-items:center;font-size:7px;font-weight:700;color:var(--sub);font-family:monospace">${day}</div>`;
    ALL_HRS.forEach(h=>{
      const isConf=confDay===day&&confH===h;
      const isReq=prefs.some(p=>p.day===day&&p.h===h);
      const bg=isConf?'#32D74B':isReq?'#FF9F0A':'#48484A';
      html+=`<div style="height:12px;border-radius:2px;background:${bg}"></div>`;
    });
  });
  html+=`</div></div>`;
  html+=`<div style="display:flex;gap:14px;margin-top:6px">
    <div class="ds-leg-item"><div class="ds-leg-dot" style="background:#32D74B"></div>Confirmado</div>
    <div class="ds-leg-item"><div class="ds-leg-dot" style="background:#FF9F0A"></div>Pedido</div>
  </div>`;
  return html;
}

function buildEnrol(){
  if(!DS_ENROL) return `<div class="ds-empty">Matrícula não encontrada.</div>`;
  const e=DS_ENROL;
  const course=inferCourse(e);
  const lvl=displayLevel((e.level_cefr||'A1').toUpperCase(),course);
  const dept=course==='kids'?'Juvenil':course==='exam'?'Exames':'Geral';
  return [
    row('Referência', e.ref||'—', 'tint'),
    row('Nome', e.name||'—'),
    row('Nível', lvl),
    row('Departamento', dept),
    row('Filial', (e.branch||'—').replace(/_/g,' ')),
    row('Língua', `${FLAGS[e.lang]||''} ${e.lang||'—'}`),
    row('Estado', e.status==='active'?'Activo':e.status||'—', e.status==='active'?'green':'amber'),
    e.email?row('Email', e.email, 'tint'):'',
    e.phone?row('Telefone', e.phone):'',
  ].join('');
}

function buildRequest(){
  if(!DS_REQ) return `<div class="ds-empty">Nenhum pedido submetido.</div>`;
  const r=DS_REQ;
  let slots=[];
  try{const dp=typeof r.day_preferences==='string'?JSON.parse(r.day_preferences):r.day_preferences;if(Array.isArray(dp))slots=dp;}catch(e){}
  const slotHtml=slots.length?`<div class="ds-slots">${slots.map((s,i)=>{
    const day=s.day_name||(DAY_NUM[s.day]||`Dia ${s.day}`);
    const start=s.session_start||s.start_time||(s.hour?`${s.hour}:00`:'—');
    return `<span class="ds-slot">${day} ${start}</span>`;
  }).join('')}</div>`:'—';
  const dateStr=r.created_at?new Date(r.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'}):'—';
  return [
    `<div class="ds-row"><div class="ds-rk">Slots</div><div class="ds-rv">${slotHtml}</div></div>`,
    row('Modo', r.mode_used==='avail'?'Disponibilidade':'Preferência'),
    row('Sessões/sem', r.sessions_per_week||'—'),
    row('Submetido', dateStr),
    r.notes?row('Nota', r.notes):'',
    row('Foto ID', r.has_id_photo?'Enviada':'—', r.has_id_photo?'green':''),
    row('Hor. Escolar', r.has_school_timetable?'Enviado':'—', r.has_school_timetable?'green':''),
  ].filter(Boolean).join('');
}

function buildHistorial(){
  if(!DS_HIST.length) return `<div class="ds-empty">Historial em construção.</div>
    <div class="ds-btn-row"><button class="ds-btn ghost" onclick="dsToast('Módulo em desenvolvimento','warn')">Adicionar ano lectivo</button></div>`;
  let html='';
  DS_HIST.forEach(yr=>{
    const cls=yr.outcome==='aprovado'?'ok':yr.outcome==='reprovado'?'warn':'na';
    const lbl=yr.outcome==='aprovado'?'Aprovado':yr.outcome==='reprovado'?'Reprovado':yr.outcome||'Em curso';
    const has=yr.cambridge_r||yr.cambridge_w||yr.cambridge_l||yr.cambridge_s||yr.cambridge_uoe;
    html+=`<div class="ds-yr">
      <div class="ds-yr-hdr" onclick="this.classList.toggle('open')">
        <div class="ds-yr-left">
          <span class="ds-yr-year">${yr.academic_year}</span>
          <span class="ds-yr-turma">${yr.turma_code||'—'} · ${yr.level_display||'—'}</span>
        </div>
        <span class="ds-yr-outcome ${cls}">${lbl}</span>
      </div>
      <div class="ds-yr-body">
        ${has?`<div class="ds-camb">${[['R',yr.cambridge_r],['W',yr.cambridge_w],['L',yr.cambridge_l],['S',yr.cambridge_s],['UoE',yr.cambridge_uoe]].map(([l,sc])=>
          `<div class="ds-camb-cell ${sc>=60?'pass':sc>0?'fail':''}">
            <div class="ds-camb-score">${sc||'—'}</div>
            <div class="ds-camb-lbl">${l}</div>
          </div>`).join('')}</div>`:''}
        ${yr.grade_final!=null?row('Nota final',yr.grade_final+'%'):''}
        ${yr.absences!=null?row('Faltas',yr.absences):''}
        ${yr.notes?row('Notas',yr.notes):''}
        <div class="ds-btn-row">
          <button class="ds-btn ghost" onclick="dsTriggerUpload('historial_exam','${yr.academic_year}')">Adicionar PDF</button>
        </div>
      </div>
    </div>`;
  });
  html+=`<div class="ds-btn-row"><button class="ds-btn ghost" onclick="dsToast('Módulo em desenvolvimento','warn')">Adicionar ano lectivo</button></div>`;
  return html;
}

function buildDocs(){
  const iconMap={id_photo:'🪪',school_timetable:'🏫',historial_exam:'📄',historial_report:'📋',historial_cambridge:'🎓',general:'📁'};
  let html='';
  DS_DOCS.forEach(d=>{
    const icon=iconMap[d.document_type]||'📁';
    const name=d.notes||d.document_type||'Documento';
    const date=d.uploaded_at?new Date(d.uploaded_at).toLocaleDateString('pt-PT'):'';
    const isPdf=d.storage_path?.endsWith('.pdf');
    html+=`<div class="ds-doc">
      <div class="ds-doc-icon">${icon}</div>
      <div class="ds-doc-info">
        <div class="ds-doc-name">${name}</div>
        <div class="ds-doc-meta">${d.document_type} · ${date}</div>
      </div>
      <div class="ds-doc-btns">
        ${d.public_url?`<button class="ds-doc-btn" onclick="dsViewDoc('${d.public_url}','${isPdf?'pdf':'img'}')">${isPdf?'PDF':'Ver'}</button>`:''}
        <button class="ds-doc-btn del" onclick="dsDeleteDoc('${d.id}','${d.storage_path||''}')">Remover</button>
      </div>
    </div>`;
  });
  if(!DS_DOCS.length) html+=`<div class="ds-empty">Sem documentos.</div>`;
  html+=`<button class="ds-upload" onclick="dsTriggerUpload('general',null)">
    <span style="font-size:18px">📎</span>
    <span class="ds-upload-lbl">Adicionar documento</span>
  </button>`;
  return html;
}

function buildMove(currentCode){
  const CM=window.CELL_MAP||{};
  const codes=[...new Set(Object.values(CM).map(c=>c.turmaCode).filter(c=>c&&c!==currentCode))];
  return `${row('Turma actual', currentCode||'Sem turma', currentCode?'tint':'')}
  <div style="margin-top:12px">
    <select class="ds-select" id="ds-move-sel">
      <option value="">Escolher turma destino</option>
      ${codes.map(c=>`<option value="${c}">${c}</option>`).join('')}
    </select>
    <div class="ds-btn-row">
      <button class="ds-btn primary" onclick="dsMoveStudent()">Mover</button>
      ${currentCode?`<button class="ds-btn danger" onclick="dsRemove('${currentCode}')">Remover da turma</button>`:''}
    </div>
  </div>`;
}

function buildNotes(){
  return `<div class="ds-flags">
    <button class="ds-flag" onclick="this.classList.toggle('on')">Comportamento</button>
    <button class="ds-flag" onclick="this.classList.toggle('on')">Pagamento pendente</button>
    <button class="ds-flag" onclick="this.classList.toggle('on')">Baixo desempenho</button>
    <button class="ds-flag" onclick="this.classList.toggle('on')">Excesso de faltas</button>
    <button class="ds-flag" onclick="this.classList.toggle('on')">Necessidade especial</button>
  </div>
  <textarea class="ds-note" id="ds-note" placeholder="Adicionar nota visível para toda a equipa…"></textarea>
  <div class="ds-btn-row">
    <button class="ds-btn primary" onclick="dsSaveNote()">Guardar nota</button>
  </div>`;
}

/* ── Actions ── */
window.dsMoveStudent = function(){
  const code=document.getElementById('ds-move-sel')?.value;
  if(!code){dsToast('Escolha uma turma destino','warn');return;}
  if(window.moveStudent) window.moveStudent(DS_REF,code);
  else dsToast(`Mover para ${code}','warn`);
};
window.dsRemove = function(code){
  if(!confirm(`Remover ${DS_REF} de ${code}?`)) return;
  if(window.removeFromTurma) window.removeFromTurma(DS_REF,code);
  else dsToast('Remover — use a página de atribuição','warn');
};
window.dsSaveNote = function(){
  const txt=document.getElementById('ds-note')?.value?.trim();
  if(!txt){dsToast('Escreva uma nota primeiro','warn');return;}
  dsToast('Nota guardada','ok');
  document.getElementById('ds-note').value='';
};

/* ── Upload ── */
window.dsTriggerUpload = function(docType, year){
  DS_UPLOAD_CTX={docType,year};
  document.getElementById('ds-file-inp')?.click();
};
async function onFile(e){
  const file=e.target.files[0]; if(!file) return;
  const ctx=DS_UPLOAD_CTX; if(!ctx) return;
  dsToast('A enviar…');
  const BASE=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  const KEY=window.KEY||'';
  const H={'apikey':KEY,'Authorization':'Bearer '+KEY};
  try{
    const ext=file.name.split('.').pop();
    const path=`${DS_REF}/${ctx.docType}-${Date.now()}.${ext}`;
    const r=await fetch(`${BASE}/storage/v1/object/alm-student-documents/${path}`,
      {method:'POST',headers:{...H,'Content-Type':file.type||'application/pdf','x-upsert':'true'},body:file});
    if(!r.ok) throw new Error(await r.text());
    const url=`${BASE}/storage/v1/object/public/alm-student-documents/${path}`;
    await fetch(`${BASE}/rest/v1/student_documents`,{method:'POST',
      headers:{...H,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify({ref:DS_REF,document_type:ctx.docType,storage_path:path,public_url:url,
        uploaded_by:'staff',academic_year:'2026/2027',
        notes:ctx.year?`${ctx.docType} · ${ctx.year}`:ctx.docType})
    });
    dsToast('Enviado','ok');
    setTimeout(()=>openDossier(DS_REF,DS_ROLE),700);
  }catch(err){
    dsToast('Erro no envio','err');
  }
  e.target.value='';
}

window.dsDeleteDoc = async function(docId, storagePath){
  if(!confirm('Remover este documento?')) return;
  const BASE=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  const KEY=window.KEY||'';
  const H={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
  try{
    await fetch(`${BASE}/rest/v1/student_documents?id=eq.${docId}`,{method:'DELETE',headers:H});
    if(storagePath) await fetch(`${BASE}/storage/v1/object/alm-student-documents/${storagePath}`,{method:'DELETE',headers:H});
    dsToast('Removido','ok');
    setTimeout(()=>openDossier(DS_REF,DS_ROLE),600);
  }catch(err){ dsToast('Erro ao remover','err'); }
};

window.dsViewDoc = function(url, type){
  const w=window.open('','_blank','width=900,height=700');
  if(type==='pdf')
    w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0;background:#111}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe src="${url}"></iframe></body></html>`);
  else
    w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:95vw;max-height:95vh}</style></head><body><img src="${url}"/></body></html>`);
  w.document.close();
};

/* ── Helpers ── */
function row(k,v,c){
  return `<div class="ds-row"><div class="ds-rk">${k}</div><div class="ds-rv ${c||''}">${v}</div></div>`;
}
function inferCourse(e){
  if(!e) return 'adults';
  const str=[e.family,e.course,e.department,e.level_cefr,e.notes].filter(Boolean).join(' ').toLowerCase();
  if(/exam|exame/.test(str)) return 'exam';
  if(/kid|juven|junior|infant|prep/.test(str)) return 'kids';
  return 'adults';
}
function displayLevel(cefr,course){
  const map={
    kids:  {A1:'PI-a1',A2:'PI-a2',B1:'Pj1',B2:'Pj2',C1:'Pj3'},
    adults:{A1:'1º Ano',A2:'2º Ano',B1:'3º Ano',B2:'4º Ano',C1:'5º Ano',C2:'6º Ano'},
    exam:  {B1:'4º Ano',B2:'6º Ano',C1:'7º Ano',C2:'8º Ano'},
  };
  return map[course]?.[cefr]||cefr;
}
function getPrefs(ref, course){
  const r=(window.RMAP||{})[ref]; if(!r) return [];
  if(r.day_preferences){
    try{
      const dp=typeof r.day_preferences==='string'?JSON.parse(r.day_preferences):r.day_preferences;
      if(Array.isArray(dp)&&dp.length)
        return dp.map(p=>({day:DAY_NUM[p.day]||(p.day_name?p.day_name.slice(0,3).toUpperCase():null),h:parseInt(p.session_start||p.hour||9)})).filter(p=>p.day);
    }catch(e){}
  }
  if(r.availability){
    try{
      const av=typeof r.availability==='string'?JSON.parse(r.availability):r.availability;
      return Object.keys(av).filter(k=>av[k]).map(k=>{const[di,h]=k.split('_').map(Number);return{day:DAY_NUM[di+1]||null,h};}).filter(p=>p.day);
    }catch(e){}
  }
  return [];
}
function avCol(name){
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffffffff;
  const p=[
    {bg:'#EAC8D8',text:'#7A1840'},
    {bg:'#C8D8EC',text:'#143870'},
    {bg:'#C8ECD8',text:'#145830'},
    {bg:'#DCC8EC',text:'#481890'},
    {bg:'#ECDCC8',text:'#784010'},
    {bg:'#C8ECE8',text:'#145850'},
    {bg:'#ECE8C8',text:'#706010'},
    {bg:'#F0C8C8',text:'#801818'},
  ];
  return p[Math.abs(h)%p.length];
}
function dsToast(msg,type=''){
  const t=document.getElementById('ds-toast'); if(!t) return;
  t.textContent=msg; t.className='ds-toast '+type+' show';
  clearTimeout(_toast_t);
  _toast_t=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ── Keyboard ── */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('ds-overlay')?.classList.contains('open'))
    closeDossier();
});

/* ── Compat ── */
window.nmScrollTo   = window.dsScrollTo;
window.nmTriggerUpload = window.dsTriggerUpload;
window.nmDeleteDoc  = window.dsDeleteDoc;
window.nmViewDoc    = window.dsViewDoc;
window.nmToast      = dsToast;

console.log('[ALM Dossier v5] Apple-style sheet loaded ✓');
})();
