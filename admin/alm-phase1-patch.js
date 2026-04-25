/**
 * ALM · Phase 1 Patch
 * ═══════════════════════════════════════════════════════════
 * 1. Mudar Turma micro-modal — consistent across both pages
 * 2. Wizard fix — ensures overlay opens correctly
 * 3. Sort improvement — Dept → Level → Branch as default
 * ═══════════════════════════════════════════════════════════
 * 
 * HOW TO INSTALL
 * ──────────────
 * In BOTH html files, replace:
 *   <script src="alm-dossier.js"></script>
 * with:
 *   <script src="alm-dossier.js"></script>
 *   <script src="alm-phase1-patch.js"></script>
 *
 * That's it. No other changes needed.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     1. MUDAR TURMA MICRO-MODAL
     ═══════════════════════════════════════════════════════
     One modal, same behaviour, called from anywhere:
       - Formation page: student pill in expanded card
       - Formation page: student row in side panel
       - Attribution page: student row in slot modal
       - Attribution page: dossier card
  ══════════════════════════════════════════════════════ */

  /* ── Inject CSS ── */
  const style = document.createElement('style');
  style.textContent = `
    /* ══ MUDAR TURMA MODAL ══ */
    .mt-overlay {
      display: none; position: fixed; inset: 0; z-index: 1400;
      background: rgba(4,2,12,.88); backdrop-filter: blur(8px);
      align-items: center; justify-content: center; padding: 16px;
    }
    .mt-overlay.open { display: flex; }

    .mt-modal {
      background: #0E0C1A; border: 1px solid rgba(200,164,74,.28);
      width: min(420px, 96vw); display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,.95);
      animation: mtIn .18s cubic-bezier(.34,1.4,.64,1) both;
      overflow: hidden;
    }
    @keyframes mtIn {
      from { opacity:0; transform: scale(.92) translateY(8px) }
      to   { opacity:1; transform: none }
    }

    /* Header */
    .mt-hdr {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-bottom: 1px solid rgba(200,164,74,.12);
      background: rgba(0,0,0,.25); flex-shrink: 0;
    }
    .mt-hdr-icon {
      font-size: 16px; flex-shrink: 0;
    }
    .mt-hdr-info { flex: 1; min-width: 0; }
    .mt-hdr-title {
      font-family: 'IBM Plex Mono', monospace; font-size: 9px;
      font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
      color: rgba(200,164,74,.8);
    }
    .mt-hdr-student {
      font-family: 'IBM Plex Mono', monospace; font-size: 12px;
      font-weight: 600; color: rgba(238,218,168,.92); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mt-hdr-ref {
      font-family: 'IBM Plex Mono', monospace; font-size: 7.5px;
      color: rgba(208,182,128,.35); margin-top: 1px;
    }
    .mt-close {
      width: 22px; height: 22px; border: 1px solid rgba(200,164,74,.15);
      background: transparent; color: rgba(208,182,128,.4);
      font-size: 10px; cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all .12s;
      flex-shrink: 0; font-family: 'IBM Plex Mono', monospace;
    }
    .mt-close:hover {
      background: rgba(240,72,72,.12); border-color: rgba(240,72,72,.35);
      color: #F04848;
    }

    /* From block */
    .mt-from {
      padding: 10px 14px; border-bottom: 1px solid rgba(200,164,74,.08);
      background: rgba(0,0,0,.15); flex-shrink: 0;
    }
    .mt-from-lbl {
      font-family: 'IBM Plex Mono', monospace; font-size: 7px;
      font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
      color: rgba(208,182,128,.3); margin-bottom: 5px;
    }
    .mt-from-val {
      font-family: 'IBM Plex Mono', monospace; font-size: 10px;
      color: rgba(238,218,168,.55); display: flex; align-items: center;
      gap: 8px;
    }
    .mt-from-badge {
      padding: 2px 8px; border: 1px solid rgba(240,72,72,.25);
      background: rgba(240,72,72,.06); color: rgba(240,72,72,.7);
      font-size: 7px; font-weight: 700; font-family: 'IBM Plex Mono', monospace;
    }

    /* Destination list */
    .mt-dest-lbl {
      font-family: 'IBM Plex Mono', monospace; font-size: 7px;
      font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
      color: rgba(208,182,128,.3); padding: 10px 14px 5px;
    }
    .mt-dest-list {
      max-height: 240px; overflow-y: auto; padding: 0 10px 6px;
      scrollbar-width: thin; scrollbar-color: rgba(200,164,74,.15) transparent;
    }
    .mt-dest-list::-webkit-scrollbar { width: 2px; }
    .mt-dest-list::-webkit-scrollbar-thumb { background: rgba(200,164,74,.2); }

    .mt-dest-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border: 1px solid rgba(200,164,74,.08);
      margin-bottom: 3px; cursor: pointer; transition: all .12s;
      background: rgba(255,255,255,.015);
    }
    .mt-dest-row:hover {
      background: rgba(200,164,74,.07); border-color: rgba(200,164,74,.22);
    }
    .mt-dest-row.selected {
      background: rgba(200,164,74,.12); border-color: rgba(200,164,74,.4);
    }
    .mt-dest-row.full {
      opacity: .35; cursor: not-allowed; pointer-events: none;
    }
    .mt-dest-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }
    .mt-dest-info { flex: 1; min-width: 0; }
    .mt-dest-level {
      font-family: 'IBM Plex Mono', monospace; font-size: 10px;
      font-weight: 700; color: rgba(238,218,168,.85);
    }
    .mt-dest-sub {
      font-family: 'IBM Plex Mono', monospace; font-size: 7.5px;
      color: rgba(208,182,128,.4); margin-top: 1px;
    }
    .mt-dest-count {
      font-family: 'IBM Plex Mono', monospace; font-size: 13px;
      font-weight: 700; flex-shrink: 0;
    }
    .mt-dest-count.ok   { color: #28C870; }
    .mt-dest-count.min  { color: #F09830; }
    .mt-dest-count.full { color: #F04848; }

    .mt-empty {
      padding: 20px; text-align: center;
      font-family: 'IBM Plex Mono', monospace; font-size: 8.5px;
      color: rgba(208,182,128,.3);
    }

    /* Search */
    .mt-search {
      padding: 6px 10px; border-bottom: 1px solid rgba(200,164,74,.08);
      flex-shrink: 0;
    }
    .mt-search-i {
      width: 100%; padding: 5px 9px;
      background: rgba(255,255,255,.03); border: 1px solid rgba(200,164,74,.12);
      font-family: 'IBM Plex Mono', monospace; font-size: 9px;
      color: rgba(238,218,168,.9); outline: none; transition: border-color .12s;
    }
    .mt-search-i::placeholder { color: rgba(208,182,128,.3); }
    .mt-search-i:focus { border-color: rgba(200,164,74,.4); }

    /* Footer */
    .mt-foot {
      display: flex; align-items: center; gap: 7px;
      padding: 10px 14px; border-top: 1px solid rgba(200,164,74,.1);
      background: rgba(0,0,0,.2); flex-shrink: 0;
    }
    .mt-cancel {
      padding: 7px 14px; font-family: 'IBM Plex Mono', monospace;
      font-size: 8.5px; font-weight: 600; cursor: pointer;
      border: 1px solid rgba(200,164,74,.15); color: rgba(208,182,128,.45);
      background: transparent; transition: all .12s; letter-spacing: .04em;
    }
    .mt-cancel:hover {
      border-color: rgba(200,164,74,.3); color: rgba(238,218,168,.7);
    }
    .mt-confirm {
      padding: 7px 18px; font-family: 'IBM Plex Mono', monospace;
      font-size: 9px; font-weight: 700; cursor: pointer;
      border: none; background: #28C870; color: #051208;
      transition: all .14s; letter-spacing: .05em; margin-left: auto;
    }
    .mt-confirm:hover { background: #2ed877; }
    .mt-confirm:disabled { opacity: .3; cursor: not-allowed; }

    /* ── Mudar Turma button — injected into student rows ── */
    .mt-trigger {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; font-family: 'IBM Plex Mono', monospace;
      font-size: 7px; font-weight: 700; cursor: pointer;
      border: 1px solid rgba(200,164,74,.22);
      background: rgba(200,164,74,.07); color: rgba(200,164,74,.8);
      transition: all .12s; letter-spacing: .04em; white-space: nowrap;
      flex-shrink: 0;
    }
    .mt-trigger:hover {
      background: rgba(200,164,74,.16); border-color: rgba(200,164,74,.4);
      color: #E8C870;
    }

    /* ══ SORT IMPROVEMENT — add option highlight ══ */
    .ctrl-sort option[value="dept-level"] { font-weight: 700; }
  `;
  document.head.appendChild(style);

  /* ── Build modal DOM ── */
  const overlay = document.createElement('div');
  overlay.className = 'mt-overlay';
  overlay.id = 'mt-overlay';
  overlay.innerHTML = `
    <div class="mt-modal" onclick="event.stopPropagation()">
      <div class="mt-hdr">
        <div class="mt-hdr-icon">🔄</div>
        <div class="mt-hdr-info">
          <div class="mt-hdr-title">Mudar Turma</div>
          <div class="mt-hdr-student" id="mt-student-name">—</div>
          <div class="mt-hdr-ref" id="mt-student-ref">—</div>
        </div>
        <button class="mt-close" onclick="closeMudarTurma()">✕</button>
      </div>

      <div class="mt-from">
        <div class="mt-from-lbl">Turma actual</div>
        <div class="mt-from-val">
          <span id="mt-from-label">—</span>
          <span class="mt-from-badge" id="mt-from-count">— alunos</span>
        </div>
      </div>

      <div class="mt-search">
        <input class="mt-search-i" id="mt-search-i"
          placeholder="Filtrar por nível ou filial…"
          oninput="filterMudarTurmaList()"/>
      </div>

      <div class="mt-dest-lbl">Mover para</div>
      <div class="mt-dest-list" id="mt-dest-list"></div>

      <div class="mt-foot">
        <button class="mt-cancel" onclick="closeMudarTurma()">Cancelar</button>
        <button class="mt-confirm" id="mt-confirm-btn"
          onclick="confirmMudarTurma()" disabled>
          Confirmar mudança →
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', closeMudarTurma);

  /* ── State ── */
  let MT_STATE = {
    ref: null,          // student ref
    name: null,         // student name
    fromGroupKey: null, // current group key
    fromLabel: null,    // current group label
    fromCount: 0,       // current group size
    targetGroupKey: null, // chosen destination
    allGroups: [],      // candidates
    filtered: [],       // after search
  };

  /* ── Open ──
     Call from anywhere:
       openMudarTurma(ref, name, fromGroupKey)
  ── */
  window.openMudarTurma = function (ref, name, fromGroupKey) {
    MT_STATE.ref = ref;
    MT_STATE.name = name || ref;
    MT_STATE.fromGroupKey = fromGroupKey || null;
    MT_STATE.targetGroupKey = null;

    document.getElementById('mt-student-name').textContent = MT_STATE.name;
    document.getElementById('mt-student-ref').textContent = ref;
    document.getElementById('mt-search-i').value = '';
    document.getElementById('mt-confirm-btn').disabled = true;

    /* Resolve from-group info */
    const fromGroup = resolveGroup(fromGroupKey);
    if (fromGroup) {
      const lbl = safeDisplayLevel(fromGroup);
      const cnt = fromGroup.studentCount || fromGroup.students?.length || 0;
      document.getElementById('mt-from-label').textContent =
        `${lbl} · ${(fromGroup.branch || '').replace(/_/g,' ')}`;
      document.getElementById('mt-from-count').textContent = cnt + ' alunos';
      MT_STATE.fromCount = cnt;
      MT_STATE.fromLabel = lbl;
    } else {
      document.getElementById('mt-from-label').textContent = fromGroupKey || '—';
      document.getElementById('mt-from-count').textContent = '—';
    }

    /* Build candidate list — same lang + level, different group */
    MT_STATE.allGroups = buildCandidates(fromGroup);
    MT_STATE.filtered  = [...MT_STATE.allGroups];
    renderMudarTurmaList();

    overlay.classList.add('open');
  };

  window.closeMudarTurma = function () {
    overlay.classList.remove('open');
    MT_STATE.targetGroupKey = null;
  };

  window.filterMudarTurmaList = function () {
    const q = (document.getElementById('mt-search-i')?.value || '').toLowerCase().trim();
    MT_STATE.filtered = q
      ? MT_STATE.allGroups.filter(g =>
          safeDisplayLevel(g).toLowerCase().includes(q) ||
          (g.branch || '').toLowerCase().includes(q) ||
          (g.turmaCode || '').toLowerCase().includes(q)
        )
      : [...MT_STATE.allGroups];
    renderMudarTurmaList();
  };

  function renderMudarTurmaList() {
    const list = document.getElementById('mt-dest-list');
    if (!MT_STATE.filtered.length) {
      list.innerHTML = `<div class="mt-empty">Nenhum grupo compatível encontrado.</div>`;
      return;
    }
    const MAX = window.MAX_SIZE || 17;
    list.innerHTML = MT_STATE.filtered.map(g => {
      const cnt = g.studentCount || g.students?.length || 0;
      const isFull = cnt >= MAX;
      const isSelected = g.key === MT_STATE.targetGroupKey;
      const dotCol = isFull ? '#F04848' : cnt >= MAX * 0.8 ? '#F09830' : '#28C870';
      const cntCls = isFull ? 'full' : cnt >= MAX * 0.8 ? 'min' : 'ok';
      const lbl = safeDisplayLevel(g);
      const slot = g.day ? `${g.day} ${g.h}h` : (g.recommendedDay ? `💡 ${g.recommendedDay} ${g.recommendedH}h` : '—');
      const code = g.turmaCode ? `<span style="color:rgba(200,164,74,.6);font-size:7px">${g.turmaCode}</span>` : '';
      return `<div class="mt-dest-row${isFull ? ' full' : ''}${isSelected ? ' selected' : ''}"
        onclick="selectMudarTurmaTarget('${g.key}', this)">
        <div class="mt-dest-dot" style="background:${dotCol}"></div>
        <div class="mt-dest-info">
          <div class="mt-dest-level">${lbl} ${code}</div>
          <div class="mt-dest-sub">${(g.branch||'').replace(/_/g,' ')} · ${slot}${isFull ? ' · CHEIO' : ''}</div>
        </div>
        <div class="mt-dest-count ${cntCls}">${cnt}</div>
      </div>`;
    }).join('');
  }

  window.selectMudarTurmaTarget = function (key, el) {
    MT_STATE.targetGroupKey = key;
    document.querySelectorAll('.mt-dest-row').forEach(r => r.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('mt-confirm-btn').disabled = false;
  };

  window.confirmMudarTurma = async function () {
    const { ref, name, fromGroupKey, targetGroupKey } = MT_STATE;
    if (!ref || !targetGroupKey) return;

    const btn = document.getElementById('mt-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'A mover…';

    try {
      await executeMudarTurma(ref, name, fromGroupKey, targetGroupKey);
      closeMudarTurma();

      /* Refresh whichever page function is available */
      if (typeof renderGroups === 'function')   renderGroups();
      if (typeof buildGrid    === 'function')   buildGrid();
      if (typeof buildPivot   === 'function')   buildPivot();
      if (typeof updateKPIs   === 'function')   updateKPIs();
      if (typeof updateBar    === 'function')   updateBar();

      const targetGroup = resolveGroup(targetGroupKey);
      const targetLabel = safeDisplayLevel(targetGroup);
      showToast(`${name} → ${targetLabel} ✓`, 'ok');
    } catch (e) {
      console.error('Mudar turma failed', e);
      showToast('Erro ao mover aluno', 'err');
    }

    btn.disabled = false;
    btn.textContent = 'Confirmar mudança →';
  };

  /* ── Core move logic — works on both pages ── */
  async function executeMudarTurma(ref, name, fromGroupKey, targetGroupKey) {
    const SB  = window.SB;
    const KEY = window.KEY;
    const H   = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

    const fromGroup   = resolveGroup(fromGroupKey);
    const targetGroup = resolveGroup(targetGroupKey);
    if (!targetGroup) throw new Error('Target group not found');

    /* ── Remove from source ── */
    if (fromGroup) {
      fromGroup.students     = (fromGroup.students     || []).filter(s => s.ref !== ref);
      fromGroup.studentRefs  = (fromGroup.studentRefs  || []).filter(r => r !== ref);
      fromGroup.studentCount = fromGroup.students.length;

      /* Supabase: remove from class_students if turma exists */
      if (fromGroup.turmaCode && SB) {
        try {
          await fetch(`${SB}/rest/v1/class_students?turma_code=eq.${fromGroup.turmaCode}&student_ref=eq.${ref}`,
            { method: 'DELETE', headers: H });
        } catch (e) { console.warn('SB remove failed', e); }
      }

      /* localStorage turma cache */
      if (fromGroup.turmaCode) {
        const td = localStorage.getItem('alm-turma-' + fromGroup.turmaCode);
        if (td) {
          try {
            const p = JSON.parse(td);
            p.students = p.students.filter(s => s.ref !== ref);
            localStorage.setItem('alm-turma-' + fromGroup.turmaCode, JSON.stringify(p));
          } catch (e) {}
        }
      }
    }

    /* ── Add to target ── */
    const EMAP = window.EMAP || {};
    const enrol = EMAP[ref];
    const stuObj = {
      ref,
      name:       enrol?.name       || name || ref,
      lang:       enrol?.lang       || targetGroup.lang,
      levelCefr:  enrol?.level_cefr || targetGroup.levelCefr,
      course:     targetGroup.course,
      branch:     enrol?.branch     || targetGroup.branch,
      phone:      enrol?.phone      || '',
      email:      enrol?.email      || '',
    };

    if (!targetGroup.students) targetGroup.students = [];
    if (!targetGroup.studentRefs) targetGroup.studentRefs = [];

    if (!targetGroup.students.find(s => s.ref === ref)) {
      targetGroup.students.push(stuObj);
      targetGroup.studentRefs.push(ref);
      targetGroup.studentCount = targetGroup.students.length;
    }

    /* Supabase: add to class_students if turma exists */
    if (targetGroup.turmaCode && SB) {
      try {
        await fetch(`${SB}/rest/v1/class_students`, {
          method: 'POST', headers: H,
          body: JSON.stringify({
            turma_code: targetGroup.turmaCode, student_ref: ref,
            student_name: stuObj.name, absences: 0, grade: null,
            flagged: false, note: ''
          })
        });
      } catch (e) { console.warn('SB add failed', e); }
    }

    /* localStorage turma cache */
    if (targetGroup.turmaCode) {
      const td = localStorage.getItem('alm-turma-' + targetGroup.turmaCode);
      if (td) {
        try {
          const p = JSON.parse(td);
          if (!p.students.find(s => s.ref === ref)) {
            p.students.push({
              id: ref, ref, name: stuObj.name,
              initials: (stuObj.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
              phone: stuObj.phone, email: stuObj.email,
              present: null, absences: 0, grade: 0, flagged: false, note: '', history: []
            });
            localStorage.setItem('alm-turma-' + targetGroup.turmaCode, JSON.stringify(p));
          }
        } catch (e) {}
      }
    }

    /* Re-evaluate viability if function available */
    if (typeof evalViab === 'function') evalViab([fromGroup, targetGroup].filter(Boolean));
  }

  /* ── Helpers ── */
  function resolveGroup(key) {
    if (!key) return null;
    const GROUPS = window.GROUPS || [];
    return GROUPS.find(g => g.key === key) || null;
  }

  function safeDisplayLevel(g) {
    if (!g) return '—';
    if (typeof displayLevel === 'function') {
      return displayLevel(g.levelCefr || g.cefr || '', g.course || 'adults');
    }
    return g.label || g.levelCefr || g.cefr || '—';
  }

  function buildCandidates(fromGroup) {
    const GROUPS  = window.GROUPS  || [];
    const MAX     = window.MAX_SIZE || 17;
    const fromKey = fromGroup?.key;
    const lang    = fromGroup?.lang;
    const cefr    = fromGroup?.levelCefr || fromGroup?.cefr;
    const course  = fromGroup?.course;

    return GROUPS
      .filter(g =>
        g.key !== fromKey &&
        g.lang === lang &&
        (g.levelCefr || g.cefr) === cefr &&
        (g.course === course || !course) &&
        (g.studentCount || g.students?.length || 0) < MAX
      )
      .sort((a, b) => {
        /* Sort: same branch first, then by size ascending (smaller = more room) */
        const aBranch = a.branch === fromGroup?.branch ? 0 : 1;
        const bBranch = b.branch === fromGroup?.branch ? 0 : 1;
        if (aBranch !== bBranch) return aBranch - bBranch;
        return (a.studentCount || a.students?.length || 0) -
               (b.studentCount || b.students?.length || 0);
      });
  }

  /* ═══════════════════════════════════════════════════════
     INJECT "Mudar Turma" button into student rows
     ═══════════════════════════════════════════════════════
     We use a MutationObserver to catch dynamically rendered
     student pills/rows and add the button automatically.
  ══════════════════════════════════════════════════════ */

  function injectMudarTurmaButtons() {
    /* Formation page: student pills in expanded cards */
    document.querySelectorAll('.stu-pill:not([data-mt])').forEach(pill => {
      pill.setAttribute('data-mt', '1');
      const ref     = extractRef(pill);
      const name    = extractName(pill, '.stu-name');
      const groupKey = extractGroupKey(pill);
      if (!ref) return;

      const btn = document.createElement('button');
      btn.className = 'mt-trigger';
      btn.title = 'Mudar turma';
      btn.innerHTML = '⇄ Mudar';
      btn.onclick = e => {
        e.stopPropagation();
        openMudarTurma(ref, name, groupKey);
      };
      pill.appendChild(btn);
    });

    /* Formation page: student rows in side panel */
    document.querySelectorAll('.sp-row:not([data-mt])').forEach(row => {
      row.setAttribute('data-mt', '1');
      const ref     = extractRef(row);
      const name    = extractName(row, '.sp-name');
      const groupKey = null; /* resolved from GROUPS at open time */
      if (!ref) return;

      const btn = document.createElement('button');
      btn.className = 'mt-trigger';
      btn.innerHTML = '⇄ Mudar';
      btn.onclick = e => {
        e.stopPropagation();
        const gKey = findGroupKeyByRef(ref);
        openMudarTurma(ref, name, gKey);
      };
      row.appendChild(btn);
    });

    /* Attribution page: student rows in STM modal */
    document.querySelectorAll('.stm-row:not([data-mt])').forEach(row => {
      row.setAttribute('data-mt', '1');
      const ref  = extractRefFromOnclick(row);
      const name = extractName(row, '.stm-name');
      if (!ref) return;

      const btn = document.createElement('button');
      btn.className = 'mt-trigger';
      btn.innerHTML = '⇄ Mudar';
      btn.onclick = e => {
        e.stopPropagation();
        const gKey = findGroupKeyByRef(ref);
        openMudarTurma(ref, name, gKey);
      };
      /* Insert before the actions div */
      const actions = row.querySelector('.stm-actions');
      if (actions) row.insertBefore(btn, actions);
      else row.appendChild(btn);
    });

    /* Attribution page: student rows in attendance modal */
    document.querySelectorAll('.stu-row:not([data-mt])').forEach(row => {
      row.setAttribute('data-mt', '1');
      const nameEl = row.querySelector('.stu-name-att');
      const refEl  = row.querySelector('.stu-ref-att');
      if (!nameEl || !refEl) return;
      const name = nameEl.textContent.trim();
      const ref  = refEl.textContent.trim();

      const btn = document.createElement('button');
      btn.className = 'mt-trigger';
      btn.style.marginLeft = '4px';
      btn.innerHTML = '⇄';
      btn.title = 'Mudar turma';
      btn.onclick = e => {
        e.stopPropagation();
        const gKey = findGroupKeyByRef(ref);
        openMudarTurma(ref, name, gKey);
      };
      const actions = row.querySelector('.stu-actions-att');
      if (actions) actions.prepend(btn);
    });
  }

  /* Ref extraction helpers */
  function extractRef(el) {
    /* Try data-ref first */
    if (el.dataset.ref) return el.dataset.ref;
    /* Try onclick string */
    return extractRefFromOnclick(el);
  }

  function extractRefFromOnclick(el) {
    const oc = el.getAttribute('onclick') || '';
    const m  = oc.match(/openDossier\(['"]([^'"]+)['"]/);
    if (m) return m[1];
    /* Try child elements */
    const child = el.querySelector('[onclick]');
    if (child) {
      const m2 = (child.getAttribute('onclick') || '').match(/openDossier\(['"]([^'"]+)['"]/);
      if (m2) return m2[1];
    }
    /* Try ref display element */
    const refEl = el.querySelector('.stu-ref, .sp-ref, .stm-ref');
    return refEl?.textContent?.trim() || null;
  }

  function extractName(el, selector) {
    return el.querySelector(selector)?.textContent?.trim() || '';
  }

  function extractGroupKey(el) {
    /* Walk up DOM to find the group card and extract its key */
    let node = el;
    while (node && node !== document.body) {
      const id = node.id || '';
      if (id.startsWith('gc-')) {
        /* id is gc-{escaped key} — reverse the escape */
        return id.replace('gc-', '').replace(/_/g, '|');
      }
      node = node.parentElement;
    }
    return null;
  }

  function findGroupKeyByRef(ref) {
    const GROUPS = window.GROUPS || [];
    const g = GROUPS.find(g =>
      (g.studentRefs || []).includes(ref) ||
      (g.students || []).some(s => s.ref === ref)
    );
    return g?.key || null;
  }

  /* Observe DOM for new student rows */
  const observer = new MutationObserver(() => {
    injectMudarTurmaButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  /* Run once immediately */
  setTimeout(injectMudarTurmaButtons, 500);


  /* ═══════════════════════════════════════════════════════
     2. WIZARD FIX
     ═══════════════════════════════════════════════════════
     The wizard overlay exists in the formation page HTML
     but openWizard / closeWizard / setWzTab may not be
     wired correctly. We re-declare them safely here.
  ══════════════════════════════════════════════════════ */

  window.openWizard = function () {
    const wiz = document.getElementById('wiz-overlay');
    if (!wiz) return;
    wiz.classList.add('open');

    /* Populate sub-title */
    const GROUPS  = window.GROUPS  || [];
    const EMAP    = window.EMAP    || {};
    const RMAP    = window.RMAP    || {};
    const sub = document.getElementById('wiz-sub-txt');
    if (sub) sub.textContent =
      `${GROUPS.length} turmas · ${Object.keys(EMAP).length} alunos · ${Object.keys(RMAP).length} pedidos`;

    /* Build whichever tab is active */
    const active = document.querySelector('.wiz-tab.on');
    const tabId  = active ? active.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] : 'coverage';
    buildWizTab(tabId || 'coverage');
  };

  window.closeWizard = function () {
    const wiz = document.getElementById('wiz-overlay');
    if (wiz) wiz.classList.remove('open');
  };

  window.setWzTab = function (id, el) {
    document.querySelectorAll('.wiz-tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.wiz-sec').forEach(s => s.classList.remove('on'));
    if (el) el.classList.add('on');
    const sec = document.getElementById('wz-' + id);
    if (sec) sec.classList.add('on');
    buildWizTab(id);
  };

  function buildWizTab(id) {
    if (id === 'coverage' && typeof buildWzCoverage === 'function') {
      /* Build branch tabs first */
      const GROUPS   = window.GROUPS   || [];
      const BRANCHES = window.BRANCHES || [...new Set(GROUPS.map(g => g.branch))].sort();
      const wzBrTabs = document.getElementById('wz-br-tabs');
      if (wzBrTabs && !wzBrTabs.children.length) {
        let html = `<div class="wiz-br-tab on" onclick="setWzBranch('ALL',this)">Todas as filiais</div>`;
        BRANCHES.forEach(b => {
          html += `<div class="wiz-br-tab" onclick="setWzBranch('${b}',this)">${b.replace(/_/g,' ')}</div>`;
        });
        wzBrTabs.innerHTML = html;
      }
      /* Build KPI row */
      const wzKpi = document.getElementById('wz-kpi-row');
      if (wzKpi && !wzKpi.children.length) buildWizKpis(wzKpi);
      buildWzCoverage();
    } else if (id === 'heatmap'  && typeof buildWzHeatmap  === 'function') buildWzHeatmap();
    else if (id === 'splits'   && typeof buildWzSplits   === 'function') buildWzSplits();
    else if (id === 'missing'  && typeof buildWzMissing  === 'function') buildWzMissing();
  }

  function buildWizKpis(container) {
    const GROUPS = window.GROUPS || [];
    const EMAP   = window.EMAP   || {};
    const RMAP   = window.RMAP   || {};
    const MAX    = window.MAX_SIZE || 17;
    const MIN    = window.MIN_SIZE || 8;
    const total  = Object.keys(EMAP).length;
    const reqs   = Object.keys(RMAP).length;
    const pct    = total ? Math.round(reqs / total * 100) : 0;
    const kpis   = [
      { lbl: 'Alunos',    val: total,                          col: '#C8A44A', sub: 'matriculados' },
      { lbl: 'Pedidos',   val: reqs,                           col: '#4888E8', sub: `${pct}% cobertura` },
      { lbl: 'Em falta',  val: Math.max(0, total - reqs),      col: '#F04848', sub: 'sem pedido' },
      { lbl: 'Turmas',    val: GROUPS.length,                  col: '#28C8B0', sub: 'após divisão' },
      { lbl: 'Viáveis',   val: GROUPS.filter(g => g.viability === 'viable').length, col: '#28C870', sub: `≥ ${MIN} alunos` },
    ];
    container.innerHTML = kpis.map(k => `
      <div class="wiz-kpi" style="color:${k.col}">
        <div class="wiz-kpi-lbl">${k.lbl}</div>
        <div class="wiz-kpi-val" style="color:${k.col}">${k.val.toLocaleString('pt-PT')}</div>
        <div class="wiz-kpi-sub">${k.sub}</div>
      </div>`).join('');
  }

  /* Ensure Escape closes wizard too */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const wiz = document.getElementById('wiz-overlay');
      if (wiz?.classList.contains('open')) { closeWizard(); e.stopPropagation(); }
    }
  }, true);


  /* ═══════════════════════════════════════════════════════
     3. SORT IMPROVEMENT
     ═══════════════════════════════════════════════════════
     Add "Dept → Nível → Filial" option to the sort dropdown
     and make it the default. Uses the existing `order` field.
  ══════════════════════════════════════════════════════ */

  function patchSortDropdown() {
    const sel = document.getElementById('sort-sel');
    if (!sel) return; /* Attribution page doesn't have this */

    /* Add new option at top if not already there */
    if (!sel.querySelector('option[value="dept-level"]')) {
      const opt = document.createElement('option');
      opt.value = 'dept-level';
      opt.textContent = 'Dept → Nível → Filial';
      sel.insertBefore(opt, sel.firstChild);
    }

    /* Set as default */
    sel.value = 'dept-level';

    /* Patch getFiltered to handle the new sort key */
    const origGetFiltered = window.getFiltered;
    if (typeof origGetFiltered === 'function') {
      window.getFiltered = function () {
        const result = origGetFiltered();
        const sort   = document.getElementById('sort-sel')?.value;
        if (sort === 'dept-level') {
          const DEPT_ORDER_MAP = { juvenil: 0, geral: 1, exam: 2 };
          result.sort((a, b) => {
            const dA = DEPT_ORDER_MAP[a.dept] ?? 9;
            const dB = DEPT_ORDER_MAP[b.dept] ?? 9;
            if (dA !== dB) return dA - dB;
            /* Within dept: by level order */
            const oA = a.order ?? 99;
            const oB = b.order ?? 99;
            if (oA !== oB) return oA - oB;
            /* Within level: by branch */
            return (a.branch || '').localeCompare(b.branch || '');
          });
        }
        return result;
      };
    }

    /* Trigger a re-render with the new default */
    if (typeof renderGroups === 'function') {
      setTimeout(renderGroups, 100);
    }
  }

  /* Run sort patch after page scripts finish */
  setTimeout(patchSortDropdown, 800);

  /* ═══════════════════════════════════════════════════════
     EXPOSE globally for console debugging
  ══════════════════════════════════════════════════════ */
  window.openMudarTurma   = window.openMudarTurma;
  window.closeMudarTurma  = window.closeMudarTurma;
  window.openWizard       = window.openWizard;
  window.closeWizard      = window.closeWizard;

  console.log('%c ALM Phase 1 Patch loaded ✓', 'color:#28C870;font-family:monospace;font-weight:700');

})();
