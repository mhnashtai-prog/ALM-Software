/* ── NEW DOSSIER (drop-in replacement for openDossier) ───── */
async function openDossier(ref) {
  _dsTTLoaded = false; _dsData = {};

  /* ── overlay ── */
  document.getElementById('alm-dossier-ov')?.remove();
  const ov = document.createElement('div');
  ov.id = 'alm-dossier-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.65);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if (e.target === ov) closeDossier(); };
  document.body.appendChild(ov);

  /* ── close on Escape ── */
  const _esc = e => { if (e.key === 'Escape') { closeDossier(); document.removeEventListener('keydown', _esc); } };
  document.addEventListener('keydown', _esc);

  /* ── dept colour map ── */
  const DEPT_HEX = { kids: '#4A8FF5', kids_juv: '#28C8B0', adults: '#C9A84C', exam: '#9B5ECA' };
  const DEPT_BG  = { kids: '#0D2248', kids_juv: '#062A20', adults: '#201408', exam: '#200D20' };
  const DEPT_LBL = { kids: 'Infantil', kids_juv: 'Juvenil', adults: 'Geral', exam: 'Exames' };

  /* ── avatar colour ── */
  function avColor(name) {
    let h = 0; for (let i = 0; i < (name || '?').length; i++) h = (h * 31 + (name || '?').charCodeAt(i)) & 0xffffffff;
    const p = [['#2A1A44','#C080F0'],['#1A2A44','#7AABEE'],['#0D3020','#3DE8A8'],['#2A1A10','#D4944A'],
               ['#2A1010','#E07878'],['#10203A','#5A9EC8'],['#181828','#9898D8'],['#18281A','#80B850']];
    const [bg, t] = p[Math.abs(h) % p.length];
    return { bg, t };
  }
  function avInit(n) { return (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

  /* ── turma lookup from engine state ── */
  function findTurma(ref) {
    for (const [key, result] of Object.entries(_allResults)) {
      for (let i = 0; i < (result.groups || []).length; i++) {
        const g = result.groups[i];
        if (g.students.find(s => s.ref === ref)) {
          const c = (_groupCodes[key] || {})[i];
          const code = c ? (c.turmaCodeA && c.turmaCodeB && c.turmaCodeA !== c.turmaCodeB
            ? `${c.turmaCodeA}/${c.turmaCodeB}` : c.turmaCodeA || c.turmaCode || `T${i+1}`) : `T${i+1}`;
          const pair = g.pairDef ? (g.dayIdx_A === g.dayIdx_B ? g.dayL_A : `${g.dayL_A} + ${g.dayL_B}`) : (g.dayL || '—');
          return { code, pair, startTime: g.startTime, endTime: g.endTime, certified: !!c, meta: LEVEL_MAP[key] || {} };
        }
      }
    }
    return null;
  }

  /* ── availability ruler ── */
  function renderAvailGrid(req) {
    const slots = parseSlotsForRuler(req);
    const TOTAL = (20 - 8) * 60;
    function pct(m) { return ((Math.max(m, 480) - 480) / TOTAL * 100).toFixed(2); }
    function wPct(f, t) { return ((Math.min(t, 1200) - Math.max(f, 480)) / TOTAL * 100).toFixed(2); }
    const byDay = {};
    slots.forEach(s => { if (!byDay[s.dayIdx]) byDay[s.dayIdx] = []; byDay[s.dayIdx].push(s); });
    const DAYS = ['SEG','TER','QUA','QUI','SEX','SÁB'];
    const COLS = [8,10,12,14,16,18,20];
    const hourHdr = `<div style="display:flex;margin-left:34px;margin-bottom:3px">${COLS.map(h=>`<div style="flex:1;font-size:10px;color:rgba(255,255,255,.3);font-family:var(--mono)">${h}h</div>`).join('')}</div>`;
    const rows = DAYS.map((d, di) => {
      const ws = byDay[di] || [];
      const hasData = ws.length > 0;
      const col = hasData ? '#C9A84C' : 'rgba(255,255,255,.18)';
      const bands = ws.map(s => {
        const f = Math.max(s.fromMins, 480), t2 = Math.min(s.toMins, 1200);
        if (f >= t2) return '';
        return `<div style="position:absolute;left:${pct(f)}%;width:${wPct(f,t2)}%;top:3px;bottom:3px;background:#C9A84C;border-radius:3px;display:flex;align-items:center;padding:0 5px;overflow:hidden"><span style="font-size:10px;color:#07060E;white-space:nowrap;font-weight:600;font-family:var(--mono)">${s.startLabel}–${s.endLabel}</span></div>`;
      }).join('');
      const gridLines = COLS.map(h => `<div style="position:absolute;left:${((h-8)/12*100).toFixed(2)}%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.06)"></div>`).join('');
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <div style="width:28px;text-align:right;font-size:11px;font-weight:500;color:${col};font-family:var(--mono);flex-shrink:0">${d}</div>
        <div style="flex:1;position:relative;height:22px;background:rgba(255,255,255,.04);border-radius:4px;overflow:hidden">${gridLines}${bands}</div>
      </div>`;
    }).join('');
    return hourHdr + rows;
  }

  /* ── shell ── */
  ov.innerHTML = `
  <div id="alm-ds-card" style="width:min(620px,96vw);max-height:88dvh;background:#0E0C1C;border-radius:18px;border:.5px solid rgba(255,255,255,.1);display:flex;flex-direction:column;overflow:hidden;animation:shUp .28s cubic-bezier(.32,.72,0,1);position:relative">

    <!-- CLOSE -->
    <button id="ds-close-btn" style="position:absolute;top:14px;right:14px;z-index:10;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.4);border:.5px solid rgba(255,255,255,.15);cursor:pointer;color:rgba(255,255,255,.7);font-size:13px;display:flex;align-items:center;justify-content:center">✕</button>

    <!-- HERO -->
    <div id="ds-hero" style="padding:20px 20px 0;flex-shrink:0">
      <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">
        <div id="ds-av" style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;border:2px solid rgba(255,255,255,.15);font-family:var(--mono)">?</div>
        <div style="flex:1;min-width:0;padding-top:4px">
          <div id="ds-name" style="font-size:18px;font-weight:600;color:#fff;line-height:1.2;margin-bottom:4px">A carregar…</div>
          <div id="ds-ref-line" style="font-size:11px;color:rgba(255,255,255,.4);font-family:var(--mono);letter-spacing:.04em">—</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;margin-top:4px">
          <button id="ds-wa-btn" style="width:32px;height:32px;border-radius:8px;border:.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);cursor:pointer;color:rgba(255,255,255,.7);font-size:15px;transition:background .15s" title="WhatsApp">📲</button>
          <button id="ds-em-btn" style="width:32px;height:32px;border-radius:8px;border:.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);cursor:pointer;color:rgba(255,255,255,.7);font-size:15px;transition:background .15s" title="Email">✉️</button>
          <button id="ds-hor-btn" style="width:32px;height:32px;border-radius:8px;border:.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);cursor:pointer;color:rgba(255,255,255,.7);font-size:15px;transition:background .15s" title="Enviar horário">📅</button>
        </div>
      </div>
      <div id="ds-pills" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px"></div>
      <div id="ds-stat-strip" style="display:flex;border-top:.5px solid rgba(255,255,255,.07)">
        <div class="dss"><div class="dssv" id="ds-s-yrs">—</div><div class="dssl">Anos ALM</div></div>
        <div class="dss"><div class="dssv" id="ds-s-abs">—</div><div class="dssl">Faltas</div></div>
        <div class="dss"><div class="dssv" id="ds-s-grade">—</div><div class="dssl">Nota final</div></div>
        <div class="dss"><div class="dssv" id="ds-s-turma" style="font-size:13px;font-family:var(--mono);color:#C9A84C">—</div><div class="dssl">Turma</div></div>
      </div>
    </div>

    <!-- TABS -->
    <div style="display:flex;background:rgba(255,255,255,.03);border-bottom:.5px solid rgba(255,255,255,.08);padding:0 16px;flex-shrink:0">
      <div class="dstab active" id="dstab-identity" onclick="dsTab('identity',this)">📋 Identidade</div>
      <div class="dstab" id="dstab-timetable" onclick="dsTab('timetable',this)">🗓 Horário</div>
      <div class="dstab" id="dstab-history" onclick="dsTab('history',this)">🎓 Historial</div>
      <div class="dstab" id="dstab-notes" onclick="dsTab('notes',this)">🚩 Notas</div>
    </div>

    <!-- BODY -->
    <div id="ds-body" style="flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent">
      <div style="padding:60px;text-align:center;color:rgba(255,255,255,.3);font-size:12px">A carregar…</div>
    </div>

    <!-- ACTION BAR -->
    <div id="ds-action-bar" style="display:flex;gap:6px;padding:10px 16px;border-top:.5px solid rgba(255,255,255,.08);background:rgba(0,0,0,.2);flex-wrap:wrap;flex-shrink:0">
      <button id="ds-btn-wa" class="dsabtn primary">📲 WhatsApp</button>
      <button id="ds-btn-ee" class="dsabtn">👨‍👩‍👧 Contactar EE</button>
      <button id="ds-btn-send" class="dsabtn">📅 Enviar horário</button>
      <button id="ds-btn-move" class="dsabtn">⇄ Mudar turma</button>
      <button class="dsabtn" style="margin-left:auto" onclick="window.print()">🖨️ Imprimir</button>
    </div>
  </div>

  <style>
    .dss{flex:1;padding:10px 0;text-align:center;border-right:.5px solid rgba(255,255,255,.07)}
    .dss:last-child{border-right:none}
    .dssv{font-size:20px;font-weight:700;color:#fff;line-height:1;font-family:var(--mono)}
    .dssl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.06em;text-transform:uppercase}
    .dstab{padding:10px 14px;font-size:12px;font-weight:600;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2px solid transparent;transition:all .13s;font-family:var(--mono);letter-spacing:.04em;white-space:nowrap}
    .dstab:hover{color:rgba(255,255,255,.7)}
    .dstab.active{color:#C9A84C;border-bottom-color:#C9A84C}
    .dspane{display:none;padding:16px 20px 20px}
    .dspane.active{display:block}
    .ds-sec{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);display:flex;align-items:center;gap:8px;margin:14px 0 8px}
    .ds-sec::after{content:'';flex:1;height:.5px;background:rgba(255,255,255,.08)}
    .ds-g2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .ds-fld{background:rgba(255,255,255,.04);border-radius:8px;padding:9px 12px;border:.5px solid rgba(255,255,255,.06)}
    .ds-fk{font-size:10px;color:rgba(255,255,255,.35);margin-bottom:3px;letter-spacing:.06em}
    .ds-fv{font-size:13px;color:rgba(255,255,255,.85);font-weight:600}
    .ds-fv.mono{font-family:var(--mono);font-size:12px}
    .ds-fv.teal{color:#28C8B0}
    .ds-fv.amber{color:#C9A84C}
    .ds-fv.red{color:#E8455A}
    .ds-crow{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:.5px solid rgba(255,255,255,.06)}
    .ds-crow:last-child{border-bottom:none}
    .ds-cico{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
    .ds-hrow{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:.5px solid rgba(255,255,255,.06)}
    .ds-hrow:last-child{border-bottom:none}
    .ds-hbadge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;border:.5px solid;flex-shrink:0}
    .hb-pass{background:rgba(29,184,122,.12);border-color:rgba(29,184,122,.35);color:#3DE8A8}
    .hb-fail{background:rgba(232,69,90,.12);border-color:rgba(232,69,90,.35);color:#E8455A}
    .hb-prog{background:rgba(74,143,245,.12);border-color:rgba(74,143,245,.35);color:#7AABEE}
    .ds-flag{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;border:.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.5);cursor:pointer;font-size:12px;transition:all .13s}
    .ds-flag:hover{border-color:rgba(255,255,255,.2)}
    .ds-flag.on{background:rgba(232,69,90,.12);border-color:rgba(232,69,90,.4);color:#E8455A}
    .dsabtn{padding:7px 14px;border-radius:8px;border:.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);cursor:pointer;font-size:12px;font-weight:600;font-family:var(--mono);transition:all .13s;letter-spacing:.04em}
    .dsabtn:hover{background:rgba(255,255,255,.1);color:#fff}
    .dsabtn.primary{background:rgba(29,184,122,.2);border-color:rgba(29,184,122,.5);color:#3DE8A8}
    .dsabtn.primary:hover{background:rgba(29,184,122,.3)}
    .ds-note{width:100%;background:rgba(255,255,255,.04);border:.5px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;font-size:13px;color:rgba(255,255,255,.85);resize:vertical;min-height:80px;outline:none;font-family:var(--sans,system-ui);line-height:1.6;margin-top:6px;transition:border-color .13s}
    .ds-note:focus{border-color:rgba(201,168,76,.4)}
    .ds-note::placeholder{color:rgba(255,255,255,.2)}
  </style>`;

  document.getElementById('ds-close-btn').onclick = closeDossier;

  /* ── tab switcher ── */
  window.dsTab = (id, btn) => {
    ov.querySelectorAll('.dspane').forEach(p => p.classList.remove('active'));
    ov.querySelectorAll('.dstab').forEach(b => b.classList.remove('active'));
    ov.querySelector('#dspane-' + id)?.classList.add('active');
    btn.classList.add('active');
  };

  /* ── fetch data ── */
  let enrol = null, req = null, hst = [];
  try {
    const [enrols, reqs, hist] = await Promise.all([
      sbGet('enrolments', `ref=eq.${encodeURIComponent(ref)}&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_code,level_cefr,academic_year,returning_student,guardian_name,guardian_phone,guardian_email,notes,school,school_year&limit=1`),
      sbGet('timetable_requests', `ref=eq.${encodeURIComponent(ref)}&academic_year=eq.${encodeURIComponent(AY)}&select=ref,status,sessions_per_week,slots,day_preferences,assigned_turma,notes&limit=1`),
      sbGet('turma_students', `ref=eq.${encodeURIComponent(ref)}&select=ref,turma_code,academic_year,level_cefr,level_code,family,outcome,absences,grade_final&order=academic_year.desc`),
    ]);
    enrol = enrols[0] || null;
    req   = reqs[0]   || rByRef[ref] || null;
    hst   = hist || [];
    _dsData = { enrol, req, hst };
  } catch(err) {
    document.getElementById('ds-body').innerHTML = `<div style="padding:40px;text-align:center;color:#E8455A;font-size:12px">Erro: ${err.message}</div>`;
    return;
  }

  /* ── populate hero ── */
  const dept     = (enrol?.family || 'adults').toLowerCase();
  const accentHex = DEPT_HEX[dept] || '#C9A84C';
  const rawCode  = (enrol?.level_code || enrol?.level_cefr || '').trim();
  const lvlDisp  = ALM_DISP[rawCode] || rawCode || '—';
  const branch   = BRANCH_LABELS[normB(enrol?.branch)] || (enrol?.branch || '—').replace(/_/g,' ');

  /* hero background accent stripe */
  document.getElementById('ds-hero').style.borderTop = `3px solid ${accentHex}`;

  /* avatar */
  const avEl = ov.querySelector('#ds-av');
  const ac = avColor(enrol?.name || ref);
  avEl.style.background = ac.bg; avEl.style.color = ac.t;
  avEl.style.borderColor = ac.t + '55';
  avEl.textContent = avInit(enrol?.name || ref);

  ov.querySelector('#ds-name').textContent = enrol?.name || ref;
  ov.querySelector('#ds-ref-line').textContent = `${ref}  ·  ${AY}  ·  ${DEPT_LBL[dept] || 'Geral'}`;

  /* pills */
  const turmaInfo = findTurma(ref);
  const st = req ? normS(req.status) : 'sem_pedido';
  const stCls = st === 'atribuido' ? 'color:#3DE8A8;border-color:rgba(29,184,122,.4);background:rgba(29,184,122,.1)' : st === 'sem_pedido' ? 'color:#E8455A;border-color:rgba(232,69,90,.4);background:rgba(232,69,90,.1)' : 'color:#E8C060;border-color:rgba(232,160,32,.4);background:rgba(232,160,32,.1)';
  const stTxt = st === 'atribuido' ? (turmaInfo ? `Atribuído · ${turmaInfo.code}` : 'Atribuído') : st === 'sem_pedido' ? 'Sem pedido' : 'Pendente';
  const pillStyle = 'font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;border:.5px solid;font-family:var(--mono);letter-spacing:.04em';
  ov.querySelector('#ds-pills').innerHTML = [
    `<span style="${pillStyle};background:${accentHex}18;border-color:${accentHex}44;color:${accentHex}">${DEPT_LBL[dept] || 'Geral'} · ${lvlDisp}</span>`,
    `<span style="${pillStyle};background:rgba(74,143,245,.1);border-color:rgba(74,143,245,.3);color:#7AABEE">${branch}</span>`,
    enrol?.lang ? `<span style="${pillStyle};background:rgba(155,94,202,.1);border-color:rgba(155,94,202,.3);color:#C080F0">${enrol.lang}</span>` : '',
    `<span style="${pillStyle};${stCls}">${stTxt}</span>`,
  ].filter(Boolean).join('');

  /* stat strip */
  ov.querySelector('#ds-s-yrs').textContent   = hst.length || '—';
  ov.querySelector('#ds-s-abs').textContent   = hst[0]?.absences ?? '—';
  ov.querySelector('#ds-s-grade').textContent = hst[0]?.grade_final != null ? hst[0].grade_final + '%' : '—';
  ov.querySelector('#ds-s-turma').textContent = turmaInfo ? turmaInfo.code : '—';

  /* ── build tab panes ── */
  const fld = (k, v, cls = '') => v ? `<div class="ds-fld"><div class="ds-fk">${k}</div><div class="ds-fv ${cls}">${v}</div></div>` : '';
  const dob = enrol?.date_of_birth ? new Date(enrol.date_of_birth).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  /* IDENTITY */
  const identityHTML = `
    <div class="ds-sec">Dados pessoais</div>
    <div class="ds-g2">
      ${fld('Nome completo', enrol?.name)}
      ${dob ? fld('Data de nascimento', dob + (enrol?.age ? ' · ' + enrol.age + ' anos' : '')) : ''}
      ${fld('Escola', enrol?.school)}
      ${fld('Ano escolar', enrol?.school_year)}
    </div>
    <div class="ds-sec">Encarregado de educação</div>
    ${enrol?.guardian_name ? `<div class="ds-crow"><div class="ds-cico">👤</div><div><div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:1px">Nome</div><div style="font-size:13px;color:rgba(255,255,255,.85)">${enrol.guardian_name}</div></div></div>` : ''}
    ${enrol?.guardian_phone ? `<div class="ds-crow"><div class="ds-cico">📞</div><div><div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:1px">Telefone EE</div><div style="font-size:13px;color:#7AABEE"><a href="tel:${enrol.guardian_phone}" style="color:inherit;text-decoration:none">${enrol.guardian_phone}</a></div></div></div>` : ''}
    ${enrol?.guardian_email ? `<div class="ds-crow"><div class="ds-cico">✉️</div><div><div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:1px">Email EE</div><div style="font-size:13px;color:#7AABEE"><a href="mailto:${enrol.guardian_email}" style="color:inherit;text-decoration:none">${enrol.guardian_email}</a></div></div></div>` : ''}
    ${enrol?.phone ? `<div class="ds-crow"><div class="ds-cico">📱</div><div><div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:1px">Telefone aluno</div><div style="font-size:13px;color:#7AABEE"><a href="tel:${enrol.phone}" style="color:inherit;text-decoration:none">${enrol.phone}</a></div></div></div>` : ''}
    <div class="ds-sec">Turma atribuída</div>
    ${turmaInfo ? `
    <div style="background:rgba(201,168,76,.06);border-radius:10px;border:.5px solid rgba(201,168,76,.3);padding:12px 14px;display:flex;align-items:center;gap:12px">
      <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#C9A84C;flex-shrink:0;min-width:80px">${turmaInfo.code}</div>
      <div style="flex:1">
        <div style="font-size:13px;color:rgba(255,255,255,.85);font-weight:600">${turmaInfo.pair} · ${turmaInfo.startTime}–${turmaInfo.endTime}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">${turmaInfo.meta.label || ''}</div>
      </div>
      ${turmaInfo.certified ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;border:.5px solid rgba(29,184,122,.4);color:#3DE8A8;background:rgba(29,184,122,.1)">✓ Cert.</span>` : ''}
    </div>` : `<div style="font-size:12px;color:rgba(255,255,255,.3);padding:8px 0">Sem turma atribuída</div>`}
  `;

  /* TIMETABLE */
  const ttHTML = `
    <div class="ds-sec">Disponibilidade pedida</div>
    ${req ? renderAvailGrid(req) : `<div style="font-size:12px;color:rgba(255,255,255,.3);padding:8px 0">Sem pedido registado</div>`}
    ${turmaInfo ? `
    <div class="ds-sec" style="margin-top:14px">Sessões atribuídas</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:rgba(201,168,76,.08);border:.5px solid rgba(201,168,76,.3);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:#C9A84C;font-weight:700;margin-bottom:3px;font-family:var(--mono)">${turmaInfo.code.split('/')[0] || turmaInfo.code}A</div>
        <div style="font-size:13px;color:rgba(255,255,255,.85);font-weight:600">${turmaInfo.pair.split('+')[0]?.trim() || turmaInfo.pair}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:1px">${turmaInfo.startTime}–${turmaInfo.endTime}</div>
      </div>
      ${turmaInfo.pair.includes('+') ? `
      <div style="flex:1;min-width:120px;background:rgba(201,168,76,.05);border:.5px solid rgba(201,168,76,.2);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:#C9A84C;font-weight:700;margin-bottom:3px;font-family:var(--mono)">${turmaInfo.code.split('/')[1] || turmaInfo.code}B</div>
        <div style="font-size:13px;color:rgba(255,255,255,.85);font-weight:600">${turmaInfo.pair.split('+')[1]?.trim() || turmaInfo.pair}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:1px">${turmaInfo.startTime}–${turmaInfo.endTime}</div>
      </div>` : ''}
    </div>` : ''}
    ${req?.sessions_per_week ? `<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.35)">${req.sessions_per_week} sessão/sem pedida · estado: <span style="color:${st==='atribuido'?'#3DE8A8':st==='sem_pedido'?'#E8455A':'#E8C060'}">${st}</span></div>` : ''}
  `;

  /* HISTORY */
  const histHTML = !hst.length
    ? `<div style="padding:28px 0;text-align:center;font-size:12px;color:rgba(255,255,255,.3)">Sem historial registado.</div>`
    : `<div class="ds-sec">Historial por ano lectivo</div>` + hst.map(yr => {
        const l = ALM_DISP[(yr.level_cefr || '').trim()] || yr.level_cefr || '—';
        const cls = yr.outcome === 'aprovado' ? 'hb-pass' : yr.outcome === 'reprovado' ? 'hb-fail' : 'hb-prog';
        const lbl = yr.outcome === 'aprovado' ? 'Aprovado' : yr.outcome === 'reprovado' ? 'Reprovado' : yr.outcome || 'Em curso';
        const att = yr.absences != null ? Math.max(0, Math.round(100 - yr.absences * 5)) : null;
        return `<div class="ds-hrow">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.5);font-family:var(--mono);width:58px;flex-shrink:0">${yr.academic_year || '—'}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.3);font-family:var(--mono);width:76px;flex-shrink:0">${yr.turma_code || '—'}</div>
          <div style="flex:1;font-size:13px;color:rgba(255,255,255,.75)">${l}</div>
          ${att != null ? `<div style="width:50px;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;flex-shrink:0;margin-right:8px"><div style="height:100%;width:${att}%;background:${att>75?'#3DE8A8':att>50?'#E8C060':'#E8455A'};border-radius:2px"></div></div>` : ''}
          <span class="ds-hbadge ${cls}">${lbl}</span>
        </div>`;
      }).join('') +
      `<div class="ds-sec" style="margin-top:14px">Desempenho</div>
      <div class="ds-g2">
        ${fld('Faltas (último ano)', hst[0]?.absences ?? '—', 'mono')}
        ${fld('Nota final', hst[0]?.grade_final != null ? hst[0].grade_final + '%' : '—', hst[0]?.grade_final > 75 ? 'teal' : 'amber')}
        ${fld('Tipo de aluno', enrol?.returning_student ? 'Recorrente' : 'Novo', '')}
        ${fld('Anos em ALM', hst.length, '')}
      </div>`;

  /* NOTES */
  const flagDefs = [
    { key: 'comportamento', icon: '⚠️', label: 'Comportamento' },
    { key: 'pagamento',     icon: '💳', label: 'Pagamento' },
    { key: 'desempenho',    icon: '📉', label: 'Desempenho' },
    { key: 'faltas',        icon: '📅', label: 'Excesso faltas' },
    { key: 'especial',      icon: '♿', label: 'Nec. especial' },
  ];
  const notesHTML = `
    <div class="ds-sec">Alertas activos</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${flagDefs.map(f => `<div class="ds-flag" onclick="this.classList.toggle('on')">${f.icon} ${f.label}</div>`).join('')}
    </div>
    <div class="ds-sec" style="margin-top:14px">Nota interna</div>
    <textarea class="ds-note" id="ds-note-ta" placeholder="Nota visível para toda a equipa ALM…">${enrol?.notes || ''}</textarea>
    <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:8px">
      <span id="ds-note-saved" style="font-size:11px;color:#3DE8A8;opacity:0;transition:opacity .3s;font-family:var(--mono)">✓ guardado</span>
      <button class="dsabtn" style="background:rgba(29,184,122,.15);border-color:rgba(29,184,122,.4);color:#3DE8A8" onclick="dsSaveNote('${ref}')">Guardar nota</button>
    </div>`;

  /* inject panes */
  document.getElementById('ds-body').innerHTML = `
    <div class="dspane active" id="dspane-identity">${identityHTML}</div>
    <div class="dspane" id="dspane-timetable">${ttHTML}</div>
    <div class="dspane" id="dspane-history">${histHTML}</div>
    <div class="dspane" id="dspane-notes">${notesHTML}</div>
  `;

  /* action buttons */
  const phone = (enrol?.phone || '').replace(/\D/g, '');
  ov.querySelector('#ds-btn-wa').onclick = () => phone ? window.open(`https://wa.me/${phone}`) : showToast('Sem número', 'warn');
  ov.querySelector('#ds-btn-ee').onclick = () => enrol?.guardian_phone ? window.open(`tel:${enrol.guardian_phone}`) : showToast('Sem telefone do EE', 'warn');
  ov.querySelector('#ds-btn-send').onclick = () => showToast('Horário enviado ✓', 'ok');
  ov.querySelector('#ds-btn-move').onclick = () => { closeDossier(); setTimeout(() => openMudarTurma(ref), 240); };
  ov.querySelector('#ds-wa-btn').onclick = ov.querySelector('#ds-btn-wa').onclick;
  ov.querySelector('#ds-em-btn').onclick = () => enrol?.email ? window.open(`mailto:${enrol.email}`) : showToast('Sem email', 'warn');
  ov.querySelector('#ds-hor-btn').onclick = ov.querySelector('#ds-btn-send').onclick;

  /* save note */
  window.dsSaveNote = async (r) => {
    const txt = document.getElementById('ds-note-ta')?.value;
    if (txt == null) return;
    const ok = await fetch(`${SB}/rest/v1/enrolments?ref=eq.${encodeURIComponent(r)}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: txt }) }).then(x => x.ok).catch(() => false);
    const el = document.getElementById('ds-note-saved');
    if (el) { el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 2200); }
    showToast(ok ? 'Nota guardada ✓' : 'Erro ao guardar', ok ? 'ok' : 'err');
  };
}

function closeDossier() {
  const ov = document.getElementById('alm-dossier-ov');
  if (!ov) return;
  ov.style.opacity = '0';
  ov.style.transition = 'opacity .2s';
  setTimeout(() => ov.remove(), 200);
  document.getElementById('ds-overlay')?.classList.remove('open');
}
