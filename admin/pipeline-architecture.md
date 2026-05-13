# ALM · Pipeline Architecture Report
### Academic Year 2026/2027 · Technical Audit

---

## 1. Pipeline Overview

The ALM system is a five-stage administrative pipeline that takes a school enrolment database and produces a fully staffed, timetabled set of English-language classes. Each stage feeds the next through a shared Supabase PostgreSQL backend.

```
[Step 1 — Enrolments DB]
        ↓
[Step 3 — Group Formation]   alm-group-formation
        ↓
[Step 4 — Decision]          alm-confirmar-turmas-criadas
        ↓
[Step 5 — Assign]            alm-atribuir-turmas
        ↓
[Step 6 — Teacher Portal]    Portal do Professor
        ↓
[Step 7 — Staff Dashboard]   Mensagens & Pedidos
```

### Tables involved

| Table | Role |
|---|---|
| `enrolments` | Source of truth for every student |
| `timetable_requests` | Student's submitted schedule preferences |
| `classes` | Confirmed groups with schedule, teacher, room |
| `teachers` | Staff roster |
| `attendance` | Per-session presence records |
| `lesson_summaries` | Teacher-submitted lesson notes |
| `messages` | Internal school messages from teachers |
| `teacher_requests` | Photocopy/resource requests |
| `school_config` | Academic year dates |
| `school_holidays` / `school_breaks` | Teaching-day calendar |
| `alm_config` / `alm_levels` / `alm_branches` / `alm_pairs` | Optional pipeline configuration tables |

---

## 2. Stage-by-Stage Architecture

### Stage 3 · Group Formation (`alm-group-formation`)
Reads `enrolments` and `timetable_requests`. Groups students by level + branch + schedule compatibility using a pair-slot algorithm (e.g. Mon/Wed morning, Tue/Thu afternoon). Produces proposed groups in local memory only — nothing is written to the DB at this stage.

### Stage 4 · Decision (`alm-confirmar-turmas-criadas`)
Reads `enrolments` + `timetable_requests`. Re-runs the same grouping algorithm client-side. When the admin clicks "CRIAR TURMA," it writes to two tables simultaneously:
- `timetable_requests` (sets `assigned_turma`, `status = 'atribuido'`)
- `classes` (inserts one row per session per group, e.g. FUN-01A + FUN-01B for Mon/Wed)

Confirmed state is also cached in `localStorage` (key `alm-dec-confirmed-2627`) so cards stay green across page reloads — but only on the same browser.

### Stage 5 · Assign (`alm-atribuir-turmas`)
Reads `classes` and `teachers`. Renders a weekly timetable grid. Admin clicks a band (class slot) to open a popup and assign a teacher. Writes `teacher_id`, `teacher_name`, `teacher_code` and optionally `sala` back to `classes`.

### Stage 6 · Teacher Portal
Reads `classes` filtered by `teacher_id`. Renders the teacher's weekly grid. Clicking a slot opens an action modal where the teacher submits attendance, a lesson summary, messages, or photocopy requests. Writes to `attendance`, `lesson_summaries`, `messages`, `teacher_requests`.

### Stage 7 · Staff Dashboard (Mensagens & Pedidos)
Reads all of the above in parallel for today. Renders a per-teacher view of attendance status, messages, summaries, and photocopy requests. Allows staff to mark messages as read/completed.

---

## 3. Exhaustive Flaw Register

The flaws are grouped by the stage or cross-cutting concern they affect.

---

### 3.1 · Data Contract — `classes` table structure is ambiguous

**The `day_of_week` column is not reliably populated at write time.**

Stage 4 writes two session rows per group (e.g. FUN-01A for Monday, FUN-01B for Wednesday) but the `day_of_week` value is derived from `box.pair.aL` / `box.pair.bL` — string labels like `"SEG"`, `"QUA"` — which are display strings, not normalised codes. If the label strings ever change (e.g. a branch uses `"SAB"` vs `"SÁB"`), Stage 5 and the Portal both silently fail to place the class on the correct grid row.

Stage 5 (`alm-atribuir-turmas`) already has a defensive fallback chain in `normDay()` that tries `day_of_week`, then `group_key`, then `turma_code`. The Portal repeats this same heuristic. This means **the primary key of the visual grid is reverse-engineered from text patterns** rather than read from a clean column.

**Impact:** Classes can appear on the wrong day or disappear from the grid entirely.

---

### 3.2 · Stage 4 → Stage 5 Disconnect: `start_time` / `end_time` not written

Stage 4's `sbInsertClass()` writes `start_time` and `end_time` as fixed strings (`'09:00'` / `'10:30'` for morning, `'14:00'` / `'15:30'` for afternoon). These are hardcoded constants, not derived from the student's actual slot preferences. There is no mechanism to propagate the true scheduled time.

Stage 5 uses `timeToBandPos()` to compute the pixel position of each band on the timetable. If `start_time` is missing or wrong, the band renders at the wrong position or not at all.

**Impact:** The visual timetable in Stage 5 can show classes at the wrong hour, making teacher conflict detection meaningless.

---

### 3.3 · Stage 4 · `localStorage` confirmation state is browser-local and ephemeral

The `getConf()` / `saveConf()` mechanism stores which groups have been confirmed in `localStorage` under the key `alm-dec-confirmed-2627`. This means:

- A group confirmed on Computer A is **not confirmed** when viewed on Computer B.
- If the browser cache is cleared, all confirmation state is lost.
- The `boxId` key format is `${activeLoc}|${lk}|${pair.code}|${block}|${seq}` — the `seq` component is generated positionally on every render. **If any new enrolment is added or the sort order of `enrolments` changes, all existing seq numbers shift, orphaning the localStorage keys.**

The DB write to `classes` is the true confirmation. But the UI reads `localStorage` first and only falls back to the DB state indirectly (by checking if a `classes` row exists, which it does not re-query on load). The two sources of truth are never reconciled.

**Impact:** Admin sees groups as "pending" that are already confirmed in the DB, or vice versa. Repeated clicks can attempt to re-insert already-existing `classes` rows.

---

### 3.4 · Stage 4 · Sequence counter drift breaks stable `boxId`

The `nextSeq()` function increments a counter per branch on every `renderAll()` call. The counter resets on each render. The `boxId` therefore depends on the order in which groups are built, which depends on the order `buildProposals()` returns students, which depends on the order `enrolments` rows arrive from Supabase.

Although the fetch now includes `&order=ref` (FIX 2 in the code), any change to the underlying data — a new enrolment, a cancelled request, a status update — will shift group composition and therefore shift seq numbers.

**Impact:** Confirmed groups silently become "unconfirmed" in the UI after any data change. The admin must re-click "CRIAR TURMA" for groups that are already in the DB, generating duplicate `classes` rows or UPSERT conflicts.

---

### 3.5 · Stage 4 → Stage 5 · `turma_code` format inconsistency

Stage 4 generates codes like `FUN-01`, and writes `classes` rows with `turma_code` values of `FUN-01A` and `FUN-01B` (session suffix). Stage 5 strips this suffix in the display (`turma_code.replace(/^[^-]+-/,'')`) but uses the full code for DB operations. The Teacher Portal also strips a prefix for display.

Meanwhile `timetable_requests.assigned_turma` is set to the unsuffixed code `FUN-01`. So:
- Stage 4 writes `assigned_turma = 'FUN-01'`
- Stage 5's `classes` table has `turma_code = 'FUN-01A'` and `'FUN-01B'`
- Stage 6 fetches `classes` by `teacher_id` and reads `turma_code` — there is no join back to `timetable_requests`
- Stage 7 fetches `attendance` by `turma_code` and tries to match against `classes.turma_code`

**Impact:** Any query that tries to join `timetable_requests ↔ classes` on code will fail silently. The Staff Dashboard's "sem turma" counter is unreliable because assigned students (who have `assigned_turma = 'FUN-01'`) cannot be matched to their sessions (`FUN-01A`).

---

### 3.6 · Stage 5 · Teacher loading assumes `branches` column, falls back silently

`branchTeachers()` filters by `t.branches.includes(nb)`. The `teachers` table is loaded with `branches` parsed from `r.branches` — but the Supabase schema is never shown to contain this column. The boot query selects it but if it doesn't exist, each teacher gets `branches: [normB(branch_primary)]`, a single-element array.

Multi-branch teachers (who could teach at Funchal and Câmara de Lobos) will always appear as single-branch. The teacher list for a given branch will be incomplete.

**Impact:** Teachers may not appear in the Assign panel for branches where they are available, causing classes to go unassigned.

---

### 3.7 · Stage 5 · Conflict detection is slot-level only, not duration-aware

`getRanked()` detects conflicts by checking if a teacher has another class on the same `day_of_week` and same `hour`. But classes are 90 minutes long — a class at 9h occupies 9:00–10:30. A teacher with a 9h class cannot take a 10h class, but the system will not flag this.

**Impact:** Double-booking teachers at adjacent hours. The visual grid will show two overlapping bands for the same teacher, but no warning is raised during assignment.

---

### 3.8 · Stage 5 · `timeToBandPos()` depends on rendered DOM width

The function iterates over `.gcell` elements and reads their `offsetWidth` at the moment of the call. If the grid is not yet fully laid out (e.g. during the initial render, or if fonts haven't loaded), `offsetWidth` returns 0 for all cells, and all bands collapse to `left: 0, width: 44`. The function is called inside `drawOneBand()` which is called from `drawBands()` inside a `requestAnimationFrame`, but no width-readiness check exists.

**Impact:** On page load or after branch switch, all bands may briefly stack at position 0 before a forced repaint corrects them. In some browsers or slow connections this is permanent until manual interaction.

---

### 3.9 · Stage 6 · Lesson number calculation is computed client-side from `school_config`

The lesson number (e.g. "Aula 023 de 72") is computed in `lessonNumber()` by iterating every week from `YEAR_START` to `YEAR_END` and counting teaching days matching the class's `day_of_week`. This is done:
- In the grid cell render
- In the today strip
- In the modal bar
- In `barSelect()` when the admin navigates the lesson bar

The calculation runs synchronously on the main thread, iterating up to ~300 dates per call, on every render of every slot. For a teacher with 6 classes, this is ~1800 date iterations per grid render.

More critically, if `school_config` is not loaded (network error, missing table, first page load before the async fetch completes), `YEAR_START = ''` and `lessonNumber()` returns 0 for all slots — the lesson bar is blank, the lesson number badge disappears, and `attendance` records are written without `lesson_number`, making historical lookups impossible.

**Impact:** Attendance records missing `lesson_number` can never be reliably queried by lesson. The lesson bar is non-functional on slow connections or if `school_config` is absent.

---

### 3.10 · Stage 6 · `saveAttendanceRecords()` PATCH/POST race creates duplicate records

The upsert strategy for attendance is: try PATCH, if it returns 0 rows try POST, if POST returns a 23505 (duplicate key) error try PATCH again. This is a three-step client-side upsert without a server-side `ON CONFLICT` clause.

If two teachers or two browser tabs submit attendance for the same session simultaneously (e.g. a cover teacher and the regular teacher), both PATCHes will return 0 rows (the row doesn't exist yet), both will attempt POST, one will succeed and one will get 23505 and retry a PATCH — but by then the first insert has a `recorded_by` value that gets silently overwritten.

Additionally, the catch branch for 23505 only catches the string `'23505'` or `'duplicate'` inside the response text. If Supabase changes its error format, the catch fails and throws a generic error, causing the entire batch to fail.

**Impact:** Attendance records can be silently overwritten. Batch failures leave partial records with no indication of which students were saved.

---

### 3.11 · Stage 6 · `lesson_summaries` upsert uses `on_conflict=turma_code,date` as a URL param

```javascript
const r = await fetch(`${SB}/rest/v1/lesson_summaries?on_conflict=turma_code,date`, {
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  ...
```

The `on_conflict` parameter in the URL works only if the `turma_code, date` combination has a `UNIQUE` constraint in Postgres. If this constraint doesn't exist, PostgREST ignores the param and performs a plain INSERT, creating duplicate summary rows for the same lesson.

There is also a mismatch: the insert body sets both `summary_text` and `summary` (duplicate), `observations` and `notes` (duplicate), `lesson_date` and `date` (duplicate). This suggests the schema has been through at least two revisions without cleanup, and queries in Stage 7 must try both field names:

```javascript
const text = s.summary_text || s.summary || ''
const notes = s.observations || s.notes || ''
```

**Impact:** Multiple summary rows per lesson, duplicated fields, fragile reads. Stage 7 shows the wrong summary or the oldest one, not the latest.

---

### 3.12 · Stage 7 · `buildTeacherMap()` defines "today's attendance" without lesson number

Stage 7 considers a session "submitted" if there are attendance records matching `turma_code` AND (`lesson_number === info.lessonNum` OR `date === today`). The `date = today` fallback fires for every record ever written on this calendar date, regardless of which lesson number it corresponds to. A teacher who submitted attendance for a morning class will appear to have also submitted for their afternoon class.

The `lessonNum` path depends on the same `getLessonInfo()` function with the same `school_config` dependency problem (flaw 3.9). If `YEAR_START` is empty, `lessonNum` is always 0, and the `lesson_number === 0` match is false for all real records, forcing the fallback — which as noted above produces false positives.

**Impact:** The "submitted / not submitted" indicator in Stage 7 is unreliable in both directions: false positives (showing submitted when not) and false negatives (showing not submitted when it is). The red "sem pres." KPI count in the topbar is wrong.

---

### 3.13 · Stage 7 · Messages and teacher_requests are merged into one array with an ad-hoc schema

```javascript
MESSAGES = [
  ...(messages||[]).map(m => ({ ..., document: '', copies: '', sides: '', urgency: 'normal' })),
  ...(requests||[]).map(r => ({ ..., message_type: r.type === 'foto' ? 'fotocopia' : 'internal_school', ... })),
]
```

The `teacher_requests` table uses `type = 'foto'` to identify photocopy requests, but the `messages` table uses `message_type = 'fotocopia'`. These are different columns on different tables with different vocabularies, merged into a shared in-memory object. Filtering by `message_type === 'fotocopia'` works for both only because the merge step translates — but if a new request type is added to `teacher_requests`, the translation is not updated and it silently falls into the "internal_school" bucket.

The `markMsg()` function writes back to `messages` or `teacher_requests` based on `source`, but `status` field semantics differ: `messages` uses `'read'` / `'archived'`, `teacher_requests` uses `'completed'` / `'rejected'`. If the wrong status string is sent to the wrong table, PostgREST may accept it silently (if the column is a free-text field) or reject it (if it's a Postgres enum). No error handling distinguishes between these cases.

**Impact:** Marking a photocopy request as "read" (instead of "completed") silently writes an invalid status. The request reappears as pending on the next reload, and the staff member must mark it again.

---

### 3.14 · Cross-stage · `academic_year` filtering is inconsistent

Stage 4 fetches `enrolments` with `academic_year=eq.2026/2027`. Stage 5 fetches `classes` with `academic_year=eq.2026/2027`. The Teacher Portal fetches `classes` with `academic_year=eq.${AY}` where `AY` is loaded from `school_config`.

If `school_config` hasn't loaded before `loadTeacherData()` runs (it's awaited in `boot()` but via `Promise.all` together with `loadCalendarData()`), `AY` could be an empty string, making the filter `academic_year=eq.` which either returns all rows or zero rows depending on Supabase's handling of empty string equality.

Stage 7 does not filter `classes` by academic year at all in its initial load. It fetches all classes for the teacher, across all years.

**Impact:** Teachers see classes from previous years in their portal. Stage 7 attendance counts mix records from multiple academic years. KPIs are inflated.

---

### 3.15 · Cross-stage · No foreign key enforcement between `classes.teacher_id` and `teachers.id`

The schema is managed entirely through application code. There is no evidence of database-level foreign key constraints. A teacher can be deleted from `teachers` while still referenced in `classes`, `attendance` (`recorded_by`), `messages`, and `teacher_requests`. The portal would load zero teacher data for that `teacher_id` silently.

Similarly, `attendance.student_ref` references `enrolments.ref` (a string, not a UUID), but there is no FK. If a student is deleted from enrolments, their attendance records remain and the Portal cannot resolve the name, showing the raw ref string instead.

**Impact:** Data integrity depends entirely on admin discipline, not database constraints. Deleting or updating a teacher or student cascades no cleanup.

---

### 3.16 · Cross-stage · The `group_key` / `level_code` / `level_display` triangle is unresolved

`classes` rows contain three overlapping level identifiers:
- `level_code`: the canonical key (e.g. `'3'`, `'PJ2'`, `'Portugues'`)
- `level_display`: a human label (e.g. `'Ano 3'`, `'PJ 2'`, `'Português'`)
- `group_key`: a hyphen-separated composite (e.g. `'FUNCHAL-3-SW-tarde'`)

Stage 5's `getDept()` tries `department`, then parses `group_key` for known department strings, then falls back to `LEVEL_MAP[level_code]`. This triple fallback exists because Stage 4 doesn't always write `department` reliably — it derives it from `getLM(sampleEnrol).dept` where `sampleEnrol` is the first student in the group, which could be empty if `student_refs` is empty.

Stage 7 repeats this same three-step fallback. The Portal does as well. All three pages have slightly different fallback implementations, meaning the same class can be categorised as different departments on different pages.

**Impact:** Class colouring (the coloured left border and background) is inconsistent across pages. A "Geral" class in Stage 5 may appear as "Exames" in Stage 7.

---

### 3.17 · Stage 6 & 7 · `school_breaks` and `school_holidays` tables are optional but silently absent

Both the Portal and Stage 7 attempt to load `school_holidays` and `school_breaks`. If these tables don't exist, the `catch` block logs a warning and continues with empty sets. `isTeachingDay()` then returns `true` for every date, meaning public holidays and school breaks are counted as teaching days.

This inflates `lessonTotal` — a class that runs on Mondays may show "Aula 023 de 72" when the real total excluding holidays is 68. The progress bar in the lesson modal reaches 100% at a later date than the actual year end. Teachers are asked to submit attendance for lessons that never happen.

**Impact:** Lesson numbering is wrong by approximately the number of holidays in the year. Attendance records are created for non-teaching days when the admin clicks a past date in the lesson bar.

---

### 3.18 · Stage 4 · "SYNC → Step 5" does not pass teacher or room data

The "Sync → Step 5" button calls `syncAllToClasses()`, which iterates confirmed groups and calls `sbInsertClass()` for each. The insert body never includes `teacher_id`, `teacher_code`, `teacher_name`, or `sala`. These fields are `null` on all synced rows.

Stage 5 must then assign teachers to every class from scratch. If a teacher was already assigned in a previous sync, and then "Sync → Step 5" is run again (e.g. after adding students), the teacher assignment is overwritten with `null` due to the `resolution=merge-duplicates` upsert.

**Impact:** Syncing from Stage 4 destroys all teacher assignments made in Stage 5. The admin must re-assign all teachers after every sync. This is a destructive operation with no warning.

---

### 3.19 · Stage 4 · Min/Max group size is double-read: constants then DB

`MIN_G` and `MAX_G` are initialised as constants (5 and 17) and optionally overridden from `alm_config`. However, `buildProposals()` uses the module-level `MIN_G` / `MAX_G` variables, and `buildCardHTML()` uses `MAX_G` for the capacity fraction display. If `alm_config` loads after the first `renderAll()` call (which it does, since `loadConfig()` → `loadAll()` → `renderAll()` is the sequence and config loads first), the first render uses the correct values.

But the `alm_config` fetch can fail silently (caught exception, logs info). If it fails, the fallback constants are used — and there is no visual indicator that the configuration is missing.

**Impact:** If the school changes its group size policy (e.g. to 12 students max), and `alm_config` is unavailable, Stage 4 will propose and create groups of up to 17, and Stage 5's capacity display will show fractions against 17.

---

### 3.20 · Stage 6 · `barSelect()` clears message and summary forms on navigation

When the admin selects a past lesson in the bar, `barSelect()` explicitly clears:
```javascript
document.querySelectorAll('#tab-mensagem input[type=text], #tab-mensagem textarea').forEach(el => el.value = '');
document.querySelectorAll('#tab-mensagem .chip').forEach(c => c.classList.remove('active'));
```
This is correct for messages (which are session-specific). But `loadLessonData()` is called afterward and repopulates the summary tab from the DB. If `loadLessonData()` fails (network error, missing `lesson_summaries` table), the summary tab is left blank — the teacher sees no previously submitted summary even though one exists.

The save button is also disabled during `loadLessonData()` and re-enabled in `finally`. If the user navigates away (closes the modal, clicks another lesson) before the load completes, the modal closes with the button still disabled.

**Impact:** Teachers lose access to their own submitted summaries when network conditions are poor. The save button can get stuck in a disabled state.

---

## 4. Summary Matrix

| # | Stage | Severity | Type | Description |
|---|---|---|---|---|
| 3.1 | 4→5 | High | Data contract | `day_of_week` derived from display strings |
| 3.2 | 4→5 | High | Data contract | `start_time`/`end_time` hardcoded, not derived |
| 3.3 | 4 | High | State management | Confirmation state in browser-local localStorage |
| 3.4 | 4 | High | State management | `boxId` sequence shifts on any data change |
| 3.5 | 4→5→6→7 | High | Data contract | `turma_code` suffix mismatch (`FUN-01` vs `FUN-01A`) |
| 3.6 | 5 | Medium | Data contract | `branches` column assumed, multi-branch filtering broken |
| 3.7 | 5 | Medium | Logic | Conflict detection ignores class duration |
| 3.8 | 5 | Low | Rendering | Band position depends on DOM width at render time |
| 3.9 | 6 | High | Logic | Lesson numbers computed client-side, fail if config missing |
| 3.10 | 6 | Medium | Reliability | Attendance upsert race condition, fragile duplicate detection |
| 3.11 | 6 | Medium | Data contract | `lesson_summaries` upsert requires unverified UNIQUE constraint |
| 3.12 | 7 | High | Logic | "Submitted" detection produces false positives and negatives |
| 3.13 | 7 | Medium | Data contract | `messages` and `teacher_requests` merged with ad-hoc translation |
| 3.14 | All | High | Data contract | `academic_year` filter absent or empty-string in several fetches |
| 3.15 | All | Medium | Database | No FK constraints — deletes cascade silently |
| 3.16 | All | Medium | Data contract | Three overlapping level identifiers resolved differently per page |
| 3.17 | 6,7 | Medium | Logic | Holiday tables optional but absence inflates lesson count |
| 3.18 | 4→5 | High | UX | Sync overwrites teacher assignments with null (destructive) |
| 3.19 | 4 | Low | Config | Group size config failure is silent |
| 3.20 | 6 | Low | UX | Lesson navigation clears forms, save button can freeze |

---

## 5. Root Causes

Three underlying architectural problems explain the majority of the specific flaws above.

**A. No server-side computed fields.** Things that should be stored columns (day of week as a normalised integer, lesson number, session start/end) are recomputed client-side on every render, by every page, with slightly different logic each time. The DB is a raw data store, not a schema that enforces meaning.

**B. Two sources of truth for confirmation state.** The `classes` table is the DB record, but `localStorage` is the UI record. They diverge whenever the page is opened in a new browser, when data changes, or when the seq counter drifts. All UI state that matters should be stored in the DB.

**C. The `turma_code` namespace is split.** Stage 4 assigns a code (`FUN-01`) and then writes suffixed session codes (`FUN-01A`, `FUN-01B`) to `classes`. But `timetable_requests` stores the unsuffixed code. No view or function joins these cleanly. Every downstream page has to guess which format to use.

---

*Report generated from code audit of: `alm-confirmar-turmas-criadas`, `alm-atribuir-turmas`, Portal do Professor, Mensagens & Pedidos. Date: 2026-05-13.*
