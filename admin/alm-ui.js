/* ══════════════════════════════════════════════════════════════════
   THE GRID — now the shared one
   buildPermanentGrid(), timeToBandPos() and drawStamps() were ~150
   lines here, and the last surviving copy of the geometry that put a
   14:00 lesson at 11:36 in the assign page: the same walk-the-row,
   accumulate (width + GAP) routine, with the same 3px constant that
   nothing in the stylesheet knew it had to honour.

   Two layers on one grid, because this page needs both: the turma
   stamps on top, and underneath the student availability windows they
   were formed from. The bands are evidence, not subject — behind,
   tinted, inert.
   ══════════════════════════════════════════════════════════════════ */
function drawGrid(containerId, withReq, levelKey, result){
  const host = document.getElementById(containerId);
  if(!host || typeof ALMGrid === 'undefined') return;

  /* UNDER · one band per requested window. Kept even when groups have
     formed: seeing the availability a turma was cut from is how you
     judge whether it was cut well. */
  /* AVAILABILITY IS SHOWN ONLY BEFORE A GROUP EXISTS.
     drawAvailBands() used to bail the moment a level had groups —
     `if (result?.groups?.length) return;` — and I dropped that guard
     when porting. The bands then drew underneath the stamps that were
     cut from them, which is the doubled block in the grid: the same
     slot rendered twice, once as evidence and once as conclusion.

     Once a turma exists, the turma IS the answer; the availability it
     came from is history. Before it exists, the bands are the whole
     point of the screen. */
  const under = [];
  if(!(result?.groups || []).length) (withReq || []).forEach(e => {
    const a = analysePrefs(e.ref); if(!a) return;
    a.windows.forEach(w => {
      const day = DAYS_PT[w.dayIdx]; if(!day) return;
      under.push({ day, start: minsToT(w.earliest), end: minsToT(w.latest) });
    });
  });

  /* OVER · the stamps. A pair shares a tone through group_code, the
     same rule the portal and the assign grid use. */
  const items = [];
  (result?.groups || []).forEach((g, i) => {
    const committed = (_groupCodes[levelKey] || {})[i];
    const ar = (_auditResults[levelKey] || {})[i];
    const isCert = !!committed;
    const same = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
    const days = same ? [g.dayL_A || g.dayL] : [g.dayL_A || g.dayL, g.dayL_B];
    const code = isCert
      ? (committed.turmaCodeA || committed.turmaCode || `T${i+1}`)
      : `T${i+1}`;
    days.forEach((dayL, di) => {
      if(!dayL) return;
      items.push({
        day: dayL,
        start: g.startTime || minsToT(g.startMins),
        end:   g.endTime   || minsToT(g.startMins + CLASS_DUR),
        title: isCert ? (di === 0 ? code : (committed.turmaCodeB || code)) : code,
        sub:   `${g.students.length}/${MAX_G}${ar?.status==='warn' ? ' · aviso' : ar?.status==='fail' ? ' · falha' : ''}`,
        badge: isCert ? '✓' : String(i+1),
        state: isCert ? 'done' : 'open',
        tone:  committed?.turmaCode || g.group_code || `T${i+1}`,
        idx: i,
      });
    });
  });

  ALMGrid.render(host, {
    under, items,
    onItem: it => openGroupModal(levelKey, it.idx),
    legend: [['#4A6A56','contorno liso = certificada'],
             ['dash','tracejado = proposta'],
             ['rgba(94,119,108,.30)','disponibilidade pedida']],
    hint: 'clique numa turma para ver os alunos',
  });
}

/* ═══════════════════════════════════════════════════════════════
   ALM UI  ·  alm-ui.js
   All rendering, DOM manipulation, navigation, modals.
   Depends on: alm-engine.js (must load first)

   Fixes applied in this version
   ─────────────────────────────
   P-01  Row-rect cache + resize invalidation (window resize listener)
   U-01  Stamp hover tooltip (mouseenter/mouseleave on each band)
   U-02  Dossier opens with Inscrição expanded + section previews
   U-03  Student list visible by default (max-height scroll)
   U-05  Duplicate slot-tags row removed from dsLoadTimetable()
   U-06  refreshUIAfterCertify() wired into decCertifySession()
   U-07  Wax seal hover — rotation removed, shadow reduced
   D-01  Historial tab + pane removed (turma_students columns don't exist)
   D-02  grade_final → grade (correct column name)
═══════════════════════════════════════════════════════════════ */

const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/* ── FOUR-TIER SERVICE COLOURS (Stage 2) ──────────────────────
   blue forming · amber viable · green healthy · gold full.
   The SEAL carries the tier; the time-band keeps its slotCol rainbow
   so adjacent groups stay visually distinct. 'fail' (red) is a real
   data error and overrides the size tier.                          */
/* ── WHAT A GROUP'S COLOUR MEANS ─────────────────────────────
   It used to mean nothing. slotCol() returned one of sixteen greys
   picked by (day × hour), so adjacent groups were distinguishable
   from each other and from nothing else — a proposed turma and a
   certified one were both grey, and which grey was an accident of
   what time they met.

   Colour now carries the only distinction that matters on this
   screen: PROPOSED or CERTIFIED. Two solids, no opacity games.
   Slate is deliberately cool — it is the one hue on a warm-stone
   page that cannot be mistaken for the paper, so a proposal reads
   as provisional without reading as an error. Sage is arrival.

   slotCol() is kept for the availability bands underneath, where
   telling two overlapping cohorts apart IS the job. */
/* ── WHY THIS IS NO LONGER SLATE ─────────────────────────────
   Slate worked for exactly one reason: it was the only cool thing
   on a warm page, so a proposal could not be mistaken for the
   surface under it. Cooling the grid to the rack's stone spends
   that reason — a slate stamp on a stone-blue field is the same
   hue family as the field, which is precisely the failure the
   marigold seal had against warm stone.

   So the separation runs the other way now: cool surface, warm
   marks. Clay is the warm counterpart to sage at the same
   lightness, so proposed and certified still read as two steps of
   one system rather than as two unrelated colours. */
const ST_PROPOSED = '#9A7B62';   /* clay — provisional */
const ST_CERTIFIED = '#4E6B50';  /* sage deep — on warm paper */
/* ON THE GRID THE SAME TWO STATES ARE DIFFERENT COLOURS.
   The field is light stone, so sage marks a slot and nothing else
   is sage. The grid step is a shade deeper than the warm-paper one
   because the white turma code on it is 9px: 4.85:1 here against
   3.72:1 on the lighter sage. */
const ST_CERTIFIED_GRID = '#5E776C';   /* sage — the slot has a turma */
const ST_PROPOSED_GRID  = '#9A7B62';   /* clay — provisional          */
const ST_FAIL = '#B8402A';
const ST_WARN = '#8A8A82';
function statusCol(isCert, isFail, isWarn){
  if (isFail) return ST_FAIL;
  if (isWarn) return ST_WARN;
  return isCert ? ST_CERTIFIED : ST_PROPOSED;
}

/* ADD THIS — new function, nothing to replace */
/* Tone is keyed to the DAY-PAIR, not the group index. Two groups
   that both meet SEG+QUA must look identical; a group meeting
   TER+QUI must look different — but still sage, never an
   unrelated hue. _dayPairFamily finds which entry in ALM_PAIRS a
   given day belongs to, so every day sharing a pair resolves to
   the same family id, and SAGE_TONES gives that family a shade. */
const SAGE_TONES = [
  { ink: '#6F8F71', border: '#4E6B50' },  // sage
  { ink: '#8FA89C', border: '#5D7A6E' },  // sage-teal
  { ink: '#9DB79E', border: '#6F8F71' },  // sage-light
  { ink: '#5D7A6E', border: '#3E5952' },  // sage-deep
  { ink: '#7FA88A', border: '#557A63' },  // sage-warm
];
function _dayPairFamily(dayIdx) {
  for (let idx = 0; idx < ALM_PAIRS.length; idx++) {
    const p = ALM_PAIRS[idx];
    if (p.a === dayIdx || p.b === dayIdx) return idx;
  }
  return dayIdx; // day not in any defined pair — falls back to itself
}
function pairTone(g) {
  const dayA = g.dayIdx_A ?? g.dayIdx;
  const familyIdx = _dayPairFamily(dayA);
  return SAGE_TONES[familyIdx % SAGE_TONES.length];
}

/* Four tiers on ONE hue, stepped by depth. The old set was four
   unrelated hues — blue, marigold, mint, gold — so the seal's colour
   read as a category rather than as a position on a scale, and the
   marigold seal in particular sat on warm stone with no hue distance
   from it at all. Sage light to sage deep says "further along". */
const TIER_COLORS = {
  forming: {ink:'#B49B85', band:'rgba(180,155,133,.18)', border:'#B49B85'},
  viable:  {ink:'#9A7B62', band:'rgba(154,123,98,.20)',  border:'#9A7B62'},
  healthy: {ink:'#708A81', band:'rgba(112,138,129,.20)', border:'#708A81'},
  full:    {ink:'#5E776C', band:'rgba(94,119,108,.22)',  border:'#5E776C'},
};
function tierSeal(g, ar){
  if(ar && ar.status==='fail') return {ink:'#B8402A', band:'rgba(184,64,42,.18)', border:'#B8402A99', tier:'fail', label:'FALHA'};
  const t = g.tier || (typeof classifyTier==='function' ? classifyTier(g.students.length).tier : 'healthy');
  const c = TIER_COLORS[t] || TIER_COLORS.healthy;
  const lbl = g.tierLabel || (typeof classifyTier==='function' ? classifyTier(g.students.length).label : '');
  return {...c, tier:t, label:lbl};
}

/* ── ROW-RECT CACHE (P-01) ────────────────────────────────── */
let _rowRectCache = {};

// P-01: invalidate cache on resize so stamps repaint at correct positions
window.addEventListener('resize', debounce(() => { _rowRectCache = {}; }, 200));

/* ── GRID / HEATMAP ───────────────────────────────────────── */
function buildHeatmap(students) {
  const map = {};
  DAYS_PT.forEach(d => { map[d] = {}; HOUR_COLS.forEach(h => map[d][h] = 0); });
  students.forEach(e => {
    const a = analysePrefs(e.ref); if (!a) return;
    a.windows.forEach(w => {
      const day = DAYS_PT[w.dayIdx]; if (!day) return;
      const startH = Math.floor(w.earliest / 60), endH = Math.floor(w.latest / 60);
      const seen = new Set();
      for (let h = startH; h <= endH; h++) {
        if (HOUR_COLS.includes(h) && !seen.has(h)) { seen.add(h); map[day][h]++; }
      }
    });
  });
  return map;
}

function paintCellHeatmap(containerId, withReq, levelKey, result) {
  const map = buildHeatmap(withReq);
  const maxVal = Math.max(1, ...DAYS_PT.map(d =>
    Math.max(0, ...HOUR_COLS.map(h => map[d]?.[h] || 0))
  ));
   if (result?.groups?.length) return;
  DAYS_PT.forEach(day => {
    HOUR_COLS.forEach(h => {
      const cell = document.querySelector(`#${containerId}-row-${day} [data-h="${h}"]`);
      if (!cell) return;
      const count = map[day]?.[h] || 0;
      if (count === 0) {
        cell.style.background = 'rgba(0,0,0,0)';
        cell.style.border = '.5px solid rgba(255,255,255,.03)';
      } else {
        const intensity = count / maxVal;
        const opacity = (0.08 + intensity * 0.32).toFixed(3);
        cell.style.background = `rgba(40,200,176,${opacity})`;
        cell.style.border = `.5px solid rgba(40,200,176,${(opacity * 1.5).toFixed(3)})`;
      }
      cell.removeAttribute('data-group');
    });
  });
}
/* Availability bands — exact replica of the request form's bands.
   One solid band per student window, coloured by day (same palette as
   the request form), time label inside, positioned with timeToBandPos.
   Read-only (no delete). Only draws when no group has formed. */
const _DAY_BAND_RGB = ['142,142,147','120,120,124','99,99,102','172,172,176','86,86,90','160,160,164'];



/* ── P-01: prime rect cache ───────────────────────────────── */

/* ── U-01: stamp tooltip helpers ──────────────────────────── */
let _ttEl = null;

function _getOrCreateTooltip(wrap) {
  if (_ttEl && wrap.contains(_ttEl)) return _ttEl;
  const div = document.createElement('div');
  div.className = 'stamp-tooltip';
  div.style.cssText = 'display:none;position:absolute;z-index:50;background:var(--bg-d);border:.5px solid rgba(255,255,255,.12);border-radius:6px;padding:10px 12px;width:200px;pointer-events:none;font-family:var(--mono)';
  wrap.appendChild(div);
  _ttEl = div;
  return div;
}

function _showStampTooltip(e, band, wrap, g, i, levelKey) {
  const tt = _getOrCreateTooltip(wrap);
  const ar = (_auditResults[levelKey] || {})[i];
  const committed = (_groupCodes[levelKey] || {})[i];
  const col = slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins);
  const codeDisplay = committed
    ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA !== committed.turmaCodeB
      ? `${committed.turmaCodeA} / ${committed.turmaCodeB}`
      : committed.turmaCodeA || committed.turmaCode || `T${i + 1}`)
    : `T${i + 1}`;
  const pairLabel = g.pairDef
    ? (g.dayIdx_A === g.dayIdx_B ? g.dayL_A : `${g.dayL_A} + ${g.dayL_B}`)
    : (g.dayL || '—');
  const passC = ar?.passCount ?? g.students.length;
  const warnC = ar?.warnCount ?? 0;
  const failC = ar?.failCount ?? 0;
  const topIssue = ar ? Object.values(ar.log || {}).find(l => l.verdict !== 'pass')?.reason || '' : '';

  tt.innerHTML = `
    <div class="stamp-tooltip-code" style="color:${col}">${codeDisplay}</div>
    <div class="stamp-tooltip-slot" style="font-size:8px;color:rgba(255,255,255,.45);margin-bottom:6px">${pairLabel} · ${g.startTime}–${g.endTime}</div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:${topIssue ? '6px' : '0'}">
      <span style="font-size:9px;font-weight:700;color:${col}">${g.students.length}<span style="font-size:7px;opacity:.5">/${MAX_G}</span></span>
      <div style="flex:1;height:3px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden">
        <div style="width:${Math.round(g.students.length / MAX_G * 100)}%;height:100%;background:${col};border-radius:6px"></div>
      </div>
    </div>
    <div class="stamp-tooltip-pills">
      ${passC > 0 ? `<span class="stamp-tooltip-pill pass" style="background:var(--green-a);border-color:var(--green-b);color:var(--green)">✓ ${passC}</span>` : ''}
      ${warnC > 0 ? `<span class="stamp-tooltip-pill warn" style="background:var(--amber-a);border-color:var(--amber-b);color:var(--amber)">⚠ ${warnC}</span>` : ''}
      ${failC > 0 ? `<span class="stamp-tooltip-pill fail" style="background:var(--red-a);border-color:var(--red-b);color:var(--red)">✕ ${failC}</span>` : ''}
    </div>
    ${topIssue ? `<div style="font-size:6.5px;color:var(--amber);margin-top:5px;font-style:italic;line-height:1.4">${topIssue}</div>` : ''}
  `;

  // Position above the band
  const wrapRect = wrap.getBoundingClientRect();
  const bandRect = band.getBoundingClientRect();
  const tipW = 200, tipH = 90;
  let left = bandRect.left - wrapRect.left + band.offsetWidth / 2 - tipW / 2;
  let top = bandRect.top - wrapRect.top - tipH - 8;
  if (top < 4) top = bandRect.top - wrapRect.top + band.offsetHeight + 8;
  left = Math.max(4, Math.min(left, wrap.offsetWidth - tipW - 4));

  tt.style.left = left + 'px';
  tt.style.top = top + 'px';
  tt.style.display = 'block';
}

function _hideStampTooltip() {
  if (_ttEl) _ttEl.style.display = 'none';
}

/* ── DRAW STAMPS ──────────────────────────────────────────── */

/* ── PAIR MATRIX ──────────────────────────────────────────── */
function countPair(students, pair) {
  return students.filter(e => {
    const a = analysePrefs(e.ref); if (!a) return false;
    return a.windows.find(w => w.dayIdx === pair.a) && a.windows.find(w => w.dayIdx === pair.b);
  }).length;
}

function buildPairMatrix(pairCounts) {
  if (!_lastResult?.groups?.length) return '';
  let html = `<div class="pair-matrix">`;
  _lastResult.groups.forEach((g, i) => {
    const committed = (_groupCodes[activeLevelKey] || {})[i];
    const ar = (_auditResults[activeLevelKey] || {})[i];
    const isCert = !!committed, isWarn = !isCert && ar?.status === 'warn';
    const _ts = tierSeal(g, ar);
    const col = statusCol(isCert, false, isWarn);
    const lbl = isCert ? 'alocados' : _ts.label.toLowerCase();
    const isSameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
    const sessions = isSameDay
      ? [{ suffix: 'A', dayL: g.dayL_A || g.dayL, code: isCert ? (committed.turmaCodeA || committed.turmaCode + 'A' || `T${i + 1}A`) : `T${i + 1}A` }]
      : [
        { suffix: 'A', dayL: g.dayL_A || g.dayL, code: isCert ? (committed.turmaCodeA || `T${i + 1}A`) : `T${i + 1}A` },
        { suffix: 'B', dayL: g.dayL_B || g.dayL, code: isCert ? (committed.turmaCodeB || `T${i + 1}B`) : `T${i + 1}B` },
      ];
    const start = minsToT(g.startMins), end = minsToT(g.startMins + CLASS_DUR);
    sessions.forEach(({ dayL, code }) => {
      html += `<div style="border:1px solid ${col}44;border-left:3px solid ${col};background:${col}11;padding:11px 12px;cursor:pointer;transition:all .14s;position:relative"
        onclick="openGroupModal('${activeLevelKey}',${i})"
        onmouseover="this.style.background='${col}22'"
        onmouseout="this.style.background='${col}11'">
        <div style="font-size:7px;font-weight:700;color:${col};margin-bottom:2px;letter-spacing:.06em">${code}</div>
        <div style="font-size:9px;font-weight:700;margin-bottom:2px;color:${col}">${dayL}</div>
        <div style="font-size:7.5px;color:${col};opacity:.7;margin-bottom:4px">${start}–${end}</div>
        <div style="font-size:28px;font-weight:700;line-height:1;color:${col}">${g.students.length}</div>
        <div style="font-size:7px;margin-top:3px;color:${col}">${lbl}</div>
        ${isCert ? `<div style="position:absolute;top:8px;right:10px;font-size:12px;color:${col}">✓</div>` : ''}
        ${isWarn ? `<div style="position:absolute;top:8px;right:10px;font-size:10px;color:${col}">⚠</div>` : ''}
      </div>`;
    });
  });
  return html + `</div>`;
}

/* ── GROUP CARD ───────────────────────────────────────────── */
function buildGroupCard(g, i) {
  const committed = (_groupCodes[activeLevelKey] || {})[i];
  const ar = (_auditResults[activeLevelKey] || {})[i];
  const status = ar?.status || 'pending';
  const isCert = !!committed, isWarn = !isCert && status === 'warn', isFail = !isCert && status === 'fail', isExc = isWarn || isFail;
  const turmaCode = isCert
    ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA !== committed.turmaCodeB
      ? `${committed.turmaCodeA}/${committed.turmaCodeB}`
      : committed.turmaCodeA || committed.turmaCode || `T${i + 1}`)
    : `T${i + 1}`;
const col = statusCol(isCert, isFail, isWarn);
  const inkCol = isFail ? '#B8402A' : isWarn ? '#8A8A82' : col;
  const sealBg = isCert ? col + '22' : isFail ? 'rgba(184,64,42,.13)' : isWarn ? 'rgba(138,138,130,.13)' : col + '11';
  const borderCol = isCert ? col + 'CC' : isFail ? '#B8402A99' : isWarn ? '#8A8A8299' : col + '66';
  const startT = minsToT(g.startMins), endT = minsToT(g.startMins + CLASS_DUR);
  const blockCls = g.startMins < 720 ? 'bk-manha' : 'bk-tarde', blockLbl = g.startMins < 720 ? 'Manhã' : 'Tarde';
  const cardCls = `gcard-compact${isCert ? ' certified' : isExc ? ' exception' : ''}`;
  const sealGlyph = isFail ? '✕' : String(i + 1);
  const dash = isCert ? 'none' : '2 2', outerStroke = isCert ? col : col + '99';
  const sealCol = tierSeal(g, ar).ink;
  const glyphEl = sealGlyph.length === 1
    ? `<text x="16" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="#FFFFFF" font-family="'IBM Plex Mono',monospace">${sealGlyph}</text>`
    : `<text x="16" y="19" text-anchor="middle" font-size="7" font-weight="700" fill="#FFFFFF" font-family="'IBM Plex Mono',monospace" letter-spacing="0.5">${sealGlyph}</text>`;
  const sealSVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle cx="16" cy="16" r="14.2" fill="${sealCol}"/>
    <circle cx="16" cy="16" r="14.2" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/>
    <circle cx="16" cy="16" r="10.5" stroke="rgba(255,255,255,.40)" stroke-width=".9" stroke-dasharray="${dash}"/>
    ${isCert
      ? `<path d="M10.4 16L14.2 20.2L21.6 11.4" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
      : glyphEl}
  </svg>`;
const pairLabel = g.pairDef ? (g.dayIdx_A === g.dayIdx_B ? g.dayL_A : `${g.dayL_A} + ${g.dayL_B}`) : (g.dayL || '—');
  const _ts = tierSeal(g, ar);
  return `<div class="${cardCls}" style="border-left-color:${col}" onclick="openGroupModal('${activeLevelKey}',${i})" id="gcard-${i}">
   <div class="gc-seal" style="background:${sealBg};border:1px solid ${borderCol}">${sealSVG}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:10px;font-weight:700;color:${col}">${pairLabel}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
        <span style="font-size:7.5px;color:var(--t2)">${startT} – ${endT}</span>
        <span style="font-size:6.5px;font-weight:700;letter-spacing:.08em;padding:1px 6px;border:1px solid ${col}55;color:${col};background:${col}11">${turmaCode}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:7px;flex-shrink:0">
      <div class="gc-block-tag ${blockCls}">${blockLbl}</div>
    ${isCert ? `<div style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--green-b);color:var(--green);background:var(--green-a);letter-spacing:.04em">CERTIFIED</div>` : ''}
      <div style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid ${sealCol};color:${sealCol};background:${sealCol}1A;letter-spacing:.04em">${_ts.label}</div>
      ${isExc ? `<div style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid ${isFail ? 'var(--red-b)' : 'var(--amber-b)'};color:${isFail ? 'var(--red)' : 'var(--amber)'}">${isFail ? '✕ falha' : '⚠ aviso'}</div>` : ''}
      <div style="font-size:22px;font-weight:700;color:${col};line-height:1">${g.students.length}</div>
      <div style="font-size:6.5px;color:var(--t3);align-self:flex-end;padding-bottom:2px">/ ${MAX_G}</div>
    </div>
  </div>`;
}

/* ── GROUP MODAL ──────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════
   THE GROUP SHEET
   What this replaces drew a dark charcoal banner with a dept
   gradient behind it, a wax seal, and a strip of four coloured
   stat blocks — the last near-black surface in a product that is
   otherwise entirely warm paper, and the reason the modal looked
   like it belonged to an older build than the screen behind it.

   The card is now the phrase-bank card: cream, one sage rule
   across the top, a mono eyebrow, the turma code set as an actual
   headline rather than as bold text, and nothing else. Colour is
   spent in exactly two places — the top rule and the verdict marks
   — so those two things are what the eye finds.
   ══════════════════════════════════════════════════════════════ */

function _sheetHost(id){
  const el = document.getElementById(id);
  if (!el) return null;
  el.onclick = ev => { if (ev.target === el) _closeSheet(id); };
  return el;
}
function _closeSheet(id){
  const el = document.getElementById(id);
  if (el){ el.classList.remove('open'); el.innerHTML = ''; }
}
function _verdictMark(v){
  if (v === 'pass') return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4E6B50" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l5 5L20 6"/></svg>';
  if (v === 'warn') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A82" stroke-width="3.2" stroke-linecap="round"><path d="M12 4v11M12 19.5v.5"/></svg>';
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8402A" stroke-width="3.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
}


/* ══════════════════════════════════════════════════════════════
   THE ROSTER SHEET
   Every count on this screen is derived from a list of actual
   students, but until now only a few of those lists could be
   reached. "72 inscritos", "45 sem pedido", "4 cert." were
   terminal: the number was the end of the road, and the only way
   to find out WHICH 45 was to go somewhere else and filter.

   openRoster() takes the same predicate the number was counted
   with and shows what it counted. One function, because the fix
   for "this number is not clickable" should not be twelve
   bespoke panels that drift apart.
   ══════════════════════════════════════════════════════════════ */

function _rosterRow(e){
  const av = avCol(e.name || e.ref);
  const a  = analysePrefs(e.ref);
  const slots = a ? a.windows.map(w => `${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · ') : 'sem disponibilidade';
  const t = _findTurmaFor(e.ref);
  const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem_pedido';
  const stTxt = st === 'atribuido' ? 'atribuído' : st === 'sem_pedido' ? 'sem pedido' : 'pendente';
  return `<div class="isheet-row" onclick="_closeSheet('rost-ov');setTimeout(()=>openDossier('${e.ref}'),180)">
    <div class="isheet-av" style="background:${av.bg};color:${av.t}">${avInit(e.name || e.ref)}</div>
    <div style="flex:1;min-width:0">
      <div class="isheet-name">${e.name || '—'}</div>
      <div class="isheet-meta">${e.ref} · ${BRANCH_LABELS[normB(e.branch)] || '—'} · ${slots}</div>
    </div>
    ${t ? `<span class="isheet-tag${t.certified ? ' on' : ''}" style="flex-shrink:0">${t.code}</span>`
        : `<span class="isheet-tag" style="flex-shrink:0;opacity:.6">${stTxt}</span>`}
  </div>`;
}

function openRoster(title, kicker, students, tags){
  const host = _sheetHost('rost-ov'); if (!host) return;
  const list = (students || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const rows = list.length
    ? list.map(_rosterRow).join('')
    : '<div class="isheet-empty">Nenhum aluno nesta contagem.</div>';
  host.innerHTML = `<div class="isheet">
    <button class="isheet-close" onclick="_closeSheet('rost-ov')" aria-label="Fechar">✕</button>
    <div class="isheet-head">
      <div class="isheet-eyebrow"><span class="isheet-bar"></span>
        <span class="isheet-kicker">${kicker}</span></div>
      <div class="isheet-title">${title}</div>
      <div class="isheet-sub">${list.length} aluno${list.length !== 1 ? 's' : ''}</div>
      ${tags ? `<div class="isheet-tags">${tags}</div>` : ''}
    </div>
    <div class="isheet-body">${rows}</div>
    <div class="isheet-foot">
      <button class="isheet-btn sage" onclick="exportRoster()">Exportar CSV</button>
      <span style="margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--ap-faint)">clique num aluno para o dossier</span>
    </div>
  </div>`;
  host.classList.add('open');
  _lastRoster = { title, list };
}
let _lastRoster = null;

function exportRoster(){
  if (!_lastRoster) return;
  const rows = [`ALM · ${_lastRoster.title}`, '', 'Nome,Ref,Filial,Nível,Estado,Turma'];
  _lastRoster.list.forEach(e => {
    const t = _findTurmaFor(e.ref);
    const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem pedido';
    rows.push(`"${e.name || ''}","${e.ref}","${BRANCH_LABELS[normB(e.branch)] || ''}","${(LEVEL_MAP[lk(e)] || {}).label || ''}","${st}","${t ? t.code : ''}"`);
  });
  dlCSV(rows.join('\n'), `ALM-${_lastRoster.title.replace(/[^\w]+/g, '-')}.csv`);
  showToast('CSV exportado', 'ok');
}

/* The counted sets, named. Each one is the predicate the matching
   number on screen was produced by — so the list can never disagree
   with the figure above it. */
/* WHICH BRANCH IS "THE" BRANCH DEPENDS ON WHICH PANEL YOU ARE IN.
   Overview keeps its own filter in _ovActiveLoc and Formation keeps
   activeLoc, and the two are only synced when ovDrillToFormation()
   runs. The bar-chart ledger chips live on the Overview summary,
   which is reachable without ever drilling — so reading activeLoc
   there would scope the roster to whatever branch Formation happened
   to be left on, and the list would quietly disagree with the number
   that opened it. */
function _rosterLoc(){
  const ov = document.getElementById('panel-overview');
  return ov && ov.classList.contains('active') ? _ovActiveLoc : activeLoc;
}
function _levelSet(levelKey, kind){
  const loc = _rosterLoc();
  const scope = (loc === 'all' ? allE : allE.filter(e => normB(e.branch) === loc));
  const all = levelKey ? scope.filter(e => lk(e) === levelKey) : scope;
  const res = _allResults[levelKey];
  const inGroup = new Set();
  const inCert  = new Set();
  (res?.groups || []).forEach((g, i) => {
    const c = (_groupCodes[levelKey] || {})[i];
    g.students.forEach(s => { inGroup.add(s.ref); if (c) inCert.add(s.ref); });
  });
  switch (kind) {
    case 'com':    return all.filter(e => !!rByRef[e.ref]);
    case 'sem':    return all.filter(e => !rByRef[e.ref]);
    case 'turma':  return all.filter(e => inGroup.has(e.ref));
    case 'cert':   return all.filter(e => inCert.has(e.ref));
    case 'sinal':  return (res?.sinalizados || []).map(s => s.e).filter(Boolean);
    default:       return all;
  }
}

const _ROSTER_LBL = { all:'Inscritos', com:'Com pedido', sem:'Sem pedido',
  turma:'Em turma', cert:'Certificados', sinal:'Sinalizados' };

function rosterLevel(levelKey, kind){
  const meta = LEVEL_MAP[levelKey] || {};
  openRoster(_ROSTER_LBL[kind] || 'Alunos',
    `${meta.label || levelKey} · ${activeLang || ''} · ${BRANCH_LABELS[_rosterLoc()] || 'Todas as filiais'}`,
    _levelSet(levelKey, kind));
}

/* The sidebar totals count the whole branch, not one level. */
function rosterGlobal(kind){
  openRoster(_ROSTER_LBL[kind] || 'Alunos',
    `${activeLang || ''} · ${BRANCH_LABELS[activeLoc] || 'Todas as filiais'}`,
    _levelSet(null, kind));
}
function rosterGlobalOv(kind){
  const scope = _ovActiveLoc === 'all' ? allE : allE.filter(e => normB(e.branch) === _ovActiveLoc);
  const set = kind === 'com' ? scope.filter(e => !!rByRef[e.ref])
            : kind === 'sem' ? scope.filter(e => !rByRef[e.ref]) : scope;
  openRoster(_ROSTER_LBL[kind] || 'Alunos',
    `${activeLang || ''} · ${BRANCH_LABELS[_ovActiveLoc] || 'Todas as filiais'}`, set);
}

/* A group's own headcount — the "5/17" on a stamp, the "35" on a
   card. This is the one the question was actually about. */
function rosterGroup(levelKey, i){
  const g = _allResults[levelKey]?.groups[i]; if (!g) return;
  const c = (_groupCodes[levelKey] || {})[i];
  const meta = LEVEL_MAP[levelKey] || {};
  const code = c ? (c.turmaCodeA || c.turmaCode || `T${i + 1}`) : `T${i + 1}`;
  const pair = g.pairDef ? ((g.dayIdx_A === g.dayIdx_B) ? g.dayL_A : `${g.dayL_A} + ${g.dayL_B}`) : (g.dayL || '—');
  openRoster(code, `${meta.label || levelKey} · ${pair} · ${g.startTime}–${g.endTime}`,
    g.students, `<span class="isheet-tag${c ? ' on' : ''}">${c ? 'Certificada' : 'Proposta'}</span>`);
}

function openGroupModal(levelKey, i) {
  const result = _allResults[levelKey]; if (!result) return;
  const g = result.groups[i]; if (!g) return;
  const ar = (_auditResults[levelKey] || {})[i];
  const committed = (_groupCodes[levelKey] || {})[i];
  const meta = LEVEL_MAP[levelKey] || {};
  const isCert = !!committed;
  const ts = tierSeal(g, ar);

  const code = isCert
    ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA !== committed.turmaCodeB
        ? `${committed.turmaCodeA} / ${committed.turmaCodeB}`
        : committed.turmaCodeA || committed.turmaCode || `T${i + 1}`)
    : `T${i + 1}`;
  const isSameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
  const pair = g.pairDef
    ? (isSameDay ? (g.dayL_A || g.dayL) : `${g.dayL_A} + ${g.dayL_B}`)
    : (g.dayL || '—');
  const startT = minsToT(g.startMins), endT = minsToT(g.startMins + CLASS_DUR);
  const passC = ar?.passCount ?? g.students.length;
  const warnC = ar?.warnCount ?? 0;
  const failC = ar?.failCount ?? 0;

  const rows = [...g.students]
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => {
      const av = avCol(e.name || e.ref);
      const verdict = ar?.log?.[e.ref]?.verdict || 'pass';
      const reason = ar?.log?.[e.ref]?.reason || '';
      const a2 = analysePrefs(e.ref);
      const slots = a2 ? a2.windows.map(w => `${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · ') : '—';
      return `<div class="isheet-row" onclick="_closeSheet('grp-ov');setTimeout(()=>openDossier('${e.ref}'),200)">
        <div class="isheet-av" style="background:${av.bg};color:${av.t}">${avInit(e.name || e.ref)}</div>
        <div style="flex:1;min-width:0">
          <div class="isheet-name">${e.name || '—'}</div>
          <div class="isheet-meta">${e.ref} · ${slots}</div>
          ${reason && verdict !== 'pass' ? `<div class="isheet-meta" style="color:#8A8A82;font-style:italic">${reason}</div>` : ''}
        </div>
        <span style="flex-shrink:0;display:flex;align-items:center">${_verdictMark(verdict)}</span>
      </div>`;
    }).join('');

  const sessions = isSameDay
    ? `<div class="isheet-fld"><div class="isheet-fk">Sessão única</div><div class="isheet-fv">${g.dayL_A || g.dayL} · ${startT}–${endT}</div></div>`
    : `<div class="isheet-g2">
        <div class="isheet-fld"><div class="isheet-fk">Sessão A${isCert && committed.turmaCodeA ? ' · ' + committed.turmaCodeA : ''}</div><div class="isheet-fv">${g.dayL_A} · ${startT}–${endT}</div></div>
        <div class="isheet-fld"><div class="isheet-fk">Sessão B${isCert && committed.turmaCodeB ? ' · ' + committed.turmaCodeB : ''}</div><div class="isheet-fv">${g.dayL_B} · ${startT}–${endT}</div></div>
      </div>`;

  const host = _sheetHost('grp-ov'); if (!host) return;
  host.innerHTML = `
  <div class="isheet">
    <button class="isheet-close" onclick="_closeSheet('grp-ov')" aria-label="Fechar">✕</button>
    <div class="isheet-head">
      <div class="isheet-eyebrow">
        <span class="isheet-bar" style="background:${ts.ink}"></span>
        <span class="isheet-kicker">${meta.label || levelKey} · ${activeLang || ''} · ${BRANCH_LABELS[normB(g.students[0]?.branch)] || '—'}</span>
      </div>
      <div class="isheet-title">${code}</div>
      <div class="isheet-sub">${pair} · ${startT}–${endT}</div>
      <div class="isheet-tags">
        <span class="isheet-tag">${g.startMins < 720 ? 'Manhã' : 'Tarde'}</span>
        <span class="isheet-tag${isCert ? ' on' : ''}">${ts.label || ''}</span>
        ${isCert ? '<span class="isheet-tag on">Certificada</span>' : ''}
      </div>
    </div>
    <div class="isheet-strip">
      <div class="isheet-stat"><div class="isheet-stat-v">${g.students.length}<span style="font-size:14px;color:var(--ap-faint)">/${MAX_G}</span></div><div class="isheet-stat-l">Alunos</div></div>
      <div class="isheet-stat"><div class="isheet-stat-v" style="color:#4E6B50">${passC}</div><div class="isheet-stat-l">Sem reparos</div></div>
      ${warnC ? `<div class="isheet-stat"><div class="isheet-stat-v" style="color:#8A8A82">${warnC}</div><div class="isheet-stat-l">Avisos</div></div>` : ''}
      ${failC ? `<div class="isheet-stat"><div class="isheet-stat-v" style="color:#B8402A">${failC}</div><div class="isheet-stat-l">Falhas</div></div>` : ''}
    </div>
    <div class="isheet-body">
      <div class="isheet-sec">Sessões</div>
      ${sessions}
      <div class="isheet-sec">Alunos · ${g.students.length}</div>
      ${rows}
    </div>
    <div class="isheet-foot">
      <button class="isheet-btn sage" onclick="exportGroup('${levelKey}',${i})">Exportar CSV</button>
      <button class="isheet-btn" onclick="_closeSheet('grp-ov');setTimeout(()=>openDossier('${g.students[0]?.ref}'),200)">Primeiro dossier</button>
      <span style="margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--ap-faint)">auditoria automática</span>
    </div>
  </div>`;
  host.classList.add('open');
}

function closeGroupModal() { _closeSheet('grp-ov'); }

function exportGroup(levelKey, idx) {
  const result = _allResults[levelKey]; if (!result?.groups[idx]) return;
  const g = result.groups[idx], meta = LEVEL_MAP[levelKey] || {};
  const rows = [`ALM · ${meta.label || levelKey} · Turma ${idx + 1}`, '', 'Nome,Ref,Filial,Estado,Auditoria'];
  g.students.forEach(e => {
    const verdict = (_auditResults[levelKey] || {})[idx]?.log?.[e.ref]?.verdict || '—';
    rows.push(`"${e.name || ''}","${e.ref || ''}","${BRANCH_LABELS[normB(e.branch)] || e.branch || '—'}","${rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem pedido'}","${verdict}"`);
  });
  dlCSV(rows.join('\n'), `ALM-Turma${idx + 1}.csv`);
  showToast(`CSV Turma ${idx + 1} exportado`, 'ok');
}

/* ── SINALIZADOS ──────────────────────────────────────────── */
function buildSinalizadosHTML(result) {
  const { sinalizados, sameDayCt, invalidWinCt, noGroupCt } = result;
  let html = `<div class="sinal-block"><div class="sinal-hdr" onclick="toggleSinal()"><div style="flex:1"><div class="sinal-title">⚠ Sinalizados · não alocados</div><div style="font-size:7px;color:rgba(184,64,42,.5);margin-top:2px">${sameDayCt ? sameDayCt + ' mesmo dia · ' : ''}${invalidWinCt ? invalidWinCt + ' inválido · ' : ''}${noGroupCt ? noGroupCt + ' sem grupo' : ''}</div></div><div class="sinal-count">${sinalizados.length}</div><div style="font-size:8px;color:var(--red-b);transition:transform .18s" id="sinal-arr">▼</div></div><div class="sinal-body" id="sinal-body">`;
  [{ k: 'same-day', lbl: 'Mesmo dia', cls: 'sr-sd', tag: 'SD' }, { k: 'invalid-window', lbl: 'Horário inválido', cls: 'sr-iv', tag: 'IV' }, { k: 'no-group', lbl: 'Sem grupo', cls: 'sr-ng', tag: 'NG' }].forEach(({ k, lbl, cls, tag }) => {
    const sub = sinalizados.filter(s => s.reason === k); if (!sub.length) return;
    html += `<div class="sinal-sub">${lbl}</div>`;
    html += sub.map(({ e, why }) => {
      const a = analysePrefs(e.ref);
      const slots = (a?.windows || []).map(w => `<span class="slot-tag slot-ok">${DAYS_PT[w.dayIdx] || '?'} ${minsToT(w.earliest)}</span>`).join('');
      return `<div class="sinal-stu"><span class="sinal-reason ${cls}">${tag}</span><div style="flex:1;min-width:0"><div style="font-size:9px;color:var(--t);cursor:pointer" onclick="openDossier('${e.ref}')">${e.name || '—'}</div><div style="font-size:7px;color:var(--t3)">${e.ref} · ${BRANCH_LABELS[normB(e.branch)] || e.branch || '—'}</div><div class="sinal-why">${why}</div><div style="margin-top:3px">${slots}</div></div></div>`;
    }).join('');
  });
  html += `</div></div>`; return html;
}

function toggleSinal() {
  _sinalOpen = !_sinalOpen;
  document.getElementById('sinal-body')?.classList.toggle('open', _sinalOpen);
  const arr = document.getElementById('sinal-arr');
  if (arr) arr.style.transform = _sinalOpen ? 'rotate(180deg)' : '';
}

function reAuditLevel(levelKey) {
  const result = _allResults[levelKey];
  if (!result?.groups?.length) return;
  if (!_auditResults[levelKey]) _auditResults[levelKey] = {};
  result.groups.forEach((g, i) => {
    if ((_groupCodes[levelKey] || {})[i]) return;
    _auditResults[levelKey][i] = auditGroupSync(g);
  });
  _exceptionQueue = [];
  for (const key of Object.keys(_allResults)) {
    (_allResults[key].groups || []).forEach((g, i) => {
      const ar = (_auditResults[key] || {})[i];
      if (!ar || ar.status === 'pass') return;
      if ((_groupCodes[key] || {})[i]) return;
      _exceptionQueue.push({ levelKey: key, groupIdx: i, group: g, auditResult: ar });
    });
  }
  renderExcBar();
}

/* ── EXCEPTION BAR ────────────────────────────────────────── */
function renderExcBar() {
  // Exception bar removed from UI — queue logic stays intact for Decision
  // and the bar-row exception icons; this just renders nothing and guards
  // against the now-absent #exc-bar element.
  const bar = document.getElementById('exc-bar');
  if (!bar) return;
  bar.classList.add('hidden');
}

function jumpToException(levelKey, groupIdx) {
  activeLevelKey = levelKey; _lastResult = _allResults[levelKey];
  switchCC('formation', document.getElementById('tab-formation'));
  renderTree(); renderLevelContent();
  setTimeout(() => { const c = document.getElementById(`gcard-${groupIdx}`); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
}

function showAllExceptions(levelKey) {
  if (!_exceptionQueue.length) return;
  if (levelKey) {
    const exc = _exceptionQueue.find(e => e.levelKey === levelKey);
    if (exc) { jumpToException(exc.levelKey, exc.groupIdx); return; }
  }
  jumpToException(_exceptionQueue[0].levelKey, _exceptionQueue[0].groupIdx);
}

function batchConfirm() {
  const btn = document.getElementById('exc-confirm-btn');
  if (btn.classList.contains('disabled')) return;
  const warns = _exceptionQueue.filter(e => e.auditResult.status === 'warn');
  if (!warns.length) return;
  const existing = document.getElementById('bc-overlay'); if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bc-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(20,20,15,.30);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const rows = warns.map(exc => {
    const meta = LEVEL_MAP[exc.levelKey] || {}, g = exc.group;
    const session = `${g.dayL_A || g.dayL} ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}`;
    const warnReasons = [...new Set(Object.values(exc.auditResult.log || {}).map(l => l.reason || l.sizeWarn || '').filter(Boolean))];
    const reasonText = exc.auditResult.sizeWarn ? `${g.students.length} alunos (mín. ${ASSIGN_MIN})` : warnReasons[0] || 'aviso';
    const col = slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins);
    return `<tr style="border-bottom:.5px solid rgba(255,255,255,.06)"><td style="padding:7px 10px;font-size:9px;font-weight:600;color:${meta.color || 'var(--gold2)'}">${meta.label || exc.levelKey}</td><td style="padding:7px 10px;font-size:9px;color:${col}">${session}</td><td style="padding:7px 10px;font-size:9px;font-weight:700;color:var(--t);text-align:center">${g.students.length}</td><td style="padding:7px 10px;font-size:8px;color:var(--amber);font-style:italic">⚠ ${reasonText}</td></tr>`;
  }).join('');
  overlay.innerHTML = `<div style="width:min(680px,96vw);max-height:80dvh;background:var(--bg-d);border-radius:14px;border:.5px solid rgba(255,255,255,.10);display:flex;flex-direction:column;overflow:hidden;animation:shUp .24s cubic-bezier(.32,.72,0,1)"><div style="padding:18px 20px 14px;border-bottom:.5px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;flex-shrink:0"><div style="flex:1"><div style="font-family:var(--display);font-size:22px;letter-spacing:4px;color:var(--amber)">CERTIFICAR AVISOS</div><div style="font-size:8px;color:rgba(255,255,255,.38);margin-top:3px;letter-spacing:.1em">${warns.length} grupos · escrita na base de dados</div></div><button onclick="document.getElementById('bc-overlay').remove()" style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;color:rgba(255,255,255,.6);font-size:13px">✕</button></div><div style="overflow-y:auto;flex:1;padding:8px 0"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)"><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:left">Nível</th><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:left">Sessão</th><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:center">Al</th><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:left">Aviso</th></tr></thead><tbody>${rows}</tbody></table></div><div style="padding:12px 20px;border-top:.5px solid rgba(255,255,255,.08);display:flex;gap:10px;flex-shrink:0"><button onclick="document.getElementById('bc-overlay').remove()" style="height:40px;padding:0 20px;background:transparent;border:.5px solid rgba(255,255,255,.12);border-radius:10px;color:var(--t3);font-family:var(--mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.08em">Cancelar</button><button id="bc-confirm-btn" onclick="batchConfirmExecute()" style="flex:1;height:40px;background:rgba(138,138,130,.85);border:none;border-radius:10px;color:#09080F;font-family:var(--mono);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.1em;transition:all .2s">✓ CERTIFICAR ${warns.length} GRUPOS</button></div></div>`;
  document.body.appendChild(overlay);
}

async function batchConfirmExecute() {
  const btn = document.getElementById('bc-confirm-btn');
  if (btn) btn.disabled = true; if (btn) btn.textContent = '⏳ A certificar…';
  const warns = _exceptionQueue.filter(e => e.auditResult.status === 'warn');
  let ok = 0;
  for (const exc of warns) { try { await commitGroup(exc.levelKey, exc.groupIdx); ok++; } catch { } }
  _exceptionQueue = _exceptionQueue.filter(e => e.auditResult.status !== 'warn');
  document.getElementById('bc-overlay')?.remove();
  showToast(`${ok} turma${ok !== 1 ? 's' : ''} com avisos certificadas`, 'warn');
  renderExcBar();
  if (activeLevelKey && _allResults[activeLevelKey]) renderLevelContent();
}

function overrideException(levelKey, groupIdx) {
  _exceptionQueue = _exceptionQueue.filter(e => !(e.levelKey === levelKey && e.groupIdx === groupIdx));
  commitGroup(levelKey, groupIdx)
    .then(code => { showToast(`Turma ${code || ''} aceite com excepção`, 'warn'); renderExcBar(); renderLevelContent(); })
    .catch(err => showToast('Erro: ' + err.message, 'err'));
}

/* ── SIDEBAR ──────────────────────────────────────────────── */
function initBranchStrip() {
  const branches = [...new Set(allE.map(e => normB(e.branch)).filter(Boolean))];
  const ordered = BRANCH_ORDER.filter(b => branches.includes(b)).concat(branches.filter(b => !BRANCH_ORDER.includes(b)));
  document.getElementById('branch-strip').innerHTML =
    `<button class="branch-pill${activeLoc === 'all' ? ' active' : ''}" onclick="setLoc('all',this)">Tudo</button>` +
    ordered.map(b => `<button class="branch-pill${activeLoc === b ? ' active' : ''}" onclick="setLoc('${b}',this)">${BRANCH_LABELS[b] || b}</button>`).join('');
  document.getElementById('au-branch-strip').innerHTML =
    `<button class="branch-pill${auditFilters.branch === 'all' ? ' active' : ''}" onclick="auSetBranch('all',this)">Tudo</button>` +
    ordered.map(b => `<button class="branch-pill${auditFilters.branch === b ? ' active' : ''}" onclick="auSetBranch('${b}',this)">${BRANCH_LABELS[b] || b}</button>`).join('');
}

function setLoc(loc, btn) {
  activeLoc = loc;
  document.querySelectorAll('#branch-strip .branch-pill').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  // C-03: preserve activeLevelKey
  if (activeLevelKey) {
    const withReq = locStu().filter(e => lk(e) === activeLevelKey && !!rByRef[e.ref]);
    if (withReq.length >= MIN_G) {
   _allResults[activeLevelKey] = buildProposals(activeLevelKey, loc === 'all' ? 'all' : loc);
      _auditResults[activeLevelKey] = {};
      _allResults[activeLevelKey].groups.forEach((g, i) => {
        if (!(_groupCodes[activeLevelKey] || {})[i])
          _auditResults[activeLevelKey][i] = auditGroupSync(g);
      });
    } else {
      delete _allResults[activeLevelKey];
    }
    _lastResult = _allResults[activeLevelKey] || null;
  }
  updateSidebarKPIs();
  renderTree();
  renderLevelContent();
}

function updateSidebarKPIs() {
  const students = locStu(), com = students.filter(e => rByRef[e.ref]).length;
  document.getElementById('st-total').textContent = students.length;
  document.getElementById('st-com').textContent = com;
  document.getElementById('st-sem').textContent = students.length - com;
}

function renderTree() {
  const students = locStu(), tree = {};
  students.forEach(e => { const meta = LEVEL_MAP[lk(e)] || {}, dk = meta.dept || (e.family || 'adults').toLowerCase(), key = lk(e); if (!tree[dk]) tree[dk] = {}; if (!tree[dk][key]) tree[dk][key] = []; tree[dk][key].push(e); });
  let html = '';
  DEPT_ORDER.forEach(dk => {
    if (!tree[dk]) return;
    const dc = DEPT_CFG[dk] || { label: dk, color: 'var(--t3)' }, isOpen = openDepts[dk];
    const dStu = Object.values(tree[dk]).flat();
    const sortedK = Object.keys(tree[dk]).sort((a, b) => (LEVEL_MAP[a]?.order || 99) - (LEVEL_MAP[b]?.order || 99));
    html += `<div class="lp-dept-hdr" onclick="toggleDept('${dk}')"><div class="lp-dept-bar" style="background:${dc.color}"></div><div class="lp-dept-name" style="color:${dc.color}">${dc.label}</div><div class="lp-dept-n">${dStu.length} al</div><div class="lp-dept-arr${isOpen ? ' open' : ''}">▶</div></div><div class="lp-lv-list${isOpen ? ' open' : ''}">`;
    sortedK.forEach(key => {
      const ls = tree[dk][key], meta = LEVEL_MAP[key] || {}, isAct = activeLevelKey === key;
      const auditDot = levelAuditDot(key);
      const formedCount = (_allResults[key]?.groups?.length) || 0;
    const validatedCount = Object.keys(_groupCodes[key] || {}).length;
    const certCount = validatedCount;
      html += `<div class="lp-lv${isAct ? ' active' : ''}" onclick="selectLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color || 'var(--t3)'}"></div><div class="lp-lv-name">${meta.label || key}</div><div class="lp-lv-n">${ls.length}</div>${_bootComplete ? `<div class="lv-audit ${auditDot}" title="Auditoria: ${auditDot}"></div>` : ''}${certCount > 0 ? `<span style="font-size:6px;font-weight:700;color:var(--green);padding:1px 4px;border:1px solid var(--green-b);background:var(--green-a)">${certCount}</span>` : ''}</div>`;
    });
    html += `</div>`;
  });
  document.getElementById('level-tree').innerHTML = html || `<div style="padding:20px;font-size:8px;color:var(--t3);text-align:center">Sem dados.</div>`;
}

function toggleDept(dk) { openDepts[dk] = !openDepts[dk]; renderTree(); }

function selectLevel(key) {
  activeLevelKey = key; _sinalOpen = false;
  const withReq = locStu().filter(e => lk(e) === key && !!rByRef[e.ref]);
  if (withReq.length >= MIN_G) {
_allResults[key] = buildProposals(key, activeLoc);
    _auditResults[key] = {};
    _allResults[key].groups.forEach((g, i) => { if (!(_groupCodes[key] || {})[i]) _auditResults[key][i] = auditGroupSync(g); });
  } else { delete _allResults[key]; }
  _lastResult = _allResults[key] || null;
  renderTree(); renderLevelContent();
}

/* ── U-06: cross-panel refresh after certification ────────── */
function refreshUIAfterCertify(levelKey) {
  // Re-audit and rebuild exception queue
  reAuditLevel(levelKey);
  // Refresh sidebar audit dots
  renderTree();
  // If Formation is visible, repaint stamps for this level
  const fPanel = document.getElementById('panel-formation');
  if (fPanel?.classList.contains('active') && activeLevelKey === levelKey) {
    const wrap = document.getElementById('sg-grid-container-rows-wrap') ||
      document.getElementById('ov-grid-container-rows-wrap');
    if (wrap) {
      _rowRectCache['sg-grid-container'] = {};
      _rowRectCache['ov-grid-container'] = {};
      requestAnimationFrame(() => requestAnimationFrame(() => {
        drawGrid('sg-grid-container',
          locStu().filter(e => lk(e) === levelKey && !!rByRef[e.ref]),
          levelKey, _allResults[levelKey]);
      }));
    }
  }
  // If Overview is visible, refresh summary
  const ovPanel = document.getElementById('panel-overview');
  if (ovPanel?.classList.contains('active')) {
    ovRenderSummary();
  }
  // Always refresh the exception bar
  renderExcBar();
}

/* ── FORMATION LEVEL CONTENT ──────────────────────────────── */
function renderLevelContent() {
  const area = document.getElementById('scroll-area');
  if (!activeLevelKey) {
    area.innerHTML = `<div class="placeholder-main"><div class="placeholder-icon">◈</div><div class="placeholder-text">Seleccione um nível para ver os dados</div></div>`;
    return;
  }
  document.getElementById('view-toggle-bar').style.display = 'none';
  const allStudents = locStu().filter(e => lk(e) === activeLevelKey);
  const withReq = allStudents.filter(e => !!rByRef[e.ref]);
  const noReq = allStudents.length - withReq.length;
  const meta = LEVEL_MAP[activeLevelKey] || getLM(allStudents[0] || {});
  const dc = DEPT_CFG[meta.dept] || {};
  const capPct = Math.round(allStudents.length / (meta.maxCap || 60) * 100);
  const placed = _lastResult ? _lastResult.placed : 0;
  const sinal = _lastResult ? _lastResult.sinalizados.length : 0;
  const certCount = Object.values(_groupCodes[activeLevelKey] || {}).length;
  const excCount = _exceptionQueue.filter(e => e.levelKey === activeLevelKey).length;

  const _lhs = (v, l, kind, col, bar) =>
    `<div class="lh-stat"${kind ? ` onclick="rosterLevel('${activeLevelKey}','${kind}')" style="cursor:pointer" title="Ver os ${v} alunos"` : ''}>` +
    `<div class="lh-v" style="color:${col}">${v}</div><div class="lh-l">${l}</div>${bar || ''}</div>`;
  document.getElementById('level-hdr').innerHTML =
    `<div class="lh-name" style="color:${meta.color}">${meta.label}</div>` +
    `<div class="lh-dept" style="color:${dc.color}">${dc.label || ''}</div>` +
    `<div class="lh-stats">` +
    _lhs(allStudents.length, 'Inscritos', 'all', 'var(--ap-ink)') +
    _lhs(withReq.length, 'Com pedido', 'com', 'var(--sage-deep)') +
    _lhs(noReq, 'Sem pedido', 'sem', 'var(--ap-sub)') +
    (_lastResult ? _lhs(placed, 'Em turma', 'turma', '#9A7B62',
      `<div class="lh-cap-bar"><div class="lh-cap-fill" style="width:${withReq.length ? Math.round(placed / withReq.length * 100) : 0}%;background:#9A7B62"></div></div>`) : '') +
    (certCount > 0 ? _lhs(certCount, 'Cert.', 'cert', 'var(--sage-deep)') : '') +
    (excCount > 0 ? _lhs(excCount, 'Excepções', '', 'var(--ap-sub)') : '') +
    (sinal > 0 ? _lhs(sinal, 'Sinalizados', 'sinal', 'var(--ap-sub)') : '') +
    _lhs(capPct + '%', 'Capacidade', '', 'var(--ap-sub)',
      `<div class="lh-cap-bar"><div class="lh-cap-fill" style="width:${capPct}%;background:${meta.color}"></div></div>`) +
    `</div>`;

  if (!withReq.length) {
    area.innerHTML = `<div class="placeholder-main" style="padding-top:40px"><div style="font-size:22px;opacity:.2">📭</div><div style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);opacity:.55;margin-top:8px">Nenhum pedido submetido</div></div>`;
    return;
  }

  const dept = meta.dept || 'adults';
  const pairCounts = ALM_PAIRS.filter(p => !(p.examOnly && dept !== 'exam')).map(p => ({ pair: p, count: countPair(withReq, p) }));
  let html = '';
  const certCount2 = Object.keys(_groupCodes[activeLevelKey] || {}).length;
  const propCount = (_lastResult?.groups?.length || 0) - certCount2;
  html += `<div class="school-grid-wrap" style="margin-bottom:14px"><div class="school-grid-head"><span class="school-grid-title">Disponibilidade + Turmas · ${withReq.length} al com pedido</span>${certCount2 > 0 ? `<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid rgba(111,143,113,.4);color:#4E6B50;background:rgba(111,143,113,.1)">${certCount2} ✓ cert</span>` : ''}${propCount > 0 ? `<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid rgba(138,138,142,.4);color:#8A8A8E;background:rgba(138,138,142,.1)">${propCount} proposta${propCount !== 1 ? 's' : ''}</span>` : ''}</div><div class="school-grid-outer"><div id="sg-grid-container" style="min-width:540px"></div></div></div>`;
  html += buildPairMatrix(pairCounts);
  if (_lastResult?.groups?.length) {
    html += `<div class="sec">Turmas Propostas · ${_lastResult.groups.length} grupo${_lastResult.groups.length !== 1 ? 's' : ''}${certCount > 0 ? `<span style="font-size:6px;font-weight:700;color:var(--green);padding:1px 4px;border:1px solid var(--green-b);background:var(--green-a)">✓${certCount}</span>` : ''}${excCount > 0 ? `<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--amber-b);color:var(--amber);background:var(--amber-a)">${excCount} ⚠ exc</span>` : ''}</div>`;
    _lastResult.groups.forEach((g, i) => { html += buildGroupCard(g, i); });
  } else {
    html += `<div style="padding:20px;text-align:center;color:var(--t3);font-size:9px;border:1px solid var(--b);margin-bottom:14px;letter-spacing:.1em">Sem turmas formadas — alunos insuficientes por par de dias</div>`;
  }
  if (_lastResult?.sinalizados?.length) html += buildSinalizadosHTML(_lastResult);

  const sorted = [...allStudents].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const turmaByRef = {};
  if (_lastResult?.groups) {
    _lastResult.groups.forEach((g, i) => {
      const committed = (_groupCodes[activeLevelKey] || {})[i];
      const label = committed ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA !== committed.turmaCodeB ? `${committed.turmaCodeA}/${committed.turmaCodeB}` : committed.turmaCodeA || committed.turmaCode || `T${i + 1}`) : `T${i + 1}`;
      g.students.forEach(e => { turmaByRef[e.ref] = { label, color: slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins), cert: !!committed }; });
    });
  }
  let stuRows = '';
  sorted.forEach((e, idx) => {
    const a = analysePrefs(e.ref);
    const slots = a ? a.windows.map(w => `${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · ') : '—';
    const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem_pedido';
    const stCol = st === 'atribuido' ? 'var(--green)' : st === 'sem_pedido' ? 'var(--red)' : 'var(--amber)';
    const stTxt = st === 'atribuido' ? 'atribuído' : st === 'sem_pedido' ? 'sem pedido' : 'pendente';
    const turma = turmaByRef[e.ref];
    stuRows += `<div class="stu-row" onclick="openDossier('${e.ref}')"><div class="stu-cell" style="font-size:8px;color:var(--t4)">${idx + 1}</div><div class="stu-cell" style="font-size:8px;color:var(--t3);font-family:var(--mono)">${(e.ref || '').replace(/\D/g, '')}</div><div class="stu-cell"><div style="font-size:9px;color:var(--t)">${e.name || '—'}</div><div style="font-size:6.5px;color:var(--t3);margin-top:1px">${slots}</div></div><div class="stu-cell">${turma ? `<span style="font-size:7.5px;font-weight:700;color:${turma.color};padding:1px 7px;border:1px solid ${turma.color}44${turma.cert ? ';background:' + turma.color + '11' : ''}">${turma.label}${turma.cert ? ' ✓' : ''}</span>` : '<span style="font-size:7px;color:var(--t4)">—</span>'}</div><div class="stu-cell"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 6px;border:1px solid ${stCol}55">${stTxt}</span></div><div class="stu-cell"><span class="pin-btn" onclick="event.stopPropagation();pinStudent('${e.ref}','${(e.name || '').replace(/'/g, "\\'")}')">📌</span></div></div>`;
  });

  // U-03: student list visible by default with max-height scroll
  html += `<div style="margin-top:14px">
    <div class="sec">Alunos · ${sorted.length}</div>
    <div id="lc-students" style="max-height:320px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--b) transparent">
      <div class="stu-hdr"><span>#</span><span>Ref</span><span>Nome</span><span>Turma</span><span>Status</span><span></span></div>
      ${stuRows}
    </div>
  </div>`;

  area.innerHTML = html;


  const _capturedKey = activeLevelKey, _capturedResult = _lastResult;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (activeLevelKey !== _capturedKey) return;
  drawGrid('sg-grid-container', withReq, _capturedKey, _capturedResult);
  }));
}

/* ── SEARCH ───────────────────────────────────────────────── */
function sbSearchInput(val) {
  const q = val.trim().toLowerCase();
  document.getElementById('sb-search-clear').classList.toggle('vis', val.length > 0);
  const drop = document.getElementById('sb-search-results');
  if (q.length < 2) { drop.classList.remove('open'); return; }
  const matches = locStu().filter(e => (e.name || '').toLowerCase().includes(q) || (e.ref || '').toLowerCase().includes(q)).slice(0, 12);
  if (!matches.length) { drop.innerHTML = `<div style="padding:12px;font-size:8px;color:var(--t3);text-align:center">Nenhum aluno encontrado</div>`; drop.classList.add('open'); return; }
  drop.innerHTML = matches.map(e => {
    const col = avCol(e.name || e.ref), meta = LEVEL_MAP[lk(e)] || {};
    const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem_pedido';
    const stCol = st === 'atribuido' ? 'var(--green)' : st === 'sem_pedido' ? 'var(--red)' : 'var(--amber)';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;cursor:pointer;border-bottom:.5px solid var(--b);transition:background .1s" onmouseover="this.style.background='var(--gold4)'" onmouseout="this.style.background=''" onclick="ovClear();openDossier('${e.ref}')"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;flex-shrink:0;border:1px solid;background:${col.bg};border-color:${col.t}55;color:${col.t}">${avInit(e.name || e.ref)}</div><div style="flex:1;min-width:0"><div style="font-size:9px;font-weight:600;color:var(--t)">${e.name || e.ref}</div><div style="font-size:7px;color:var(--t3)">${e.ref} · ${BRANCH_LABELS[normB(e.branch)] || e.branch || '—'} · ${meta.label || '—'}</div></div><span style="font-size:6.5px;font-weight:700;color:${stCol};padding:1px 5px;border:1px solid ${stCol}55;flex-shrink:0">${st === 'atribuido' ? 'atribuído' : st === 'sem_pedido' ? 'sem pedido' : 'pendente'}</span></div>`;
  }).join('');
  drop.classList.add('open');
}

function sbSearchClear() {
  const i = document.getElementById('sb-search-inp'); if (i) i.value = '';
  document.getElementById('sb-search-clear').classList.remove('vis');
  document.getElementById('sb-search-results').classList.remove('open');
}

/* ── OVERVIEW ─────────────────────────────────────────────── */
const BRANCH_COLORS = { FUNCHAL: '#8A8A8E', CAMARA_LOBOS: '#4E6B50', SANTA_CRUZ: '#8A8A82', MACHICO: '#B8402A', RIBEIRA_BRAVA: '#8A8A8E', CALHETA: '#6F8F71' };

/* Branch-filtered view of a result — groups whose students match the active branch.
   'all' returns everything. Does NOT mutate _allResults. */
function _branchFilteredResult(result, loc){
  if(!result || !result.groups) return result;
  if(loc==='all') return result;
  const groups = result.groups.filter(g=>{
    const first = g.students && g.students[0];
    return first ? normB(first.branch)===loc : true;
  });
  return { ...result, groups };
}

function ovInitBranchStrip() {
  const el = document.getElementById('ov-branches');
  if (!el) return;
  const branches = [...new Set(allE.map(e => normB(e.branch)).filter(Boolean))];
  const ordered = BRANCH_ORDER.filter(b => branches.includes(b)).concat(branches.filter(b => !BRANCH_ORDER.includes(b)));
  el.innerHTML =
    `<button class="branch-pill${_ovActiveLoc === 'all' ? ' active' : ''}" onclick="ovSetLoc('all',this)">Tudo</button>` +
    ordered.map(b => `<button class="branch-pill${_ovActiveLoc === b ? ' active' : ''}" onclick="ovSetLoc('${b}',this)">${BRANCH_LABELS[b] || b}</button>`).join('');
}

function ovSetLoc(loc, btn) {
  _ovActiveLoc = loc; _ovActiveLevel = null;
  document.querySelectorAll('#ov-branches .branch-pill').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  ovRenderStats(); ovRenderTree(); ovRenderSummary();
}
function ovStudents() { return _ovActiveLoc === 'all' ? allE : allE.filter(e => normB(e.branch) === _ovActiveLoc); }
function ovRenderStats() {
  const s = ovStudents(), com = s.filter(e => rByRef[e.ref]).length;
  document.getElementById('ov-total').textContent = s.length;
  document.getElementById('ov-com').textContent = com;
  document.getElementById('ov-sem').textContent = s.length - com;
}

function ovRenderTree() {
  const students = ovStudents(), tree = {};
  students.forEach(e => { const meta = LEVEL_MAP[lk(e)] || {}, dk = meta.dept || (e.family || 'adults').toLowerCase(), key = lk(e); if (!tree[dk]) tree[dk] = {}; if (!tree[dk][key]) tree[dk][key] = []; tree[dk][key].push(e); });
  let html = '';
  DEPT_ORDER.forEach(dk => {
    if (!tree[dk]) return;
    const dc = DEPT_CFG[dk] || {}, isOpen = _ovOpenDepts2[dk];
    const dStu = Object.values(tree[dk]).flat();
    const sortedK = Object.keys(tree[dk]).sort((a, b) => (LEVEL_MAP[a]?.order || 99) - (LEVEL_MAP[b]?.order || 99));
    html += `<div class="lp-dept-hdr" onclick="_ovOpenDepts2['${dk}']=!_ovOpenDepts2['${dk}'];ovRenderTree()"><div class="lp-dept-bar" style="background:${dc.color}"></div><div class="lp-dept-name" style="color:${dc.color}">${dc.label}</div><div class="lp-dept-n">${dStu.length} al</div><div class="lp-dept-arr${isOpen ? ' open' : ''}">▶</div></div><div class="lp-lv-list${isOpen ? ' open' : ''}">`;
    sortedK.forEach(key => {
      const ls = tree[dk][key], meta = LEVEL_MAP[key] || {};
      const auditDot = levelAuditDot(key);
      html += `<div class="lp-lv${_ovActiveLevel === key ? ' active' : ''}" onclick="ovSelectLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color || 'var(--t3)'}"></div><div class="lp-lv-name">${meta.label || key}</div><div class="lp-lv-n">${ls.length}</div>${_bootComplete ? `<div class="lv-audit ${auditDot}"></div>` : ''}</div>`;
    });
    html += `</div>`;
  });
  document.getElementById('ov-tree').innerHTML = html || `<div style="padding:20px;font-size:8px;color:var(--t3);text-align:center">Sem dados.</div>`;
}

function ovSelectLevel(key) { _ovActiveLevel = key; ovRenderTree(); ovDrillToFormation(key); }

/* Always-available student roster for the OVERVIEW drill — every enrolled
   student in the level, with status chip + turma, dossier on click.
   Renders regardless of whether any group/grid exists. */
function renderOvLevelRoster(levelKey, allStudents){
  const sorted = [...allStudents].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const turmaByRef = {};
  (_allResults[levelKey]?.groups||[]).forEach((g,i)=>{
    const committed = (_groupCodes[levelKey]||{})[i];
    const label = committed ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA!==committed.turmaCodeB ? `${committed.turmaCodeA}/${committed.turmaCodeB}` : committed.turmaCodeA||committed.turmaCode||`T${i+1}`) : `T${i+1}`;
    g.students.forEach(e=>{ turmaByRef[e.ref]={label,color:slotCol(g.dayIdx_A??g.dayIdx,g.startMins),cert:!!committed}; });
  });
  let stuRows = '';
  sorted.forEach((e,idx)=>{
    const a = analysePrefs(e.ref);
    const slots = a ? a.windows.map(w=>`${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · ') : '—';
    const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem_pedido';
    const stCol = st==='atribuido'?'var(--green)':st==='sem_pedido'?'var(--red)':'var(--amber)';
    const stTxt = st==='atribuido'?'atribuído':st==='sem_pedido'?'sem pedido':'pendente';
    const turma = turmaByRef[e.ref];
    stuRows += `<div class="stu-row" onclick="openDossier('${e.ref}')"><div class="stu-cell" style="font-size:8px;color:var(--t4)">${idx+1}</div><div class="stu-cell" style="font-size:8px;color:var(--t3);font-family:var(--mono)">${(e.ref||'').replace(/\D/g,'')}</div><div class="stu-cell"><div style="font-size:9px;color:var(--t)">${e.name||'—'}</div><div style="font-size:6.5px;color:var(--t3);margin-top:1px">${slots}</div></div><div class="stu-cell">${turma?`<span style="font-size:7.5px;font-weight:700;color:${turma.color};padding:1px 7px;border:1px solid ${turma.color}44${turma.cert?';background:'+turma.color+'11':''}">${turma.label}${turma.cert?' ✓':''}</span>`:'<span style="font-size:7px;color:var(--t4)">—</span>'}</div><div class="stu-cell"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 6px;border:1px solid ${stCol}55">${stTxt}</span></div><div class="stu-cell"><span class="pin-btn" onclick="event.stopPropagation();pinStudent('${e.ref}','${(e.name||'').replace(/'/g,"\\'")}')">📌</span></div></div>`;
  });
  return `<div style="margin-top:14px"><div class="sec">Alunos · ${sorted.length}</div><div id="lc-students-ov" style="max-height:340px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--b) transparent"><div class="stu-hdr"><span>#</span><span>Ref</span><span>Nome</span><span>Turma</span><span>Status</span><span></span></div>${stuRows}</div></div>`;
}

function ovDrillToFormation(levelKey) {
  _ovActiveLevel = levelKey; activeLevelKey = levelKey; activeLoc = _ovActiveLoc;
  const meta = LEVEL_MAP[levelKey] || {};
  if (meta.dept) _ovOpenDepts2[meta.dept] = true;
  ovRenderTree();
  _lastResult = _branchFilteredResult(_allResults[levelKey] || null, activeLoc);
 if (!_lastResult) {
    const withReq = allE.filter(e => lk(e) === levelKey && !!rByRef[e.ref]);
    if (withReq.length >= MIN_G) {
    _lastResult = buildProposals(levelKey, 'all'); _allResults[levelKey] = _lastResult;
      if (!_auditResults[levelKey]) _auditResults[levelKey] = {};
      _lastResult.groups.forEach((g, i) => { _auditResults[levelKey][i] = auditGroupSync(g); });
      _lastResult = _branchFilteredResult(_lastResult, activeLoc);
    }
  }
  const el = document.getElementById('ov-right');
  const allStudents = (activeLoc === 'all' ? allE : allE.filter(e => normB(e.branch) === activeLoc)).filter(e => lk(e) === levelKey);
  const withReq = allStudents.filter(e => !!rByRef[e.ref]);
  const noReq = allStudents.length - withReq.length;
  const dc = DEPT_CFG[meta.dept] || {};
  const placed = _lastResult ? _lastResult.placed : 0;
  const sinal = _lastResult ? _lastResult.sinalizados.length : 0;
  const certCount = Object.keys(_groupCodes[levelKey] || {}).length;

  const _ovs = (v, l, kind, col) =>
    `<div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)${kind ? ';cursor:pointer' : ''}"${kind ? ` onclick="rosterLevel('${levelKey}','${kind}')" title="Ver os ${v} alunos"` : ''}>` +
    `<div style="font-size:20px;font-weight:700;color:${col}">${v}</div>` +
    `<div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">${l}</div></div>`;
  let html = `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 0 12px;border-bottom:1px solid var(--b2);margin-bottom:14px">` +
    `<div style="font-family:var(--display);font-size:28px;letter-spacing:5px;color:${meta.color || 'var(--ap-ink)'}">${meta.label || levelKey}</div>` +
    `<div style="font-size:8.5px;color:${dc.color || 'var(--t2)'};letter-spacing:.1em;align-self:flex-end;padding-bottom:3px">${dc.label || ''}</div>` +
    `<button onclick="_ovActiveLevel=null;ovRenderStats();ovRenderTree();ovRenderSummary();" style="margin-left:auto;font-size:7px;font-weight:700;padding:3px 10px;border:1px solid var(--b2);color:var(--t3);background:transparent;font-family:var(--mono);cursor:pointer;letter-spacing:.06em">← Visão geral</button>` +
    `<div style="display:flex;gap:0">` +
    _ovs(allStudents.length, 'Inscritos', 'all', 'var(--ap-ink)') +
    _ovs(withReq.length, 'Com pedido', 'com', 'var(--sage-deep)') +
    _ovs(noReq, 'Sem pedido', 'sem', 'var(--ap-sub)') +
    (_lastResult ? _ovs(placed, 'Em turma', 'turma', '#9A7B62') : '') +
    (certCount > 0 ? _ovs(certCount, 'Cert.', 'cert', 'var(--sage-deep)') : '') +
    (sinal > 0 ? _ovs(sinal, 'Sinalizados', 'sinal', 'var(--ap-sub)') : '') +
    `</div></div>`;

 if (!withReq.length) { html += `<div class="placeholder-main" style="padding-top:30px"><div style="font-size:22px;opacity:.2">📭</div><div style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);opacity:.55;margin-top:8px">Nenhum pedido submetido</div></div>`; html += renderOvLevelRoster(levelKey, allStudents); el.innerHTML = html; return; }

  const dept = meta.dept || 'adults';
  const pairCounts = ALM_PAIRS.filter(p => !(p.examOnly && dept !== 'exam')).map(p => ({ pair: p, count: countPair(withReq, p) }));
  html += `<div class="school-grid-wrap" style="margin-bottom:14px"><div class="school-grid-head"><span class="school-grid-title">Disponibilidade + Turmas · ${withReq.length} al com pedido</span>${certCount > 0 ? `<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid rgba(111,143,113,.4);color:#4E6B50;background:rgba(111,143,113,.1)">${certCount} ✓ cert</span>` : ''}</div><div class="school-grid-outer"><div id="ov-grid-container" style="min-width:540px"></div></div></div>`;
  html += buildPairMatrix(pairCounts);
  if (_lastResult?.groups?.length) {
    const lvCert = Object.keys(_groupCodes[levelKey] || {}).length;
    const lvExc = _exceptionQueue.filter(e => e.levelKey === levelKey).length;
    html += `<div class="sec" style="margin-top:14px">Turmas Propostas · ${_lastResult.groups.length} grupo${_lastResult.groups.length !== 1 ? 's' : ''}${lvCert > 0 ? `<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--green-b);color:var(--green);background:var(--green-a)">${lvCert} ✓ cert</span>` : ''}${lvExc > 0 ? `<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--amber-b);color:var(--amber);background:var(--amber-a)">${lvExc} ⚠ exc</span>` : ''}</div>`;
    const savedKey = activeLevelKey; activeLevelKey = levelKey;
    _lastResult.groups.forEach((g, i) => { html += buildGroupCard(g, i); });
    activeLevelKey = savedKey;
  }
  if (_lastResult?.sinalizados?.length) html += buildSinalizadosHTML(_lastResult);
  html += renderOvLevelRoster(levelKey, allStudents);
  html += `<div style="margin-top:10px;padding-bottom:20px"><button onclick="ovOpenStudentModal('${levelKey}')" style="font-size:8px;font-weight:700;padding:5px 16px;border:1px solid var(--b2);color:var(--t2);background:transparent;font-family:var(--mono);cursor:pointer;letter-spacing:.06em;transition:all .12s" onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold2)'" onmouseout="this.style.borderColor='var(--b2)';this.style.color='var(--t2)'">Abrir em janela ↗</button></div>`;
  el.innerHTML = html;

  const _ovCapturedKey = levelKey, _ovCapturedResult = _lastResult;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (_ovActiveLevel !== _ovCapturedKey) return;
     drawGrid('ov-grid-container', withReq, _ovCapturedKey, _ovCapturedResult);
  }));
}

function buildBranchBarChart(students) {
  const byLevel = {};
  students.forEach(e => {
    const key = lk(e), meta = LEVEL_MAP[key] || {}; if (!meta.label) return;
    if (!byLevel[key]) byLevel[key] = { key, label: meta.label, color: meta.color || 'var(--t3)', dept: meta.dept || 'adults', order: meta.order || 99, total: 0, withReq: 0, placed: 0, noReq: 0 };
    byLevel[key].total++;
    if (rByRef[e.ref]) byLevel[key].withReq++; else byLevel[key].noReq++;
  });
Object.keys(byLevel).forEach(key => {
    const result = _allResults[key];
    if (!result) { byLevel[key].placed = 0; return; }
    if (_ovActiveLoc === 'all') { byLevel[key].placed = result.placed || 0; return; }
      const seen = new Set();
    (result.groups || []).forEach(g => g.students.forEach(s => { if (normB(s.branch) === _ovActiveLoc) seen.add(s.ref); }));
    byLevel[key].placed = seen.size;
  });
  const rows = Object.values(byLevel).sort((a, b) => a.order - b.order); if (!rows.length) return '';
  const maxTotal = Math.max(...rows.map(r => r.total), 1);
  const legend = `<div class="barchart-legend"><div class="barchart-legend-item"><div class="barchart-legend-dot" style="background:var(--green)"></div>Em turma</div><div class="barchart-legend-item"><div class="barchart-legend-dot" style="background:#9DB79E"></div>Com pedido · aguarda</div><div class="barchart-legend-item"><div class="barchart-legend-dot" style="background:#B9B7AD"></div>Sem pedido</div></div>`;
  let rowsHTML = `<div class="barchart-rows">`;
  rows.forEach(row => {
    const { key, label, total, withReq, placed, noReq } = row;
    const waiting = withReq - placed;
    const formedCount = (_allResults[key]?.groups?.length) || 0;
    const validatedCount = Object.keys(_groupCodes[key] || {}).length;
    const certCount = validatedCount;
    const sinalizadosCount = (_allResults[key]?.sinalizados?.length) || 0;
    const excCount = _exceptionQueue.filter(e => e.levelKey === key).length;
    const pPlaced = (placed / maxTotal * 100).toFixed(1), pWait = (waiting / maxTotal * 100).toFixed(1), pNoReq = (noReq / maxTotal * 100).toFixed(1);
    const cap = (LEVEL_MAP[key] || {}).maxCap || total || 1;
    const pEmpty = Math.max(0, ((cap - total) / maxTotal * 100)).toFixed(1);
    const placedPct = total > 0 ? Math.round(placed / total * 100) : 0;
    const isClean = certCount > 0 && excCount === 0 && sinalizadosCount === 0 && noReq === 0;
    const isWarn = excCount > 0 || sinalizadosCount > 0 || (withReq > 0 && placed === 0 && (_allResults[key]?.groups?.length || 0) > 0);
    const healthBg = isClean ? 'var(--green)' : isWarn ? 'var(--amber)' : 'var(--red)';
    const iconStyle = `font-size:7px;font-weight:700;padding:2px 7px;border:1px solid;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:var(--mono);border-radius:6px;`;
   const ledgerStyle = `font-size:7px;font-weight:700;padding:2px 6px;border:1px solid;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:var(--mono);border-radius:6px;`;
    let icons = '';
    icons += `<span title="Pares formados" style="${ledgerStyle}background:rgba(138,138,142,.1);border-color:rgba(138,138,142,.4);color:#8A8A8E" onclick="event.stopPropagation();rosterLevel('${key}','turma')">${formedCount}</span>`;
    icons += `<span title="Validados · selo" style="${ledgerStyle}background:var(--gold4);border-color:rgba(111,143,113,.45);color:#4E6B50" onclick="event.stopPropagation();rosterLevel('${key}','cert')">✓ ${validatedCount}</span>`;
    if (sinalizadosCount > 0) icons += `<span title="Ver sinalizados" style="${iconStyle}background:var(--amber-a);border-color:var(--amber-b);color:var(--amber)" onclick="event.stopPropagation();rosterLevel('${key}','sinal')">⚠ ${sinalizadosCount}</span>`;
    if (excCount > 0) icons += `<span title="Ver excepções" style="${iconStyle}background:var(--red-a);border-color:var(--red-b);color:var(--red)" onclick="event.stopPropagation();jumpToException('${key}',0)">! ${excCount}</span>`;
    icons += `<span title="Formation" style="${iconStyle}background:transparent;border-color:var(--b2);color:var(--t3)" onclick="event.stopPropagation();ovDrillToFormation('${key}')">→</span>`;
    rowsHTML += `<div class="barchart-row" onclick="ovDrillToFormation('${key}')"><div class="barchart-row-label" style="display:flex;align-items:center;justify-content:flex-end;gap:4px"><div style="width:7px;height:7px;border-radius:50%;background:${healthBg};flex-shrink:0"></div>${label}</div><div class="barchart-row-track" style="max-width:31%">${placed > 0 ? `<div class="barchart-segment" title="Ver os ${placed} alunos em turma" onclick="event.stopPropagation();rosterLevel('${key}','turma')" style="cursor:pointer;width:${pPlaced}%;background:var(--sage-deep)">${placed >= 6 ? placed : ''}</div>` : ''}${waiting > 0 ? `<div class="barchart-segment" title="Ver os ${waiting} alunos à espera" onclick="event.stopPropagation();rosterLevel('${key}','com')" style="cursor:pointer;width:${pWait}%;background:#9DB79E">${waiting}</div>` : ''}${noReq > 0 ? `<div class="barchart-segment" title="Ver os ${noReq} alunos sem pedido" onclick="event.stopPropagation();rosterLevel('${key}','sem')" style="cursor:pointer;width:${pNoReq}%;background:#B9B7AD">${noReq >= 6 ? noReq : ''}</div>` : ''}${pEmpty > 0 ? `<div class="barchart-segment" style="width:${pEmpty}%;background:rgba(0,0,0,.04)"></div>` : ''}</div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:8px"><span style="font-size:8px;font-weight:700;color:var(--t3);font-family:var(--mono);min-width:22px;text-align:right">${total}</span><span style="font-size:7px;color:var(--t4);font-family:var(--mono);min-width:28px">${placedPct}%</span>${icons}</div></div>`;
  });
  rowsHTML += `</div>`;
  const ticks = [0, 25, 50, 75, 100].map(p => `<div class="barchart-axis-tick">${Math.round(p / 100 * maxTotal)}</div>`).join('');
  return `<div class="barchart-wrap"><div class="sec" style="margin-bottom:10px">Estado por nível <span style="font-size:7px;font-weight:400;color:var(--t3);letter-spacing:0;text-transform:none">· clique na barra para navegar</span></div>${legend}${rowsHTML}<div class="barchart-axis">${ticks}</div></div>`;
}

function ovRenderSummary() {
  const students = ovStudents(), total = students.length;
  const el = document.getElementById('ov-right');
  if (!total) { el.innerHTML = '<div class="empty-msg">Sem inscrições.</div>'; return; }
  const com = students.filter(e => rByRef[e.ref]).length;
  const deptCounts = {}; DEPT_ORDER.forEach(dk => { deptCounts[dk] = students.filter(e => (LEVEL_MAP[lk(e)] || {}).dept === dk).length; });
  const maxD = Math.max(...Object.values(deptCounts), 1);
  let totalCert = 0; Object.values(_groupCodes).forEach(lvl => totalCert += Object.keys(lvl).length);
  let html = `<div class="sec">Visão geral${_ovActiveLoc !== 'all' ? ' · ' + (BRANCH_LABELS[_ovActiveLoc] || _ovActiveLoc) : ''}<span style="font-size:7px;font-weight:600;letter-spacing:.06em;text-transform:none;color:var(--t3);margin-left:4px">${totalCert > 0 ? `· <span style="color:var(--green)">${totalCert} turmas cert.</span>` : ''}${_exceptionQueue.length > 0 ? `· <span style="color:var(--amber)">${_exceptionQueue.length} excepções</span>` : ''}</span></div>`;
  html += buildBranchBarChart(students);
  html += `<div class="sec">Por departamento</div><div style="background:var(--bg2);border:1px solid var(--b);padding:10px 14px;margin-bottom:14px">`;
  DEPT_ORDER.forEach(dk => {
    const dc = DEPT_CFG[dk] || {}, n = deptCounts[dk] || 0, pct = Math.round(n / maxD * 100);
    html += `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:.5px solid var(--b)"><div style="font-size:10px;font-weight:600;width:65px;flex-shrink:0;color:${dc.color}">${dc.label}</div><div style="flex:1;height:4px;background:rgba(0,0,0,.06)"><div style="height:100%;width:${pct}%;background:${dc.color};transition:width .8s"></div></div><div style="font-size:9px;color:var(--t2);width:30px;text-align:right">${n}</div></div>`;
  });
  html += `</div><div style="font-size:7.5px;color:var(--t3);padding-top:8px">← Seleccione um nível no painel esquerdo para ver detalhes</div>`;
  el.innerHTML = html;
}

function ovOpenStudentModal(levelKey) {
  const meta = LEVEL_MAP[levelKey] || {};
  const allStudents = (activeLoc === 'all' ? allE : allE.filter(e => normB(e.branch) === activeLoc)).filter(e => lk(e) === levelKey);
  const turmaByRef = {};
  if (_allResults[levelKey]?.groups) {
    _allResults[levelKey].groups.forEach((g, i) => {
      const committed = (_groupCodes[levelKey] || {})[i];
      const label = committed ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA !== committed.turmaCodeB ? `${committed.turmaCodeA}/${committed.turmaCodeB}` : committed.turmaCodeA || committed.turmaCode || `T${i + 1}`) : `T${i + 1}`;
      g.students.forEach(e => { turmaByRef[e.ref] = { label, color: slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins), cert: !!committed }; });
    });
  }
  const sorted = [...allStudents].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const rows = sorted.map((e, idx) => {
    const a = analysePrefs(e.ref);
    const slots = a ? a.windows.map(w => `${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · ') : '—';
    const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem_pedido';
    const stCol = st === 'atribuido' ? 'var(--green)' : st === 'sem_pedido' ? 'var(--red)' : 'var(--amber)';
    const turma = turmaByRef[e.ref];
    return `<div class="stu-row" onclick="document.getElementById('ov-stu-modal').remove();openDossier('${e.ref}')"><div class="stu-cell" style="font-size:9px;color:var(--t2)">${idx + 1}</div><div class="stu-cell" style="font-size:9px;color:#4E6B50;font-family:var(--mono);font-weight:600">${(e.ref || '').replace(/\D/g, '')}</div><div class="stu-cell"><div style="font-size:9px;color:var(--t)">${e.name || '—'}</div></div><div class="stu-cell">${turma ? `<span style="font-size:7.5px;font-weight:700;color:${turma.color};padding:1px 7px;border:1px solid ${turma.color}44">${turma.label}${turma.cert ? ' ✓' : ''}</span>` : '<span style="font-size:7px;color:var(--t4)">—</span>'}</div><div class="stu-cell"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 6px;border:1px solid ${stCol}55">${st === 'atribuido' ? 'atribuído' : st === 'sem_pedido' ? 'sem pedido' : 'pendente'}</span></div><div class="stu-cell"><span class="pin-btn" onclick="event.stopPropagation();pinStudent('${e.ref}','${(e.name || '').replace(/'/g, "\\'")}')">📌</span></div></div>`;
  }).join('');
  const existing = document.getElementById('ov-stu-modal'); if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'ov-stu-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1400;background:rgba(20,20,15,.30);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div style="width:min(720px,96vw);max-height:85dvh;background:var(--bg2);border-radius:14px;border:.5px solid var(--b2);display:flex;flex-direction:column;overflow:hidden"><div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--b2);flex-shrink:0;background:rgba(0,0,0,.2)"><div style="font-family:var(--display);font-size:22px;letter-spacing:4px;color:${meta.color || 'var(--gold2)'}"> ${meta.label || levelKey}</div><div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)">${sorted.length} alunos</div><button onclick="document.getElementById('ov-stu-modal').remove()" style="margin-left:auto;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;color:rgba(255,255,255,.6);font-size:13px">✕</button></div><div style="overflow-y:auto;padding:10px 20px 24px"><div style="display:grid;grid-template-columns:36px 100px 1fr 110px 90px 40px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);padding:6px 0 9px;border-bottom:1px solid var(--b2)"><span>#</span><span>Ref</span><span>Nome</span><span>Turma</span><span>Status</span><span></span></div>${rows}</div></div>`;
  document.body.appendChild(overlay);
}

function ovSearch(val) {
  const q = val.trim().toLowerCase();
  document.getElementById('ov-clr').classList.toggle('vis', val.length > 0);
  const drop = document.getElementById('ov-drop');
  if (q.length < 2) { drop.classList.remove('open'); return; }
  const matches = allE.filter(e => (e.name || '').toLowerCase().includes(q) || (e.ref || '').toLowerCase().includes(q)).slice(0, 12);
  drop.innerHTML = matches.map(e => {
    const col = avCol(e.name || e.ref), meta = LEVEL_MAP[lk(e)] || {};
    const st = rByRef[e.ref] ? normS(rByRef[e.ref].status) : 'sem_pedido';
    const stCol = st === 'atribuido' ? 'var(--green)' : st === 'sem_pedido' ? 'var(--red)' : 'var(--amber)';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;cursor:pointer;border-bottom:.5px solid var(--b);transition:background .1s" onmouseover="this.style.background='var(--gold4)'" onmouseout="this.style.background=''" onclick="ovClear();openDossier('${e.ref}')"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;flex-shrink:0;border:1px solid;background:${col.bg};border-color:${col.t}55;color:${col.t}">${avInit(e.name || e.ref)}</div><div style="flex:1;min-width:0"><div style="font-size:9px;font-weight:600;color:var(--t)">${e.name || e.ref}</div><div style="font-size:7px;color:var(--t3)">${e.ref} · ${BRANCH_LABELS[normB(e.branch)] || e.branch || '—'} · ${meta.label || '—'}</div></div><span style="font-size:6.5px;font-weight:700;color:${stCol};padding:1px 5px;border:1px solid ${stCol}55;flex-shrink:0">${st === 'atribuido' ? 'atribuído' : st === 'sem_pedido' ? 'sem pedido' : 'pendente'}</span></div>`;
  }).join('') || `<div style="padding:12px;font-size:8px;color:var(--t3);text-align:center">Nenhum aluno encontrado</div>`;
  drop.classList.add('open');
}
function ovClear() { const i = document.getElementById('ov-search'); if (i) i.value = ''; document.getElementById('ov-clr').classList.remove('vis'); document.getElementById('ov-drop').classList.remove('open'); }

/* ── DRILL HELPERS ────────────────────────────────────────── */
function _drillSetupLevel(levelKey) {
  activeLevelKey = levelKey; activeLoc = 'all';
  _lastResult = _allResults[levelKey] || null;
  if (!_lastResult) {
    const withReq = allE.filter(e => lk(e) === levelKey && !!rByRef[e.ref]);
    if (withReq.length >= MIN_G) {
      _lastResult = buildProposals(levelKey, 'all'); _allResults[levelKey] = _lastResult;
      if (!_auditResults[levelKey]) _auditResults[levelKey] = {};
      _lastResult.groups.forEach((g, i) => { _auditResults[levelKey][i] = auditGroupSync(g); });
    }
  }
  document.querySelectorAll('#branch-strip .branch-pill').forEach(t => t.classList.remove('active'));
  document.querySelector('#branch-strip .branch-pill')?.classList.add('active');
  const meta = LEVEL_MAP[levelKey] || {}; if (meta.dept) openDepts[meta.dept] = true;
  updateSidebarKPIs(); renderTree(); renderLevelContent();
}
function drillToGroups(levelKey) { _drillSetupLevel(levelKey); switchCC('formation', document.getElementById('tab-formation')); setTimeout(() => { document.getElementById('gcard-0')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150); }
function drillToSinalizados(levelKey) {
  _drillSetupLevel(levelKey); switchCC('formation', document.getElementById('tab-formation'));
  setTimeout(() => {
    _sinalOpen = true; const body = document.getElementById('sinal-body'); const arr = document.getElementById('sinal-arr');
    if (body) { body.classList.add('open'); if (arr) arr.style.transform = 'rotate(180deg)'; }
    document.querySelector('.sinal-hdr')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

/* ── AUDIT PANEL ──────────────────────────────────────────── */
function setAF(btn) {
  const g = btn.dataset.ag, v = btn.dataset.av; auditFilters[g] = v; auditFilters.levelKey = null;
  document.querySelectorAll(`#panel-audit .fbt[data-ag="${g}"]`).forEach(b => b.classList.remove('act'));
  btn.classList.add('act'); renderAudit(); renderAuditTree();
}
function auSetBranch(b, btn) {
  auditFilters.branch = b; auditFilters.levelKey = null;
  document.querySelectorAll('#au-branch-strip .branch-pill').forEach(t => t.classList.remove('active'));
  btn.classList.add('active'); renderAudit(); renderAuditTree();
}
function auSetLevel(key) { auditFilters.levelKey = key; renderAudit(); renderAuditTree(); }

function renderAudit() {
  let students = [...allE];
  if (auditFilters.branch !== 'all') students = students.filter(e => normB(e.branch) === auditFilters.branch);
  if (auditFilters.dept !== 'all') students = students.filter(e => (LEVEL_MAP[lk(e)] || {}).dept === auditFilters.dept);
  if (auditFilters.levelKey) students = students.filter(e => lk(e) === auditFilters.levelKey);
  if (auditFilters.status !== 'all') students = students.filter(e => {
    const req = rByRef[e.ref];
    if (auditFilters.status === 'noreq') return !req;
    if (auditFilters.status === 'pendente') return req && normS(req.status) === 'pendente';
    if (auditFilters.status === 'atribuido') return req && normS(req.status) === 'atribuido';
    return true;
  });
  const q = ((document.getElementById('au-search-lp')?.value || '')).toLowerCase().trim();
  if (q) students = students.filter(e => (e.name || '').toLowerCase().includes(q) || (e.ref || '').toLowerCase().includes(q));
  const total = allE.length, com = allE.filter(e => rByRef[e.ref]).length, sem = total - com;
  const pend = allE.filter(e => { const r = rByRef[e.ref]; return r && normS(r.status) === 'pendente'; }).length;
  document.getElementById('a-total').textContent = total; document.getElementById('a-com').textContent = com;
  document.getElementById('a-total-lp').textContent = total;
  document.getElementById('a-com-lp').textContent = com;
  document.getElementById('a-sem-lp').textContent = sem;
  document.getElementById('a-sem').textContent = sem; document.getElementById('a-pend').textContent = pend;
  document.getElementById('badge-audit').textContent = sem;

  if (auditFilters.status === 'atribuido') { renderAuditGroupCards(students, q); return; }

  document.getElementById('au-count').textContent = `Mostrando ${Math.min(students.length, 500)} de ${students.length} registos`;
  const hdr = document.getElementById('au-hdr-row'); if (hdr) hdr.style.display = '';
  document.getElementById('au-rows').innerHTML = students.slice(0, 500).map(e => {
    const req = rByRef[e.ref], meta = LEVEL_MAP[lk(e)] || {}, dc = DEPT_CFG[meta.dept || 'adults'] || {};
    const a = analysePrefs(e.ref), dayIdxs = a ? a.dayIdxs : [];
    const cells = DAYS_PT.map((_, di) => `<div class="hcell${dayIdxs.includes(di) ? ' on' : ''}"></div>`).join('');
    const st = req ? normS(req.status) : 'sem_pedido';
    const stCol = st === 'atribuido' ? 'var(--green)' : st === 'sem_pedido' ? 'var(--red)' : 'var(--amber)';
    return `<div class="au-row" onclick="openDossier('${e.ref}')"><div class="au-cell"><div style="font-size:9px;color:var(--t)">${e.name || '—'}</div><div style="font-size:7px;color:var(--t3)">${e.ref || '—'}</div></div><div class="au-cell"><div style="font-size:9px;font-weight:600;color:${meta.color || 'var(--t3)'}">${meta.label || '—'}</div><div style="font-size:7px;color:var(--t3)">${dc.label || ''}</div></div><div class="au-cell"><div class="heatstrip">${cells}</div><div style="font-size:5.5px;color:var(--t4);margin-top:2px;letter-spacing:.04em">S T Q Q S S</div></div><div class="au-cell" style="text-align:center"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 5px;border:1px solid ${stCol}55">${st === 'atribuido' ? 'atribuído' : st === 'sem_pedido' ? 'sem pedido' : 'pendente'}</span></div></div>`;
  }).join('') || `<div class="empty-msg">Nenhum resultado.</div>`;
}

function renderAuditGroupCards(students, q) {
  const refToGroup = {};
  Object.keys(_allResults).forEach(levelKey => {
    (_allResults[levelKey]?.groups || []).forEach((g, i) => {
      const committed = (_groupCodes[levelKey] || {})[i];
      g.students.forEach(s => { refToGroup[s.ref] = { levelKey, groupIdx: i, committed }; });
    });
  });
  const groupsSeen = new Map();
  students.forEach(e => {
    const entry = refToGroup[e.ref]; if (!entry) return;
    const key = `${entry.levelKey}__${entry.groupIdx}`;
    if (!groupsSeen.has(key)) groupsSeen.set(key, entry);
  });
  const groups = [...groupsSeen.values()].sort((a, b) => {
    const ma = LEVEL_MAP[a.levelKey] || {}, mb = LEVEL_MAP[b.levelKey] || {};
    if ((ma.order || 99) !== (mb.order || 99)) return (ma.order || 99) - (mb.order || 99);
    const ga = _allResults[a.levelKey]?.groups[a.groupIdx];
    const gb = _allResults[b.levelKey]?.groups[b.groupIdx];
    return (ga?.startMins || 0) - (gb?.startMins || 0);
  });
  const hdr = document.getElementById('au-hdr-row'); if (hdr) hdr.style.display = 'none';
  document.getElementById('au-count').textContent = `${groups.length} turma${groups.length !== 1 ? 's' : ''} · ${students.length} alunos atribuídos`;
  if (!groups.length) { document.getElementById('au-rows').innerHTML = `<div class="empty-msg">Nenhuma turma encontrada.</div>`; return; }
  document.getElementById('au-rows').innerHTML = `<div class="au-group-grid">${groups.map(({ levelKey, groupIdx, committed }) => {
    const g = _allResults[levelKey]?.groups[groupIdx]; if (!g) return '';
    const ar = (_auditResults[levelKey] || {})[groupIdx];
    const meta = LEVEL_MAP[levelKey] || {};
    const col = slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins);
    const auditCls = !ar ? 'au-gc-clean' : ar.status === 'fail' ? 'au-gc-fail' : ar.status === 'warn' ? 'au-gc-warn' : 'au-gc-clean';
    const pairLabel = g.pairDef ? (g.dayIdx_A === g.dayIdx_B ? g.dayL_A : `${g.dayL_A}+${g.dayL_B}`) : (g.dayL || '—');
    const codeDisplay = committed ? (committed.turmaCodeA && committed.turmaCodeB && committed.turmaCodeA !== committed.turmaCodeB ? `${committed.turmaCodeA}/${committed.turmaCodeB}` : committed.turmaCodeA || committed.turmaCode || `G${groupIdx + 1}`) : `G${groupIdx + 1}`;
    const n = g.students.length, capPct = Math.round(n / MAX_G * 100);
    const fillCol = capPct >= 90 ? 'var(--red)' : capPct >= 70 ? 'var(--amber)' : col;
    const passC = ar?.passCount ?? n, warnC = ar?.warnCount ?? 0, failC = ar?.failCount ?? 0;
    const visStudents = q ? g.students.filter(s => (s.name || '').toLowerCase().includes(q) || (s.ref || '').toLowerCase().includes(q)) : g.students;
    const avs = visStudents.slice(0, 18).map(s => { const ac = avCol(s.name || s.ref); const verdict = ar?.log?.[s.ref]?.verdict || 'pass'; return `<div class="au-gc-av ${verdict !== 'pass' ? verdict : ''}" style="background:${ac.bg};color:${ac.t};border-color:${ac.t}44" title="${s.name || s.ref}">${avInit(s.name || s.ref)}</div>`; }).join('');
    const extra = visStudents.length > 18 ? `<div style="font-size:6.5px;color:var(--t3);padding:2px 3px">+${visStudents.length - 18}</div>` : '';
    const pairA = g.dayL_A || g.dayL || '—';
    const pairB = (g.dayIdx_A ?? g.dayIdx) !== (g.dayIdx_B ?? g.dayIdx) ? (g.dayL_B || '—') : null;
    const timeStr = `${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}`;
    const slotC2 = slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins);
    const weekStrip = `<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:4px;padding:2px 7px;border:1px solid ${slotC2}44;background:${slotC2}11;border-radius:6px"><span style="font-size:8px;font-weight:700;color:${slotC2}">${pairA}</span><span style="font-size:7px;color:${slotC2};opacity:.7">${timeStr}</span></div>${pairB ? `<div style="display:flex;align-items:center;gap:4px;padding:2px 7px;border:1px solid ${slotC2}44;background:${slotC2}0D;border-radius:6px;opacity:.85"><span style="font-size:8px;font-weight:700;color:${slotC2}">${pairB}</span><span style="font-size:7px;color:${slotC2};opacity:.7">${timeStr}</span></div>` : ``}</div>`;
    return `<div class="au-gc ${auditCls}" onclick="openGroupModal('${levelKey}',${groupIdx})"><div class="au-gc-head"><div class="au-gc-code" style="color:${col}">${codeDisplay}</div><div class="au-gc-slot">${pairLabel} · ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}</div><div class="au-gc-meta" style="color:${meta.color || 'var(--t3)'}">${meta.label || '—'} · ${BRANCH_LABELS[normB(g.students[0]?.branch)] || '—'}</div></div><div class="au-gc-body"><div class="au-gc-stats"><div class="au-gc-n" style="color:${col}">${n}</div><div style="font-size:6.5px;color:var(--t3);align-self:flex-end;padding-bottom:3px">/${MAX_G}</div><div class="au-gc-cap"><div class="au-gc-cap-fill" style="width:${capPct}%;background:${fillCol}"></div></div></div><div class="au-gc-audit">${passC > 0 ? `<span class="au-gc-pill pass">✓ ${passC}</span>` : ''}${warnC > 0 ? `<span class="au-gc-pill warn">⚠ ${warnC}</span>` : ''}${failC > 0 ? `<span class="au-gc-pill fail">✕ ${failC}</span>` : ''}</div><div class="au-gc-avs">${avs}${extra}</div>${weekStrip}</div></div>`;
  }).join('')}</div>`;
}

function renderAuditTree() {
  const el = document.getElementById('au-level-tree'); if (!el) return;
  let html = '';
  DEPT_ORDER.forEach(dk => {
    const dc = DEPT_CFG[dk] || {};
    const levels = Object.keys(LEVEL_MAP).filter(k => LEVEL_MAP[k].dept === dk);
    if (!levels.length) return;
    html += `<div style="padding:5px 10px 3px;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${dc.color};border-top:.5px solid var(--b)">${dc.label}</div>`;
    levels.forEach(key => {
      const meta = LEVEL_MAP[key] || {}, n = allE.filter(e => lk(e) === key).length, isActive = auditFilters.levelKey === key;
      html += `<div class="lp-lv${isActive ? ' active' : ''}" onclick="auSetLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color || 'var(--t3)'}"></div><div class="lp-lv-name">${meta.label || key}</div><div class="lp-lv-n">${n}</div></div>`;
    });
  });
  html += `<div class="lp-lv${!auditFilters.levelKey ? ' active' : ''}" onclick="auSetLevel(null)" style="margin-top:4px;border-top:.5px solid var(--b)"><div class="lp-lv-dot" style="background:var(--gold)"></div><div class="lp-lv-name">Todos os níveis</div><div class="lp-lv-n">${allE.length}</div></div>`;
  document.getElementById('au-level-tree').innerHTML = html;
}

/* ── DECISION PANEL ───────────────────────────────────────── */
function decStuChips(students, ar) {
  return [...students].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(e => {
    const av = avCol(e.name || e.ref), verdict = ar?.log?.[e.ref]?.verdict || 'pass';
    const vCol = verdict === 'pass' ? 'var(--green)' : verdict === 'warn' ? 'var(--amber)' : 'var(--red)';
    return '<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;background:var(--bg3);border:1px solid var(--b);cursor:pointer" onclick="openDossier(\'' + e.ref + '\')">'
      + '<div style="width:16px;height:16px;border-radius:50%;background:' + av.bg + ';color:' + av.t + ';font-size:6px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + avInit(e.name || e.ref) + '</div>'
      + '<span style="font-size:8px;color:var(--t)">' + (e.name || e.ref) + '</span>'
      + '<span style="font-size:7px;color:' + vCol + '">' + (verdict === 'pass' ? '✓' : '⚠') + '</span>'
      + '</div>';
  }).join('');
}

async function renderDecision() {
  const triageEl = document.getElementById('dec-triage-list'), mainEl = document.getElementById('dec-main');
  if (!triageEl || !mainEl) return;
  triageEl.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div>A carregar…</div>`;
  try {
    const rows = await sbGet('classes', `select=turma_code,group_code,level_code,department,day_of_week,start_time,end_time,student_refs&academic_year=eq.${AY}&locked=eq.true`);
    const byGC = {};
    rows.forEach(c => {
      const gc = c.group_code || (c.turma_code?.replace(/[AB]$/i, '')); if (!gc) return;
      if (!byGC[gc]) byGC[gc] = []; byGC[gc].push(c);
    });
    Object.values(byGC).forEach(groupRows => {
      const first = groupRows[0];
      const key = `${(first.department || '').toLowerCase()}|${(first.level_code || '').trim()}`;
      if (!_allResults[key]) {
        const refs = Array.isArray(first.student_refs) ? first.student_refs : [];
        const students = refs.map(r => allE.find(e => e.ref === r)).filter(Boolean);
        if (!students.length) return;
        const startMins = timeToMins(first.start_time) ?? 8 * 60;
        const dayRaw = (first.day_of_week || '').toUpperCase().trim();
        const dayIdx = DAYS_PT.indexOf(dayRaw); if (dayIdx < 0) return;
        const rowB = groupRows.find(r => r.turma_code !== first.turma_code);
        const dayRawB = rowB ? (rowB.day_of_week || '').toUpperCase().trim() : dayRaw;
        const dayIdxB = rowB ? DAYS_PT.indexOf(dayRawB) : dayIdx;
        const pairDef = ALM_PAIRS.find(p => p.a === dayIdx && p.b === dayIdxB) || null;
        _allResults[key] = { groups: [{ pairDef, dayIdx_A: dayIdx, dayIdx_B: dayIdxB, dayL_A: DAYS_PT[dayIdx], dayL_B: DAYS_PT[dayIdxB], dayIdx, dayL: DAYS_PT[dayIdx], startMins, startTime: minsToT(startMins), endTime: minsToT(startMins + CLASS_DUR), students, _locked: true }], sinalizados: [], total: students.length, withRequest: students.length, placed: students.length };
        if (!_auditResults[key]) _auditResults[key] = {};
        _auditResults[key][0] = auditGroupSync(_allResults[key].groups[0]);
      }
      const gc = first.group_code || (first.turma_code?.replace(/[AB]$/i, ''));
      const result = _allResults[key]; if (!result?.groups) return;
      const dbRefs = new Set(Array.isArray(first.student_refs) ? first.student_refs : []);
      result.groups.forEach((g, i) => {
        const overlap = g.students.filter(s => dbRefs.has(s.ref)).length;
      if (overlap >= Math.floor(g.students.length * 0.5)) {
        if (!_groupCodes[key]) _groupCodes[key] = {};
        const codeA = groupRows.find(r => /A$/i.test(r.turma_code))?.turma_code || null;
        const codeB = groupRows.find(r => /B$/i.test(r.turma_code))?.turma_code || null;
        if (codeA || codeB) {
          _groupCodes[key][i] = { turmaCode: gc, turmaCodeA: codeA, turmaCodeB: codeB, sentAt: '', status: 'pass', locked: true };
        }
      }
    });
  });
  } catch (e) { console.warn('renderDecision DB fetch failed', e); }

  let totalSessions = 0, certifiedSessions = 0;
  Object.keys(_allResults).forEach(key => {
    const result = _allResults[key]; if (!result?.groups?.length) return;
    result.groups.forEach((g, i) => {
      const committed = (_groupCodes[key] || {})[i];
      const isSameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
      const sessionCount = isSameDay ? 1 : 2;
      totalSessions += sessionCount;
      if (committed) { if (committed.turmaCodeA) certifiedSessions++; if (!isSameDay && committed.turmaCodeB) certifiedSessions++; }
    });
  });
  const pendingSessions = totalSessions - certifiedSessions;
  const pct = totalSessions > 0 ? Math.round(certifiedSessions / totalSessions * 100) : 0;
  document.getElementById('dec-sidebar-sub').textContent = `${certifiedSessions} sessões cert. · ${pendingSessions} por certificar`;
  const fill = document.getElementById('dec-progress-fill'); if (fill) fill.style.width = pct + '%';

  const byLevel = {};
  Object.keys(_allResults).forEach(key => {
    const result = _allResults[key]; if (!result?.groups?.length) return;
    let pending = 0, certified = 0;
    result.groups.forEach((g, i) => {
      const committed = (_groupCodes[key] || {})[i];
      const isSameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
      if (!committed?.turmaCodeA) pending++; else certified++;
      if (!isSameDay) { if (!committed?.turmaCodeB) pending++; else certified++; }
    });
    byLevel[key] = { pending, certified };
  });

  if (!Object.keys(byLevel).length) {
    triageEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--t3);font-size:8px;letter-spacing:.1em">Sem grupos formados ainda</div>`;
    mainEl.innerHTML = `<div class="placeholder-main"><div class="placeholder-icon">✓</div><div class="placeholder-text">← Seleccione um grupo</div></div>`;
    return;
  }

  triageEl.innerHTML = Object.entries(byLevel).map(([key, { pending, certified }]) => {
    const meta = LEVEL_MAP[key] || {}, result = _allResults[key];
    const hasFails = result?.groups?.some((g, i) => (_auditResults[key] || {})[i]?.status === 'fail' && !(_groupCodes[key] || {})[i]);
    const hasWarns = result?.groups?.some((g, i) => (_auditResults[key] || {})[i]?.status === 'warn' && !(_groupCodes[key] || {})[i]);
    const allCert = pending === 0;
    const col = hasFails ? 'var(--red)' : allCert ? 'var(--green)' : hasWarns ? 'var(--amber)' : 'var(--gold2)';
    const statusLabel = hasFails ? 'FAIL' : allCert ? '✓' : hasWarns ? 'WARN' : `${pending}↓`;
    return `<div class="dec-triage-item${hasFails ? ' exception' : allCert ? ' certified' : ''}" onclick="decShowLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color || 'var(--t3)'}"></div><div style="flex:1;min-width:0"><div style="font-size:9px;font-weight:600;color:var(--t)">${meta.label || key}</div><div style="font-size:7px;color:var(--t3);margin-top:1px">${allCert ? `${certified} cert. ✓` : `${pending} por cert.`}</div></div><span style="font-size:7px;font-weight:700;color:${col};padding:1px 6px;border:1px solid ${col}55">${statusLabel}</span></div>`;
  }).join('');
  const firstKey = Object.keys(byLevel)[0]; if (firstKey) decShowLevel(firstKey);
}

function decShowLevel(levelKey) {
  _decLastLevelKey = levelKey;
  const mainEl = document.getElementById('dec-main');
  const result = _allResults[levelKey];
  if (!result?.groups?.length) { mainEl.innerHTML = '<div class="placeholder-main"><div class="placeholder-text">Sem grupos</div></div>'; return; }
  const meta = LEVEL_MAP[levelKey] || {};
  const sessionCards = [];
  result.groups.forEach((g, i) => {
    const committed = (_groupCodes[levelKey] || {})[i];
    const ar = (_auditResults[levelKey] || {})[i];
    const isSameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
    const slots = isSameDay
      ? [{ suffix: 'A', dayL: g.dayL_A || g.dayL, dayIdx: g.dayIdx_A ?? g.dayIdx }]
      : [{ suffix: 'A', dayL: g.dayL_A || g.dayL, dayIdx: g.dayIdx_A ?? g.dayIdx }, { suffix: 'B', dayL: g.dayL_B || g.dayL, dayIdx: g.dayIdx_B ?? g.dayIdx }];
    slots.forEach(({ suffix, dayL }) => {
      const alreadyCert = committed && (suffix === 'A' ? !!committed.turmaCodeA : !!committed.turmaCodeB);
      if (alreadyCert) return;
      const slotCode = committed ? (suffix === 'A' ? (committed.turmaCodeA || `${committed.turmaCode}A`) : (committed.turmaCodeB || `${committed.turmaCode}B`)) : `T${i + 1}${suffix}`;
      sessionCards.push({ groupIdx: i, suffix, dayL, slotCode, g, ar });
    });
  });
  const pending = sessionCards.length;
  let html = `<div class="sec" style="margin-bottom:14px">${meta.label || levelKey} · ${pending} sessão${pending !== 1 ? 'ões' : ''} por certificar</div>`;
  sessionCards.forEach(({ groupIdx, suffix, dayL, slotCode, g, ar }) => {
    const slotC = slotCol(g.dayIdx_A ?? g.dayIdx, g.startMins);
    const session = `${dayL} · ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}`;
    const auditSummary = ar
      ? `<span style="font-size:7px;font-weight:700;color:var(--green);padding:1px 6px;border:1px solid var(--green-b);background:var(--green-a)">✓ ${ar.passCount}</span>`
      + (ar.warnCount ? `<span style="font-size:7px;font-weight:700;color:var(--amber);padding:1px 6px;border:1px solid var(--amber-b);background:var(--amber-a);margin-left:4px">⚠ ${ar.warnCount}</span>` : '')
      + (ar.failCount ? `<span style="font-size:7px;font-weight:700;color:var(--red);padding:1px 6px;border:1px solid var(--red-b);background:var(--red-a);margin-left:4px">✕ ${ar.failCount}</span>` : '')
      : '';
    html += `<div class="dec-card" id="dec-card-${groupIdx}-${suffix}" style="border-left-color:${slotC}"><div class="dc-hdr" onclick="this.parentElement.classList.toggle('open')"><span class="dc-arr">›</span><div style="flex:1;min-width:0"><div style="font-size:10px;font-weight:600;color:${slotC}">${slotCode} · ${session}</div><div style="display:flex;align-items:center;gap:6px;margin-top:3px">${auditSummary}</div></div><div style="font-size:22px;font-weight:700;color:${slotC};line-height:1;margin-right:10px">${g.students.length}</div><button class="dc-btn dc-btn-create" id="dec-btn-${groupIdx}-${suffix}" onclick="event.stopPropagation();decCertifySession('${levelKey}',${groupIdx},'${suffix}',this)">✓ Certificar</button></div><div class="dc-body"><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${decStuChips(g.students, ar)}</div></div></div>`;
  });
  if (!sessionCards.length) { html += `<div style="padding:40px;text-align:center;color:var(--green);font-size:9px;letter-spacing:.1em">✓ Todas as sessões deste nível certificadas</div>`; }
  mainEl.innerHTML = html;
  // Show the back button (U-04)
  const btn = document.getElementById('dec-back-btn');
  if (btn) btn.style.display = 'block';
}

async function decCertifySession(levelKey, groupIdx, suffix, btn) {
  const g = _allResults[levelKey]?.groups[groupIdx]; if (!g) { showToast('Grupo não encontrado', 'err'); return; }
  const meta = LEVEL_MAP[levelKey] || {};
  const ar = (_auditResults[levelKey] || {})[groupIdx] || {};
  const dayL = suffix === 'A' ? (g.dayL_A || g.dayL) : (g.dayL_B || g.dayL_A || g.dayL);
  const confirmed = await almConfirm({ title: 'CERTIFICAR SESSÃO', accent: 'var(--green)', okBg: 'rgba(111,143,113,.9)', okLabel: '✓ Certificar', lines: [`${meta.label || levelKey} · ${dayL} ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}`, `${g.students.length} alunos`] });
  if (!confirmed) return;
  btn.disabled = true; btn.textContent = '⏳ A certificar…';
  try {
    const branch = activeLoc === 'all' ? (normB(g.students[0]?.branch) || 'FUNCHAL') : activeLoc;
    let groupCode = (_groupCodes[levelKey] || {})[groupIdx]?.turmaCode || null;
    if (!groupCode) groupCode = generateTurmaCodeSync(branch);
    const sessionCode = `${groupCode}${suffix}`;
    const row = { group_code: groupCode, turma_code: sessionCode, academic_year: AY, branch, lang: ((g.students[0] || {}).lang || 'EN').toUpperCase().slice(0, 2), department: (LEVEL_MAP[levelKey] || {}).dept || 'adults', level_code: (levelKey.split('|')[1] || '').trim(), level_display: (LEVEL_MAP[levelKey] || {}).label || '', day_of_week: dayL, hour: Math.floor(g.startMins / 60), start_time: g.startTime, end_time: g.endTime, duration_min: CLASS_DUR, student_refs: g.students.map(s => s.ref), status: 'confirmed', locked: true, assignment_source: 'decision_panel', audit_log: ar.log || {}, audited_at: new Date().toISOString(), pass_count: ar.passCount || g.students.length, warn_count: ar.warnCount || 0, fail_count: ar.failCount || 0 };
    const r = await fetch(`${SB}/rest/v1/classes`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify([row]) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    _retiredCodes.add(sessionCode);
    if (!_groupCodes[levelKey]) _groupCodes[levelKey] = {};
    const existing = _groupCodes[levelKey][groupIdx] || {};
    _groupCodes[levelKey][groupIdx] = { ...existing, turmaCode: groupCode, [`turmaCode${suffix}`]: sessionCode, sentAt: new Date().toISOString(), status: ar.status || 'pass', locked: true };
    const card = document.getElementById(`dec-card-${groupIdx}-${suffix}`);
    if (card) {
      card.style.borderLeftColor = 'var(--green)'; card.style.background = 'rgba(111,143,113,.04)';
      btn.textContent = `✓ ${sessionCode}`;
      btn.style.cssText = 'border-color:var(--green-b);color:var(--green);background:var(--green-a);padding:4px 12px;border:1px solid;font-family:var(--mono);font-size:8px;font-weight:700;cursor:default;letter-spacing:.04em';
    }
    // U-06: cross-panel refresh after certification
    refreshUIAfterCertify(levelKey);
    renderDecision().then(() => decShowLevel(levelKey));
  } catch (e) {
    btn.disabled = false; btn.textContent = '✓ Certificar';
    showToast('Erro: ' + e.message, 'err');
  }
}

/* ── NAVIGATION ───────────────────────────────────────────── */
function switchCC(panel, el) {
  document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tb-pill-nav').forEach(t => t.classList.remove('active'));
  const pEl = document.getElementById('panel-' + panel); if (pEl) pEl.classList.add('active');
  if (el) el.classList.add('active');
  if (panel === 'audit') { renderAudit(); renderAuditTree(); }
  if (panel === 'decision') renderDecision();
if (panel === 'overview') { _ovActiveLevel = null; ovInitBranchStrip(); ovRenderStats(); ovRenderTree(); ovRenderSummary(); }
}

/* ── U-04: Decision ← Formation back ─────────────────────── */
let _decLastLevelKey = null;

function decBackToFormation() {
  switchCC('formation', document.getElementById('tab-formation'));
  if (_decLastLevelKey) {
    const meta = LEVEL_MAP[_decLastLevelKey] || {};
    if (meta.dept) openDepts[meta.dept] = true;
    activeLevelKey = _decLastLevelKey;
    if (!activeLoc) activeLoc = 'all';
    _lastResult = _allResults[_decLastLevelKey] || null;
    updateSidebarKPIs();
    renderTree();
    renderLevelContent();
  }
}

/* The .ds-* row/section builders that used to live here went with
   the dark dossier they were written for. The sheet builds its own
   fields (.isheet-fld) and the old helpers had no other callers. */

/* ── NEW DOSSIER ─────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════
   THE STUDENT SHEET
   Same card as the group sheet, same reasons. The version this
   replaces built a 620px dark panel with about 180 lines of inline
   styling in it — every colour written as a literal, which is why
   it survived seven theme passes without changing at all.

   Colours live in the stylesheet now (.isheet-*). What is left
   here is structure and data.
   ══════════════════════════════════════════════════════════════ */

async function openDossier(ref) {
  const host = _sheetHost('stu-ov'); if (!host) return;

  host.innerHTML = `<div class="isheet"><div class="isheet-head">
    <div class="isheet-eyebrow"><span class="isheet-bar"></span>
    <span class="isheet-kicker">A carregar</span></div>
    <div class="isheet-title">${ref}</div></div></div>`;
  host.classList.add('open');

  const esc = e => { if (e.key === 'Escape') { closeDossier(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);

  let enrol = null, req = null, hst = [];
  try {
    const [enrols, reqs, hist] = await Promise.all([
      sbGet('enrolments', `ref=eq.${encodeURIComponent(ref)}&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_code,level_cefr,academic_year,returning_student,guardian_name,guardian_phone,guardian_email,school,school_year,notes&limit=1`),
      sbGet('timetable_requests', `ref=eq.${encodeURIComponent(ref)}&academic_year=eq.${AY}&select=ref,status,sessions_per_week,slots,day_preferences,assigned_turma,notes&limit=1`),
      sbGet('turma_students', `ref=eq.${encodeURIComponent(ref)}&select=ref,turma_code,absences,grade,note`).catch(() => []),
    ]);
    enrol = enrols[0] || null;
    req   = reqs[0]   || rByRef[ref] || null;
    hst   = hist || [];
  } catch (err) {
    host.innerHTML = `<div class="isheet"><div class="isheet-head">
      <div class="isheet-eyebrow"><span class="isheet-bar" style="background:#B8402A"></span>
      <span class="isheet-kicker">Erro</span></div>
      <div class="isheet-title">Sem ligação</div>
      <div class="isheet-sub">${err.message}</div></div>
      <div class="isheet-foot"><button class="isheet-btn" onclick="closeDossier()">Fechar</button></div></div>`;
    return;
  }

  const dept   = (enrol?.family || 'adults').toLowerCase();
  const meta   = LEVEL_MAP[lk(enrol || {})] || {};
  const rawC   = (enrol?.level_code || enrol?.level_cefr || '').trim();
  const lvl    = ALM_DISP[rawC] || rawC || '—';
  const branch = BRANCH_LABELS[normB(enrol?.branch)] || (enrol?.branch || '—').replace(/_/g, ' ');
  const av     = avCol(enrol?.name || ref);
  /* One band tint per department. Muted enough to sit on paper,
     separated enough to be told apart at a glance. */
  const DEPT_BAND = { kids:'#6E8CA8', kids_juv:'#6F8F71', adults:'#8C7F6A', exam:'#7E7391' };
  const turma  = _findTurmaFor(ref);
  const st     = req ? normS(req.status) : 'sem_pedido';
  const stTxt  = st === 'atribuido' ? 'Atribuído' : st === 'sem_pedido' ? 'Sem pedido' : 'Pendente';

  const fld = (k, v, mono) => v
    ? `<div class="isheet-fld"><div class="isheet-fk">${k}</div><div class="isheet-fv"${mono ? ' style="font-family:var(--mono);font-size:12px"' : ''}>${v}</div></div>` : '';
  const dob = enrol?.date_of_birth
    ? new Date(enrol.date_of_birth).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  const identity = `
    <div class="isheet-sec">Inscrição</div>
    <div class="isheet-g2">
      ${fld('Referência', enrol?.ref, true)}
      ${fld('Ano lectivo', enrol?.academic_year, true)}
      ${dob ? fld('Nascimento', dob + (enrol?.age ? ` · ${enrol.age} anos` : '')) : ''}
      ${fld('Género', enrol?.gender)}
      ${fld('Idioma', LANG_LABELS[normLang(enrol?.lang)] || enrol?.lang)}
      ${fld('Filial', branch)}
      ${fld('Escola', enrol?.school)}
      ${fld('Ano escolar', enrol?.school_year)}
      ${fld('Regressante', enrol?.returning_student === true ? 'Sim' : enrol?.returning_student === false ? 'Não' : null)}
    </div>
    <div class="isheet-sec">Contactos</div>
    <div class="isheet-g2">
      ${fld('Telefone', enrol?.phone, true)}
      ${fld('Email', enrol?.email)}
    </div>
    <div class="isheet-sec">Encarregado de educação</div>
    ${enrol?.guardian_name || enrol?.guardian_phone || enrol?.guardian_email ? `
    <div class="isheet-g2">
      ${fld('Nome', enrol?.guardian_name)}
      ${fld('Telefone', enrol?.guardian_phone, true)}
      ${fld('Email', enrol?.guardian_email)}
    </div>` : '<div class="isheet-empty">Sem dados de EE registados</div>'}`;

  const timetable = `
    <div class="isheet-sec">Disponibilidade pedida</div>
    ${req ? _availRuler(req) : '<div class="isheet-empty">Sem pedido registado</div>'}
    <div class="isheet-sec">Turma</div>
    ${turma ? `
      <div class="isheet-fld" style="display:flex;align-items:center;gap:14px">
        <div class="isheet-code">${turma.code}</div>
        <div style="flex:1">
          <div class="isheet-fv">${turma.pair} · ${turma.startTime}–${turma.endTime}</div>
          <div class="isheet-meta">${turma.meta.label || ''}${turma.certified ? ' · certificada' : ' · proposta'}</div>
        </div>
      </div>` : '<div class="isheet-empty">Sem turma atribuída</div>'}
    ${req?.sessions_per_week ? `<div class="isheet-meta" style="margin-top:10px">${req.sessions_per_week} sessão/semana pedida</div>` : ''}`;

  const notes = `
    <div class="isheet-sec">Nota interna</div>
    <textarea class="isheet-note" id="stu-note" placeholder="Visível para toda a equipa ALM…">${enrol?.notes || ''}</textarea>
    <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:10px">
      <span id="stu-note-ok" style="font-family:var(--mono);font-size:10px;color:#4E6B50;opacity:0;transition:opacity .3s">guardado</span>
      <button class="isheet-btn sage" onclick="dsSaveNote('${ref}')">Guardar</button>
    </div>`;

  host.innerHTML = `
  <div class="isheet">
    <button class="isheet-close" onclick="closeDossier()" aria-label="Fechar">✕</button>
    <div class="isheet-head">
      <div class="isheet-eyebrow">
        <span class="isheet-bar"></span>
        <span class="isheet-kicker">${DEPT_CFG[dept]?.label || 'Geral'} · ${lvl} · ${branch}</span>
      </div>
      <!-- The ID band. A photo well and a name on a coloured strip,
           the way a candidate card carries them — the department
           tints the band, so which cohort a student belongs to is
           legible before a single word is read. -->
      <div class="id-band" style="--band:${DEPT_BAND[dept] || DEPT_BAND.adults}">
        <div class="id-photo" style="background:${av.bg};color:${av.t}">${avInit(enrol?.name || ref)}</div>
        <div class="id-who">
          <div class="id-name">${enrol?.name || ref}</div>
          <div class="id-ref">${ref}</div>
        </div>
        <div class="id-lvl">${lvl}</div>
      </div>
      <div class="isheet-tags">
        <span class="isheet-tag">${LANG_LABELS[normLang(enrol?.lang)] || normLang(enrol?.lang)}</span>
        <span class="isheet-tag${st === 'atribuido' ? ' on' : ''}">${stTxt}${turma ? ' · ' + turma.code : ''}</span>
      </div>
    </div>
    <div class="isheet-strip">
      <div class="isheet-stat"><div class="isheet-stat-v">${hst.length || '—'}</div><div class="isheet-stat-l">Anos ALM</div></div>
      <div class="isheet-stat"><div class="isheet-stat-v">${hst[0]?.absences ?? '—'}</div><div class="isheet-stat-l">Faltas</div></div>
      <div class="isheet-stat"><div class="isheet-stat-v">${hst[0]?.grade ?? '—'}</div><div class="isheet-stat-l">Nota final</div></div>
    </div>
    <div class="isheet-tabs">
      <button class="isheet-tab active" data-pane="identity">Identidade</button>
      <button class="isheet-tab" data-pane="timetable">Horário</button>
      <button class="isheet-tab" data-pane="notes">Notas</button>
    </div>
    <div class="isheet-body">
      <div class="isheet-pane active" id="pane-identity">${identity}</div>
      <div class="isheet-pane" id="pane-timetable">${timetable}</div>
      <div class="isheet-pane" id="pane-notes">${notes}</div>
    </div>
    <div class="isheet-foot">
      <button class="isheet-btn primary" id="stu-move">Mudar turma</button>
      <button class="isheet-btn" id="stu-wa">WhatsApp</button>
      <button class="isheet-btn" id="stu-ficha">Ficha completa</button>
    </div>
  </div>`;

  host.querySelectorAll('.isheet-tab').forEach(b => b.addEventListener('click', () => {
    host.querySelectorAll('.isheet-tab').forEach(x => x.classList.remove('active'));
    host.querySelectorAll('.isheet-pane').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    host.querySelector('#pane-' + b.dataset.pane)?.classList.add('active');
  }));

  const phone = (enrol?.phone || '').replace(/\D/g, '');
  host.querySelector('#stu-wa').onclick = () => phone ? window.open(`https://wa.me/${phone}`) : showToast('Sem número', 'warn');
  host.querySelector('#stu-ficha').onclick = () => window.open(`alm-edit-enrollment.html?ref=${encodeURIComponent(ref)}`, '_blank');
  host.querySelector('#stu-move').onclick = () => { closeDossier(); setTimeout(() => openMudarTurma(ref), 200); };

  window.dsSaveNote = async (r) => {
    const txt = document.getElementById('stu-note')?.value;
    if (txt == null) return;
    const ok = await fetch(`${SB}/rest/v1/enrolments?ref=eq.${encodeURIComponent(r)}`, {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: txt }) }).then(x => x.ok).catch(() => false);
    const el = document.getElementById('stu-note-ok');
    if (el && ok) { el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 2200); }
    if (!ok) showToast('Erro ao guardar', 'err');
  };
}

/* Lifted out of openDossier's closure, because Mudar Turma needs the
   same lookup and was duplicating it. */
function _findTurmaFor(ref) {
  for (const [key, result] of Object.entries(_allResults)) {
    for (let i = 0; i < (result.groups || []).length; i++) {
      const g = result.groups[i];
      if (g.students.find(s => s.ref === ref)) {
        const c = (_groupCodes[key] || {})[i];
        const code = c
          ? (c.turmaCodeA && c.turmaCodeB && c.turmaCodeA !== c.turmaCodeB
              ? `${c.turmaCodeA}/${c.turmaCodeB}` : c.turmaCodeA || c.turmaCode || `T${i + 1}`)
          : `T${i + 1}`;
        const pair = g.pairDef
          ? (g.dayIdx_A === g.dayIdx_B ? g.dayL_A : `${g.dayL_A} + ${g.dayL_B}`)
          : (g.dayL || '—');
        return { code, pair, startTime: g.startTime, endTime: g.endTime,
                 certified: !!c, levelKey: key, groupIdx: i, meta: LEVEL_MAP[key] || {} };
      }
    }
  }
  return null;
}

/* The availability ruler, retinted. It was drawn in caramel on a
   dark panel; on paper the band is sage and the grid lines are the
   page's own hairline. */
function _availRuler(req) {
  const slots = parseSlotsForRuler(req);
  const TOTAL = (20 - 8) * 60;
  const pct  = m => ((Math.max(m, 480) - 480) / TOTAL * 100).toFixed(2);
  const wPct = (f, t) => ((Math.min(t, 1200) - Math.max(f, 480)) / TOTAL * 100).toFixed(2);
  const byDay = {};
  slots.forEach(s => { (byDay[s.dayIdx] = byDay[s.dayIdx] || []).push(s); });
  const COLS = [8, 10, 12, 14, 16, 18, 20];
  const hdr = `<div style="display:flex;margin-left:34px;margin-bottom:4px">${COLS.map(h =>
    `<div style="flex:1;font-family:var(--mono);font-size:9px;color:var(--ap-faint)">${h}h</div>`).join('')}</div>`;
  const rows = DAYS_PT.map((d, di) => {
    const ws = byDay[di] || [];
    const lines = COLS.map(h => `<div style="position:absolute;left:${((h - 8) / 12 * 100).toFixed(2)}%;top:0;bottom:0;width:1px;background:rgba(0,0,0,.05)"></div>`).join('');
    const bands = ws.map(s => {
      const f = Math.max(s.fromMins, 480), t = Math.min(s.toMins, 1200);
      if (f >= t) return '';
      return `<div style="position:absolute;left:${pct(f)}%;width:${wPct(f, t)}%;top:3px;bottom:3px;background:var(--sage);border-radius:6px;display:flex;align-items:center;padding:0 6px;overflow:hidden"><span style="font-family:var(--mono);font-size:9px;font-weight:600;color:#fff;white-space:nowrap">${s.startLabel}–${s.endLabel}</span></div>`;
    }).join('');
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
      <div style="width:26px;text-align:right;font-family:var(--mono);font-size:10px;font-weight:600;color:${ws.length ? 'var(--ap-ink)' : 'var(--ap-faint)'};flex-shrink:0">${d}</div>
      <div style="flex:1;position:relative;height:22px;background:rgba(0,0,0,.035);border-radius:6px;overflow:hidden">${lines}${bands}</div>
    </div>`;
  }).join('');
  return hdr + rows;
}

function closeDossier() {
  _closeSheet('stu-ov');
  document.getElementById('alm-dossier-ov')?.remove();
  document.getElementById('ds-overlay')?.classList.remove('open');
}

/* ── MUDAR TURMA ──────────────────────────────────────────── */
let _mtRef = null, _mtSelectedCode = null, _mtSelectedGroupIdx = null, _mtSelectedLevelKey = null;
let _mtChangeSuffix = null, _mtCurrentSuffixA = null, _mtCurrentSuffixB = null;

/* ── WHY THIS LOOKED BROKEN ──────────────────────────────────
   It was not broken, it was gated. The old first act of this
   function was:

     if (!currentCommitted) { showToast('Sem turma certificada…'); return; }

   — so unless the student's group had already been written to the
   database, pressing "Mudar turma" dismissed itself with a toast
   that scrolled past in three seconds. On a roster where almost
   nothing is certified yet that is every student, and the button
   reads as dead.

   The gate was also wrong on the merits. Moving a student between
   two PROPOSED groups is the cheap, reversible case — nothing is
   written to classes, the change lives in _allResults until someone
   certifies. It is the one time moving people is free. The gate
   permitted only the expensive case and blocked the free one.

   So: proposed groups are movable, certified groups are movable,
   and the only genuine precondition is that the student is in a
   group at all. What differs between the two is what gets written
   on confirm, which confirmMudarTurma() already handles.        */
function openMudarTurma(ref, changeSuffix) {
  _mtRef = ref; _mtSelectedCode = null; _mtSelectedGroupIdx = null;
  _mtSelectedLevelKey = null; _mtChangeSuffix = changeSuffix || null;

  const enrol = allE.find(e => e.ref === ref);
  if (!enrol) { showToast('Aluno não encontrado', 'err'); return; }

  const cur = _findTurmaFor(ref);
  if (!cur) {
    showToast('Aluno ainda sem grupo — nada para mudar', 'warn');
    return;
  }
  const committed = (_groupCodes[cur.levelKey] || {})[cur.groupIdx] || null;
  _mtCurrentSuffixA = committed?.turmaCodeA || null;
  _mtCurrentSuffixB = committed?.turmaCodeB || null;

  const g = _allResults[cur.levelKey].groups[cur.groupIdx];
  const isSameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);

  /* A single-session group has no A/B choice to make, so skip it.
     Asking would be a step whose answer is already known. */
  if (!changeSuffix && isSameDay) { _mtRenderStep2(ref, enrol, 'A', cur, committed); return; }
  if (!changeSuffix) { _mtRenderStep1(ref, enrol, cur, committed, g); return; }
  _mtRenderStep2(ref, enrol, changeSuffix, cur, committed);
}

function _mtHead(ref, enrol, kicker, title, tags) {
  const av = avCol(enrol.name || ref);
  return `<button class="isheet-close" onclick="closeMudarTurma()" aria-label="Fechar">✕</button>
    <div class="isheet-head">
      <div class="isheet-eyebrow"><span class="isheet-bar"></span>
        <span class="isheet-kicker">${kicker}</span></div>
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div class="isheet-av" style="width:40px;height:40px;font-size:12px;margin-top:4px;background:${av.bg};color:${av.t}">${avInit(enrol.name || ref)}</div>
        <div style="flex:1;min-width:0"><div class="isheet-title" style="font-size:clamp(22px,3.6vw,30px)">${title}</div></div>
      </div>
      <div class="isheet-tags">${tags}</div>
    </div>`;
}

function _mtRenderStep1(ref, enrol, cur, committed, g) {
  const host = _sheetHost('stu-ov'); if (!host) return;
  const meta = getLM(enrol);
  const tA = `${g.dayL_A || g.dayL} · ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}`;
  const tB = `${g.dayL_B || g.dayL} · ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}`;
  host.innerHTML = `<div class="isheet">
    ${_mtHead(ref, enrol, 'Mudar turma', enrol.name || ref,
      `<span class="isheet-tag">${meta.label || '—'}</span><span class="isheet-tag">${cur.code}</span>` +
      `<span class="isheet-tag${committed ? ' on' : ''}">${committed ? 'Certificada' : 'Proposta'}</span>`)}
    <div class="isheet-body">
      <div class="isheet-sec">Que sessão pretende mudar?</div>
      <div class="isheet-opt" onclick="openMudarTurma('${ref}','A')">
        <div class="isheet-code">A</div>
        <div style="flex:1"><div class="isheet-fv">${tA}</div>
          <div class="isheet-meta">${_mtCurrentSuffixA || 'proposta'} · a sessão B mantém-se</div></div>
      </div>
      <div class="isheet-opt" onclick="openMudarTurma('${ref}','B')">
        <div class="isheet-code">B</div>
        <div style="flex:1"><div class="isheet-fv">${tB}</div>
          <div class="isheet-meta">${_mtCurrentSuffixB || 'proposta'} · a sessão A mantém-se</div></div>
      </div>
    </div>
    <div class="isheet-foot">
      <button class="isheet-btn" onclick="closeMudarTurma()">Cancelar</button>
      <button class="isheet-btn" style="margin-left:auto" onclick="closeMudarTurma();setTimeout(()=>openDossier('${ref}'),200)">Voltar ao dossier</button>
    </div>
  </div>`;
  host.classList.add('open');
}

function _mtRenderStep2(ref, enrol, suffix, cur, committed) {
  const host = _sheetHost('stu-ov'); if (!host) return;
  const meta = getLM(enrol);
  const levelKey = lk(enrol);
  const result = _allResults[levelKey];
  const curCode = suffix === 'A' ? (_mtCurrentSuffixA || cur.code) : (_mtCurrentSuffixB || cur.code);
  const keepCode = suffix === 'A' ? _mtCurrentSuffixB : _mtCurrentSuffixA;

  let opts = '', n = 0;
  (result?.groups || []).forEach((g, i) => {
    if (i === cur.groupIdx) return;                       /* where they already are */
    const c = (_groupCodes[levelKey] || {})[i];
    const same = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
    const code = suffix === 'A'
      ? (c?.turmaCodeA || `T${i + 1}A`)
      : (same ? (c?.turmaCodeA || `T${i + 1}A`) : (c?.turmaCodeB || `T${i + 1}B`));
    const dayL = suffix === 'A' ? (g.dayL_A || g.dayL) : (same ? (g.dayL_A || g.dayL) : g.dayL_B);
    const size = g.students.length, full = size >= MAX_G;
    const pctN = Math.round(size / MAX_G * 100);
    n++;
    opts += `<div class="isheet-opt${full ? ' full' : ''}" id="mt-opt-${i}"
        onclick="mtSelectOption(this,'${levelKey}',${i},'${code}','${suffix}',${full})">
      <div class="isheet-radio"></div>
      <div class="isheet-code">${code}</div>
      <div style="flex:1;min-width:0">
        <div class="isheet-fv">${dayL} · ${minsToT(g.startMins)}–${minsToT(g.startMins + CLASS_DUR)}</div>
        <div class="isheet-meta">${c ? 'certificada' : 'proposta'}${full ? ' · cheia' : ''}</div>
      </div>
      <div style="flex-shrink:0;text-align:right">
        <div style="font-family:var(--ap-font);font-size:14px;font-weight:700;color:var(--ap-ink)">${size}<span style="font-size:10px;color:var(--ap-faint)">/${MAX_G}</span></div>
        <div style="width:34px;height:3px;border-radius:6px;background:rgba(0,0,0,.08);margin-top:4px;overflow:hidden">
          <div style="width:${pctN}%;height:100%;background:${full ? '#B8402A' : 'var(--sage)'}"></div></div>
      </div>
    </div>`;
  });
  if (!n) opts = '<div class="isheet-empty">Sem outra turma neste nível para onde mover.</div>';

  host.innerHTML = `<div class="isheet">
    ${_mtHead(ref, enrol, `Mudar sessão ${suffix}`, enrol.name || ref,
      `<span class="isheet-tag">${meta.label || '—'}</span>` +
      `<span class="isheet-tag">Actual · ${curCode}</span>` +
      (keepCode ? `<span class="isheet-tag on">Mantém · ${keepCode}</span>` : ''))}
    <div class="isheet-body">
      <div class="isheet-sec">Mover para</div>
      ${opts}
    </div>
    <div class="isheet-foot">
      <button class="isheet-btn" onclick="closeMudarTurma()">Cancelar</button>
      <button class="isheet-btn primary" id="mt-confirm-btn" disabled onclick="confirmMudarTurma()">Escolha uma turma</button>
    </div>
  </div>`;
  host.classList.add('open');
}

function mtSelectOption(el, levelKey, groupIdx, code, suffix, full) {
  if (full) { showToast('Turma cheia — não é possível mover', 'warn'); return; }
  document.querySelectorAll('#stu-ov .isheet-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  _mtSelectedLevelKey = levelKey; _mtSelectedGroupIdx = groupIdx; _mtSelectedCode = code;
  if (suffix) _mtChangeSuffix = suffix;
  const btn = document.getElementById('mt-confirm-btn');
  if (btn) { btn.disabled = false; btn.textContent = `Mover para ${code}`; }
}

function closeMudarTurma() {
  _closeSheet('stu-ov');
  document.getElementById('mt-overlay')?.classList.remove('open');
  _mtRef = null; _mtSelectedCode = null; _mtSelectedGroupIdx = null; _mtSelectedLevelKey = null;
  _mtChangeSuffix = null; _mtCurrentSuffixA = null; _mtCurrentSuffixB = null;
}

async function confirmMudarTurma() {
  if (!_mtRef || !_mtSelectedCode || _mtSelectedGroupIdx === null) return;
  const btn = document.getElementById('mt-confirm-btn'); btn.disabled = true; btn.textContent = 'A guardar…';
  const suffix = _mtChangeSuffix || 'AB';
  const enrol = allE.find(e => e.ref === _mtRef);
  const targetCommitted = (_groupCodes[_mtSelectedLevelKey] || {})[_mtSelectedGroupIdx];
  let targetTurmaCode = _mtSelectedCode;
  if (suffix === 'A') targetTurmaCode = targetCommitted?.turmaCodeA || _mtSelectedCode;
  if (suffix === 'B') targetTurmaCode = targetCommitted?.turmaCodeB || _mtSelectedCode;
  let sourceTurmaCode = null;
  if (suffix === 'A') sourceTurmaCode = _mtCurrentSuffixA;
  else if (suffix === 'B') sourceTurmaCode = _mtCurrentSuffixB;
  let assignedCode = targetTurmaCode;
  if (suffix === 'A') { const keepB = _mtCurrentSuffixB; assignedCode = keepB ? `${targetTurmaCode}/${keepB}` : targetTurmaCode; }
  else if (suffix === 'B') { const keepA = _mtCurrentSuffixA; assignedCode = keepA ? `${keepA}/${targetTurmaCode}` : targetTurmaCode; }
  /* A proposed group has no classes row to patch, so the roster
     writes below are skipped and only the request is updated —
     the move lives in _allResults until someone certifies. */
  const isCertifiedMove = !!targetCommitted;
  const payload = { assigned_turma: assignedCode, status: 'atribuido' };
  const existing = rByRef[_mtRef];
  let ok = false;
  try {
    if (existing) { const r = await fetch(`${SB}/rest/v1/timetable_requests?ref=eq.${encodeURIComponent(_mtRef)}&academic_year=eq.${AY}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(payload) }); ok = r.ok; }
    else { const r = await fetch(`${SB}/rest/v1/timetable_requests`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ ref: _mtRef, academic_year: AY, student_name: enrol?.name || _mtRef, branch: enrol?.branch || '', family: enrol?.family || 'adults', level_code: enrol?.level_code || '', level_cefr: enrol?.level_cefr || '', day_preferences: '[]', ...payload }) }); ok = r.ok; }
  } catch (e) { console.error('confirmMudarTurma:', e); }
  if (ok) {
    if (!rByRef[_mtRef]) { rByRef[_mtRef] = { ref: _mtRef, academic_year: AY }; allR.push(rByRef[_mtRef]); }
    rByRef[_mtRef].assigned_turma = assignedCode; rByRef[_mtRef].status = 'atribuido';
    try {
      if (!isCertifiedMove) throw { skip: true };
      const tRows = await sbGet('classes', `select=student_refs&turma_code=eq.${encodeURIComponent(targetTurmaCode)}&academic_year=eq.${AY}&limit=1`);
      const tRefs = new Set(Array.isArray(tRows[0]?.student_refs) ? tRows[0].student_refs : []); tRefs.add(_mtRef);
      const rT = await fetch(`${SB}/rest/v1/classes?turma_code=eq.${encodeURIComponent(targetTurmaCode)}&academic_year=eq.${AY}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ student_refs: [...tRefs], locked: true, assignment_source: 'staff_move', locked_at: new Date().toISOString() }) });
      if (!rT.ok) throw new Error('target write failed HTTP ' + rT.status);
      if (sourceTurmaCode && sourceTurmaCode !== targetTurmaCode) {
        const sRows = await sbGet('classes', `select=student_refs&turma_code=eq.${encodeURIComponent(sourceTurmaCode)}&academic_year=eq.${AY}&limit=1`);
        const sRefs = (Array.isArray(sRows[0]?.student_refs) ? sRows[0].student_refs : []).filter(r => r !== _mtRef);
        await fetch(`${SB}/rest/v1/classes?turma_code=eq.${encodeURIComponent(sourceTurmaCode)}&academic_year=eq.${AY}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ student_refs: sRefs }) });
      }
      await loadLocks();
    } catch (lockErr) {
      if (!lockErr?.skip) { console.warn('roster move failed', lockErr); showToast('Aviso: falha parcial na base de dados', 'warn'); }
    }
    if (enrol) {
      for (const [key, result] of Object.entries(_allResults)) { result.groups.forEach(g => { const idx = g.students.findIndex(s => s.ref === _mtRef); if (idx >= 0) g.students.splice(idx, 1); }); }
      const tg = _allResults[_mtSelectedLevelKey]?.groups[_mtSelectedGroupIdx];
      if (tg && !tg.students.find(s => s.ref === _mtRef)) tg.students.push(enrol);
    }
    const enrolName = (allE.find(e => e.ref === _mtRef)?.name || _mtRef).split(' ')[0];
    const suffixLabel = suffix === 'A' ? 'Sessão A' : suffix === 'B' ? 'Sessão B' : 'Par';
    /* The full-bleed success curtain is gone with the old modal. A
       toast says the same thing without holding the screen for 1.6s
       to say it, and the sheet closes immediately. */
    showToast(`${enrolName} · ${suffixLabel} → ${targetTurmaCode}`, 'ok');
    closeMudarTurma();
    if (activeLevelKey === _mtSelectedLevelKey) renderLevelContent();
  } else {
    showToast('Erro ao guardar — ver consola', 'err'); btn.disabled = false;
    const suffixLabel = suffix === 'A' ? 'sessão A' : suffix === 'B' ? 'sessão B' : 'par';
    btn.textContent = `✓ MOVER ${suffixLabel.toUpperCase()} PARA ${_mtSelectedCode}`;
  }
}

function closeMudarTurma() {
  document.getElementById('mt-overlay').classList.remove('open');
  _mtRef = null; _mtSelectedCode = null; _mtSelectedGroupIdx = null; _mtSelectedLevelKey = null;
  _mtChangeSuffix = null; _mtCurrentSuffixA = null; _mtCurrentSuffixB = null;
}

/* ── UTILITIES ────────────────────────────────────────────── */
function almConfirm(opts) {
  return new Promise(resolve => {
    const o = opts || {};
    document.getElementById('alm-confirm-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'alm-confirm-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(20,20,15,.30);display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = `<div style="width:min(380px,94vw);background:var(--bg-d);border-radius:14px;border:.5px solid rgba(255,255,255,.10);overflow:hidden;animation:shUp .24s cubic-bezier(.32,.72,0,1)"><div style="padding:18px 20px 14px;border-bottom:.5px solid rgba(255,255,255,.07)"><div style="font-family:var(--display);font-size:18px;letter-spacing:3px;color:${o.accent || 'var(--gold2)'}">${o.title || 'CONFIRMAR'}</div>${o.lines ? o.lines.map(l => `<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:5px;font-family:var(--mono);letter-spacing:.03em">${l}</div>`).join('') : ''}</div><div style="padding:12px 20px;display:flex;gap:10px;justify-content:flex-end"><button id="alm-confirm-cancel" style="height:38px;padding:0 18px;background:transparent;border:.5px solid rgba(255,255,255,.12);border-radius:10px;color:var(--t3);font-family:var(--mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.08em">${o.cancelLabel || 'Cancelar'}</button><button id="alm-confirm-ok" style="height:38px;padding:0 22px;background:${o.okBg || 'rgba(111,143,113,.92)'};border:none;border-radius:10px;color:#09080F;font-family:var(--mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.08em">${o.okLabel || 'Confirmar'}</button></div></div>`;
    document.body.appendChild(ov);
    const done = v => { ov.remove(); resolve(v); };
    ov.querySelector('#alm-confirm-ok').onclick = () => done(true);
    ov.querySelector('#alm-confirm-cancel').onclick = () => done(false);
    ov.onclick = e => { if (e.target === ov) done(false); };
  });
}

function pinStudent(ref, name) { showToast(`📌 ${name} fixado`, 'ok'); }

let _toastT;
function showToast(msg, type = 'ok') { const t = document.getElementById('toast'); t.textContent = msg; t.className = `toast ${type} show`; clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), 3000); }

// U-07: wax seal hover — subtle scale only, no rotation, no heavy shadow
// (handled in the HTML topbar inline styles; the CSS transition is the only animation needed)

function openAbacusModal() {
  const ex = document.getElementById('abacus-modal-ov'); if (ex) { ex.remove(); return; }
  const ov = document.createElement('div'); ov.id = 'abacus-modal-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(20,20,15,.30);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div style="position:relative"><button onclick="document.getElementById('abacus-modal-ov').remove()" style="position:absolute;top:-14px;right:-14px;z-index:10;width:32px;height:32px;border-radius:50%;background:rgba(184,64,42,.85);border:1.5px solid rgba(255,255,255,.3);cursor:pointer;color:#fff;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center">✕</button><iframe src="alm-certified-screen.html" style="width:min(1100px,96vw);height:90dvh;border:none;border-radius:14px;display:block"></iframe></div>`;
  document.body.appendChild(ov);
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); } });
}

/* ── EVENT LISTENERS ──────────────────────────────────────── */
document.addEventListener('click', e => {
  if (!e.target.closest('.lp-search-wrap')) {
    document.getElementById('ov-drop')?.classList.remove('open');
    document.getElementById('sb-search-results')?.classList.remove('open');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('ds-overlay')?.classList.contains('open')) { closeDossier(); return; }
    if (document.getElementById('mt-overlay')?.classList.contains('open')) { closeMudarTurma(); return; }
    closeGroupModal();
  }
});

/* ── BOOT SEQUENCE ────────────────────────────────────────── */
async function boot() {
  try {
    setBoot('A carregar inscrições e pedidos…'); setBootProgress(5);
    const [enrol, reqs] = await Promise.all([
      sbGet('enrolments', `select=ref,name,branch,lang,family,level_code,level_cefr&academic_year=eq.${AY}&order=ref`),
      sbGet('timetable_requests', `select=ref,branch,family,level_code,level_cefr,slots,day_preferences,status&academic_year=eq.${AY}`),
    ]);
    setConn(true);
    /* master first, then scope — see the note by ALL_ENROLMENTS */
    ALL_ENROLMENTS = enrol || []; allR = reqs || []; rByRef = {};
    allR.forEach(r => { rByRef[r.ref] = r; });
    applyLangScope(); renderLangScope();
    document.getElementById('boot-count').textContent = allE.length;
    document.getElementById('pill-total').textContent = `${allE.length} al`;
    setBootProgress(35);
    setBoot('A carregar fixações…');
    await loadLocks();
    _proposalCache = {};
    const { committed, exceptions } = await runBootAudit();
    _bootComplete = true;
    document.getElementById('pill-status').textContent = 'Supabase OK';
    document.getElementById('pill-status').className = 'tb-status ok';
    updateSidebarKPIs(); initBranchStrip(); renderTree(); renderAuditTree(); renderExcBar();
    document.getElementById('badge-audit').textContent = allE.filter(e => !rByRef[e.ref]).length || '0';
    document.getElementById('badge-pending').textContent = allE.filter(e => { const r = rByRef[e.ref]; return r && normS(r.status) === 'pendente'; }).length || '0';
    setTimeout(() => { document.getElementById('boot-overlay').classList.add('hidden'); }, 350);
    const msg = exceptions > 0 ? `${allE.length} al · ${exceptions} excepção${exceptions !== 1 ? 's' : ''} por certificar` : `${allE.length} al · pronto para certificar ✓`;
    showToast(msg, exceptions > 0 ? 'warn' : 'ok');
    switchCC('overview', document.getElementById('tab-overview'));
  } catch (err) {
    setConn(false);
    document.getElementById('boot-sub').textContent = 'Erro: ' + err.message;
    document.getElementById('pill-status').textContent = 'Erro DB';
    document.getElementById('pill-status').className = 'tb-status err';
    setTimeout(() => { document.getElementById('boot-overlay').classList.add('hidden'); }, 3000);
    showToast('Erro Supabase: ' + err.message, 'err');
  }
}

/* ── AGUARDAR TURMA · badge + inspector (read-only, reuses countAguardarTurma) ── */
let _aguardarLast = null;

function updateAguardarBadge(){
  const btn = document.getElementById('alm-aguardar-btn');
  if (!btn || !_bootComplete) return;
  let r;
  try { r = underfilledClusters(_ovActiveLoc); }
  catch(e){ console.warn('updateAguardarBadge failed', e); return; }
  _aguardarLast = r;
  const dot = document.getElementById('alm-aguardar-dot');
  const inc = document.getElementById('alm-aguardar-inc');
  if (inc) inc.style.display = 'none';                       // second pill no longer used
  if (dot){
    if (r.totalStudents > 0){ dot.textContent = r.totalStudents > 99 ? '99+' : r.totalStudents; dot.style.display = 'flex'; }
    else dot.style.display = 'none';
  }
  if (r.totalStudents > 0){
    btn.style.borderColor = 'rgba(138,138,130,.45)';          // amber — in-progress, not error
    btn.style.color = '#8A8A82';
    btn.style.background = 'rgba(138,138,130,.1)';
  } else {
    btn.style.borderColor = 'rgba(255,255,255,.15)';
    btn.style.color = 'rgba(255,255,255,.55)';
    btn.style.background = 'rgba(255,255,255,.04)';
  }
}

/* ── ACTUALIZAR · red/green sort-needed indicator ──
   Red + count = N new requests awaiting sort (press to sort).
   Green = nothing awaiting; no need to press. A request with no
   proposed_turma is "awaiting" — reuses _proposedByRef. */
function updateRefreshBadge(){
  const btn = document.getElementById('alm-refresh-btn');
  if (!btn || !_bootComplete) return;
  const lbl = document.getElementById('alm-refresh-lbl');
  const cnt = document.getElementById('alm-refresh-count');
  const awaiting = allE.filter(e => rByRef[e.ref] && !_proposedByRef[e.ref] && LEVEL_MAP[lk(e)]).length;
  if (awaiting > 0){
    btn.style.borderColor = 'rgba(184,64,42,.45)';
    btn.style.color = '#B8402A';
    btn.style.background = 'rgba(184,64,42,.1)';
    if (lbl) lbl.textContent = '↻ ACTUALIZAR';
    if (cnt){ cnt.textContent = awaiting > 99 ? '99+' : awaiting; cnt.style.display = 'inline-flex'; }
  } else {
    btn.style.borderColor = 'rgba(111,143,113,.45)';
    btn.style.color = '#4E6B50';
    btn.style.background = 'rgba(111,143,113,.1)';
    if (lbl) lbl.textContent = '✓ ACTUALIZADO';
    if (cnt) cnt.style.display = 'none';
  }
}

/* ── POR COMPLETAR · under-MIN_G cluster derivation (read-only) ──
   Every proposed group below 5, not yet validated, branch-scoped,
   sorted closest-to-viable first. ACTUALIZAR fills them; this just shows them. */
function underfilledClusters(branchLoc){
  const loc = branchLoc || _ovActiveLoc || 'all';
  const out = [];
  for (const key of Object.keys(_allResults)){
    const groups = _allResults[key]?.groups || [];
    groups.forEach((g, i) => {
      if ((_groupCodes[key] || {})[i]) return;               // validated/certified → not a target
      const br = normB(g.students[0]?.branch);
      if (loc !== 'all' && br !== loc) return;               // branch scope
      const n = g.students.length;
      if (n >= MIN_G || n === 0) return;                     // only 1..4
      const meta = LEVEL_MAP[key] || {};
      const sameDay = (g.dayIdx_A ?? g.dayIdx) === (g.dayIdx_B ?? g.dayIdx);
      const pair = sameDay ? (g.dayL_A || g.dayL) : `${g.dayL_A}+${g.dayL_B}`;
      out.push({ key, i, label: meta.label || key, color: meta.color || 'var(--t3)',
        branch: br, n, need: MIN_G - n, slot: `${pair} ${g.startTime}`, order: meta.order || 99 });
    });
  }
  out.sort((a, b) => a.need - b.need || a.order - b.order);
  return { clusters: out, totalStudents: out.reduce((s, c) => s + c.n, 0), totalClusters: out.length };
}

function _openAguardarList(){
  let r = _aguardarLast;
  if (!r){ try { r = underfilledClusters(_ovActiveLoc); } catch { r = null; } }
  if (!r || !r.totalClusters){ showToast('Nada por completar — todos os grupos ≥ 5 ✓','ok'); return; }
  const scope = _ovActiveLoc === 'all' ? 'Todas as filiais' : (BRANCH_LABELS[_ovActiveLoc] || _ovActiveLoc);
  const row = c => {
    const pct = Math.round(c.n / MIN_G * 100);
    return `<div class="stu-row" style="cursor:pointer" onclick="document.getElementById('alm-aguardar-ov').remove();ovDrillToFormation('${c.key}')">
      <div class="stu-cell" style="min-width:0"><div style="font-size:10px;font-weight:700;color:${c.color}">${c.label}</div><div style="font-size:7px;color:var(--t3)">${c.slot}${_ovActiveLoc==='all'?' · '+(BRANCH_LABELS[c.branch]||c.branch):''}</div></div>
      <div class="stu-cell" style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
        <div style="width:54px;height:5px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden"><div style="width:${pct}%;height:100%;background:#8A8A82"></div></div>
        <span style="font-size:11px;font-weight:700;font-family:var(--mono);color:#4E6B50">${c.n}<span style="opacity:.4">/${MIN_G}</span></span>
        <span style="font-size:7px;font-weight:700;color:#8A8A82;padding:1px 6px;border:1px solid rgba(138,138,130,.4);background:rgba(138,138,130,.1);white-space:nowrap">faltam ${c.need}</span>
      </div>
    </div>`;
  };
  document.getElementById('alm-aguardar-ov')?.remove();
  const ov = document.createElement('div');
  ov.id = 'alm-aguardar-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:1600;background:rgba(20,20,15,.30);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div style="width:min(560px,96vw);max-height:85dvh;background:var(--bg2);border-radius:14px;border:.5px solid var(--b2);display:flex;flex-direction:column;overflow:hidden">
    <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--b2);flex-shrink:0;background:rgba(0,0,0,.2)">
      <div style="font-family:var(--display);font-size:20px;letter-spacing:3px;color:#8A8A82">POR COMPLETAR</div>
      <div style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)">${r.totalStudents} alunos · ${r.totalClusters} grupo${r.totalClusters!==1?'s':''} < ${MIN_G} · ${scope}</div>
      <button onclick="document.getElementById('alm-aguardar-ov').remove()" style="margin-left:auto;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;color:rgba(255,255,255,.6);font-size:13px">✕</button>
    </div>
    <div style="padding:8px 20px 6px;font-size:7.5px;color:var(--t3);letter-spacing:.04em;border-bottom:.5px solid var(--b)">Mais perto de viável primeiro · clique para abrir o grupo · ACTUALIZAR preenche-os</div>
    <div style="overflow-y:auto;flex:1;padding:6px 0">${r.clusters.map(row).join('')}</div>
  </div>`;
  document.body.appendChild(ov);
}


/* ══ MANUAL REFRESH + LIVE MODE (replaces 2-min auto-loop) ══ */
function _injectRefreshControls(){
  if (document.getElementById('alm-refresh-btn')) return;
  const liveLbl = document.getElementById('live-lbl');
  const anchor = (liveLbl && liveLbl.parentElement)
    || document.querySelector('.topbar, .tb, [class*="topbar"]')
    || document.body;
  const wrap = document.createElement('div');
  wrap.id = 'alm-refresh-wrap';
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:12px';

  const btn = document.createElement('button');
  btn.id = 'alm-refresh-btn'; btn.type = 'button';
  btn.title = 'Recarregar dados da base de dados';
  btn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 12px;border-radius:999px;border:.5px solid rgba(111,143,113,.4);background:rgba(111,143,113,.1);color:#4E6B50;font-family:var(--mono,monospace);font-size:9px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:all .15s';
 btn.innerHTML = '<span id="alm-refresh-lbl">↻ ACTUALIZAR</span>'
    + '<span id="alm-refresh-count" style="display:none;align-items:center;justify-content:center;height:15px;min-width:15px;margin-left:5px;padding:0 5px;border-radius:999px;background:rgba(184,64,42,.9);color:#fff;font-size:8px;font-weight:700">0</span>';
  btn.onmouseover = () => { btn.style.filter = 'brightness(1.15)'; };
  btn.onmouseout  = () => { btn.style.filter = ''; };
btn.onclick = async () => {
    if (!_bootComplete) return;
    btn.disabled = true; const orig = btn.innerHTML; btn.innerHTML = '⏳ A ordenar…';
    try {
     const res = await applyIncremental();           // sort waiting letters → proposed_turma
      await refreshData();                            // re-read snapshot + repaint
      updateAguardarBadge();                          // recount the basket after sorting
      const c = res.counts;
      if (c.awaiting > 0) {
        const bits = [];
        if (c.foldedExisting)     bits.push(`${c.foldedExisting} em turma`);
        if (c.newClusterStudents) bits.push(`${c.newClusterStudents} em ${c.newClusters} novo${c.newClusters!==1?'s':''}`);
        if (c.pending)            bits.push(`${c.pending} pendente${c.pending!==1?'s':''}`);
        showToast(`Ordenado · ${bits.join(' · ') || c.awaiting + ' em espera'} ✓`, c.pending ? 'warn' : 'ok');
      } else {
        showToast('Tudo ordenado — nada em espera ✓', 'ok');
      }
  } catch(e){ showToast('Erro ao ordenar: ' + e.message, 'err'); }
    finally { btn.disabled = false; btn.innerHTML = orig; updateRefreshBadge(); }
  };
   
  const live = document.createElement('button');
  live.id = 'alm-live-btn'; live.type = 'button';
  live.title = 'Modo directo: actualização automática cada 60s (use só na época de inscrições)';
  live.style.cssText = 'display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 12px;border-radius:999px;border:.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);font-family:var(--mono,monospace);font-size:9px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:all .15s';
  live.innerHTML = '○ DIRECTO';
  live.onclick = () => {
    _liveMode = !_liveMode;
    if (_liveMode){
      live.style.background='rgba(61,232,168,.15)'; live.style.borderColor='rgba(61,232,168,.45)'; live.style.color='#4E6B50';
      live.innerHTML = '● DIRECTO 60s';
      if (_liveTimer) clearInterval(_liveTimer);
     _liveTimer = setInterval(() => { if (_bootComplete) checkNewRequests(); }, 60000);
      showToast('Modo directo activado · 60s','ok');
    } else {
      live.style.background='rgba(255,255,255,.04)'; live.style.borderColor='rgba(255,255,255,.15)'; live.style.color='rgba(255,255,255,.55)';
      live.innerHTML = '○ DIRECTO';
      if (_liveTimer){ clearInterval(_liveTimer); _liveTimer = null; }
      showToast('Modo directo desligado','ok');
    }
  };

const aguardar = document.createElement('button');
  aguardar.id = 'alm-aguardar-btn'; aguardar.type = 'button';
  aguardar.title = 'Alunos à espera de turma · clique para ver';
  aguardar.style.cssText = 'position:relative;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;border:.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);font-family:var(--mono,monospace);font-size:9px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:all .15s';
  aguardar.innerHTML = 'SEM TURMA'
    + '<span id="alm-aguardar-inc" title="Rever disponibilidade" style="display:none;align-items:center;justify-content:center;height:15px;min-width:15px;padding:0 4px;border-radius:999px;background:rgba(138,138,130,.15);border:.5px solid rgba(138,138,130,.4);color:#8A8A82;font-size:8px;font-weight:700"></span>'
    + '<span id="alm-aguardar-dot" style="display:none;position:absolute;top:-6px;right:-6px;align-items:center;justify-content:center;height:18px;min-width:18px;padding:0 5px;border-radius:999px;background:#B8402A;color:#fff;font-size:9px;font-weight:700"></span>';
  aguardar.onclick = () => _openAguardarList();

  wrap.appendChild(btn); wrap.appendChild(live); wrap.appendChild(aguardar);
  if (anchor === document.body) anchor.appendChild(wrap);
 else anchor.insertAdjacentElement('afterend', wrap);
  updateAguardarBadge();
  updateRefreshBadge();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && _liveTimer){ clearInterval(_liveTimer); _liveTimer = null; }
  else if (!document.hidden && _liveMode && !_liveTimer){
    _liveTimer = setInterval(() => { if (_bootComplete) checkNewRequests(); }, 60000);
  }
});

let _lastRequestCheck = new Date(Date.now()-864e5).toISOString();
async function checkNewRequests(){
  try{
    const newReqs = await sbGet('timetable_requests',
      `select=ref,branch,family,level_code,level_cefr,slots,day_preferences,status&academic_year=eq.${AY}&created_at=gt.${_lastRequestCheck}`
    );
    _lastRequestCheck = new Date().toISOString();
    if(!newReqs.length){ setConn(true); return; }
    setConn(true);
    newReqs.forEach(r=>{ rByRef[r.ref]=r; if(!allR.find(x=>x.ref===r.ref)) allR.push(r); });
    document.getElementById('badge-pending').textContent = 
      allE.filter(e=>{ const r=rByRef[e.ref]; return r&&normS(r.status)==='pendente'; }).length||'0';
    showToast(`${newReqs.length} novo${newReqs.length!==1?'s':''} pedido${newReqs.length!==1?'s':''} recebido${newReqs.length!==1?'s':''}`, 'ok');
  }catch(err){ setConn(false); console.warn('refreshData error',err); }
}

boot().then(() => _injectRefreshControls());

/* ── DEBOUNCE UTILITY + SEARCH WRAPPERS (P-03) ────────────── */

const ovSearchDebounced = debounce(ovSearch, 150);
const sbSearchDebounced = debounce(sbSearchInput, 150);
const auditSearchDebounced = debounce(() => renderAudit(), 150);
