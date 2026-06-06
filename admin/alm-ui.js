/* ═══════════════════════════════════════════════════════════════
   ALM UI  ·  alm-ui.js
   All rendering, DOM manipulation, navigation, modals.
   Depends on: alm-engine.js (must load first)
═══════════════════════════════════════════════════════════════ */
function buildHeatmap(students){
  const map={};
  DAYS_PT.forEach(d=>{map[d]={};HOUR_COLS.forEach(h=>map[d][h]=0);});
  students.forEach(e=>{
    const a=analysePrefs(e.ref);if(!a)return;
    a.windows.forEach(w=>{
      const day=DAYS_PT[w.dayIdx];if(!day)return;
      const startH=Math.floor(w.earliest/60),endH=Math.floor(w.latest/60);
      const seen=new Set();
      for(let h=startH;h<=endH;h++){if(HOUR_COLS.includes(h)&&!seen.has(h)){seen.add(h);map[day][h]++;}}
    });
  });
  return map;
}

function paintCellHeatmap(containerId,withReq,levelKey,result){
  const map=buildHeatmap(withReq);
  const maxVal=Math.max(1,...DAYS_PT.map(d=>Math.max(0,...HOUR_COLS.map(h=>map[d]?.[h]||0))));
  DAYS_PT.forEach(day=>{
    HOUR_COLS.forEach(h=>{
      const cell=document.querySelector(`#${containerId}-row-${day} [data-h="${h}"]`);
      if(!cell)return;
      cell.style.background='rgba(0,0,0,0)';
      cell.style.border='.5px solid rgba(255,255,255,.03)';
      cell.removeAttribute('data-group');
    });
  });
  if(!result?.groups?.length)return;
}

function buildPermanentGrid(containerId,withReq){
  const container=document.getElementById(containerId);
  if(!container)return;
  const today=new Date().getDay();
  const dayToday=[null,'SEG','TER','QUA','QUI','SEX','SÁB'][today]||null;
  let dayColHTML='<div class="day-spacer"></div>';
  DAYS_PT.forEach(d=>{
    const isToday=d===dayToday,isSat=d==='SÁB';
    dayColHTML+=`<div class="day-lbl${isToday?' today':isSat?' sat':''}"><span class="day-lbl-short">${d}</span><span class="day-lbl-full">${DAYS_FULL[d]||d}</span></div>`;
  });
  let timeHdrHTML='<div class="time-hdr">';
  ALL_HRS.forEach(h=>{
    if(h===null)timeHdrHTML+=`<div class="time-gap-col"><span class="time-gap-lbl">almoço</span></div>`;
    else timeHdrHTML+=`<div class="time-lbl">${h}h</div>`;
  });
  timeHdrHTML+='</div>';
  let rowsHTML='';
  DAYS_PT.forEach(day=>{
    let cells='';
    ALL_HRS.forEach(h=>{
      if(h===null)cells+=`<div class="gcell gap-cell"></div>`;
      else cells+=`<div class="gcell" data-day="${day}" data-h="${h}"></div>`;
    });
    rowsHTML+=`<div class="grid-row" id="${containerId}-row-${day}" data-day="${day}">${cells}</div>`;
  });
  container.innerHTML=`<div class="day-col-wrap"><div class="day-lbl-col">${dayColHTML}</div><div class="scroll-cols">${timeHdrHTML}<div id="${containerId}-rows-wrap" style="position:relative">${rowsHTML}</div></div></div>`;
}

function drawStamps(containerId,levelKey,result){
  const wrap=document.getElementById(`${containerId}-rows-wrap`);
  if(!wrap)return;
  wrap.querySelectorAll('.sg-stamp').forEach(s=>s.remove());
  if(!result?.groups?.length)return;

  result.groups.forEach((g,i)=>{
    const committed=(_groupCodes[levelKey]||{})[i];
    const ar=(_auditResults[levelKey]||{})[i];
    const isCert=!!committed;
    const isFail=ar?.status==='fail';
    const isWarn=ar?.status==='warn';

    const col=isFail?'#E8455A':isWarn?'#E8A020':slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
    const bandBg=isFail?'rgba(232,69,90,.25)':isWarn?'rgba(232,160,32,.22)':isCert?col+'28':col+'35';
    const borderCol=isFail?'#E8455A99':isCert?col:col+'CC';
    const inkCol=isFail?'#FFB0B8':col;
    const n=g.students.length;

    function makeSeal(glyph,fillCol,inkC,certified){
      const dash=certified?'none':'2 2';
      const outerStroke=certified?fillCol:fillCol+'99';
      const glyphEl=glyph.length===1
        ?`<text x="16" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${inkC}" font-family="'IBM Plex Mono',monospace">${glyph}</text>`
        :`<text x="16" y="19" text-anchor="middle" font-size="7" font-weight="700" fill="${inkC}" font-family="'IBM Plex Mono',monospace" letter-spacing="0.5">${glyph}</text>`;
      return`<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" stroke="${outerStroke}" stroke-width="2"/>
        <circle cx="16" cy="16" r="12" stroke="${fillCol}" stroke-width=".8" opacity=".6"/>
        <circle cx="16" cy="16" r="9" stroke="${fillCol}" stroke-width=".8" stroke-dasharray="${dash}" opacity=".5"/>
        ${certified
          ?`<circle cx="16" cy="16" r="8" fill="${fillCol}" opacity=".4"/><path d="M10 16L14 20.5L22 11" stroke="#07060E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
          :`<circle cx="16" cy="16" r="8" fill="${fillCol}" opacity=".15"/>${glyphEl}`}
      </svg>`;
    }

    const sealSVG=makeSeal(isFail?'✕':String(i+1),col,inkCol,isCert);
    const isSameDay=(g.dayIdx_A??g.dayIdx)===(g.dayIdx_B??g.dayIdx);
    const dayRows=isSameDay?[g.dayL_A||g.dayL]:[g.dayL_A||g.dayL,g.dayL_B];
    const wrapRect=wrap.getBoundingClientRect();

    dayRows.forEach((dayL,di)=>{
      const rowEl=document.getElementById(`${containerId}-row-${dayL}`);
      if(!rowEl)return;
      const pos=timeToBandPos(g.startTime,g.endTime,rowEl);
      if(!pos)return;
      const showText=pos.width>72,showCount=pos.width>50;
      const rowRect=rowEl.getBoundingClientRect();
      const bandLeft=(rowRect.left-wrapRect.left)+pos.left;
      const bandTop=rowRect.top-wrapRect.top;
      const opacity=di===1?'0.82':'1';
      const stampCode=di===0
        ?(isSameDay
          ?(isCert?(committed.turmaCodeA||committed.turmaCode||`T${i+1}A`):`T${i+1}A`)
          :(isCert?(committed.turmaCodeA||`T${i+1}A`):`T${i+1}A`))
        :(isCert?(committed.turmaCodeB||`T${i+1}B`):`T${i+1}B`);

      const band=document.createElement('div');
      band.className='sg-stamp';
      band.style.cssText=[
        `left:${bandLeft}px`,`top:${bandTop+2}px`,`width:${pos.width}px`,
        `height:${rowEl.offsetHeight-4}px`,`background:${bandBg}`,
        `border-left:3px solid ${borderCol}`,`border-top:.5px solid ${borderCol}`,
        `border-right:.5px solid ${col}22`,`border-bottom:.5px solid ${col}22`,
        `opacity:${opacity}`,
      ].join(';');
      band.innerHTML=`<div class="sg-stamp-seal">${sealSVG}</div>${showText?`<span class="sg-stamp-code" style="color:${inkCol}">${stampCode}</span>`:''}${showCount?`<span class="sg-stamp-count" style="color:${inkCol}">${n}<span style="opacity:.4">/${MAX_G}</span></span>`:''}`;
      band.addEventListener('click',e=>{e.stopPropagation();openGroupModal(levelKey,i);});
      wrap.appendChild(band);
    });
  });
}

/* ══════════════════════════════════════════════
   PAIR ENGINE v2
══════════════════════════════════════════════ */
function buildProposals(levelKey,branch){
  const STEP=30;
  const dept=(levelKey.split('|')[0]||'adults').toLowerCase();
  const all=allE.filter(e=>{
    if(lk(e)!==levelKey)return false;
    if(branch!=='all'&&normB(e.branch)!==branch)return false;
    return true;
  });

  const lockedHere=_lockedRefs[levelKey]||new Set();
  const withReq=all.filter(e=>!!rByRef[e.ref]&&!lockedHere.has(e.ref));

  const studentWindows={};
  withReq.forEach(e=>{
    const a=analysePrefs(e.ref);
    if(!a||!a.windows.length)return;
    studentWindows[e.ref]=a.windows;
  });

  const activePairs=ALM_PAIRS.filter(p=>!(p.examOnly&&dept!=='exam'));

  function coversSlot(windows,dayIdx,startMins){
    return windows.some(w=>w.dayIdx===dayIdx&&w.earliest<=startMins+30&&w.latest>=startMins+CLASS_DUR-30);
  }

  const SLOTS=[];
  for(let t=8*60;t<=20*60-CLASS_DUR;t+=STEP)SLOTS.push(t);

  const freqMap={};
  withReq.forEach(e=>{
    const windows=studentWindows[e.ref];
    if(!windows)return;
    activePairs.forEach((pair,pi)=>{
      SLOTS.forEach(startMins=>{
        const okA=coversSlot(windows,pair.a,startMins);
        const okB=pair.a===pair.b?okA:coversSlot(windows,pair.b,startMins);
        if(!okA||!okB)return;
        const key=`${pi}|${startMins}`;
        if(!freqMap[key])freqMap[key]=new Set();
        freqMap[key].add(e.ref);
      });
    });
  });

  const candidates=Object.entries(freqMap)
    .map(([key,refs])=>({key,refs,count:refs.size}))
    .filter(c=>c.count>=MIN_G)
    .sort((a,b)=>b.count-a.count);

  const placed=new Set();
  const groups=[];

  const studentCandidateCount={};
  candidates.forEach(({refs})=>{refs.forEach(r=>{studentCandidateCount[r]=(studentCandidateCount[r]||0)+1;});});

  candidates.forEach(({key,refs})=>{
    const available=[...refs].filter(r=>!placed.has(r)).sort((a,b)=>(studentCandidateCount[a]||0)-(studentCandidateCount[b]||0));
    if(available.length<MIN_G)return;
    const [piStr,startMinsStr]=key.split('|');
    const pi=parseInt(piStr,10),startMins=parseInt(startMinsStr,10);
    const pair=activePairs[pi];
    if(!pair)return;
    const students=available.slice(0,MAX_G).map(r=>allE.find(e=>e.ref===r)).filter(Boolean);
    students.forEach(e=>placed.add(e.ref));
    groups.push({
      pairDef:pair,
      dayIdx_A:pair.a,dayIdx_B:pair.b,
      dayL_A:pair.aL||DAYS_PT[pair.a],
      dayL_B:pair.bL||DAYS_PT[pair.b],
      dayL:pair.aL||DAYS_PT[pair.a],
      dayIdx:pair.a,
      startMins,
      startTime:minsToT(startMins),
      endTime:minsToT(startMins+CLASS_DUR),
      students,
    });
  });

  const noWindows=withReq.filter(e=>!studentWindows[e.ref]);
  const noGroup=withReq.filter(e=>studentWindows[e.ref]&&!placed.has(e.ref));

  function whyNoGroup(e){
    const windows=studentWindows[e.ref];
    if(!windows)return'Sem janelas de disponibilidade válidas';
    const days=[...new Set(windows.map(w=>w.dayIdx))];
    if(days.length<2)return`Apenas ${days.length} dia(s) disponível — necessita par de dias`;
    const coveredPairs=activePairs.filter(pair=>SLOTS.some(t=>coversSlot(windows,pair.a,t)&&coversSlot(windows,pair.b,t)));
    if(!coveredPairs.length)return'Nenhum par de dias compatível com disponibilidade';
    return'Par de dias sem grupo suficiente (< 5 alunos compatíveis)';
  }

  const sinalizados=[
    ...noWindows.map(e=>({e,reason:'invalid-window',why:'Horário sem janelas válidas reconhecidas'})),
    ...noGroup.map(e=>({e,reason:'no-group',why:whyNoGroup(e)})),
  ];

  return{groups,sinalizados,total:all.length,withRequest:withReq.length,placed:placed.size,invalidWinCt:noWindows.length,noGroupCt:noGroup.length};
}

/* ══════════════════════════════════════════════
   AUDIT
══════════════════════════════════════════════ */
function auditGroupSync(g){
  const log={};
  let passCount=0,warnCount=0,failCount=0;
  const pair=g.pairDef;

  g.students.forEach(e=>{
    const req=rByRef[e.ref];
    if(!req){log[e.ref]={verdict:'fail',reason:'Sem pedido registado'};failCount++;return;}
    const raw=parseDayPrefs(req.slots||req.day_preferences);
    const slotsA=[],slotsB=[];
    raw.forEach(p=>{
      const s=parseSlot(p);if(!s)return;
      if(s.dayIdx===g.dayIdx_A)slotsA.push(s);
      if(pair&&pair.a!==pair.b&&s.dayIdx===g.dayIdx_B)slotsB.push(s);
    });
    const fitsA=slotsA.some(s=>s.fromMins<=g.startMins&&s.toMins>=g.startMins+CLASS_DUR);
    const fitsB=pair&&pair.a!==pair.b?slotsB.some(s=>s.fromMins<=g.startMins&&s.toMins>=g.startMins+CLASS_DUR):fitsA;
    const hasA=slotsA.length>0;
    const hasB=pair&&pair.a!==pair.b?slotsB.length>0:hasA;
    let verdict='pass',reason='Par de dias confirmado';
    if(!hasA&&!hasB){verdict='fail';reason=`Não pediu ${g.dayL_A||g.dayL} nem ${g.dayL_B||g.dayL}`;}
    else if(!hasA){verdict='fail';reason=`Não pediu ${g.dayL_A||g.dayL}`;}
    else if(pair&&pair.a!==pair.b&&!hasB){verdict='fail';reason=`Não pediu ${g.dayL_B}`;}
    else if(!fitsA||!fitsB){
      verdict='warn';
      const which=!fitsA?(g.dayL_A||g.dayL):(g.dayL_B||g.dayL);
      reason=`${which} · ${minsToT(g.startMins)}–${minsToT(g.startMins+CLASS_DUR)} não cabe na janela declarada`;
    }
    log[e.ref]={verdict,reason};
    if(verdict==='pass')passCount++;else if(verdict==='warn')warnCount++;else failCount++;
  });

  const sizeStatus=g.students.length<ASSIGN_MIN?'warn':'pass';
  const auditStatus=failCount>0?'fail':(warnCount>0||sizeStatus==='warn')?'warn':'pass';
  if(sizeStatus==='warn'){Object.keys(log).forEach(ref=>{if(log[ref].verdict==='pass')log[ref].sizeWarn=`Grupo com ${g.students.length} alunos — mínimo para abertura é ${ASSIGN_MIN}`;});}
  return{status:auditStatus,passCount,warnCount:warnCount+(sizeStatus==='warn'?1:0),failCount,log,sizeWarn:sizeStatus==='warn'};
}

/* ══════════════════════════════════════════════
   COMMIT — single session row
══════════════════════════════════════════════ */
async function commitGroup(levelKey,groupIdx){
  const result=_allResults[levelKey];if(!result)return null;
  const g=result.groups[groupIdx];if(!g)return null;
  const meta=LEVEL_MAP[levelKey]||{};
  const branch=activeLoc==='all'?(normB(g.students[0]?.branch)||'FUNCHAL'):activeLoc;
  const seqNum=generateTurmaCodeSync(branch);
  const codeA=`${seqNum}A`,codeB=`${seqNum}B`,groupCode=`${seqNum}`;
  const ar=(_auditResults[levelKey]||{})[groupIdx]||{};
  const studentRefs=g.students.map(s=>s.ref);
  const baseRow={
    group_code:groupCode,academic_year:AY,branch,
    lang:((g.students[0]||{}).lang||'EN').toUpperCase().slice(0,2),
    department:meta.dept||'adults',
    level_code:(levelKey.split('|')[1]||'').trim(),
    level_display:meta.label||'',
    start_time:g.startTime,end_time:g.endTime,duration_min:CLASS_DUR,
    student_refs:studentRefs,status:'confirmed',locked:true,
    assignment_source:'decision_panel',
    audit_log:ar.log||{},audited_at:new Date().toISOString(),
    pass_count:ar.passCount||g.students.length,warn_count:ar.warnCount||0,fail_count:ar.failCount||0,
  };
  const rowA={...baseRow,turma_code:codeA,day_of_week:g.dayL_A||g.dayL,hour:Math.floor(g.startMins/60)};
  const rows=[rowA];
  if((g.dayIdx_A??g.dayIdx)!==(g.dayIdx_B??g.dayIdx)){
    rows.push({...baseRow,turma_code:codeB,day_of_week:g.dayL_B||g.dayL_A,hour:Math.floor(g.startMins/60)});
  }
  const r=await fetch(`${SB}/rest/v1/classes`,{method:'POST',headers:{...H,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(rows)});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  _retiredCodes.add(groupCode);_retiredCodes.add(codeA);_retiredCodes.add(codeB);
  if(!_groupCodes[levelKey])_groupCodes[levelKey]={};
  _groupCodes[levelKey][groupIdx]={turmaCode:groupCode,turmaCodeA:codeA,turmaCodeB:codeB,sentAt:new Date().toISOString(),status:ar.status||'pass',locked:true};
  const sealBase={group_code:groupCode,level_code:(levelKey.split('|')[1]||'').trim(),department:meta.dept||'adults',branch,start_time:g.startTime,end_time:g.endTime,student_refs:studentRefs,academic_year:AY};
  await fetch(`${SB}/rest/v1/certification_seals`,{method:'POST',headers:{...H,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify([
    {...sealBase,turma_code:codeA,day:g.dayL_A||g.dayL},
    ...((g.dayIdx_A??g.dayIdx)!==(g.dayIdx_B??g.dayIdx)?[{...sealBase,turma_code:codeB,day:g.dayL_B}]:[]),
  ])});
  return groupCode;
}

async function loadNextSeqBase(){
  try{
    const rows=await sbGet('classes',`select=turma_code&academic_year=eq.${encodeURIComponent(AY)}&limit=500`);
    const maxByBranch={};
    rows.forEach(r=>{const m=(r.turma_code||'').match(/^([A-Z]{2,4})-(\d+)[AB]?$/);if(!m)return;const bc=m[1],n=parseInt(m[2],10);if(!maxByBranch[bc]||n>maxByBranch[bc])maxByBranch[bc]=n;});
    Object.keys(maxByBranch).forEach(bc=>{_nextSeqBase[bc]=maxByBranch[bc]+1;});
  }catch(e){console.warn('loadNextSeqBase failed',e);}
}

function generateTurmaCodeSync(branch){
  const bc=BC[normB(branch)]||'XXX';
  if(_nextSeqBase[bc]===undefined)_nextSeqBase[bc]=1;
  const n=_nextSeqBase[bc]++;
  return`${bc}-${String(n).padStart(2,'0')}`;
}

/* ══════════════════════════════════════════════
   BOOT AUDIT
══════════════════════════════════════════════ */
async function runBootAudit(){
  const levelKeys=Object.keys(LEVEL_MAP);
  const total=levelKeys.length;let done=0;
  await loadNextSeqBase();
  setBoot('A agrupar e auditar todos os níveis…');
  for(const key of levelKeys){
    const allGroups=[],allSinal=[];let totalPlaced=0,totalWithReq=0,totalAll=0;
    for(const branch of BRANCH_ORDER){
      const result=buildProposals(key,branch);
      if(!result.groups.length&&!result.sinalizados.length)continue;
      const offset=allGroups.length;
      allGroups.push(...result.groups);allSinal.push(...result.sinalizados);
      totalPlaced+=result.placed;totalWithReq+=result.withRequest;totalAll+=result.total;
      if(!_auditResults[key])_auditResults[key]={};
      result.groups.forEach((g,i)=>{_auditResults[key][offset+i]=auditGroupSync(g);});
    }
    if(allGroups.length){_allResults[key]={groups:allGroups,sinalizados:allSinal,total:totalAll,withRequest:totalWithReq,placed:totalPlaced};}
    done++;setBootProgress(40+Math.round(done/total*40));
  }
  setBoot('A verificar turmas existentes…');
  try{
    const existing=await sbGet('classes',`select=turma_code,group_code,level_code,department,student_refs&academic_year=eq.${encodeURIComponent(AY)}`);
    if(!window._dbPlacedByLevel)window._dbPlacedByLevel={};
    existing.forEach(c=>{
      if(c.turma_code)_retiredCodes.add(c.turma_code);
      const key=`${(c.department||c.family||'').toLowerCase()}|${(c.level_code||'').trim()}`;
      const refs=Array.isArray(c.student_refs)?c.student_refs:[];
      if(!window._dbPlacedByLevel[key])window._dbPlacedByLevel[key]=new Set();
      refs.forEach(r=>window._dbPlacedByLevel[key].add(r));
    });
    existing.forEach(c=>{
      const gc=c.group_code||(c.turma_code?(c.turma_code.replace(/[AB]$/,'')):null);if(!gc)return;
      const key=`${(c.department||c.family||'').toLowerCase()}|${(c.level_code||'').trim()}`;
      const result=_allResults[key];if(!result)return;
      const dbRefs=new Set(Array.isArray(c.student_refs)?c.student_refs:[]);
      result.groups.forEach((g,i)=>{
        if((_groupCodes[key]||{})[i])return;
        const overlap=g.students.filter(s=>dbRefs.has(s.ref)).length;
        if(overlap>=Math.floor(g.students.length*0.7)){
          if(!_groupCodes[key])_groupCodes[key]={};
          const codeA=`${gc}A`,codeB=`${gc}B`;
          _groupCodes[key][i]={turmaCode:gc,turmaCodeA:codeA,turmaCodeB:codeB,sentAt:'',status:'pass'};
        }
      });
    });
  }catch(dbErr){console.warn('ALM: DB fetch failed',dbErr);}
  setBootProgress(85);
  await reconstructLockedGroups();
  _exceptionQueue=[];
  for(const key of Object.keys(_allResults)){
    const result=_allResults[key];
    result.groups.forEach((g,i)=>{
      const ar=(_auditResults[key]||{})[i];
      if(!ar||ar.status==='pass')return;
      if((_groupCodes[key]||{})[i])return;
      _exceptionQueue.push({levelKey:key,groupIdx:i,group:g,auditResult:ar});
    });
  }
  setBootProgress(100);
  (function reconcileDBvsEngine(){
    const warnings=[];
    Object.keys(window._dbPlacedByLevel||{}).forEach(key=>{
      const dbCount=(window._dbPlacedByLevel[key]?.size)||0;
      const engineCount=_allResults[key]?.placed||0;
      const diff=Math.abs(dbCount-engineCount);
      if(diff>2){const label=(LEVEL_MAP[key]||{}).label||key;warnings.push(`${label}: DB=${dbCount} / Engine=${engineCount}`);}
    });
    if(warnings.length){console.warn('⚠ ALM reconciliation divergence:\n'+warnings.join('\n'));showToast(`⚠ ${warnings.length} nível${warnings.length!==1?'is':''} com divergência DB/engine`,'warn');}
  })();
  return{committed:0,exceptions:_exceptionQueue.length};
}

function setBootProgress(pct){const f=document.getElementById('boot-bar-fill');if(f)f.style.width=pct+'%';}
function setBoot(msg){const s=document.getElementById('boot-sub');if(s)s.textContent=msg;}

/* ══════════════════════════════════════════════
   EXCEPTION BAR
══════════════════════════════════════════════ */
function renderExcBar(){
  const bar=document.getElementById('exc-bar');
  if(!_bootComplete){bar.classList.add('hidden');return;}
  bar.classList.remove('hidden');
const fails=_exceptionQueue.filter(e=>e.auditResult.status==='fail');
  const warns=_exceptionQueue.filter(e=>e.auditResult.status==='warn');
  const total=_exceptionQueue.length;
  // session count: each group is 2 sessions (A+B) unless same-day
  const sessionCount=q=>q.reduce((n,e)=>{const g=e.group;return n+(((g.dayIdx_A??g.dayIdx)===(g.dayIdx_B??g.dayIdx))?1:2);},0);
  const totalSessions=sessionCount(_exceptionQueue);
  const warnSessions=sessionCount(warns);
  const lbl=document.getElementById('exc-bar-lbl');
  const items=document.getElementById('exc-items');
  const btn=document.getElementById('exc-confirm-btn');
  if(total===0){
    bar.className='exc-bar clear';lbl.textContent='✓ TUDO CERTIFICADO';
    let totalGroups=0,totalPlaced=0;
    Object.keys(_groupCodes).forEach(key=>{totalGroups+=Object.keys(_groupCodes[key]||{}).length;const result=_allResults[key];if(result)totalPlaced+=result.placed||0;});
    const branches=[...new Set(allE.map(e=>normB(e.branch)).filter(Boolean))].length;
    items.innerHTML=`<span style="font-size:8px;color:var(--green);padding:0 14px;display:flex;align-items:center;gap:18px"><span>Todos os grupos auditados e certificados automaticamente.</span><span style="font-size:9px;font-weight:700;color:var(--green);border-left:1px solid var(--green-b);padding-left:14px">${totalGroups} turma${totalGroups!==1?'s':''} criada${totalGroups!==1?'s':''}</span><span style="font-size:9px;font-weight:700;color:var(--teal)">${totalPlaced} alunos alocados</span><span style="font-size:8px;color:rgba(29,184,122,.5)">${allE.length} inscritos · ${branches} filiai${branches!==1?'s':''}</span></span>`;
    btn.className='exc-confirm-btn disabled';btn.style.display='none';return;
  }
  bar.className=fails.length>0?'exc-bar fail':'exc-bar';
  lbl.textContent=fails.length>0?'EXCEPÇÕES':'AVISOS';
  const byLevel={};
  _exceptionQueue.forEach(exc=>{const lb=(LEVEL_MAP[exc.levelKey]||{}).label||exc.levelKey;if(!byLevel[lb])byLevel[lb]={f:0,w:0};if(exc.auditResult.status==='fail')byLevel[lb].f++;else byLevel[lb].w++;});
  items.innerHTML=Object.entries(byLevel).map(([lb,c])=>`<div class="exc-chip ${c.f>0?'fail':'warn'}" onclick="showAllExceptions()">${lb} · ${c.f>0?c.f+'F':''}${c.w>0?' '+c.w+'W':''}</div>`).join('');
 if(fails.length===0){btn.className='exc-confirm-btn ready';btn.textContent=`✓ Confirmar ${warnSessions} sessõe${warnSessions!==1?'s':''} (${warns.length} grupo${warns.length!==1?'s':''})`;}
  else{btn.className='exc-confirm-btn disabled';btn.textContent=`${fails.length} falha${fails.length!==1?'s':''} bloqueiam confirmação`;}
}

function jumpToException(levelKey,groupIdx){
  activeLevelKey=levelKey;_lastResult=_allResults[levelKey];
  switchCC('formation',document.getElementById('tab-formation'));
  renderTree();renderLevelContent();
  setTimeout(()=>{const c=document.getElementById(`gcard-${groupIdx}`);if(c)c.scrollIntoView({behavior:'smooth',block:'start'});},120);
}

function batchConfirm(){
  const btn=document.getElementById('exc-confirm-btn');
  if(btn.classList.contains('disabled'))return;
  const warns=_exceptionQueue.filter(e=>e.auditResult.status==='warn');
  if(!warns.length)return;
  const existing=document.getElementById('bc-overlay');if(existing)existing.remove();
  const overlay=document.createElement('div');
  overlay.id='bc-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.65);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  const rows=warns.map(exc=>{
    const meta=LEVEL_MAP[exc.levelKey]||{},g=exc.group;
    const session=`${g.dayL_A||g.dayL} ${minsToT(g.startMins)}–${minsToT(g.startMins+CLASS_DUR)}`;
    const warnReasons=[...new Set(Object.values(exc.auditResult.log||{}).map(l=>l.reason||l.sizeWarn||'').filter(Boolean))];
    const reasonText=exc.auditResult.sizeWarn?`${g.students.length} alunos (mín. ${ASSIGN_MIN})`:warnReasons[0]||'aviso';
    const col=slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
    return`<tr style="border-bottom:.5px solid rgba(255,255,255,.06)"><td style="padding:7px 10px;font-size:9px;font-weight:600;color:${meta.color||'var(--gold2)'}">${meta.label||exc.levelKey}</td><td style="padding:7px 10px;font-size:9px;color:${col}">${session}</td><td style="padding:7px 10px;font-size:9px;font-weight:700;color:var(--t);text-align:center">${g.students.length}</td><td style="padding:7px 10px;font-size:8px;color:var(--amber);font-style:italic">⚠ ${reasonText}</td></tr>`;
  }).join('');
  overlay.innerHTML=`<div style="width:min(680px,96vw);max-height:80dvh;background:var(--bg-d);border-radius:18px;border:.5px solid rgba(255,255,255,.10);display:flex;flex-direction:column;overflow:hidden;animation:shUp .24s cubic-bezier(.32,.72,0,1)"><div style="padding:18px 20px 14px;border-bottom:.5px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;flex-shrink:0"><div style="flex:1"><div style="font-family:var(--display);font-size:22px;letter-spacing:4px;color:var(--amber)">CERTIFICAR AVISOS</div><div style="font-size:8px;color:rgba(255,255,255,.38);margin-top:3px;letter-spacing:.1em">${warns.length} grupos · escrita na base de dados</div></div><button onclick="document.getElementById('bc-overlay').remove()" style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;color:rgba(255,255,255,.6);font-size:13px">✕</button></div><div style="overflow-y:auto;flex:1;padding:8px 0"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)"><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:left">Nível</th><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:left">Sessão</th><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:center">Al</th><th style="padding:6px 10px;font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);text-align:left">Aviso</th></tr></thead><tbody>${rows}</tbody></table></div><div style="padding:12px 20px;border-top:.5px solid rgba(255,255,255,.08);display:flex;gap:10px;flex-shrink:0"><button onclick="document.getElementById('bc-overlay').remove()" style="height:40px;padding:0 20px;background:transparent;border:.5px solid rgba(255,255,255,.12);border-radius:10px;color:var(--t3);font-family:var(--mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.08em">Cancelar</button><button id="bc-confirm-btn" onclick="batchConfirmExecute()" style="flex:1;height:40px;background:rgba(232,160,32,.85);border:none;border-radius:10px;color:#09080F;font-family:var(--mono);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.1em;transition:all .2s">✓ CERTIFICAR ${warns.length} GRUPOS</button></div></div>`;
  document.body.appendChild(overlay);
}

async function batchConfirmExecute(){
  const btn=document.getElementById('bc-confirm-btn');
  if(btn)btn.disabled=true;if(btn)btn.textContent='⏳ A certificar…';
  const warns=_exceptionQueue.filter(e=>e.auditResult.status==='warn');
  let ok=0;
  for(const exc of warns){try{await commitGroup(exc.levelKey,exc.groupIdx);ok++;}catch{}}
  _exceptionQueue=_exceptionQueue.filter(e=>e.auditResult.status!=='warn');
  document.getElementById('bc-overlay')?.remove();
  showToast(`${ok} turma${ok!==1?'s':''} com avisos certificadas`,'warn');
  renderExcBar();if(activeLevelKey&&_allResults[activeLevelKey])renderLevelContent();
}
function showAllExceptions(){if(_exceptionQueue.length)jumpToException(_exceptionQueue[0].levelKey,_exceptionQueue[0].groupIdx);}
function overrideException(levelKey,groupIdx){
  _exceptionQueue=_exceptionQueue.filter(e=>!(e.levelKey===levelKey&&e.groupIdx===groupIdx));
  commitGroup(levelKey,groupIdx).then(code=>{showToast(`Turma ${code||''} aceite com excepção`,'warn');renderExcBar();renderLevelContent();}).catch(err=>showToast('Erro: '+err.message,'err'));
}

/* ══════════════════════════════════════════════
   DECISION PANEL
══════════════════════════════════════════════ */
function decStuChips(students,ar){
  return[...students].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(e=>{
    const av=avCol(e.name||e.ref),verdict=ar?.log?.[e.ref]?.verdict||'pass';
    const vCol=verdict==='pass'?'var(--green)':verdict==='warn'?'var(--amber)':'var(--red)';
    return'<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;background:var(--bg3);border:1px solid var(--b);cursor:pointer" onclick="openDossier(\''+e.ref+'\')">'
      +'<div style="width:16px;height:16px;border-radius:50%;background:'+av.bg+';color:'+av.t+';font-size:6px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+avInit(e.name||e.ref)+'</div>'
      +'<span style="font-size:8px;color:var(--t)">'+(e.name||e.ref)+'</span>'
      +'<span style="font-size:7px;color:'+vCol+'">'+(verdict==='pass'?'✓':'⚠')+'</span>'
      +'</div>';
  }).join('');
}

async function renderDecision(){
  const triageEl=document.getElementById('dec-triage-list'),mainEl=document.getElementById('dec-main');
  if(!triageEl||!mainEl)return;

  triageEl.innerHTML=`<div class="spinner-wrap"><div class="spinner"></div>A carregar…</div>`;

  try{
    const rows=await sbGet('classes',`select=turma_code,group_code,level_code,department,day_of_week,start_time,end_time,student_refs&academic_year=eq.${encodeURIComponent(AY)}&locked=eq.true`);
    const byGC={};
    rows.forEach(c=>{
      const gc=c.group_code||(c.turma_code?.replace(/[AB]$/i,''));
      if(!gc)return;
      if(!byGC[gc])byGC[gc]=[];
      byGC[gc].push(c);
    });
    Object.values(byGC).forEach(groupRows=>{
      const first=groupRows[0];
      const key=`${(first.department||'').toLowerCase()}|${(first.level_code||'').trim()}`;
      if(!_allResults[key]){
        const refs=Array.isArray(first.student_refs)?first.student_refs:[];
        const students=refs.map(r=>allE.find(e=>e.ref===r)).filter(Boolean);
        if(!students.length)return;
        const startMins=timeToMins(first.start_time)??8*60;
        const dayRaw=(first.day_of_week||'').toUpperCase().trim();
        const dayIdx=DAYS_PT.indexOf(dayRaw);if(dayIdx<0)return;
        const rowB=groupRows.find(r=>r.turma_code!==first.turma_code);
        const dayRawB=rowB?(rowB.day_of_week||'').toUpperCase().trim():dayRaw;
        const dayIdxB=rowB?DAYS_PT.indexOf(dayRawB):dayIdx;
        const pairDef=ALM_PAIRS.find(p=>p.a===dayIdx&&p.b===dayIdxB)||null;
        _allResults[key]={groups:[{
          pairDef,dayIdx_A:dayIdx,dayIdx_B:dayIdxB,
          dayL_A:DAYS_PT[dayIdx],dayL_B:DAYS_PT[dayIdxB],
          dayIdx,dayL:DAYS_PT[dayIdx],startMins,
          startTime:minsToT(startMins),endTime:minsToT(startMins+CLASS_DUR),
          students,_locked:true
        }],sinalizados:[],total:students.length,withRequest:students.length,placed:students.length};
        if(!_auditResults[key])_auditResults[key]={};
        _auditResults[key][0]=auditGroupSync(_allResults[key].groups[0]);
      }
      const gc=first.group_code||(first.turma_code?.replace(/[AB]$/i,''));
      const result=_allResults[key];
      if(!result?.groups)return;
      const dbRefs=new Set(Array.isArray(first.student_refs)?first.student_refs:[]);
      result.groups.forEach((g,i)=>{
        const overlap=g.students.filter(s=>dbRefs.has(s.ref)).length;
        if(overlap>=Math.floor(g.students.length*0.5)){
          if(!_groupCodes[key])_groupCodes[key]={};
          const codeA=groupRows.find(r=>/A$/i.test(r.turma_code))?.turma_code||`${gc}A`;
          const codeB=groupRows.find(r=>/B$/i.test(r.turma_code))?.turma_code||`${gc}B`;
          _groupCodes[key][i]={turmaCode:gc,turmaCodeA:codeA,turmaCodeB:codeB,sentAt:'',status:'pass',locked:true};
        }
      });
    });
  }catch(e){console.warn('renderDecision DB fetch failed',e);}

  let totalSessions=0,certifiedSessions=0;
  Object.keys(_allResults).forEach(key=>{
    const result=_allResults[key];if(!result?.groups?.length)return;
    result.groups.forEach((g,i)=>{
      const committed=(_groupCodes[key]||{})[i];
      const isSameDay=(g.dayIdx_A??g.dayIdx)===(g.dayIdx_B??g.dayIdx);
      const sessionCount=isSameDay?1:2;
      totalSessions+=sessionCount;
      if(committed){
        if(committed.turmaCodeA)certifiedSessions++;
        if(!isSameDay&&committed.turmaCodeB)certifiedSessions++;
      }
    });
  });
  const pendingSessions=totalSessions-certifiedSessions;
  const pct=totalSessions>0?Math.round(certifiedSessions/totalSessions*100):0;
  document.getElementById('dec-sidebar-sub').textContent=`${certifiedSessions} sessões cert. · ${pendingSessions} por certificar`;
  const fill=document.getElementById('dec-progress-fill');if(fill)fill.style.width=pct+'%';

  const byLevel={};
  Object.keys(_allResults).forEach(key=>{
    const result=_allResults[key];if(!result?.groups?.length)return;
    let pending=0,certified=0;
    result.groups.forEach((g,i)=>{
      const committed=(_groupCodes[key]||{})[i];
      const isSameDay=(g.dayIdx_A??g.dayIdx)===(g.dayIdx_B??g.dayIdx);
      if(!committed?.turmaCodeA)pending++;else certified++;
      if(!isSameDay){if(!committed?.turmaCodeB)pending++;else certified++;}
    });
    byLevel[key]={pending,certified};
  });

  if(!Object.keys(byLevel).length){
    triageEl.innerHTML=`<div style="padding:20px;text-align:center;color:var(--t3);font-size:8px;letter-spacing:.1em">Sem grupos formados ainda</div>`;
    mainEl.innerHTML=`<div class="placeholder-main"><div class="placeholder-icon">✓</div><div class="placeholder-text">← Seleccione um grupo</div></div>`;
    return;
  }

  triageEl.innerHTML=Object.entries(byLevel).map(([key,{pending,certified}])=>{
    const meta=LEVEL_MAP[key]||{};
    const result=_allResults[key];
    const hasFails=result?.groups?.some((g,i)=>(_auditResults[key]||{})[i]?.status==='fail'&&!(_groupCodes[key]||{})[i]);
    const hasWarns=result?.groups?.some((g,i)=>(_auditResults[key]||{})[i]?.status==='warn'&&!(_groupCodes[key]||{})[i]);
    const allCert=pending===0;
    const col=hasFails?'var(--red)':allCert?'var(--green)':hasWarns?'var(--amber)':'var(--gold2)';
    const statusLabel=hasFails?'FAIL':allCert?'✓':hasWarns?'WARN':`${pending}↓`;
    return`<div class="dec-triage-item${hasFails?' exception':allCert?' certified':''}" onclick="decShowLevel('${key}')">
      <div class="lp-lv-dot" style="background:${meta.color||'var(--t3)'}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:9px;font-weight:600;color:var(--t)">${meta.label||key}</div>
        <div style="font-size:7px;color:var(--t3);margin-top:1px">${allCert?`${certified} cert. ✓`:`${pending} por cert.`}</div>
      </div>
      <span style="font-size:7px;font-weight:700;color:${col};padding:1px 6px;border:1px solid ${col}55">${statusLabel}</span>
    </div>`;
  }).join('');

  const firstKey=Object.keys(byLevel)[0];if(firstKey)decShowLevel(firstKey);
}

function decShowLevel(levelKey){
  const mainEl=document.getElementById('dec-main');
  const result=_allResults[levelKey];
  if(!result?.groups?.length){mainEl.innerHTML='<div class="placeholder-main"><div class="placeholder-text">Sem grupos</div></div>';return;}
  const meta=LEVEL_MAP[levelKey]||{};

  // Build one card per session (A and B independently)
  const sessionCards=[];
  result.groups.forEach((g,i)=>{
    const committed=(_groupCodes[levelKey]||{})[i];
    const ar=(_auditResults[levelKey]||{})[i];
    const isSameDay=(g.dayIdx_A??g.dayIdx)===(g.dayIdx_B??g.dayIdx);
    const slots=isSameDay
      ?[{suffix:'A',dayL:g.dayL_A||g.dayL,dayIdx:g.dayIdx_A??g.dayIdx}]
      :[
        {suffix:'A',dayL:g.dayL_A||g.dayL,dayIdx:g.dayIdx_A??g.dayIdx},
        {suffix:'B',dayL:g.dayL_B||g.dayL,dayIdx:g.dayIdx_B??g.dayIdx},
      ];
    slots.forEach(({suffix,dayL})=>{
      const alreadyCert=committed&&(suffix==='A'?!!committed.turmaCodeA:!!committed.turmaCodeB);
      if(alreadyCert)return;
      const slotCode=committed
        ?(suffix==='A'?(committed.turmaCodeA||`${committed.turmaCode}A`):(committed.turmaCodeB||`${committed.turmaCode}B`))
        :`T${i+1}${suffix}`;
      sessionCards.push({groupIdx:i,suffix,dayL,slotCode,g,ar});
    });
  });

  const pending=sessionCards.length;
  let html=`<div class="sec" style="margin-bottom:14px">${meta.label||levelKey} · ${pending} sessão${pending!==1?'ões':''} por certificar</div>`;

  sessionCards.forEach(({groupIdx,suffix,dayL,slotCode,g,ar})=>{
    const slotC=slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
    const session=`${dayL} · ${minsToT(g.startMins)}–${minsToT(g.startMins+CLASS_DUR)}`;
    const auditSummary=ar
      ?`<span style="font-size:7px;font-weight:700;color:var(--green);padding:1px 6px;border:1px solid var(--green-b);background:var(--green-a)">✓ ${ar.passCount}</span>`
      +(ar.warnCount?`<span style="font-size:7px;font-weight:700;color:var(--amber);padding:1px 6px;border:1px solid var(--amber-b);background:var(--amber-a);margin-left:4px">⚠ ${ar.warnCount}</span>`:'')
      +(ar.failCount?`<span style="font-size:7px;font-weight:700;color:var(--red);padding:1px 6px;border:1px solid var(--red-b);background:var(--red-a);margin-left:4px">✕ ${ar.failCount}</span>`:'')
      :'';
    html+=`<div class="dec-card" id="dec-card-${groupIdx}-${suffix}" style="border-left-color:${slotC}">
      <div class="dc-hdr" onclick="this.parentElement.classList.toggle('open')">
        <span class="dc-arr">›</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:600;color:${slotC}">${slotCode} · ${session}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px">${auditSummary}</div>
        </div>
        <div style="font-size:22px;font-weight:700;color:${slotC};line-height:1;margin-right:10px">${g.students.length}</div>
        <button class="dc-btn dc-btn-create" id="dec-btn-${groupIdx}-${suffix}"
          onclick="event.stopPropagation();decCertifySession('${levelKey}',${groupIdx},'${suffix}',this)">✓ Certificar</button>
      </div>
      <div class="dc-body">
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${decStuChips(g.students,ar)}</div>
      </div>
    </div>`;
  });

  if(!sessionCards.length){
    html+=`<div style="padding:40px;text-align:center;color:var(--green);font-size:9px;letter-spacing:.1em">✓ Todas as sessões deste nível certificadas</div>`;
  }

  mainEl.innerHTML=html;
}

async function decCertifySession(levelKey,groupIdx,suffix,btn){
  const g=_allResults[levelKey]?.groups[groupIdx];
  if(!g){showToast('Grupo não encontrado','err');return;}
  const meta=LEVEL_MAP[levelKey]||{};
  const ar=(_auditResults[levelKey]||{})[groupIdx]||{};
  const dayL=suffix==='A'?(g.dayL_A||g.dayL):(g.dayL_B||g.dayL_A||g.dayL);

const confirmed=await almConfirm({
    title:'CERTIFICAR SESSÃO',
    accent:'var(--green)',
    okBg:'rgba(29,184,122,.9)',
    okLabel:'✓ Certificar',
    lines:[
      `${meta.label||levelKey} · ${dayL} ${minsToT(g.startMins)}–${minsToT(g.startMins+CLASS_DUR)}`,
      `${g.students.length} alunos`,
    ],
  });
  if(!confirmed)return;

  btn.disabled=true;btn.textContent='⏳ A certificar…';

  try{
    const branch=activeLoc==='all'?(normB(g.students[0]?.branch)||'FUNCHAL'):activeLoc;

    // Reuse existing group_code if sibling session already committed, else mint new
    let groupCode=(_groupCodes[levelKey]||{})[groupIdx]?.turmaCode||null;
    if(!groupCode){
      groupCode=generateTurmaCodeSync(branch);
    }
    const sessionCode=`${groupCode}${suffix}`;

    const row={
      group_code:groupCode,
      turma_code:sessionCode,
      academic_year:AY,
      branch,
      lang:((g.students[0]||{}).lang||'EN').toUpperCase().slice(0,2),
      department:(LEVEL_MAP[levelKey]||{}).dept||'adults',
      level_code:(levelKey.split('|')[1]||'').trim(),
      level_display:(LEVEL_MAP[levelKey]||{}).label||'',
      day_of_week:dayL,
      hour:Math.floor(g.startMins/60),
      start_time:g.startTime,
      end_time:g.endTime,
      duration_min:CLASS_DUR,
      student_refs:g.students.map(s=>s.ref),
      status:'confirmed',
      locked:true,
      assignment_source:'decision_panel',
      audit_log:ar.log||{},
      audited_at:new Date().toISOString(),
      pass_count:ar.passCount||g.students.length,
      warn_count:ar.warnCount||0,
      fail_count:ar.failCount||0,
    };

    const r=await fetch(`${SB}/rest/v1/classes`,{
      method:'POST',
      headers:{...H,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify([row])
    });
    if(!r.ok)throw new Error(`HTTP ${r.status}`);

    _retiredCodes.add(sessionCode);

    // Update local _groupCodes — merge with existing to preserve sibling
    if(!_groupCodes[levelKey])_groupCodes[levelKey]={};
    const existing=_groupCodes[levelKey][groupIdx]||{};
    _groupCodes[levelKey][groupIdx]={
      ...existing,
      turmaCode:groupCode,
      [`turmaCode${suffix}`]:sessionCode,
      sentAt:new Date().toISOString(),
      status:ar.status||'pass',
      locked:true,
    };

    // Mark card certified in UI
    const card=document.getElementById(`dec-card-${groupIdx}-${suffix}`);
    if(card){
      card.style.borderLeftColor='var(--green)';
      card.style.background='rgba(29,184,122,.04)';
      btn.textContent=`✓ ${sessionCode}`;
      btn.style.cssText='border-color:var(--green-b);color:var(--green);background:var(--green-a);padding:4px 12px;border:1px solid;font-family:var(--mono);font-size:8px;font-weight:700;cursor:default;letter-spacing:.04em';
    }

    showToast(`${sessionCode} certificada ✓`,'ok');

    // Remove from exception queue if present
    _exceptionQueue=_exceptionQueue.filter(e=>!(e.levelKey===levelKey&&e.groupIdx===groupIdx));
    renderExcBar();
    renderDecision();

  }catch(e){
    btn.disabled=false;
    btn.textContent='✓ Certificar';
    showToast('Erro: '+e.message,'err');
  }
}

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */
function switchCC(panel,el){
  document.querySelectorAll('.cc-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tb-pill-nav').forEach(t=>t.classList.remove('active'));
  const pEl=document.getElementById('panel-'+panel);if(pEl)pEl.classList.add('active');
  if(el)el.classList.add('active');
if(panel==='audit'){renderAudit();renderAuditTree();}
  if(panel==='decision')renderDecision();
  if(panel==='overview'){_ovActiveLevel=null;refreshData().then(()=>{ovRenderStats();ovRenderTree();ovRenderSummary();});}
}

async function refreshData(){
  try{
    const [enrol,reqs]=await Promise.all([
      sbGet('enrolments',`select=ref,name,branch,lang,family,level_code,level_cefr&academic_year=eq.${AY}&order=ref`),
      sbGet('timetable_requests',`select=ref,branch,family,level_code,level_cefr,slots,day_preferences,status&academic_year=eq.${AY}`),
    ]);
    setConn(true);
    allE=enrol||[];allR=reqs||[];rByRef={};
    allR.forEach(r=>{rByRef[r.ref]=r;});
    document.getElementById('pill-total').textContent=`${allE.length} al`;
    for(const key of Object.keys(LEVEL_MAP)){
      const withReq=allE.filter(e=>lk(e)===key&&!!rByRef[e.ref]);
      if(withReq.length>=MIN_G){
        _allResults[key]=buildProposals(key,'all');
        _auditResults[key]={};
        _allResults[key].groups.forEach((g,i)=>{if(!(_groupCodes[key]||{})[i])_auditResults[key][i]=auditGroupSync(g);});
      } else {delete _allResults[key];}
    }
    await reconstructLockedGroups();
    updateSidebarKPIs();initBranchStrip();renderExcBar();renderTree();
    if(activeLevelKey){_lastResult=_allResults[activeLevelKey]||null;renderLevelContent();}
    document.getElementById('badge-audit').textContent=allE.filter(e=>!rByRef[e.ref]).length||'0';
    document.getElementById('badge-pending').textContent=allE.filter(e=>{const r=rByRef[e.ref];return r&&normS(r.status)==='pendente';}).length||'0';
  }catch(err){setConn(false);console.warn('refreshData error',err);}
}

/* ══════════════════════════════════════════════
   PAIR MATRIX — 1 card per session (A+B split)
══════════════════════════════════════════════ */
function countPair(students,pair){
  return students.filter(e=>{
    const a=analysePrefs(e.ref);if(!a)return false;
    return a.windows.find(w=>w.dayIdx===pair.a)&&a.windows.find(w=>w.dayIdx===pair.b);
  }).length;
}

function buildPairMatrix(pairCounts){
  if(!_lastResult?.groups?.length)return'';
  let html=`<div class="pair-matrix">`;
  _lastResult.groups.forEach((g,i)=>{
    const committed=(_groupCodes[activeLevelKey]||{})[i];
    const ar=(_auditResults[activeLevelKey]||{})[i];
    const isCert=!!committed,isWarn=!isCert&&ar?.status==='warn';
    const col=isWarn?'#E8A020':slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
    const lbl=isCert?'alocados':isWarn?'aguardar':'disponíveis';
    const isSameDay=(g.dayIdx_A??g.dayIdx)===(g.dayIdx_B??g.dayIdx);
    const sessions=isSameDay
      ?[{suffix:'A',dayL:g.dayL_A||g.dayL,code:isCert?(committed.turmaCodeA||committed.turmaCode+'A'||`T${i+1}A`):`T${i+1}A`}]
      :[
        {suffix:'A',dayL:g.dayL_A||g.dayL,code:isCert?(committed.turmaCodeA||`T${i+1}A`):`T${i+1}A`},
        {suffix:'B',dayL:g.dayL_B||g.dayL,code:isCert?(committed.turmaCodeB||`T${i+1}B`):`T${i+1}B`},
      ];
    const start=minsToT(g.startMins),end=minsToT(g.startMins+CLASS_DUR);
    sessions.forEach(({dayL,code})=>{
      html+=`<div style="border:1px solid ${col}44;border-left:3px solid ${col};background:${col}11;padding:11px 12px;cursor:pointer;transition:all .14s;position:relative"
        onclick="openGroupModal('${activeLevelKey}',${i})"
        onmouseover="this.style.background='${col}22'"
        onmouseout="this.style.background='${col}11'">
        <div style="font-size:7px;font-weight:700;color:${col};margin-bottom:2px;letter-spacing:.06em">${code}</div>
        <div style="font-size:9px;font-weight:700;margin-bottom:2px;color:${col}">${dayL}</div>
        <div style="font-size:7.5px;color:${col};opacity:.7;margin-bottom:4px">${start}–${end}</div>
        <div style="font-size:28px;font-weight:700;line-height:1;color:${col}">${g.students.length}</div>
        <div style="font-size:7px;margin-top:3px;color:${col}">${lbl}</div>
        ${isCert?`<div style="position:absolute;top:8px;right:10px;font-size:12px;color:${col}">✓</div>`:''}
        ${isWarn?`<div style="position:absolute;top:8px;right:10px;font-size:10px;color:${col}">⚠</div>`:''}
      </div>`;
    });
  });
  return html+`</div>`;
}

/* ══════════════════════════════════════════════
   GROUP CARD (compact list below matrix)
══════════════════════════════════════════════ */
function buildGroupCard(g,i){
  const committed=(_groupCodes[activeLevelKey]||{})[i];
  const ar=(_auditResults[activeLevelKey]||{})[i];
  const status=ar?.status||'pending';
  const isCert=!!committed,isWarn=!isCert&&status==='warn',isFail=!isCert&&status==='fail',isExc=isWarn||isFail;
  const turmaCode=isCert
    ?(committed.turmaCodeA&&committed.turmaCodeB&&committed.turmaCodeA!==committed.turmaCodeB
      ?`${committed.turmaCodeA}/${committed.turmaCodeB}`
      :committed.turmaCodeA||committed.turmaCode||`T${i+1}`)
    :`T${i+1}`;
  const col=isFail?'#E8455A':isWarn?'#E8A020':slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
  const inkCol=isFail?'#FFB0B8':isWarn?'#FFD080':col;
  const sealBg=isCert?col+'22':isFail?'rgba(232,69,90,.13)':isWarn?'rgba(232,160,32,.13)':col+'11';
  const borderCol=isCert?col+'CC':isFail?'#E8455A99':isWarn?'#E8A02099':col+'66';
  const startT=minsToT(g.startMins),endT=minsToT(g.startMins+CLASS_DUR);
  const blockCls=g.startMins<720?'bk-manha':'bk-tarde',blockLbl=g.startMins<720?'Manhã':'Tarde';
  const cardCls=`gcard-compact${isCert?' certified':isExc?' exception':''}`;
  const sealGlyph=isFail?'✕':String(i+1);
  const dash=isCert?'none':'2 2',outerStroke=isCert?col:col+'99';
  const glyphEl=sealGlyph.length===1
    ?`<text x="16" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${inkCol}" font-family="'IBM Plex Mono',monospace">${sealGlyph}</text>`
    :`<text x="16" y="19" text-anchor="middle" font-size="7" font-weight="700" fill="${inkCol}" font-family="'IBM Plex Mono',monospace" letter-spacing="0.5">${sealGlyph}</text>`;
  const sealSVG=`<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle cx="16" cy="16" r="15" stroke="${outerStroke}" stroke-width="${isCert?2:1.5}"/>
    <circle cx="16" cy="16" r="12" stroke="${col}" stroke-width=".8" opacity=".6"/>
    <circle cx="16" cy="16" r="9" stroke="${col}" stroke-width=".8" stroke-dasharray="${dash}" opacity=".5"/>
    ${isCert
      ?`<circle cx="16" cy="16" r="8" fill="${col}" opacity=".9"/><path d="M10 16L14 20.5L22 11" stroke="#07060E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      :`<circle cx="16" cy="16" r="8" fill="${col}" opacity=".15"/>${glyphEl}`}
  </svg>`;
  const pairLabel=g.pairDef?(g.dayIdx_A===g.dayIdx_B?g.dayL_A:`${g.dayL_A} + ${g.dayL_B}`):(g.dayL||'—');
  return`<div class="${cardCls}" style="border-left-color:${col}" onclick="openGroupModal('${activeLevelKey}',${i})" id="gcard-${i}">
    <div class="gc-seal" style="background:${sealBg};border:1px solid ${borderCol};border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative">${sealSVG}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:10px;font-weight:700;color:${col}">${pairLabel}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
        <span style="font-size:7.5px;color:var(--t2)">${startT} – ${endT}</span>
        <span style="font-size:6.5px;font-weight:700;letter-spacing:.08em;padding:1px 6px;border:1px solid ${col}55;color:${col};background:${col}11">${turmaCode}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:7px;flex-shrink:0">
      <div class="gc-block-tag ${blockCls}">${blockLbl}</div>
      ${isCert?`<div style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--green-b);color:var(--green);background:var(--green-a);letter-spacing:.04em">CERTIFIED</div>`:''}
      ${isExc?`<div style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid ${isFail?'var(--red-b)':'var(--amber-b)'};color:${isFail?'var(--red)':'var(--amber)'}">${isFail?'✕ falha':'⚠ aviso'}</div>`:''}
      <div style="font-size:22px;font-weight:700;color:${col};line-height:1">${g.students.length}</div>
      <div style="font-size:6.5px;color:var(--t3);align-self:flex-end;padding-bottom:2px">/ ${MAX_G}</div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════
   GROUP MODAL
══════════════════════════════════════════════ */
function openGroupModal(levelKey,i){
  const result=_allResults[levelKey];if(!result)return;
  const g=result.groups[i];if(!g)return;
  const ar=(_auditResults[levelKey]||{})[i];
  const committed=(_groupCodes[levelKey]||{})[i];
  const meta=LEVEL_MAP[levelKey]||{};
  const isCert=!!committed,isWarn=!isCert&&ar?.status==='warn',isFail=!isCert&&ar?.status==='fail',isExc=isWarn||isFail;
  const col=isFail?'#E8455A':isWarn?'#E8A020':slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
  const dept=meta.dept||'adults';
  const sheet=document.getElementById('gm-sheet');
  sheet.classList.remove('gm-exit');
  document.getElementById('gm-overlay').classList.add('open');
  document.getElementById('gm-banner').style.background=DEPT_GRADS[dept]||DEPT_GRADS.adults;
  const seal=document.getElementById('gm-seal');
  seal.style.background=col+(isCert?'33':'18');
  seal.innerHTML=isCert
    ?`<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="11" stroke="rgba(7,6,14,.22)" stroke-width="1.5"/><circle cx="14" cy="14" r="7" stroke="rgba(7,6,14,.18)" stroke-width="1" stroke-dasharray="2 2"/><path d="M8 14L12.5 19.5L20 9" fill="none" stroke="#07060E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    :`<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="11" stroke="rgba(7,6,14,.22)" stroke-width="1.5"/><text x="14" y="19" text-anchor="middle" font-size="14" font-weight="700" fill="#07060E" font-family="var(--mono)">${i+1}</text></svg>`;
  const pairLabel=g.pairDef?(g.dayIdx_A===g.dayIdx_B?g.dayL_A:`${g.dayL_A} + ${g.dayL_B}`):(g.dayL||'—');
  const certCode=isCert
    ?(committed.turmaCodeA&&committed.turmaCodeB&&committed.turmaCodeA!==committed.turmaCodeB
      ?`${committed.turmaCodeA} / ${committed.turmaCodeB}`
      :committed.turmaCodeA||committed.turmaCode||'—')
    :null;
  document.getElementById('gm-title').textContent=`TURMA ${i+1}`;
  document.getElementById('gm-sub-text').textContent=`${pairLabel} · ${g.startTime}–${g.endTime} · ${meta.label||''} · ${BRANCH_LABELS[activeLoc]||'Todas filiais'}`;
  const blockLbl=g.startMins<720?'Manhã':'Tarde',blockCls=g.startMins<720?'bk-manha':'bk-tarde';
  document.getElementById('gm-pills').innerHTML=
    `<span class="gc-block-tag ${blockCls}">${blockLbl}</span>`+
    (isCert?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--green-b);color:var(--green);background:var(--green-a)">CERTIFIED · ${certCode}</span>`:'')
    +(isExc?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--amber-b);color:var(--amber);background:var(--amber-a)">⚠ ${ar.warnCount} aviso${ar.warnCount!==1?'s':''}</span>`:'');
  document.getElementById('gm-strip').innerHTML=
    `<div class="gm-stat"><div class="gm-stat-v" style="color:${col}">${g.students.length}</div><div class="gm-stat-l">alunos</div></div>`+
    `<div class="gm-stat"><div class="gm-stat-v" style="color:var(--green)">${ar?.passCount??g.students.length}</div><div class="gm-stat-l">ok</div></div>`+
    (ar?.warnCount?`<div class="gm-stat"><div class="gm-stat-v" style="color:var(--amber)">${ar.warnCount}</div><div class="gm-stat-l">avisos</div></div>`:'')
    +(ar?.failCount?`<div class="gm-stat"><div class="gm-stat-v" style="color:var(--red)">${ar.failCount}</div><div class="gm-stat-l">falhas</div></div>`:'')
    +(isCert?`<div class="gm-stat" style="margin-left:auto"><div class="gm-stat-v" style="color:var(--gold2);font-size:12px">${certCode}</div><div class="gm-stat-l">código</div></div>`:'');

  let sessionInfo='';
  if(g.pairDef&&g.dayIdx_A!==g.dayIdx_B){
    sessionInfo=`<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <div style="font-size:8px;font-weight:700;padding:3px 10px;border:1px solid ${col}44;color:${col};background:${col}0D">
        <span style="opacity:.6">A</span> ${g.dayL_A} ${g.startTime}–${g.endTime}
        ${isCert?`<span style="margin-left:6px;opacity:.7">${committed.turmaCodeA||''}</span>`:''}
      </div>
      <div style="font-size:8px;font-weight:700;padding:3px 10px;border:1px solid ${col}44;color:${col};background:${col}0D;opacity:.85">
        <span style="opacity:.6">B</span> ${g.dayL_B} ${g.startTime}–${g.endTime}
        ${isCert?`<span style="margin-left:6px;opacity:.7">${committed.turmaCodeB||''}</span>`:''}
      </div>
    </div>`;
  }

  const auditPills=ar
    ?`<span class="gm-ap pass">✓ ${ar.passCount} ok</span>`
    +(ar.warnCount?`<span class="gm-ap warn">⚠ ${ar.warnCount} aviso${ar.warnCount!==1?'s':''}</span>`:'')
    +(ar.failCount?`<span class="gm-ap fail">✕ ${ar.failCount} falha${ar.failCount!==1?'s':''}</span>`:'')
    +`<span style="font-size:6.5px;color:var(--t4);margin-left:auto;align-self:center">auditoria automática</span>`
    :'';

  const stuRows=[...g.students].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(e=>{
    const av=avCol(e.name||e.ref);
    const verdict=ar?.log?.[e.ref]?.verdict||'pass';
    const reason=ar?.log?.[e.ref]?.reason||'';
    const a2=analysePrefs(e.ref);
    const slots=a2?a2.windows.map(w=>`${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · '):'—';
    return`<div class="gm-stu" onclick="closeGroupModal();setTimeout(()=>openDossier('${e.ref}'),240)">
      <div class="gm-av" style="background:${av.bg};color:${av.t};border-color:${av.t}55">${avInit(e.name||e.ref)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:var(--text-d)">${e.name||'—'}</div>
        <div style="font-size:9px;color:#E8C97A;font-family:var(--mono);font-weight:600;margin-top:2px">${e.ref} · <span style="color:var(--sub-d);font-weight:400">${slots}</span></div>
        ${reason&&verdict!=='pass'?`<div style="font-size:6.5px;color:var(--amber-d);margin-top:1px">${reason}</div>`:''}
      </div>
     <span class="gm-verd ${verdict}">${verdict==='pass'?'✓':verdict==='warn'?'⚠':'✕'}</span>
      <span style="font-size:9px;color:var(--sub-d)">↗</span>
    </div>`;
  }).join('');

  document.getElementById('gm-body').innerHTML=sessionInfo+`<div class="gm-audit">${auditPills}</div>`+stuRows;
  document.getElementById('gm-foot').innerHTML=
    `<button class="gm-btn gm-btn-csv" onclick="exportGroup('${levelKey}',${i})">↓ CSV</button>`+
    `<button class="gm-btn gm-btn-ghost" onclick="closeGroupModal();setTimeout(()=>openDossier('${g.students[0]?.ref}'),240)">Primeiro dossier ↗</button>`+
    `<div style="margin-left:auto;font-size:7px;color:var(--sub-d)">${g.students.length} aluno${g.students.length!==1?'s':''}</div>`;
}

function closeGroupModal(){
  const s=document.getElementById('gm-sheet');if(!s)return;
  s.classList.add('gm-exit');
  setTimeout(()=>{document.getElementById('gm-overlay')?.classList.remove('open');s.classList.remove('gm-exit');},220);
}

function exportGroup(levelKey,idx){
  const result=_allResults[levelKey];if(!result?.groups[idx])return;
  const g=result.groups[idx],meta=LEVEL_MAP[levelKey]||{};
  const rows=[`ALM · ${meta.label||levelKey} · Turma ${idx+1}`,'','Nome,Ref,Filial,Estado,Auditoria'];
  g.students.forEach(e=>{
    const verdict=(_auditResults[levelKey]||{})[idx]?.log?.[e.ref]?.verdict||'—';
    rows.push(`"${e.name||''}","${e.ref||''}","${BRANCH_LABELS[normB(e.branch)]||e.branch||'—'}","${rByRef[e.ref]?normS(rByRef[e.ref].status):'sem pedido'}","${verdict}"`);
  });
  dlCSV(rows.join('\n'),`ALM-Turma${idx+1}.csv`);
  showToast(`CSV Turma ${idx+1} exportado`,'ok');
}

/* ══════════════════════════════════════════════
   SINALIZADOS
══════════════════════════════════════════════ */
function buildSinalizadosHTML(result){
  const{sinalizados,sameDayCt,invalidWinCt,noGroupCt}=result;
  let html=`<div class="sinal-block"><div class="sinal-hdr" onclick="toggleSinal()"><div style="flex:1"><div class="sinal-title">⚠ Sinalizados · não alocados</div><div style="font-size:7px;color:rgba(232,69,90,.5);margin-top:2px">${sameDayCt?sameDayCt+' mesmo dia · ':''}${invalidWinCt?invalidWinCt+' inválido · ':''}${noGroupCt?noGroupCt+' sem grupo':''}</div></div><div class="sinal-count">${sinalizados.length}</div><div style="font-size:8px;color:var(--red-b);transition:transform .18s" id="sinal-arr">▼</div></div><div class="sinal-body" id="sinal-body">`;
  [{k:'same-day',lbl:'Mesmo dia',cls:'sr-sd',tag:'SD'},{k:'invalid-window',lbl:'Horário inválido',cls:'sr-iv',tag:'IV'},{k:'no-group',lbl:'Sem grupo',cls:'sr-ng',tag:'NG'}].forEach(({k,lbl,cls,tag})=>{
    const sub=sinalizados.filter(s=>s.reason===k);if(!sub.length)return;
    html+=`<div class="sinal-sub">${lbl}</div>`;
    html+=sub.map(({e,why})=>{
      const a=analysePrefs(e.ref);
      const slots=(a?.windows||[]).map(w=>`<span class="slot-tag slot-ok">${DAYS_PT[w.dayIdx]||'?'} ${minsToT(w.earliest)}</span>`).join('');
      return`<div class="sinal-stu"><span class="sinal-reason ${cls}">${tag}</span><div style="flex:1;min-width:0"><div style="font-size:9px;color:var(--t);cursor:pointer" onclick="openDossier('${e.ref}')">${e.name||'—'}</div><div style="font-size:7px;color:var(--t3)">${e.ref} · ${BRANCH_LABELS[normB(e.branch)]||e.branch||'—'}</div><div class="sinal-why">${why}</div><div style="margin-top:3px">${slots}</div></div></div>`;
    }).join('');
  });
  html+=`</div></div>`;return html;
}
function toggleSinal(){_sinalOpen=!_sinalOpen;document.getElementById('sinal-body')?.classList.toggle('open',_sinalOpen);const arr=document.getElementById('sinal-arr');if(arr)arr.style.transform=_sinalOpen?'rotate(180deg)':'';}

/* ══════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════ */
function initBranchStrip(){
  const branches=[...new Set(allE.map(e=>normB(e.branch)).filter(Boolean))];
  const ordered=BRANCH_ORDER.filter(b=>branches.includes(b)).concat(branches.filter(b=>!BRANCH_ORDER.includes(b)));
  document.getElementById('branch-strip').innerHTML=
    `<button class="branch-pill${activeLoc==='all'?' active':''}" onclick="setLoc('all',this)">Tudo</button>`+
    ordered.map(b=>`<button class="branch-pill${activeLoc===b?' active':''}" onclick="setLoc('${b}',this)">${BRANCH_LABELS[b]||b}</button>`).join('');
 document.getElementById('au-branch-strip').innerHTML=
  `<button class="branch-pill${auditFilters.branch==='all'?' active':''}" onclick="auSetBranch('all',this)">Tudo</button>`+
  ordered.map(b=>`<button class="branch-pill${auditFilters.branch===b?' active':''}" onclick="auSetBranch('${b}',this)">${BRANCH_LABELS[b]||b}</button>`).join('');
}
  
function setLoc(loc,btn){
  activeLoc=loc;
  document.querySelectorAll('#branch-strip .branch-pill').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
  activeLevelKey=null;_lastResult=null;
  updateSidebarKPIs();renderTree();renderLevelContent();
}

function updateSidebarKPIs(){
  const students=locStu(),com=students.filter(e=>rByRef[e.ref]).length;
  document.getElementById('st-total').textContent=students.length;
  document.getElementById('st-com').textContent=com;
  document.getElementById('st-sem').textContent=students.length-com;
}

function levelAuditDot(key){
  const ar=_auditResults[key];if(!ar)return'pending';
  const vals=Object.values(ar);if(!vals.length)return'pending';
  if(vals.some(v=>v.status==='fail'))return'fail';
  if(vals.some(v=>v.status==='warn'))return'warn';
  return'pass';
}

function renderTree(){
  const students=locStu(),tree={};
  students.forEach(e=>{const meta=LEVEL_MAP[lk(e)]||{},dk=meta.dept||(e.family||'adults').toLowerCase(),key=lk(e);if(!tree[dk])tree[dk]={};if(!tree[dk][key])tree[dk][key]=[];tree[dk][key].push(e);});
  let html='';
  DEPT_ORDER.forEach(dk=>{
    if(!tree[dk])return;
    const dc=DEPT_CFG[dk]||{label:dk,color:'var(--t3)'},isOpen=openDepts[dk];
    const dStu=Object.values(tree[dk]).flat();
    const sortedK=Object.keys(tree[dk]).sort((a,b)=>(LEVEL_MAP[a]?.order||99)-(LEVEL_MAP[b]?.order||99));
    html+=`<div class="lp-dept-hdr" onclick="toggleDept('${dk}')"><div class="lp-dept-bar" style="background:${dc.color}"></div><div class="lp-dept-name" style="color:${dc.color}">${dc.label}</div><div class="lp-dept-n">${dStu.length} al</div><div class="lp-dept-arr${isOpen?' open':''}">▶</div></div><div class="lp-lv-list${isOpen?' open':''}">`;
    sortedK.forEach(key=>{
      const ls=tree[dk][key],meta=LEVEL_MAP[key]||{},isAct=activeLevelKey===key;
      const auditDot=levelAuditDot(key);
      const certCount=Object.keys(_groupCodes[key]||{}).length;
      html+=`<div class="lp-lv${isAct?' active':''}" onclick="selectLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color||'var(--t3)'}"></div><div class="lp-lv-name">${meta.label||key}</div><div class="lp-lv-n">${ls.length}</div>${_bootComplete?`<div class="lv-audit ${auditDot}" title="Auditoria: ${auditDot}"></div>`:''}${certCount>0?`<span style="font-size:6px;font-weight:700;color:var(--green);padding:1px 4px;border:1px solid var(--green-b);background:var(--green-a)">${certCount}</span>`:''}</div>`;
    });
    html+=`</div>`;
  });
  document.getElementById('level-tree').innerHTML=html||`<div style="padding:20px;font-size:8px;color:var(--t3);text-align:center">Sem dados.</div>`;
}

function toggleDept(dk){openDepts[dk]=!openDepts[dk];renderTree();}

function selectLevel(key){
  activeLevelKey=key;_sinalOpen=false;
  const withReq=locStu().filter(e=>lk(e)===key&&!!rByRef[e.ref]);
  if(withReq.length>=MIN_G){
    _allResults[key]=buildProposals(key,'all');
    _auditResults[key]={};
    _allResults[key].groups.forEach((g,i)=>{if(!(_groupCodes[key]||{})[i])_auditResults[key][i]=auditGroupSync(g);});
  }else{delete _allResults[key];}
  _lastResult=_allResults[key]||null;
  renderTree();renderLevelContent();
}

function sbSearchInput(val){
  const q=val.trim().toLowerCase();
  document.getElementById('sb-search-clear').classList.toggle('vis',val.length>0);
  const drop=document.getElementById('sb-search-results');
  if(q.length<2){drop.classList.remove('open');return;}
  const matches=locStu().filter(e=>(e.name||'').toLowerCase().includes(q)||(e.ref||'').toLowerCase().includes(q)).slice(0,12);
  if(!matches.length){drop.innerHTML=`<div style="padding:12px;font-size:8px;color:var(--t3);text-align:center">Nenhum aluno encontrado</div>`;drop.classList.add('open');return;}
  drop.innerHTML=matches.map(e=>{
    const col=avCol(e.name||e.ref),meta=LEVEL_MAP[lk(e)]||{};
    const st=rByRef[e.ref]?normS(rByRef[e.ref].status):'sem_pedido';
    const stCol=st==='atribuido'?'var(--green)':st==='sem_pedido'?'var(--red)':'var(--amber)';
    return`<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;cursor:pointer;border-bottom:.5px solid var(--b);transition:background .1s" onmouseover="this.style.background='var(--gold4)'" onmouseout="this.style.background=''" onclick="ovClear();openDossier('${e.ref}')"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;flex-shrink:0;border:1px solid;background:${col.bg};border-color:${col.t}55;color:${col.t}">${avInit(e.name||e.ref)}</div><div style="flex:1;min-width:0"><div style="font-size:9px;font-weight:600;color:var(--t)">${e.name||e.ref}</div><div style="font-size:7px;color:var(--t3)">${e.ref} · ${BRANCH_LABELS[normB(e.branch)]||e.branch||'—'} · ${meta.label||'—'}</div></div><span style="font-size:6.5px;font-weight:700;color:${stCol};padding:1px 5px;border:1px solid ${stCol}55;flex-shrink:0">${st==='atribuido'?'atribuído':st==='sem_pedido'?'sem pedido':'pendente'}</span></div>`;
  }).join('')||`<div style="padding:12px;font-size:8px;color:var(--t3);text-align:center">Nenhum aluno encontrado</div>`;
  drop.classList.add('open');
}
function sbSearchSelect(ref){sbSearchClear();openDossier(ref);}
function sbSearchClear(){
  const i=document.getElementById('sb-search-inp');if(i)i.value='';
  document.getElementById('sb-search-clear').classList.remove('vis');
  document.getElementById('sb-search-results').classList.remove('open');
}

/* ══════════════════════════════════════════════
   FORMATION LEVEL RENDER
══════════════════════════════════════════════ */
function renderLevelContent(){
  const area=document.getElementById('scroll-area');
  if(!activeLevelKey){area.innerHTML=`<div class="placeholder-main"><div class="placeholder-icon">◈</div><div class="placeholder-text">Seleccione um nível para ver os dados</div></div>`;return;}
  document.getElementById('view-toggle-bar').style.display='none';
  const allStudents=locStu().filter(e=>lk(e)===activeLevelKey);
  const withReq=allStudents.filter(e=>!!rByRef[e.ref]);
  const noReq=allStudents.length-withReq.length;
  const meta=LEVEL_MAP[activeLevelKey]||getLM(allStudents[0]||{});
  const dc=DEPT_CFG[meta.dept]||{};
  const capPct=Math.round(allStudents.length/(meta.maxCap||60)*100);
  const placed=_lastResult?_lastResult.placed:0;
  const sinal=_lastResult?_lastResult.sinalizados.length:0;
  const certCount=Object.values(_groupCodes[activeLevelKey]||{}).length;
  const excCount=_exceptionQueue.filter(e=>e.levelKey===activeLevelKey).length;

  document.getElementById('level-hdr').innerHTML=`<div class="lh-name" style="color:${meta.color}">${meta.label}</div><div class="lh-dept" style="color:${dc.color}">${dc.label||''}</div><div class="lh-stats"><div class="lh-stat"><div class="lh-v" style="color:var(--gold2)">${allStudents.length}</div><div class="lh-l">Inscritos</div></div><div class="lh-stat"><div class="lh-v" style="color:var(--green)">${withReq.length}</div><div class="lh-l">Com pedido</div></div><div class="lh-stat"><div class="lh-v" style="color:var(--red)">${noReq}</div><div class="lh-l">Sem pedido</div></div>${_lastResult?`<div class="lh-stat"><div class="lh-v" style="color:var(--teal)">${placed}</div><div class="lh-l">Em turma</div><div class="lh-cap-bar"><div class="lh-cap-fill" style="width:${withReq.length?Math.round(placed/withReq.length*100):0}%;background:var(--teal)"></div></div></div>`:''}${certCount>0?`<div class="lh-stat"><div class="lh-v" style="color:var(--green)">${certCount}</div><div class="lh-l">Cert.</div></div>`:''}${excCount>0?`<div class="lh-stat"><div class="lh-v" style="color:var(--amber)">${excCount}</div><div class="lh-l">Excepções</div></div>`:''}${sinal>0?`<div class="lh-stat"><div class="lh-v" style="color:var(--amber)">${sinal}</div><div class="lh-l">Sinalizados</div></div>`:''}<div class="lh-stat"><div class="lh-v" style="color:${capPct>80?'var(--amber)':'var(--t2)'}">${capPct}%</div><div class="lh-l">Capacidade</div><div class="lh-cap-bar"><div class="lh-cap-fill" style="width:${capPct}%;background:${meta.color}"></div></div></div></div>`;

  if(!withReq.length){area.innerHTML=`<div class="placeholder-main" style="padding-top:40px"><div style="font-size:22px;opacity:.2">📭</div><div style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);opacity:.55;margin-top:8px">Nenhum pedido submetido</div></div>`;return;}

  const dept=meta.dept||'adults';
  const pairCounts=ALM_PAIRS.filter(p=>!(p.examOnly&&dept!=='exam')).map(p=>({pair:p,count:countPair(withReq,p)}));
  let html='';
  const certCount2=Object.keys(_groupCodes[activeLevelKey]||{}).length;
  const propCount=(_lastResult?.groups?.length||0)-certCount2;
  html+=`<div class="school-grid-wrap" style="margin-bottom:14px"><div class="school-grid-head"><span class="school-grid-title">Disponibilidade + Turmas · ${withReq.length} al com pedido</span>${certCount2>0?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid rgba(29,184,122,.4);color:#1DB87A;background:rgba(29,184,122,.1)">${certCount2} ✓ cert</span>`:''}${propCount>0?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid rgba(74,143,245,.4);color:#4A8FF5;background:rgba(74,143,245,.1)">${propCount} proposta${propCount!==1?'s':''}</span>`:''}</div><div class="school-grid-outer"><div id="sg-grid-container" style="min-width:540px"></div></div></div>`;
  html+=buildPairMatrix(pairCounts);
  if(_lastResult?.groups?.length){
    html+=`<div class="sec">Turmas Propostas · ${_lastResult.groups.length} grupo${_lastResult.groups.length!==1?'s':''}${certCount>0?`<span style="font-size:6px;font-weight:700;color:var(--green);padding:1px 4px;border:1px solid var(--green-b);background:var(--green-a)">✓${certCount}</span>`:''}${excCount>0?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--amber-b);color:var(--amber);background:var(--amber-a)">${excCount} ⚠ exc</span>`:''}</div>`;
    _lastResult.groups.forEach((g,i)=>{html+=buildGroupCard(g,i);});
  }else{html+=`<div style="padding:20px;text-align:center;color:var(--t3);font-size:9px;border:1px solid var(--b);margin-bottom:14px;letter-spacing:.1em">Sem turmas formadas — alunos insuficientes por par de dias</div>`;}
  if(_lastResult?.sinalizados?.length)html+=buildSinalizadosHTML(_lastResult);

  const sorted=[...allStudents].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const turmaByRef={};
  if(_lastResult?.groups){_lastResult.groups.forEach((g,i)=>{const committed=(_groupCodes[activeLevelKey]||{})[i];const label=committed?(committed.turmaCodeA&&committed.turmaCodeB&&committed.turmaCodeA!==committed.turmaCodeB?`${committed.turmaCodeA}/${committed.turmaCodeB}`:committed.turmaCodeA||committed.turmaCode||`T${i+1}`):`T${i+1}`;g.students.forEach(e=>{turmaByRef[e.ref]={label,color:slotCol(g.dayIdx_A??g.dayIdx,g.startMins),cert:!!committed};});});}
  let stuRows='';
  sorted.forEach((e,idx)=>{
    const a=analysePrefs(e.ref);
    const slots=a?a.windows.map(w=>`${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · '):'—';
    const st=rByRef[e.ref]?normS(rByRef[e.ref].status):'sem_pedido';
    const stCol=st==='atribuido'?'var(--green)':st==='sem_pedido'?'var(--red)':'var(--amber)';
    const stTxt=st==='atribuido'?'atribuído':st==='sem_pedido'?'sem pedido':'pendente';
    const turma=turmaByRef[e.ref];
    stuRows+=`<div class="stu-row" onclick="openDossier('${e.ref}')"><div class="stu-cell" style="font-size:8px;color:var(--t4)">${idx+1}</div><div class="stu-cell" style="font-size:8px;color:var(--t3);font-family:var(--mono)">${(e.ref||'').replace(/\D/g,'')}</div><div class="stu-cell"><div style="font-size:9px;color:var(--t)">${e.name||'—'}</div><div style="font-size:6.5px;color:var(--t3);margin-top:1px">${slots}</div></div><div class="stu-cell">${turma?`<span style="font-size:7.5px;font-weight:700;color:${turma.color};padding:1px 7px;border:1px solid ${turma.color}44${turma.cert?';background:'+turma.color+'11':''}">${turma.label}${turma.cert?' ✓':''}</span>`:'<span style="font-size:7px;color:var(--t4)">—</span>'}</div><div class="stu-cell"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 6px;border:1px solid ${stCol}55">${stTxt}</span></div><div class="stu-cell"><span class="pin-btn" onclick="event.stopPropagation();pinStudent('${e.ref}','${(e.name||'').replace(/'/g,"\\'")}')">📌</span></div></div>`;
  });
  html+=`<div style="margin-top:14px"><div class="sec" style="cursor:pointer;user-select:none" onclick="const s=document.getElementById('lc-students');const h=document.getElementById('lc-students-hint');const o=s.style.display!=='none';s.style.display=o?'none':'block';h.textContent=o?'· clique para expandir':'· clique para fechar';">Alunos · ${sorted.length}<span id="lc-students-hint" style="font-size:7px;font-weight:400;color:var(--t3);letter-spacing:0;text-transform:none">· clique para expandir</span></div><div id="lc-students" style="display:none"><div class="stu-hdr"><span>#</span><span>Ref</span><span>Nome</span><span>Turma</span><span>Status</span><span></span></div>${stuRows}</div></div>`;
  area.innerHTML=html;

  buildPermanentGrid('sg-grid-container',withReq);
  const _capturedKey=activeLevelKey,_capturedResult=_lastResult;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(activeLevelKey!==_capturedKey)return;
    paintCellHeatmap('sg-grid-container',withReq,_capturedKey,_capturedResult);
    drawStamps('sg-grid-container',_capturedKey,_capturedResult);
  }));
}

/* ══════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════ */
function ovSetLoc(loc,btn){
  _ovActiveLoc=loc;_ovActiveLevel=null;
  document.querySelectorAll('#ov-branches .branch-pill').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  ovRenderStats();ovRenderTree();ovRenderSummary();
}
function ovStudents(){return _ovActiveLoc==='all'?allE:allE.filter(e=>normB(e.branch)===_ovActiveLoc);}
function ovRenderStats(){
  const s=ovStudents(),com=s.filter(e=>rByRef[e.ref]).length;
  document.getElementById('ov-total').textContent=s.length;
  document.getElementById('ov-com').textContent=com;
  document.getElementById('ov-sem').textContent=s.length-com;
}

function ovRenderTree(){
  const students=ovStudents(),tree={};
  students.forEach(e=>{const meta=LEVEL_MAP[lk(e)]||{},dk=meta.dept||(e.family||'adults').toLowerCase(),key=lk(e);if(!tree[dk])tree[dk]={};if(!tree[dk][key])tree[dk][key]=[];tree[dk][key].push(e);});
  let html='';
  DEPT_ORDER.forEach(dk=>{
    if(!tree[dk])return;
    const dc=DEPT_CFG[dk]||{},isOpen=_ovOpenDepts2[dk];
    const dStu=Object.values(tree[dk]).flat();
    const sortedK=Object.keys(tree[dk]).sort((a,b)=>(LEVEL_MAP[a]?.order||99)-(LEVEL_MAP[b]?.order||99));
    html+=`<div class="lp-dept-hdr" onclick="_ovOpenDepts2['${dk}']=!_ovOpenDepts2['${dk}'];ovRenderTree()"><div class="lp-dept-bar" style="background:${dc.color}"></div><div class="lp-dept-name" style="color:${dc.color}">${dc.label}</div><div class="lp-dept-n">${dStu.length} al</div><div class="lp-dept-arr${isOpen?' open':''}">▶</div></div><div class="lp-lv-list${isOpen?' open':''}">`;
    sortedK.forEach(key=>{
      const ls=tree[dk][key],meta=LEVEL_MAP[key]||{};
      const auditDot=levelAuditDot(key);
      html+=`<div class="lp-lv${_ovActiveLevel===key?' active':''}" onclick="ovSelectLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color||'var(--t3)'}"></div><div class="lp-lv-name">${meta.label||key}</div><div class="lp-lv-n">${ls.length}</div>${_bootComplete?`<div class="lv-audit ${auditDot}"></div>`:''}</div>`;
    });
    html+=`</div>`;
  });
  document.getElementById('ov-tree').innerHTML=html||`<div style="padding:20px;font-size:8px;color:var(--t3);text-align:center">Sem dados.</div>`;
}

function ovSelectLevel(key){_ovActiveLevel=key;ovRenderTree();ovDrillToFormation(key);}

function ovDrillToFormation(levelKey){
  _ovActiveLevel=levelKey;activeLevelKey=levelKey;activeLoc=_ovActiveLoc;
  const meta=LEVEL_MAP[levelKey]||{};
  if(meta.dept)_ovOpenDepts2[meta.dept]=true;
  ovRenderTree();
  _lastResult=_allResults[levelKey]||null;
  if(!_lastResult){
    const withReq=allE.filter(e=>lk(e)===levelKey&&!!rByRef[e.ref]);
    if(withReq.length>=MIN_G){
      _lastResult=buildProposals(levelKey,'all');_allResults[levelKey]=_lastResult;
      if(!_auditResults[levelKey])_auditResults[levelKey]={};
      _lastResult.groups.forEach((g,i)=>{_auditResults[levelKey][i]=auditGroupSync(g);});
    }
  }
  const el=document.getElementById('ov-right');
  const allStudents=(activeLoc==='all'?allE:allE.filter(e=>normB(e.branch)===activeLoc)).filter(e=>lk(e)===levelKey);
  const withReq=allStudents.filter(e=>!!rByRef[e.ref]);
  const noReq=allStudents.length-withReq.length;
  const dc=DEPT_CFG[meta.dept]||{};
  const placed=_lastResult?_lastResult.placed:0;
  const sinal=_lastResult?_lastResult.sinalizados.length:0;
  const certCount=Object.keys(_groupCodes[levelKey]||{}).length;
  const excCount=_exceptionQueue.filter(e=>e.levelKey===levelKey).length;

  let html=`<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 0 12px;border-bottom:1px solid var(--b2);margin-bottom:14px"><div style="font-family:var(--display);font-size:28px;letter-spacing:5px;color:${meta.color||'var(--gold2)'}">${meta.label||levelKey}</div><div style="font-size:8.5px;color:${dc.color||'var(--t2)'};letter-spacing:.1em;align-self:flex-end;padding-bottom:3px">${dc.label||''}</div><button onclick="_ovActiveLevel=null;ovRenderStats();ovRenderTree();ovRenderSummary();" style="margin-left:auto;font-size:7px;font-weight:700;padding:3px 10px;border:1px solid var(--b2);color:var(--t3);background:transparent;font-family:var(--mono);cursor:pointer;letter-spacing:.06em">← Visão geral</button><div style="display:flex;gap:0"><div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)"><div style="font-size:20px;font-weight:700;color:var(--gold2)">${allStudents.length}</div><div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">Inscritos</div></div><div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)"><div style="font-size:20px;font-weight:700;color:var(--green)">${withReq.length}</div><div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">Com pedido</div></div><div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)"><div style="font-size:20px;font-weight:700;color:var(--red)">${noReq}</div><div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">Sem pedido</div></div>${_lastResult?`<div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)"><div style="font-size:20px;font-weight:700;color:var(--teal)">${placed}</div><div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">Em turma</div></div>`:''}${certCount>0?`<div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)"><div style="font-size:20px;font-weight:700;color:var(--green)">${certCount}</div><div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">Cert.</div></div>`:''}${sinal>0?`<div style="display:flex;flex-direction:column;align-items:center;padding:0 12px;border-left:1px solid var(--b)"><div style="font-size:20px;font-weight:700;color:var(--amber)">${sinal}</div><div style="font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-top:2px">Sinalizados</div></div>`:''}</div></div>`;

  if(!withReq.length){html+=`<div class="placeholder-main" style="padding-top:40px"><div style="font-size:22px;opacity:.2">📭</div><div style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);opacity:.55;margin-top:8px">Nenhum pedido submetido</div></div>`;el.innerHTML=html;return;}

  const dept=meta.dept||'adults';
  const pairCounts=ALM_PAIRS.filter(p=>!(p.examOnly&&dept!=='exam')).map(p=>({pair:p,count:countPair(withReq,p)}));

  html+=`<div class="school-grid-wrap" style="margin-bottom:14px"><div class="school-grid-head"><span class="school-grid-title">Disponibilidade + Turmas · ${withReq.length} al com pedido</span>${certCount>0?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid rgba(29,184,122,.4);color:#1DB87A;background:rgba(29,184,122,.1)">${certCount} ✓ cert</span>`:''}</div><div class="school-grid-outer"><div id="ov-grid-container" style="min-width:540px"></div></div></div>`;
  html+=buildPairMatrix(pairCounts);

  if(_lastResult?.groups?.length){
    const lvCert=Object.keys(_groupCodes[levelKey]||{}).length;
    const lvExc=_exceptionQueue.filter(e=>e.levelKey===levelKey).length;
    html+=`<div class="sec" style="margin-top:14px">Turmas Propostas · ${_lastResult.groups.length} grupo${_lastResult.groups.length!==1?'s':''}${lvCert>0?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--green-b);color:var(--green);background:var(--green-a)">${lvCert} ✓ cert</span>`:''}${lvExc>0?`<span style="font-size:7px;font-weight:700;padding:2px 8px;border:1px solid var(--amber-b);color:var(--amber);background:var(--amber-a)">${lvExc} ⚠ exc</span>`:''}</div>`;
    const savedKey=activeLevelKey;activeLevelKey=levelKey;
    _lastResult.groups.forEach((g,i)=>{html+=buildGroupCard(g,i);});
    activeLevelKey=savedKey;
  }
  if(_lastResult?.sinalizados?.length)html+=buildSinalizadosHTML(_lastResult);
  html+=`<div style="margin-top:14px;padding-bottom:20px"><button onclick="ovOpenStudentModal('${levelKey}')" style="font-size:8px;font-weight:700;padding:5px 16px;border:1px solid var(--b2);color:var(--t2);background:transparent;font-family:var(--mono);cursor:pointer;letter-spacing:.06em;transition:all .12s" onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold2)'" onmouseout="this.style.borderColor='var(--b2)';this.style.color='var(--t2)'">Ver ${allStudents.length} alunos ↗</button></div>`;
  el.innerHTML=html;

  buildPermanentGrid('ov-grid-container',withReq);
  const _ovCapturedKey=levelKey,_ovCapturedResult=_lastResult;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(_ovActiveLevel!==_ovCapturedKey)return;
    paintCellHeatmap('ov-grid-container',withReq,_ovCapturedKey,_ovCapturedResult);
    drawStamps('ov-grid-container',_ovCapturedKey,_ovCapturedResult);
  }));
}

const BRANCH_COLORS={FUNCHAL:'#4A8FF5',CAMARA_LOBOS:'#1DB87A',SANTA_CRUZ:'#E8A020',MACHICO:'#E8455A',RIBEIRA_BRAVA:'#9B5ECA',CALHETA:'#28C8B0'};

function buildBranchBarChart(students){
  const byLevel={};
  students.forEach(e=>{
    const key=lk(e),meta=LEVEL_MAP[key]||{};if(!meta.label)return;
    if(!byLevel[key])byLevel[key]={key,label:meta.label,color:meta.color||'var(--t3)',dept:meta.dept||'adults',order:meta.order||99,total:0,withReq:0,placed:0,noReq:0};
    byLevel[key].total++;
    if(rByRef[e.ref])byLevel[key].withReq++;else byLevel[key].noReq++;
  });
  Object.keys(byLevel).forEach(key=>{
    const result=_allResults[key];
    byLevel[key].placed=Math.max(result?result.placed||0:0,window._dbPlacedByLevel?.[key]?.size||0);
  });
  const rows=Object.values(byLevel).sort((a,b)=>a.order-b.order);if(!rows.length)return'';
  const maxTotal=Math.max(...rows.map(r=>r.total),1);
  const legend=`<div class="barchart-legend"><div class="barchart-legend-item"><div class="barchart-legend-dot" style="background:var(--green)"></div>Em turma</div><div class="barchart-legend-item"><div class="barchart-legend-dot" style="background:var(--amber)"></div>Com pedido · aguarda</div><div class="barchart-legend-item"><div class="barchart-legend-dot" style="background:var(--red)"></div>Sem pedido</div></div>`;
  let rowsHTML=`<div class="barchart-rows">`;
  rows.forEach(row=>{
    const{key,label,total,withReq,placed,noReq}=row;
    const waiting=withReq-placed;
    const certCount=Object.keys(_groupCodes[key]||{}).length;
    const sinalizadosCount=(_allResults[key]?.sinalizados?.length)||0;
    const excCount=_exceptionQueue.filter(e=>e.levelKey===key).length;
    const pPlaced=(placed/maxTotal*100).toFixed(1),pWait=(waiting/maxTotal*100).toFixed(1),pNoReq=(noReq/maxTotal*100).toFixed(1);
    const cap=(LEVEL_MAP[key]||{}).maxCap||total||1;
    const pEmpty=Math.max(0,((cap-total)/maxTotal*100)).toFixed(1);
    const placedPct=total>0?Math.round(placed/total*100):0;
    const isClean=certCount>0&&excCount===0&&sinalizadosCount===0&&noReq===0;
    const isWarn=excCount>0||sinalizadosCount>0||(withReq>0&&placed===0&&(_allResults[key]?.groups?.length||0)>0);
    const healthBg=isClean?'var(--green)':isWarn?'var(--amber)':'var(--red)';
    const iconStyle=`font-size:7px;font-weight:700;padding:2px 7px;border:1px solid;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:var(--mono);border-radius:2px;`;
    let icons='';
    if(certCount>0)icons+=`<span title="Ver grupos" style="${iconStyle}background:var(--green-a);border-color:var(--green-b);color:var(--green)" onclick="event.stopPropagation();drillToGroups('${key}')">✓ ${certCount}</span>`;
    if(sinalizadosCount>0)icons+=`<span title="Ver sinalizados" style="${iconStyle}background:var(--amber-a);border-color:var(--amber-b);color:var(--amber)" onclick="event.stopPropagation();drillToSinalizados('${key}')">⚠ ${sinalizadosCount}</span>`;
    if(excCount>0)icons+=`<span title="Ver excepções" style="${iconStyle}background:var(--red-a);border-color:var(--red-b);color:var(--red)" onclick="event.stopPropagation();jumpToException('${key}',0)">! ${excCount}</span>`;
    icons+=`<span title="Formation" style="${iconStyle}background:transparent;border-color:var(--b2);color:var(--t3)" onclick="event.stopPropagation();ovDrillToFormation('${key}')">→</span>`;
    rowsHTML+=`<div class="barchart-row" onclick="ovDrillToFormation('${key}')"><div class="barchart-row-label" style="display:flex;align-items:center;justify-content:flex-end;gap:4px"><div style="width:7px;height:7px;border-radius:50%;background:${healthBg};flex-shrink:0"></div>${label}</div><div class="barchart-row-track">${placed>0?`<div class="barchart-segment" style="width:${pPlaced}%;background:var(--green)">${placed>=6?placed:''}</div>`:''}${waiting>0?`<div class="barchart-segment" style="width:${pWait}%;background:var(--amber)">${waiting}</div>`:''}${noReq>0?`<div class="barchart-segment" style="width:${pNoReq}%;background:var(--red)">${noReq>=6?noReq:''}</div>`:''}${pEmpty>0?`<div class="barchart-segment" style="width:${pEmpty}%;background:rgba(255,255,255,.04)"></div>`:''}</div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:8px"><span style="font-size:8px;font-weight:700;color:var(--t3);font-family:var(--mono);min-width:22px;text-align:right">${total}</span><span style="font-size:7px;color:var(--t4);font-family:var(--mono);min-width:28px">${placedPct}%</span>${icons}</div></div>`;
  });
  rowsHTML+=`</div>`;
  const ticks=[0,25,50,75,100].map(p=>`<div class="barchart-axis-tick">${Math.round(p/100*maxTotal)}</div>`).join('');
  return`<div class="barchart-wrap"><div class="sec" style="margin-bottom:10px">Estado por nível <span style="font-size:7px;font-weight:400;color:var(--t3);letter-spacing:0;text-transform:none">· clique na barra para navegar</span></div>${legend}${rowsHTML}<div class="barchart-axis">${ticks}</div></div>`;
}

function ovRenderSummary(){
  const students=ovStudents(),total=students.length;
  const el=document.getElementById('ov-right');
  if(!total){el.innerHTML='<div class="empty-msg">Sem inscrições.</div>';return;}
  const com=students.filter(e=>rByRef[e.ref]).length;
  const deptCounts={};DEPT_ORDER.forEach(dk=>{deptCounts[dk]=students.filter(e=>(LEVEL_MAP[lk(e)]||{}).dept===dk).length;});
  const maxD=Math.max(...Object.values(deptCounts),1);
  let totalCert=0;Object.values(_groupCodes).forEach(lvl=>totalCert+=Object.keys(lvl).length);
  let html=`<div class="sec">Visão geral${_ovActiveLoc!=='all'?' · '+(BRANCH_LABELS[_ovActiveLoc]||_ovActiveLoc):''}<span style="font-size:7px;font-weight:600;letter-spacing:.06em;text-transform:none;color:var(--t3);margin-left:4px">${totalCert>0?`· <span style="color:var(--green)">${totalCert} turmas cert.</span>`:''}${_exceptionQueue.length>0?`· <span style="color:var(--amber)">${_exceptionQueue.length} excepções</span>`:''}</span></div>`;
  html+=buildBranchBarChart(students);
  html+=`<div class="sec">Por departamento</div><div style="background:var(--bg2);border:1px solid var(--b);padding:10px 14px;margin-bottom:14px">`;
  DEPT_ORDER.forEach(dk=>{
    const dc=DEPT_CFG[dk]||{},n=deptCounts[dk]||0,pct=Math.round(n/maxD*100);
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:.5px solid var(--b)"><div style="font-size:10px;font-weight:600;width:65px;flex-shrink:0;color:${dc.color}">${dc.label}</div><div style="flex:1;height:4px;background:rgba(255,255,255,.04)"><div style="height:100%;width:${pct}%;background:${dc.color};transition:width .8s"></div></div><div style="font-size:9px;color:var(--t2);width:30px;text-align:right">${n}</div></div>`;
  });
  html+=`</div><div style="font-size:7.5px;color:var(--t3);padding-top:8px">← Seleccione um nível no painel esquerdo para ver detalhes</div>`;
  el.innerHTML=html;
}

function ovOpenStudentModal(levelKey){
  const meta=LEVEL_MAP[levelKey]||{};
  const allStudents=(activeLoc==='all'?allE:allE.filter(e=>normB(e.branch)===activeLoc)).filter(e=>lk(e)===levelKey);
  const turmaByRef={};
  if(_allResults[levelKey]?.groups){
    _allResults[levelKey].groups.forEach((g,i)=>{
      const committed=(_groupCodes[levelKey]||{})[i];
      const label=committed?(committed.turmaCodeA&&committed.turmaCodeB&&committed.turmaCodeA!==committed.turmaCodeB?`${committed.turmaCodeA}/${committed.turmaCodeB}`:committed.turmaCodeA||committed.turmaCode||`T${i+1}`):`T${i+1}`;
      g.students.forEach(e=>{turmaByRef[e.ref]={label,color:slotCol(g.dayIdx_A??g.dayIdx,g.startMins),cert:!!committed};});
    });
  }
  const sorted=[...allStudents].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const rows=sorted.map((e,idx)=>{
    const a=analysePrefs(e.ref);
    const slots=a?a.windows.map(w=>`${DAYS_PT[w.dayIdx]} ${minsToT(w.earliest)}`).join(' · '):'—';
    const st=rByRef[e.ref]?normS(rByRef[e.ref].status):'sem_pedido';
    const stCol=st==='atribuido'?'var(--green)':st==='sem_pedido'?'var(--red)':'var(--amber)';
    const turma=turmaByRef[e.ref];
    return`<div class="stu-row" onclick="document.getElementById('ov-stu-modal').remove();openDossier('${e.ref}')"><div class="stu-cell" style="font-size:9px;color:var(--t2)">${idx+1}</div><div class="stu-cell" style="font-size:9px;color:#E8C97A;font-family:var(--mono);font-weight:600">${(e.ref||'').replace(/\D/g,'')}</div><div class="stu-cell"><div style="font-size:9px;color:var(--t)">${e.name||'—'}</div></div><div class="stu-cell">${turma?`<span style="font-size:7.5px;font-weight:700;color:${turma.color};padding:1px 7px;border:1px solid ${turma.color}44">${turma.label}${turma.cert?' ✓':''}</span>`:'<span style="font-size:7px;color:var(--t4)">—</span>'}</div><div class="stu-cell"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 6px;border:1px solid ${stCol}55">${st==='atribuido'?'atribuído':st==='sem_pedido'?'sem pedido':'pendente'}</span></div><div class="stu-cell"><span class="pin-btn" onclick="event.stopPropagation();pinStudent('${e.ref}','${(e.name||'').replace(/'/g,"\\'")}')">📌</span></div></div>`;
  }).join('');
  const existing=document.getElementById('ov-stu-modal');if(existing)existing.remove();
  const overlay=document.createElement('div');
  overlay.id='ov-stu-modal';
  overlay.style.cssText='position:fixed;inset:0;z-index:1400;background:rgba(0,0,0,.62);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  overlay.innerHTML=`<div style="width:min(720px,96vw);max-height:85dvh;background:var(--bg2);border-radius:14px;border:.5px solid var(--b2);display:flex;flex-direction:column;overflow:hidden"><div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--b2);flex-shrink:0;background:rgba(0,0,0,.2)"><div style="font-family:var(--display);font-size:22px;letter-spacing:4px;color:${meta.color||'var(--gold2)'}"> ${meta.label||levelKey}</div><div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)">${sorted.length} alunos</div><button onclick="document.getElementById('ov-stu-modal').remove()" style="margin-left:auto;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;color:rgba(255,255,255,.6);font-size:13px">✕</button></div><div style="overflow-y:auto;padding:10px 20px 24px"><div style="display:grid;grid-template-columns:36px 100px 1fr 110px 90px 40px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);padding:6px 0 9px;border-bottom:1px solid var(--b2)"><span>#</span><span>Ref</span><span>Nome</span><span>Turma</span><span>Status</span><span></span></div>${rows}</div></div>`;
  document.body.appendChild(overlay);
}

function ovSearch(val){
  const q=val.trim().toLowerCase();
  document.getElementById('ov-clr').classList.toggle('vis',val.length>0);
  const drop=document.getElementById('ov-drop');
  if(q.length<2){drop.classList.remove('open');return;}
  const matches=allE.filter(e=>(e.name||'').toLowerCase().includes(q)||(e.ref||'').toLowerCase().includes(q)).slice(0,12);
  drop.innerHTML=matches.map(e=>{
    const col=avCol(e.name||e.ref),meta=LEVEL_MAP[lk(e)]||{};
    const st=rByRef[e.ref]?normS(rByRef[e.ref].status):'sem_pedido';
    const stCol=st==='atribuido'?'var(--green)':st==='sem_pedido'?'var(--red)':'var(--amber)';
    return`<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;cursor:pointer;border-bottom:.5px solid var(--b);transition:background .1s" onmouseover="this.style.background='var(--gold4)'" onmouseout="this.style.background=''" onclick="ovClear();openDossier('${e.ref}')"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;flex-shrink:0;border:1px solid;background:${col.bg};border-color:${col.t}55;color:${col.t}">${avInit(e.name||e.ref)}</div><div style="flex:1;min-width:0"><div style="font-size:9px;font-weight:600;color:var(--t)">${e.name||e.ref}</div><div style="font-size:7px;color:var(--t3)">${e.ref} · ${BRANCH_LABELS[normB(e.branch)]||e.branch||'—'} · ${meta.label||'—'}</div></div><span style="font-size:6.5px;font-weight:700;color:${stCol};padding:1px 5px;border:1px solid ${stCol}55;flex-shrink:0">${st==='atribuido'?'atribuído':st==='sem_pedido'?'sem pedido':'pendente'}</span></div>`;
  }).join('')||`<div style="padding:12px;font-size:8px;color:var(--t3);text-align:center">Nenhum aluno encontrado</div>`;
  drop.classList.add('open');
}
function ovClear(){const i=document.getElementById('ov-search');if(i)i.value='';document.getElementById('ov-clr').classList.remove('vis');document.getElementById('ov-drop').classList.remove('open');}

function _drillSetupLevel(levelKey){
  activeLevelKey=levelKey;activeLoc='all';
  _lastResult=_allResults[levelKey]||null;
  if(!_lastResult){
    const withReq=allE.filter(e=>lk(e)===levelKey&&!!rByRef[e.ref]);
    if(withReq.length>=MIN_G){
      _lastResult=buildProposals(levelKey,'all');_allResults[levelKey]=_lastResult;
      if(!_auditResults[levelKey])_auditResults[levelKey]={};
      _lastResult.groups.forEach((g,i)=>{_auditResults[levelKey][i]=auditGroupSync(g);});
    }
  }
  document.querySelectorAll('#branch-strip .branch-pill').forEach(t=>t.classList.remove('active'));
  document.querySelector('#branch-strip .branch-pill')?.classList.add('active');
  const meta=LEVEL_MAP[levelKey]||{};if(meta.dept)openDepts[meta.dept]=true;
  updateSidebarKPIs();renderTree();renderLevelContent();
}
function drillToGroups(levelKey){_drillSetupLevel(levelKey);switchCC('formation',document.getElementById('tab-formation'));setTimeout(()=>{document.getElementById('gcard-0')?.scrollIntoView({behavior:'smooth',block:'start'});},150);}
function drillToSinalizados(levelKey){_drillSetupLevel(levelKey);switchCC('formation',document.getElementById('tab-formation'));setTimeout(()=>{_sinalOpen=true;const body=document.getElementById('sinal-body');const arr=document.getElementById('sinal-arr');if(body){body.classList.add('open');if(arr)arr.style.transform='rotate(180deg)';}document.querySelector('.sinal-hdr')?.scrollIntoView({behavior:'smooth',block:'start'});},150);}

/* ══════════════════════════════════════════════
   AUDIT PANEL
══════════════════════════════════════════════ */
function setAF(btn){
  const g=btn.dataset.ag,v=btn.dataset.av;auditFilters[g]=v;auditFilters.levelKey=null;
document.querySelectorAll(`#panel-audit .fbt[data-ag="${g}"]`).forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  renderAudit();
  renderAuditTree();
}
function auSetBranch(b,btn){
  auditFilters.branch=b;
  auditFilters.levelKey=null;
  document.querySelectorAll('#au-branch-strip .branch-pill').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderAudit();
  renderAuditTree();
}
  
function renderAudit(){
  let students=[...allE];
  if(auditFilters.branch!=='all')students=students.filter(e=>normB(e.branch)===auditFilters.branch);
  if(auditFilters.dept!=='all')students=students.filter(e=>(LEVEL_MAP[lk(e)]||{}).dept===auditFilters.dept);
  if(auditFilters.levelKey)students=students.filter(e=>lk(e)===auditFilters.levelKey);
  if(auditFilters.status!=='all')students=students.filter(e=>{
    const req=rByRef[e.ref];
    if(auditFilters.status==='noreq')return!req;
    if(auditFilters.status==='pendente')return req&&normS(req.status)==='pendente';
    if(auditFilters.status==='atribuido')return req&&normS(req.status)==='atribuido';
    return true;
  });
  const q=((document.getElementById('au-search-lp')?.value||'')).toLowerCase().trim();
  if(q)students=students.filter(e=>(e.name||'').toLowerCase().includes(q)||(e.ref||'').toLowerCase().includes(q));
  const total=allE.length,com=allE.filter(e=>rByRef[e.ref]).length,sem=total-com;
  const pend=allE.filter(e=>{const r=rByRef[e.ref];return r&&normS(r.status)==='pendente';}).length;
  document.getElementById('a-total').textContent=total;document.getElementById('a-com').textContent=com;
  document.getElementById('a-total-lp').textContent=total;
  document.getElementById('a-com-lp').textContent=com;
  document.getElementById('a-sem-lp').textContent=sem;
  document.getElementById('a-sem').textContent=sem;document.getElementById('a-pend').textContent=pend;
  document.getElementById('badge-audit').textContent=sem;

  // ── GROUP CARD MODE when filter is "atribuído" ──
  if(auditFilters.status==='atribuido'){
    renderAuditGroupCards(students,q);
    return;
  }

  // ── LIST MODE ──
  document.getElementById('au-count').textContent=`Mostrando ${Math.min(students.length,500)} de ${students.length} registos`;
  const hdr=document.getElementById('au-hdr-row');if(hdr)hdr.style.display='';
  document.getElementById('au-rows').innerHTML=students.slice(0,500).map(e=>{
    const req=rByRef[e.ref],meta=LEVEL_MAP[lk(e)]||{},dc=DEPT_CFG[meta.dept||'adults']||{};
    const a=analysePrefs(e.ref),dayIdxs=a?a.dayIdxs:[];
    const cells=DAYS_PT.map((_,di)=>`<div class="hcell${dayIdxs.includes(di)?' on':''}"></div>`).join('');
    const st=req?normS(req.status):'sem_pedido';
    const stCol=st==='atribuido'?'var(--green)':st==='sem_pedido'?'var(--red)':'var(--amber)';
    return`<div class="au-row" onclick="openDossier('${e.ref}')"><div class="au-cell"><div style="font-size:9px;color:var(--t)">${e.name||'—'}</div><div style="font-size:7px;color:var(--t3)">${e.ref||'—'}</div></div><div class="au-cell"><div style="font-size:9px;font-weight:600;color:${meta.color||'var(--t3)'}">${meta.label||'—'}</div><div style="font-size:7px;color:var(--t3)">${dc.label||''}</div></div><div class="au-cell"><div class="heatstrip">${cells}</div><div style="font-size:5.5px;color:var(--t4);margin-top:2px;letter-spacing:.04em">S T Q Q S S</div></div><div class="au-cell" style="text-align:center"><span style="font-size:7px;font-weight:700;color:${stCol};padding:1px 5px;border:1px solid ${stCol}55">${st==='atribuido'?'atribuído':st==='sem_pedido'?'sem pedido':'pendente'}</span></div></div>`;
  }).join('')||`<div class="empty-msg">Nenhum resultado.</div>`;
}

function renderAuditGroupCards(students,q){
  // Build index: ref → {levelKey, groupIdx}
  const refToGroup={};
  Object.keys(_allResults).forEach(levelKey=>{
    (_allResults[levelKey]?.groups||[]).forEach((g,i)=>{
      const committed=(_groupCodes[levelKey]||{})[i];
      g.students.forEach(s=>{refToGroup[s.ref]={levelKey,groupIdx:i,committed};});
    });
  });

  // Collect unique groups that have at least one student matching filters
  const groupsSeen=new Map(); // key: levelKey+groupIdx
  students.forEach(e=>{
    const entry=refToGroup[e.ref];if(!entry)return;
    const key=`${entry.levelKey}__${entry.groupIdx}`;
    if(!groupsSeen.has(key))groupsSeen.set(key,entry);
  });

  const groups=[...groupsSeen.values()].sort((a,b)=>{
    const ma=LEVEL_MAP[a.levelKey]||{},mb=LEVEL_MAP[b.levelKey]||{};
    if((ma.order||99)!==(mb.order||99))return(ma.order||99)-(mb.order||99);
    const ga=_allResults[a.levelKey]?.groups[a.groupIdx];
    const gb=_allResults[b.levelKey]?.groups[b.groupIdx];
    return(ga?.startMins||0)-(gb?.startMins||0);
  });

  const hdr=document.getElementById('au-hdr-row');if(hdr)hdr.style.display='none';
  document.getElementById('au-count').textContent=`${groups.length} turma${groups.length!==1?'s':''} · ${students.length} alunos atribuídos`;

  if(!groups.length){
    document.getElementById('au-rows').innerHTML=`<div class="empty-msg">Nenhuma turma encontrada.</div>`;
    return;
  }

  document.getElementById('au-rows').innerHTML=`<div class="au-group-grid">${groups.map(({levelKey,groupIdx,committed})=>{
    const g=_allResults[levelKey]?.groups[groupIdx];if(!g)return'';
    const ar=(_auditResults[levelKey]||{})[groupIdx];
    const meta=LEVEL_MAP[levelKey]||{};
    const col=slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
    const auditCls=!ar?'au-gc-clean':ar.status==='fail'?'au-gc-fail':ar.status==='warn'?'au-gc-warn':'au-gc-clean';
    const pairLabel=g.pairDef?(g.dayIdx_A===g.dayIdx_B?g.dayL_A:`${g.dayL_A}+${g.dayL_B}`):(g.dayL||'—');
    const codeDisplay=committed?(committed.turmaCodeA&&committed.turmaCodeB&&committed.turmaCodeA!==committed.turmaCodeB?`${committed.turmaCodeA}/${committed.turmaCodeB}`:committed.turmaCodeA||committed.turmaCode||`G${groupIdx+1}`):`G${groupIdx+1}`;
    const n=g.students.length,capPct=Math.round(n/MAX_G*100);
    const fillCol=capPct>=90?'var(--red)':capPct>=70?'var(--amber)':col;
    const passC=ar?.passCount??n,warnC=ar?.warnCount??0,failC=ar?.failCount??0;

    // Filter students to those matching current audit filters for display
    const visStudents=q?g.students.filter(s=>(s.name||'').toLowerCase().includes(q)||(s.ref||'').toLowerCase().includes(q)):g.students;

    const avs=visStudents.slice(0,18).map(s=>{
      const ac=avCol(s.name||s.ref);
      const verdict=ar?.log?.[s.ref]?.verdict||'pass';
      return`<div class="au-gc-av ${verdict!=='pass'?verdict:''}" style="background:${ac.bg};color:${ac.t};border-color:${ac.t}44" title="${s.name||s.ref}">${avInit(s.name||s.ref)}</div>`;
    }).join('');
    const extra=visStudents.length>18?`<div style="font-size:6.5px;color:var(--t3);padding:2px 3px">+${visStudents.length-18}</div>`:'';

    // Compact timetable: show the group's actual pair + time
const pairA=g.dayL_A||g.dayL||'—';
const pairB=(g.dayIdx_A??g.dayIdx)!==(g.dayIdx_B??g.dayIdx)?(g.dayL_B||'—'):null;
const timeStr=`${minsToT(g.startMins)}–${minsToT(g.startMins+CLASS_DUR)}`;
const slotC2=slotCol(g.dayIdx_A??g.dayIdx,g.startMins);
const weekStrip=`<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
  <div style="display:flex;align-items:center;gap:4px;padding:2px 7px;border:1px solid ${slotC2}44;background:${slotC2}11;border-radius:2px">
    <span style="font-size:8px;font-weight:700;color:${slotC2}">${pairA}</span>
    <span style="font-size:7px;color:${slotC2};opacity:.7">${timeStr}</span>
  </div>
  ${pairB?`<div style="display:flex;align-items:center;gap:4px;padding:2px 7px;border:1px solid ${slotC2}44;background:${slotC2}0D;border-radius:2px;opacity:.85">
    <span style="font-size:8px;font-weight:700;color:${slotC2}">${pairB}</span>
    <span style="font-size:7px;color:${slotC2};opacity:.7">${timeStr}</span>
  </div>`:``}
</div>`;

    return`<div class="au-gc ${auditCls}" onclick="openGroupModal('${levelKey}',${groupIdx})">
      <div class="au-gc-head">
        <div class="au-gc-code" style="color:${col}">${codeDisplay}</div>
        <div class="au-gc-slot">${pairLabel} · ${minsToT(g.startMins)}–${minsToT(g.startMins+CLASS_DUR)}</div>
        <div class="au-gc-meta" style="color:${meta.color||'var(--t3)'}">${meta.label||'—'} · ${BRANCH_LABELS[normB(g.students[0]?.branch)]||'—'}</div>
      </div>
      <div class="au-gc-body">
        <div class="au-gc-stats">
          <div class="au-gc-n" style="color:${col}">${n}</div>
          <div style="font-size:6.5px;color:var(--t3);align-self:flex-end;padding-bottom:3px">/${MAX_G}</div>
          <div class="au-gc-cap"><div class="au-gc-cap-fill" style="width:${capPct}%;background:${fillCol}"></div></div>
        </div>
        <div class="au-gc-audit">
          ${passC>0?`<span class="au-gc-pill pass">✓ ${passC}</span>`:''}
          ${warnC>0?`<span class="au-gc-pill warn">⚠ ${warnC}</span>`:''}
          ${failC>0?`<span class="au-gc-pill fail">✕ ${failC}</span>`:''}
        </div>
    <div class="au-gc-avs">${avs}${extra}</div>
        ${weekStrip}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function renderAuditTree(){
  const el=document.getElementById('au-level-tree');if(!el)return;
  let html='';
  DEPT_ORDER.forEach(dk=>{
    const dc=DEPT_CFG[dk]||{};
    const levels=Object.keys(LEVEL_MAP).filter(k=>LEVEL_MAP[k].dept===dk);
    if(!levels.length)return;
    html+=`<div style="padding:5px 10px 3px;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${dc.color};border-top:.5px solid var(--b)">${dc.label}</div>`;
    levels.forEach(key=>{
      const meta=LEVEL_MAP[key]||{};
      const n=allE.filter(e=>lk(e)===key).length;
      const isActive=auditFilters.levelKey===key;
      html+=`<div class="lp-lv${isActive?' active':''}" onclick="auSetLevel('${key}')"><div class="lp-lv-dot" style="background:${meta.color||'var(--t3)'}"></div><div class="lp-lv-name">${meta.label||key}</div><div class="lp-lv-n">${n}</div></div>`;
    });
  });
  html+=`<div class="lp-lv${!auditFilters.levelKey?' active':''}" onclick="auSetLevel(null)" style="margin-top:4px;border-top:.5px solid var(--b)"><div class="lp-lv-dot" style="background:var(--gold)"></div><div class="lp-lv-name">Todos os níveis</div><div class="lp-lv-n">${allE.length}</div></div>`;
  document.getElementById('au-level-tree').innerHTML=html;
}

function auSetLevel(key){
  auditFilters.levelKey=key;
  renderAudit();
  renderAuditTree();
}

/* ══════════════════════════════════════════════
   DOSSIER
══════════════════════════════════════════════ */
const DS_FLAGS={EN:'🇬🇧',PT:'🇵🇹',FR:'🇫🇷',ES:'🇪🇸',DE:'🇩🇪'};
const DEPT_LABELS_D={kids:'INFANTIL',kids_juv:'JUVENIL',adults:'GERAL',exam:'EXAMES'};
function dsRow(k,v,c){return`<div class="ds-row"><div class="ds-rk">${k}</div><div class="ds-rv ${c||''}">${v}</div></div>`;}
function dsSec(id,icon,title,meta,content){return`<div class="ds-section" id="${id}"><div class="ds-section-hdr"><div class="ds-section-title"><span class="ds-section-icon">${icon}</span>${title}</div><div class="ds-section-r"><span class="ds-section-meta">${meta}</span><span class="ds-section-chv">›</span></div></div><div class="ds-section-body">${content}</div></div>`;}
function parseSlotsForRuler(req){
  if(!req)return[];
  const raw=parseDayPrefs(req.slots||req.day_preferences);
  return raw.map(p=>parseSlot(p)).filter(Boolean).map(s=>({dayIdx:s.dayIdx,day:DAYS_PT[s.dayIdx]||'?',fromMins:s.fromMins,toMins:s.toMins,startLabel:minsToT(s.fromMins),endLabel:minsToT(s.toMins)}));
}

async function openDossier(ref){
  _dsTTLoaded=false;_dsData={};
  const overlay=document.getElementById('ds-overlay'),sheet=document.getElementById('ds-sheet');
  sheet.classList.remove('ds-exit');overlay.classList.add('open');
  const col=avCol(ref);
  document.getElementById('ds-avatar').style.cssText=`background:${col.bg};color:${col.t}`;
  document.getElementById('ds-avatar').textContent=ref.slice(-2);
  document.getElementById('ds-banner-bg').style.background=DEPT_GRADS.adults;
  document.getElementById('ds-name').textContent=ref;
  document.getElementById('ds-ref').textContent='a carregar…';
  document.getElementById('ds-strip').innerHTML='';
  document.getElementById('ds-body').innerHTML=`<div class="ds-empty" style="padding:48px 0">a carregar…</div>`;

  const [enrols,reqs,hist]=await Promise.all([
    sbGet('enrolments',`ref=eq.${encodeURIComponent(ref)}&select=ref,name,date_of_birth,age,gender,phone,email,branch,lang,family,level_code,level_cefr,enrolment_date,academic_year,returning_student,guardian_name,guardian_phone,notes&limit=1`),
    sbGet('timetable_requests',`ref=eq.${encodeURIComponent(ref)}&academic_year=eq.${AY}&select=ref,slots,day_preferences,sessions_per_week,status,created_at,notes&limit=1`),
    sbGet('turma_students',`ref=eq.${encodeURIComponent(ref)}&select=ref,turma_code,academic_year,level_cefr,family,outcome,absences,grade_final,notes&order=academic_year.desc`),
  ]).catch(()=>[[],[],[]]);

  const enrol=enrols[0]||null,req=reqs[0]||rByRef[ref]||null,hst=hist||[];
  _dsData={enrol,req,hst};
  const dept=(enrol?.family||'adults').toLowerCase();
  const rawCode=(enrol?.level_code||enrol?.level_cefr||'').trim();
  const lvl=ALM_DISP[rawCode]||rawCode||'—';
  const grad=DEPT_GRADS[dept]||DEPT_GRADS.adults;
  const accent=COURSE_ACCENT[dept]||'rgba(255,255,255,.48)';
  document.getElementById('ds-banner-bg').style.background=grad;
  const deptEl=document.getElementById('ds-dept');deptEl.textContent=DEPT_LABELS_D[dept]||'GERAL';deptEl.style.color=accent;
  const avEl=document.getElementById('ds-avatar'),col2=avCol(enrol?.name||ref);
  avEl.style.cssText=`background:${col2.bg};color:${col2.t}`;avEl.textContent=avInit(enrol?.name||ref);
  document.getElementById('ds-name').textContent=enrol?.name||ref||'—';
  document.getElementById('ds-ref').textContent=`${ref}  ·  ${lvl}  ·  ${DS_FLAGS[enrol?.lang||'EN']||''} ${enrol?.lang||'EN'}`;
  const items=[];
  if(enrol?.age)items.push(`<span class="ds-ci">${enrol.age} anos</span>`);
  if(enrol?.phone)items.push(`<a class="ds-ci ds-ci-link" href="tel:${enrol.phone}">📞 ${enrol.phone}</a>`);
  if(enrol?.email)items.push(`<a class="ds-ci ds-ci-link" href="mailto:${enrol.email}">✉ ${enrol.email}</a>`);
  document.getElementById('ds-strip').innerHTML=items.join(`<span class="ds-ci-sep">·</span>`);

  let turmaInfo='—';
  for(const [key,result] of Object.entries(_allResults)){
    result.groups.forEach((g,i)=>{
      if(g.students.find(s=>s.ref===ref)){
        const committed=(_groupCodes[key]||{})[i];
        const code=committed?(committed.turmaCodeA&&committed.turmaCodeB&&committed.turmaCodeA!==committed.turmaCodeB?`${committed.turmaCodeA}/${committed.turmaCodeB}`:committed.turmaCodeA||committed.turmaCode||`T${i+1}`):`T${i+1}`;
        const m=LEVEL_MAP[key]||{};
        const pairLabel=g.pairDef?(g.dayIdx_A===g.dayIdx_B?g.dayL_A:`${g.dayL_A}+${g.dayL_B}`):(g.dayL||'—');
        turmaInfo=`${code} · ${m.label||key} · ${pairLabel} · ${g.startTime}–${g.endTime}${committed?' ✓':''}`;
      }
    });
  }

  const slots=parseSlotsForRuler(req);
  const enrolContent=!enrol?`<div class="ds-empty">Matrícula não encontrada.</div>`:[
    dsRow('Referência',enrol.ref||'—','tint'),dsRow('Nome',enrol.name||'—'),
    enrol.age?dsRow('Idade',enrol.age+' anos'):'',
    enrol.email?dsRow('Email',enrol.email,'tint'):'',
    enrol.phone?dsRow('Telefone',enrol.phone):'',
    enrol.guardian_name?dsRow('Encarregado',enrol.guardian_name):'',
    enrol.guardian_phone?dsRow('Tel. EE',enrol.guardian_phone):'',
    `<div style="height:.5px;background:var(--sep-d);margin:6px 0"></div>`,
    dsRow('Nível',lvl),dsRow('Filial',(enrol.branch||'—').replace(/_/g,' ')),
    enrol.lang?dsRow('Língua',`${DS_FLAGS[enrol.lang]||''} ${enrol.lang}`):'',
    enrol.academic_year?dsRow('Ano lectivo',enrol.academic_year):'',
    enrol.enrolment_date?dsRow('Matrícula',new Date(enrol.enrolment_date).toLocaleDateString('pt-PT')):'',
    enrol.returning_student!=null?dsRow('Tipo',enrol.returning_student?'Recorrente':'Novo'):'',
    `<div style="height:.5px;background:var(--sep-d);margin:6px 0"></div>`,
    `<div class="ds-row"><div class="ds-rk">Turma proposta</div><div class="ds-rv">${turmaInfo!=='—'?`<span class="ds-turma-badge">${turmaInfo}</span>`:'<span style="color:var(--sub-d)">—</span>'}</div></div>`,
  ].filter(Boolean).join('');

  const histContent=!hst.length?`<div class="ds-empty">Sem historial registado.</div>`:hst.map(yr=>{
    const l=ALM_DISP[(yr.level_cefr||'').trim()]||yr.level_cefr||'—';
    const cls=yr.outcome==='aprovado'?'ok':yr.outcome==='reprovado'?'warn':'na';
    const lbl=yr.outcome==='aprovado'?'Aprovado':yr.outcome==='reprovado'?'Reprovado':yr.outcome||'Em curso';
    const att=yr.absences!=null?Math.max(0,100-yr.absences*5):null;
    return`<div class="ds-yr"><div class="ds-yr-hdr" onclick="this.classList.toggle('open')"><div class="ds-yr-left"><span class="ds-yr-year">${yr.academic_year||'—'}</span><span class="ds-yr-turma">${yr.turma_code||'—'} · ${l}</span></div><span class="ds-yr-outcome ${cls}">${lbl}</span></div><div class="ds-yr-body">${yr.grade_final!=null?dsRow('Nota final',yr.grade_final+'%'):''}${yr.absences!=null?dsRow('Faltas',yr.absences):''}${att!=null?`<div class="ds-att-bar"><div class="ds-att-fill" style="width:${att}%;background:${att>75?'var(--green-d)':att>50?'var(--amber-d)':'var(--red-d)'}"></div></div>`:''}${yr.notes?dsRow('Notas',yr.notes):''}</div></div>`;
  }).join('');

  const ttMeta=slots.length?`${slots.length} slot${slots.length!==1?'s':''}` :'—';
  const notesContent=`<div class="ds-flags"><button class="ds-flag" onclick="this.classList.toggle('on')">⚠ Comportamento</button><button class="ds-flag" onclick="this.classList.toggle('on')">💳 Pagamento</button><button class="ds-flag" onclick="this.classList.toggle('on')">📉 Desempenho</button><button class="ds-flag" onclick="this.classList.toggle('on')">📅 Faltas</button><button class="ds-flag" onclick="this.classList.toggle('on')">♿ Nec. especial</button></div><textarea class="ds-note" id="ds-note" placeholder="Nota visível para toda a equipa…">${enrol?.notes||''}</textarea><div class="ds-btn-row"><button class="ds-btn primary" onclick="dsSaveNote('${ref}')">Guardar nota</button>${enrol?.notes?`<button class="ds-btn ghost" onclick="dsClearNote('${ref}')">Limpar</button>`:''}`;

  document.getElementById('ds-body').innerHTML=[
    dsSec('ds-s-insc','📋','Inscrição',enrol?.academic_year||'—',enrolContent),
    dsSec('ds-s-hist','🎓','Historial',hst.length?`${hst.length} ano${hst.length>1?'s':''}` :'—',histContent),
    dsSec('ds-s-hora','🗓','Horário · Disponibilidade',ttMeta,`<div id="ds-tt-content"><div class="ds-empty">Clique para expandir</div></div>`),
    dsSec('ds-s-nota','🚩','Notas Internas',enrol?.notes?'com nota':'',notesContent),
  ].join('');
  document.getElementById('ds-body').querySelectorAll('.ds-section-hdr').forEach(hdr=>{
    hdr.addEventListener('click',()=>{hdr.classList.toggle('open');if(hdr.classList.contains('open')&&hdr.closest('#ds-s-hora'))dsLoadTimetable();});
  });
}

function dsLoadTimetable(){
  if(_dsTTLoaded)return;_dsTTLoaded=true;
  const el=document.getElementById('ds-tt-content');if(!el)return;
  const{req}=_dsData;
  const slots=parseSlotsForRuler(req);
  const DAY_LABEL=36,TOTAL_MINS=(20-8)*60;
  const HOURS=[8,9,10,11,12,13,14,15,16,17,18,19,20];
  function pct(mins){return((mins-480)/TOTAL_MINS*100).toFixed(2)+'%';}
  let html='';
  if(slots.length){
    const byDay={};slots.forEach(s=>{if(!byDay[s.dayIdx])byDay[s.dayIdx]=[];byDay[s.dayIdx].push(s);});
    let ruler=`<div style="display:flex;margin-left:${DAY_LABEL}px;position:relative;height:14px;margin-bottom:1px">`;
    HOURS.forEach(hr=>{ruler+=`<div style="position:absolute;left:${((hr-8)/12*100).toFixed(2)}%;font-size:7px;color:var(--label-d);transform:translateX(-50%)">${hr}</div>`;});
    ruler+=`</div>`;
    let rows='';
    [0,1,2,3,4,5].forEach(di=>{
      const windows=byDay[di]||[],hasData=windows.length>0;
      const dayColor=hasData?'var(--amber-d)':'var(--label-d)';
      let gridLines='',bands='';
      HOURS.forEach(hr=>{gridLines+=`<div style="position:absolute;left:${((hr-8)/12*100).toFixed(2)}%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.06)"></div>`;});
      windows.forEach(s=>{
        const fromC=Math.max(s.fromMins,480),toC=Math.min(s.toMins,1200);if(fromC>=toC)return;
        bands+=`<div style="position:absolute;left:${pct(fromC)};width:${((toC-fromC)/TOTAL_MINS*100).toFixed(2)}%;top:2px;bottom:2px;background:var(--amber-d);border-radius:2px;display:flex;align-items:center;padding:0 5px;overflow:hidden"><span style="font-size:7px;color:#1a1a00;white-space:nowrap;font-weight:700">${s.startLabel}–${s.endLabel}</span></div>`;
      });
      rows+=`<div style="display:flex;align-items:center;gap:0;margin-bottom:2px"><div style="width:${DAY_LABEL}px;font-size:8px;font-weight:700;color:${dayColor};flex-shrink:0;text-align:right;padding-right:6px">${DAYS_PT[di]}</div><div style="flex:1;position:relative;height:20px;background:var(--bg3-d);border-radius:2px;overflow:hidden">${gridLines}${bands}</div></div>`;
    });
    html+=`<div style="margin-bottom:14px"><div class="ds-avail-label">Disponibilidade · Pedido</div>${ruler}${rows}</div>`;
  }
  if(req){
    const slotTags=slots.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">${slots.map(s=>`<span class="ds-slot-tag">${s.day} ${s.startLabel}–${s.endLabel}</span>`).join('')}</div>`:'<span style="font-size:9px;color:var(--sub-d)">Sem slots</span>';
    const st=normS(req.status||'');
    html+=[
      `<div class="ds-row"><div class="ds-rk">Slots</div><div class="ds-rv">${slotTags}</div></div>`,
      req.sessions_per_week?dsRow('Sessões/sem',req.sessions_per_week):'',
      `<div class="ds-row"><div class="ds-rk">Estado</div><div class="ds-rv"><span class="ds-badge-v10 ${st==='atribuido'?'green':st==='pendente'?'amber':'gray'}">${req.status||'—'}</span></div></div>`,
      req.created_at?dsRow('Submetido',new Date(req.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})):'',
      req.notes?dsRow('Nota pedido',req.notes):'',
    ].filter(Boolean).join('');
  }else{html+=`<div class="ds-empty">Nenhum pedido de horário.</div>`;}
  el.innerHTML=html;
}

async function dsSaveNote(ref){
  const txt=document.getElementById('ds-note')?.value?.trim();if(txt==null)return;
  const ok=await fetch(`${SB}/rest/v1/enrolments?ref=eq.${encodeURIComponent(ref)}`,{method:'PATCH',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({notes:txt})}).then(r=>r.ok).catch(()=>false);
  showToast(ok?'Nota guardada ✓':'Erro ao guardar',ok?'ok':'err');
}
async function dsClearNote(ref){
  if(!confirm('Limpar a nota?'))return;
  const ok=await fetch(`${SB}/rest/v1/enrolments?ref=eq.${encodeURIComponent(ref)}`,{method:'PATCH',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({notes:''})}).then(r=>r.ok).catch(()=>false);
  if(ok)document.getElementById('ds-note').value='';
  showToast(ok?'Nota removida':'Erro',ok?'ok':'err');
}
function closeDossier(){
  const s=document.getElementById('ds-sheet');if(!s)return;
  s.classList.add('ds-exit');
  setTimeout(()=>{document.getElementById('ds-overlay')?.classList.remove('open');s.classList.remove('ds-exit');},240);
}

/* ══════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════ */
function almConfirm(opts){
  return new Promise(resolve=>{
    const o=opts||{};
    document.getElementById('alm-confirm-overlay')?.remove();
    const ov=document.createElement('div');
    ov.id='alm-confirm-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.62);backdrop-filter:blur(20px) saturate(160%);display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML=`<div style="width:min(380px,94vw);background:var(--bg-d);border-radius:16px;border:.5px solid rgba(255,255,255,.10);overflow:hidden;animation:shUp .24s cubic-bezier(.32,.72,0,1)">
      <div style="padding:18px 20px 14px;border-bottom:.5px solid rgba(255,255,255,.07)">
        <div style="font-family:var(--display);font-size:18px;letter-spacing:3px;color:${o.accent||'var(--gold2)'}">${o.title||'CONFIRMAR'}</div>
        ${o.lines?o.lines.map(l=>`<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:5px;font-family:var(--mono);letter-spacing:.03em">${l}</div>`).join(''):''}
      </div>
      <div style="padding:12px 20px;display:flex;gap:10px;justify-content:flex-end">
        <button id="alm-confirm-cancel" style="height:38px;padding:0 18px;background:transparent;border:.5px solid rgba(255,255,255,.12);border-radius:10px;color:var(--t3);font-family:var(--mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.08em">${o.cancelLabel||'Cancelar'}</button>
        <button id="alm-confirm-ok" style="height:38px;padding:0 22px;background:${o.okBg||'rgba(201,168,76,.92)'};border:none;border-radius:10px;color:#09080F;font-family:var(--mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.08em">${o.okLabel||'Confirmar'}</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const done=v=>{ov.remove();resolve(v);};
    ov.querySelector('#alm-confirm-ok').onclick=()=>done(true);
    ov.querySelector('#alm-confirm-cancel').onclick=()=>done(false);
    ov.onclick=e=>{if(e.target===ov)done(false);};
  });
}
  
function pinStudent(ref,name){showToast(`📌 ${name} fixado`,'ok');}
function dlCSV(content,filename){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));a.download=filename.replace(/\s+/g,'_');a.click();}
let _toastT;
function showToast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type} show`;clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show'),3000);}

document.addEventListener('click',e=>{
  if(!e.target.closest('.lp-search-wrap')){document.getElementById('ov-drop')?.classList.remove('open');document.getElementById('sb-search-results')?.classList.remove('open');}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('ds-overlay')?.classList.contains('open')){closeDossier();return;}
    if(document.getElementById('mt-overlay')?.classList.contains('open')){closeMudarTurma();return;}
    closeGroupModal();
  }
});

/* ══════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════ */
async function boot(){
  try{
    setBoot('A carregar inscrições e pedidos…');setBootProgress(5);
    const [enrol,reqs]=await Promise.all([
      sbGet('enrolments',`select=ref,name,branch,lang,family,level_code,level_cefr&academic_year=eq.${AY}&order=ref`),
      sbGet('timetable_requests',`select=ref,branch,family,level_code,level_cefr,slots,day_preferences,status&academic_year=eq.${AY}`),
    ]);
    setConn(true);
    allE=enrol||[];allR=reqs||[];rByRef={};
    allR.forEach(r=>{rByRef[r.ref]=r;});
    document.getElementById('boot-count').textContent=allE.length;
    document.getElementById('pill-total').textContent=`${allE.length} al`;
    setBootProgress(35);
    setBoot('A carregar fixações…');
    await loadLocks();
    const{committed,exceptions}=await runBootAudit();
    _bootComplete=true;
    document.getElementById('pill-status').textContent='Supabase OK';
    document.getElementById('pill-status').className='tb-status ok';
    updateSidebarKPIs();initBranchStrip();renderTree();renderAuditTree();renderExcBar();
    document.getElementById('badge-audit').textContent=allE.filter(e=>!rByRef[e.ref]).length||'0';
    document.getElementById('badge-pending').textContent=allE.filter(e=>{const r=rByRef[e.ref];return r&&normS(r.status)==='pendente';}).length||'0';
    setTimeout(()=>{document.getElementById('boot-overlay').classList.add('hidden');},350);
    const msg=exceptions>0?`${allE.length} al · ${exceptions} excepção${exceptions!==1?'s':''} por certificar`:`${allE.length} al · pronto para certificar ✓`;
    showToast(msg,exceptions>0?'warn':'ok');
    switchCC('overview',document.getElementById('tab-overview'));
  }catch(err){
    setConn(false);
    document.getElementById('boot-sub').textContent='Erro: '+err.message;
    document.getElementById('pill-status').textContent='Erro DB';
    document.getElementById('pill-status').className='tb-status err';
    setTimeout(()=>{document.getElementById('boot-overlay').classList.add('hidden');},3000);
    showToast('Erro Supabase: '+err.message,'err');
  }
}

boot();
setInterval(()=>{if(_bootComplete)refreshData();},60000);

