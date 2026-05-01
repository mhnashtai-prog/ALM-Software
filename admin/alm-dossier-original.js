/* ═══════════════════════════════════════════════════════════════
   ALM STUDENT DOSSIER  —  openDossier(ref, role)
   Self-contained: injects its own CSS + HTML + JS
   Works in any ALM page that has Supabase configured.
   role: 'director' | 'staff' | 'teacher'
═══════════════════════════════════════════════════════════════ */

(function(){

/* ── CSS ─────────────────────────────────────────────────────── */
const DOSSIER_CSS = `
:root{
  --ds-bg:#0A0814;--ds-bg2:#0E0C1A;--ds-bg3:#141220;
  --ds-seam:rgba(200,164,74,.10);--ds-seam2:rgba(200,164,74,.20);
  --ds-ink:rgba(238,218,168,.90);--ds-ink2:rgba(218,192,138,.52);--ds-ink3:rgba(208,182,128,.28);
  --ds-gold:#C8A44A;--ds-gold2:#E8C870;--ds-green:#28C870;--ds-red:#F04848;--ds-amber:#F09830;
  --ds-blue:#4888E8;--ds-teal:#28C8B0;--ds-purple:#9B5ECA;
  --ds-mono:'IBM Plex Mono',monospace;--ds-sans:'IBM Plex Sans',system-ui,sans-serif;
  --ds-c:#C8A44A;
}
.ds-overlay{display:none;position:fixed;inset:0;z-index:2000;background:rgba(4,2,12,.85);backdrop-filter:blur(8px);align-items:flex-start;justify-content:flex-end;padding:0}
.ds-overlay.open{display:flex}
.ds-panel{width:min(420px,100vw);height:100dvh;background:var(--ds-bg);border-left:1px solid var(--ds-c,rgba(200,164,74,.2));display:flex;flex-direction:column;overflow:hidden;transform:translateX(100%);transition:transform .24s cubic-bezier(.22,.61,.36,1);box-shadow:-24px 0 80px rgba(0,0,0,.95)}
.ds-overlay.open .ds-panel{transform:translateX(0)}

/* Cover */
.ds-cover{flex-shrink:0;position:relative;overflow:hidden}
.ds-banner{height:80px;position:relative}
.ds-banner-bg{position:absolute;inset:0;background:linear-gradient(135deg,var(--ds-c)44,var(--ds-c)18,rgba(0,0,0,.8))}
.ds-banner-stripe{position:absolute;inset:0;opacity:.10;background-image:repeating-linear-gradient(45deg,var(--ds-c) 0,var(--ds-c) 1px,transparent 1px,transparent 9px)}
.ds-close{position:absolute;top:10px;right:10px;width:26px;height:26px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);color:rgba(238,218,168,.6);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:all .12s;font-family:var(--ds-mono)}
.ds-close:hover{background:rgba(240,72,72,.2);color:var(--ds-red);border-color:rgba(240,72,72,.4)}
.ds-av-wrap{position:absolute;bottom:-28px;left:16px;z-index:2}
.ds-av{width:56px;height:56px;border-radius:50%;border:4px solid var(--ds-bg);display:flex;align-items:center;justify-content:center;font-family:var(--ds-mono);font-size:16px;font-weight:700;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.7)}
.ds-av img{width:100%;height:100%;object-fit:cover}
.ds-level-badge{position:absolute;bottom:-10px;right:16px;font-family:var(--ds-mono);font-size:8px;font-weight:700;padding:3px 10px;border:1.5px solid var(--ds-c);color:var(--ds-c);background:color-mix(in srgb,var(--ds-c) 15%,var(--ds-bg))}

.ds-id{padding:36px 16px 12px;border-bottom:1px solid var(--ds-seam)}
.ds-name{font-family:var(--ds-mono);font-size:18px;font-weight:700;color:var(--ds-ink);line-height:1.1;margin-bottom:3px}
.ds-handle{font-family:var(--ds-mono);font-size:8px;color:var(--ds-ink3);letter-spacing:.06em;margin-bottom:10px}
.ds-contact{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.ds-contact-btn{display:flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid var(--ds-seam2);font-family:var(--ds-mono);font-size:8px;color:var(--ds-ink2);cursor:pointer;transition:all .12s;text-decoration:none;background:transparent}
.ds-contact-btn:hover{background:var(--ds-c);color:#000;border-color:var(--ds-c)}
.ds-school-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ds-school-pill{font-family:var(--ds-mono);font-size:8px;padding:2px 9px;border:1px solid var(--ds-seam);color:var(--ds-ink3)}
.ds-school-pill.code{border-color:var(--ds-c);color:var(--ds-c);font-weight:700}
.ds-school-pill.ok{border-color:rgba(40,200,112,.3);color:var(--ds-green)}
.ds-school-pill.warn{border-color:rgba(240,152,48,.3);color:var(--ds-amber)}

/* Scroll body */
.ds-body{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--ds-seam) transparent}
.ds-body::-webkit-scrollbar{width:3px}.ds-body::-webkit-scrollbar-thumb{background:var(--ds-seam2)}

/* Pills */
.ds-pill{border-bottom:1px solid var(--ds-seam)}
.ds-pill-hdr{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;transition:background .12s;user-select:none}
.ds-pill-hdr:hover{background:rgba(200,164,74,.04)}
.ds-pill-hdr.open{background:rgba(200,164,74,.05)}
.ds-pill-icon{font-size:14px;flex-shrink:0;width:20px;text-align:center}
.ds-pill-label{font-family:var(--ds-mono);font-size:9px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:var(--ds-ink2);flex:1}
.ds-pill-meta{font-family:var(--ds-mono);font-size:7.5px;color:var(--ds-ink3)}
.ds-pill-chv{font-family:var(--ds-mono);font-size:10px;color:var(--ds-ink3);transition:transform .2s}
.ds-pill-hdr.open .ds-pill-chv{transform:rotate(90deg)}
.ds-pill-body{display:none;padding:0 16px 14px}
.ds-pill-hdr.open + .ds-pill-body{display:block}

/* Timetable grid inside pill — days vertical, hours horizontal */
.ds-tt{overflow-x:auto;margin-top:4px}
.ds-tt-grid{display:grid;border:1px solid rgba(200,164,74,.15);min-width:260px;font-family:var(--ds-mono)}
.ds-tt-corner{background:rgba(0,0,0,.3);border-right:1px solid rgba(200,164,74,.12);border-bottom:1px solid rgba(200,164,74,.12)}
.ds-tt-h{display:flex;align-items:center;justify-content:center;font-size:6px;color:var(--ds-ink3);height:14px;background:rgba(0,0,0,.2);border-right:1px solid rgba(200,164,74,.08);border-bottom:1px solid rgba(200,164,74,.08)}
.ds-tt-h.brk{border-left:1.5px solid rgba(200,164,74,.2)}
.ds-tt-day{display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:600;color:var(--ds-ink3);background:rgba(0,0,0,.2);border-right:1px solid rgba(200,164,74,.08);border-bottom:1px solid rgba(200,164,74,.08);padding:0 4px;letter-spacing:.04em}
.ds-tt-cell{height:14px;border-right:1px solid rgba(200,164,74,.05);border-bottom:1px solid rgba(200,164,74,.05);background:rgba(255,255,255,.01)}
.ds-tt-cell.req{background:color-mix(in srgb,var(--ds-c) 30%,transparent);border-color:color-mix(in srgb,var(--ds-c) 45%,transparent)}
.ds-tt-cell.conf{background:rgba(40,200,112,.28);border-color:rgba(40,200,112,.5)}
.ds-tt-legend{display:flex;gap:10px;margin-top:5px}
.ds-tt-leg{display:flex;align-items:center;gap:3px;font-family:var(--ds-mono);font-size:6.5px;color:var(--ds-ink3)}
.ds-tt-leg-dot{width:8px;height:8px;border:1px solid}

/* Data rows */
.ds-data-row{display:flex;align-items:flex-start;gap:10px;padding:4px 0;border-bottom:1px solid rgba(200,164,74,.04)}
.ds-data-row:last-child{border-bottom:none}
.ds-dk{font-family:var(--ds-mono);font-size:7.5px;color:var(--ds-ink3);width:88px;flex-shrink:0;padding-top:1px}
.ds-dv{font-family:var(--ds-mono);font-size:9px;color:var(--ds-ink2);flex:1}
.ds-dv.hi{color:var(--ds-gold2);font-weight:600}
.ds-dv.ok{color:var(--ds-green)}.ds-dv.warn{color:var(--ds-amber)}

/* Slot pills */
.ds-slot-pill{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;margin:2px 2px 0 0;border:1px solid color-mix(in srgb,var(--ds-c) 38%,transparent);background:color-mix(in srgb,var(--ds-c) 12%,transparent);font-family:var(--ds-mono);font-size:7.5px;font-weight:700}
.ds-slot-pill .sp-day{color:var(--ds-c);font-weight:800}
.ds-slot-pill .sp-type{color:var(--ds-c);opacity:.6;font-size:6.5px}

/* Historial */
.ds-hist-year{background:rgba(255,255,255,.02);border:1px solid var(--ds-seam);margin-bottom:8px;overflow:hidden}
.ds-hist-yr-hdr{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;background:rgba(0,0,0,.15);transition:background .12s}
.ds-hist-yr-hdr:hover{background:rgba(0,0,0,.25)}
.ds-hist-yr{font-family:var(--ds-mono);font-size:9px;font-weight:700;color:var(--ds-gold2);flex-shrink:0}
.ds-hist-turma{font-family:var(--ds-mono);font-size:8px;color:var(--ds-ink3);flex:1}
.ds-hist-outcome{font-family:var(--ds-mono);font-size:7.5px;font-weight:700;padding:1px 7px;flex-shrink:0}
.ds-hist-outcome.ok{background:rgba(40,200,112,.1);border:1px solid rgba(40,200,112,.3);color:var(--ds-green)}
.ds-hist-outcome.warn{background:rgba(240,152,48,.1);border:1px solid rgba(240,152,48,.3);color:var(--ds-amber)}
.ds-hist-outcome.na{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:var(--ds-ink3)}
.ds-hist-yr-body{display:none;padding:10px 12px;border-top:1px solid var(--ds-seam)}
.ds-hist-yr-hdr.open + .ds-hist-yr-body{display:block}
.ds-camb-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:8px}
.ds-camb-cell{text-align:center;padding:5px 4px;background:rgba(255,255,255,.02);border:1px solid var(--ds-seam)}
.ds-camb-score{font-family:var(--ds-mono);font-size:13px;font-weight:700;color:var(--ds-gold2);line-height:1}
.ds-camb-lbl{font-family:var(--ds-mono);font-size:6px;color:var(--ds-ink3);margin-top:2px;text-transform:uppercase;letter-spacing:.06em}
.ds-camb-cell.pass .ds-camb-score{color:var(--ds-green)}
.ds-camb-cell.fail .ds-camb-score{color:var(--ds-red)}

/* Documents inside pills */
.ds-doc-list{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.ds-doc-row{display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.02);border:1px solid var(--ds-seam);transition:background .12s}
.ds-doc-row:hover{background:rgba(255,255,255,.04)}
.ds-doc-icon{font-size:16px;flex-shrink:0}
.ds-doc-info{flex:1;min-width:0}
.ds-doc-name{font-family:var(--ds-mono);font-size:8.5px;color:var(--ds-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ds-doc-meta{font-family:var(--ds-mono);font-size:6.5px;color:var(--ds-ink3);margin-top:1px}
.ds-doc-btns{display:flex;gap:4px;flex-shrink:0}
.ds-doc-btn{padding:3px 8px;font-family:var(--ds-mono);font-size:7.5px;cursor:pointer;border:1px solid;transition:all .12s}
.ds-doc-btn.view{background:rgba(72,136,232,.1);border-color:rgba(72,136,232,.3);color:var(--ds-blue)}
.ds-doc-btn.del{background:rgba(240,72,72,.1);border-color:rgba(240,72,72,.3);color:var(--ds-red)}
.ds-doc-btn:hover{filter:brightness(1.2)}
.ds-upload-zone{border:1px dashed var(--ds-seam2);padding:12px;text-align:center;cursor:pointer;transition:all .15s;margin-top:8px}
.ds-upload-zone:hover{border-color:var(--ds-c);background:rgba(200,164,74,.04)}
.ds-upload-lbl{font-family:var(--ds-mono);font-size:8px;color:var(--ds-ink3)}
.ds-upload-zone.drag{border-color:var(--ds-c);background:rgba(200,164,74,.08)}
input.ds-file-inp{display:none}

/* Notes */
.ds-note-row{padding:8px 10px;background:rgba(255,255,255,.02);border:1px solid var(--ds-seam);margin-bottom:5px}
.ds-note-text{font-family:var(--ds-mono);font-size:8.5px;color:var(--ds-ink2);line-height:1.5;margin-bottom:4px}
.ds-note-meta{font-family:var(--ds-mono);font-size:6.5px;color:var(--ds-ink3)}
.ds-note-add{width:100%;padding:7px 9px;background:rgba(0,0,0,.3);border:1px solid var(--ds-seam2);font-family:var(--ds-sans);font-size:11px;color:var(--ds-ink);outline:none;resize:none;min-height:60px;line-height:1.5;margin-top:8px}
.ds-note-add::placeholder{color:var(--ds-ink3)}.ds-note-add:focus{border-color:var(--ds-c)}

/* Action row */
.ds-action-row{display:flex;gap:6px;padding:8px 0;flex-wrap:wrap}
.ds-action-btn{padding:6px 14px;font-family:var(--ds-mono);font-size:8px;font-weight:700;cursor:pointer;border:1px solid;transition:all .14s;letter-spacing:.04em}
.ds-action-btn.primary{background:var(--ds-green);border-color:transparent;color:#051208}
.ds-action-btn.primary:hover{background:#2ed877}
.ds-action-btn.ghost{background:transparent;border-color:var(--ds-seam2);color:var(--ds-ink2)}
.ds-action-btn.ghost:hover{border-color:var(--ds-seam2);background:rgba(255,255,255,.04)}
.ds-action-btn.danger{background:rgba(240,72,72,.1);border-color:rgba(240,72,72,.3);color:var(--ds-red)}
.ds-action-btn.danger:hover{background:rgba(240,72,72,.2)}

/* Move controls */
.ds-move-sel{width:100%;padding:5px 8px;background:rgba(0,0,0,.3);border:1px solid var(--ds-seam2);font-family:var(--ds-mono);font-size:9px;color:var(--ds-ink);outline:none;margin-bottom:6px}
.ds-move-sel:focus{border-color:var(--ds-c)}
.ds-move-sel option{background:var(--ds-bg2)}

/* Flag chips */
.ds-flag-chips{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
.ds-flag-chip{padding:4px 10px;border:1px solid var(--ds-seam);font-family:var(--ds-mono);font-size:8px;cursor:pointer;color:var(--ds-ink3);transition:all .12s}
.ds-flag-chip:hover{border-color:var(--ds-seam2);color:var(--ds-ink2)}
.ds-flag-chip.on{background:rgba(240,72,72,.1);border-color:rgba(240,72,72,.3);color:var(--ds-red)}

/* Under construction */
.ds-wip{padding:14px 12px;text-align:center;font-family:var(--ds-mono);font-size:8.5px;color:var(--ds-ink3);line-height:1.7;border:1px dashed var(--ds-seam)}
.ds-wip-icon{font-size:24px;display:block;margin-bottom:8px;opacity:.4}

/* Toast */
.ds-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(8px);padding:5px 16px;font-family:var(--ds-mono);font-size:10px;font-weight:500;opacity:0;transition:all .2s;z-index:3000;white-space:nowrap;border:1px solid;pointer-events:none}
.ds-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.ds-toast.ok{background:rgba(40,200,112,.1);border-color:rgba(40,200,112,.36);color:var(--ds-green)}
.ds-toast.info{background:rgba(200,164,74,.1);border-color:rgba(200,164,74,.36);color:var(--ds-gold2)}
.ds-toast.err{background:rgba(240,72,72,.1);border-color:rgba(240,72,72,.36);color:var(--ds-red)}
`;

/* ── HTML SHELL ──────────────────────────────────────────────── */
const DOSSIER_HTML = `
<div class="ds-overlay" id="ds-overlay" onclick="if(event.target===this)closeDossier()">
  <div class="ds-panel" id="ds-panel">
    <!-- COVER -->
    <div class="ds-cover">
      <div class="ds-banner" id="ds-banner">
        <div class="ds-banner-bg" id="ds-banner-bg"></div>
        <div class="ds-banner-stripe"></div>
        <div class="ds-av-wrap"><div class="ds-av" id="ds-av">?</div></div>
        <div class="ds-level-badge" id="ds-level-badge">—</div>
        <button class="ds-close" onclick="closeDossier()">✕</button>
      </div>
      <div class="ds-id">
        <div class="ds-name" id="ds-name">—</div>
        <div class="ds-handle" id="ds-handle">—</div>
        <div class="ds-contact" id="ds-contact"></div>
        <div class="ds-school-row" id="ds-school-row"></div>
      </div>
    </div>
    <!-- PILLS -->
    <div class="ds-body" id="ds-body"></div>
  </div>
</div>
<div class="ds-toast" id="ds-toast"></div>
<input type="file" id="ds-file-inp" class="ds-file-inp" accept=".pdf,image/*"/>
`;

/* ── CONSTANTS ───────────────────────────────────────────────── */
const DS_DAYS = ['SEG','TER','QUA','QUI','SEX','SÁB'];
const DS_HRS  = [8,9,10,11,null,14,15,16,17,18,19,20];
const DS_FLAGS = {EN:'🇬🇧',PT:'🇵🇹',FR:'🇫🇷',ES:'🇪🇸',DE:'🇩🇪'};
const DS_COURSE_COL = {kids:'#28C8B0',adults:'#4888E8',exam:'#C8A44A'};
const DS_DAY_NUM = {1:'SEG',2:'TER',3:'QUA',4:'QUI',5:'SEX',6:'SÁB'};

/* ── STATE ───────────────────────────────────────────────────── */
let DS_REF = null, DS_ROLE = 'staff';
let DS_ENROL = null, DS_REQ = null, DS_DOCS = [], DS_HIST = [], DS_NOTES_DATA = [];
let DS_UPLOAD_CONTEXT = null; // {type, year} for pending upload
let ds_toast_t = null;

/* ── INIT ────────────────────────────────────────────────────── */
function injectDossier() {
  if (document.getElementById('ds-overlay')) return;
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = DOSSIER_CSS;
  document.head.appendChild(style);
  // Inject HTML
  const div = document.createElement('div');
  div.innerHTML = DOSSIER_HTML;
  document.body.appendChild(div.firstElementChild);
  document.body.appendChild(div.firstElementChild); // toast
  // File input handler
  document.getElementById('ds-file-inp').addEventListener('change', onDsFileChosen);
}

/* ── OPEN DOSSIER ─────────────────────────────────────────────── */
window.openDossier = async function(ref, role) {
  injectDossier();
  DS_REF = ref; DS_ROLE = role || 'staff';
  DS_ENROL = null; DS_REQ = null; DS_DOCS = []; DS_HIST = []; DS_NOTES_DATA = [];

  // Show overlay immediately — load data async
  document.getElementById('ds-overlay').classList.add('open');
  renderDossierCover({name: ref, ref, lang:'EN', course:'adults', levelCefr:'A1', branch:'—'});
  renderDossierPills([], [], [], []); // placeholders while loading

  // Load all data in parallel
  const SB_URL = window.SB || 'https://oapygbeliocdvitbdjbq.supabase.co';
  const SB_KEY = window.KEY || '';
  const H = {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
  const sbGet = (t,q) => fetch(`${SB_URL}/rest/v1/${t}?${q}`,{headers:H}).then(r=>r.json()).catch(()=>[]);
  const sbPost = (t,b) => fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:{...H,'Prefer':'return=representation'},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>null);
  const sbDel = (t,q) => fetch(`${SB_URL}/rest/v1/${t}?${q}`,{method:'DELETE',headers:H}).catch(()=>{});

  const [enrols, reqs, docs, hist] = await Promise.all([
    sbGet('enrolments', `ref=eq.${encodeURIComponent(ref)}&limit=1`),
    sbGet('student_requests', `ref=eq.${encodeURIComponent(ref)}&academic_year=eq.2026%2F2027&limit=1`),
    sbGet('student_documents', `ref=eq.${encodeURIComponent(ref)}&order=uploaded_at.desc`),
    sbGet('student_history', `ref=eq.${encodeURIComponent(ref)}&order=academic_year.desc`),
  ]);

  DS_ENROL = enrols?.[0] || null;
  DS_REQ   = reqs?.[0]   || null;
  DS_DOCS  = docs || [];
  DS_HIST  = hist || [];

  // Find assigned turma
  const GRIDS_ALL = window.GRIDS || {};
  let turmaCode = null, turmaDay = null, turmaH = null;
  Object.values(GRIDS_ALL).forEach(tGrid => {
    DS_DAYS.forEach(d => {
      DS_HRS.forEach(h => {
        if(!h) return;
        const s = tGrid?.[d]?.[h];
        if(s?.groupKey) {
          const g = (window.GROUPS||[]).find(x=>x.studentRefs?.includes(ref)||x.students?.some(s=>s.ref===ref));
          if(g && s.groupKey===g.key) { turmaCode=s.turmaCode; turmaDay=d; turmaH=h; }
        }
      });
    });
  });
  // Also check localStorage turma caches
  if(!turmaCode) {
    Object.keys(localStorage).filter(k=>k.startsWith('alm-turma-')).forEach(k => {
      try{const p=JSON.parse(localStorage.getItem(k));if(p.students?.some(s=>s.ref===ref)){turmaCode=p.turmaCode;turmaDay=p.day;turmaH=p.h;}}catch(e){}
    });
  }

  const course = inferCourseFromEnrol(DS_ENROL);
  const cefr = (DS_ENROL?.level_cefr||'A1').toUpperCase();

  renderDossierCover({
    name: DS_ENROL?.name || ref,
    ref,
    lang: DS_ENROL?.lang || 'EN',
    course,
    levelCefr: cefr,
    branch: DS_ENROL?.branch || '—',
    phone: DS_ENROL?.phone || null,
    email: DS_ENROL?.email || null,
    turmaCode, turmaDay, turmaH,
    status: DS_ENROL?.status || '—',
    idPhotoUrl: DS_DOCS.find(d=>d.document_type==='id_photo')?.public_url || null,
  });

  renderDossierPills(DS_DOCS, DS_HIST, DS_NOTES_DATA, {turmaCode, turmaDay, turmaH, sbPost, sbDel, SB_URL, SB_KEY});
};

function inferCourseFromEnrol(e) {
  if(!e) return 'adults';
  const str = [e.family, e.course, e.department, e.level_cefr, e.notes].filter(Boolean).join(' ');
  return inferCourse(str);
}

function dsDisplayLevel(cefr, course) {
  const map={kids:{A1:'PI-a1',A2:'PI-a2',B1:'Pj1',B2:'Pj2',C1:'Pj3'},adults:{A1:'1º Ano',A2:'2º Ano',B1:'3º Ano',B2:'4º Ano',C1:'5º Ano',C2:'6º Ano'},exam:{B2:'6º Ano',C1:'7º Ano',C2:'8º Ano'}};
  return map[course]?.[cefr]||cefr;
}

/* ── COVER ─────────────────────────────────────────────────────── */
function renderDossierCover(d) {
  const lc = DS_COURSE_COL[d.course] || '#C8A44A';
  const lvl = dsDisplayLevel(d.levelCefr, d.course);
  document.getElementById('ds-panel').style.setProperty('--ds-c', lc);
  document.getElementById('ds-banner-bg').style.background =
    `linear-gradient(135deg,${lc}44,${lc}18,rgba(0,0,0,.8))`;
  document.getElementById('ds-level-badge').textContent = lvl;
  document.getElementById('ds-level-badge').style.color = lc;
  document.getElementById('ds-level-badge').style.borderColor = lc;

  // Avatar
  const av = document.getElementById('ds-av');
  if(d.idPhotoUrl) {
    av.innerHTML = `<img src="${d.idPhotoUrl}" alt="${d.name}"/>`;
    av.style.background = 'transparent';
  } else {
    const col = dsAvColor(d.name||d.ref);
    av.style.cssText = `background:${col.bg};border-color:${col.border};color:${col.text}`;
    av.textContent = (d.name||d.ref||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  }

  document.getElementById('ds-name').textContent = d.name || d.ref || '—';
  document.getElementById('ds-handle').textContent =
    `${d.ref} · ${(d.branch||'').replace(/_/g,' ')} · ${DS_FLAGS[d.lang]||''} ${d.lang}`;

  // Contact
  const cEl = document.getElementById('ds-contact');
  cEl.innerHTML = [
    d.phone ? `<a class="ds-contact-btn" href="tel:${d.phone}">📞 ${d.phone}</a>` : '',
    d.email ? `<a class="ds-contact-btn" href="mailto:${d.email}">✉ ${d.email}</a>` : '',
  ].join('');

  // School row
  const sEl = document.getElementById('ds-school-row');
  sEl.innerHTML = [
    `<span class="ds-school-pill">${(d.branch||'—').replace(/_/g,' ')}</span>`,
    d.turmaCode ? `<span class="ds-school-pill code">${d.turmaCode}</span>` : '<span class="ds-school-pill">Sem turma</span>',
    `<span class="ds-school-pill ${d.status==='active'?'ok':'warn'}">${d.status==='active'?'✓ Activo':'⚠ '+d.status}</span>`,
    lvl ? `<span class="ds-school-pill">${lvl}</span>` : '',
  ].join('');
}

/* ── PILLS ─────────────────────────────────────────────────────── */
function renderDossierPills(docs, hist, notes, ctx) {
  const body = document.getElementById('ds-body');
  const course = inferCourseFromEnrol(DS_ENROL);
  const cefr = (DS_ENROL?.level_cefr||'A1').toUpperCase();
  const lvl = dsDisplayLevel(cefr, course);
  const lc = DS_COURSE_COL[course]||'#C8A44A';

  // Build timetable grid data
  const reqPrefs = dsGetSlotPrefs(DS_REF);
  const confDay = ctx?.turmaDay, confH = ctx?.turmaH;

  body.innerHTML = [
    buildPill('🗓','HORÁRIO', reqPrefs.length>0?`${reqPrefs.length} slots pedidos`:'Sem pedido',
      buildTimetablePill(reqPrefs, confDay, confH)),

    buildPill('📋','INSCRIÇÃO', DS_ENROL?'✓ Dados carregados':'—',
      buildEnrolPill()),

    buildPill('📝','PEDIDO DE HORÁRIO', DS_REQ?'✓ Submetido':'Sem pedido',
      buildRequestPill(lc)),

    buildPill('🎓','HISTORIAL', hist.length>0?`${hist.length} ano${hist.length!==1?'s':''}`:' Em construção',
      buildHistorialPill(hist, ctx)),

    buildPill('📎','DOCUMENTOS', docs.length>0?`${docs.length} ficheiro${docs.length!==1?'s':''}`:'Sem documentos',
      buildDocsPill(docs, 'general', ctx)),

    buildPill('🔄','MOVER ALUNO', ctx?.turmaCode||'Sem turma',
      buildMovePill(ctx)),

    buildPill('🚩','NOTAS E ALERTAS', '',
      buildNotesPill()),

    DS_ROLE !== 'teacher'
      ? buildPill('💳','PAGAMENTO','Director / Secretaria',
          `<div class="ds-wip"><span class="ds-wip-icon">🔒</span>Módulo de pagamentos em desenvolvimento</div>`)
      : '',
  ].join('');

  // Attach pill toggle handlers
  document.querySelectorAll('.ds-pill-hdr').forEach(hdr => {
    hdr.addEventListener('click', () => {
      hdr.classList.toggle('open');
    });
  });
}

function buildPill(icon, label, meta, content) {
  return `<div class="ds-pill">
    <div class="ds-pill-hdr">
      <span class="ds-pill-icon">${icon}</span>
      <span class="ds-pill-label">${label}</span>
      <span class="ds-pill-meta">${meta}</span>
      <span class="ds-pill-chv">›</span>
    </div>
    <div class="ds-pill-body">${content}</div>
  </div>`;
}

/* ── TIMETABLE PILL ────────────────────────────────────────────── */
function buildTimetablePill(prefs, confDay, confH) {
  const hCols = DS_HRS.length;
  let html = `<div class="ds-tt"><div class="ds-tt-grid" style="grid-template-columns:28px repeat(${hCols},1fr);grid-template-rows:14px repeat(6,14px)">`;
  html += `<div class="ds-tt-corner"></div>`;
  DS_HRS.forEach(h => {
    if(h===null) html += `<div class="ds-tt-h brk">·</div>`;
    else html += `<div class="ds-tt-h">${h}</div>`;
  });
  DS_DAYS.forEach(day => {
    html += `<div class="ds-tt-day">${day}</div>`;
    DS_HRS.forEach(h => {
      if(h===null){html+=`<div class="ds-tt-cell" style="border-left:1.5px solid rgba(200,164,74,.18)"></div>`;return;}
      const isConf = confDay===day && confH===h;
      const isReq  = prefs.some(p=>p.day===day&&p.h===h);
      html += `<div class="ds-tt-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
  });
  html += `</div>
  <div class="ds-tt-legend">
    <div class="ds-tt-leg"><div class="ds-tt-leg-dot" style="background:rgba(40,200,112,.28);border-color:rgba(40,200,112,.5)"></div>Turma confirmada</div>
    <div class="ds-tt-leg"><div class="ds-tt-leg-dot" style="background:color-mix(in srgb,var(--ds-c) 30%,transparent);border-color:color-mix(in srgb,var(--ds-c) 45%,transparent)"></div>Pedido</div>
  </div></div>`;
  return html;
}

/* ── ENROLMENT PILL ───────────────────────────────────────────── */
function buildEnrolPill() {
  if(!DS_ENROL) return `<div class="ds-wip"><span class="ds-wip-icon">⚠️</span>Matrícula não encontrada no sistema.</div>`;
  const e = DS_ENROL;
  const course = inferCourseFromEnrol(e);
  const lvl = dsDisplayLevel((e.level_cefr||'A1').toUpperCase(), course);
  const courseLabel = course==='kids'?'Juvenil':course==='exam'?'Exames':'Geral';
  return [
    ['Ref. ALM', e.ref||'—', 'hi'],
    ['Nome completo', e.name||'—', ''],
    ['Nível ALM', lvl, 'hi'],
    ['Departamento', courseLabel, ''],
    ['Filial', (e.branch||'—').replace(/_/g,' '), ''],
    ['Língua', `${DS_FLAGS[e.lang]||''} ${e.lang||'—'}`, ''],
    ['Estado', e.status==='active'?'✓ Activo':e.status||'—', e.status==='active'?'ok':'warn'],
    ['Email', e.email||'—', ''],
    ['Telefone', e.phone||'—', ''],
  ].map(([k,v,c])=>`<div class="ds-data-row"><div class="ds-dk">${k}</div><div class="ds-dv ${c}">${v}</div></div>`).join('');
}

/* ── REQUEST PILL ─────────────────────────────────────────────── */
function buildRequestPill(lc) {
  if(!DS_REQ) return `<div class="ds-wip"><span class="ds-wip-icon">📭</span>Nenhum pedido de horário submetido.<br>O encarregado ainda não preencheu o formulário.</div>`;
  const r = DS_REQ;
  let slots=[];
  try{const dp=typeof r.day_preferences==='string'?JSON.parse(r.day_preferences):r.day_preferences;if(Array.isArray(dp))slots=dp;}catch(e){}
  const pills = slots.map((s,i)=>{
    const day = s.day_name||(DS_DAY_NUM[s.day]||`Dia ${s.day}`);
    const start = s.session_start||s.start_time||(s.hour?`${s.hour}:00`:'—');
    const type = s.type==='availability'?'disponível':i===0?'★ preferência':'↩ alternativa';
    return `<span class="ds-slot-pill"><span class="sp-day">${day}</span><span>${start}</span><span class="sp-type">${type}</span></span>`;
  }).join('');

  const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'}) : 'Data não registada';
  return [
    ['Slots pedidos', pills||'—', ''],
    ['Modo', r.mode_used==='avail'?'Disponibilidade':'Preferência', 'hi'],
    ['Sessões/sem', r.sessions_per_week||'—', 'hi'],
    ['Submetido', `${dateStr} · 🔒 Imutável`, ''],
    r.notes?['Nota', r.notes, '']:null,
    ['Foto de ID', r.has_id_photo?'✓ Enviada':'—', r.has_id_photo?'ok':''],
    ['Horário escolar', r.has_school_timetable?'✓ Enviado':'—', r.has_school_timetable?'ok':''],
  ].filter(Boolean).map(([k,v,c])=>`<div class="ds-data-row"><div class="ds-dk">${k}</div><div class="ds-dv ${c}">${v}</div></div>`).join('');
}

/* ── HISTORIAL PILL ───────────────────────────────────────────── */
function buildHistorialPill(hist, ctx) {
  let html = '';

  if(!hist.length) {
    html += `<div class="ds-wip"><span class="ds-wip-icon">🏗️</span>Historial académico em construção.<br><span style="font-size:7px;opacity:.6">Os anos lectivos anteriores serão adicionados aqui.</span></div>`;
  } else {
    hist.forEach(yr => {
      const outcome = yr.outcome==='aprovado'?'ok':yr.outcome==='reprovado'?'warn':'na';
      const outLabel = yr.outcome==='aprovado'?'✓ Aprovado':yr.outcome==='reprovado'?'✗ Reprovado':yr.outcome||'Em curso';
      const hasScores = yr.cambridge_r||yr.cambridge_w||yr.cambridge_l||yr.cambridge_s||yr.cambridge_uoe;

      html += `<div class="ds-hist-year">
        <div class="ds-hist-yr-hdr" onclick="this.classList.toggle('open')">
          <span class="ds-hist-yr">${yr.academic_year}</span>
          <span class="ds-hist-turma">${yr.turma_code||'—'} · ${yr.level_display||'—'} · ${yr.teacher_name||'—'}</span>
          <span class="ds-hist-outcome ${outcome}">${outLabel}</span>
        </div>
        <div class="ds-hist-yr-body">
          ${hasScores?`<div class="ds-camb-grid">
            ${[['R',yr.cambridge_r],['W',yr.cambridge_w],['L',yr.cambridge_l],['S',yr.cambridge_s],['UoE',yr.cambridge_uoe]].map(([lbl,sc])=>`
            <div class="ds-camb-cell ${sc>=60?'pass':sc>0?'fail':''}">
              <div class="ds-camb-score">${sc||'—'}</div>
              <div class="ds-camb-lbl">${lbl}</div>
            </div>`).join('')}
          </div>`:''}
          ${[
            yr.grade_final!=null?['Nota final',yr.grade_final+'%','hi']:null,
            yr.absences!=null?['Faltas',yr.absences,'']:null,
            yr.notes?['Notas',yr.notes,'']:null,
          ].filter(Boolean).map(([k,v,c])=>`<div class="ds-data-row"><div class="ds-dk">${k}</div><div class="ds-dv ${c}">${v}</div></div>`).join('')}
          <!-- Attached documents for this year -->
          <div id="hist-docs-${yr.id}" style="margin-top:8px">
            ${buildDocsPill(DS_DOCS.filter(d=>d.document_type?.startsWith('historial')&&d.notes?.includes(yr.academic_year)), 'historial', {...ctx, year:yr.academic_year})}
          </div>
          <div class="ds-action-row">
            <button class="ds-action-btn ghost" onclick="triggerDsUpload('historial_exam','${yr.academic_year}')">+ Adicionar PDF</button>
          </div>
        </div>
      </div>`;
    });
  }

  // Add new year button
  html += `<div class="ds-action-row" style="margin-top:8px">
    <button class="ds-action-btn ghost" onclick="addHistorialYear()">+ Adicionar ano lectivo</button>
  </div>`;

  return html;
}

/* ── DOCUMENTS PILL ───────────────────────────────────────────── */
function buildDocsPill(docs, context, ctx) {
  const iconMap = {
    id_photo:'🪪', school_timetable:'🏫', historial_exam:'📄', historial_report:'📋', historial_cambridge:'🎓',
    general:'📁'
  };
  let html = '';
  if(docs.length) {
    html += `<div class="ds-doc-list">`;
    docs.forEach(d => {
      const icon = iconMap[d.document_type]||'📁';
      const name = d.notes||d.document_type||'Documento';
      const date = d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('pt-PT') : '';
      const isPdf = d.storage_path?.endsWith('.pdf');
      html += `<div class="ds-doc-row">
        <div class="ds-doc-icon">${icon}</div>
        <div class="ds-doc-info">
          <div class="ds-doc-name">${name}</div>
          <div class="ds-doc-meta">${d.document_type} · ${date} · ${d.uploaded_by||'—'}</div>
        </div>
        <div class="ds-doc-btns">
          ${d.public_url?`<button class="ds-doc-btn view" onclick="dsViewDoc('${d.public_url}','${isPdf?'pdf':'img'}')">${isPdf?'PDF':'Ver'}</button>`:''}
          <button class="ds-doc-btn del" onclick="dsDeleteDoc('${d.id}','${d.storage_path||''}')">✕</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  if(context!=='historial') {
    html += `<div class="ds-upload-zone" onclick="triggerDsUpload('general',null)">
      <span style="font-size:20px;display:block;margin-bottom:4px;opacity:.4">📎</span>
      <span class="ds-upload-lbl">Clique para adicionar documento ou PDF</span>
    </div>`;
  }
  return html;
}

/* ── MOVE PILL ─────────────────────────────────────────────────── */
function buildMovePill(ctx) {
  const currentCode = ctx?.turmaCode || null;
  const allCodes = [];
  Object.keys(localStorage).filter(k=>k.startsWith('alm-turma-')&&!k.includes(currentCode||'__')).forEach(k=>{
    try{const p=JSON.parse(localStorage.getItem(k));if(p.turmaCode) allCodes.push(p.turmaCode);}catch(e){}
  });

  return `<div class="ds-data-row"><div class="ds-dk">Turma actual</div><div class="ds-dv hi">${currentCode||'Sem turma'}</div></div>
  <div style="margin-top:10px">
    <div style="font-family:var(--ds-mono);font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ds-ink3);margin-bottom:5px">Mover para</div>
    <select class="ds-move-sel" id="ds-move-sel">
      <option value="">— escolher turma destino —</option>
      ${allCodes.map(c=>`<option value="${c}">${c}</option>`).join('')}
    </select>
    <div class="ds-action-row">
      <button class="ds-action-btn primary" onclick="dsMoveStudent()">✓ Mover</button>
      ${currentCode?`<button class="ds-action-btn danger" onclick="dsRemoveFromTurma('${currentCode}')">✕ Remover da turma</button>`:''}
    </div>
  </div>`;
}

/* ── NOTES PILL ────────────────────────────────────────────────── */
function buildNotesPill() {
  return `<div class="ds-flag-chips">
    <div class="ds-flag-chip" onclick="this.classList.toggle('on')">Comportamento</div>
    <div class="ds-flag-chip" onclick="this.classList.toggle('on')">Pagamento pendente</div>
    <div class="ds-flag-chip" onclick="this.classList.toggle('on')">Baixo desempenho</div>
    <div class="ds-flag-chip" onclick="this.classList.toggle('on')">Excesso de faltas</div>
    <div class="ds-flag-chip" onclick="this.classList.toggle('on')">Necessidade especial</div>
  </div>
  <textarea class="ds-note-add" id="ds-note-add" placeholder="Adicionar nota (visível para toda a equipa)…"></textarea>
  <div class="ds-action-row">
    <button class="ds-action-btn primary" onclick="dsSaveNote()">✓ Guardar nota</button>
  </div>`;
}

/* ── CLOSE ─────────────────────────────────────────────────────── */
window.closeDossier = function() {
  document.getElementById('ds-overlay')?.classList.remove('open');
};

/* ── SLOT PREFS ────────────────────────────────────────────────── */
function dsGetSlotPrefs(ref) {
  const r = (window.RMAP||{})[ref]; if(!r) return [];
  if(r.mode_used==='avail'&&r.availability){
    try{
      const av=typeof r.availability==='string'?JSON.parse(r.availability):r.availability;
      return Object.keys(av).filter(k=>av[k]).map(k=>{const[di,h]=k.split('_').map(Number);return{day:DS_DAY_NUM[di+1]||null,h};}).filter(p=>p.day);
    }catch(e){}
  }
  if(r.day_preferences){
    try{
      const dp=typeof r.day_preferences==='string'?JSON.parse(r.day_preferences):r.day_preferences;
      if(Array.isArray(dp)) return dp.map(p=>{
        const day=DS_DAY_NUM[p.day]||(p.day_name?p.day_name.slice(0,3).toUpperCase():null);
        const h=parseInt(p.session_start||p.hour||9);
        return{day,h};
      }).filter(p=>p.day);
    }catch(e){}
  }
  return [];
}

/* ── AVATAR COLOR ──────────────────────────────────────────────── */
function dsAvColor(name){
  let h=0;for(let i=0;i<(name||'?').length;i++)h=(h*31+(name||'?').charCodeAt(i))&0xffffffff;
  const hues=[200,215,160,270,8,340,22,285],hue=hues[Math.abs(h)%hues.length];
  const sat=55+(Math.abs(h>>4)%25),lit=58+(Math.abs(h>>8)%14);
  return{bg:`hsl(${hue},${sat}%,18%)`,border:`hsl(${hue},${sat}%,35%)`,text:`hsl(${hue},${sat+10}%,${lit}%)`};
}

/* ── PDF / DOC VIEWER ──────────────────────────────────────────── */
window.dsViewDoc = function(url, type) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if(type==='pdf') {
    win.document.write(`<!DOCTYPE html><html><head><title>ALM · Documento</title><style>body{margin:0;background:#08070F}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe src="${url}"></iframe></body></html>`);
  } else {
    win.document.write(`<!DOCTYPE html><html><head><title>ALM · Documento</title><style>body{margin:0;background:#08070F;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:95vw;max-height:95vh;box-shadow:0 0 40px rgba(0,0,0,.8)}</style></head><body><img src="${url}"/></body></html>`);
  }
  win.document.close();
};

/* ── FILE UPLOAD ───────────────────────────────────────────────── */
window.triggerDsUpload = function(docType, year) {
  DS_UPLOAD_CONTEXT = {docType, year};
  document.getElementById('ds-file-inp').click();
};

async function onDsFileChosen(e) {
  const file = e.target.files[0]; if(!file) return;
  const ctx = DS_UPLOAD_CONTEXT; if(!ctx) return;
  const ref = DS_REF;
  dsTst('A enviar…','info');

  const SB_URL = window.SB || 'https://oapygbeliocdvitbdjbq.supabase.co';
  const SB_KEY = window.KEY || '';
  const H = {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};

  try {
    const ext = file.name.split('.').pop();
    const path = `${ref}/${ctx.docType}-${Date.now()}.${ext}`;
    // Upload to storage
    const r = await fetch(`${SB_URL}/storage/v1/object/alm-student-documents/${path}`, {
      method:'POST', headers:{...H,'Content-Type':file.type||'application/pdf','x-upsert':'true'}, body:file
    });
    if(!r.ok) throw new Error(await r.text());
    const publicUrl = `${SB_URL}/storage/v1/object/public/alm-student-documents/${path}`;
    // Record in student_documents
    await fetch(`${SB_URL}/rest/v1/student_documents`, {
      method:'POST',
      headers:{...H,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify({
        ref, document_type:ctx.docType, storage_path:path, public_url:publicUrl,
        uploaded_by:'staff', academic_year:'2026/2027',
        notes: ctx.year ? `${ctx.docType} · ${ctx.year}` : ctx.docType
      })
    });
    dsTst('Documento enviado ✓','ok');
    // Refresh dossier
    setTimeout(()=>openDossier(ref, DS_ROLE), 800);
  } catch(err) {
    console.error('Upload failed', err);
    dsTst('Erro no envio','err');
  }
  e.target.value = '';
}

/* ── DELETE DOC ────────────────────────────────────────────────── */
window.dsDeleteDoc = async function(docId, storagePath) {
  if(!confirm('Remover este documento?')) return;
  const SB_URL = window.SB || 'https://oapygbeliocdvitbdjbq.supabase.co';
  const SB_KEY = window.KEY || '';
  const H = {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
  try {
    await fetch(`${SB_URL}/rest/v1/student_documents?id=eq.${docId}`, {method:'DELETE',headers:H});
    if(storagePath) await fetch(`${SB_URL}/storage/v1/object/alm-student-documents/${storagePath}`, {method:'DELETE',headers:H});
    dsTst('Removido ✓','ok');
    setTimeout(()=>openDossier(DS_REF, DS_ROLE), 600);
  } catch(e) { dsTst('Erro ao remover','err'); }
};

/* ── MOVE STUDENT ──────────────────────────────────────────────── */
window.dsMoveStudent = async function() {
  const targetCode = document.getElementById('ds-move-sel')?.value;
  if(!targetCode){dsTst('Escolha uma turma destino','err');return;}
  if(window.moveStudent) { await window.moveStudent(DS_REF, ''); }
  else dsTst(`Mover para ${targetCode} — função disponível na página de atribuição`,'info');
};

window.dsRemoveFromTurma = async function(code) {
  if(!confirm(`Remover ${DS_REF} de ${code}?`)) return;
  if(window.removeFromTurma) { await window.removeFromTurma(DS_REF, code); closeDossier(); }
  else dsTst('Remover — função disponível na página de atribuição','info');
};

/* ── SAVE NOTE ─────────────────────────────────────────────────── */
window.dsSaveNote = function() {
  const txt = document.getElementById('ds-note-add')?.value?.trim();
  if(!txt){dsTst('Escreva uma nota primeiro','err');return;}
  dsTst('Nota guardada ✓ (base de dados em breve)','ok');
  document.getElementById('ds-note-add').value='';
};

/* ── ADD HISTORIAL YEAR ────────────────────────────────────────── */
window.addHistorialYear = function() {
  dsTst('Adicionar ano — módulo em desenvolvimento','info');
};

/* ── TOAST ─────────────────────────────────────────────────────── */
function dsTst(msg, type='info') {
  const t = document.getElementById('ds-toast');
  if(!t) return;
  t.textContent = msg; t.className = 'ds-toast '+type+' show';
  clearTimeout(ds_toast_t);
  ds_toast_t = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ── KEYBOARD ──────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if(e.key==='Escape' && document.getElementById('ds-overlay')?.classList.contains('open')) {
    closeDossier();
  }
});

console.log('[ALM Dossier] Engine loaded ✓');
})();
