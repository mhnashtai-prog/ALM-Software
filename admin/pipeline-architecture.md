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

### 2.3 🔴 CRITICAL: Dashboard Has Hardcoded Branch Data

`dashboard.html` defines `BRANCHES` as a JavaScript constant with hardcoded student counts, enrolment percentages, conflict counts, and health statuses:

```javascript
const BRANCHES = [
  { id:'funchal', label:'Funchal · Sede', status:'healthy', alunos:412, inscritos:'89%', turmas:38, dificeis:4 },
  { id:'machico',  label:'Machico', status:'concerning', alunos:198, inscritos:'74%', turmas:14, dificeis:8 },
  // ...
];
```

These numbers will never update. The dashboard's "health" indicator (`computeSchoolHealth()`) calculates from this static array. The enrolment count pill (`stat-alunos`) does fetch from Supabase via `loadEnrolmentCount()`, creating a visible contradiction: the pill shows a live total while the branch breakdown is frozen in time.

**Required:** Remove `BRANCHES` constant entirely. Fetch branch aggregates from Supabase using a view or RPC that computes counts, turma numbers, and conflict flags dynamically.

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

cat << 'SUMMARY'
CHANGES SUMMARY — all 4 files
═══════════════════════════════

alm-confirmar-turmas-criadas.html (DONE ✓)
  ✓ CSS: .box-grid flex-wrap → CSS Grid minmax(220px,1fr) — audit §4.3
  ✓ CSS + JS: .criar-btn height 40px → 44px touch target — audit §4.3
  ✓ Nav: tab 7 Mensagens added to pipeline strip — audit §3.8
  ✓ day_of_week: SAB → SÁB canonical at write time — audit §2.4
  ✓ student_refs: Array.isArray guard — audit §2.4
  ✓ parseDp: hardened to reject non-array JSON — audit §2.4
  ✓ Live dot: real connectivity state (amber/red/green) — audit §3.4
  ✓ Error recovery: "Tentar novamente" retry button — audit §3.3

alm-atribuir-turmas.html (TO DO)
  → nav-home href="#" → "/admin/dashboard"
  → Add tab 7 Mensagens to pipeline strip
  → qaAssign: time-range conflict check (not hour equality) — audit §2.7
  → Live dot: real connectivity state
  → popConfirm: loading state on button — audit §2.10

alm-ficha-professor.html / alm-mensagens.html (Teacher Portal) (TO DO)
  → Live dot: add setConnState() call in loadTeacherData()
  → Pipeline strip not present (portal is outside pipeline — correct)
  → No other critical issues specific to this file

alm-allocation-engine.html (TO DO)
  → Fonts: Cinzel/JetBrains/Outfit → Bebas Neue/IBM Plex — audit §4.7
  → CSS vars: --mono/--sans/--display updated
  → nav href="/admin/dashboard.html" → "/admin/dashboard"
  → Back button: history.back() → "/admin/alm-atribuir-turmas"


Changes SUMMARY — all 4 files
═══════════════════════════════

alm-confirmar-turmas-criadas.html (DONE ✓)
  ✓ CSS: .box-grid flex-wrap → CSS Grid minmax(220px,1fr) — audit §4.3
  ✓ CSS + JS: .criar-btn height 40px → 44px touch target — audit §4.3
  ✓ Nav: tab 7 Mensagens added to pipeline strip — audit §3.8
  ✓ day_of_week: SAB → SÁB canonical at write time — audit §2.4
  ✓ student_refs: Array.isArray guard — audit §2.4
  ✓ parseDp: hardened to reject non-array JSON — audit §2.4
  ✓ Live dot: real connectivity state (amber/red/green) — audit §3.4
  ✓ Error recovery: "Tentar novamente" retry button — audit §3.3

alm-atribuir-turmas.html (TO DO)
  → nav-home href="#" → "/admin/dashboard"
  → Add tab 7 Mensagens to pipeline strip
  → qaAssign: time-range conflict check (not hour equality) — audit §2.7
  → Live dot: real connectivity state
  → popConfirm: loading state on button — audit §2.10

alm-ficha-professor.html / alm-mensagens.html (Teacher Portal) (TO DO)
  → Live dot: add setConnState() call in loadTeacherData()
  → Pipeline strip not present (portal is outside pipeline — correct)
  → No other critical issues specific to this file

alm-allocation-engine.html (TO DO)
  → Fonts: Cinzel/JetBrains/Outfit → Bebas Neue/IBM Plex — audit §4.7
  → CSS vars: --mono/--sans/--display updated
  → nav href="/admin/dashboard.html" → "/admin/dashboard"
  → Back button: history.back() → "/admin/alm-atribuir-turmas"



*Report prepared May 2026 · ALM · Ac
