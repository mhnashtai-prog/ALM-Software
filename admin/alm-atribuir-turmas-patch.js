/* ═══════════════════════════════════════════════════════════
   PATCH FOR alm-atribuir-turmas.html
   
   STEP 1: Add this line in <head> BEFORE the existing <script>:
     <script src="/admin/alm-levels.js"></script>

   STEP 2: Replace the entire LEVEL SYSTEM block (search for
   "LEVEL SYSTEM" comment in the file) with the block below.
   
   STEP 3: In normGroup(), replace the course/dept mapping:
   OLD:
     if(/^exam/.test(deptRaw)) course='exam';
     else if(/^juven|^kid|^junior|^crian|^prep/.test(deptRaw)) course='kids';
     else course='adults';
     const dept=course==='kids'?'juvenil':course==='exam'?'exam':'geral';
   
   NEW (uses alm-levels.js almNormDept):
     const dept = almNormDept(deptRaw);   // juvenil | geral | exam
     const course = dept;                  // same key everywhere — no more kids/adults split
   
   STEP 4: Replace displayLevel(), levelColor(), levelOrder() calls:
     displayLevel(cefr, course)  →  almLabel(dept, cefr)
     levelColor(course)          →  almColor(dept)
     levelOrder(course, cefr)    →  almOrder(dept, cefr)
═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════
   LEVEL SYSTEM — REPLACE THIS ENTIRE BLOCK
   (delete from const LEVEL_DISPLAY= to end of LEVEL_ORDER)
══════════════════════════════════════ */

// All level display is now handled by alm-levels.js
// These shims keep any legacy call sites working:
const LEVEL_DISPLAY = {
  juvenil: { A1:'Pj1', A2:'Pj2', B1:'Pj3' },
  geral:   { A1:'1st', A2:'2nd', B1:'3rd', B2:'4th', C1:'5th' },
  exam:    { B2:'6th', C1:'7th', C2:'8th' },
  // Legacy aliases (if old code passes 'kids' or 'adults')
  kids:    { A1:'Pj1', A2:'Pj2', B1:'Pj3' },
  adults:  { A1:'1st', A2:'2nd', B1:'3rd', B2:'4th', C1:'5th', C2:'5th' },
};

const LEVEL_COLOR = {
  juvenil:'#28C8B0', geral:'#C8A44A', exam:'#9B5ECA',
  kids:'#28C8B0', adults:'#C8A44A',   // legacy
};

const LEVEL_DEPT = {
  juvenil:'Juvenil', geral:'Geral', exam:'Exames',
  kids:'Juvenil', adults:'Geral',   // legacy
};

const LEVEL_ORDER = {
  juvenil:{ A1:1, A2:2, B1:3 },
  geral:  { A1:4, A2:5, B1:6, B2:7, C1:8 },
  exam:   { B2:9, C1:10, C2:11 },
  kids:   { A1:1, A2:2, B1:3 },    // legacy
  adults: { A1:4, A2:5, B1:6, B2:7, C1:8, C2:8 }, // legacy
};

// Shim functions — delegate to alm-levels.js
function displayLevel(cefr, deptOrCourse){
  return almLabel(deptOrCourse, cefr);
}
function levelColor(deptOrCourse){
  return almColor(deptOrCourse);
}
function levelOrder(deptOrCourse, cefr){
  return almOrder(deptOrCourse, cefr);
}

/* ══════════════════════════════════════
   UPDATED normGroup() — replace existing
══════════════════════════════════════ */
function normGroup(row){
  const parts  = (row.group_key||'').split('|');
  const branch = (parts[0]||row.branch||'?').replace(/\s*-\s*sede/i,'').trim();
  const lang   = parts[1]||row.lang||'EN';
  const deptRaw= (parts[2]||'').toLowerCase().trim();

  // almNormDept handles all variants: kids→juvenil, adults→geral, exam, etc.
  const dept   = almNormDept(deptRaw);
  const cefr   = ((parts[3]||row.level_cefr||'')).toUpperCase();

  return {
    key:         row.group_key,
    branch,
    lang,
    dept,                          // 'juvenil' | 'geral' | 'exam'
    course:      dept,             // same key — no more split
    cefr,
    label:       almLabel(dept, cefr),
    viability:   row.viability||'viable',
    studentRefs: Array.isArray(row.student_refs)?row.student_refs:[],
    studentCount:row.student_count||0,
    students:    [],
    turmaCode:   null,
    teacherId:   null,
    recommendedDay: null,
    recommendedH:   null,
  };
}

/* ══════════════════════════════════════
   UPDATED renderLevelList() dept headers
   Replace the depts/deptLabel lines:
══════════════════════════════════════ */
// OLD:
//   const depts=['juvenil','geral','exam'];
//   const deptLabel={juvenil:'🧒 Juvenil',geral:'📘 Geral',exam:'🎓 Exames'};
// NEW (uses alm-levels.js):
//   const depts = ALM_DEPT_ORDER;          // ['juvenil','geral','exam']
//   const deptLabel = ALM_DEPT_LABEL;      // from alm-levels.js
