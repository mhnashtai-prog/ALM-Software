/* ═══════════════════════════════════════════════════════════════════════════
   ALM DESIGN SYSTEM  —  alm-design-system.js
   Version: 1.0  |  2026-05-04
   Author:  ALM Dev
   ───────────────────────────────────────────────────────────────────────────

   PURPOSE
   ───────
   Single source of truth for ALL modal card UI across the ALM admin suite.
   Import this one file in every admin page. Never re-implement these cards
   inline — always call the three public functions below.

   THE THREE MODAL CARDS  (do not add a fourth without updating this file)
   ───────────────────────────────────────────────────────────────────────
   1. openDossier(ref)
        Student dossier. Opens when clicking a student anywhere in the app.
        Shows: hero identity, timetable grid (open by default — "the X-ray"),
        placement status, collapsible sections (Inscrição, Historial, Notas).
        The timetable is ALWAYS the first visible thing — this is intentional.

   2. openMudarTurma(ref, boxes)
        2-click group-change flow. Opens from the ⇄ button on any student row
        or from the dossier action bar.
        Shows: hero identity, tile list of available groups at the same level,
        confirm button (dead until a tile is selected — prevents accidents).
        Compatible groups are highlighted with a green left-edge stripe.

   3. openGroupList(boxId, boxes)
        Full student list for a single turma. Opens when clicking "VER" on a
        confirmed group card, or from the triage panel.
        Shows: hero with group code + capacity counter, student rows with
        inline ⇄ Mudar and ↗ dossier buttons.

   DESIGN RULES  (read before touching any CSS in this file)
   ──────────────────────────────────────────────────────────
   • Same hero zone across all three: gradient bg + wave SVG + floating avatar
   • Same badge row below every hero
   • Same section label style: 7.5px gold caps + hairline
   • Same footer button: full-width, 46px, border-radius 11px
   • Same card width: 360px (desktop), min(360px, 96vw) (mobile)
   • Same border-radius: 18px on the card shell
   • Dept gradient colours are defined in DEPT_GRADS — do not hardcode elsewhere
   • Colour palette lives in CSS :root — use var(--x), never hex in component code
   • Font stack: Syne (display/names) + IBM Plex Mono (refs/labels) + IBM Plex Sans (body)

   ADDING A NEW CARD
   ─────────────────
   If a genuine fourth card is needed, discuss with the team first. It MUST:
   - Share the same hero + badge row + footer anatomy
   - Use DEPT_GRADS for background
   - Be registered in this file with a named public function
   - Replace any inline implementation in all pages

   USAGE
   ─────
   In any admin HTML page, before closing </body>:

     <script src="/admin/alm-design-system.js"></script>

   Then call:

     openDossier('ALM-1007');
     openMudarTurma('ALM-1007', window._boxes);
     openGroupList('FUNCHAL|adults|A1|QW|manha|01', window._boxes);

   The file self-injects its CSS and HTML once, on first call.
   Subsequent calls on the same page reuse the already-injected DOM.

   DEPENDENCIES
   ────────────
   Expects on window:
     window.SB   — Supabase base URL
     window.KEY  — Supabase anon key
     window.AY   — Academic year string, e.g. '2026/2027'

   Google Fonts loaded via @import inside the injected <style>.
   No other external dependencies.

═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     CONSTANTS & PALETTE
  ───────────────────────────────────────────── */

  const AY = window.AY || '2026/2027';

  /* Department hero gradients — one per dept, used in all three cards */
  const DEPT_GRADS = {
    kids:     'linear-gradient(145deg,#1A3A6A,#0D2248)',
    kids_juv: 'linear-gradient(145deg,#0D4A3A,#062A20)',
    adults:   'linear-gradient(145deg,#3A2A10,#201408)',
    exam:     'linear-gradient(145deg,#3A1A3A,#200D20)',
    sinal:    'linear-gradient(145deg,#3A1A0A,#200A04)',
    infantil: 'linear-gradient(160deg,#6B2038,#3A0E1E)',
  };

  /* Department accent colours — used for avatar text, code labels */
  const DEPT_ACCENTS = {
    kids:     '#6AABFF',
    kids_juv: '#3DE8A8',
    adults:   '#F5C050',
    exam:     '#C8A0E0',
    sinal:    '#F5A020',
    infantil: '#FF8FA0',
  };

  /* Avatar colour pool — deterministic from name hash */
  const AV_POOL = [
    { bg: '#3A2244', text: '#C8A0E0' },
    { bg: '#1E2E50', text: '#7AABEE' },
    { bg: '#1A3A2A', text: '#5EC888' },
    { bg: '#3A2A14', text: '#D4944A' },
    { bg: '#3A1A1A', text: '#E07878' },
    { bg: '#1A2A3A', text: '#5A9EC8' },
    { bg: '#282838', text: '#9898D8' },
    { bg: '#2A3820', text: '#80B850' },
  ];

  const MAX_G = 17;
  const FLAGS = { EN: '🇬🇧', PT: '🇵🇹', FR: '🇫🇷', ES: '🇪🇸', DE: '🇩🇪' };

  const LEVEL_MAP = {
    'kids|A1':     { dept: 'kids',     label: 'PI-a1', order: 1 },
    'kids|A2':     { dept: 'kids',     label: 'PI-a2', order: 2 },
    'kids|B1':     { dept: 'kids',     label: 'PI-a3', order: 3 },
    'kids|B2':     { dept: 'kids',     label: 'PI-a4', order: 4 },
    'kids_juv|A1': { dept: 'kids_juv', label: 'PJ1',   order: 5 },
    'kids_juv|A2': { dept: 'kids_juv', label: 'PJ2',   order: 6 },
    'kids_juv|B1': { dept: 'kids_juv', label: 'PJ3',   order: 7 },
    'adults|A1':   { dept: 'adults',   label: '1º Ano', order: 8 },
    'adults|A2':   { dept: 'adults',   label: '2º Ano', order: 9 },
    'adults|B1':   { dept: 'adults',   label: '3º Ano', order: 10 },
    'adults|B2':   { dept: 'adults',   label: '4º Ano', order: 11 },
    'adults|C1':   { dept: 'adults',   label: '5º Ano', order: 12 },
    'adults|C2':   { dept: 'adults',   label: '5º+',    order: 13 },
    'exam|B2':     { dept: 'exam',     label: '6º B2',  order: 14 },
    'exam|C1':     { dept: 'exam',     label: '7º C1',  order: 15 },
    'exam|C2':     { dept: 'exam',     label: '8º C2',  order: 16 },
  };

  const DAYS_PT = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const HRS_MORN = [8, 9, 10, 11];
  const HRS_AFT  = [14, 15, 16, 17, 18, 19, 20];

  const DAY_IDX = {
    monday:0, tuesday:1, wednesday:2, thursday:3, friday:4, saturday:5,
    mon:0, tue:1, wed:2, thu:3, fri:4, sat:5,
    seg:0, ter:1, qua:2, qui:3, sex:4, sab:5, 'sáb':5,
    segunda:0, terca:1, 'terça':1, quarta:2, quinta:3, sexta:4, sabado:5,
  };

  /* ─────────────────────────────────────────────
     SHARED CSS  — injected once into <head>
     All three cards share these variables and
     component classes. Never split this into
     per-card stylesheets — that causes drift.
  ───────────────────────────────────────────── */

  const SHARED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

/* ── Design tokens ── */
:root {
  --alm-gold:    #C9A84C;
  --alm-gold2:   #E8C97A;
  --alm-gold3:   rgba(201,168,76,.13);
  --alm-green:   #1DB87A;
  --alm-green-a: rgba(29,184,122,.14);
  --alm-green-b: rgba(29,184,122,.35);
  --alm-amber:   #E8A020;
  --alm-amber-a: rgba(232,160,32,.13);
  --alm-amber-b: rgba(232,160,32,.32);
  --alm-red:     #E8455A;
  --alm-red-a:   rgba(232,69,90,.12);
  --alm-red-b:   rgba(232,69,90,.30);
  --alm-blue:    #4A8FF5;
  --alm-card:    #0E0C1C;
  --alm-surf:    rgba(255,255,255,.03);
  --alm-surf2:   rgba(255,255,255,.055);
  --alm-b:       rgba(255,255,255,.065);
  --alm-b2:      rgba(255,255,255,.11);
  --alm-t:       rgba(238,218,168,.93);
  --alm-t2:      rgba(210,188,140,.55);
  --alm-t3:      rgba(210,188,140,.25);
  --alm-mono:    'IBM Plex Mono', monospace;
  --alm-sans:    'IBM Plex Sans', sans-serif;
  --alm-display: 'Syne', sans-serif;
  --alm-r:       18px;
}

/* ── Overlay backdrop (shared by all three cards) ── */
.alm-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(2,1,8,.78);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.alm-overlay.open {
  display: flex;
  animation: almOverlayIn .2s cubic-bezier(.32,.72,0,1);
}
@keyframes almOverlayIn {
  from { opacity:0 }
  to   { opacity:1 }
}

/* ── Card shell (shared) ── */
.alm-card {
  width: min(360px, 96vw);
  border-radius: var(--alm-r);
  overflow: hidden;
  background: var(--alm-card);
  border: 1px solid var(--alm-b2);
  box-shadow: 0 32px 80px rgba(0,0,0,.88);
  display: flex;
  flex-direction: column;
  animation: almCardIn .28s cubic-bezier(.32,.72,0,1);
  position: relative;
  max-height: 92dvh;
}
/* Dossier is wider — more information to show */
.alm-card.alm-card-wide {
  width: min(460px, 96vw);
}
@keyframes almCardIn {
  from { opacity:0; transform: translateY(22px) scale(.95) }
  to   { opacity:1; transform: none }
}

/* ── Hero (shared by all three) ── */
.alm-hero {
  position: relative;
  height: 130px;
  overflow: hidden;
  flex-shrink: 0;
}
.alm-hero-bg {
  position: absolute;
  inset: 0;
  transition: background .3s;
}
.alm-hero-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.62) 100%);
}
.alm-hero-close {
  position: absolute;
  top: 12px; right: 12px;
  z-index: 10;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(0,0,0,.4);
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,.6);
  font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--alm-sans);
  transition: background .14s;
}
.alm-hero-close:hover { background: rgba(232,69,90,.45); color: #fff; }

.alm-hero-tag {
  position: absolute;
  top: 13px; left: 16px;
  z-index: 10;
  font-family: var(--alm-mono);
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: rgba(255,255,255,.28);
}
.alm-hero-wave {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  z-index: 7;
  display: block;
}
.alm-hero-identity {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 8;
  padding: 0 16px 15px;
  display: flex;
  align-items: flex-end;
  gap: 13px;
}
.alm-av {
  width: 52px; height: 52px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--alm-display);
  font-size: 17px; font-weight: 700;
  flex-shrink: 0;
  border: 2.5px solid rgba(255,255,255,.14);
  box-shadow: 0 4px 24px rgba(0,0,0,.6);
  transition: transform .2s;
}
.alm-av:hover { transform: scale(1.06); }
.alm-hero-text { flex: 1; min-width: 0; }
.alm-hero-name {
  font-family: var(--alm-display);
  font-size: 19px; font-weight: 800;
  color: #fff;
  line-height: 1.15;
  text-shadow: 0 2px 8px rgba(0,0,0,.6);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.alm-hero-sub {
  font-size: 9.5px;
  color: rgba(255,255,255,.42);
  margin-top: 3px;
  font-family: var(--alm-mono);
  letter-spacing: .05em;
}

/* ── Badge row (shared) ── */
.alm-badges {
  display: flex;
  gap: 5px;
  padding: 11px 14px 10px;
  border-bottom: 1px solid var(--alm-b);
  flex-wrap: wrap;
  flex-shrink: 0;
}
.alm-badge {
  font-size: 8px; font-weight: 700;
  padding: 3px 11px;
  border-radius: 99px;
  border: .5px solid;
  letter-spacing: .06em;
  font-family: var(--alm-mono);
}

/* ── Section label (shared) ── */
.alm-sec-label {
  font-size: 7.5px; font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--alm-gold);
  display: flex; align-items: center; gap: 9px;
  font-family: var(--alm-mono);
  margin: 14px 14px 10px;
}
.alm-sec-label::before,
.alm-sec-label::after {
  content: '';
  flex: 1;
  height: .5px;
  background: rgba(201,168,76,.12);
}
.alm-sec-label.no-before::before { display: none; }

/* ── Footer action bar (shared) ── */
.alm-foot {
  padding: 12px 14px;
  border-top: 1px solid var(--alm-b);
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}
.alm-btn {
  height: 46px;
  border: none;
  border-radius: 11px;
  font-family: var(--alm-mono);
  font-size: 11px; font-weight: 700;
  letter-spacing: .12em;
  cursor: pointer;
  transition: all .22s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.alm-btn-primary {
  flex: 1;
  background: rgba(201,168,76,.92);
  color: #07060E;
}
.alm-btn-primary:hover  { background: var(--alm-gold2); transform: translateY(-1px); }
.alm-btn-primary:active { transform: scale(.98); }
.alm-btn-primary:disabled {
  background: rgba(255,255,255,.04);
  border: 1px solid var(--alm-b);
  color: var(--alm-t3);
  cursor: default;
  transform: none;
}
.alm-btn-ghost {
  padding: 0 16px;
  background: transparent;
  border: .5px solid var(--alm-b2);
  color: var(--alm-t2);
}
.alm-btn-ghost:hover { background: var(--alm-surf2); color: var(--alm-t); }
.alm-btn-created {
  flex: 1;
  background: #0A3320;
  color: var(--alm-green);
  cursor: default;
}

/* ── Scrollable body ── */
.alm-body {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.08) transparent;
}

/* ─────────────────────────────────────────────
   CARD 1 — DOSSIER
   The "X-ray" card. Timetable grid is always
   open. Everything else is collapsible below.
───────────────────────────────────────────── */

/* Timetable grid */
.alm-tgrid-wrap { padding: 12px 14px 14px; }
.alm-tgrid-hdr {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.alm-tgrid {
  display: grid;
  grid-template-columns: 32px repeat(12, 1fr);
  gap: 2px;
}
.alm-tg-h {
  font-size: 7.5px; color: var(--alm-t3);
  text-align: center; padding-bottom: 3px;
  font-family: var(--alm-mono);
}
.alm-tg-day {
  font-size: 8px; font-weight: 700;
  color: var(--alm-t2);
  display: flex; align-items: center;
  letter-spacing: .04em;
  padding-right: 4px;
  justify-content: flex-end;
  font-family: var(--alm-mono);
}
.alm-tg-cell {
  height: 22px; border-radius: 3px;
  background: rgba(255,255,255,.025);
  border: .5px solid rgba(255,255,255,.04);
  position: relative;
}
.alm-tg-gap { background: transparent; border-color: transparent; }
.alm-tg-empty  { background: rgba(255,255,255,.025); border-color: rgba(255,255,255,.04); }
.alm-tg-green  { background: var(--alm-green-a); border-color: var(--alm-green-b); }
.alm-tg-amber  { background: var(--alm-amber-a); border-color: var(--alm-amber-b); }
.alm-tg-red    { background: var(--alm-red-a);   border-color: var(--alm-red-b); }
.alm-tg-lbl {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 7px; font-weight: 700;
  font-family: var(--alm-mono);
}
.alm-tg-green .alm-tg-lbl { color: var(--alm-green); }
.alm-tg-amber .alm-tg-lbl { color: var(--alm-amber); }
.alm-tg-red   .alm-tg-lbl { color: var(--alm-red); }

/* Grid legend */
.alm-tg-legend {
  display: flex; gap: 12px; margin-top: 8px; padding: 0 0 4px;
}
.alm-tg-leg {
  display: flex; align-items: center; gap: 4px;
  font-size: 8px; color: var(--alm-t3);
  font-family: var(--alm-mono);
}
.alm-tg-leg-dot {
  width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0;
}

/* Slot pills */
.alm-slots { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 14px 10px; }
.alm-slot {
  font-size: 9px; padding: 4px 12px;
  border-radius: 5px; border: 1px solid;
  font-family: var(--alm-mono); font-weight: 600;
}
.alm-slot-green { background: var(--alm-green-a); border-color: var(--alm-green-b); color: var(--alm-green); }
.alm-slot-amber { background: var(--alm-amber-a); border-color: var(--alm-amber-b); color: var(--alm-amber); }
.alm-slot-red   { background: var(--alm-red-a);   border-color: var(--alm-red-b);   color: var(--alm-red); }

/* Placement box */
.alm-placement {
  margin: 0 14px 12px;
  border-radius: 11px; border: 1px solid;
  padding: 11px 14px;
  display: flex; align-items: center; gap: 12px;
}
.alm-pl-placed  { border-color: rgba(29,184,122,.35); background: rgba(29,184,122,.05); }
.alm-pl-pending { border-color: rgba(232,160,32,.30); background: rgba(232,160,32,.04); }
.alm-pl-empty   { border-color: rgba(232,69,90,.25);  background: rgba(232,69,90,.04); }
.alm-pl-code {
  font-family: var(--alm-display);
  font-size: 26px; letter-spacing: 3px;
  line-height: 1; flex-shrink: 0; min-width: 72px;
}
.alm-pl-placed  .alm-pl-code { color: var(--alm-green); }
.alm-pl-pending .alm-pl-code { color: var(--alm-amber); }
.alm-pl-empty   .alm-pl-code { color: var(--alm-red); }
.alm-pl-detail { flex: 1; min-width: 0; }
.alm-pl-sched  { font-size: 11px; font-weight: 600; color: var(--alm-t); line-height: 1.3; }
.alm-pl-meta   { font-size: 9px; color: var(--alm-t2); margin-top: 3px; }
.alm-pl-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Collapsible accordion sections */
.alm-acc { border-top: 1px solid var(--alm-b); }
.alm-acc-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer;
  transition: background .1s; user-select: none;
}
.alm-acc-hdr:hover { background: var(--alm-surf); }
.alm-acc-left  { display: flex; align-items: center; gap: 8px; }
.alm-acc-icon  { font-size: 12px; opacity: .75; }
.alm-acc-label {
  font-size: 9px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--alm-t);
}
.alm-acc-right { display: flex; align-items: center; gap: 8px; }
.alm-acc-meta  { font-size: 8px; color: var(--alm-t3); }
.alm-acc-chv   {
  font-size: 9px; color: var(--alm-t3);
  transition: transform .16s; margin-left: 4px;
}
.alm-acc-hdr.open .alm-acc-chv { transform: rotate(90deg); }
.alm-acc-body  { display: none; padding: 6px 14px 14px; }
.alm-acc-hdr.open + .alm-acc-body { display: block; }
.alm-acc-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 5px 0; border-bottom: .5px solid rgba(201,168,76,.04);
}
.alm-acc-row:last-child { border-bottom: none; }
.alm-acc-k {
  color: var(--alm-t2); font-size: 8px;
  letter-spacing: .06em; text-transform: uppercase;
  font-family: var(--alm-mono);
}
.alm-acc-v       { color: var(--alm-t); font-size: 10px; font-weight: 500; }
.alm-acc-v.ok    { color: var(--alm-green); }
.alm-acc-v.warn  { color: var(--alm-amber); }
.alm-acc-v.err   { color: var(--alm-red); }
.alm-acc-v.hi    { color: var(--alm-gold2); }

/* ─────────────────────────────────────────────
   CARD 2 — MUDAR TURMA
   2-click flow. Confirm button is disabled
   until a tile is selected. Cannot accidentally
   move a student without an explicit tap.
───────────────────────────────────────────── */

.alm-tiles { display: flex; flex-direction: column; gap: 7px; padding: 0 14px 12px; }
.alm-tile {
  display: flex; align-items: center; gap: 13px;
  padding: 12px 13px; border-radius: 11px;
  border: 1px solid; cursor: pointer;
  transition: all .2s; position: relative; overflow: hidden;
}
.alm-tile-current {
  border-color: rgba(29,184,122,.3);
  background: rgba(29,184,122,.05);
  cursor: default; opacity: .72;
}
.alm-tile-avail {
  border-color: rgba(255,255,255,.07);
  background: rgba(255,255,255,.022);
}
.alm-tile-avail:hover {
  border-color: rgba(201,168,76,.5);
  background: rgba(201,168,76,.07);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0,0,0,.4);
}
.alm-tile-selected {
  border-color: rgba(201,168,76,.85) !important;
  background: rgba(201,168,76,.11) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(0,0,0,.45);
}
.alm-tile-full { opacity: .45; cursor: not-allowed; }

/* Green left stripe = compatible with student's availability */
.alm-tile-avail.alm-compat::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: var(--alm-green);
  border-radius: 99px 0 0 99px;
}
.alm-tile-selected.alm-compat::before {
  background: var(--alm-gold);
}

.alm-tile-code {
  font-family: var(--alm-display);
  font-size: 24px; letter-spacing: 3px;
  flex-shrink: 0; line-height: 1; min-width: 72px;
}
.alm-tile-info { flex: 1; min-width: 0; }
.alm-tile-days {
  font-size: 12px; font-weight: 600;
  color: var(--alm-t);
  font-family: var(--alm-sans); line-height: 1.2;
}
.alm-tile-meta { font-size: 9px; color: var(--alm-t2); margin-top: 3px; font-family: var(--alm-mono); }
.alm-tile-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.alm-tile-n { font-size: 13px; font-weight: 700; color: rgba(238,218,168,.65); line-height: 1; }
.alm-tile-n span { font-size: 9px; color: rgba(210,188,140,.3); font-weight: 400; }
.alm-tile-bar { width: 36px; height: 3px; background: rgba(255,255,255,.07); border-radius: 2px; overflow: hidden; }
.alm-tile-fill { height: 100%; border-radius: 2px; }
.alm-tile-tag {
  font-size: 7.5px; font-weight: 700;
  padding: 2px 9px; border-radius: 99px;
  border: .5px solid; font-family: var(--alm-mono); letter-spacing: .04em;
}
.alm-tag-curr   { background: rgba(29,184,122,.12);  border-color: rgba(29,184,122,.3);  color: var(--alm-green); }
.alm-tag-compat { background: rgba(29,184,122,.08);  border-color: rgba(29,184,122,.22); color: var(--alm-green); }
.alm-tag-free   { background: rgba(201,168,76,.1);   border-color: rgba(201,168,76,.28); color: var(--alm-gold); }
.alm-tag-full   { background: rgba(232,69,90,.08);   border-color: rgba(232,69,90,.22);  color: var(--alm-red); }

/* Success flash overlay */
.alm-success {
  display: none; position: absolute; inset: 0;
  border-radius: var(--alm-r);
  background: rgba(8,6,16,.97);
  align-items: center; justify-content: center;
  flex-direction: column; gap: 14px; z-index: 30;
}
.alm-success.show {
  display: flex;
  animation: almSuccessIn .22s ease;
}
@keyframes almSuccessIn { from { opacity:0 } to { opacity:1 } }
.alm-success-ring {
  width: 62px; height: 62px; border-radius: 50%;
  background: rgba(29,184,122,.13);
  border: 1.5px solid rgba(29,184,122,.38);
  display: flex; align-items: center; justify-content: center;
}
.alm-success-ring svg {
  width: 26px; height: 26px;
  stroke: #3DE8A8; fill: none;
  stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
}
.alm-success-title {
  font-family: var(--alm-display);
  font-size: 22px; letter-spacing: 5px; color: #3DE8A8;
}
.alm-success-sub {
  font-size: 9.5px; color: rgba(29,184,122,.5);
  letter-spacing: .08em; font-family: var(--alm-mono);
}

/* ─────────────────────────────────────────────
   CARD 3 — GROUP LIST
   Shows all students in a turma. Each row has
   inline ⇄ Mudar and ↗ dossier shortcuts.
───────────────────────────────────────────── */

/* Capacity counter in hero (group list only) */
.alm-hero-cap {
  position: absolute;
  bottom: 14px; right: 16px;
  z-index: 9; text-align: right;
}
.alm-hero-cap-n {
  font-size: 38px; font-weight: 700;
  color: #fff; line-height: 1;
  text-shadow: 0 2px 8px rgba(0,0,0,.4);
  font-family: var(--alm-display);
}
.alm-hero-cap-max { font-size: 16px; color: rgba(255,255,255,.35); font-weight: 400; }
.alm-hero-cap-bar {
  width: 52px; height: 3px;
  background: rgba(255,255,255,.15);
  border-radius: 2px; margin-top: 6px;
  margin-left: auto; overflow: hidden;
}
.alm-hero-cap-fill { height: 100%; border-radius: 2px; }

.alm-stu-rows { display: flex; flex-direction: column; gap: 3px; padding: 0 14px 10px; }
.alm-stu-row {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 8px;
  background: rgba(255,255,255,.02);
  border: .5px solid rgba(255,255,255,.04);
  transition: all .13s; cursor: pointer;
  min-height: 48px;
}
.alm-stu-row:hover { background: rgba(255,255,255,.048); border-color: rgba(255,255,255,.09); }
.alm-stu-tick {
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; flex-shrink: 0;
}
.alm-stu-tick-done    { background: var(--alm-green); color: #fff; box-shadow: 0 0 0 3px rgba(29,184,122,.18); }
.alm-stu-tick-pending { background: rgba(232,160,32,.15); color: var(--alm-amber); border: 1.5px solid var(--alm-amber-b); }
.alm-stu-num  { font-size: 9px; color: var(--alm-t3); width: 18px; flex-shrink: 0; font-family: var(--alm-mono); }
.alm-stu-av   { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.alm-stu-mid  { flex: 1; min-width: 0; }
.alm-stu-name { font-size: 11.5px; font-weight: 500; color: var(--alm-t); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alm-stu-ref  { font-size: 8px; color: var(--alm-t3); margin-top: 1px; font-family: var(--alm-mono); }
.alm-stu-badge {
  font-size: 7.5px; font-weight: 700;
  padding: 2px 8px; border-radius: 99px;
  border: .5px solid; flex-shrink: 0; letter-spacing: .04em;
  font-family: var(--alm-mono);
}
.alm-stu-actions { display: flex; gap: 3px; flex-shrink: 0; }
.alm-sab {
  width: 26px; height: 26px; border-radius: 6px;
  border: .5px solid rgba(255,255,255,.06);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; cursor: pointer;
  transition: all .14s; background: transparent;
  color: rgba(210,188,140,.22);
}
.alm-sab:hover { transform: scale(1.12); }
.alm-sab-mudar {
  padding: 0 9px; width: auto; height: 26px;
  font-size: 8px; font-weight: 700;
  letter-spacing: .06em; color: var(--alm-gold);
  border: .5px solid rgba(201,168,76,.3);
  background: rgba(201,168,76,.07);
  font-family: var(--alm-mono); border-radius: 6px;
  cursor: pointer; transition: all .14s; gap: 4px;
  display: flex; align-items: center;
}
.alm-sab-mudar:hover { background: rgba(201,168,76,.16); border-color: var(--alm-gold); }

/* ── Toast (shared) ── */
.alm-toast {
  position: fixed; bottom: 50px; left: 50%;
  transform: translateX(-50%) translateY(8px);
  padding: 5px 16px;
  font-size: 8.5px; font-weight: 600; letter-spacing: .06em;
  opacity: 0; transition: all .2s;
  z-index: 3000; pointer-events: none;
  border: 1px solid; white-space: nowrap; border-radius: 3px;
  font-family: var(--alm-mono);
}
.alm-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.alm-toast.ok   { background: var(--alm-green-a); border-color: var(--alm-green-b); color: var(--alm-green); }
.alm-toast.warn { background: var(--alm-amber-a); border-color: var(--alm-amber-b); color: var(--alm-amber); }
.alm-toast.err  { background: var(--alm-red-a);   border-color: var(--alm-red-b);   color: var(--alm-red); }
.alm-toast.info { background: var(--alm-gold3);   border-color: rgba(201,168,76,.28); color: var(--alm-gold2); }

@media (max-width: 500px) {
  .alm-card, .alm-card.alm-card-wide { width: 100%; border-radius: 18px 18px 0 0; }
  .alm-overlay { align-items: flex-end; padding: 0; }
}
`;

  /* ─────────────────────────────────────────────
     WAVE SVG  — identical across all three cards
  ───────────────────────────────────────────── */
  function waveSVG(width = 360) {
    return `<svg class="alm-hero-wave" viewBox="0 0 ${width} 34"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style="height:34px;width:100%;display:block">
      <path d="M0,10 C${width*.15},30 ${width*.32},4 ${width*.49},18 C${width*.65},32 ${width*.82},6 ${width},20 L${width},34 L0,34 Z"
        fill="#0E0C1C" opacity=".5"/>
      <path d="M0,20 C${width*.14},36 ${width*.33},10 ${width*.52},24 C${width*.69},36 ${width*.86},12 ${width},26 L${width},34 L0,34 Z"
        fill="#0E0C1C"/>
    </svg>`;
  }

  /* ─────────────────────────────────────────────
     UTILITIES
  ───────────────────────────────────────────── */

  function avCol(name) {
    let h = 0;
    for (let i = 0; i < (name || '?').length; i++)
      h = (h * 31 + (name || '?').charCodeAt(i)) & 0xffffffff;
    return AV_POOL[Math.abs(h) % AV_POOL.length];
  }

  function avInit(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function getLM(enrol) {
    const k = `${(enrol.family || '').toLowerCase()}|${(enrol.level_cefr || '').toUpperCase()}`;
    return LEVEL_MAP[k] || { dept: 'adults', label: enrol.level_cefr || '—', order: 99 };
  }

  function normS(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function parsePrefs(req) {
    if (!req?.day_preferences) return [];
    try {
      const dp = typeof req.day_preferences === 'string'
        ? JSON.parse(req.day_preferences) : req.day_preferences;
      if (!Array.isArray(dp)) return [];
      return dp.map(p => {
        const rawDay = (p.day_code || p.day || p.weekday || p.dia || '').toString().toLowerCase().trim();
        const dayIdx = DAY_IDX[rawDay] ?? DAY_IDX[parseInt(rawDay) - 1] ?? null;
        const start = p.session_start || p.start_time || '—';
        const h = parseInt((start + '').split(':')[0]);
        return { dayIdx, day: dayIdx !== null ? DAYS_PT[dayIdx] : null, start, h: isNaN(h) ? null : h };
      }).filter(p => p.day);
    } catch (e) { return []; }
  }

  function classB(h) {
    if (h >= 8 && h <= 11) return 'manha';
    if (h >= 14 && h <= 20) return 'tarde';
    return null;
  }

  /* ─────────────────────────────────────────────
     SUPABASE HELPERS
  ───────────────────────────────────────────── */

  function sbH() {
    const K = window.KEY || '';
    return { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
  }

  function sbURL() { return window.SB || 'https://oapygbeliocdvitbdjbq.supabase.co'; }

  async function sbGet(table, qs) {
    const r = await fetch(`${sbURL()}/rest/v1/${table}?${qs}`, { headers: sbH() });
    return r.ok ? r.json() : [];
  }

  async function sbPatch(table, qs, body) {
    const r = await fetch(`${sbURL()}/rest/v1/${table}?${qs}`, {
      method: 'PATCH', headers: { ...sbH(), Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    });
    return r.ok;
  }

  /* ─────────────────────────────────────────────
     INJECT CSS + HTML SHELLS (once per page)
  ───────────────────────────────────────────── */

  let _injected = false;

  function inject() {
    if (_injected) return;
    _injected = true;

    /* CSS */
    const style = document.createElement('style');
    style.id = 'alm-ds-css';
    style.textContent = SHARED_CSS;
    document.head.appendChild(style);

    /* HTML shells for all three overlays + toast */
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <!-- CARD 1: Dossier -->
      <div class="alm-overlay" id="alm-dossier-overlay"
           onclick="if(event.target===this)window.almCloseDossier()">
        <div class="alm-card alm-card-wide" id="alm-dossier-card">
          <div class="alm-hero" id="alm-d-hero">
            <div class="alm-hero-bg" id="alm-d-hero-bg"></div>
            <div class="alm-hero-scrim"></div>
            <button class="alm-hero-close" onclick="window.almCloseDossier()">✕</button>
            <div class="alm-hero-tag" id="alm-d-tag">ALM · dossier</div>
            ${waveSVG(460)}
            <div class="alm-hero-identity">
              <div class="alm-av" id="alm-d-av"></div>
              <div class="alm-hero-text">
                <div class="alm-hero-name" id="alm-d-name">—</div>
                <div class="alm-hero-sub"  id="alm-d-sub">—</div>
              </div>
            </div>
          </div>
          <div class="alm-badges" id="alm-d-badges"></div>
          <div class="alm-body"   id="alm-d-body"></div>
          <div class="alm-foot"   id="alm-d-foot"></div>
        </div>
      </div>

      <!-- CARD 2: Mudar Turma -->
      <div class="alm-overlay" id="alm-mt-overlay"
           onclick="if(event.target===this)window.almCloseMudar()">
        <div class="alm-card" id="alm-mt-card" style="position:relative">
          <div class="alm-success" id="alm-mt-success">
            <div class="alm-success-ring">
              <svg viewBox="0 0 24 24"><polyline points="4,12 9,17 20,7"/></svg>
            </div>
            <div class="alm-success-title">MUDANÇA OK</div>
            <div class="alm-success-sub" id="alm-mt-success-sub">—</div>
          </div>
          <div class="alm-hero">
            <div class="alm-hero-bg" id="alm-mt-hero-bg"></div>
            <div class="alm-hero-scrim"></div>
            <button class="alm-hero-close" onclick="window.almCloseMudar()">✕</button>
            <div class="alm-hero-tag">⇄ mudar turma</div>
            ${waveSVG(360)}
            <div class="alm-hero-identity">
              <div class="alm-av" id="alm-mt-av"></div>
              <div class="alm-hero-text">
                <div class="alm-hero-name" id="alm-mt-name">—</div>
                <div class="alm-hero-sub"  id="alm-mt-sub">—</div>
              </div>
            </div>
          </div>
          <div class="alm-badges" id="alm-mt-badges"></div>
          <div class="alm-body"   id="alm-mt-body"></div>
          <div class="alm-foot">
            <button class="alm-btn alm-btn-primary"
                    id="alm-mt-confirm"
                    disabled
                    onclick="window._almConfirmMudar()">
              escolha uma turma acima
            </button>
          </div>
        </div>
      </div>

      <!-- CARD 3: Group List -->
      <div class="alm-overlay" id="alm-gl-overlay"
           onclick="if(event.target===this)window.almCloseGroupList()">
        <div class="alm-card" id="alm-gl-card">
          <div class="alm-hero">
            <div class="alm-hero-bg" id="alm-gl-hero-bg"></div>
            <div class="alm-hero-scrim"></div>
            <button class="alm-hero-close" onclick="window.almCloseGroupList()">✕</button>
            <div class="alm-hero-tag" id="alm-gl-tag">ALM · turma</div>
            ${waveSVG(360)}
            <div class="alm-hero-identity">
              <div class="alm-av" id="alm-gl-av"></div>
              <div class="alm-hero-text">
                <div class="alm-hero-name" id="alm-gl-name">—</div>
                <div class="alm-hero-sub"  id="alm-gl-sub">—</div>
              </div>
            </div>
            <div class="alm-hero-cap" id="alm-gl-cap"></div>
          </div>
          <div class="alm-badges" id="alm-gl-badges"></div>
          <div class="alm-body"   id="alm-gl-body"></div>
          <div class="alm-foot"   id="alm-gl-foot"></div>
        </div>
      </div>

      <!-- Shared toast -->
      <div class="alm-toast" id="alm-toast"></div>
    `;
    while (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);
  }

  /* ─────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────── */

  let _toastT;
  function toast(msg, type = 'info') {
    const el = document.getElementById('alm-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `alm-toast ${type} show`;
    clearTimeout(_toastT);
    _toastT = setTimeout(() => el.classList.remove('show'), 2800);
  }
  window.almToast = toast;

  /* ─────────────────────────────────────────────
     CARD 1 — DOSSIER
  ───────────────────────────────────────────── */

  window.almCloseDossier = function () {
    document.getElementById('alm-dossier-overlay')?.classList.remove('open');
  };

  window.openDossier = async function (ref) {
    inject();
    document.getElementById('alm-dossier-overlay').classList.add('open');

    /* Skeleton while loading */
    const col = avCol(ref);
    const av = document.getElementById('alm-d-av');
    av.style.cssText = `background:${col.bg};color:${col.text}`;
    av.textContent = ref.slice(-4);
    document.getElementById('alm-d-name').textContent = ref;
    document.getElementById('alm-d-sub').textContent = 'a carregar…';
    document.getElementById('alm-d-badges').innerHTML = '';
    document.getElementById('alm-d-body').innerHTML = '<div style="padding:48px;text-align:center;color:var(--alm-t3);font-size:9px;letter-spacing:.1em">A CARREGAR…</div>';
    document.getElementById('alm-d-foot').innerHTML = '';
    document.getElementById('alm-d-hero-bg').style.background = DEPT_GRADS.adults;

    /* Fetch */
    const [enrols, reqs] = await Promise.all([
      sbGet('enrolments', `ref=eq.${encodeURIComponent(ref)}&select=*&limit=1`),
      sbGet('timetable_requests', `ref=eq.${encodeURIComponent(ref)}&academic_year=eq.${encodeURIComponent(AY)}&select=*&limit=1`),
    ]);
    const enrol = enrols?.[0] || null;
    const req   = reqs?.[0]   || null;

    const meta = enrol ? getLM(enrol) : { dept: 'adults', label: '—' };
    const dept = meta.dept;
    const accent = DEPT_ACCENTS[dept] || '#E8C97A';
    const init = avInit(enrol?.name || ref);
    const col2 = avCol(enrol?.name || ref);

    /* Hero */
    document.getElementById('alm-d-hero-bg').style.background = DEPT_GRADS[dept] || DEPT_GRADS.adults;
    const avEl = document.getElementById('alm-d-av');
    avEl.style.cssText = `background:${col2.bg};color:${col2.text};border-color:${col2.text}44`;
    avEl.textContent = init;
    document.getElementById('alm-d-name').textContent = enrol?.name || ref;
    document.getElementById('alm-d-sub').textContent =
      `${ref} · ${enrol?.branch || '—'} · ${enrol?.lang || 'EN'} · ${meta.label}`;

    /* Badges */
    const st = req ? normS(req.status) : 'sem_pedido';
    const stCol = st === 'atribuido' ? `rgba(29,184,122,.1);border-color:rgba(29,184,122,.35);color:var(--alm-green)`
      : st === 'sem_pedido' ? `rgba(232,69,90,.1);border-color:rgba(232,69,90,.3);color:var(--alm-red)`
      : `rgba(232,160,32,.1);border-color:rgba(232,160,32,.3);color:var(--alm-amber)`;
    const stTxt = st === 'atribuido' ? 'EM TURMA' : st === 'sem_pedido' ? 'SEM PEDIDO' : 'PENDENTE';
    document.getElementById('alm-d-badges').innerHTML = `
      <span class="alm-badge" style="background:rgba(74,143,245,.1);border-color:rgba(74,143,245,.35);color:#7AABEE">${enrol?.lang || 'EN'}</span>
      <span class="alm-badge" style="background:rgba(201,168,76,.1);border-color:rgba(201,168,76,.35);color:var(--alm-gold2)">${meta.label}</span>
      <span class="alm-badge" style="background:${stCol}">${stTxt}</span>
      ${req?.assigned_turma ? `<span class="alm-badge" style="background:var(--alm-green-a);border-color:var(--alm-green-b);color:var(--alm-green)">${req.assigned_turma}</span>` : ''}
    `;

    /* Body — timetable first (always open), then accordions */
    const prefs = parsePrefs(req);
    const gridRows = buildGridHTML(prefs);
    const placementHTML = buildPlacementHTML(enrol, req, meta);

    document.getElementById('alm-d-body').innerHTML = `
      ${placementHTML}
      <div class="alm-tgrid-wrap">
        <div class="alm-tgrid-hdr">
          <div class="alm-sec-label no-before" style="margin:0">horário · disponibilidade</div>
          <div class="alm-tg-legend">
            <div class="alm-tg-leg"><div class="alm-tg-leg-dot" style="background:var(--alm-green-a);border:.5px solid var(--alm-green-b)"></div>submetido</div>
            <div class="alm-tg-leg"><div class="alm-tg-leg-dot" style="background:var(--alm-amber-a);border:.5px solid var(--alm-amber-b)"></div>encaixado</div>
            <div class="alm-tg-leg"><div class="alm-tg-leg-dot" style="background:var(--alm-red-a);border:.5px solid var(--alm-red-b)"></div>difícil</div>
          </div>
        </div>
        ${gridRows}
        <div style="margin-top:6px;font-size:8px;color:var(--alm-t3);font-family:var(--alm-mono);line-height:1.7">
          ○ vazio = sem pedido &nbsp;·&nbsp;
          <span style="color:var(--alm-green)">● verde = submetido</span> &nbsp;·&nbsp;
          <span style="color:var(--alm-amber)">● âmbar = encaixado, turma incompleta</span> &nbsp;·&nbsp;
          <span style="color:var(--alm-red)">● vermelho = caso difícil</span>
        </div>
      </div>
      ${prefs.length ? `<div class="alm-slots">${prefs.map(p => `<span class="alm-slot alm-slot-amber">${p.day} ${p.start}</span>`).join('')}</div>` : ''}
      ${buildAccordions(enrol, req)}
    `;

    /* Footer */
    document.getElementById('alm-d-foot').innerHTML = `
      <button class="alm-btn alm-btn-primary"
        style="flex:1"
        onclick="window.almCloseDossier();window.openMudarTurma('${ref}',window._boxes||{})">
        ⇄ &nbsp;Atribuir / Mudar Turma
      </button>
      <button class="alm-btn alm-btn-ghost"
        onclick="window.open('/admin/timetable-request-update?num=${ref.replace('ALM-','')}','_blank')">
        ✎ Editar
      </button>
    `;

    /* Accordion toggle */
    document.querySelectorAll('#alm-d-body .alm-acc-hdr').forEach(hdr => {
      hdr.addEventListener('click', () => hdr.classList.toggle('open'));
    });
  };

  function buildGridHTML(prefs) {
    const hours = [...HRS_MORN, null, ...HRS_AFT]; /* null = visual gap */
    let html = `<div class="alm-tgrid" style="margin-bottom:3px">
      <div></div>
      ${hours.map(h => h === null
        ? `<div class="alm-tg-h" style="opacity:.15">·</div>`
        : `<div class="alm-tg-h">${h}h</div>`
      ).join('')}
    </div>`;

    DAYS_PT.forEach(day => {
      html += `<div class="alm-tgrid" style="margin-bottom:2px">
        <div class="alm-tg-day">${day}</div>
        ${hours.map(h => {
          if (h === null) return `<div class="alm-tg-cell alm-tg-gap"></div>`;
          const match = prefs.find(p => p.day === day && p.h === h);
          const cls = match ? 'alm-tg-amber' : 'alm-tg-empty';
          const lbl = match ? `<div class="alm-tg-lbl">${h}:00</div>` : '';
          return `<div class="alm-tg-cell ${cls}">${lbl}</div>`;
        }).join('')}
      </div>`;
    });

    return html;
  }

  function buildPlacementHTML(enrol, req, meta) {
    if (!req) {
      return `<div class="alm-placement alm-pl-empty" style="margin:12px 14px 0">
        <div class="alm-pl-code">—</div>
        <div class="alm-pl-detail">
          <div class="alm-pl-sched">Sem pedido de horário</div>
          <div class="alm-pl-meta">Deve submeter o pedido antes de ser colocado</div>
        </div>
        <div class="alm-pl-dot" style="background:var(--alm-red)"></div>
      </div>`;
    }
    if (req.assigned_turma) {
      return `<div class="alm-placement alm-pl-placed" style="margin:12px 14px 0">
        <div class="alm-pl-code">${req.assigned_turma}</div>
        <div class="alm-pl-detail">
          <div class="alm-pl-sched">Turma atribuída</div>
          <div class="alm-pl-meta">${meta.label} · ${normS(req.status) === 'atribuido' ? 'confirmado' : 'pendente'}</div>
        </div>
        <div class="alm-pl-dot" style="background:var(--alm-green)"></div>
      </div>`;
    }
    return `<div class="alm-placement alm-pl-pending" style="margin:12px 14px 0">
      <div class="alm-pl-code">?</div>
      <div class="alm-pl-detail">
        <div class="alm-pl-sched">Pedido submetido · Sem turma</div>
        <div class="alm-pl-meta">${meta.label} · A aguardar colocação</div>
      </div>
      <div class="alm-pl-dot" style="background:var(--alm-amber)"></div>
    </div>`;
  }

  function buildAccordions(enrol, req) {
    const e = enrol || {};
    const rows = (pairs) => pairs.filter(Boolean).map(([k, v, c]) =>
      `<div class="alm-acc-row">
        <span class="alm-acc-k">${k}</span>
        <span class="alm-acc-v ${c || ''}">${v}</span>
      </div>`
    ).join('');

    return `
      <div class="alm-acc">
        <div class="alm-acc-hdr">
          <div class="alm-acc-left"><span class="alm-acc-icon">📋</span><span class="alm-acc-label">Inscrição</span></div>
          <div class="alm-acc-right"><span class="alm-acc-meta">${e.academic_year || '—'}</span><span class="alm-acc-chv">›</span></div>
        </div>
        <div class="alm-acc-body">${rows([
          e.phone   ? ['Tel.', e.phone]         : null,
          e.email   ? ['Email', e.email, 'hi']  : null,
          e.age     ? ['Idade', e.age + ' anos'] : null,
          ['Filial', (e.branch || '—').replace(/_/g,' ')],
          ['Língua', (FLAGS[e.lang] || '') + ' ' + (e.lang || '—')],
          e.enrolment_date ? ['Matrícula', new Date(e.enrolment_date).toLocaleDateString('pt-PT')] : null,
        ])}</div>
      </div>
      <div class="alm-acc">
        <div class="alm-acc-hdr">
          <div class="alm-acc-left"><span class="alm-acc-icon">🕓</span><span class="alm-acc-label">Historial</span></div>
          <div class="alm-acc-right"><span class="alm-acc-meta">—</span><span class="alm-acc-chv">›</span></div>
        </div>
        <div class="alm-acc-body"><div style="font-size:9px;color:var(--alm-t3);padding:4px 0">Sem historial registado.</div></div>
      </div>
      <div class="alm-acc">
        <div class="alm-acc-hdr">
          <div class="alm-acc-left"><span class="alm-acc-icon">⚑</span><span class="alm-acc-label">Notas internas</span></div>
          <div class="alm-acc-right"><span class="alm-acc-meta">—</span><span class="alm-acc-chv">›</span></div>
        </div>
        <div class="alm-acc-body">
          <textarea style="width:100%;background:rgba(255,255,255,.04);border:.5px solid var(--alm-b2);padding:8px 10px;font-family:var(--alm-mono);font-size:9px;color:var(--alm-t);outline:none;resize:none;min-height:56px;line-height:1.5;border-radius:6px" placeholder="Nota visível para toda a equipa…">${e.notes || ''}</textarea>
        </div>
      </div>
    `;
  }

  /* ─────────────────────────────────────────────
     CARD 2 — MUDAR TURMA
  ───────────────────────────────────────────── */

  let _mtRef = null, _mtSelectedBoxId = null, _mtSelectedCode = null;
  let _mtBoxes = {}, _mtOnConfirm = null;

  window.almCloseMudar = function () {
    document.getElementById('alm-mt-overlay')?.classList.remove('open');
    _mtRef = null; _mtSelectedBoxId = null; _mtSelectedCode = null;
  };

  window.openMudarTurma = function (ref, boxes, onConfirm) {
    inject();
    _mtRef = ref;
    _mtBoxes = boxes || {};
    _mtOnConfirm = onConfirm || null;
    _mtSelectedBoxId = null;
    _mtSelectedCode = null;

    /* Find enrol from page-level allE if available */
    const allE = window.allE || [];
    const enrol = allE.find(e => e.ref === ref) || { ref, name: ref };
    const allR = window.allR || [];
    const req = (window.rByRef || {})[ref] || allR.find(r => r.ref === ref) || null;

    const meta = getLM(enrol);
    const dept = meta.dept;
    const col = avCol(enrol.name || ref);
    const init = avInit(enrol.name || ref);
    const accent = DEPT_ACCENTS[dept] || '#E8C97A';
    const currentCode = req?.assigned_turma || null;

    /* Hero */
    document.getElementById('alm-mt-hero-bg').style.background = DEPT_GRADS[dept] || DEPT_GRADS.adults;
    const av = document.getElementById('alm-mt-av');
    av.style.cssText = `background:${col.bg};color:${col.text};border-color:${col.text}44`;
    av.textContent = init;
    document.getElementById('alm-mt-name').textContent = enrol.name || ref;
    document.getElementById('alm-mt-sub').textContent = `${ref} · ${meta.label} · ${(enrol.branch || '').replace(/_/g,' ')}`;

    /* Badges */
    document.getElementById('alm-mt-badges').innerHTML = `
      <span class="alm-badge" style="background:rgba(201,168,76,.1);border-color:rgba(201,168,76,.35);color:var(--alm-gold2)">${meta.label}</span>
      <span class="alm-badge" style="background:rgba(74,143,245,.1);border-color:rgba(74,143,245,.3);color:#7AABEE">${enrol.lang || 'EN'}</span>
      ${currentCode ? `<span class="alm-badge" style="background:var(--alm-green-a);border-color:var(--alm-green-b);color:var(--alm-green)">${currentCode} actual</span>` : ''}
    `;

    /* Tiles */
    const lkey = `${(enrol.family || '').toLowerCase()}|${(enrol.level_cefr || '').toUpperCase()}`;
    const prefs = parsePrefs(req);
    const options = Object.entries(_mtBoxes)
      .filter(([, b]) => b.type === 'group' && b.lk === lkey)
      .map(([id, b]) => {
        const isCurrent = b.code === currentCode || b.students?.some(s => s.ref === ref);
        const capPct = Math.round((b.students?.length || 0) / MAX_G * 100);
        const isCompat = prefs.some(p => p.dayIdx === b.pair?.a || p.dayIdx === b.pair?.b);
        return { id, code: b.code, pair: b.pair, block: b.block, n: b.students?.length || 0, isCurrent, full: (b.students?.length || 0) >= MAX_G, capPct, isCompat };
      })
      .sort((a, b) => a.isCurrent ? -1 : b.isCurrent ? 1 : a.n - b.n);

    const tilesHTML = options.length === 0
      ? `<div style="padding:20px;text-align:center;font-size:9px;color:var(--alm-t3);font-family:var(--alm-mono)">Sem turmas disponíveis para este nível.</div>`
      : options.map(o => {
          const fillCol = o.isCurrent ? '#3DE8A8' : o.capPct >= 90 ? 'var(--alm-red)' : o.capPct >= 70 ? 'var(--alm-amber)' : accent;
          const tagHTML = o.isCurrent
            ? `<span class="alm-tile-tag alm-tag-curr">actual</span>`
            : o.full ? `<span class="alm-tile-tag alm-tag-full">cheio</span>`
            : o.isCompat ? `<span class="alm-tile-tag alm-tag-compat">✓ compatível</span>`
            : `<span class="alm-tile-tag alm-tag-free">disponível</span>`;
          const codeCol = o.isCurrent ? '#3DE8A8' : accent;
          const tileClass = o.isCurrent ? 'alm-tile-current'
            : `alm-tile-avail${o.isCompat ? ' alm-compat' : ''}${o.full ? ' alm-tile-full' : ''}`;
          const onclick = o.isCurrent || o.full ? '' : `onclick="_almSelectTile(this,'${o.id}','${o.code}')"`;
          return `<div class="alm-tile ${tileClass}" ${onclick}>
            <div class="alm-tile-code" style="color:${codeCol}">${o.code}</div>
            <div class="alm-tile-info">
              <div class="alm-tile-days">${o.pair?.aL || '—'} + ${o.pair?.bL || '—'}</div>
              <div class="alm-tile-meta">${o.block === 'manha' ? 'Manhã · 08h–11h' : 'Tarde · 14h–20h'}</div>
            </div>
            <div class="alm-tile-right">
              <div class="alm-tile-n">${o.n}<span>/${MAX_G}</span></div>
              <div class="alm-tile-bar"><div class="alm-tile-fill" style="width:${o.capPct}%;background:${fillCol}"></div></div>
              ${tagHTML}
            </div>
          </div>`;
        }).join('');

    document.getElementById('alm-mt-body').innerHTML = `
      <div class="alm-sec-label">escolha a nova turma</div>
      <div class="alm-tiles">${tilesHTML}</div>
    `;

    /* Reset confirm + success */
    const btn = document.getElementById('alm-mt-confirm');
    btn.disabled = true;
    btn.textContent = 'escolha uma turma acima';
    document.getElementById('alm-mt-success').classList.remove('show');

    document.getElementById('alm-mt-overlay').classList.add('open');
  };

  window._almSelectTile = function (el, boxId, code) {
    document.querySelectorAll('#alm-mt-body .alm-tile-avail').forEach(t => t.classList.remove('alm-tile-selected'));
    el.classList.add('alm-tile-selected');
    _mtSelectedBoxId = boxId;
    _mtSelectedCode = code;
    const btn = document.getElementById('alm-mt-confirm');
    btn.disabled = false;
    btn.textContent = `✓  MOVER PARA ${code}`;
  };

  window._almConfirmMudar = async function () {
    if (!_mtRef || !_mtSelectedCode) return;
    const btn = document.getElementById('alm-mt-confirm');
    btn.disabled = true;
    btn.textContent = 'A guardar…';

    const ok = await sbPatch(
      'timetable_requests',
      `ref=eq.${encodeURIComponent(_mtRef)}&academic_year=eq.${encodeURIComponent(AY)}`,
      { assigned_turma: _mtSelectedCode, status: 'atribuido' }
    );

    if (ok) {
      /* Update in-memory state on the host page */
      const rByRef = window.rByRef || {};
      if (rByRef[_mtRef]) { rByRef[_mtRef].assigned_turma = _mtSelectedCode; rByRef[_mtRef].status = 'atribuido'; }
      if (_mtBoxes[_mtSelectedBoxId]) {
        const allE = window.allE || [];
        const enrol = allE.find(e => e.ref === _mtRef);
        Object.values(_mtBoxes).forEach(b => {
          if (b.type === 'group') {
            const idx = b.students?.findIndex(s => s.ref === _mtRef);
            if (idx >= 0) b.students.splice(idx, 1);
          }
        });
        if (enrol && _mtBoxes[_mtSelectedBoxId].students) {
          _mtBoxes[_mtSelectedBoxId].students.push(enrol);
        }
      }

      /* Callback for host page to refresh its DOM */
      if (typeof _mtOnConfirm === 'function') _mtOnConfirm(_mtRef, _mtSelectedCode, _mtSelectedBoxId);

      const firstName = (window.allE || []).find(e => e.ref === _mtRef)?.name?.split(' ')[0] || _mtRef;
      document.getElementById('alm-mt-success-sub').textContent = `${firstName} → ${_mtSelectedCode} ✓`;
      document.getElementById('alm-mt-success').classList.add('show');
      toast(`${firstName} → ${_mtSelectedCode} ✓`, 'ok');
      setTimeout(() => window.almCloseMudar(), 1700);
    } else {
      toast('Erro ao guardar — verificar ligação', 'err');
      btn.disabled = false;
      btn.textContent = `✓  MOVER PARA ${_mtSelectedCode}`;
    }
  };

  /* ─────────────────────────────────────────────
     CARD 3 — GROUP LIST
  ───────────────────────────────────────────── */

  let _glBoxId = null, _glBoxes = {};

  window.almCloseGroupList = function () {
    document.getElementById('alm-gl-overlay')?.classList.remove('open');
    _glBoxId = null;
  };

  window.openGroupList = function (boxId, boxes) {
    inject();
    _glBoxId = boxId;
    _glBoxes = boxes || {};
    const box = _glBoxes[boxId];
    if (!box || box.type !== 'group') { toast('Turma não encontrada', 'warn'); return; }

    const dept = box.dk || 'adults';
    const accent = DEPT_ACCENTS[dept] || '#E8C97A';
    const n = box.students?.length || 0;
    const capPct = Math.round(n / MAX_G * 100);
    const isConf = box.confirmed || !!(window.getConf && window.getConf()[boxId]);

    /* Hero */
    document.getElementById('alm-gl-hero-bg').style.background = DEPT_GRADS[dept] || DEPT_GRADS.adults;
    const av = document.getElementById('alm-gl-av');
    av.style.cssText = `background:${DEPT_GRADS[dept]?.match(/#\w+/)?.[0] || '#1A2848'};color:${accent};border-color:${accent}44;font-family:var(--alm-display);font-size:14px;letter-spacing:2px`;
    av.textContent = box.code?.slice(0, 3) || '—';
    document.getElementById('alm-gl-name').textContent = box.code || '—';
    document.getElementById('alm-gl-name').style.color = accent;
    document.getElementById('alm-gl-sub').textContent =
      `${box.pair?.aL || '—'} + ${box.pair?.bL || '—'} · ${box.block === 'manha' ? 'Manhã 08h' : 'Tarde 14h'} · ${box.meta?.label || '—'}`;

    /* Capacity counter */
    document.getElementById('alm-gl-cap').innerHTML = `
      <div class="alm-hero-cap-n">${n}<span class="alm-hero-cap-max">/${MAX_G}</span></div>
      <div style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.08em;font-family:var(--alm-mono);margin-top:2px">alunos</div>
      <div class="alm-hero-cap-bar"><div class="alm-hero-cap-fill" style="width:${capPct}%;background:${capPct >= 80 ? 'var(--alm-amber)' : accent}"></div></div>
    `;

    /* Badges */
    document.getElementById('alm-gl-badges').innerHTML = `
      <span class="alm-badge" style="background:${isConf ? 'var(--alm-green-a)' : 'rgba(232,160,32,.1)'};border-color:${isConf ? 'var(--alm-green-b)' : 'rgba(232,160,32,.3)'};color:${isConf ? 'var(--alm-green)' : 'var(--alm-amber)'}">
        ${isConf ? '✓ Turma criada' : '⏱ Aguarda criação'}
      </span>
      <span class="alm-badge" style="background:rgba(74,143,245,.1);border-color:rgba(74,143,245,.3);color:#7AABEE">${box.block === 'manha' ? 'Manhã' : 'Tarde'}</span>
      <span class="alm-badge" style="background:rgba(201,168,76,.1);border-color:rgba(201,168,76,.3);color:var(--alm-gold2)">${box.meta?.label || '—'}</span>
    `;

    /* Student rows */
    const sorted = [...(box.students || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const rowsHTML = sorted.length === 0
      ? `<div style="padding:24px;text-align:center;font-size:9px;color:var(--alm-t3)">Nenhum aluno nesta turma.</div>`
      : sorted.map((e, i) => {
          const col = avCol(e.name || e.ref);
          const init = avInit(e.name || e.ref);
          const req = (window.rByRef || {})[e.ref];
          const st = req ? normS(req.status) : 'sem_pedido';
          const stBg = st === 'atribuido' ? 'rgba(29,184,122,.12)' : st === 'sem_pedido' ? 'rgba(232,69,90,.12)' : 'rgba(232,160,32,.12)';
          const stBo = st === 'atribuido' ? 'rgba(29,184,122,.3)' : st === 'sem_pedido' ? 'rgba(232,69,90,.3)' : 'rgba(232,160,32,.3)';
          const stTc = st === 'atribuido' ? 'var(--alm-green)' : st === 'sem_pedido' ? 'var(--alm-red)' : 'var(--alm-amber)';
          const stTxt = st === 'atribuido' ? 'ATRIBUÍDO' : st === 'sem_pedido' ? 'SEM PEDIDO' : 'PENDENTE';
          const tickCls = isConf ? 'alm-stu-tick-done' : 'alm-stu-tick-pending';
          const tickChar = isConf ? '✓' : '◎';
          return `<div class="alm-stu-row">
            <div class="alm-stu-tick ${tickCls}">${tickChar}</div>
            <div class="alm-stu-num">${String(i + 1).padStart(2, '0')}</div>
            <div class="alm-stu-av" style="background:${col.bg};color:${col.text}">${init}</div>
            <div class="alm-stu-mid" onclick="window.almCloseGroupList();window.openDossier('${e.ref}')">
              <div class="alm-stu-name">${e.name || '—'}</div>
              <div class="alm-stu-ref">${e.ref || '—'} · ${e.lang || 'EN'}</div>
            </div>
            <span class="alm-stu-badge" style="background:${stBg};border-color:${stBo};color:${stTc}">${stTxt}</span>
            <div class="alm-stu-actions">
              <button class="alm-sab-mudar"
                onclick="event.stopPropagation();window.almCloseGroupList();window.openMudarTurma('${e.ref}',window._boxes||{})">
                ⇄ Mudar
              </button>
              <div class="alm-sab"
                style="color:rgba(210,188,140,.3)"
                onclick="window.almCloseGroupList();window.openDossier('${e.ref}')">
                ↗
              </div>
            </div>
          </div>`;
        }).join('');

    document.getElementById('alm-gl-body').innerHTML = `
      <div class="alm-sec-label">alunos · ${n}</div>
      <div class="alm-stu-rows">${rowsHTML}</div>
    `;

    /* Footer */
    document.getElementById('alm-gl-foot').innerHTML = isConf
      ? `<button class="alm-btn alm-btn-created" style="flex:1">✓ &nbsp;TURMA JÁ CRIADA</button>`
      : `<button class="alm-btn alm-btn-primary" style="flex:1"
           onclick="window.quickConfirm&&window.quickConfirm('${boxId}');window.almCloseGroupList()">
           ✦ &nbsp;CRIAR TURMA
         </button>`;

    document.getElementById('alm-gl-overlay').classList.add('open');
  };

  /* ─────────────────────────────────────────────
     KEYBOARD ESC — closes whichever card is open
  ───────────────────────────────────────────── */

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('alm-mt-overlay')?.classList.contains('open'))     { window.almCloseMudar();      return; }
    if (document.getElementById('alm-dossier-overlay')?.classList.contains('open')){ window.almCloseDossier();    return; }
    if (document.getElementById('alm-gl-overlay')?.classList.contains('open'))     { window.almCloseGroupList(); return; }
  });

  console.log('[ALM Design System v1.0] loaded — openDossier / openMudarTurma / openGroupList ✓');

})();
