# ALM Pipeline Report
### Academia de Línguas da Madeira · Full-Stack Operational Audit
**Date:** May 2026 · **Files reviewed:** 6 HTML modules · **Database:** Supabase (PostgreSQL)

---

## Executive Summary

The ALM system is a genuinely ambitious, purpose-built school operations platform. The six-step pipeline — Dashboard → Audit/Formation → Decision → Assign → Mensagens — covers the full lifecycle from student enrolment to classroom attendance. The visual ambition is evident: dark-gold branding, live data indicators, and multi-panel layouts. However, the system carries significant architectural debt. **Each file was built independently**, and this shows in divergent modal implementations, fragmented data contracts, aesthetic inconsistencies, and at least one file with hardcoded data. The risks compound at every hand-off point in the pipeline. This report catalogues what works, what needs refinement, and what is structurally missing.

---

## File-by-File Inventory

| # | File | Role | Step |
|---|------|------|------|
| 1 | `dashboard.html` | Main hub, branch status, module navigation | Entry |
| 2 | `alm-painel-central.html` | Timetable requests audit, overview, watchlist | Steps 1–2 |
| 3 | `alm-confirmar-turmas-criadas.html` | Group proposals, group confirmation | Step 4 (Decision) |
| 4 | `alm-atribuir-turmas.html` (v4) | Teacher assignment to confirmed groups | Step 5 |
| 5 | `alm-atribuir-turmas.html` (v5) | Identical duplicate of v4 | Step 5 |
| 6 | `alm-mensagens.html` | Teacher messages, attendance, photocopies | Step 6 |

---

## Section 1 — What Works Well

### 1.1 Visual Language & Branding
The dark purple-to-gold palette is cohesive and distinctive. The `Bebas Neue` display font for turma codes, the `IBM Plex Mono` for data, and the `IBM Plex Sans` for body copy form a deliberate typographic hierarchy. The gold shimmer (`#C9A84C / #E8C97A`) reads as premium. The branch status lights (healthy/viable/concerning/unviable) with animated flicker on warning states are immediately communicative.

### 1.2 Supabase Integration Pattern
The `sbGet()` pagination pattern (1000-row pages, up to 4–9 pages) is correct and defensive. Using `content-range` headers for counts is appropriate. The `Prefer: resolution=merge-duplicates` on class upserts is the right approach to prevent duplicates while preserving teacher assignments — this is the most operationally important design decision in the codebase and it is done correctly in the Decision file.

### 1.3 Group Formation Algorithm (alm-painel-central.html)
The `buildGroupProposals()` engine — bucketing by pair+block, singling out same-day conflicts, invalid time windows, and unplaceable students — is sophisticated and genuinely useful. The `SINALIZADO` panel with exportable CSV per group is a strong operational feature. The pair-block compatibility grid (SEG+QUA, TER+QUI, QUA+SEX, SÁB) maps directly to real scheduling constraints.

### 1.4 Decision File (Step 4) — DB-Authoritative Confirmed State
Loading `_confirmedCodes` from the `classes` table on boot (rather than localStorage) is correct. The `loadNextSeqBase()` fix preventing sequence collisions with existing DB codes is a meaningful safety measure. The non-destructive sync (`resolution=merge-duplicates` preserves teacher/room assignments) is the right contract between Step 4 and Step 5.

### 1.5 Assign File (Step 5) — Teacher Ranking
The `getRanked()` scoring function (lang match +4, no conflict +3, not over-hours +2, native speaker +1, minus load ratio) is a practical, explainable algorithm. The QA (Quick Assign) mode — double-click a teacher, then click bands — is an ergonomic power-user feature. The conflict detection (same day, same hour) is correct. The room conflict check (`checkSalaConflict`) extends this appropriately.

### 1.6 Mensagens File (Step 6) — Absence Engine
The absence threshold logic (minors: ≥2 absences → alert; adults: ≥3 absences) is school-policy-aware. The `alertLevel()` function returning `critical/red/minor/adult/null` provides graduated urgency. The print attendance sheet — generating a proper HTML print window with colour-coded rows, alert flags, and totals — is production-ready.

### 1.7 Watchlist (alm-painel-central.html)
The pin/unpin/resolve cycle with localStorage-backed notes is a clever low-cost CRM feature. The `resolved` flag and colour-coded card borders provide at-a-glance state. Notes carry timestamps.

### 1.8 Topbar Navigation Consistency
All files share the numbered tab strip (1 Painel → 2 Audit → 3 Formation → 4 Decision → 5 Assign → 6 Watch/Mensagens). The `tab-link` vs `tab` (active) distinction is consistently applied. The live dot + "LIVE" label sets correct expectations.

---

## Section 2 — What Needs Refining

### 2.1 🔴 CRITICAL: Five Different Student Modal/Dossier Implementations

This is the most serious architectural flaw in the codebase. There are **five distinct implementations** of the student personal data card:

| File | Implementation | Style |
|------|---------------|-------|
| `alm-painel-central.html` | `openDossier()` — full V10 iOS-style sheet, 400+ lines | Dark glass, `DM Sans`, accordion sections |
| `alm-confirmar-turmas-criadas.html` | `openDossier()` — inline modal, hero wave SVG, tiles | IBM Plex Mono, gold accent, drawer |
| `alm-atribuir-turmas.html` (v4/v5) | `openDossier()` — `.ds-overlay` sheet, dept gradients | IBM Plex Mono, minimal, 3 accordion sections |
| `alm-mensagens.html` | No student dossier — only inline row actions | No modal at all |
| `dashboard.html` | No student dossier | Branch-level only |

Each implementation fetches different columns, renders different sections, and has different save logic. A student's data can look completely different depending on which screen a staff member opens them from. This is **unacceptable in a production system** — it creates training confusion, inconsistent data edits, and maintenance nightmares.

**Required:** A single `ALMDossier` Web Component or shared JS module, injected via `<script src="/shared/dossier.js">`, with a consistent field set, save contract, and visual language.

### 2.2 🔴 CRITICAL: Files 4 and 5 Are Identical Duplicates

`alm-atribuir-turmas.html` appears twice in the document set (documents 4 and 5) with **identical code**. This means one of two things: either the file was accidentally duplicated, or two divergent versions exist in production with no clear canonical. Either scenario is dangerous — edits to one will not propagate to the other.

**Required:** Immediately delete the duplicate. Establish a single canonical `alm-atribuir-turmas.html`.

### 2.3 <!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ALM · Painel Principal</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
/* ══════════════════════════════════════
   RESET & BASE
══════════════════════════════════════ */
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#C9A84C;
  --gold-hi:#E8C97A;
  --gold-lo:rgba(210,180,100,0.35);
  --gold-dim:rgba(210,180,100,0.08);
  --bg-deep:#09060F;
  --bg-mid:#1A1520;
  --text-body:rgba(235,210,155,0.82);
  --green:#1DB954;
  --amber:#E8B84B;
  --red:#E8455A;
  --teal:#2ECC8A;
  --font-display:'Bebas Neue',sans-serif;
  --font-body:'IBM Plex Sans',sans-serif;
  --font-mono:'IBM Plex Mono',monospace;
}

.desktop{
  width:100%;height:100vh;min-height:600px;
  background:linear-gradient(155deg,#1A1520 0%,#2E2240 45%,#5C3D6E 75%,#C49A5A 100%);
  position:relative;font-family:var(--font-body);
  display:flex;flex-direction:column;overflow:hidden;
}
.wave-bg{position:absolute;inset:0;pointer-events:none;z-index:1}

/* ══════════════════════════════════════
   TASKBAR
══════════════════════════════════════ */
.taskbar{
  height:42px;flex-shrink:0;
  background:rgba(12,8,20,0.72);
  border-bottom:0.5px solid rgba(210,180,120,0.1);
  display:flex;align-items:center;padding:0 18px;gap:10px;
  z-index:20;position:relative;
}
.tb-logo{
  font-family:var(--font-display);
  font-size:22px;color:var(--gold-hi);letter-spacing:3px;flex-shrink:0;line-height:1;
}
.tb-sep{width:0.5px;height:12px;background:rgba(210,180,100,0.18);flex-shrink:0}

/* ── LIVE DOT ── */
.live-dot-wrap{display:flex;align-items:center;gap:5px;flex-shrink:0}
.live-dot{
  width:6px;height:6px;border-radius:50%;
  background:var(--green);
  box-shadow:0 0 5px rgba(29,185,84,0.8);
  transition:background 0.4s,box-shadow 0.4s;
}
.live-dot.amber{background:var(--amber);box-shadow:0 0 5px rgba(232,184,75,0.7);animation:flicker 2s infinite}
.live-dot.red{background:var(--red);box-shadow:0 0 6px rgba(232,69,90,0.8);animation:flicker 1.2s infinite}
.live-lbl{font-family:var(--font-mono);font-size:8px;font-weight:600;color:rgba(210,180,100,0.4);letter-spacing:0.1em}

/* ── STAT PILLS ── */
.tb-stat{
  display:flex;align-items:center;gap:5px;
  background:var(--gold-dim);
  border:0.5px solid rgba(210,180,100,0.18);
  border-radius:999px;padding:3px 11px;cursor:default;position:relative;transition:all 0.15s;
}
.tb-stat:hover{background:rgba(210,180,100,0.14);border-color:rgba(210,180,100,0.32)}
.tb-stat-num{font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--gold-hi);letter-spacing:-0.2px}
.tb-stat-lbl{font-size:9px;font-weight:500;color:rgba(210,180,100,0.45);text-transform:uppercase;letter-spacing:0.06em}
.tb-stat-dot{width:5px;height:5px;border-radius:50%;background:rgba(210,180,100,0.3);flex-shrink:0}
.tb-stat-dot.ok{background:var(--gold)}

/* ── TOOLTIPS ── */
.stat-tooltip{
  position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%);
  background:rgba(10,6,20,0.98);border:0.5px solid rgba(210,180,100,0.22);
  border-radius:12px;padding:12px 14px;pointer-events:none;
  opacity:0;transition:opacity 0.15s;z-index:400;min-width:220px;
}
.tb-stat:hover .stat-tooltip{opacity:1}
.stat-tooltip::before{content:'';position:absolute;bottom:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-bottom-color:rgba(210,180,100,0.22)}
.tt-title{font-family:var(--font-mono);font-size:9px;font-weight:600;color:var(--gold-hi);margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase}
.tt-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:3px 0;border-bottom:0.5px solid rgba(210,180,100,0.06)}
.tt-row:last-of-type{border-bottom:none}
.tt-key{font-size:9px;color:rgba(210,180,100,0.38);font-family:var(--font-body)}
.tt-val{font-size:9px;font-weight:600;color:var(--text-body);font-family:var(--font-mono)}
.tt-val.warn{color:rgba(232,184,75,0.9)}
.tt-divider{margin:7px 0;border:none;border-top:0.5px solid rgba(210,180,100,0.1)}
.tt-bar-row{display:flex;align-items:center;gap:8px;padding:3px 0}
.tt-bar-label{font-size:8.5px;color:rgba(210,180,100,0.45);width:72px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-body)}
.tt-bar-track{flex:1;height:3px;background:rgba(210,180,100,0.1);border-radius:2px;overflow:hidden}
.tt-bar-fill{height:100%;border-radius:2px;background:var(--gold)}
.tt-bar-num{font-size:8px;font-weight:600;color:rgba(235,210,155,0.65);min-width:28px;text-align:right;font-family:var(--font-mono)}
.tt-hint{font-size:8px;color:rgba(210,180,100,0.32);margin-top:8px;padding-top:6px;border-top:0.5px solid rgba(210,180,100,0.08);text-align:center}

/* ── HEALTH INDICATOR ── */
.tb-health{
  display:flex;align-items:center;gap:7px;padding:3px 11px 3px 8px;
  border-radius:999px;border:0.5px solid;cursor:pointer;position:relative;
  transition:all 0.2s;text-decoration:none;
}
.tb-health.healthy   {background:rgba(29,185,84,0.08);  border-color:rgba(29,185,84,0.25)}
.tb-health.viable    {background:rgba(46,204,138,0.08); border-color:rgba(46,204,138,0.22)}
.tb-health.concerning{background:rgba(232,184,75,0.08); border-color:rgba(232,184,75,0.25)}
.tb-health.unviable  {background:rgba(232,69,90,0.08);  border-color:rgba(232,69,90,0.25)}
.tb-health-light{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.tb-health.healthy    .tb-health-light{background:var(--green);box-shadow:0 0 6px rgba(29,185,84,0.8)}
.tb-health.viable     .tb-health-light{background:var(--teal);box-shadow:0 0 5px rgba(46,204,138,0.6)}
.tb-health.concerning .tb-health-light{background:var(--amber);box-shadow:0 0 6px rgba(232,184,75,0.7);animation:flicker 2.5s infinite}
.tb-health.unviable   .tb-health-light{background:var(--red);box-shadow:0 0 7px rgba(232,69,90,0.8);animation:flicker 1.4s infinite}
.tb-health-text{display:flex;flex-direction:column;gap:1px}
.tb-health-lbl{font-family:var(--font-mono);font-size:8px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase}
.tb-health.healthy    .tb-health-lbl{color:rgba(29,185,84,0.9)}
.tb-health.viable     .tb-health-lbl{color:rgba(46,204,138,0.9)}
.tb-health.concerning .tb-health-lbl{color:rgba(232,184,75,0.95)}
.tb-health.unviable   .tb-health-lbl{color:rgba(232,69,90,0.95)}
.tb-health-sub{font-size:7px;color:rgba(210,180,100,0.35);letter-spacing:0.05em}
.tb-health-tooltip{
  position:absolute;top:calc(100% + 9px);left:50%;transform:translateX(-50%);
  background:rgba(10,6,20,0.98);border:0.5px solid rgba(210,180,100,0.22);
  border-radius:10px;padding:9px 13px;white-space:nowrap;pointer-events:none;
  opacity:0;transition:opacity 0.15s;z-index:300;min-width:200px;
}
.tb-health:hover .tb-health-tooltip{opacity:1}
.tb-health-tooltip::before{content:'';position:absolute;bottom:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-bottom-color:rgba(210,180,100,0.22)}
.tht-title{font-family:var(--font-mono);font-size:9px;font-weight:600;color:var(--gold-hi);margin-bottom:6px;letter-spacing:0.06em}
.tht-row{display:flex;justify-content:space-between;gap:16px;padding:2px 0;border-bottom:0.5px solid rgba(210,180,100,0.06)}
.tht-row:last-of-type{border-bottom:none}
.tht-key{font-size:9px;color:rgba(210,180,100,0.38)}
.tht-val{font-size:9px;font-weight:600;color:var(--text-body);font-family:var(--font-mono)}
.tht-breakdown{margin-top:7px;padding-top:6px;border-top:0.5px solid rgba(210,180,100,0.1);display:flex;gap:4px;flex-wrap:wrap}
.tht-chip{font-size:8px;font-weight:600;padding:2px 7px;border-radius:999px;display:flex;align-items:center;gap:4px}
.tht-chip-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.tht-chip.healthy   {background:rgba(29,185,84,0.1); color:rgba(29,185,84,0.9); border:0.5px solid rgba(29,185,84,0.25)}
.tht-chip.viable    {background:rgba(46,204,138,0.1);color:rgba(46,204,138,0.9);border:0.5px solid rgba(46,204,138,0.25)}
.tht-chip.concerning{background:rgba(232,184,75,0.1);color:rgba(232,184,75,0.95);border:0.5px solid rgba(232,184,75,0.28)}
.tht-chip.unviable  {background:rgba(232,69,90,0.1); color:rgba(232,69,90,0.95); border:0.5px solid rgba(232,69,90,0.25)}

/* ══════════════════════════════════════
   REPORT PILL
══════════════════════════════════════ */
.report-pill{
  display:flex;align-items:center;gap:7px;
  background:rgba(201,168,76,0.12);
  border:0.5px solid rgba(201,168,76,0.3);
  border-radius:999px;padding:4px 13px 4px 9px;
  cursor:pointer;position:relative;transition:all 0.2s;
  flex-shrink:0;
}
.report-pill:hover{background:rgba(201,168,76,0.2);border-color:rgba(201,168,76,0.5);transform:translateY(-1px)}
.report-pill-dot{
  width:7px;height:7px;border-radius:50%;
  background:var(--gold);box-shadow:0 0 6px rgba(201,168,76,0.7);
  animation:pulse-gold 2.4s infinite;
}
@keyframes pulse-gold{0%,100%{box-shadow:0 0 6px rgba(201,168,76,0.7)}50%{box-shadow:0 0 10px rgba(201,168,76,1),0 0 16px rgba(201,168,76,0.4)}}
.report-pill-text{font-family:var(--font-mono);font-size:9px;font-weight:600;color:var(--gold-hi);letter-spacing:0.12em}

/* ── REPORT PANEL ── */
.report-overlay{
  display:none;position:fixed;inset:0;
  background:rgba(5,3,12,0.7);backdrop-filter:blur(4px);
  z-index:600;align-items:flex-start;justify-content:flex-end;
  padding:52px 18px 0 0;
}
.report-overlay.open{display:flex}
.report-panel{
  width:clamp(320px,38vw,520px);
  max-height:calc(100vh - 68px);
  background:rgba(14,9,26,0.98);
  border:0.5px solid rgba(210,180,100,0.2);
  border-radius:16px;overflow:hidden;
  display:flex;flex-direction:column;
  animation:slideIn 0.22s cubic-bezier(0.4,0,0.2,1);
}
@keyframes slideIn{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:none}}
.rp-header{
  display:flex;align-items:center;gap:10px;padding:14px 16px;
  border-bottom:0.5px solid rgba(210,180,100,0.1);flex-shrink:0;
}
.rp-header-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 6px rgba(201,168,76,0.7)}
.rp-title{font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--gold-hi);letter-spacing:0.12em;flex:1}
.rp-close{
  width:22px;height:22px;border-radius:50%;
  background:rgba(210,180,100,0.08);border:none;cursor:pointer;
  color:rgba(210,180,100,0.45);font-size:14px;
  display:flex;align-items:center;justify-content:center;transition:all 0.15s;
}
.rp-close:hover{background:rgba(210,180,100,0.16);color:var(--gold-hi)}

/* topic chips */
.rp-topics{display:flex;gap:6px;padding:10px 14px;flex-wrap:wrap;border-bottom:0.5px solid rgba(210,180,100,0.08);flex-shrink:0}
.rp-chip{
  font-family:var(--font-mono);font-size:8.5px;font-weight:600;
  padding:4px 10px;border-radius:999px;cursor:pointer;
  border:0.5px solid rgba(210,180,100,0.2);color:rgba(210,180,100,0.5);
  background:transparent;transition:all 0.15s;letter-spacing:0.06em;
}
.rp-chip:hover{background:rgba(210,180,100,0.1);color:var(--gold-hi);border-color:rgba(210,180,100,0.4)}
.rp-chip.active{background:rgba(201,168,76,0.15);color:var(--gold-hi);border-color:rgba(201,168,76,0.5)}

/* content area */
.rp-body{flex:1;overflow-y:auto;padding:14px 16px;scrollbar-width:thin;scrollbar-color:rgba(210,180,100,0.15) transparent}
.rp-body::-webkit-scrollbar{width:3px}
.rp-body::-webkit-scrollbar-thumb{background:rgba(210,180,100,0.15);border-radius:2px}

.rp-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:40px 0;color:rgba(210,180,100,0.4)}
.rp-spinner{width:24px;height:24px;border:2px solid rgba(210,180,100,0.1);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.rp-spinner-lbl{font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase}

.rp-content{font-family:var(--font-body);font-size:12px;color:rgba(235,210,155,0.78);line-height:1.7}
.rp-content h3{font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--gold-hi);letter-spacing:0.1em;text-transform:uppercase;margin:14px 0 6px;padding-bottom:4px;border-bottom:0.5px solid rgba(210,180,100,0.1)}
.rp-content h3:first-child{margin-top:0}
.rp-content p{margin-bottom:8px}
.rp-content ul{padding-left:14px;margin-bottom:8px}
.rp-content li{margin-bottom:4px}
.rp-content .rp-tag{display:inline-block;font-family:var(--font-mono);font-size:8px;font-weight:600;padding:2px 7px;border-radius:999px;margin:1px;vertical-align:middle}
.rp-tag.ok   {background:rgba(29,185,84,0.12); color:#1DB954;border:0.5px solid rgba(29,185,84,0.3)}
.rp-tag.warn {background:rgba(232,184,75,0.12);color:#E8B84B;border:0.5px solid rgba(232,184,75,0.3)}
.rp-tag.crit {background:rgba(232,69,90,0.12); color:#E8455A;border:0.5px solid rgba(232,69,90,0.3)}
.rp-tag.info {background:rgba(201,168,76,0.1); color:var(--gold-hi);border:0.5px solid rgba(201,168,76,0.25)}

.rp-footer{padding:10px 14px;border-top:0.5px solid rgba(210,180,100,0.08);flex-shrink:0}
.rp-gen-btn{
  width:100%;padding:9px;
  background:rgba(201,168,76,0.85);border:none;border-radius:8px;
  font-family:var(--font-mono);font-size:10px;font-weight:600;
  color:#09080F;cursor:pointer;letter-spacing:0.08em;transition:all 0.15s;
}
.rp-gen-btn:hover{background:var(--gold-hi);transform:translateY(-1px)}
.rp-gen-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
.rp-ts{font-family:var(--font-mono);font-size:8px;color:rgba(210,180,100,0.3);text-align:center;margin-top:6px;letter-spacing:0.04em}

/* ══════════════════════════════════════
   ANO LECTIVO DROPDOWN
══════════════════════════════════════ */
.year-wrap{margin-left:auto;position:relative;flex-shrink:0}
.year-btn{
  display:flex;align-items:center;gap:8px;
  background:rgba(210,180,100,0.07);border:0.5px solid rgba(210,180,100,0.2);
  border-radius:8px;padding:4px 11px;cursor:pointer;color:var(--gold-hi);
  font-family:var(--font-mono);font-size:11px;font-weight:600;letter-spacing:0.03em;
  transition:all 0.15s;user-select:none;
}
.year-btn:hover{background:rgba(210,180,100,0.13);border-color:rgba(210,180,100,0.35)}
.year-btn-inner{display:flex;flex-direction:column;gap:1px}
.year-label{font-size:7.5px;color:rgba(210,180,100,0.4);font-weight:400;letter-spacing:0.06em;text-transform:uppercase;font-family:var(--font-body)}
.year-chevron{font-size:9px;color:rgba(210,180,100,0.4);transition:transform 0.2s;flex-shrink:0}
.year-wrap.open .year-chevron{transform:rotate(180deg)}
.year-dropdown{
  position:absolute;top:calc(100% + 8px);right:0;
  background:rgba(10,6,20,0.98);border:0.5px solid rgba(210,180,100,0.2);
  border-radius:10px;overflow:hidden;
  pointer-events:none;opacity:0;transform:translateY(-6px);
  transition:all 0.15s;z-index:500;min-width:210px;
}
.year-wrap.open .year-dropdown{opacity:1;transform:translateY(0);pointer-events:auto}
.year-option{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 13px;cursor:pointer;font-family:var(--font-body);
  font-size:11px;color:rgba(210,180,100,0.55);
  transition:background 0.1s;border-bottom:0.5px solid rgba(210,180,100,0.06);
}
.year-option:last-child{border-bottom:none}
.year-option:hover{background:rgba(210,180,100,0.08);color:var(--gold-hi)}
.year-option.active{color:var(--gold-hi);font-weight:600}
.year-badge{font-size:7.5px;padding:2px 7px;border-radius:999px;white-space:nowrap;font-weight:600;font-family:var(--font-mono)}
.year-badge.current {background:rgba(29,185,84,0.12); border:0.5px solid rgba(29,185,84,0.28); color:#1DB954}
.year-badge.anterior{background:rgba(201,168,76,0.12); border:0.5px solid rgba(201,168,76,0.25);color:var(--gold)}
.year-badge.archive {background:rgba(136,135,128,0.1); border:0.5px solid rgba(136,135,128,0.2); color:rgba(210,180,100,0.35)}
.year-cfg-panel{padding:10px 13px 8px;border-top:0.5px solid rgba(210,180,100,0.12);display:flex;flex-direction:column;gap:6px}
.ycp-label{font-size:7px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(210,180,100,0.35);font-family:var(--font-body)}
.ycp-dates{display:flex;align-items:center;gap:5px}
.ycp-inp{flex:1;background:rgba(255,255,255,.04);border:.5px solid rgba(210,180,100,.2);color:var(--gold-hi);font-family:var(--font-mono);font-size:9px;padding:4px 6px;outline:none;border-radius:4px;-webkit-appearance:none}
.ycp-inp:focus{border-color:rgba(210,180,100,.45)}
.ycp-sep{font-size:9px;color:rgba(210,180,100,.35);flex-shrink:0}
.ycp-btn{width:100%;padding:5px;background:rgba(29,185,84,.85);border:none;border-radius:4px;font-family:var(--font-mono);font-size:9px;font-weight:700;color:#09080F;cursor:pointer;letter-spacing:.06em;transition:opacity .12s}
.ycp-btn:hover{opacity:.85}
.ycp-status{font-size:8px;text-align:center;min-height:12px;color:rgba(210,180,100,.4);font-family:var(--font-mono)}

.tb-time{font-family:var(--font-mono);font-size:9.5px;color:rgba(210,180,100,0.3);flex-shrink:0;margin-left:6px}

/* ══════════════════════════════════════
   BODY
══════════════════════════════════════ */
.body{flex:1;display:flex;position:relative;overflow:hidden}
.left-zone{width:44%;display:flex;align-items:center;justify-content:center;z-index:10}

/* ── MODULE GRID ── */
.modules-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,1.8vw,26px)}
.mod{
  width:clamp(72px,7.4vw,98px);height:clamp(72px,7.4vw,98px);
  border-radius:22%;
  background:linear-gradient(145deg,#EEE0C0 0%,#D9C490 100%);
  box-shadow:5px 5px 14px rgba(10,6,20,0.5),-2px -2px 6px rgba(240,220,160,0.2),inset 0 1px 0 rgba(255,248,225,0.85),inset 0 -1px 0 rgba(140,110,50,0.2);
  border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:clamp(3px,0.35vw,5px);cursor:pointer;
  transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
  position:relative;overflow:visible; /* overflow:visible for badge */
}
.mod::before{
  content:'';position:absolute;top:0;left:0;right:0;height:45%;
  background:linear-gradient(180deg,rgba(255,250,230,0.45) 0%,rgba(255,235,170,0) 100%);
  border-radius:22% 22% 0 0;pointer-events:none;
}
.mod:hover{transform:translateY(-3px) scale(1.04)}
.mod:active{transform:translateY(0) scale(0.97)}
.mod-icon{position:relative;z-index:1}
.mod-icon svg{width:clamp(16px,1.8vw,24px);height:clamp(16px,1.8vw,24px);stroke:#4A3560;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round;display:block}
.mod-lbl{font-family:var(--font-body);font-size:clamp(6.5px,0.58vw,8.5px);font-weight:700;letter-spacing:0.08em;color:#4A3560;text-transform:uppercase;white-space:nowrap;position:relative;z-index:1}

/* ── ALERT BADGE ── */
.mod-badge{
  position:absolute;top:-7px;right:-7px;
  min-width:18px;height:18px;padding:0 4px;
  background:var(--red);border-radius:999px;
  border:2px solid #2E2240;
  font-family:var(--font-mono);font-size:8.5px;font-weight:700;
  color:#fff;display:flex;align-items:center;justify-content:center;
  z-index:20;box-shadow:0 0 8px rgba(232,69,90,0.7);
  animation:badge-pulse 2s infinite;
  pointer-events:none;
  opacity:0;transition:opacity 0.3s;
}
.mod-badge.visible{opacity:1}
.mod-badge.amber{background:var(--amber);box-shadow:0 0 8px rgba(232,184,75,0.7)}
@keyframes badge-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}

.divider{width:0.5px;background:rgba(210,180,100,0.08);margin:20px 0;align-self:stretch;z-index:5}
.right-zone{flex:1;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;padding:0 clamp(22px,4vw,56px) 0 0;position:relative;z-index:5}
.dot-wrap{position:absolute;left:-8%;top:50%;transform:translateY(-50%);width:78%;pointer-events:none;opacity:0.12}
.dot-wrap svg{width:100%;height:auto}
.hero{text-align:right;position:relative;z-index:2}
.alm-letters{font-family:var(--font-display);font-size:clamp(80px,13vw,160px);color:var(--gold-hi);line-height:0.85;letter-spacing:4px}
.alm-sub{font-family:var(--font-body);font-size:clamp(7px,0.75vw,11px);letter-spacing:0.2em;color:rgba(232,200,120,0.75);text-transform:uppercase;margin-top:clamp(6px,0.8vw,12px);font-weight:500}

/* ══════════════════════════════════════
   BRANCH ROW
══════════════════════════════════════ */
.branch-row{
  height:36px;flex-shrink:0;
  background:rgba(10,6,18,0.45);
  border-top:0.5px solid rgba(210,180,100,0.08);
  display:flex;align-items:center;justify-content:center;
  gap:6px;z-index:10;padding:0 18px;position:relative;
}
.branch-skeleton{
  height:22px;width:90px;border-radius:999px;
  background:linear-gradient(90deg,rgba(210,180,100,0.06) 25%,rgba(210,180,100,0.12) 50%,rgba(210,180,100,0.06) 75%);
  background-size:200% 100%;
  animation:shimmer 1.5s infinite;
}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.branch{
  background:rgba(0,0,0,0.2);border:0.5px solid rgba(210,180,100,0.14);
  border-radius:999px;padding:4px 10px 4px 8px;
  font-family:var(--font-body);font-size:clamp(8px,0.6vw,10px);
  color:rgba(210,180,100,0.4);cursor:pointer;transition:all 0.15s;
  font-weight:500;display:flex;align-items:center;gap:6px;position:relative;
}
.branch.active,.branch:hover{background:rgba(210,180,100,0.14);border-color:rgba(210,180,100,0.4);color:var(--gold-hi)}
.branch-light{width:6px;height:6px;border-radius:50%;flex-shrink:0;transition:all 0.2s}
.branch-light.healthy   {background:var(--green);box-shadow:0 0 5px rgba(29,185,84,0.7)}
.branch-light.viable    {background:var(--teal);box-shadow:0 0 4px rgba(46,204,138,0.5)}
.branch-light.concerning{background:var(--amber);box-shadow:0 0 5px rgba(232,184,75,0.6);animation:flicker 2.5s infinite}
.branch-light.unviable  {background:var(--red);box-shadow:0 0 6px rgba(232,69,90,0.7);animation:flicker 1.4s infinite}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:0.55}}

.branch-tooltip{
  position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);
  background:rgba(10,6,20,0.97);border:0.5px solid rgba(210,180,100,0.22);
  border-radius:8px;padding:9px 13px;white-space:nowrap;pointer-events:none;
  opacity:0;transition:opacity 0.15s;z-index:200;min-width:160px;
}
.branch:hover .branch-tooltip{opacity:1}
.bt-name{font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--gold-hi);margin-bottom:6px}
.bt-row{display:flex;justify-content:space-between;gap:14px;font-size:9px;padding:2px 0}
.bt-key{color:rgba(210,180,100,0.38);font-family:var(--font-body)}
.bt-val{color:var(--text-body);font-weight:500;font-family:var(--font-mono)}
.bt-enrol-bar{margin:6px 0 2px;height:3px;background:rgba(210,180,100,0.1);border-radius:2px;overflow:hidden}
.bt-enrol-fill{height:100%;border-radius:2px;transition:width 0.6s ease}
.bt-status{font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:0.06em;margin-top:6px;padding:2px 8px;border-radius:999px;display:inline-block}
.bt-status.healthy   {background:rgba(29,185,84,0.15);color:var(--green);border:0.5px solid rgba(29,185,84,0.35)}
.bt-status.viable    {background:rgba(46,204,138,0.12);color:var(--teal);border:0.5px solid rgba(46,204,138,0.3)}
.bt-status.concerning{background:rgba(232,184,75,0.12);color:var(--amber);border:0.5px solid rgba(232,184,75,0.3)}
.bt-status.unviable  {background:rgba(232,69,90,0.12); color:var(--red);border:0.5px solid rgba(232,69,90,0.3)}
.bt-hint{font-size:8px;color:rgba(210,180,100,0.4);margin-top:6px;padding-top:5px;border-top:0.5px solid rgba(210,180,100,0.1);text-align:center;font-family:var(--font-body)}
.branch-tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:rgba(210,180,100,0.22)}

/* ══════════════════════════════════════
   MODULE MODAL
══════════════════════════════════════ */
.overlay{display:none;position:absolute;inset:0;background:rgba(10,6,20,0.65);z-index:50;align-items:center;justify-content:center}
.overlay.open{display:flex}
.modal{background:rgba(22,15,35,0.97);border:0.5px solid rgba(210,180,100,0.16);border-radius:18px;padding:0 0 16px;width:clamp(240px,28%,320px);max-height:80%;overflow-y:auto;scrollbar-width:none}
.modal::-webkit-scrollbar{display:none}
.modal-header{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;border-bottom:0.5px solid rgba(210,180,100,0.1)}
.modal-dot{width:7px;height:7px;border-radius:50%;background:var(--gold)}
.modal-title{font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--gold-hi);text-transform:uppercase;letter-spacing:0.1em}
.modal-close{margin-left:auto;width:22px;height:22px;border-radius:50%;background:rgba(210,180,100,0.08);border:none;cursor:pointer;color:rgba(210,180,100,0.45);font-size:14px;display:flex;align-items:center;justify-content:center}
.modal-close:hover{background:rgba(210,180,100,0.16);color:var(--gold-hi)}
.modal-section-label{font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(210,180,100,0.32);padding:8px 14px 3px}
.modal-divider{height:0.5px;background:rgba(210,180,100,0.08);margin:6px 14px 0}
.nav-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;margin:4px 14px;background:rgba(210,180,100,0.04);border:0.5px solid rgba(210,180,100,0.09);border-radius:10px;cursor:pointer;text-decoration:none;transition:background 0.15s}
.nav-row:hover{background:rgba(210,180,100,0.1)}
.nav-row-left{display:flex;align-items:center;gap:10px}
.nav-row-icon{width:28px;height:28px;border-radius:8px;background:rgba(201,168,76,0.1);border:0.5px solid rgba(210,180,100,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.nav-row-icon svg{width:14px;height:14px;stroke:rgba(210,180,100,0.7);stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
.nav-row-text{display:flex;flex-direction:column;gap:2px}
.nav-row-title{font-family:var(--font-body);font-size:12px;font-weight:600;color:rgba(235,210,155,0.85)}
.nav-row-sub{font-size:9px;color:rgba(210,180,100,0.35);letter-spacing:0.04em;font-family:var(--font-body)}
.nav-row-badge{font-family:var(--font-mono);font-size:8px;font-weight:600;padding:2px 7px;border-radius:999px;background:rgba(232,184,75,0.15);border:0.5px solid rgba(232,184,75,0.28);color:var(--amber);white-space:nowrap}
.nav-row-badge.ok{background:rgba(46,204,138,0.12);border-color:rgba(46,204,138,0.28);color:var(--teal)}
.modal-desc{font-family:var(--font-body);font-size:10px;color:rgba(210,180,100,0.35);padding:10px 14px 2px;line-height:1.5}

/* ══════════════════════════════════════
   MOBILE
══════════════════════════════════════ */
@media(max-width:600px){
  .desktop{height:100dvh}
  .taskbar{padding:0 10px;gap:6px}
  .tb-stat-lbl{display:none}
  .tb-stat{padding:3px 8px;gap:4px}
  .tb-stat-num{font-size:10px}
  .tb-sep{margin:0 4px}
  .tb-time{display:none}
  .year-btn{padding:3px 8px}
  .year-label{display:none}
  #yearVal{font-size:10px}
  .report-pill-text{display:none}
  .body{flex-direction:column;align-items:center;justify-content:flex-start;overflow-y:auto}
  .divider{display:none}
  .right-zone{order:-1;width:100%;align-items:center;justify-content:center;padding:8px 0;flex-shrink:0}
  .dot-wrap{display:none}
  .hero{text-align:center}
  .alm-letters{font-size:clamp(52px,16vw,72px);letter-spacing:1px;line-height:1}
  .alm-sub{font-size:9px;margin-top:6px}
  .left-zone{width:100%;flex-shrink:0;display:flex;justify-content:center}
  .modules-grid{gap:8px;grid-template-columns:repeat(3,1fr);width:100%;max-width:min(320px,90vw)}
  .mod{width:100%;height:auto;aspect-ratio:1/1;border-radius:20%}
  .branch-row{height:auto;min-height:30px;padding:4px 8px;flex-wrap:wrap;gap:4px}
  .branch{font-size:8px;padding:3px 8px 3px 6px}
  .report-overlay{padding:52px 0 0}
  .report-panel{width:100%;border-radius:16px 16px 0 0}
}
</style>
</head>
<body>
<div class="desktop">

  <!-- Wave background -->
  <div class="wave-bg">
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M0 480 C180 430,340 500,520 460 C700 420,820 500,1000 455 C1100 432,1160 448,1200 440 L1200 600 L0 600 Z" fill="rgba(15,10,28,0.2)"/>
      <path d="M0 510 C140 480,300 540,480 505 C660 470,780 530,960 495 C1080 472,1150 488,1200 480 L1200 600 L0 600 Z" fill="rgba(8,5,18,0.12)"/>
      <path d="M 150 370 C 260 310, 380 260, 490 290 C 570 310, 600 360, 580 390 C 560 420, 520 420, 490 400 C 450 372, 470 320, 540 300 C 620 278, 740 250, 880 230 C 1020 210, 1160 225, 1280 195 L 1380 180 L 1380 202 C 1160 248, 1020 232, 880 252 C 740 272, 620 301, 540 323 C 470 344, 450 396, 490 424 C 520 444, 560 444, 580 414 C 600 384, 570 334, 490 314 C 380 284, 260 334, 150 394 Z" fill="rgba(200,160,80,0.06)"/>
      <path d="M 150 370 C 260 310, 380 260, 490 290 C 570 310, 600 360, 580 390 C 560 420, 520 420, 490 400 C 450 372, 470 320, 540 300 C 620 278, 740 250, 880 230 C 1020 210, 1160 225, 1280 195 L 1380 180" fill="none" stroke="rgba(220,185,100,0.16)" stroke-width="1.4" stroke-linecap="round"/>
      <radialGradient id="sun2" cx="80%" cy="15%" r="40%">
        <stop offset="0%" stop-color="rgba(220,185,100,0.14)"/>
        <stop offset="55%" stop-color="rgba(140,90,160,0.05)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
      <rect width="100%" height="100%" fill="url(#sun2)"/>
    </svg>
  </div>

  <!-- ══ TASKBAR ══ -->
  <div class="taskbar">
    <span class="tb-logo">ALM</span>
    <div class="tb-sep"></div>

    <!-- Live connectivity dot -->
    <div class="live-dot-wrap" title="Estado da ligação">
      <div class="live-dot" id="live-dot"></div>
      <span class="live-lbl" id="live-lbl">LIVE</span>
    </div>
    <div class="tb-sep"></div>

    <!-- Alunos pill -->
    <div class="tb-stat">
      <div class="tb-stat-dot ok"></div>
      <div class="tb-stat-num" id="stat-alunos">—</div>
      <div class="tb-stat-lbl">Alunos</div>
      <div class="stat-tooltip" id="alunos-tooltip" style="min-width:240px">
        <div class="tt-title">Alunos por filial</div>
        <div id="tt-branch-bars">
          <!-- populated by loadBranchData() -->
          <div class="tt-bar-row"><span class="tt-bar-label">A carregar…</span><div class="tt-bar-track"><div class="tt-bar-fill" style="width:0%"></div></div><span class="tt-bar-num">—</span></div>
        </div>
        <hr class="tt-divider"/>
        <div class="tt-row"><span class="tt-key">Total geral</span><span class="tt-val" id="tt-total">—</span></div>
        <div class="tt-row"><span class="tt-key">Inscrição média</span><span class="tt-val" id="tt-avg-enrol">—</span></div>
        <div class="tt-hint">Passe o rato sobre uma filial no rodapé para mais detalhes</div>
      </div>
    </div>

    <!-- Turmas pill -->
    <div class="tb-stat">
      <div class="tb-stat-dot"></div>
      <div class="tb-stat-num" id="stat-turmas">—</div>
      <div class="tb-stat-lbl">Turmas</div>
      <div class="stat-tooltip" style="min-width:220px">
        <div class="tt-title">Turmas activas</div>
        <div id="tt-turmas-rows"><div style="font-size:9px;color:rgba(210,180,100,0.3);padding:4px 0">A carregar…</div></div>
        <hr class="tt-divider"/>
        <div class="tt-row"><span class="tt-key">Turmas com conflitos</span><span class="tt-val warn" id="tt-conflitos">—</span></div>
        <div class="tt-hint">Clique em Turmas para ver o mapa completo</div>
      </div>
    </div>

    <!-- Professores pill -->
    <div class="tb-stat">
      <div class="tb-stat-dot"></div>
      <div class="tb-stat-num" id="stat-profs">—</div>
      <div class="tb-stat-lbl">Professores</div>
      <div class="stat-tooltip" style="min-width:230px">
        <div class="tt-title">Professores activos</div>
        <div class="tt-row"><span class="tt-key">Em actividade</span><span class="tt-val" id="tt-profs">—</span></div>
        <div class="tt-row"><span class="tt-key">Turmas médias / professor</span><span class="tt-val" id="tt-turmas-per-prof">—</span></div>
        <div class="tt-row"><span class="tt-key">Sumários em falta</span><span class="tt-val warn" id="tt-sumarios">—</span></div>
        <div class="tt-hint">Clique em Professores para ver fichas</div>
      </div>
    </div>

    <div class="tb-sep"></div>

    <!-- Health indicator -->
    <a class="tb-health" href="/command-centre" id="tb-health">
      <div class="tb-health-light"></div>
      <div class="tb-health-text">
        <div class="tb-health-lbl" id="tb-health-lbl">—</div>
        <div class="tb-health-sub">saúde global</div>
      </div>
      <div class="tb-health-tooltip" id="tb-health-tooltip"></div>
    </a>

    <!-- ── REPORT PILL ── -->
    <div class="report-pill" id="report-pill-btn" onclick="openReport()">
      <div class="report-pill-dot"></div>
      <span class="report-pill-text">RELATÓRIO</span>
    </div>

    <!-- Ano Lectivo dropdown -->
    <div class="year-wrap" id="yearWrap">
      <div class="year-btn" onclick="toggleYear(event)">
        <div class="year-btn-inner">
          <span class="year-label">Ano Lectivo</span>
          <span id="yearVal">—</span>
        </div>
        <span class="year-chevron">▾</span>
      </div>
      <div class="year-dropdown">
        <div class="year-option active" onclick="selectYear(this,'2025/2026')">2025 / 2026 <span class="year-badge current">actual</span></div>
        <div class="year-option" onclick="selectYear(this,'2024/2025')">2024 / 2025 <span class="year-badge anterior">anterior</span></div>
        <div class="year-option" onclick="selectYear(this,'2023/2024')">2023 / 2024 <span class="year-badge archive">arquivo</span></div>
        <div class="year-option" onclick="selectYear(this,'2022/2023')">2022 / 2023 <span class="year-badge archive">arquivo</span></div>
        <div class="year-option" onclick="selectYear(this,'2021/2022')">2021 / 2022 <span class="year-badge archive">arquivo</span></div>
        <div class="year-cfg-panel">
          <div class="ycp-label">Datas lectivas (aplica-se a todos os professores)</div>
          <div class="ycp-dates">
            <input type="date" id="cfg-start" class="ycp-inp" title="Início do ano lectivo"/>
            <span class="ycp-sep">→</span>
            <input type="date" id="cfg-end" class="ycp-inp" title="Fim do ano lectivo"/>
          </div>
          <button class="ycp-btn" onclick="saveSchoolDates()">✓ Guardar datas lectivas</button>
          <div id="cfg-status" class="ycp-status"></div>
        </div>
      </div>
    </div>

    <span class="tb-time" id="t"></span>
  </div>

  <!-- ══ BODY ══ -->
  <div class="body">
    <div class="left-zone">
      <div class="modules-grid">

        <div class="mod" onclick="openModal('alunos')">
          <div class="mod-badge amber" id="badge-alunos"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>
          <div class="mod-lbl">Alunos</div>
        </div>

        <div class="mod" onclick="openModal('horarios')">
          <div class="mod-badge" id="badge-horarios"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
          <div class="mod-lbl">Horários</div>
        </div>

        <div class="mod" onclick="openModal('professores')">
          <div class="mod-badge" id="badge-professores"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13"/><path d="M4 19h16M9 10h6M9 14h4"/></svg></div>
          <div class="mod-lbl">Professores</div>
        </div>

        <div class="mod" onclick="openModal('pagamentos')">
          <div class="mod-badge" id="badge-pagamentos"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
          <div class="mod-lbl">Pagamentos</div>
        </div>

        <div class="mod" onclick="openModal('turmas')">
          <div class="mod-badge" id="badge-turmas"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
          <div class="mod-lbl">Turmas</div>
        </div>

        <div class="mod" onclick="openModal('testes')">
          <div class="mod-badge" id="badge-testes"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
          <div class="mod-lbl">Testes</div>
        </div>

        <div class="mod" onclick="openModal('traducoes')">
          <div class="mod-icon"><svg viewBox="0 0 24 24"><path d="M3 5h8M7 3v2M3 9c0 2.5 2 4.5 4 6"/><path d="M9 9c-.5 2-2 3.5-3.5 5M13 21l4-9 4 9M14.5 18h5"/></svg></div>
          <div class="mod-lbl">Traduções</div>
        </div>

        <div class="mod" onclick="openModal('stock')">
          <div class="mod-badge" id="badge-stock"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><path d="M2 7l10-4 10 4v10l-10 4L2 17Z"/><path d="M12 3v18M2 7l10 4 10-4"/></svg></div>
          <div class="mod-lbl">Stock</div>
        </div>

        <div class="mod" onclick="openModal('fotocopias')">
          <div class="mod-badge" id="badge-fotocopias"></div>
          <div class="mod-icon"><svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V5a1 1 0 011-1h6a1 1 0 011 1v3"/><circle cx="17" cy="13" r="1" fill="#4A3560"/><path d="M7 17h6"/></svg></div>
          <div class="mod-lbl">Fotocópias</div>
        </div>

      </div>
    </div>

    <div class="divider"></div>

    <div class="right-zone">
      <div class="dot-wrap">
        <svg viewBox="0 0 520 560" xmlns="http://www.w3.org/2000/svg" fill="#E8C97A">
          <circle cx="80" cy="200" r="2.2"/><circle cx="98" cy="190" r="2.2"/><circle cx="116" cy="182" r="2.2"/><circle cx="134" cy="178" r="2.2"/><circle cx="152" cy="181" r="2.2"/><circle cx="170" cy="190" r="2.2"/><circle cx="188" cy="200" r="2.2"/><circle cx="206" cy="208" r="2.2"/><circle cx="224" cy="213" r="2.2"/><circle cx="242" cy="215" r="2.2"/><circle cx="260" cy="213" r="2.2"/><circle cx="278" cy="208" r="2.2"/><circle cx="296" cy="200" r="2.2"/><circle cx="314" cy="191" r="2.2"/>
          <circle cx="72" cy="218" r="2.2"/><circle cx="90" cy="207" r="2.2"/><circle cx="108" cy="198" r="2.2"/><circle cx="126" cy="194" r="2.2"/><circle cx="144" cy="197" r="2.2"/><circle cx="162" cy="207" r="2.2"/><circle cx="180" cy="217" r="2.2"/><circle cx="198" cy="226" r="2.2"/><circle cx="216" cy="231" r="2.2"/><circle cx="234" cy="233" r="2.2"/><circle cx="252" cy="231" r="2.2"/><circle cx="270" cy="225" r="2.2"/><circle cx="288" cy="217" r="2.2"/>
          <circle cx="66" cy="236" r="2.2"/><circle cx="84" cy="224" r="2.2"/><circle cx="102" cy="215" r="2.2"/><circle cx="120" cy="211" r="2.2"/><circle cx="138" cy="214" r="2.2"/><circle cx="156" cy="224" r="2.2"/><circle cx="174" cy="235" r="2.2"/><circle cx="192" cy="244" r="2.2"/><circle cx="210" cy="249" r="2.2"/><circle cx="228" cy="251" r="2.2"/><circle cx="246" cy="249" r="2.2"/>
          <circle cx="62" cy="254" r="2.2"/><circle cx="80" cy="242" r="2.2"/><circle cx="98" cy="232" r="2.2"/><circle cx="116" cy="228" r="2.2"/><circle cx="134" cy="231" r="2.2"/><circle cx="152" cy="241" r="2.2"/><circle cx="170" cy="252" r="2.2"/><circle cx="188" cy="261" r="2.2"/>
          <circle cx="60" cy="272" r="2.2"/><circle cx="78" cy="260" r="2.2"/><circle cx="96" cy="250" r="2.2"/><circle cx="114" cy="246" r="2.2"/><circle cx="132" cy="249" r="2.2"/><circle cx="150" cy="259" r="2.2"/><circle cx="168" cy="270" r="2.2"/>
          <circle cx="90" cy="168" r="2.2"/><circle cx="108" cy="160" r="2.2"/><circle cx="126" cy="154" r="2.2"/><circle cx="144" cy="151" r="2.2"/><circle cx="162" cy="154" r="2.2"/><circle cx="180" cy="162" r="2.2"/>
          <circle cx="100" cy="148" r="2.2"/><circle cx="118" cy="140" r="2.2"/><circle cx="136" cy="135" r="2.2"/><circle cx="154" cy="133" r="2.2"/>
          <circle cx="112" cy="130" r="2.2"/><circle cx="130" cy="122" r="2.2"/>
        </svg>
      </div>
      <div class="hero">
        <div class="alm-letters">ALM</div>
        <div class="alm-sub">Academia de Línguas da Madeira</div>
      </div>
    </div>

    <!-- Module modal overlay -->
    <div class="overlay" id="overlay" onclick="handleOverlay(event)">
      <div class="modal" id="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-dot"></div>
          <div class="modal-title" id="modal-title">—</div>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div id="modal-body"></div>
      </div>
    </div>
  </div>

  <!-- ══ BRANCH ROW ══ -->
  <div class="branch-row" id="branch-row">
    <!-- skeleton placeholders while loading -->
    <div class="branch-skeleton"></div>
    <div class="branch-skeleton"></div>
    <div class="branch-skeleton"></div>
    <div class="branch-skeleton"></div>
    <div class="branch-skeleton"></div>
    <div class="branch-skeleton"></div>
    <div class="branch-skeleton"></div>
  </div>
</div>

<!-- ══ REPORT PANEL ══ -->
<div class="report-overlay" id="report-overlay" onclick="handleReportOverlay(event)">
  <div class="report-panel" onclick="event.stopPropagation()">
    <div class="rp-header">
      <div class="rp-header-dot"></div>
      <div class="rp-title">RELATÓRIO OPERACIONAL</div>
      <button class="rp-close" onclick="closeReport()">×</button>
    </div>
    <div class="rp-topics">
      <button class="rp-chip active" onclick="selectTopic(this,'geral')">Geral</button>
      <button class="rp-chip" onclick="selectTopic(this,'filiais')">Filiais</button>
      <button class="rp-chip" onclick="selectTopic(this,'turmas')">Turmas</button>
      <button class="rp-chip" onclick="selectTopic(this,'professores')">Professores</button>
      <button class="rp-chip" onclick="selectTopic(this,'alertas')">Alertas</button>
    </div>
    <div class="rp-body" id="rp-body">
      <div class="rp-loading" id="rp-loading" style="display:none">
        <div class="rp-spinner"></div>
        <div class="rp-spinner-lbl">A analisar dados…</div>
      </div>
      <div class="rp-content" id="rp-content">
        <p style="color:rgba(210,180,100,0.35);font-size:11px">Seleccione um tema acima e clique em <strong style="color:rgba(210,180,100,0.6)">Gerar Relatório</strong> para obter uma análise em linguagem natural dos dados actuais da ALM.</p>
      </div>
    </div>
    <div class="rp-footer">
      <button class="rp-gen-btn" id="rp-gen-btn" onclick="generateReport()">✦ Gerar Relatório</button>
      <div class="rp-ts" id="rp-ts"></div>
    </div>
  </div>
</div>

<script>
/* ══════════════════════════════════════
   SUPABASE CONFIG
══════════════════════════════════════ */
const SB  = 'https://oapygbeliocdvitbdjbq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcHlnYmVsaW9jZHZpdGJkamJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjQzNjAsImV4cCI6MjA5MjA0MDM2MH0.-9Uj9Bg3q8sIlqzfzw2Sc1JziaueeyYGNwep-qWhWWg';
const SBH = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

/* ══════════════════════════════════════
   CONNECTIVITY STATE
══════════════════════════════════════ */
let _failCount = 0;
function setConnState(ok) {
  if (ok) { _failCount = 0; }
  else { _failCount++; }
  const dot = document.getElementById('live-dot');
  const lbl = document.getElementById('live-lbl');
  if (_failCount === 0) {
    dot.className = 'live-dot';
    lbl.textContent = 'LIVE';
  } else if (_failCount <= 2) {
    dot.className = 'live-dot amber';
    lbl.textContent = 'LENTO';
  } else {
    dot.className = 'live-dot red';
    lbl.textContent = 'OFFLINE';
  }
}

/* ══════════════════════════════════════
   CLOCK
══════════════════════════════════════ */
function updateClock() {
  const d = new Date();
  document.getElementById('t').textContent =
    d.toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) +
    ' · ' + d.toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' });
}
updateClock();
setInterval(updateClock, 30000);

/* ══════════════════════════════════════
   YEAR DROPDOWN
══════════════════════════════════════ */
function toggleYear(e) {
  e.stopPropagation();
  document.getElementById('yearWrap').classList.toggle('open');
}
function selectYear(el, val) {
  document.getElementById('yearVal').textContent = val.replace('/', ' / ');
  document.querySelectorAll('.year-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('yearWrap').classList.remove('open');
  window.dispatchEvent(new CustomEvent('anoLectivoChange', { detail: { ano: val } }));
}
document.addEventListener('click', e => {
  if (!document.getElementById('yearWrap').contains(e.target))
    document.getElementById('yearWrap').classList.remove('open');
});

async function saveSchoolDates() {
  const start  = document.getElementById('cfg-start').value;
  const end    = document.getElementById('cfg-end').value;
  const status = document.getElementById('cfg-status');
  if (!start || !end) { status.textContent = 'Seleccione início e fim'; status.style.color = '#E8455A'; return; }
  const ay = start.slice(0,4)+'/'+end.slice(0,4);
  status.textContent = 'A guardar…'; status.style.color = 'rgba(210,180,100,.5)';
  try {
    const r = await fetch(`${SB}/rest/v1/school_config`, {
      method:'POST', headers:{...SBH, Prefer:'resolution=merge-duplicates,return=minimal'},
      body: JSON.stringify([{key:'year_start_date',value:start},{key:'year_end_date',value:end},{key:'academic_year',value:ay}]),
    });
    if (!r.ok) throw new Error('HTTP '+r.status);
    document.getElementById('yearVal').textContent = ay.replace('/', ' / ');
    status.textContent = '✓ Guardado'; status.style.color = '#1DB954';
    setTimeout(() => { status.textContent=''; document.getElementById('yearWrap').classList.remove('open'); }, 1800);
  } catch (e) {
    status.textContent = 'Erro: '+e.message.slice(0,40); status.style.color='#E8455A';
  }
}

async function loadSchoolConfig() {
  try {
    const r = await fetch(`${SB}/rest/v1/school_config?select=key,value`, { headers: SBH });
    if (!r.ok) return;
    const rows = await r.json();
    rows.forEach(row => {
      if (row.key === 'year_start_date' && document.getElementById('cfg-start')) document.getElementById('cfg-start').value = row.value;
      if (row.key === 'year_end_date'   && document.getElementById('cfg-end'))   document.getElementById('cfg-end').value   = row.value;
      if (row.key === 'academic_year') {
        document.getElementById('yearVal').textContent = row.value.replace('/', ' / ');
        document.querySelectorAll('.year-option').forEach(o => {
          const m = o.textContent.match(/(\d{4})\s*\/\s*(\d{4})/);
          if (m) o.classList.toggle('active', m[1]+'/'+m[2] === row.value);
        });
      }
    });
  } catch(e) { console.warn('school_config:', e.message); }
}

/* ══════════════════════════════════════
   LIVE BRANCH DATA FROM SUPABASE
   Replaces the hardcoded BRANCHES array
══════════════════════════════════════ */
const STATUS_LABEL = { healthy:'Saudável', viable:'Viável', concerning:'Atenção', unviable:'Inviável' };
const STATUS_ORDER = ['healthy','viable','concerning','unviable'];

// Determine branch health from enrolment %
function branchStatus(pct) {
  if (pct >= 85) return 'healthy';
  if (pct >= 72) return 'viable';
  if (pct >= 58) return 'concerning';
  return 'unviable';
}

// Branch colour for enrolment bar in tooltip
function enrolColour(pct) {
  if (pct >= 85) return '#1DB954';
  if (pct >= 72) return '#2ECC8A';
  if (pct >= 58) return '#E8B84B';
  return '#E8455A';
}

let _branches = []; // will be populated by loadBranchData()

async function loadBranchData() {
  try {
    // ── 1. Enrolment counts by branch ──────────────────────────────
    // We expect enrolments table to have a `branch` column.
    // We fetch all and group client-side (avoids needing a DB view).
    const [enrolRes, classRes, profRes] = await Promise.all([
      fetch(`${SB}/rest/v1/enrolments?select=ref,branch&limit=5000`, { headers: SBH }),
      fetch(`${SB}/rest/v1/classes?select=branch,turma_code,level_code&limit=5000`, { headers: SBH }),
      fetch(`${SB}/rest/v1/teachers?select=id&limit=500`, { headers: SBH }),
    ]);

    setConnState(enrolRes.ok);
    if (!enrolRes.ok) throw new Error('enrolments HTTP ' + enrolRes.status);

    const enrols  = await enrolRes.json();
    const classes = classRes.ok  ? await classRes.json()  : [];
    const profs   = profRes.ok   ? await profRes.json()   : [];

    // ── 2. Group by branch ─────────────────────────────────────────
    const branchMap = {};
    enrols.forEach(e => {
      if (!e.branch) return;
      if (!branchMap[e.branch]) branchMap[e.branch] = { alunos:0, turmas:0, hasCapacity:0 };
      branchMap[e.branch].alunos++;
    });

    // timetable_requests for capacity reference (max enrolled vs capacity)
    // We'll use classes to get turma counts per branch
    classes.forEach(c => {
      if (!c.branch || !branchMap[c.branch]) return;
      branchMap[c.branch].turmas = (branchMap[c.branch].turmas || 0) + 1;
    });

    // ── 3. Friendly labels ─────────────────────────────────────────
    const BRANCH_LABELS = {
      funchal:'Funchal · Sede', machico:'Machico', scruz:'S. Cruz',
      rbrava:'R. Brava', calheta:'Calheta', psol:'P. do Sol', estreito:'Estreito',
    };

    // Total students for bar chart scaling
    const totalAlunos = Object.values(branchMap).reduce((a,b) => a + b.alunos, 0);

    // Build branches array, sorted by student count desc
    _branches = Object.entries(branchMap)
      .map(([id, data]) => {
        // Enrolment % — fallback to a reasonable default if turmas is 0
        // (real capacity calc would need a capacity column; we estimate 14 per turma)
        const capacity = (data.turmas || 1) * 14;
        const enrolPct = Math.min(100, Math.round((data.alunos / capacity) * 100));
        return {
          id,
          label: BRANCH_LABELS[id] || id,
          alunos: data.alunos,
          turmas: data.turmas || 0,
          enrolPct,
          status: branchStatus(enrolPct),
          barPct: totalAlunos > 0 ? Math.round((data.alunos / totalAlunos) * 100) : 0,
        };
      })
      .sort((a,b) => b.alunos - a.alunos);

    // ── 4. Update stat pills ───────────────────────────────────────
    const totalTurmas = classes.length;
    const totalProfs  = profs.length;

    document.getElementById('stat-alunos').textContent = totalAlunos.toLocaleString('pt-PT');
    document.getElementById('tt-total').textContent    = totalAlunos.toLocaleString('pt-PT') + ' alunos';
    document.getElementById('stat-turmas').textContent = totalTurmas || '—';
    document.getElementById('stat-profs').textContent  = totalProfs  || '—';
    document.getElementById('tt-profs').textContent    = totalProfs;
    document.getElementById('tt-turmas-per-prof').textContent = totalProfs > 0
      ? (totalTurmas / totalProfs).toFixed(1) : '—';

    // Average enrolment %
    const avgEnrol = _branches.length > 0
      ? Math.round(_branches.reduce((a,b) => a + b.enrolPct, 0) / _branches.length)
      : 0;
    document.getElementById('tt-avg-enrol').textContent = avgEnrol + '%';

    // ── 5. Branch bars in Alunos tooltip ──────────────────────────
    document.getElementById('tt-branch-bars').innerHTML = _branches.map(b => `
      <div class="tt-bar-row">
        <span class="tt-bar-label">${b.label}</span>
        <div class="tt-bar-track"><div class="tt-bar-fill" style="width:${b.barPct}%"></div></div>
        <span class="tt-bar-num">${b.alunos}</span>
      </div>`).join('');

    // Turmas per branch in Turmas tooltip
    document.getElementById('tt-turmas-rows').innerHTML = _branches.map(b =>
      `<div class="tt-row"><span class="tt-key">${b.label}</span><span class="tt-val">${b.turmas} turmas</span></div>`
    ).join('');

    // ── 6. Render branch pills at the bottom ──────────────────────
    renderBranches();

    // ── 7. Health indicator ────────────────────────────────────────
    renderSchoolHealth(totalAlunos, avgEnrol, totalTurmas);

    // ── 8. Sumários missing (teachers with recent lesson_summaries = 0) ──
    loadAlertBadges(totalProfs, totalTurmas);

  } catch(e) {
    console.warn('loadBranchData failed:', e.message);
    setConnState(false);
    // Render branch row as error state
    document.getElementById('branch-row').innerHTML =
      `<span style="font-size:9px;color:rgba(232,69,90,0.7);font-family:var(--font-mono)">⚠ Sem ligação ao servidor</span>`;
  }
}

function renderBranches() {
  document.getElementById('branch-row').innerHTML = _branches.map(b => `
    <div class="branch" onclick="goBranch('${b.id}')">
      <div class="branch-light ${b.status}"></div>
      ${b.label}
      <div class="branch-tooltip">
        <div class="bt-name">${b.label}</div>
        <div class="bt-row"><span class="bt-key">Alunos</span><span class="bt-val">${b.alunos}</span></div>
        <div class="bt-row"><span class="bt-key">Turmas</span><span class="bt-val">${b.turmas}</span></div>
        <div class="bt-row"><span class="bt-key">Ocupação est.</span><span class="bt-val">${b.enrolPct}%</span></div>
        <div class="bt-enrol-bar"><div class="bt-enrol-fill" style="width:${b.enrolPct}%;background:${enrolColour(b.enrolPct)}"></div></div>
        <div><span class="bt-status ${b.status}">${STATUS_LABEL[b.status]}</span></div>
        <div class="bt-hint">Clique para ver o painel →</div>
      </div>
    </div>`).join('');
}

function goBranch(id) {
  window.location.href = 'command-centre.html?branch=' + id;
}

function renderSchoolHealth(totalAlunos, avgEnrol, totalTurmas) {
  const counts = { healthy:0, viable:0, concerning:0, unviable:0 };
  _branches.forEach(b => counts[b.status]++);

  let status;
  if      (avgEnrol >= 85) status = 'healthy';
  else if (avgEnrol >= 72) status = 'viable';
  else if (avgEnrol >= 58) status = 'concerning';
  else                     status = 'unviable';
  // Drag down if any branch is unviable
  if (counts.unviable > 0 && status === 'healthy') status = 'viable';

  const el = document.getElementById('tb-health');
  el.className = 'tb-health ' + status;
  document.getElementById('tb-health-lbl').textContent = STATUS_LABEL[status];

  const chips = STATUS_ORDER.map(s => counts[s] > 0
    ? `<div class="tht-chip ${s}"><div class="tht-chip-dot" style="background:currentColor"></div>${counts[s]} ${STATUS_LABEL[s]}</div>`
    : '').join('');

  document.getElementById('tb-health-tooltip').innerHTML = `
    <div class="tht-title">Saúde Global · Todas as Filiais</div>
    <div class="tht-row"><span class="tht-key">Ocupação média</span><span class="tht-val">${avgEnrol}%</span></div>
    <div class="tht-row"><span class="tht-key">Total de alunos</span><span class="tht-val">${totalAlunos.toLocaleString('pt-PT')}</span></div>
    <div class="tht-row"><span class="tht-key">Filiais activas</span><span class="tht-val">${_branches.length}</span></div>
    <div class="tht-row"><span class="tht-key">Turmas totais</span><span class="tht-val">${totalTurmas}</span></div>
    <div class="tht-breakdown">${chips}</div>`;
}

/* ══════════════════════════════════════
   ALERT BADGES ON MODULE TILES
   Only show where real data is available
══════════════════════════════════════ */
function showBadge(id, count, colour) {
  const el = document.getElementById('badge-' + id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : count;
    el.className   = 'mod-badge visible' + (colour === 'amber' ? ' amber' : '');
  }
}

async function loadAlertBadges(totalProfs, totalTurmas) {
  // Run independent fetches; each failure is non-fatal
  const results = await Promise.allSettled([
    // Timetable requests awaiting assignment (Horários badge)
    fetch(`${SB}/rest/v1/timetable_requests?select=ref&assigned_turma=is.null`, { headers:{...SBH, Prefer:'count=exact', Range:'0-0'} }),
    // Teachers with missing sumários in last 7 days (Professores badge)
    fetch(`${SB}/rest/v1/teachers?select=id&has_missing_sumarios=eq.true`, { headers:{...SBH, Prefer:'count=exact', Range:'0-0'} }),
    // Overdue payments (Pagamentos badge)
    fetch(`${SB}/rest/v1/payments?select=id&status=eq.overdue`, { headers:{...SBH, Prefer:'count=exact', Range:'0-0'} }),
    // Photocopy requests pending (Fotocópias badge)
    fetch(`${SB}/rest/v1/teacher_requests?select=id&type=eq.photocopy&status=eq.pending`, { headers:{...SBH, Prefer:'count=exact', Range:'0-0'} }),
    // Attendance alerts today (Turmas badge)
    fetch(`${SB}/rest/v1/attendance?select=id&date=eq.${new Date().toISOString().slice(0,10)}&status=eq.absent`, { headers:{...SBH, Prefer:'count=exact', Range:'0-0'} }),
    // Stock below minimum (Stock badge)
    fetch(`${SB}/rest/v1/stock_items?select=id&below_minimum=eq.true`, { headers:{...SBH, Prefer:'count=exact', Range:'0-0'} }),
  ]);

  const getCount = (res) => {
    if (res.status !== 'fulfilled') return 0;
    const r = res.value;
    if (!r.ok) return 0;
    const ct = r.headers.get('content-range');
    if (!ct) return 0;
    const n = parseInt(ct.split('/')[1], 10);
    return isNaN(n) ? 0 : n;
  };

  const [horarios, profs, pagamentos, fotocopias, turmas, stock] = results.map(getCount);

  showBadge('horarios',    horarios,   'red');
  showBadge('professores', profs,      'amber');
  showBadge('pagamentos',  pagamentos, 'red');
  showBadge('fotocopias',  fotocopias, 'amber');
  showBadge('turmas',      turmas,     'amber');
  showBadge('stock',       stock,      'amber');

  // Also update sumários in tooltip
  document.getElementById('tt-sumarios').textContent = profs > 0 ? profs + ' professor(es)' : '—';
  // Update conflitos stat
  document.getElementById('tt-conflitos').textContent = turmas > 0 ? turmas + ' ausências hoje' : '0';
}

/* ══════════════════════════════════════
   REPORT PANEL
══════════════════════════════════════ */
let _activeTopic = 'geral';
let _lastReport  = null;

function openReport()  { document.getElementById('report-overlay').classList.add('open'); }
function closeReport() { document.getElementById('report-overlay').classList.remove('open'); }
function handleReportOverlay(e) { if (e.target === document.getElementById('report-overlay')) closeReport(); }

function selectTopic(el, topic) {
  _activeTopic = topic;
  document.querySelectorAll('.rp-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

async function generateReport() {
  const btn = document.getElementById('rp-gen-btn');
  const loading = document.getElementById('rp-loading');
  const content = document.getElementById('rp-content');
  const ts = document.getElementById('rp-ts');

  btn.disabled = true;
  btn.textContent = '✦ A gerar…';
  loading.style.display = 'flex';
  content.style.display = 'none';

  // ── Gather live data snapshot for the prompt ──
  const totalAlunos  = document.getElementById('stat-alunos').textContent;
  const totalTurmas  = document.getElementById('stat-turmas').textContent;
  const totalProfs   = document.getElementById('stat-profs').textContent;
  const healthStatus = document.getElementById('tb-health-lbl').textContent;
  const avgOcupacao  = document.getElementById('tt-avg-enrol').textContent;
  const ano          = document.getElementById('yearVal').textContent;

  const branchSummary = _branches.map(b =>
    `${b.label}: ${b.alunos} alunos, ${b.turmas} turmas, ${b.enrolPct}% ocupação → ${STATUS_LABEL[b.status]}`
  ).join('\n');

  // Pull live alert counts from badge elements (already fetched from Supabase)
  const badgeCount = (id) => {
    const el = document.getElementById('badge-' + id);
    if (!el || !el.classList.contains('visible')) return 0;
    return parseInt(el.textContent) || 0;
  };
  const alertHorarios   = badgeCount('horarios');
  const alertProfs      = badgeCount('professores');
  const alertPagamentos = badgeCount('pagamentos');
  const alertFotocopias = badgeCount('fotocopias');
  const alertTurmas     = badgeCount('turmas');
  const alertStock      = badgeCount('stock');

  const alertSummary = [
    alertHorarios   > 0 ? `${alertHorarios} pedido(s) de horário por atribuir` : null,
    alertProfs      > 0 ? `${alertProfs} professor(es) com sumários em falta` : null,
    alertPagamentos > 0 ? `${alertPagamentos} pagamento(s) em atraso` : null,
    alertFotocopias > 0 ? `${alertFotocopias} pedido(s) de fotocópia pendentes` : null,
    alertTurmas     > 0 ? `${alertTurmas} ausência(s) registadas hoje` : null,
    alertStock      > 0 ? `${alertStock} artigo(s) de stock abaixo do mínimo` : null,
  ].filter(Boolean).join('\n') || 'Sem alertas activos neste momento.';

  // Items resolved since the May 2026 audit — Claude must NOT raise these as open issues
  const resolvedItems = `
ITENS JÁ RESOLVIDOS (não mencionar como problemas em aberto):
- Dados de filiais eram estáticos/hardcoded → substituídos por dados em tempo real do Supabase
- Indicador LIVE estava sempre verde → agora reflecte o estado real da ligação (verde/âmbar/vermelho)
- Tipografia inconsistente entre ficheiros → padronizada em Bebas Neue + IBM Plex Sans + IBM Plex Mono
- Painel de filiais no rodapé era estático → agora carrega dados reais com barras de ocupação dinâmicas
- Dashboard não tinha indicador de alertas por módulo → adicionados badges com contagem em tempo real
- O relatório operacional (este painel) foi implementado como nova funcionalidade`.trim();

  const topicPrompts = {
    geral: `Faz um briefing operacional conciso (máx 220 palavras) para a direcção da ALM sobre o estado actual da escola. Usa os dados abaixo. Estrutura em 3 secções com tags <h3>: "Situação Geral", "Pontos de Atenção" e "Recomendação Imediata". Sê directo e concreto — menciona números reais. Não repitas itens já resolvidos.`,

    filiais: `Analisa o desempenho das filiais da ALM com base nos dados em tempo real. Identifica as filiais com melhor e pior desempenho, explica as causas prováveis e dá uma recomendação de acção específica para cada filial em situação de Atenção ou Inviável. Usa os dados de filiais fornecidos. Máx 240 palavras.`,

    turmas: `Analisa a situação das turmas da ALM. Comenta a distribuição de alunos por turma, a taxa de ocupação média e eventuais desequilíbrios entre filiais. Com base nos dados, sugere se é prioritário criar, fundir ou cancelar turmas em alguma filial. Máx 210 palavras.`,

    professores: `Analisa o quadro de professores da ALM. Comenta a relação turmas/professor, os sumários em falta e o impacto operacional. Se houver alertas activos relacionados com professores, prioriza-os. Máx 190 palavras.`,

    alertas: `Lista APENAS os alertas operacionais activos que requerem atenção da direcção da ALM. Para cada alerta indica: gravidade com tag <span class="rp-tag crit">CRÍTICO</span> ou <span class="rp-tag warn">ATENÇÃO</span>, descrição do problema, e acção recomendada. Se não houver alertas activos, confirma que o sistema está operacional. Máx 220 palavras.`,
  };

  const systemPrompt = `És o sistema de análise operacional da Academia de Línguas da Madeira (ALM), uma escola de línguas profissional na Madeira, Portugal.

REGRAS ABSOLUTAS:
1. Respondes SEMPRE em português europeu formal. Nunca uses inglês.
2. Usas HTML simples para formatar: <h3> para secções, <p> para parágrafos, <ul><li> para listas.
3. Podes usar <span class="rp-tag ok">, <span class="rp-tag warn">, <span class="rp-tag crit">, <span class="rp-tag info"> para etiquetas de estado inline.
4. Baseias a tua análise APENAS nos dados fornecidos — não inventas valores.
5. NÃO mencionas os itens da lista de resolvidos como problemas em aberto.
6. És conciso, directo e orientado para a acção — sem introduções genéricas.`;

  const userPrompt = `${topicPrompts[_activeTopic]}

DADOS EM TEMPO REAL (${ano}):
- Total de alunos: ${totalAlunos}
- Total de turmas: ${totalTurmas}
- Total de professores: ${totalProfs}
- Saúde global: ${healthStatus}
- Ocupação média: ${avgOcupacao}

FILIAIS (dados ao vivo do Supabase):
${branchSummary || 'Dados de filiais não disponíveis'}

ALERTAS ACTIVOS (módulos com itens pendentes):
${alertSummary}

${resolvedItems}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) throw new Error('API HTTP ' + response.status);
    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';

    loading.style.display = 'none';
    content.style.display = 'block';
    content.innerHTML = text;
    _lastReport = text;

    const now = new Date().toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' });
    ts.textContent = `Gerado às ${now} · Ano ${ano}`;

  } catch(e) {
    loading.style.display = 'none';
    content.style.display = 'block';
    content.innerHTML = `<p style="color:#E8455A;font-size:11px">⚠ Não foi possível gerar o relatório: ${e.message}</p>`;
  }

  btn.disabled = false;
  btn.textContent = '✦ Regenerar Relatório';
}

/* ══════════════════════════════════════
   MODULE MODALS
══════════════════════════════════════ */
const MODAL_DATA = {
  alunos: { title:'Alunos', desc:'Gestão de fichas, inscrições e histórico académico.', pages:[
    { label:'Nova inscrição',       sub:'Registar novo aluno',              href:'master-enrollment-file.html', dot:'ok'   },
    { label:'Consultar alunos',     sub:'Pesquisa e edição de fichas',      href:'alm-students.html',           dot:'ok'   },
    { label:'Analítico',            sub:'Relatório por filial e nível',     href:'alm-analysis.html',           dot:'ok'   },
    { label:'Atualização de Ficha', sub:'Editar matrícula de aluno',        href:'alm-edit-enrollment.html',    dot:'ok'   },
  ]},
  horarios: {
    title:'Horários', desc:'Gestão dos pedidos de horário e operações de alocação de turmas.',
    sections:[
      { label:'Administração', pages:[
        { label:'Gestão de horários',  sub:'Ver e tratar todos os pedidos',      href:'command-centre.html',             dot:'ok' },
        { label:'Painel operacional',  sub:'Mapa de turmas e alocação',          href:'command-centre-alternative.html', dot:'ok' },
        { label:'Gestão de turmas',    sub:'Criar turmas novas',                 href:'alm-group-formation.html',        dot:'ok' },
      ]},
      { label:'Inscrições', pages:[
        { label:'Marcar Horários',     sub:'Registar pedido de horário para aluno', href:'student-timetable-request.html', dot:'ok' },
        { label:'Atualizar Horários',  sub:'Alterar horário ou nível submetido',    href:'timetable-request-update.html',  dot:'ok' },
        { label:'Verificar Horários',  sub:'Consultar estado de todos os pedidos',  href:'timetable-control-centre.html',  dot:'ok' },
        { label:'Auditoria',           sub:'Statement visual por aluno e turma',    href:'timetable-audit.html',           dot:'ok' },
      ]},
      { label:'Turmas', pages:[
        { label:'Gestão de pedidos',   sub:'Mapa geral dos pedidos',             href:'alm-timetabling-engine.html',     dot:'ok' },
        { label:'Criar Turmas',        sub:'Mapa de turmas e alocação',          href:'alm-allocation-engine.html',      dot:''   },
      ]},
    ]
  },
  professores: { title:'Professores', desc:'Consulta de fichas, distribuição de turmas e comunicação interna.', pages:[
    { label:'Analítica',              sub:'Consulta e edição',             href:'alm-teaching-staff.html',  dot:'ok' },
    { label:'Fichas de professores',  sub:'Consulta e edição',             href:'alm-ficha-professor.html', dot:'ok' },
    { label:'Distribuição por turma', sub:'Ver quem lecciona o quê',       href:'alm-atribuir-turmas.html', dot:'ok' },
    { label:'Gestão de turmas',       sub:'Gestão de aulas dadas',         href:'alm-mensagens.html',       dot:'ok' },
    { label:'Mensagens internas',     sub:'Comunicação com professores',   href:'#',                        dot:''   },
  ]},
  pagamentos: { title:'Pagamentos', desc:'Consulta de pagamentos, alertas de atraso e isenções.', pages:[
    { label:'Por aluno',          sub:'Histórico e estado de conta',    href:'#', dot:''     },
    { label:'Listas de pagamento',sub:'Visão geral de todos os alunos', href:'#', dot:''     },
    { label:'Alertas e atrasos',  sub:'Contas vencidas e avisos',       href:'#', dot:'warn' },
    { label:'Isenções',           sub:'Alunos com desconto ou bolsa',   href:'#', dot:'ok'   },
  ]},
  turmas: { title:'Turmas', desc:'Mapa geral de turmas formadas por língua, nível e professor.', pages:[
    { label:'Mapa geral',       sub:'Todas as turmas activas',       href:'command-centre.html', dot:'ok' },
    { label:'Por professor',    sub:'Turmas atribuídas a cada prof.',href:'#',                   dot:''   },
    { label:'Total por língua', sub:'Resumo estatístico',            href:'#',                   dot:''   },
    { label:'Total por nível',  sub:'Distribuição A1→C2',            href:'#',                   dot:''   },
  ]},
  testes: { title:'Testes', desc:'Agendamento, resultados e controlo de avaliações.', pages:[
    { label:'Testes agendados', sub:'Próximas avaliações',   href:'#', dot:'warn' },
    { label:'Resultados',       sub:'Notas e classificações',href:'#', dot:'ok'   },
    { label:'Por professor',    sub:'Testes por docente',    href:'#', dot:''     },
    { label:'Por turma',        sub:'Testes por grupo',      href:'#', dot:''     },
  ]},
  traducoes: { title:'Traduções', desc:'Pedidos de tradução, orçamentos e estado de trabalhos.', pages:[
    { label:'Pedidos',    sub:'Novos pedidos de tradução',      href:'#', dot:'ok'   },
    { label:'Em curso',   sub:'Trabalhos a decorrer',           href:'#', dot:'warn' },
    { label:'Concluídos', sub:'Arquivo de trabalhos entregues', href:'#', dot:''     },
    { label:'Orçamentos', sub:'Propostas por cliente',          href:'#', dot:''     },
  ]},
  stock: { title:'Stock', desc:'Inventário de livros e materiais pedagógicos.', pages:[
    { label:'Inventário geral',sub:'Todos os artigos em stock', href:'#', dot:'ok'   },
    { label:'Por nível',       sub:'Livros por nível de língua',href:'#', dot:''     },
    { label:'Encomendas',      sub:'Pedidos a fornecedores',    href:'#', dot:'warn' },
    { label:'Stock mínimo',    sub:'Artigos abaixo do mínimo',  href:'#', dot:'warn' },
  ]},
  fotocopias: { title:'Fotocópias', desc:'Registo e controlo de consumo de fotocópias por turma e professor.', pages:[
    { label:'Por professor',    sub:'Consumo individual',          href:'#', dot:''     },
    { label:'Por turma',        sub:'Consumo por grupo',           href:'#', dot:''     },
    { label:'Totais mensais',   sub:'Relatório de consumo mensal', href:'#', dot:'ok'   },
    { label:'Limites e alertas',sub:'Quotas e excedentes',         href:'#', dot:'warn' },
  ]},
};

function makeRows(pages) {
  return pages.map(p => `
    <a class="nav-row" href="${p.href}" ${p.href==='#'?'onclick="return false"':''}>
      <div class="nav-row-left">
        <div class="nav-row-icon"><svg viewBox="0 0 16 16"><polyline points="5 2 10 7 5 12"/></svg></div>
        <div class="nav-row-text">
          <div class="nav-row-title">${p.label}</div>
          <div class="nav-row-sub">${p.sub}</div>
        </div>
      </div>
      ${p.dot==='warn'?`<span class="nav-row-badge">atenção</span>`:p.dot==='ok'?`<span class="nav-row-badge ok">activo</span>`:''}
    </a>`).join('');
}

function openModal(key) {
  const m = MODAL_DATA[key];
  document.getElementById('modal-title').textContent = m.title;
  let body = `<p class="modal-desc">${m.desc}</p>`;
  if (m.sections) {
    m.sections.forEach((s, i) => {
      if (i > 0) body += `<div class="modal-divider"></div>`;
      body += `<div class="modal-section-label">${s.label}</div>`;
      body += `<div style="padding:2px 0 4px">${makeRows(s.pages)}</div>`;
    });
  } else {
    body += `<div style="padding:6px 0 4px">${makeRows(m.pages)}</div>`;
  }
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('overlay').classList.add('open');
}
function closeModal()    { document.getElementById('overlay').classList.remove('open'); }
function handleOverlay(e){ if (e.target===document.getElementById('overlay')) closeModal(); }

/* ══════════════════════════════════════
   BOOT
══════════════════════════════════════ */
loadSchoolConfig();   // year label from Supabase
loadBranchData();     // live branch data → replaces BRANCHES constant
</script>
</body>
</html> CRITICAL: Dashboard Has Hardcoded Branch Data
### 2.3 🟡 Dashboard page might need further refinement and improvement
 

### 2.4 🟡 Supabase Data Contract Fragility

The pipeline depends on several implicit contracts that are never validated:

**`timetable_requests.assigned_turma` format ambiguity.** The Decision file stores `assigned_turma` as the primary session code (e.g. `FUN-01A`), but then strips the suffix (`replace(/[A-D]$/, '')`) to get the group code when needed. The Assign file derives `group_code` as `turma_code.replace(/[A-D]$/, '')`. If any code is ever generated without an alphabetic suffix (e.g. a Saturday double `FUN-01`), this regex silently corrupts. A dedicated `group_code` column should be the canonical reference, not a derived substring.

**`day_of_week` normalisation is duplicated and inconsistent.** The string `'SÁB'` vs `'SAB'` is normalised differently across files:
- `alm-painel-central.html`: `DAY_EN_TO_IDX` maps both `SAB` and `SÁB` to index 5
- `alm-atribuir-turmas.html`: `normDay()` uses `.replace('SAB','SÁB')` on load
- `alm-mensagens.html`: `normDay()` uses its own regex replace

One database row with `day_of_week = 'SAB'` (no accent) will be handled differently by each file. **All normalisation must happen at write time, not read time.**

**`student_refs` column is stringly typed.** It is stored as a JSON string in some rows and a native array in others. Every file handles this with its own try/catch JSON.parse block. This should be a native `jsonb[]` column with a NOT NULL default of `[]`.

**`level_code` vs `level_cefr` dual-column ambiguity.** The Formation file uses `levelKey(e)` = `family|level_code` as a composite key. The Decision file uses `lk(e)` = `level_code || level_cefr`. The Assign file uses `getLM(c.level_code)`. If a row has `level_code = null` and `level_cefr = 'B1'`, three files will classify it differently.

### 2.5 🟡 The `school_config` Table — Fragile Year Lifecycle

`loadSchoolConfig()` in the dashboard fetches `year_start_date`, `year_end_date`, and `academic_year` from a `school_config` key-value table. The Formation and Mensagens files also call this. However:

- If the table doesn't exist yet (new installation), the dashboard silently falls back to a hardcoded label — but other files (Mensagens) may crash on `YEAR_START` being empty, causing `buildDatesForDow()` to return an empty array, making every lesson number show as 0.
- The year selection dropdown in the dashboard does not propagate to other open tabs. A staff member changing the year on the dashboard will see stale data in the Audit panel.

### 2.6 🟡 The `_confirmedCodes` → `localStorage` Confusion in Decision File

The Decision file correctly uses `_confirmedCodes` (a `Set` loaded from the DB) as the authoritative confirmed state. However, the comment history in the code references a previous `localStorage`-based mechanism, and the `school_config` table is still fetched from `alm_config` (a different table name) with a graceful fallback. If both tables exist simultaneously, the file silently ignores `alm_config` errors and uses hardcoded constants — meaning a production `alm_config` configuration is invisible to the system.

### 2.7 🟡 QA Mode Conflict Check Is Incomplete

In `alm-atribuir-turmas.html`, `qaAssign()` checks for teacher conflicts at `day_of_week === c.day_of_week && hour === c.hour`. But the actual class duration is 90 minutes. A teacher with a class at 9h and another at 10h has a real overlap (9:00–10:30 overlaps 10:00–11:30) that this check misses. The conflict detection should compare time ranges, not just hour integers.

### 2.8 🟡 Watchlist Uses localStorage — Not Shared Between Devices

The watchlist (`alm-watchlist`, `alm-watch-notes-{ref}`) is stored in `localStorage`. This means pins made on one device are invisible on another, and notes are lost when clearing browser storage. For a secretarial workflow where multiple staff share notes about a student, this is a significant limitation.

### 2.9 🟡 `absCount` Calculation Window Is Incorrect

In `alm-mensagens.html`, absences are fetched with:
```
date=gte.${yearStart}&date=lte.${yearEnd}
```
But `yearStart` defaults to `weekDates[0]` (this Monday) if `school_config` hasn't loaded. This means if `school_config` fails, absence totals show **only this week's absences**, making every student look fine even if they have 11 cumulative absences. The alert system silently becomes inoperative.

### 2.10 🟡 Missing Optimistic UI Feedback in Several Files

The Decision file shows a saving state on the "CRIAR TURMA" button (turns teal, says "A GUARDAR…"), which is correct. But in the Assign file, `popConfirm()` has no visual loading state — the user clicks "Atribuir" and nothing happens until the `sbPatch` resolves. On a slow connection this looks like a broken button. The same applies to `saveAll()`.

---

## Section 3 — What Is Clearly Missing

### 3.1 No Shared Component Library

Every file reinvents: avatar colour generation (`avCol()`), avatar initials (`avInit()`), toast notifications (`showToast()`), badge rendering, and spinner HTML. These are copy-pasted with minor variations across all 6 files. A shared `alm-shared.js` (or a Web Component bundle) would:
- Guarantee consistent avatar colours for the same student/teacher across all screens
- Ensure toast messages have identical timing and style
- Allow the student dossier to be fixed in one place

### 3.2 No Role-Based Access Control

Every file loads with full read/write access using the anonymous Supabase key. There is no concept of:
- Staff roles (secretária vs director vs professor)
- Read-only vs read-write per module
- Audit trail of who changed what

The anon key is embedded in the HTML source, visible to any user who opens DevTools. For a production school system handling minor student data, this is a GDPR compliance risk.

### 3.3 No Error Recovery UI

When Supabase returns an error, files show a red toast or a text message in a container, but offer no retry mechanism. The user must manually reload the page. A standardised error boundary component with a "Tentar novamente" button and a "Contactar suporte" link would significantly reduce staff frustration.

### 3.4 No Offline / Connection State Indicator

The "LIVE" dot always blinks green regardless of actual connectivity. If Supabase is unreachable, the user sees stale data with no visual warning. The dot should turn amber when the last fetch failed, and red when multiple fetches have failed in succession.

### 3.5 No Data Validation Before Write

The Decision file writes to `classes` without validating:
- That `student_refs` is non-empty before creating a class
- That `start_time < end_time`
- That the `level_code` in the class row matches what enrolments expect
- That `branch` is a valid enum value

A validation layer between the UI action and the Supabase write would prevent silent bad data from propagating downstream.

### 3.6 No Audit/Change Log

When a teacher is reassigned from one class to another in the Assign file, the old assignment is overwritten in the DB with no record of the change. When a student is moved between groups in the Decision file, the same. A `change_log` table with `{table, row_id, field, old_value, new_value, changed_by, changed_at}` is essential for any system that modifies student placements.

### 3.7 The Mensagens File Has No Student Dossier Access

Staff in the Mensagens module can see a student's name, reference, and absence count inline in the attendance row, but cannot open a dossier to see their contact details, guardian info, notes, or timetable request. The only actions available are four icon buttons (message, call, email, flag) that currently just `showToast()` — they do not open any external link or modal. This is a dead end in the workflow.

### 3.8 No "Mensagens" Module Navigation from Other Files

The six-tab navigation strip in files 2–5 ends at tab 6 "Watch/Acompanhar". The Mensagens module (`alm-mensagens.html`) is not in this strip. Staff navigating the pipeline have no in-app link to the messages module from within the workflow — they must return to the dashboard and click the Mensagens tile from the modules grid.

### 3.9 No Real-Time Subscriptions

All files use polling (the Mensagens file auto-refreshes every 60 seconds via `setInterval`). Supabase provides WebSocket-based real-time subscriptions via `supabase.channel()`. Attendance records submitted by a teacher via a separate teacher-facing app would not appear in the secretariat view until the next poll. For a live classroom environment, 60-second latency on attendance data is too slow.

### 3.10 No Mobile Layout for Operational Files

The dashboard has a responsive mobile breakpoint. Files 2–6 do not. The Assign file in particular (a weekly timeline grid with pixel-positioned bands) is completely unusable on a mobile or tablet screen. For a school where staff may walk between branches, this is a functional gap.

### 3.11 No Student Photo
Every student avatar is a generated colour-initial disc. The `has_id_photo` field exists in `timetable_requests` and is referenced in the dossier, but no file ever fetches or displays an actual photo. The `ds-av` element always shows initials. A 32px circular photo from a Supabase Storage bucket would dramatically improve staff recognition speed, especially in the attendance flow.

### 3.12 No Teacher Portal Integration
The entire pipeline assumes secretariat-side data entry. There is no indication of a teacher-facing interface for submitting sumários, attendance, or requesting photocopies programmatically. The `lesson_summaries`, `attendance`, and `teacher_requests` tables are read by the Mensagens file but the submission flow is opaque.

---

## Section 4 — Aesthetic & UX Recommendations

### 4.1 The Winning Dossier Design

The **V10 dossier in `alm-painel-central.html`** is the most sophisticated implementation. It has:
- A colour-matched hero gradient per department
- A contact strip with phone/email deep links
- Collapsible accordion sections with smooth chevron animation
- Per-year academic history with attendance bars
- Flag chips for behavioural/payment notes
- Watchlist pin integration

This design should become the **single canonical dossier**, shared across all files. It needs one addition: a "Turma actual" section showing the confirmed group code, teacher, and schedule from the `classes` table.

### 4.2 Dashboard — Replace Hardcoded Branch Cards with Live Tiles

The branch row at the bottom of the dashboard should become a live data component: each branch tile shows a sparkline of enrolment over the past 4 weeks, the current pending/confirmed group ratio, and the number of unread messages. The health status should derive from actual DB aggregates, not a frozen constant array.

### 4.3 Decision File — Card Size Inconsistency

The group cards in the Decision file use `--card-w: 192px` (a fixed width in a `flex-wrap` grid). On wide screens this creates rows of 6–8 cards that are hard to scan. The cards should use a CSS Grid with `minmax(220px, 1fr)` to fill the available width responsively. The "CRIAR TURMA" button area at the bottom of each card is too small (34px height) for confident touch interaction — increase to 44px.

### 4.4 Formation File — The Sinalizado Panel Needs Visual Rescue

The `SINAL` block in the Formation overview is rendered in the same container as group cards, creating visual competition. It should be moved to a persistent sidebar or a dedicated modal — the orange pulsing border on "SINAL" cards in the Decision file is more effective at communicating urgency. The same signal design should apply here.

### 4.5 Assign File — Band Labels Are Too Small for Real Use

The timeline band labels (`cband-teacher` at 11px, `cband-code` at 13px) are readable only on high-DPI screens. On a standard 1080p monitor at 100% zoom, bands narrower than 80px show only the avatar disc, which is unidentifiable without hover. Consider a minimum band width of 90px, and for bands under 120px, show only the turma code (no teacher name).

### 4.6 Mensagens File — Teacher List Is Underutilising the Left Panel

The teacher list shows name, flag icons, and today's class count. It should also show:
- An unread message badge count (already computed as `pendingMsgs.length`)
- A colour-coded absence alert ring around the avatar (mirroring the Assign file's radial progress ring)
- The next upcoming class time

The right panel hero gradient is reused from the Assign file and looks identical. The Mensagens file should have a distinctly warmer, less monochrome hero — perhaps a richer gold tone to signify the communications context.

### 4.7 Typography Consistency

| File | Body font | Display font |
|------|-----------|-------------|
| Dashboard | `Inter` (system fallback) | — |
| Painel Central | `IBM Plex Mono` + `IBM Plex Sans` + `DM Sans` | — |
| Decision | `IBM Plex Mono` + `IBM Plex Sans` + `Bebas Neue` | Bebas Neue |
| Assign | `IBM Plex Mono` + `IBM Plex Sans` + `Bebas Neue` | Bebas Neue |
| Mensagens | `IBM Plex Mono` + `IBM Plex Sans` + `Bebas Neue` | Bebas Neue |

The dashboard loads `Cinzel`, `JetBrains Mono`, and `Outfit` — none of which appear in any other file. This creates a jarring font jump when navigating from the dashboard to the pipeline. **Standardise on: `Bebas Neue` (display) + `IBM Plex Sans` (body) + `IBM Plex Mono` (data/code).** Drop Cinzel, JetBrains Mono, Outfit, Inter, and DM Sans.

---

## Section 5 — Data Pipeline Risk Map

The following table maps every data hand-off point and its associated risk:

| Hand-off | From | To | Risk | Severity |
|----------|------|----|------|----------|
| Enrolment → Timetable Request | `enrolments.ref` | `timetable_requests.ref` | No FK enforcement visible; orphan refs possible | 🔴 High |
| Timetable Request → Group | `timetable_requests.ref` in `student_refs[]` | `classes.student_refs` | JSON string vs array type mismatch | 🔴 High |
| Group Proposal → Class Creation | Algorithm `buildProposals()` | `sbInsertClass()` | `level_code` not validated against enrolment | 🟡 Medium |
| Class → Teacher Assignment | `classes.group_code` | PATCH by `group_code=eq.X` | Suffix-stripping regex can corrupt non-standard codes | 🔴 High |
| Class → Attendance | `classes.turma_code` | `attendance.turma_code` | No referential integrity; mistyped code = lost attendance | 🔴 High |
| Attendance → Absence Count | `attendance.student_ref` | `absCount` in memory | Defaults to current-week only if `school_config` absent | 🟡 Medium |
| Absence Count → Alert | `absCount[ref]` | `isAlerted(ref)` | `isMinorMap[ref]` defaults to `false` if enrolment missing | 🟡 Medium |
| Message → Resolution | `messages.status` | PATCH + UI update | No optimistic rollback on PATCH failure | 🟢 Low |

---

## Section 6 — Priority Action List

### Immediate (Blocking)

1. **Delete the duplicate `alm-atribuir-turmas.html` (document 5).** Confirm which is canonical.
2. **Remove hardcoded `BRANCHES` array from dashboard.** Replace with a Supabase aggregation query.
3. **Standardise `day_of_week` normalisation at write time.** Pick `'SÁB'` as the canonical form; enforce it in the DB with a CHECK constraint.
4. **Fix `student_refs` column type.** Migrate to `jsonb` with `DEFAULT '[]'::jsonb`; remove all try/catch JSON.parse blocks.
5. **Guard `absCount` against empty `YEAR_START`.** Add a hard fallback date (e.g. `'2026-09-01'`) and surface a warning banner when `school_config` is absent.

### Short Term (High Impact)

6. **Build the shared dossier component** based on the V10 implementation in `alm-painel-central.html`. Export as `window.ALMDossier.open(ref)`. Replace all 4 existing implementations.
7. **Move watchlist to Supabase** (`watchlist` table with `ref, staff_id, pinned_at, resolved, notes[]`). Remove all `localStorage` usage.
8. **Add a dedicated `group_code` column** to `classes`. Stop deriving it via regex from `turma_code`.
9. **Add the Mensagens tab** to the six-step navigation strip in all pipeline files.
10. **Implement time-range conflict detection** in the Assign file's QA mode.

### Medium Term (Quality)

11. Standardise typography to Bebas Neue + IBM Plex Sans + IBM Plex Mono across all files.
12. Add loading states and disabled buttons during all async write operations.
13. Replace the always-green "LIVE" dot with a real connectivity state indicator.
14. Add a `change_log` table and write to it on every group/teacher/student placement change.
15. Implement Supabase real-time subscriptions for attendance and messages.
16. Add mobile breakpoints to files 2–5.

### Longer Term (Strategic)

17. Move the Supabase anon key to an environment variable or server-side proxy; implement row-level security policies per staff role.
18. Build the teacher-facing submission portal for sumários, attendance, and photocopy requests so the Mensagens file receives real data.
19. Add student photo support via Supabase Storage.
20. Build a single `ALM_SHARED_CONFIG` object (fetched once on app load) containing `AY`, `YEAR_START`, `YEAR_END`, `BRANCHES`, `LEVELS`, `PAIRS` — shared across all files via `sessionStorage` or a service worker cache.

---

## Conclusion

The ALM pipeline is a genuinely capable system with strong domain modelling and several excellent UX ideas. The group formation algorithm, the teacher ranking engine, the absence alert system, and the non-destructive sync pattern are all production-quality features. The visual identity is distinctive and appropriate for a professional school administration context.

The critical risk is **fragmentation**: five modal implementations, six files that each independently fetch and interpret the same data, one file with hardcoded numbers, and no shared contract for the most important identifiers in the system (`group_code`, `day_of_week`, `student_refs`). In a pipeline where one file's output is another file's input, a silent data mismatch does not produce an error — it produces a wrong class, a wrong teacher assignment, or a missed absence alert.

The immediate priority is consolidation: one dossier, one data normalisation layer, one source of truth for branch and level configuration, and one canonical copy of every file. From that stable foundation, the aesthetic and feature improvements will compound into a system the ALM secretariat can rely on with confidence.

---

*Report prepared May 2026 · ALM · Academia de Línguas da Madeira*
