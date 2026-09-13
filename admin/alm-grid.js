/* ══════════════════════════════════════════════════════════════════════
   ALM · alm-grid.js
   The timetable grid. One implementation, four consumers: the request
   form, Overview, Assign, and the teacher portal.

   WHY THIS FILE EXISTS
   Those four pages held four copies of the same geometry. The copies
   drifted, and the drift was not cosmetic: a lesson's width was
   computed by walking the row accumulating (cellWidth + gap), so the
   gap was a layout constant with a consumer. Change it in the
   stylesheet and every band silently desynced — at gap:10 the 20h
   column sat ~70px out. That bug was found in Assign, fixed in
   Assign, and shipped broken in the portal, because the fix had no
   single place to live.

   THE HALF-HOUR COLUMN
   The grid is ruled and gapless, two columns per hour. A 90-minute
   lesson is exactly three columns; a 110-minute one is not a whole
   number of columns, so it is positioned by percentage inside the
   span it covers. Either way there is no gap to accumulate and no
   arithmetic that can drift.

   WHAT A CONSUMER PROVIDES
   Data and a click handler. Nothing else. If a page needs to change
   how the grid looks or measures, it changes this file, and all four
   pages change with it.
   ══════════════════════════════════════════════════════════════════════ */

(function (global) {
'use strict';

const DAYS = [
  ['SEG', 'Segunda'], ['TER', 'Terça'], ['QUA', 'Quarta'],
  ['QUI', 'Quinta'],  ['SEX', 'Sexta'], ['SÁB', 'Sábado'],
];

/* null is the lunch break — a real column in the markup so the table
   stays rectangular, but never a half-hour slot. A lesson that spans
   it is clipped at the boundary, which is correct: there is no 12h
   or 13h column to land in. */
const HOURS = [8, 9, 10, 11, null, 14, 15, 16, 17, 18, 19, 20];

/* ONE COLUMN IS ONE HOUR.
   An earlier draft split each hour in two so a 90-minute lesson was a
   whole number of columns. It made the arithmetic tidy and the grid
   worse: twice the rules, half the width each, and a cell that no
   longer meant anything a teacher thinks in. An hour is the unit of a
   timetable, so an hour is the cell.

   A lesson is still placed to the minute — it is positioned by
   fraction inside the hour columns it covers, which is exact. What
   the hour column costs is nothing, because the table is gapless:
   there is no spacing to accumulate, which was the only reason the
   half-hour trick existed. */
const HOUR = 60;
const toMins = t => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  if (isNaN(h)) return null;
  return h * HOUR + (isNaN(m) ? 0 : m);
};

const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ── IDENTITY BY PAIR, STATE BY FILL ────────────────────────────────
   01A and 01B share a tone; 02A and 02B take the next one. The tone
   is keyed on the group code, so the two halves of a pair always
   match and a turma keeps its colour all year.

   THE CONSEQUENCE, STATED PLAINLY
   Hue can only carry one thing. If it now says WHICH turma, it can no
   longer say WHETHER the register is marked — that is the same trap
   slotCol() and pairTone() fell into, where colour described the
   timetable and the state had nowhere to live.

   So state moves to fill:
     · marked   → solid tone, its own text colour
     · unmarked → the same tone at 14%, with a 3px solid edge and ink
                  text. Same hue, visibly not finished.
   Two channels, two facts, neither competing.

   WHY ONLY FOUR TONES
   Sage is a narrow band. Measured, six steps sit 14–19 apart when
   ~30 is needed to tell two blocks apart; four spread by lightness
   sit 51 apart. The two light steps fall below 4.5:1 against white,
   so they carry ink text instead — chosen per tone, not assumed. */
const TONES = [
  { fill:'#2E4A3A', ink:'#FFFFFF' },
  { fill:'#4A6A56', ink:'#FFFFFF' },
  { fill:'#6A8878', ink:'#14140F' },
  { fill:'#93AB99', ink:'#14140F' },
];
function toneFor(key){
  const k = String(key || '');
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) & 0x7fffffff;
  return TONES[h % TONES.length];
}
function hexA(hex, a){
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

/* ── THE STYLESHEET LIVES HERE TOO ──────────────────────────────────
   Injected once. If the grid's appearance were left to each page, the
   four copies would drift the same way the geometry did — and the
   hairline weight is as much a part of "this is one instrument" as
   the column width is. */
const CSS = `
.almg{border:1px solid var(--almg-rule-2,#CFCCC2);border-radius:10px;
  overflow:auto;background:var(--almg-paper,#fff);-webkit-overflow-scrolling:touch}
.almg table{border-collapse:separate;border-spacing:0;width:100%;min-width:960px}
.almg th,.almg td{padding:0;border-right:1px solid var(--almg-rule,#E4E2DB);
  border-bottom:1px solid var(--almg-rule,#E4E2DB)}
.almg thead th{position:sticky;top:0;z-index:20;height:30px;
  background:var(--almg-head,#F2F1EC);
  border-bottom:1px solid var(--almg-rule-2,#CFCCC2);
  font-family:var(--mono,ui-monospace,monospace);font-size:10px;font-weight:600;
  color:var(--almg-sub,#7A7A72);text-align:center;white-space:nowrap;
  transition:background .12s,color .12s}
.almg thead th.on{background:var(--almg-head-on,#DCE3DE);color:var(--almg-ink,#14140F)}
.almg .almg-day{position:sticky;left:0;z-index:30;width:74px;min-width:74px;
  background:var(--almg-head,#F2F1EC);text-align:left;padding:0 11px;
  border-right:1px solid var(--almg-rule-2,#CFCCC2);transition:background .12s}
.almg tbody .almg-day{z-index:10;vertical-align:middle}
.almg tbody .almg-day.on{background:var(--almg-head-on,#DCE3DE)}
.almg-d1{font-size:13px;font-weight:600;letter-spacing:.03em;
  color:var(--almg-ink,#14140F);display:block}
.almg-d2{font-family:var(--mono,ui-monospace,monospace);font-size:8px;
  color:var(--almg-faint,#A8A69C);display:block;margin-top:1px}
/* Rectangular: ~86px wide against 52px tall is about 5:3, the
   proportion an hour column wants. */
.almg tbody td{height:52px;min-width:86px;position:relative;
  background:var(--almg-paper,#fff)}
.almg thead th[data-h]{min-width:86px}
.almg td.almg-hb{border-right:1px solid var(--almg-rule-2,#CFCCC2)}
.almg td.almg-lunch{background:#FAFAF7;width:22px;min-width:22px}
.almg-lunch-l{font-family:var(--mono,ui-monospace,monospace);font-size:7px;
  color:var(--almg-faint,#A8A69C);writing-mode:vertical-rl;transform:rotate(180deg);
  display:block;text-align:center;line-height:22px}
.almg td.almg-free{cursor:pointer}
.almg td.almg-free:hover{background:#FAFAF7}

.almg-item{position:absolute;top:4px;bottom:4px;border-radius:6px;padding:6px 9px;
  display:flex;flex-direction:column;justify-content:center;gap:1px;overflow:hidden;
  cursor:pointer;z-index:5;color:#fff;background:var(--almg-open,#9A7B62);
  transition:opacity .12s}
.almg-item:hover{opacity:.88}
.almg-item.done{background:var(--almg-done,#5E776C)}
.almg-item.dim{opacity:.3}
.almg-item.hot{outline:1.5px solid var(--almg-ink,#14140F);outline-offset:1px;z-index:7}
.almg-item.sib{outline:1.5px dashed rgba(20,20,15,.5);outline-offset:1px;z-index:7}
.almg-t{font-family:var(--mono,ui-monospace,monospace);font-size:10px;font-weight:700;
  letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Inherits the item's own ink, because a light tone carries dark text
   and a dark one carries white. Hard-coding white here would have made
   the two pale steps unreadable. */
.almg-s{font-family:var(--mono,ui-monospace,monospace);font-size:8.5px;
  opacity:.82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.almg-badge{position:absolute;top:5px;right:6px;width:17px;height:17px;border-radius:999px;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono,ui-monospace,monospace);font-size:7px;font-weight:700;
  background:currentColor;color:inherit}
.almg-item.done .almg-badge{background:rgba(255,255,255,.92);color:var(--almg-done,#5E776C)}
.almg-legend{display:flex;gap:16px;align-items:center;margin-top:9px;
  font-family:var(--mono,ui-monospace,monospace);font-size:9px;color:var(--almg-sub,#7A7A72)}
.almg-sw{width:9px;height:9px;border-radius:6px;display:inline-block;
  vertical-align:-1px;margin-right:5px}
`;

let cssDone = false;
function injectCSS() {
  if (cssDone) return;
  const s = document.createElement('style');
  s.id = 'alm-grid-css';
  s.textContent = CSS;
  document.head.appendChild(s);
  cssDone = true;
}


/* ══════════════════════════════════════════════════════════════════
   render(el, opts)

   opts.items   [{ day, start:'14:00', end:'15:30', title, sub,
                   badge, state:'done'|'open', dim, hot, sib, data }]
   opts.hours   default HOURS
   opts.days    default all six
   opts.today   day key to mark in the header
   opts.onItem(item, ev)
   opts.onEmpty(dayKey, mins, ev)   omit to make empty cells inert
   opts.legend  [[colour, label], …]
   ══════════════════════════════════════════════════════════════════ */
function render(el, opts) {
  if (!el) return;
  injectCSS();
  const o      = opts || {};
  const hours  = o.hours || HOURS;
  const days   = o.days  || DAYS;
  const items  = o.items || [];

  let html = '<div class="almg"><table><thead><tr>'
    + '<th class="almg-day">Dia</th>';
  hours.forEach(h => {
    html += h === null
      ? '<th class="almg-lunch"></th>'
      : `<th data-h="${h}">${h}h</th>`;
  });
  html += '</tr></thead><tbody>';

  days.forEach(d => {
    const key = Array.isArray(d) ? d[0] : d.key;
    const lbl = Array.isArray(d) ? d[1] : d.label;
    html += `<tr data-day="${esc(key)}">`
      + `<th class="almg-day${key === o.today ? ' on' : ''}">`
      + `<span class="almg-d1">${esc(key)}</span>`
      + `<span class="almg-d2">${esc(lbl)}</span></th>`;
    hours.forEach(h => {
      if (h === null) {
        html += '<td class="almg-lunch"><span class="almg-lunch-l">12–14</span></td>';
        return;
      }
      const free = o.onEmpty ? ' almg-free' : '';
      html += `<td class="almg-hb${free}" data-h="${h}" data-m="${h * 60}"></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  if (o.legend && o.legend.length) {
    html += '<div class="almg-legend">'
      + o.legend.map(([c, t]) =>
          `<span><i class="almg-sw" style="background:${c}"></i>${esc(t)}</span>`).join('')
      + (o.hint ? `<span style="margin-left:auto">${esc(o.hint)}</span>` : '')
      + '</div>';
  }
  el.innerHTML = html;

  const root = el.querySelector('.almg');

  /* Placed after layout: a column's width is not known until the table
     has resolved, and a lesson that is not a whole number of columns
     is positioned inside the span it covers. */
  const place = () => {
    root.querySelectorAll('.almg-item').forEach(x => x.remove());
    items.forEach(it => {
      const row = root.querySelector(`tr[data-day="${CSS_ESC(it.day)}"]`);
      if (!row) return;
      const cells = [...row.querySelectorAll('td')]
        .filter(td => !td.classList.contains('almg-lunch'));
      const s = toMins(it.start), e = toMins(it.end);
      if (s == null || e == null || e <= s) return;

      /* Which hour columns does it touch, and where inside them does
         it start and stop. No gap term: the table is gapless, so the
         columns are contiguous and the sum is the span. */
      const hrs = hours.filter(x => x !== null);
      let i0 = -1, i1 = -1;
      hrs.forEach((h, i) => {
        const a = h * HOUR, b = a + HOUR;
        if (s < b && e > a) { if (i0 < 0) i0 = i; i1 = i; }
      });
      if (i0 < 0) return;

      const host = cells[i0];
      if (!host) return;
      const w0    = host.offsetWidth;
      const last  = cells[i1] || host;
      const lead  = ((s - hrs[i0] * HOUR) / HOUR) * w0;
      const full  = cells.slice(i0, i1 + 1).reduce((t, c) => t + c.offsetWidth, 0);
      const tail  = hrs[i1] * HOUR + HOUR;
      const trail = ((tail - Math.min(e, tail)) / HOUR) * last.offsetWidth;

      const node = document.createElement('div');
      node.className = 'almg-item'
        + (it.state === 'done' ? ' done' : ' open')
        + (it.dim ? ' dim' : '') + (it.hot ? ' hot' : '') + (it.sib ? ' sib' : '');

      /* it.tone is a pair key (group code). Omit it and the item falls
         back to the stylesheet's done/open colours, which is what a
         page with no pairs wants. */
      if (it.tone) {
        const t = toneFor(it.tone);
        if (it.state === 'done') {
          node.style.background = t.fill;
          node.style.color = t.ink;
        } else {
          node.style.background = hexA(t.fill, .14);
          node.style.color = '#14140F';
          node.style.borderLeft = '3px solid ' + t.fill;
        }
      }
      /* Positioned inside its first cell, never inside the row — the
         row box starts at the frozen day column, and measuring from
         the cells while positioning against the row is what put a
         14:00 lesson at 11:36 in the assign grid. */
      node.style.left  = Math.round(lead) + 'px';
      node.style.width = Math.max(46, Math.round(full - lead - trail) - 2) + 'px';
      node.title = it.title + (it.sub ? ' · ' + it.sub : '');
      node.innerHTML =
        (it.badge ? `<span class="almg-badge">${esc(it.badge)}</span>` : '') +
        `<span class="almg-t">${esc(it.title)}</span>` +
        (it.sub ? `<span class="almg-s">${esc(it.sub)}</span>` : '');

      if (o.onItem) node.addEventListener('click', ev => { ev.stopPropagation(); o.onItem(it, ev); });

      /* THE HEADER TINT. The day and the hours this item occupies light
         up on hover, so "when is this" is read rather than traced
         across the grid. Borrowed from the spreadsheet, and the single
         cheapest legibility win on the screen. */
      const hs = Math.floor(s / 60), he = Math.ceil(e / 60);
      node.addEventListener('mouseenter', () => {
        row.querySelector('.almg-day').classList.add('on');
        for (let h = hs; h < he; h++)
          root.querySelector(`thead th[data-h="${h}"]`)?.classList.add('on');
      });
      node.addEventListener('mouseleave', () => {
        if (it.day !== o.today) row.querySelector('.almg-day').classList.remove('on');
        for (let h = hs; h < he; h++)
          root.querySelector(`thead th[data-h="${h}"]`)?.classList.remove('on');
      });

      host.appendChild(node);
    });
  };

  requestAnimationFrame(() => requestAnimationFrame(place));

  if (o.onEmpty) {
    root.addEventListener('click', ev => {
      const td = ev.target.closest('td.almg-free');
      if (!td || ev.target.closest('.almg-item')) return;
      o.onEmpty(td.closest('tr').dataset.day, +td.dataset.m, ev);
    });
  }

  /* One resize listener per container, replaced on re-render. */
  if (el._almgResize) window.removeEventListener('resize', el._almgResize);
  let t;
  el._almgResize = () => { clearTimeout(t); t = setTimeout(place, 150); };
  window.addEventListener('resize', el._almgResize);

  return { redraw: place };
}

/* Day keys contain a non-ASCII character (SÁB); CSS.escape is not on
   every target, so this is the minimum safe quoting for the selector. */
function CSS_ESC(v) {
  return String(v).replace(/["\\]/g, '\\$&');
}

global.ALMGrid = { render, DAYS, HOURS, toMins, HOUR, toneFor, TONES };

})(window);
