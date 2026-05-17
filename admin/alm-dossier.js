/* ═══════════════════════════════════════════════════════════════
   ALM DOSSIER · Standalone Component · v2.0
   Self-contained · Fetches live from Supabase · No page deps
   Usage: openDossier('ALM-0002')
   Requires: <script src="/admin/alm-dossier.js"></script>
             + injectDossierHTML() called on page load
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ── */
  const SB  = 'https://oapygbeliocdvitbdjbq.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcHlnYmVsaW9jZHZpdGJkamJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjQzNjAsImV4cCI6MjA5MjA0MDM2MH0.-9Uj9Bg3q8sIlqzfzw2Sc1JziaueeyYGNwep-qWhWWg';
  const AY  = '2026/2027';
  const H   = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

  /* ── CSS ── */
  const CSS = `
:root {
  --ds-bg:#18181A; --ds-bg2:#232325; --ds-bg3:#2E2E30;
  --ds-sep:rgba(255,255,255,.08); --ds-sep2:rgba(255,255,255,.04);
  --ds-label:rgba(255,255,255,.35); --ds-text:#F2F2F7; --ds-sub:#8E8E93;
  --ds-tint:#3A8EFF; --ds-red:#FF4E4E; --ds-green:#30C060; --ds-amber:#F5A020;
  --ds-f:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;
  --ds-mono:'IBM Plex Mono','SF Mono','Menlo',monospace;
}
.ds-overlay{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);align-items:center;justify-content:center;padding:20px}
.ds-overlay.open{display:flex;animation:dsOverIn .2s ease}
@keyframes dsOverIn{from{opacity:0}to{opacity:1}}
.ds-sheet{width:min(520px,96vw);max-height:88dvh;background:var(--ds-bg);border-radius:18px;border:.5px solid rgba(255,255,255,.10);display:flex;flex-direction:column;overflow:hidden;animation:dsShUp .28s cubic-bezier(.32,.72,0,1)}
.ds-sheet.ds-exit{animation:dsShDn .22s cubic-bezier(.32,.72,0,1) forwards}
@keyframes dsShUp{from{transform:scale(.94);opacity:0}to{transform:none;opacity:1}}
@keyframes dsShDn{to{transform:scale(.94);opacity:0}}
.ds-banner{position:relative;flex-shrink:0;padding:20px 16px 14px;display:flex;align-items:flex-start;gap:13px;min-height:80px;overflow:hidden}
.ds-banner-bg{position:absolute;inset:0;transition:background .3s}
.ds-banner-scrim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.18) 0%,rgba(0,0,0,.55) 100%)}
.ds-close{position:absolute;top:13px;right:14px;z-index:10;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.32);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.80);font-size:12px;font-family:var(--ds-f);transition:background .12s}
.ds-close:hover{background:rgba(0,0,0,.55)}
.ds-dept-tag{position:absolute;top:13px;left:16px;z-index:10;font-family:var(--ds-mono);font-size:8px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.48)}
.ds-avatar{position:relative;z-index:5;margin-top:16px;width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;font-family:var(--ds-f);border:1.5px solid rgba(255,255,255,.30)}
.ds-hinfo{position:relative;z-index:5;flex:1;min-width:0;margin-top:16px}
.ds-name{font-family:var(--ds-f);font-size:15px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}
.ds-ref{font-family:var(--ds-mono);font-size:10px;color:rgba(255,255,255,.50);margin-top:2px;letter-spacing:.03em}
.ds-strip{display:flex;align-items:center;gap:0;flex-shrink:0;padding:7px 16px;border-bottom:.5px solid var(--ds-sep);overflow-x:auto;scrollbar-width:none;background:var(--ds-bg2)}
.ds-strip::-webkit-scrollbar{display:none}
.ds-ci{font-family:var(--ds-f);font-size:11px;color:var(--ds-sub);white-space:nowrap;flex-shrink:0;text-decoration:none}
.ds-ci-link{color:var(--ds-tint)}
.ds-ci-link:hover{opacity:.78}
.ds-ci-sep{font-size:9px;color:var(--ds-sep);padding:0 8px;flex-shrink:0;opacity:.6}
.ds-body{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--ds-bg3) transparent}
.ds-body::-webkit-scrollbar{width:3px}
.ds-body::-webkit-scrollbar-thumb{background:var(--ds-bg3);border-radius:99px}
.ds-section{border-bottom:.5px solid var(--ds-sep)}
.ds-section-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 16px 10px;cursor:pointer;transition:background .10s}
.ds-section-hdr:hover{background:var(--ds-bg2)}
.ds-section-title{display:flex;align-items:center;gap:8px;font-family:var(--ds-f);font-size:12px;font-weight:500;color:var(--ds-text);letter-spacing:.01em}
.ds-section-icon{font-size:13px;opacity:.80}
.ds-section-r{display:flex;align-items:center;gap:4px}
.ds-section-meta{font-family:var(--ds-mono);font-size:10px;color:var(--ds-sub);letter-spacing:.02em}
.ds-section-chv{font-size:11px;color:var(--ds-label);transition:transform .18s;margin-left:2px}
.ds-section-hdr.open .ds-section-chv{transform:rotate(90deg)}
.ds-section-body{display:none;padding:4px 16px 14px}
.ds-section-hdr.open + .ds-section-body{display:block}
.ds-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:.5px solid var(--ds-sep2)}
.ds-row:last-child{border-bottom:none}
.ds-rk{font-family:var(--ds-mono);font-size:10px;color:var(--ds-label);flex-shrink:0;min-width:100px;letter-spacing:.04em;text-transform:uppercase}
.ds-rv{font-family:var(--ds-f);font-size:12px;color:var(--ds-text);text-align:right;flex:1}
.ds-rv.tint{color:var(--ds-tint)}.ds-rv.green{color:var(--ds-green)}.ds-rv.amber{color:var(--ds-amber)}.ds-rv.red{color:var(--ds-red)}
.ds-sub-hdr{font-family:var(--ds-mono);font-size:8.5px;letter-spacing:.10em;text-transform:uppercase;color:var(--ds-label);padding:10px 0 5px}
/* ── AVAILABILITY BANDS ── */
.ds-avail-label{font-family:var(--ds-mono);font-size:8.5px;letter-spacing:.10em;text-transform:uppercase;color:var(--ds-label);padding:10px 0 6px}
.ds-avail-leg{display:flex;gap:12px;margin-top:6px}
.ds-leg-item{display:flex;align-items:center;gap:5px;font-family:var(--ds-f);font-size:10px;color:var(--ds-sub)}
.ds-leg-dot{width:7px;height:7px;border-radius:2px}
/* ── HISTORY ── */
.ds-yr{border-radius:8px;background:var(--ds-bg2);margin-bottom:6px;overflow:hidden}
.ds-yr-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;cursor:pointer}
.ds-yr-left{display:flex;align-items:center;gap:9px}
.ds-yr-year{font-family:var(--ds-mono);font-size:11px;font-weight:600;color:var(--ds-text);letter-spacing:.03em}
.ds-yr-turma{font-family:var(--ds-mono);font-size:10px;color:var(--ds-sub);letter-spacing:.02em}
.ds-yr-outcome{font-family:var(--ds-f);font-size:11px;font-weight:500}
.ds-yr-outcome.ok{color:var(--ds-green)}.ds-yr-outcome.warn{color:var(--ds-red)}.ds-yr-outcome.na{color:var(--ds-sub)}
.ds-yr-body{display:none;padding:0 12px 10px;border-top:.5px solid var(--ds-sep)}
.ds-yr-hdr.open + .ds-yr-body{display:block}
.ds-att-bar{height:3px;border-radius:2px;background:var(--ds-bg3);margin-top:6px;overflow:hidden}
.ds-att-fill{height:100%;border-radius:2px}
/* ── NOTES ── */
.ds-note{width:100%;padding:9px 11px;border-radius:8px;background:var(--ds-bg2);border:.5px solid var(--ds-sep);font-family:var(--ds-f);font-size:12px;color:var(--ds-text);outline:none;resize:none;min-height:64px;line-height:1.55}
.ds-note::placeholder{color:var(--ds-label)}
.ds-note:focus{border-color:rgba(58,142,255,.35);background:var(--ds-bg3)}
.ds-btn-row{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}
.ds-btn{font-family:var(--ds-f);font-size:11px;font-weight:600;padding:7px 14px;border-radius:8px;border:none;cursor:pointer;transition:opacity .12s}
.ds-btn:hover{opacity:.85}
.ds-btn.primary{background:var(--ds-tint);color:#fff}
.ds-btn.ghost{background:var(--ds-bg2);color:var(--ds-text);border:.5px solid var(--ds-sep)}
.ds-badge{display:inline-block;font-family:var(--ds-mono);font-size:9px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:4px}
.ds-badge.green{background:rgba(48,192,96,.12);color:var(--ds-green)}
.ds-badge.amber{background:rgba(245,160,32,.12);color:var(--ds-amber)}
.ds-badge.red{background:rgba(255,78,78,.12);color:var(--ds-red)}
.ds-badge.gray{background:var(--ds-bg3);color:var(--ds-sub)}
.ds-empty{padding:14px 0;font-family:var(--ds-f);font-size:12px;color:var(--ds-sub);text-align:center}
.ds-loading{display:flex;align-items:center;justify-content:center;padding:48px 0;gap:10px;font-family:var(--ds-mono);font-size:9px;color:var(--ds-label);letter-spacing:.1em}
.ds-spinner{width:14px;height:14px;border:1.5px solid rgba(255,255,255,.08);border-top-color:rgba(58,142,255,.8);border-radius:50%;animation:dsSpin .7s linear infinite;flex-shrink:0}
@keyframes dsSpin{to{transform:rotate(360deg)}}
.ds-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(6px);background:rgba(28,28,30,.94);color:var(--ds-text);font-family:var(--ds-f);font-size:12px;font-weight:500;padding:8px 18px;border-radius:16px;opacity:0;transition:opacity .18s,transform .18s;pointer-events:none;z-index:9100;white-space:nowrap;backdrop-filter:blur(12px);border:.5px solid var(--ds-sep)}
.ds-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.ds-toast.ok{color:var(--ds-green)}.ds-toast.err{color:var(--ds-red)}.ds-toast.warn{color:var(--ds-amber)}
`;

  /* ── HTML OVERLAY ── */
  const HTML = `
<div class="ds-overlay" id="ds-overlay" onclick="if(event.target===this)window.closeDossier()">
  <div class="ds-sheet" id="ds-sheet">
    <div class="ds-banner" id="ds-banner">
      <div class="ds-banner-bg" id="ds-banner-bg"></div>
      <div class="ds-banner-scrim"></div>
      <div class="ds-dept-tag" id="ds-dept-tag"></div>
      <button class="ds-close" onclick="window.closeDossier()">✕</button>
      <div class="ds-avatar" id="ds-avatar"></div>
      <div class="ds-hinfo">
        <div class="ds-name" id="ds-name">—</div>
        <div class="ds-ref" id="ds-ref">—</div>
      </div>
    </div>
    <div class="ds-strip" id="ds-strip"></div>
    <div class="ds-body" id="ds-body">
      <div class="ds-loading"><div class="ds-spinner"></div>A carregar…</div>
    </div>
  </div>
</div>
<div class="ds-toast" id="ds-toast"></div>
`;

  /* ── CONSTANTS ── */
  const COURSE_GRAD = {
    infantil: 'linear-gradient(160deg,#6B2038,#3A0E1E)',
    kids:     'linear-gradient(160deg,#0D6B52,#063828)',
    kids_juv: 'linear-gradient(160deg,#0D6B52,#063828)',
    adults:   'linear-gradient(160deg,#1A3480,#0C1A48)',
    exam:     'linear-gradient(160deg,#7A4A08,#3E2004)',
  };
  const COURSE_DEPT = { infantil:'INFANTIL', kids:'JUVENIL', kids_juv:'JUVENIL', adults:'GERAL', exam:'EXAMES' };
  const COURSE_ACCENT = { infantil:'#FF8FA0', kids:'#3DE8A8', kids_juv:'#3DE8A8', adults:'#6AABFF', exam:'#F5C040' };
  const ALM_DISP = {
    'PI1':'PI 1','PI2':'PI 2','PI3':'PI 3','PI4':'PI 4',
    'PJ1':'PJ 1','PJ2':'PJ 2','PJ3':'PJ 3',
    '1':'Ano 1','2':'Ano 2','3':'Ano 3','4':'Ano 4','5':'Ano 5',
    'Portugues':'Português',
    '6':'Ano 6 FCE','7':'Ano 7 CAE','8':'Ano 8 CPE',
  };
  const FLAGS = { EN:'🇬🇧', PT:'🇵🇹', FR:'🇫🇷', ES:'🇪🇸', DE:'🇩🇪' };
  const DAY_LABELS = ['SEG','TER','QUA','QUI','SEX','SÁB'];
  const DAY_SHORT_MAP = {
    SEG:0,TER:1,QUA:2,QUI:3,SEX:4,SAB:5,'SÁB':5,
    seg:0,ter:1,qua:2,qui:3,sex:4,sab:5,
    monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,
  };

  /* ── STATE ── */
  let _ref = null;
  let _enrol = null;
  let _req = null;
  let _hist = [];
  let _ttLoaded = false;
  let _toastT = null;

  /* ── SUPABASE FETCH ── */
  async function sbF(table, qs) {
    const r = await fetch(SB + '/rest/v1/' + table + '?' + qs, { headers: H });
    if (!r.ok) throw new Error(table + ' HTTP ' + r.status);
    return r.json();
  }

  async function sbPatch(table, qs, body) {
    const r = await fetch(SB + '/rest/v1/' + table + '?' + qs, {
      method: 'PATCH',
      headers: Object.assign({}, H, { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
    return r.ok;
  }

  /* ── HELPERS ── */
  function avCol(name) {
    let h = 0;
    for (let i = 0; i < (name || '?').length; i++) h = (h * 31 + (name || '?').charCodeAt(i)) & 0xffffffff;
    const p = [
      {bg:'#3A2244',text:'#C8A0E0'},{bg:'#1E2E50',text:'#7AABEE'},
      {bg:'#1A3A2A',text:'#5EC888'},{bg:'#3A2A14',text:'#D4944A'},
      {bg:'#3A1A1A',text:'#E07878'},{bg:'#1A2A3A',text:'#5A9EC8'},
      {bg:'#282838',text:'#9898D8'},{bg:'#2A3820',text:'#80B850'},
    ];
    return p[Math.abs(h) % p.length];
  }

  function inferCourse(e) {
    if (!e) return 'adults';
    const s = [e.family, e.course, e.department, e.level_cefr, e.level_raw, e.level_code]
      .filter(Boolean).join(' ').toLowerCase();
    if (/exam|exame/.test(s)) return 'exam';
    if (/infant|prep|pi-?a\d?/.test(s)) return 'infantil';
    if (/kid|juven|junior|pj\d/.test(s)) return 'kids_juv';
    const fam = (e.family || '').toLowerCase();
    if (fam === 'kids_juv' || fam === 'juvenil') return 'kids_juv';
    if (fam === 'kids' || fam === 'infantil') return 'kids';
    if (fam === 'exam' || fam === 'exames') return 'exam';
    return 'adults';
  }

  function timeToMins(t) {
    if (!t) return null;
    const parts = (t + '').trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return null;
    return h * 60 + m;
  }

  function dsRow(k, v, c) {
    return '<div class="ds-row"><div class="ds-rk">' + k + '</div><div class="ds-rv ' + (c || '') + '">' + v + '</div></div>';
  }

  function dsToast(msg, type) {
    const t = document.getElementById('ds-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'ds-toast ' + (type || '') + ' show';
    clearTimeout(_toastT);
    _toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ── PARSE SLOTS (new window format) ── */
  function parseSlots(req) {
    if (!req) return [];
    const raw = req.slots || req.day_preferences;
    if (!raw) return [];
    var arr;
    try {
      arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(arr)) return [];
    } catch (e) { return []; }

    return arr.map(function (p) {
      var dayShort = p.day_short || (p.day || p.weekday || p.dia || '').toString();
      var dayIdx = DAY_SHORT_MAP[dayShort] !== undefined ? DAY_SHORT_MAP[dayShort]
        : DAY_SHORT_MAP[dayShort.toLowerCase()] !== undefined ? DAY_SHORT_MAP[dayShort.toLowerCase()] : null;
      var dayPt = dayIdx !== null ? DAY_LABELS[dayIdx] : dayShort.toUpperCase();
      var start = p.from || p.session_start || p.start_time || (p.hour ? p.hour + ':00' : '—');
      var end = p.to || p.end_time || null;
      var fromMins = timeToMins(start);
      var toMins = timeToMins(end);
      var hFrom = fromMins !== null ? Math.floor(fromMins / 60) : null;
      return { day: dayPt, dayIdx: dayIdx, start: start, endTime: end, fromMins: fromMins, toMins: toMins, hFrom: hFrom };
    }).filter(function (p) { return p.day && p.fromMins !== null; });
  }

  /* ── AVAILABILITY BAND RENDERER ── */
  function renderBands(prefs) {
    if (!prefs.length) return '<div class="ds-empty">Sem disponibilidade registada.</div>';

    var DAY_START = 480; // 08:00
    var DAY_END = 1230;  // 20:30
    var DAY_SPAN = DAY_END - DAY_START;
    var HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    var DAY_ORDER = ['SEG','TER','QUA','QUI','SEX','SAB'];

    var byDay = {};
    prefs.forEach(function (p) {
      if (!byDay[p.day]) byDay[p.day] = [];
      byDay[p.day].push(p);
    });

    // Hour ruler
    var ruler = '<div style="display:flex;margin-left:36px;position:relative;height:14px;margin-bottom:1px">';
    HOURS.forEach(function (hr) {
      var l = (((hr - 8) / 12) * 100).toFixed(2);
      ruler += '<div style="position:absolute;left:' + l + '%;font-size:7px;color:rgba(255,255,255,.35);transform:translateX(-50%)">' + hr + '</div>';
    });
    ruler += '</div>';

    // Rows
    var rows = '';
    DAY_ORDER.forEach(function (day) {
      var windows = byDay[day] || [];
      var hasData = windows.length > 0;
      var dayColor = hasData ? '#F5A020' : 'rgba(255,255,255,.25)';

      // Grid lines
      var gridLines = '';
      HOURS.forEach(function (hr) {
        var l = (((hr - 8) / 12) * 100).toFixed(2);
        gridLines += '<div style="position:absolute;left:' + l + '%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.06)"></div>';
      });

      // Bands
      var bands = '';
      windows.forEach(function (p) {
        var left = (((p.fromMins - DAY_START) / DAY_SPAN) * 100).toFixed(2);
        var width = (((p.toMins - p.fromMins) / DAY_SPAN) * 100).toFixed(2);
        bands += '<div style="position:absolute;left:' + left + '%;width:' + width + '%;top:2px;bottom:2px;background:#F5A020;border-radius:2px;display:flex;align-items:center;padding:0 5px;overflow:hidden">'
          + '<span style="font-size:7px;color:#1a1000;white-space:nowrap;font-weight:700">' + p.start + ' – ' + (p.endTime || '?') + '</span>'
          + '</div>';
      });

      rows += '<div style="display:flex;align-items:center;gap:0;margin-bottom:2px">'
        + '<div style="width:36px;font-size:8px;font-weight:700;color:' + dayColor + ';flex-shrink:0;text-align:right;padding-right:6px">' + day + '</div>'
        + '<div style="flex:1;position:relative;height:20px;background:rgba(255,255,255,.04);border-radius:2px;overflow:hidden">' + gridLines + bands + '</div>'
        + '</div>';
    });

    return '<div style="margin-bottom:10px">'
      + '<div class="ds-avail-label">Disponibilidade · Pedido</div>'
      + ruler + rows
      + '<div class="ds-avail-leg" style="margin-top:6px;margin-left:36px">'
      + '<div class="ds-leg-item"><div class="ds-leg-dot" style="background:#F5A020"></div>Pedido</div>'
      + '<div class="ds-leg-item"><div class="ds-leg-dot" style="background:var(--ds-green)"></div>Confirmado</div>'
      + '</div></div>';
  }

  /* ── SECTION BUILDERS ── */
  function buildEnrolSection(course, lvl) {
    if (!_enrol) return '<div class="ds-empty">Matrícula não encontrada.</div>';
    var e = _enrol;
    var dept = COURSE_DEPT[course] || 'GERAL';
    var dob = e.date_of_birth
      ? new Date(e.date_of_birth).toLocaleDateString('pt-PT', { day:'2-digit', month:'long', year:'numeric' })
      : null;
    var personal = [
      dsRow('Ref', e.ref || '—', 'tint'),
      dsRow('Nome', e.name || '—'),
      dob ? dsRow('Nasc.', dob + (e.age ? ' · ' + e.age + ' anos' : '')) : '',
      e.gender ? dsRow('Género', e.gender === 'M' ? 'Masculino' : e.gender === 'F' ? 'Feminina' : e.gender) : '',
      e.email ? dsRow('Email', e.email, 'tint') : '',
      e.phone ? dsRow('Tel.', e.phone) : '',
      e.guardian_name ? dsRow('Encarregado', e.guardian_name) : '',
      e.guardian_phone ? dsRow('Tel. EE', e.guardian_phone) : '',
      e.locality ? dsRow('Localidade', e.locality) : '',
      e.occupation ? dsRow('Profissão', e.occupation) : '',
    ].filter(Boolean).join('');
    var academic = [
      dsRow('Nível', lvl),
      dsRow('Dept.', dept),
      e.branch ? dsRow('Filial', (e.branch || '').replace(/_/g, ' ')) : '',
      dsRow('Língua', (FLAGS[e.lang] || '') + ' ' + (e.lang || '—')),
      e.academic_year ? dsRow('Ano lectivo', e.academic_year) : '',
      e.enrolment_date ? dsRow('Matrícula', new Date(e.enrolment_date).toLocaleDateString('pt-PT')) : '',
      e.returning_student != null ? dsRow('Tipo', e.returning_student ? 'Recorrente' : 'Novo') : '',
      e.payment_method ? dsRow('Pagamento', e.payment_method) : '',
      e.school ? dsRow('Escola', e.school) : '',
      e.school_year ? dsRow('Ano escolar', e.school_year) : '',
    ].filter(Boolean).join('');
    return '<div class="ds-sub-hdr">Dados pessoais</div>' + personal
      + '<div class="ds-sub-hdr">Dados académicos</div>' + academic;
  }

  function buildHistSection() {
    if (!_hist.length) return '<div class="ds-empty">Sem historial registado.</div>';
    return _hist.map(function (yr) {
      var lvl = ALM_DISP[(yr.level_code || yr.level_cefr || '').trim()] || (yr.level_code || yr.level_cefr || '—');
      var cls = yr.outcome === 'aprovado' ? 'ok' : yr.outcome === 'reprovado' ? 'warn' : 'na';
      var lbl = yr.outcome === 'aprovado' ? 'Aprovado' : yr.outcome === 'reprovado' ? 'Reprovado' : yr.outcome || 'Em curso';
      var att = yr.absences != null ? Math.max(0, 100 - yr.absences * 5) : null;
      return '<div class="ds-yr">'
        + '<div class="ds-yr-hdr" onclick="this.classList.toggle(\'open\')">'
        + '<div class="ds-yr-left"><span class="ds-yr-year">' + (yr.academic_year || '—') + '</span>'
        + '<span class="ds-yr-turma">' + (yr.turma_code || '—') + ' · ' + lvl + '</span></div>'
        + '<span class="ds-yr-outcome ' + cls + '">' + lbl + '</span>'
        + '</div>'
        + '<div class="ds-yr-body">'
        + (yr.grade_final != null ? dsRow('Nota final', yr.grade_final + '%') : '')
        + (yr.absences != null ? dsRow('Faltas', yr.absences) : '')
        + (att != null ? '<div class="ds-att-bar"><div class="ds-att-fill" style="width:' + att + '%;background:' + (att > 75 ? 'var(--ds-green)' : att > 50 ? 'var(--ds-amber)' : 'var(--ds-red)') + '"></div></div>' : '')
        + (yr.notes ? dsRow('Notas', yr.notes) : '')
        + '</div></div>';
    }).join('');
  }

  function buildHorarioSection(prefs) {
    if (!_req) return '<div class="ds-empty">Nenhum pedido registado.</div>';
    var bands = renderBands(prefs);
    var slotTags = prefs.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">'
        + prefs.map(function (p) {
          return '<span style="font-family:var(--ds-mono);font-size:10px;color:var(--ds-tint);background:rgba(58,142,255,.08);padding:2px 7px;border-radius:5px">'
            + p.day + ' ' + p.start + '</span>';
        }).join('') + '</div>'
      : '';
    var dateStr = _req.created_at
      ? new Date(_req.created_at).toLocaleDateString('pt-PT', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    var stCls = _req.status === 'atribuido' ? 'green' : _req.status === 'pendente' ? 'amber' : 'gray';
    var meta = [
      dsRow('Sessões/sem', _req.sessions_per_week || '—'),
      '<div class="ds-row"><div class="ds-rk">Estado</div><div class="ds-rv"><span class="ds-badge ' + stCls + '">' + (_req.status || '—') + '</span></div></div>',
      _req.assigned_turma ? dsRow('Turma', _req.assigned_turma, 'green') : '',
      dsRow('Submetido', dateStr),
    ].filter(Boolean).join('');
    return bands + slotTags + meta;
  }

  function buildNotasSection() {
    var existing = (_enrol && _enrol.notes) || '';
    return '<div class="ds-flags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:9px">'
      + ['⚠ Comportamento','💳 Pagamento','📉 Desempenho','📅 Faltas','♿ Nec. especial'].map(function (f) {
        return '<button style="font-family:var(--ds-f);font-size:10px;font-weight:500;color:var(--ds-sub);padding:4px 10px;border-radius:6px;background:var(--ds-bg2);border:.5px solid var(--ds-sep);cursor:pointer;transition:all .12s" onclick="this.classList.toggle(\'on\');this.style.color=this.classList.contains(\'on\')?\'var(--ds-red)\':\'var(--ds-sub\')">' + f + '</button>';
      }).join('') + '</div>'
      + '<textarea class="ds-note" id="ds-note-ta" placeholder="Nota visível para toda a equipa…">' + existing + '</textarea>'
      + '<div class="ds-btn-row">'
      + '<button class="ds-btn primary" onclick="window._dsSaveNote()">Guardar nota</button>'
      + '<button class="ds-btn ghost" onclick="window.closeDossier()">Fechar</button>'
      + '</div>';
  }

  function dsSec(id, icon, title, meta, content) {
    return '<div class="ds-section" id="' + id + '">'
      + '<div class="ds-section-hdr" onclick="this.classList.toggle(\'open\')">'
      + '<div class="ds-section-title"><span class="ds-section-icon">' + icon + '</span>' + title + '</div>'
      + '<div class="ds-section-r"><span class="ds-section-meta">' + meta + '</span><span class="ds-section-chv">›</span></div>'
      + '</div>'
      + '<div class="ds-section-body">' + content + '</div>'
      + '</div>';
  }

  /* ── RENDER DOSSIER ── */
  function renderDossier() {
    var course = inferCourse(_enrol || _req);
    var rawCode = ((_enrol && (_enrol.level_code || _enrol.level_cefr)) || (_req && (_req.level_code || _req.level_cefr)) || '').trim();
    var lvl = ALM_DISP[rawCode] || rawCode || '—';
    var accent = COURSE_ACCENT[course] || 'rgba(255,255,255,.48)';
    var grad = COURSE_GRAD[course] || COURSE_GRAD.adults;

    // Banner
    document.getElementById('ds-banner-bg').style.background = grad;
    var deptTag = document.getElementById('ds-dept-tag');
    deptTag.textContent = COURSE_DEPT[course] || 'GERAL';
    deptTag.style.color = accent;

    var name = (_enrol && _enrol.name) || _ref || '—';
    var col = avCol(name);
    var av = document.getElementById('ds-avatar');
    av.style.cssText = 'background:' + col.bg + ';color:' + col.text;
    av.textContent = name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    document.getElementById('ds-name').textContent = name;

    var lang = (_enrol && _enrol.lang) || (_req && _req.lang) || 'EN';
    var branch = (_enrol && _enrol.branch) || (_req && _req.branch) || '—';
    document.getElementById('ds-ref').textContent = _ref + '  ·  ' + lvl + '  ·  ' + (FLAGS[lang] || '') + ' ' + lang;

    // Contact strip
    var items = [];
    if (_enrol && _enrol.age) items.push('<span class="ds-ci">' + _enrol.age + ' anos</span>');
    if (_enrol && _enrol.school) items.push('<span class="ds-ci">' + _enrol.school + '</span>');
    if (_enrol && _enrol.phone) items.push('<a class="ds-ci ds-ci-link" href="tel:' + _enrol.phone + '">📞 ' + _enrol.phone + '</a>');
    if (_enrol && _enrol.email) items.push('<a class="ds-ci ds-ci-link" href="mailto:' + _enrol.email + '">✉ ' + _enrol.email + '</a>');
    document.getElementById('ds-strip').innerHTML = items.join('<span class="ds-ci-sep">·</span>');

    // Body sections
    var prefs = parseSlots(_req);
    var horarioMeta = prefs.length ? prefs.length + ' slots' : '—';
    var histMeta = _hist.length ? _hist.length + ' ano' + (_hist.length > 1 ? 's' : '') : '—';

    document.getElementById('ds-body').innerHTML = [
      dsSec('ds-s-inscricao', '📋', 'Inscrição', (_enrol && _enrol.academic_year) || '—', buildEnrolSection(course, lvl)),
      dsSec('ds-s-hist', '🎓', 'Historial', histMeta, buildHistSection()),
      dsSec('ds-s-horario', '🗓', 'Horário · Disponibilidade', horarioMeta, buildHorarioSection(prefs)),
      dsSec('ds-s-notas', '🚩', 'Notas Internas', (_enrol && _enrol.notes) ? 'com nota' : '', buildNotasSection()),
    ].join('');
  }

  /* ── PUBLIC API ── */
  window.openDossier = async function (ref) {
    _ref = ref;
    _enrol = null; _req = null; _hist = []; _ttLoaded = false;

    var overlay = document.getElementById('ds-overlay');
    if (!overlay) { injectDossierHTML(); overlay = document.getElementById('ds-overlay'); }
    overlay.classList.add('open');

    // Skeleton while loading
    var col = avCol(ref);
    var av = document.getElementById('ds-avatar');
    av.style.cssText = 'background:' + col.bg + ';color:' + col.text;
    av.textContent = ref.slice(-2);
    document.getElementById('ds-banner-bg').style.background = COURSE_GRAD.adults;
    document.getElementById('ds-dept-tag').textContent = '…';
    document.getElementById('ds-name').textContent = ref;
    document.getElementById('ds-ref').textContent = 'a carregar…';
    document.getElementById('ds-strip').innerHTML = '';
    document.getElementById('ds-body').innerHTML = '<div class="ds-loading"><div class="ds-spinner"></div>A carregar dossier…</div>';

    try {
      var enc = encodeURIComponent(ref);
      var encAY = encodeURIComponent(AY);
      var results = await Promise.all([
        sbF('enrolments', 'ref=eq.' + enc + '&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_cefr,level_code,level_raw,enrolment_date,academic_year,returning_student,payment_method,guardian_name,guardian_phone,notes,school,school_year,occupation,locality&limit=1'),
        sbF('timetable_requests', 'ref=eq.' + enc + '&academic_year=eq.' + encAY + '&select=ref,student_name,branch,lang,family,level_cefr,level_code,day_preferences,slots,sessions_per_week,status,assigned_turma,created_at,mode_used,notes&limit=1'),
        sbF('turma_students', 'ref=eq.' + enc + '&select=ref,turma_code,academic_year,level_cefr,level_code,family,outcome,absences,grade_final,notes&order=academic_year.desc'),
      ]);
      _enrol = results[0][0] || null;
      _req   = results[1][0] || null;
      _hist  = results[2] || [];
      renderDossier();
    } catch (err) {
      document.getElementById('ds-body').innerHTML = '<div class="ds-empty" style="color:var(--ds-red);padding:32px">Erro: ' + err.message + '</div>';
    }
  };

  window.closeDossier = function () {
    var sheet = document.getElementById('ds-sheet');
    if (!sheet) return;
    sheet.classList.add('ds-exit');
    setTimeout(function () {
      var overlay = document.getElementById('ds-overlay');
      if (overlay) overlay.classList.remove('open');
      sheet.classList.remove('ds-exit');
    }, 250);
  };

  window._dsSaveNote = async function () {
    var txt = document.getElementById('ds-note-ta');
    if (!txt) return;
    var val = txt.value.trim();
    var ok = await sbPatch('enrolments', 'ref=eq.' + encodeURIComponent(_ref), { notes: val });
    if (ok) {
      if (_enrol) _enrol.notes = val;
      dsToast('Nota guardada ✓', 'ok');
    } else {
      dsToast('Erro ao guardar', 'err');
    }
  };

  /* ── INJECT HTML + CSS ── */
  function injectDossierHTML() {
    if (document.getElementById('ds-overlay')) return; // already injected
    // CSS
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    // HTML
    var div = document.createElement('div');
    div.innerHTML = HTML;
    document.body.appendChild(div.firstElementChild);
    document.body.appendChild(div.lastElementChild);
  }

  /* ── KEYBOARD ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var overlay = document.getElementById('ds-overlay');
      if (overlay && overlay.classList.contains('open')) window.closeDossier();
    }
  });

  /* ── AUTO-INJECT on load ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDossierHTML);
  } else {
    injectDossierHTML();
  }

})();
