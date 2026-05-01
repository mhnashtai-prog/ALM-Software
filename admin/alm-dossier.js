/* ═══════════════════════════════════════════════════════════════
   ALM STUDENT DOSSIER  v4  —  openDossier(ref, role)
   Centred neumorphic modal card.
   Self-contained: injects its own CSS + HTML + JS.
   role: 'director' | 'staff' | 'teacher'
═══════════════════════════════════════════════════════════════ */

(function(){

/* ── CSS ─────────────────────────────────────────────────────── */
const DOSSIER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

:root {
  --nm-bg:#E8E2F0;
  --nm-light:rgba(255,255,255,.85);
  --nm-dark:rgba(130,110,165,.30);
  --nm-out: -4px -4px 10px var(--nm-light), 4px 4px 12px var(--nm-dark);
  --nm-in:  inset 2px 2px 6px var(--nm-dark), inset -2px -2px 6px var(--nm-light);
  --nm-rim: 0 0 0 1px rgba(255,255,255,.60), 0 0 0 2px rgba(120,100,160,.10);
  --nm-text:#2E2640;
  --nm-text2:#7A6E90;
  --nm-text3:#B0A8C0;
  --nm-sans:'Nunito',system-ui,sans-serif;
  --nm-mono:'IBM Plex Mono',monospace;
  --nm-c:#C8A44A;
  --nm-green:#18884A;
  --nm-green-bg:rgba(24,136,74,.14);
  --nm-red:#C83040;
  --nm-red-bg:rgba(200,48,64,.12);
  --nm-amber:#8A5C10;
  --nm-amber-bg:rgba(138,92,16,.13);
  --nm-blue:#1850A0;
}

/* OVERLAY */
.nm-overlay {
  display:none;position:fixed;inset:0;z-index:2000;
  background:rgba(28,20,48,.72);backdrop-filter:blur(10px);
  align-items:center;justify-content:center;padding:16px;
}
.nm-overlay.open { display:flex; }

/* CARD */
.nm-card {
  width:min(540px,96vw);
  max-height:90dvh;
  background:var(--nm-bg);
  border-radius:28px;
  box-shadow:var(--nm-out), var(--nm-rim);
  border:.5px solid rgba(255,255,255,.65);
  display:flex;flex-direction:column;overflow:hidden;
  animation:nmCardIn .3s cubic-bezier(.22,.61,.36,1);
}
.nm-card.nm-exit {
  animation:nmCardOut .22s ease forwards;
}
@keyframes nmCardIn  { from { opacity:0; transform:scale(.93) translateY(16px) } to { opacity:1; transform:none } }
@keyframes nmCardOut { to   { opacity:0; transform:scale(.97) translateY(-10px) } }

/* ── BANNER ── */
.nm-banner {
  position:relative;overflow:hidden;
  padding:18px 18px 16px;
  display:flex;align-items:flex-end;gap:15px;
  min-height:128px;flex-shrink:0;
}
.nm-banner-bg   { position:absolute;inset:0;transition:background .35s; }
.nm-banner-grain {
  position:absolute;inset:0;opacity:.055;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.nm-banner-close {
  position:absolute;top:12px;right:12px;z-index:20;
  width:27px;height:27px;border-radius:50%;border:none;
  background:rgba(255,255,255,.30);color:rgba(255,255,255,.88);
  font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-family:var(--nm-sans);
  box-shadow:0 1px 5px rgba(0,0,0,.20);transition:all .15s;
}
.nm-banner-close:hover { background:rgba(255,255,255,.55);transform:scale(1.09); }
.nm-dept-badge {
  position:absolute;top:12px;left:14px;z-index:20;
  font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
  padding:4px 12px;border-radius:999px;
  background:rgba(255,255,255,.28);
  box-shadow:0 1px 5px rgba(0,0,0,.12);
}

/* Avatar — neumorphic circle */
.nm-avatar {
  position:relative;z-index:5;flex-shrink:0;margin-bottom:2px;
  width:78px;height:78px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:900;font-family:var(--nm-sans);
  border:3.5px solid rgba(255,255,255,.60);
  box-shadow:0 6px 22px rgba(0,0,0,.22),0 0 0 1px rgba(255,255,255,.25);
  overflow:hidden;
}
.nm-avatar img { width:100%;height:100%;object-fit:cover; }

.nm-banner-info { position:relative;z-index:5;flex:1;min-width:0;margin-bottom:2px; }
.nm-banner-name {
  font-size:20px;font-weight:900;color:white;line-height:1.1;
  text-shadow:0 2px 12px rgba(0,0,0,.20);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.nm-banner-ref  { font-size:10px;font-weight:700;color:rgba(255,255,255,.65);letter-spacing:.08em;margin-top:2px; }

/* ── BANNER ACTION PILLS ── */
.nm-ap {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 13px; border-radius: 999px; border: none;
  cursor: pointer; font-family: var(--nm-sans);
  transition: all .14s ease;

  background: rgba(255,255,255,.18);
  border: .5px solid rgba(255,255,255,.42);
  box-shadow: 0 .5px 1px rgba(0,0,0,.10),
              inset 0 .5px 0 rgba(255,255,255,.30);

  font-size: 12px;
  font-weight: 500;
  letter-spacing: -.01em;
  color: rgba(255,255,255,.88);
  white-space: nowrap;
}
.nm-ap:hover  { background: rgba(255,255,255,.30); transform: translateY(-1px); }
.nm-ap:active { background: rgba(255,255,255,.12); transform: scale(.97); }

.nm-ap-icon { font-size: 12px; line-height: 1; opacity: .55; filter: grayscale(1); }
/* ── CHIP ROW (below banner) ── */
.nm-chips {
  display:flex;gap:7px;flex-wrap:wrap;
  padding:12px 18px 0;flex-shrink:0;
}
.nm-chip {
  font-size:11px;font-weight:800;padding:5px 13px;border-radius:999px;
  background:var(--nm-bg);
  box-shadow:var(--nm-out);
  border:.5px solid rgba(255,255,255,.72);
  font-family:var(--nm-sans);
}

/* ── AVAILABILITY GRID ── */
.nm-avail-wrap {
  margin:12px 18px 0;flex-shrink:0;
  border-radius:16px;
  background:var(--nm-bg);
  box-shadow:var(--nm-in);
  border:.5px solid rgba(255,255,255,.52);
  padding:10px 12px 8px;
}
.nm-avail-title {
  font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:var(--nm-text3);margin-bottom:7px;font-family:var(--nm-sans);
}
.nm-avail-grid {
  display:grid;
  grid-template-columns:28px repeat(11,1fr) 4px repeat(7,1fr);
  gap:2px;
}
.nm-ag-corner { width:28px; }
.nm-ag-h {
  height:13px;display:flex;align-items:center;justify-content:center;
  font-size:7px;font-weight:800;color:var(--nm-text3);font-family:var(--nm-mono);
}
.nm-ag-brk { width:4px; }
.nm-ag-day {
  height:13px;display:flex;align-items:center;justify-content:center;
  font-size:7px;font-weight:800;color:var(--nm-text3);font-family:var(--nm-mono);
  width:28px;
}
.nm-ag-cell {
  height:13px;border-radius:3px;
  background:rgba(120,100,160,.08);
  border:.5px solid rgba(255,255,255,.45);
  transition:background .15s;
}
.nm-ag-cell.req  { background:rgba(200,164,74,.38);border-color:rgba(200,164,74,.55); }
.nm-ag-cell.conf { background:rgba(24,136,74,.40);border-color:rgba(24,136,74,.60); }
.nm-avail-legend {
  display:flex;gap:12px;margin-top:6px;
}
.nm-al-item {
  display:flex;align-items:center;gap:4px;
  font-size:8px;font-weight:700;color:var(--nm-text3);font-family:var(--nm-sans);
}
.nm-al-dot {
  width:8px;height:8px;border-radius:2px;flex-shrink:0;
}

/* ── SCROLL BODY ── */
.nm-body {
  flex:1;overflow-y:auto;padding:0 0 8px;
  scrollbar-width:thin;scrollbar-color:rgba(120,100,160,.2) transparent;
}
.nm-body::-webkit-scrollbar { width:3px; }
.nm-body::-webkit-scrollbar-thumb { background:rgba(120,100,160,.25);border-radius:99px; }

/* ── SECTION DIVIDER ── */
.nm-divider {
  display:flex;align-items:center;gap:8px;
  padding:14px 18px 0;
}
.nm-divider::before,.nm-divider::after {
  content:'';flex:1;height:.5px;background:rgba(120,100,160,.15);
}
.nm-divider span {
  font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:var(--nm-text3);white-space:nowrap;font-family:var(--nm-sans);
}

/* ── ACCORDION PILLS ── */
.nm-pill { border-bottom:.5px solid rgba(120,100,160,.12); }
.nm-pill-hdr {
  display:flex;align-items:center;gap:10px;padding:11px 18px;
  cursor:pointer;transition:background .12s;user-select:none;
}
.nm-pill-hdr:hover { background:rgba(120,100,160,.05); }
.nm-pill-hdr.open  { background:rgba(120,100,160,.07); }
.nm-pill-icon  { font-size:15px;flex-shrink:0;width:22px;text-align:center; }
.nm-pill-label {
  font-family:var(--nm-sans);font-size:11px;font-weight:800;
  color:var(--nm-text);flex:1;letter-spacing:.01em;
}
.nm-pill-meta  { font-family:var(--nm-mono);font-size:8px;color:var(--nm-text3); }
.nm-pill-chv   { font-size:11px;color:var(--nm-text3);transition:transform .2s; }
.nm-pill-hdr.open .nm-pill-chv { transform:rotate(90deg); }
.nm-pill-body  { display:none;padding:2px 18px 14px; }
.nm-pill-hdr.open + .nm-pill-body { display:block; }

/* ── DATA ROWS ── */
.nm-data-row {
  display:flex;align-items:flex-start;gap:10px;
  padding:5px 0;border-bottom:.5px solid rgba(120,100,160,.07);
}
.nm-data-row:last-child { border-bottom:none; }
.nm-dk { font-family:var(--nm-mono);font-size:7.5px;color:var(--nm-text3);width:92px;flex-shrink:0;padding-top:1px; }
.nm-dv { font-family:var(--nm-mono);font-size:9px;color:var(--nm-text2);flex:1;line-height:1.5; }
.nm-dv.hi     { color:var(--nm-text);font-weight:700; }
.nm-dv.ok     { color:var(--nm-green);font-weight:700; }
.nm-dv.warn   { color:var(--nm-amber);font-weight:700; }
.nm-dv.danger { color:var(--nm-red);font-weight:700; }

/* ── SLOT PILLS ── */
.nm-slot-pill {
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 9px;margin:2px 2px 0 0;border-radius:999px;
  background:var(--nm-bg);box-shadow:var(--nm-out);
  border:.5px solid rgba(255,255,255,.70);
  font-family:var(--nm-mono);font-size:7.5px;font-weight:700;
}
.nm-slot-day  { color:var(--nm-c);font-weight:900; }
.nm-slot-type { color:var(--nm-text3);font-size:6.5px; }

/* ── TIMETABLE MINI GRID ── */
.nm-tt { overflow-x:auto;margin-top:6px; }
.nm-tt-grid {
  display:grid;border-radius:8px;overflow:hidden;
  border:.5px solid rgba(120,100,160,.15);
  min-width:280px;font-family:var(--nm-mono);
}
.nm-tt-corner { background:rgba(120,100,160,.06); }
.nm-tt-h {
  display:flex;align-items:center;justify-content:center;
  font-size:6px;color:var(--nm-text3);height:14px;
  background:rgba(120,100,160,.06);
  border-right:.5px solid rgba(120,100,160,.10);
  border-bottom:.5px solid rgba(120,100,160,.10);
}
.nm-tt-h.brk { border-left:1.5px solid rgba(120,100,160,.25); }
.nm-tt-day {
  display:flex;align-items:center;justify-content:center;
  font-size:6.5px;font-weight:700;color:var(--nm-text3);
  background:rgba(120,100,160,.06);
  border-right:.5px solid rgba(120,100,160,.10);
  border-bottom:.5px solid rgba(120,100,160,.08);
  padding:0 3px;
}
.nm-tt-cell {
  height:14px;
  border-right:.5px solid rgba(120,100,160,.06);
  border-bottom:.5px solid rgba(120,100,160,.06);
  background:transparent;
}
.nm-tt-cell.req  { background:rgba(200,164,74,.28);border-color:rgba(200,164,74,.40); }
.nm-tt-cell.conf { background:rgba(24,136,74,.32);border-color:rgba(24,136,74,.50); }
.nm-tt-legend { display:flex;gap:12px;margin-top:6px; }
.nm-tt-leg {
  display:flex;align-items:center;gap:4px;
  font-family:var(--nm-mono);font-size:7px;color:var(--nm-text3);
}
.nm-tt-leg-dot { width:8px;height:8px;border-radius:2px; }

/* ── HISTORIAL ── */
.nm-hist-yr {
  background:var(--nm-bg);border-radius:12px;
  box-shadow:var(--nm-out);border:.5px solid rgba(255,255,255,.65);
  margin-bottom:8px;overflow:hidden;
}
.nm-hist-hdr {
  display:flex;align-items:center;gap:8px;padding:9px 12px;
  cursor:pointer;transition:background .12s;
}
.nm-hist-hdr:hover { background:rgba(120,100,160,.06); }
.nm-hist-year-lbl { font-family:var(--nm-mono);font-size:9px;font-weight:700;color:var(--nm-c);flex-shrink:0; }
.nm-hist-turma   { font-family:var(--nm-mono);font-size:8px;color:var(--nm-text3);flex:1; }
.nm-hist-outcome {
  font-family:var(--nm-mono);font-size:7.5px;font-weight:700;
  padding:2px 8px;border-radius:999px;flex-shrink:0;
}
.nm-hist-outcome.ok   { background:var(--nm-green-bg);color:var(--nm-green); }
.nm-hist-outcome.warn { background:var(--nm-red-bg);color:var(--nm-red); }
.nm-hist-outcome.na   { background:rgba(120,100,160,.10);color:var(--nm-text3); }
.nm-hist-body { display:none;padding:10px 12px;border-top:.5px solid rgba(120,100,160,.12); }
.nm-hist-hdr.open + .nm-hist-body { display:block; }
.nm-camb-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px; }
.nm-camb-cell {
  text-align:center;padding:6px 4px;border-radius:10px;
  background:var(--nm-bg);box-shadow:var(--nm-out);
  border:.5px solid rgba(255,255,255,.65);
}
.nm-camb-score { font-family:var(--nm-mono);font-size:13px;font-weight:700;color:var(--nm-text);line-height:1; }
.nm-camb-lbl   { font-family:var(--nm-mono);font-size:6px;color:var(--nm-text3);margin-top:2px;text-transform:uppercase;letter-spacing:.06em; }
.nm-camb-cell.pass .nm-camb-score { color:var(--nm-green); }
.nm-camb-cell.fail .nm-camb-score { color:var(--nm-red); }

/* ── DOCUMENTS ── */
.nm-doc-list { display:flex;flex-direction:column;gap:6px;margin-top:6px; }
.nm-doc-row {
  display:flex;align-items:center;gap:8px;padding:8px 10px;
  border-radius:10px;background:var(--nm-bg);
  box-shadow:var(--nm-out);border:.5px solid rgba(255,255,255,.65);
  transition:all .12s;
}
.nm-doc-row:hover { box-shadow:-3px -3px 8px var(--nm-light),3px 3px 10px var(--nm-dark); }
.nm-doc-icon { font-size:18px;flex-shrink:0; }
.nm-doc-info { flex:1;min-width:0; }
.nm-doc-name { font-family:var(--nm-sans);font-size:11px;font-weight:700;color:var(--nm-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.nm-doc-meta { font-family:var(--nm-mono);font-size:7.5px;color:var(--nm-text3);margin-top:2px; }
.nm-doc-btns { display:flex;gap:4px;flex-shrink:0; }
.nm-doc-btn {
  padding:4px 9px;border-radius:999px;font-family:var(--nm-sans);font-size:9px;font-weight:800;
  cursor:pointer;border:none;
  background:var(--nm-bg);box-shadow:var(--nm-out);
  transition:all .12s;
}
.nm-doc-btn.view { color:var(--nm-blue); }
.nm-doc-btn.del  { color:var(--nm-red); }
.nm-doc-btn:hover { box-shadow:var(--nm-in); }

.nm-upload-zone {
  border:1.5px dashed rgba(120,100,160,.25);
  border-radius:12px;padding:14px;text-align:center;
  cursor:pointer;transition:all .15s;margin-top:8px;
}
.nm-upload-zone:hover { border-color:var(--nm-c);background:rgba(200,164,74,.05); }
.nm-upload-lbl { font-family:var(--nm-sans);font-size:11px;color:var(--nm-text3); }

/* ── MOVE CONTROLS ── */
.nm-select {
  width:100%;padding:7px 10px;border-radius:10px;
  background:var(--nm-bg);box-shadow:var(--nm-in);
  border:.5px solid rgba(255,255,255,.52);
  font-family:var(--nm-sans);font-size:12px;font-weight:700;
  color:var(--nm-text);outline:none;margin-bottom:8px;cursor:pointer;
}
.nm-select:focus { border-color:rgba(200,164,74,.5); }
.nm-select option { background:#E8E2F0; }

/* ── FLAGS & NOTES ── */
.nm-flag-chips { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px; }
.nm-flag-chip {
  padding:5px 13px;border-radius:999px;border:none;
  font-family:var(--nm-sans);font-size:11px;font-weight:700;
  cursor:pointer;color:var(--nm-text2);
  background:var(--nm-bg);box-shadow:var(--nm-out);
  border:.5px solid rgba(255,255,255,.65);
  transition:all .14s;
}
.nm-flag-chip:hover { box-shadow:var(--nm-in); }
.nm-flag-chip.on {
  box-shadow:var(--nm-in);
  color:var(--nm-red);border-color:rgba(200,48,64,.3);
  background:rgba(200,48,64,.07);
}
.nm-note-add {
  width:100%;padding:9px 12px;border-radius:12px;
  background:var(--nm-bg);box-shadow:var(--nm-in);
  border:.5px solid rgba(255,255,255,.52);
  font-family:var(--nm-sans);font-size:12px;color:var(--nm-text);
  outline:none;resize:none;min-height:68px;line-height:1.55;margin-top:4px;
}
.nm-note-add::placeholder { color:var(--nm-text3); }
.nm-note-add:focus { border-color:rgba(200,164,74,.45); }

/* ── ACTION BUTTONS ── */
.nm-action-row { display:flex;gap:7px;padding:10px 0 2px;flex-wrap:wrap; }
.nm-btn {
  padding:7px 16px;border-radius:999px;border:none;
  font-family:var(--nm-sans);font-size:11px;font-weight:800;
  cursor:pointer;transition:all .14s;letter-spacing:.02em;
}
.nm-btn.primary {
  background:var(--nm-green);color:white;
  box-shadow:0 3px 10px rgba(24,136,74,.35);
}
.nm-btn.primary:hover { background:#14A055; }
.nm-btn.ghost {
  background:var(--nm-bg);color:var(--nm-text2);
  box-shadow:var(--nm-out);border:.5px solid rgba(255,255,255,.65);
}
.nm-btn.ghost:hover { box-shadow:var(--nm-in); }
.nm-btn.danger {
  background:var(--nm-bg);color:var(--nm-red);
  box-shadow:var(--nm-out);border:.5px solid rgba(200,48,64,.25);
}
.nm-btn.danger:hover { box-shadow:var(--nm-in); }

/* ── WIP / EMPTY ── */
.nm-wip {
  padding:18px 14px;text-align:center;
  border-radius:12px;background:var(--nm-bg);
  box-shadow:var(--nm-in);border:.5px solid rgba(255,255,255,.50);
  font-family:var(--nm-sans);font-size:11px;color:var(--nm-text3);line-height:1.65;
}
.nm-wip-icon { font-size:22px;display:block;margin-bottom:7px;opacity:.4; }

/* ── HOURS BAR ── */
.nm-hours-wrap {
  border-radius:12px;padding:11px 13px;margin-bottom:10px;
  background:var(--nm-bg);box-shadow:var(--nm-in);
  border:.5px solid rgba(255,255,255,.50);
}
.nm-hours-label {
  display:flex;justify-content:space-between;
  font-family:var(--nm-sans);font-size:11px;font-weight:800;
  color:var(--nm-text2);margin-bottom:8px;
}
.nm-hours-track {
  height:8px;border-radius:99px;overflow:hidden;
  background:rgba(120,100,160,.10);
  box-shadow:inset 1px 1px 3px rgba(120,100,160,.22),inset -1px -1px 2px rgba(255,255,255,.55);
}
.nm-hours-fill {
  height:100%;border-radius:99px;
  transition:width .8s cubic-bezier(.22,.61,.36,1);
}

/* ── STATUS LINE ── */
.nm-status {
  font-family:var(--nm-sans);font-size:11px;font-weight:800;
  text-align:center;padding:10px 14px;border-radius:10px;margin-top:6px;
  background:var(--nm-bg);box-shadow:var(--nm-in);
  border:.5px solid rgba(255,255,255,.50);
}

/* ── TURMA PILLS (teacher) ── */
.nm-turma-row  { display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px; }
.nm-turma-pill {
  font-size:10px;font-weight:800;padding:4px 12px;border-radius:999px;
  background:var(--nm-bg);box-shadow:var(--nm-out);
  border:.5px solid rgba(255,255,255,.65);
  font-family:var(--nm-sans);
}

/* ── TOAST ── */
.nm-toast {
  position:fixed;bottom:18px;left:50%;
  transform:translateX(-50%) translateY(8px);
  background:var(--nm-bg);color:var(--nm-text2);
  font-size:11px;font-weight:800;letter-spacing:.04em;
  padding:8px 20px;border-radius:999px;
  box-shadow:var(--nm-out);border:.5px solid rgba(255,255,255,.65);
  opacity:0;transition:opacity .2s,transform .2s;
  pointer-events:none;z-index:3000;white-space:nowrap;
  font-family:var(--nm-sans);
}
.nm-toast.show  { opacity:1;transform:translateX(-50%) translateY(0); }
.nm-toast.ok    { color:var(--nm-green); }
.nm-toast.err   { color:var(--nm-red); }
.nm-toast.warn  { color:var(--nm-amber); }

input.nm-file-inp { display:none; }
`;

/* ── HTML SHELL ──────────────────────────────────────────────── */
const DOSSIER_HTML = `
<div class="nm-overlay" id="nm-overlay" onclick="if(event.target===this)closeDossier()">
  <div class="nm-card" id="nm-card">
    <!-- BANNER -->
    <div class="nm-banner" id="nm-banner">
      <div class="nm-banner-bg"  id="nm-banner-bg"></div>
      <div class="nm-banner-grain"></div>
      <button class="nm-banner-close" onclick="closeDossier()">✕</button>
      <div class="nm-dept-badge" id="nm-dept-badge"></div>
      <div class="nm-avatar" id="nm-avatar">?</div>
      <div class="nm-banner-info">
        <div class="nm-banner-name" id="nm-banner-name">—</div>
        <div class="nm-banner-ref"  id="nm-banner-ref">—</div>
        <div class="nm-action-pills" id="nm-action-pills"></div>
      </div>
    </div>

    <!-- CHIPS -->
    <div class="nm-chips" id="nm-chips"></div>

    <!-- AVAILABILITY GRID -->
    <div class="nm-avail-wrap" id="nm-avail-wrap" style="display:none">
      <div class="nm-avail-title">Disponibilidade semanal</div>
      <div class="nm-avail-grid" id="nm-avail-grid"></div>
      <div class="nm-avail-legend">
        <div class="nm-al-item"><div class="nm-al-dot" style="background:rgba(200,164,74,.38);border-radius:2px"></div>Pedido</div>
        <div class="nm-al-item"><div class="nm-al-dot" style="background:rgba(24,136,74,.40);border-radius:2px"></div>Confirmado</div>
      </div>
    </div>

    <!-- ACCORDION BODY -->
    <div class="nm-body" id="nm-body"></div>
  </div>
</div>
<div class="nm-toast" id="nm-toast"></div>
<input type="file" id="nm-file-inp" class="nm-file-inp" accept=".pdf,image/*"/>
`;

/* ── CONSTANTS ───────────────────────────────────────────────── */
const DS_DAYS      = ['SEG','TER','QUA','QUI','SEX','SÁB'];
const DS_DAY_PT    = {SEG:'Segunda',TER:'Terça',QUA:'Quarta',QUI:'Quinta',SEX:'Sexta',SÁB:'Sábado'};
const DS_HRS_MORN  = [8,9,10,11];
const DS_HRS_AFT   = [14,15,16,17,18,19,20];
const DS_ALL_HRS   = [...DS_HRS_MORN,...DS_HRS_AFT];
const DS_FLAGS     = {EN:'🇬🇧',PT:'🇵🇹',FR:'🇫🇷',ES:'🇪🇸',DE:'🇩🇪'};
const DS_COURSE_GRAD = {
  kids: 'linear-gradient(145deg,#88CECE,#5AACAC)',
  adults:'linear-gradient(145deg,#7090F8,#4868D8)',
  exam:  'linear-gradient(145deg,#D4A060,#B07830)',
};
const DS_COURSE_COL  = {kids:'#1D5E5E',adults:'#182080',exam:'#5A3000'};
const DS_COURSE_CHIP = {
  kids:  {col:'#1D7070',bg:'rgba(88,200,200,.18)',label:'Infantil / Juvenil'},
  adults:{col:'#183898',bg:'rgba(80,100,240,.18)', label:'Geral'},
  exam:  {col:'#704010',bg:'rgba(200,140,40,.18)',  label:'Exames'},
};
const DS_DAY_NUM     = {1:'SEG',2:'TER',3:'QUA',4:'QUI',5:'SEX',6:'SÁB'};
const DS_LANG_COL    = {EN:'#1850A0',FR:'#6820A0',PT:'#806010',ES:'#902010',DE:'#105040'};
const DS_LANG_BG     = {EN:'rgba(56,120,232,.16)',FR:'rgba(136,64,192,.16)',PT:'rgba(160,120,32,.16)',ES:'rgba(200,64,32,.14)',DE:'rgba(32,120,100,.14)'};

/* ── STATE ───────────────────────────────────────────────────── */
let DS_REF=null, DS_ROLE='staff';
let DS_ENROL=null, DS_REQ=null, DS_DOCS=[], DS_HIST=[];
let DS_UPLOAD_CTX=null;
let nm_toast_t=null;

/* ── INJECT ─────────────────────────────────────────────────── */
function nmInject(){
  if(document.getElementById('nm-overlay')) return;
  const s=document.createElement('style');
  s.textContent=DOSSIER_CSS;
  document.head.appendChild(s);
  const d=document.createElement('div');
  d.innerHTML=DOSSIER_HTML;
  while(d.firstElementChild) document.body.appendChild(d.firstElementChild);
  document.getElementById('nm-file-inp').addEventListener('change', nmOnFile);
}

/* ── OPEN ────────────────────────────────────────────────────── */
window.openDossier = async function(ref, role){
  nmInject();
  DS_REF=ref; DS_ROLE=role||'staff';
  DS_ENROL=null; DS_REQ=null; DS_DOCS=[]; DS_HIST=[];

  // Show immediately with skeleton state
  document.getElementById('nm-overlay').classList.add('open');
  nmRenderCover({name:ref,ref,lang:'EN',course:'adults',cefr:'A1',branch:'—'});
  document.getElementById('nm-body').innerHTML='';

  // Fetch in parallel
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

  // Resolve assigned turma from CELL_MAP (shared from main page)
  let turmaCode=null, turmaDay=null, turmaH=null;
  const CM=window.CELL_MAP||{};
  Object.entries(CM).forEach(([key,cell])=>{
    if(cell.studentRefs?.includes(ref)){
      turmaCode=cell.turmaCode;
      const parts=key.split('_');
      turmaDay=parts[0]; turmaH=parseInt(parts[1]||0);
    }
  });

  const course=nmInferCourse(DS_ENROL);
  const cefr=(DS_ENROL?.level_cefr||'A1').toUpperCase();
  const idPhoto=DS_DOCS.find(d=>d.document_type==='id_photo')?.public_url||null;

  nmRenderCover({
    name:DS_ENROL?.name||ref, ref,
    lang:DS_ENROL?.lang||'EN',
    course, cefr,
    branch:DS_ENROL?.branch||'—',
    phone:DS_ENROL?.phone||null,
    email:DS_ENROL?.email||null,
    status:DS_ENROL?.status||'—',
    turmaCode, turmaDay, turmaH,
    idPhoto,
  });

  nmRenderAvail(ref, course, turmaDay, turmaH);
  nmRenderAccordion(turmaCode, turmaDay, turmaH);
};

/* ── CLOSE ──────────────────────────────────────────────────── */
window.closeDossier = function(){
  const card=document.getElementById('nm-card');
  if(!card) return;
  card.classList.add('nm-exit');
  setTimeout(()=>{
    document.getElementById('nm-overlay')?.classList.remove('open');
    card.classList.remove('nm-exit');
  }, 230);
};

/* ── COVER ──────────────────────────────────────────────────── */
function nmRenderCover(d){
  const course=d.course||'adults';
  const lc=DS_COURSE_COL[course]||'#182080';
  const grad=DS_COURSE_GRAD[course]||DS_COURSE_GRAD.adults;
  const cc=DS_COURSE_CHIP[course]||DS_COURSE_CHIP.adults;
  const langCol=DS_LANG_COL[d.lang]||'#1850A0';
  const langBg=DS_LANG_BG[d.lang]||DS_LANG_BG.EN;

  document.getElementById('nm-banner-bg').style.background=grad;
  document.getElementById('nm-dept-badge').textContent=cc.label;
  document.getElementById('nm-dept-badge').style.color=lc;
  document.getElementById('nm-banner-name').textContent=d.name||d.ref||'—';
  document.getElementById('nm-banner-ref').textContent=
    `${d.ref} · ${(d.branch||'').replace(/_/g,' ')}`;

  // Avatar
  const av=document.getElementById('nm-avatar');
  if(d.idPhoto){
    av.innerHTML=`<img src="${d.idPhoto}" alt="${d.name}"/>`;
    av.style.background='transparent';
  } else {
    const col=nmAvCol(d.name||d.ref||'?');
    av.style.cssText=`background:${col.bg};color:${col.text};font-family:var(--nm-sans)`;
    av.textContent=(d.name||d.ref||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  }

  // ── BANNER ACTION PILLS ──
  // Context-aware: all 5 actions a staff member needs
  const pills=[
    {icon:'📋', label:'Matrícula',   action:`nmScrollTo('nm-pill-inscricao')`},
    {icon:'✉',  label:'Mensagem',    action:`nmSendMessage()`},
    {icon:'🗓', label:'Hor. Pedido', action:`nmScrollTo('nm-pill-pedido')`},
    {icon:'🔄', label:'Mover Nível', action:`nmScrollTo('nm-pill-mover')`},
    {icon:'🚩', label:'Sinalizar',   action:`nmScrollTo('nm-pill-notas')`},
  ];
  document.getElementById('nm-action-pills').innerHTML=pills.map(p=>
    `<button class="nm-ap" onclick="${p.action}">
      <span class="nm-ap-icon">${p.icon}</span>${p.label}
     </button>`
  ).join('');

  // ── CHIPS ──
  const lvl=nmDisplayLevel(d.cefr, course);
  const chips=[
    {label:lvl,             col:cc.col,     bg:cc.bg},
    {label:`${DS_FLAGS[d.lang]||''} ${d.lang}`, col:langCol, bg:langBg},
  ];
  if(d.turmaCode) chips.push({label:d.turmaCode, col:'#18884A', bg:'rgba(24,136,74,.14)'});
  chips.push({label:(d.branch||'Funchal').replace(/_/g,' '), col:'#5A5070', bg:'rgba(90,80,112,.10)'});
  document.getElementById('nm-chips').innerHTML=chips.map(c=>
    `<span class="nm-chip" style="color:${c.col};background:${c.bg}">${c.label}</span>`
  ).join('');

  // Status footer chip
  const statusEl=document.getElementById('nm-chips');
  // already rendered above
}

/* ── AVAILABILITY GRID ──────────────────────────────────────── */
function nmRenderAvail(ref, course, confDay, confH){
  const prefs=nmGetPrefs(ref, course);
  if(!prefs.length && !confDay){
    document.getElementById('nm-avail-wrap').style.display='none';
    return;
  }
  document.getElementById('nm-avail-wrap').style.display='block';
  const grid=document.getElementById('nm-avail-grid');

  // Header: corner + morning hours + gap + afternoon hours
  let html=`<div class="nm-ag-corner"></div>`;
  DS_HRS_MORN.forEach(h=>html+=`<div class="nm-ag-h">${h}</div>`);
  html+=`<div class="nm-ag-brk"></div>`;
  DS_HRS_AFT.forEach(h=>html+=`<div class="nm-ag-h">${h}</div>`);

  DS_DAYS.forEach(day=>{
    html+=`<div class="nm-ag-day">${day}</div>`;
    DS_HRS_MORN.forEach(h=>{
      const isConf=confDay===day&&confH===h;
      const isReq=prefs.some(p=>p.day===day&&p.h===h);
      html+=`<div class="nm-ag-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
    html+=`<div class="nm-ag-brk"></div>`;
    DS_HRS_AFT.forEach(h=>{
      const isConf=confDay===day&&confH===h;
      const isReq=prefs.some(p=>p.day===day&&p.h===h);
      html+=`<div class="nm-ag-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
  });
  grid.innerHTML=html;
}

/* ── ACCORDION BODY ─────────────────────────────────────────── */
function nmRenderAccordion(turmaCode, turmaDay, turmaH){
  const body=document.getElementById('nm-body');
  const course=nmInferCourse(DS_ENROL);
  const cefr=(DS_ENROL?.level_cefr||'A1').toUpperCase();
  const lvl=nmDisplayLevel(cefr,course);
  const prefs=nmGetPrefs(DS_REF, course);

  body.innerHTML=[
    nmPill('nm-pill-horario',  '🗓','Horário',      prefs.length?`${prefs.length} slots`:'Sem pedido',   nmBuildTimetable(prefs,turmaDay,turmaH)),
    nmPill('nm-pill-inscricao','📋','Inscrição',    DS_ENROL?'✓ Carregado':'—',                           nmBuildEnrol()),
    nmPill('nm-pill-pedido',   '📝','Pedido Horário',DS_REQ?'✓ Submetido':'Sem pedido',                   nmBuildRequest()),
    nmPill('nm-pill-historial','🎓','Historial',    DS_HIST.length?`${DS_HIST.length} anos`:'Em construção', nmBuildHistorial()),
    nmPill('nm-pill-docs',     '📎','Documentos',   DS_DOCS.length?`${DS_DOCS.length} ficheiros`:'Sem documentos', nmBuildDocs(DS_DOCS,'general')),
    nmPill('nm-pill-mover',    '🔄','Mover Aluno',  turmaCode||'Sem turma',                               nmBuildMove(turmaCode)),
    nmPill('nm-pill-notas',    '🚩','Notas & Alertas','',                                                  nmBuildNotes()),
    DS_ROLE!=='teacher'
      ? nmPill('nm-pill-pag','💳','Pagamento','Director / Secretaria',
          `<div class="nm-wip"><span class="nm-wip-icon">🔒</span>Módulo de pagamentos em desenvolvimento</div>`)
      : '',
  ].join('');

  // Toggle accordion
  body.querySelectorAll('.nm-pill-hdr').forEach(hdr=>{
    hdr.addEventListener('click',()=>hdr.classList.toggle('open'));
  });
}

function nmPill(id, icon, label, meta, content){
  return `<div class="nm-pill" id="${id}">
    <div class="nm-pill-hdr">
      <span class="nm-pill-icon">${icon}</span>
      <span class="nm-pill-label">${label}</span>
      <span class="nm-pill-meta">${meta}</span>
      <span class="nm-pill-chv">›</span>
    </div>
    <div class="nm-pill-body">${content}</div>
  </div>`;
}

/* ── SCROLL TO PILL ─────────────────────────────────────────── */
window.nmScrollTo = function(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.querySelector('.nm-pill-hdr')?.classList.add('open');
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}), 80);
};

/* ── SEND MESSAGE ───────────────────────────────────────────── */
window.nmSendMessage = function(){
  const email=DS_ENROL?.email;
  const phone=DS_ENROL?.phone;
  if(email) window.open(`mailto:${email}`,'_blank');
  else if(phone) window.open(`tel:${phone}`,'_blank');
  else nmToast('Sem contacto registado','warn');
};

/* ── TIMETABLE SECTION ──────────────────────────────────────── */
function nmBuildTimetable(prefs, confDay, confH){
  const hCols=DS_ALL_HRS.length;
  let html=`<div class="nm-tt"><div class="nm-tt-grid" style="grid-template-columns:26px repeat(${hCols},1fr);grid-template-rows:14px repeat(6,14px)">`;
  html+=`<div class="nm-tt-corner"></div>`;
  DS_ALL_HRS.forEach((h,i)=>{
    const isBrk=i===DS_HRS_MORN.length;
    html+=`<div class="nm-tt-h${isBrk?' brk':''}">${h}</div>`;
  });
  DS_DAYS.forEach(day=>{
    html+=`<div class="nm-tt-day">${day}</div>`;
    DS_ALL_HRS.forEach(h=>{
      const isConf=confDay===day&&confH===h;
      const isReq =prefs.some(p=>p.day===day&&p.h===h);
      html+=`<div class="nm-tt-cell${isConf?' conf':isReq?' req':''}"></div>`;
    });
  });
  html+=`</div>
  <div class="nm-tt-legend">
    <div class="nm-tt-leg"><div class="nm-tt-leg-dot" style="background:rgba(24,136,74,.32);border:.5px solid rgba(24,136,74,.55)"></div>Confirmado</div>
    <div class="nm-tt-leg"><div class="nm-tt-leg-dot" style="background:rgba(200,164,74,.28);border:.5px solid rgba(200,164,74,.45)"></div>Pedido</div>
  </div></div>`;
  return html;
}

/* ── ENROLMENT ──────────────────────────────────────────────── */
function nmBuildEnrol(){
  if(!DS_ENROL) return `<div class="nm-wip"><span class="nm-wip-icon">⚠️</span>Matrícula não encontrada no sistema.</div>`;
  const e=DS_ENROL;
  const course=nmInferCourse(e);
  const lvl=nmDisplayLevel((e.level_cefr||'A1').toUpperCase(),course);
  const deptLabel=course==='kids'?'Juvenil':course==='exam'?'Exames':'Geral';
  return [
    ['Ref. ALM',     e.ref||'—',                                              'hi'],
    ['Nome',         e.name||'—',                                             ''],
    ['Nível',        lvl,                                                     'hi'],
    ['Departamento', deptLabel,                                               ''],
    ['Filial',       (e.branch||'—').replace(/_/g,' '),                      ''],
    ['Língua',       `${DS_FLAGS[e.lang]||''} ${e.lang||'—'}`,               ''],
    ['Estado',       e.status==='active'?'✓ Activo':e.status||'—',           e.status==='active'?'ok':'warn'],
    ['Email',        e.email||'—',                                            ''],
    ['Telefone',     e.phone||'—',                                            ''],
  ].map(([k,v,c])=>nmRow(k,v,c)).join('');
}

/* ── SCHEDULE REQUEST ───────────────────────────────────────── */
function nmBuildRequest(){
  if(!DS_REQ) return `<div class="nm-wip"><span class="nm-wip-icon">📭</span>Nenhum pedido de horário submetido ainda.</div>`;
  const r=DS_REQ;
  let slots=[];
  try{const dp=typeof r.day_preferences==='string'?JSON.parse(r.day_preferences):r.day_preferences;if(Array.isArray(dp))slots=dp;}catch(e){}
  const pills=slots.map((s,i)=>{
    const day=s.day_name||(DS_DAY_NUM[s.day]||`Dia ${s.day}`);
    const start=s.session_start||s.start_time||(s.hour?`${s.hour}:00`:'—');
    const type=s.type==='availability'?'disponível':i===0?'★ pref':'↩ alt';
    return `<span class="nm-slot-pill"><span class="nm-slot-day">${day}</span><span>${start}</span><span class="nm-slot-type">${type}</span></span>`;
  }).join('');
  const dateStr=r.created_at?new Date(r.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'}):'—';
  return [
    ['Slots',        pills||'—',                                              ''],
    ['Modo',         r.mode_used==='avail'?'Disponibilidade':'Preferência',   'hi'],
    ['Sessões/sem',  r.sessions_per_week||'—',                               'hi'],
    ['Submetido',    `${dateStr} · 🔒 Imutável`,                             ''],
    r.notes?['Nota',r.notes,'']:null,
    ['Foto de ID',   r.has_id_photo?'✓ Enviada':'—',                         r.has_id_photo?'ok':''],
    ['Hor. Escolar', r.has_school_timetable?'✓ Enviado':'—',                 r.has_school_timetable?'ok':''],
  ].filter(Boolean).map(([k,v,c])=>nmRow(k,v,c)).join('');
}

/* ── HISTORIAL ──────────────────────────────────────────────── */
function nmBuildHistorial(){
  if(!DS_HIST.length) return `<div class="nm-wip"><span class="nm-wip-icon">🏗️</span>Historial académico em construção.</div>
    <div class="nm-action-row">
      <button class="nm-btn ghost" onclick="nmToast('Adicionar ano — módulo em desenvolvimento','warn')">+ Adicionar ano lectivo</button>
    </div>`;
  let html='';
  DS_HIST.forEach(yr=>{
    const cls=yr.outcome==='aprovado'?'ok':yr.outcome==='reprovado'?'warn':'na';
    const lbl=yr.outcome==='aprovado'?'✓ Aprovado':yr.outcome==='reprovado'?'✗ Reprovado':yr.outcome||'Em curso';
    const has=yr.cambridge_r||yr.cambridge_w||yr.cambridge_l||yr.cambridge_s||yr.cambridge_uoe;
    html+=`<div class="nm-hist-yr">
      <div class="nm-hist-hdr" onclick="this.classList.toggle('open')">
        <span class="nm-hist-year-lbl">${yr.academic_year}</span>
        <span class="nm-hist-turma">${yr.turma_code||'—'} · ${yr.level_display||'—'}</span>
        <span class="nm-hist-outcome ${cls}">${lbl}</span>
      </div>
      <div class="nm-hist-body">
        ${has?`<div class="nm-camb-grid">${[['R',yr.cambridge_r],['W',yr.cambridge_w],['L',yr.cambridge_l],['S',yr.cambridge_s],['UoE',yr.cambridge_uoe]].map(([l,sc])=>`
          <div class="nm-camb-cell ${sc>=60?'pass':sc>0?'fail':''}">
            <div class="nm-camb-score">${sc||'—'}</div>
            <div class="nm-camb-lbl">${l}</div>
          </div>`).join('')}</div>`:''}
        ${[
          yr.grade_final!=null?['Nota final',yr.grade_final+'%','hi']:null,
          yr.absences!=null?['Faltas',yr.absences,'']:null,
          yr.notes?['Notas',yr.notes,'']:null,
        ].filter(Boolean).map(([k,v,c])=>nmRow(k,v,c)).join('')}
        <div class="nm-action-row">
          <button class="nm-btn ghost" onclick="nmTriggerUpload('historial_exam','${yr.academic_year}')">+ Adicionar PDF</button>
        </div>
      </div>
    </div>`;
  });
  html+=`<div class="nm-action-row">
    <button class="nm-btn ghost" onclick="nmToast('Adicionar ano — módulo em desenvolvimento','warn')">+ Adicionar ano lectivo</button>
  </div>`;
  return html;
}

/* ── DOCUMENTS ──────────────────────────────────────────────── */
function nmBuildDocs(docs, context){
  const iconMap={id_photo:'🪪',school_timetable:'🏫',historial_exam:'📄',historial_report:'📋',historial_cambridge:'🎓',general:'📁'};
  let html='';
  if(docs.length){
    html+=`<div class="nm-doc-list">`;
    docs.forEach(d=>{
      const icon=iconMap[d.document_type]||'📁';
      const name=d.notes||d.document_type||'Documento';
      const date=d.uploaded_at?new Date(d.uploaded_at).toLocaleDateString('pt-PT'):'';
      const isPdf=d.storage_path?.endsWith('.pdf');
      html+=`<div class="nm-doc-row">
        <div class="nm-doc-icon">${icon}</div>
        <div class="nm-doc-info">
          <div class="nm-doc-name">${name}</div>
          <div class="nm-doc-meta">${d.document_type} · ${date} · ${d.uploaded_by||'—'}</div>
        </div>
        <div class="nm-doc-btns">
          ${d.public_url?`<button class="nm-doc-btn view" onclick="nmViewDoc('${d.public_url}','${isPdf?'pdf':'img'}')">${isPdf?'PDF':'Ver'}</button>`:''}
          <button class="nm-doc-btn del"  onclick="nmDeleteDoc('${d.id}','${d.storage_path||''}')">✕</button>
        </div>
      </div>`;
    });
    html+=`</div>`;
  }
  if(context!=='historial'){
    html+=`<div class="nm-upload-zone" onclick="nmTriggerUpload('general',null)">
      <span style="font-size:20px;display:block;margin-bottom:4px;opacity:.4">📎</span>
      <span class="nm-upload-lbl">Clique para adicionar documento ou PDF</span>
    </div>`;
  }
  return html;
}

/* ── MOVE ───────────────────────────────────────────────────── */
function nmBuildMove(currentCode){
  // Pull available turmas from CELL_MAP excluding current
  const CM=window.CELL_MAP||{};
  const codes=Object.values(CM)
    .map(c=>c.turmaCode)
    .filter(c=>c&&c!==currentCode);
  return `${nmRow('Turma actual',currentCode||'Sem turma','hi')}
  <div style="margin-top:10px">
    <div style="font-family:var(--nm-mono);font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nm-text3);margin-bottom:6px">Mover para</div>
    <select class="nm-select" id="nm-move-sel">
      <option value="">— escolher turma destino —</option>
      ${codes.map(c=>`<option value="${c}">${c}</option>`).join('')}
    </select>
    <div class="nm-action-row">
      <button class="nm-btn primary"  onclick="nmDoMove()">✓ Mover</button>
      ${currentCode?`<button class="nm-btn danger" onclick="nmDoRemove('${currentCode}')">✕ Remover da turma</button>`:''}
    </div>
  </div>`;
}

/* ── NOTES ──────────────────────────────────────────────────── */
function nmBuildNotes(){
  return `<div class="nm-flag-chips">
    <div class="nm-flag-chip" onclick="this.classList.toggle('on')">Comportamento</div>
    <div class="nm-flag-chip" onclick="this.classList.toggle('on')">Pagamento pendente</div>
    <div class="nm-flag-chip" onclick="this.classList.toggle('on')">Baixo desempenho</div>
    <div class="nm-flag-chip" onclick="this.classList.toggle('on')">Excesso de faltas</div>
    <div class="nm-flag-chip" onclick="this.classList.toggle('on')">Necessidade especial</div>
  </div>
  <textarea class="nm-note-add" id="nm-note-add" placeholder="Adicionar nota (visível para toda a equipa)…"></textarea>
  <div class="nm-action-row">
    <button class="nm-btn primary" onclick="nmSaveNote()">✓ Guardar nota</button>
  </div>`;
}

/* ── ACTIONS ────────────────────────────────────────────────── */
window.nmDoMove = function(){
  const code=document.getElementById('nm-move-sel')?.value;
  if(!code){nmToast('Escolha uma turma destino','warn');return;}
  if(window.moveStudent) window.moveStudent(DS_REF,code);
  else nmToast(`Mover para ${code} — use a página de atribuição`,'warn');
};
window.nmDoRemove = function(code){
  if(!confirm(`Remover ${DS_REF} de ${code}?`)) return;
  if(window.removeFromTurma) window.removeFromTurma(DS_REF,code);
  else nmToast('Remover — use a página de atribuição','warn');
};
window.nmSaveNote = function(){
  const txt=document.getElementById('nm-note-add')?.value?.trim();
  if(!txt){nmToast('Escreva uma nota primeiro','warn');return;}
  nmToast('Nota guardada ✓','ok');
  document.getElementById('nm-note-add').value='';
};

/* ── UPLOAD ─────────────────────────────────────────────────── */
window.nmTriggerUpload = function(docType, year){
  DS_UPLOAD_CTX={docType,year};
  document.getElementById('nm-file-inp')?.click();
};
async function nmOnFile(e){
  const file=e.target.files[0]; if(!file) return;
  const ctx=DS_UPLOAD_CTX; if(!ctx) return;
  nmToast('A enviar…','ok');
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
    nmToast('Documento enviado ✓','ok');
    setTimeout(()=>openDossier(DS_REF,DS_ROLE),700);
  }catch(err){
    console.error('[ALM Dossier] Upload error',err);
    nmToast('Erro no envio','err');
  }
  e.target.value='';
}

/* ── DELETE DOC ─────────────────────────────────────────────── */
window.nmDeleteDoc = async function(docId, storagePath){
  if(!confirm('Remover este documento?')) return;
  const BASE=window.SB||'https://oapygbeliocdvitbdjbq.supabase.co';
  const KEY=window.KEY||'';
  const H={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
  try{
    await fetch(`${BASE}/rest/v1/student_documents?id=eq.${docId}`,{method:'DELETE',headers:H});
    if(storagePath) await fetch(`${BASE}/storage/v1/object/alm-student-documents/${storagePath}`,{method:'DELETE',headers:H});
    nmToast('Removido ✓','ok');
    setTimeout(()=>openDossier(DS_REF,DS_ROLE),600);
  }catch(err){ nmToast('Erro ao remover','err'); }
};

/* ── VIEW DOC ───────────────────────────────────────────────── */
window.nmViewDoc = function(url, type){
  const w=window.open('','_blank','width=900,height=700');
  if(type==='pdf')
    w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0;background:#08070F}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe src="${url}"></iframe></body></html>`);
  else
    w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0;background:#08070F;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:95vw;max-height:95vh}</style></head><body><img src="${url}"/></body></html>`);
  w.document.close();
};

/* ── HELPERS ────────────────────────────────────────────────── */
function nmRow(k,v,c){
  return `<div class="nm-data-row"><div class="nm-dk">${k}</div><div class="nm-dv ${c||''}">${v}</div></div>`;
}
function nmInferCourse(e){
  if(!e) return 'adults';
  const str=[e.family,e.course,e.department,e.level_cefr,e.notes].filter(Boolean).join(' ').toLowerCase();
  if(/exam|exame/.test(str)) return 'exam';
  if(/kid|juven|junior|infant|prep/.test(str)) return 'kids';
  return 'adults';
}
function nmDisplayLevel(cefr,course){
  const map={kids:{A1:'PI-a1',A2:'PI-a2',B1:'Pj1',B2:'Pj2',C1:'Pj3'},
             adults:{A1:'1º Ano',A2:'2º Ano',B1:'3º Ano',B2:'4º Ano',C1:'5º Ano',C2:'6º Ano'},
             exam:{B1:'4º Ano',B2:'6º Ano',C1:'7º Ano',C2:'8º Ano'}};
  return map[course]?.[cefr]||cefr;
}
function nmGetPrefs(ref, course){
  const r=(window.RMAP||{})[ref]; if(!r) return [];
  // day_preferences first (canonical)
  if(r.day_preferences){
    try{
      const dp=typeof r.day_preferences==='string'?JSON.parse(r.day_preferences):r.day_preferences;
      if(Array.isArray(dp)&&dp.length)
        return dp.map(p=>({day:DS_DAY_NUM[p.day]||(p.day_name?p.day_name.slice(0,3).toUpperCase():null),h:parseInt(p.session_start||p.hour||9)})).filter(p=>p.day);
    }catch(e){}
  }
  // fallback: availability map
  if(r.availability){
    try{
      const av=typeof r.availability==='string'?JSON.parse(r.availability):r.availability;
      return Object.keys(av).filter(k=>av[k]).map(k=>{const[di,h]=k.split('_').map(Number);return{day:DS_DAY_NUM[di+1]||null,h};}).filter(p=>p.day);
    }catch(e){}
  }
  return [];
}
function nmAvCol(name){
  let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))&0xffffffff;
  const p=[{bg:'#EAC8D8',text:'#7A1840'},{bg:'#C8D8EC',text:'#143870'},{bg:'#C8ECD8',text:'#145830'},{bg:'#DCC8EC',text:'#481890'},{bg:'#ECDCC8',text:'#784010'},{bg:'#C8ECE8',text:'#145850'}];
  return p[Math.abs(h)%p.length];
}
function nmToast(msg,type='ok'){
  const t=document.getElementById('nm-toast');if(!t)return;
  t.textContent=msg;t.className='nm-toast '+type+' show';
  clearTimeout(nm_toast_t);nm_toast_t=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ── KEYBOARD ───────────────────────────────────────────────── */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('nm-overlay')?.classList.contains('open'))
    closeDossier();
});

/* ── BACKWARD COMPAT ─────────────────────────────────────────── */
// Keep old ds-toast + ds-overlay references alive so nothing breaks
// if any other page code calls closeDossier() or checks ds-overlay
window.closeDossier = window.closeDossier || (()=>{
  document.getElementById('nm-overlay')?.classList.remove('open');
});

console.log('[ALM Dossier v4] Neumorphic engine loaded ✓');
})();
