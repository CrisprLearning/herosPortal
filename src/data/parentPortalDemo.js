// Demo data for the parent portal. Shapes here are the SAME shapes the real
// endpoints return (see PARENT_PORTAL_API_CONTRACT.md), so swapping demo mode
// off is a one-line change in src/lib/parentApi.js.

export const demoParent = {
  id: 501,
  name: 'Sreelatha Menon',
  countryCode: '+91',
  mobile: '9847012345',
};

export const demoChildren = [
  {
    id: 101,
    candidateKey: 'CL-2026-10897',
    name: 'Aarav Menon',
    photo: 'https://i.pravatar.cc/160?img=12',
    gender: 'Male',
    classOfStudy: '12th pass',
    primaryCourse: { name: 'NEET Repeater 2027', batch: 'Alpha · Offline' },
    center: 'Kochi · MG Road',
    hosteller: true,
  },
  {
    id: 102,
    candidateKey: 'CL-2026-11342',
    name: 'Diya Menon',
    photo: 'https://i.pravatar.cc/160?img=47',
    gender: 'Female',
    classOfStudy: '11th',
    primaryCourse: { name: 'IISER Foundation 2028', batch: 'Weekend · Hybrid' },
    center: 'Kochi · Kakkanad',
    hosteller: false,
  },
];

// ── Attendance calendar generator ─────────────────────────────────────────
// Builds a deterministic month of attendance: Mon–Sat are class days, Sundays
// are off, and a couple of seeded absences appear per month.
function buildMonth(year, month, { absentDays = [], holidays = [], upTo = null, from = null } = {}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const weekday = date.getDay(); // 0 = Sunday
    let status;
    if (upTo && d > upTo) status = 'upcoming';
    else if (from && d < from) status = 'off';
    else if (weekday === 0) status = 'off';
    else if (holidays.includes(d)) status = 'holiday';
    else if (absentDays.includes(d)) status = 'absent';
    else status = 'present';
    days.push({ date: iso, day: d, weekday, status });
  }
  const counted = days.filter((x) => x.status === 'present' || x.status === 'absent');
  const present = counted.filter((x) => x.status === 'present').length;
  const absent = counted.length - present;
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    label,
    present,
    absent,
    total: counted.length,
    percent: counted.length ? Math.round((present / counted.length) * 100) : 0,
    days,
  };
}

// Today is used to cut the current month off at the right day so future
// dates render as "upcoming" rather than as attendance.
const TODAY = new Date();
const CUR_Y = TODAY.getFullYear();
const CUR_M = TODAY.getMonth() + 1;
const CUR_D = TODAY.getDate();
// Attendance is shown for every month from the academic year start (June
// 2026) through the current month, newest first. Days before the batch's
// start date are "off", as are whole months before it.
const ATTENDANCE_FROM = { year: 2026, month: 6 };

function buildMonths({ startedOn, absences = {}, holidays = {}, seed = 0 }) {
  const start = new Date(startedOn);
  const months = [];
  let y = ATTENDANCE_FROM.year;
  let m = ATTENDANCE_FROM.month;
  while (y < CUR_Y || (y === CUR_Y && m <= CUR_M)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const isCurrent = y === CUR_Y && m === CUR_M;
    const monthStart = new Date(y, m - 1, 1);
    let from = null;
    if (start.getFullYear() === y && start.getMonth() + 1 === m) from = start.getDate();
    else if (monthStart < start) from = 32; // batch had not started: whole month off
    months.unshift(buildMonth(y, m, {
      absentDays: absences[key] || [((m * 5 + seed) % 24) + 3],
      holidays: holidays[key] || [],
      upTo: isCurrent ? CUR_D : null,
      from,
    }));
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months;
}

const NATIONAL_HOLIDAYS = { '2026-08': [15], '2026-10': [2], '2027-01': [26] };

export const demoStudent360 = {
  101: {
    overall: {
      performance: 82,
      performanceDelta: 4,
      rank: 6,
      batchStrength: 48,
      label: 'High',
      summary: 'Performance is up 4% compared to last month. Physics is the strongest subject; Botany needs attention.',
    },
    attendance: {
      percent: 92,
      percentDelta: 3,
      months: buildMonths({
        startedOn: '2026-06-15',
        absences: { '2026-06': [22], '2026-07': [11], '2026-08': [4, 19], '2026-09': [2] },
        holidays: NATIONAL_HOLIDAYS,
        seed: 1,
      }),
    },
    lastTests: [
      { id: 9007, name: 'Grand Mock 07', subject: 'Full syllabus', date: '2026-09-02', score: 612, max: 720, rank: 5, batchStrength: 48, percentile: 88 },
      { id: 9006, name: 'Grand Mock 06', subject: 'Full syllabus', date: '2026-08-26', score: 574, max: 720, rank: 9, batchStrength: 48, percentile: 78 },
      { id: 8814, name: 'Physics Unit Test · Optics', subject: 'Physics', date: '2026-08-21', score: 84, max: 100, rank: 3, batchStrength: 48, percentile: 91 },
      { id: 9005, name: 'Grand Mock 05', subject: 'Full syllabus', date: '2026-08-12', score: 588, max: 720, rank: 7, batchStrength: 48, percentile: 81 },
      { id: 8801, name: 'Botany Unit Test · Genetics', subject: 'Botany', date: '2026-08-06', score: 61, max: 100, rank: 22, batchStrength: 48, percentile: 54 },
    ],
    subjects: [
      { name: 'Physics', percent: 91, delta: 6 },
      { name: 'Chemistry', percent: 84, delta: 2 },
      { name: 'Zoology', percent: 80, delta: 5 },
      { name: 'Botany', percent: 68, delta: -3 },
    ],
    examTrend: [
      { id: 9001, name: 'Grand Mock 01', date: '2026-06-24', score: 468, max: 720, classAverage: 455 },
      { id: 8702, name: 'Chemistry Unit Test · Bonding', date: '2026-07-03', score: 71, max: 100, classAverage: 62 },
      { id: 9002, name: 'Grand Mock 02', date: '2026-07-08', score: 502, max: 720, classAverage: 470 },
      { id: 9003, name: 'Grand Mock 03', date: '2026-07-22', score: 486, max: 720, classAverage: 478 },
      { id: 8750, name: 'Physics Unit Test · Mechanics', date: '2026-07-30', score: 88, max: 100, classAverage: 66 },
      { id: 9004, name: 'Grand Mock 04', date: '2026-08-05', score: 541, max: 720, classAverage: 489 },
      { id: 8801, name: 'Botany Unit Test · Genetics', date: '2026-08-06', score: 61, max: 100, classAverage: 64 },
      { id: 9005, name: 'Grand Mock 05', date: '2026-08-12', score: 588, max: 720, classAverage: 498 },
      { id: 8814, name: 'Physics Unit Test · Optics', date: '2026-08-21', score: 84, max: 100, classAverage: 68 },
      { id: 9006, name: 'Grand Mock 06', date: '2026-08-26', score: 574, max: 720, classAverage: 505 },
      { id: 9007, name: 'Grand Mock 07', date: '2026-09-02', score: 612, max: 720, classAverage: 511 },
    ].slice(-10),
    summary: {
      aspiration: 'NEET 2027', strikeRate: 71.4, strikeRateFrom: 12,
      averageScore: 548, averageScoreBase: 720, averageScoreFrom: 12,
      pyqSolved: 1240, pyqSolvedFrom: 3600, strongSubject: 'Physics', strongSubjectPercentage: 34,
    },
    quizzes: [
      { attemptId: 50112, quizId: 2012, title: 'Weekly Quiz 12 · Thermodynamics', dateOfExam: '2026-09-13', score: 92, max: 120, accuracy: 81 },
      { attemptId: 50098, quizId: 2011, title: 'Weekly Quiz 11 · Human Physiology', dateOfExam: '2026-09-06', score: 78, max: 120, accuracy: 68 },
      { attemptId: 50071, quizId: 2010, title: 'Weekly Quiz 10 · Chemical Bonding', dateOfExam: '2026-08-30', score: 101, max: 120, accuracy: 86 },
      { attemptId: 50044, quizId: 2009, title: 'Weekly Quiz 09 · Genetics', dateOfExam: '2026-08-23', score: 64, max: 120, accuracy: 57 },
      { attemptId: 50019, quizId: 2008, title: 'Weekly Quiz 08 · Optics', dateOfExam: '2026-08-16', score: 108, max: 120, accuracy: 90 },
      { attemptId: 49987, quizId: 2007, title: 'Weekly Quiz 07 · Organic Basics', dateOfExam: '2026-08-09', score: 85, max: 120, accuracy: 74 },
    ],
    mentor: { name: 'Dr. Kavya Nair', role: 'Senior Mentor · Physics', photo: 'https://i.pravatar.cc/80?img=32', phone: '+91 98470 55512' },
    batch: { name: 'NEET Repeater 2027 — Alpha', mode: 'Offline', center: 'Kochi · MG Road', startedOn: '2026-06-15' },
  },
  102: {
    overall: {
      performance: 74,
      performanceDelta: -2,
      rank: 14,
      batchStrength: 36,
      label: 'Good',
      summary: 'A slight dip of 2% this month, mostly from the last Mathematics test. Chemistry continues to improve.',
    },
    attendance: {
      percent: 86,
      percentDelta: -4,
      months: buildMonths({
        startedOn: '2026-07-04',
        absences: { '2026-07': [5, 26], '2026-08': [7, 8, 22], '2026-09': [1, 3] },
        holidays: NATIONAL_HOLIDAYS,
        seed: 2,
      }),
    },
    lastTests: [
      { id: 7105, name: 'Foundation Test 05', subject: 'Full syllabus', date: '2026-08-30', score: 142, max: 200, rank: 12, batchStrength: 36, percentile: 71 },
      { id: 7021, name: 'Mathematics Unit Test · Calculus', subject: 'Mathematics', date: '2026-08-23', score: 54, max: 100, rank: 24, batchStrength: 36, percentile: 42 },
      { id: 7104, name: 'Foundation Test 04', subject: 'Full syllabus', date: '2026-08-16', score: 156, max: 200, rank: 9, batchStrength: 36, percentile: 79 },
      { id: 7018, name: 'Chemistry Unit Test · Bonding', subject: 'Chemistry', date: '2026-08-09', score: 88, max: 100, rank: 4, batchStrength: 36, percentile: 93 },
      { id: 7103, name: 'Foundation Test 03', subject: 'Full syllabus', date: '2026-08-02', score: 138, max: 200, rank: 15, batchStrength: 36, percentile: 66 },
    ],
    subjects: [
      { name: 'Chemistry', percent: 88, delta: 7 },
      { name: 'Biology', percent: 79, delta: 1 },
      { name: 'Physics', percent: 72, delta: -1 },
      { name: 'Mathematics', percent: 58, delta: -9 },
    ],
    examTrend: [
      { id: 7101, name: 'Foundation Test 01', date: '2026-07-12', score: 118, max: 200, classAverage: 124 },
      { id: 7010, name: 'Physics Unit Test · Kinematics', date: '2026-07-19', score: 64, max: 100, classAverage: 61 },
      { id: 7102, name: 'Foundation Test 02', date: '2026-07-26', score: 131, max: 200, classAverage: 128 },
      { id: 7103, name: 'Foundation Test 03', date: '2026-08-02', score: 138, max: 200, classAverage: 130 },
      { id: 7018, name: 'Chemistry Unit Test · Bonding', date: '2026-08-09', score: 88, max: 100, classAverage: 67 },
      { id: 7104, name: 'Foundation Test 04', date: '2026-08-16', score: 156, max: 200, classAverage: 134 },
      { id: 7021, name: 'Mathematics Unit Test · Calculus', date: '2026-08-23', score: 54, max: 100, classAverage: 63 },
      { id: 7105, name: 'Foundation Test 05', date: '2026-08-30', score: 142, max: 200, classAverage: 136 },
      { id: 7024, name: 'Biology Unit Test · Cell', date: '2026-09-06', score: 79, max: 100, classAverage: 70 },
      { id: 7106, name: 'Foundation Test 06', date: '2026-09-13', score: 149, max: 200, classAverage: 139 },
    ],
    summary: {
      aspiration: 'IISER Aptitude 2028', strikeRate: 58.2, strikeRateFrom: 7,
      averageScore: 138, averageScoreBase: 200, averageScoreFrom: 7,
      pyqSolved: 412, pyqSolvedFrom: 1500, strongSubject: 'Chemistry', strongSubjectPercentage: 31,
    },
    quizzes: [
      { attemptId: 61044, quizId: 3106, title: 'Weekend Quiz 06 · Integration', dateOfExam: '2026-09-12', score: 34, max: 60, accuracy: 59 },
      { attemptId: 61021, quizId: 3105, title: 'Weekend Quiz 05 · Periodic Table', dateOfExam: '2026-09-05', score: 51, max: 60, accuracy: 88 },
      { attemptId: 60998, quizId: 3104, title: 'Weekend Quiz 04 · Cell Biology', dateOfExam: '2026-08-29', score: 44, max: 60, accuracy: 76 },
      { attemptId: 60970, quizId: 3103, title: 'Weekend Quiz 03 · Kinematics', dateOfExam: '2026-08-22', score: 38, max: 60, accuracy: 66 },
    ],
    mentor: { name: 'Anand Krishnan', role: 'Mentor · Mathematics', photo: 'https://i.pravatar.cc/80?img=59', phone: '+91 98470 33341' },
    batch: { name: 'IISER Foundation 2028 — Weekend', mode: 'Hybrid', center: 'Kochi · Kakkanad', startedOn: '2026-07-04' },
  },
};

// ── Course progress (video watch history) ────────────────────────────────
// Subject → chapters → modules (video parts). A module counts as completed
// when ≥ 90 % of it has been watched; the subject bar is completed ÷ total
// modules, the chapter percentage is the mean watched share of its modules.
function buildSubject(id, name, chapterDefs) {
  const chapters = chapterDefs.map((c, ci) => {
    const modules = Array.from({ length: c.modules }, (_, i) => {
      const watchedPercent = c.watched?.[i] ?? 0;
      return {
        id: `${id}-${ci + 1}-${i + 1}`,
        title: `${c.name} · Part ${i + 1}`,
        durationMin: 18 + ((ci * 7 + i * 5) % 28),
        watchedPercent,
        lastWatchedOn: watchedPercent > 0 ? c.lastWatchedOn || null : null,
      };
    });
    const percent = Math.round(modules.reduce((sum, m) => sum + m.watchedPercent, 0) / modules.length);
    const modulesDone = modules.filter((m) => m.watchedPercent >= 90).length;
    return { id: `${id}-${ci + 1}`, name: c.name, modulesTotal: modules.length, modulesDone, percent, modules };
  });
  const all = chapters.flatMap((c) => c.modules);
  const modulesTotal = all.length;
  const modulesDone = all.filter((m) => m.watchedPercent >= 90).length;
  const totalMin = all.reduce((sum, m) => sum + m.durationMin, 0);
  const watchedMin = all.reduce((sum, m) => sum + (m.durationMin * m.watchedPercent) / 100, 0);
  return {
    id, name, chaptersTotal: chapters.length, modulesTotal, modulesDone,
    percent: modulesTotal ? Math.round((modulesDone / modulesTotal) * 100) : 0,
    watchHours: Number((watchedMin / 60).toFixed(1)), totalHours: Number((totalMin / 60).toFixed(1)),
    chapters,
  };
}

export const demoCourseProgress = {
  101: {
    courseId: 3001,
    courseName: 'NEET Repeater 2027 — Complete Program',
    subjects: [
      buildSubject('phy', 'Physics', [
        { name: 'Units and Measurements', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-02' },
        { name: 'Motion in a Straight Line', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-14' },
        { name: 'Laws of Motion', modules: 9, watched: [100, 100, 100, 100, 100, 100, 100, 100, 95], lastWatchedOn: '2026-07-29' },
        { name: 'Work, Energy and Power', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 40], lastWatchedOn: '2026-08-12' },
        { name: 'Gravitation', modules: 6, watched: [100, 100, 100, 55], lastWatchedOn: '2026-08-24' },
        { name: 'Thermodynamics', modules: 9, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-10' },
        { name: 'Ray Optics', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 70], lastWatchedOn: '2026-09-15' },
        { name: 'Electrostatics', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-17' },
        { name: 'Current Electricity', modules: 8, watched: [100, 100, 100, 100, 60], lastWatchedOn: '2026-09-18' },
        { name: 'Modern Physics', modules: 6 },
      ]),
      buildSubject('chem', 'Chemistry', [
        { name: 'Some Basic Concepts of Chemistry', modules: 7, watched: [100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-06' },
        { name: 'Structure of Atom', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-20' },
        { name: 'Chemical Bonding', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-08-08' },
        { name: 'Thermodynamics', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-08-22' },
        { name: 'Equilibrium', modules: 9, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-04' },
        { name: 'Organic Chemistry Basics', modules: 9, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-12' },
        { name: 'Hydrocarbons', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-16' },
        { name: 'Coordination Compounds', modules: 7, watched: [100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-17' },
        { name: 'Biomolecules', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Electrochemistry', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Chemical Kinetics', modules: 5 },
      ]),
      buildSubject('bio', 'Biology', [
        { name: 'The Living World', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 60], lastWatchedOn: '2026-09-16' },
        { name: 'Biological Classification', modules: 12 },
        { name: 'Plant Kingdom', modules: 12, watched: [80, 65, 40, 15], lastWatchedOn: '2026-09-18' },
        { name: 'Animal Kingdom', modules: 14 },
        { name: 'Morphology of Flowering Plants', modules: 12 },
        { name: 'Cell: The Unit of Life', modules: 12 },
      ]),
    ],
  },
  102: {
    courseId: 3101,
    courseName: 'IISER Foundation 2028',
    subjects: [
      buildSubject('math', 'Mathematics', [
        { name: 'Sets and Functions', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-25' },
        { name: 'Trigonometry', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-08-15' },
        { name: 'Limits and Derivatives', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 35], lastWatchedOn: '2026-09-12' },
        { name: 'Integration', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 50], lastWatchedOn: '2026-09-13' },
        { name: 'Probability', modules: 6 },
      ]),
      buildSubject('phy', 'Physics', [
        { name: 'Units and Measurements', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-18' },
        { name: 'Kinematics', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-08-20' },
        { name: 'Laws of Motion', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-02' },
        { name: 'Work, Energy and Power', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-11' },
        { name: 'Waves', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-17' },
        { name: 'Optics', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Modern Physics', modules: 6 },
      ]),
      buildSubject('chem', 'Chemistry', [
        { name: 'Atomic Structure', modules: 7, watched: [100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-07-30' },
        { name: 'Periodic Table', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-08-14' },
        { name: 'Chemical Bonding', modules: 9, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-05' },
        { name: 'States of Matter', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-15' },
        { name: 'Equilibrium', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 45], lastWatchedOn: '2026-09-18' },
      ]),
      buildSubject('bio', 'Biology', [
        { name: 'Cell Biology', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-08-29' },
        { name: 'Genetics', modules: 10, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-10' },
        { name: 'Evolution', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-16' },
        { name: 'Human Physiology', modules: 12, watched: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Ecology', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Biotechnology', modules: 8, watched: [100, 100, 100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Plant Physiology', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Reproduction', modules: 6, watched: [100, 100, 100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Microbes', modules: 4, watched: [100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Biomolecules', modules: 4, watched: [100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Diversity', modules: 4, watched: [100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
        { name: 'Health and Disease', modules: 4, watched: [100, 100, 100, 100], lastWatchedOn: '2026-09-18' },
      ]),
    ],
  },
};

// ── Quiz class statistics ─────────────────────────────────────────────────
// Keyed by quizId. Opened from the "Class stats" button on the quiz table.
// Quizzes without an entry get tiles synthesised from the row in parentApi.
export const demoQuizStats = {
  2012: {
    maxScore: 120, myScore: 92, myRank: 7, classStrength: 46, topScore: 112, classAverage: 74,
    subjects: [
      { name: 'Physics', myScore: 38, classAverage: 27, topScore: 40, maxScore: 40 },
      { name: 'Chemistry', myScore: 30, classAverage: 25, topScore: 38, maxScore: 40 },
      { name: 'Biology', myScore: 24, classAverage: 22, topScore: 36, maxScore: 40 },
    ],
  },
  2011: {
    maxScore: 120, myScore: 78, myRank: 19, classStrength: 47, topScore: 110, classAverage: 76,
    subjects: [
      { name: 'Physics', myScore: 30, classAverage: 26, topScore: 38, maxScore: 40 },
      { name: 'Chemistry', myScore: 26, classAverage: 24, topScore: 36, maxScore: 40 },
      { name: 'Biology', myScore: 22, classAverage: 26, topScore: 38, maxScore: 40 },
    ],
  },
  2009: {
    maxScore: 120, myScore: 64, myRank: 28, classStrength: 45, topScore: 104, classAverage: 69,
    subjects: [
      { name: 'Physics', myScore: 28, classAverage: 24, topScore: 36, maxScore: 40 },
      { name: 'Chemistry', myScore: 22, classAverage: 23, topScore: 34, maxScore: 40 },
      { name: 'Biology', myScore: 14, classAverage: 22, topScore: 36, maxScore: 40 },
    ],
  },
  3106: {
    maxScore: 60, myScore: 34, myRank: 21, classStrength: 34, topScore: 56, classAverage: 37,
    subjects: [
      { name: 'Mathematics', myScore: 12, classAverage: 15, topScore: 20, maxScore: 20 },
      { name: 'Physics', myScore: 10, classAverage: 11, topScore: 18, maxScore: 20 },
      { name: 'Chemistry', myScore: 12, classAverage: 11, topScore: 19, maxScore: 20 },
    ],
  },
};

export const demoCourses = {
  101: [
    { id: 3001, name: 'NEET Repeater 2027 — Complete Program', type: 'course', batch: 'Alpha · Offline', mode: 'Offline', enrolledOn: '2026-06-15', accessEndsOn: '2027-05-31', progress: 34, lessonsDone: 148, lessonsTotal: 436 },
    { id: 3002, name: 'NEET Grand Test Series 2027', type: 'test-series', batch: 'All batches', mode: 'Online', enrolledOn: '2026-07-01', accessEndsOn: '2027-05-10', progress: 28, testsDone: 7, testsTotal: 25 },
    { id: 3003, name: 'Physics Problem Solving Bootcamp', type: 'course', batch: 'Evening · Online', mode: 'Online', enrolledOn: '2026-08-10', accessEndsOn: '2026-09-30', progress: 62, lessonsDone: 31, lessonsTotal: 50 },
    { id: 3004, name: 'Foundation Bridge Course', type: 'course', batch: 'Summer 2026', mode: 'Online', enrolledOn: '2026-04-01', accessEndsOn: '2026-06-30', progress: 100, lessonsDone: 40, lessonsTotal: 40 },
  ],
  102: [
    { id: 3101, name: 'IISER Foundation 2028 — Two Year Program', type: 'course', batch: 'Weekend · Hybrid', mode: 'Hybrid', enrolledOn: '2026-07-04', accessEndsOn: '2028-04-30', progress: 12, lessonsDone: 58, lessonsTotal: 480 },
    { id: 3102, name: 'Weekly PYQ Series — Class 11', type: 'test-series', batch: 'All batches', mode: 'Online', enrolledOn: '2026-07-04', accessEndsOn: '2027-03-31', progress: 22, testsDone: 9, testsTotal: 40 },
    { id: 3103, name: 'Olympiad Mathematics Primer', type: 'course', batch: 'Self-paced', mode: 'Online', enrolledOn: '2026-08-20', accessEndsOn: '2026-09-12', progress: 45, lessonsDone: 9, lessonsTotal: 20 },
  ],
};

export const demoHostel = {
  101: {
    residence: {
      id: 12,
      name: 'Crispr Green Hostel',
      address: '12 MG Road, Bangalore',
      wardenName: 'Mini Mol',
      wardenPhone: '9043960876',
      providerName: 'Grace Inn Hostels',
      providerPhones: ['9043960876', '9809677798'],
      officePhone: '9043960876',
    },
    room: { number: '101', type: 'Sharing', block: null, floor: null, bed: null, mess: null },
    checkInOn: '2026-06-28',
    rent: {
      monthlyAmount: 9500,
      dueDay: 5,
      nextDueOn: '2026-10-05',
      deposit: 3000,
      includes: ['4 Times Food', 'Dedicated Study Space', 'CCTV Monitoring', 'Washing Machine', 'Water Purifier', 'Emergency Power Backup', 'Cleaning Services', 'Security'],
    },
    payments: [
      { id: 'R-2026-09', month: '2026-09-01', amount: 9500, dueOn: '2026-09-05', paidOn: null, status: 'pending', mode: null, receiptNo: null },
      { id: 'R-2026-08', month: '2026-08-01', amount: 9500, dueOn: '2026-08-05', paidOn: '2026-08-03', status: 'paid', mode: 'UPI', receiptNo: 'RCP-08813' },
      { id: 'R-2026-07', month: '2026-07-01', amount: 9500, dueOn: '2026-07-05', paidOn: '2026-07-09', status: 'paid', mode: 'Net banking', receiptNo: 'RCP-08122', late: true },
      { id: 'R-2026-06', month: '2026-06-01', amount: 5200, dueOn: '2026-06-14', paidOn: '2026-06-14', status: 'paid', mode: 'Cash', receiptNo: 'RCP-07410', note: 'Pro-rated for 17 days' },
      { id: 'D-2026-06', month: '2026-06-01', amount: 15000, dueOn: '2026-06-14', paidOn: '2026-06-14', status: 'paid', mode: 'Cash', receiptNo: 'RCP-07409', note: 'Security deposit (refundable)' },
    ],
  },
  102: null,
};

// ── Hostel leave requests ─────────────────────────────────────────────────
// Raised by the parent from the hostel page. The hostel provider is notified
// on creation and approves or rejects. `status`: pending | approved |
// rejected | cancelled. `days` counts both the out and in calendar dates.
export const demoHostelLeaves = {
  101: [
    { id: 'L-2026-0912', outAt: '2026-09-25T16:00', inAt: '2026-09-28T08:00', days: 4, reason: 'Personal', goingTo: 'Home', destination: null, mode: 'Student by Self', remarks: "Cousin's wedding on Saturday.", status: 'pending', requestedOn: '2026-09-16T10:12', decidedOn: null, decisionNote: null },
    { id: 'L-2026-0803', outAt: '2026-08-14T17:30', inAt: '2026-08-17T07:30', days: 4, reason: 'Festival', goingTo: 'Home', destination: null, mode: 'Parent Accompanying', remarks: 'Onam at home.', status: 'approved', requestedOn: '2026-08-10T09:40', decidedOn: '2026-08-10T15:05', decisionNote: null },
    { id: 'L-2026-0721', outAt: '2026-07-21T09:00', inAt: '2026-07-21T20:00', days: 1, reason: 'Medical', goingTo: 'Other', destination: 'Apollo Clinic, Indiranagar', mode: 'Guardian Accompanying', remarks: 'Dental appointment.', status: 'rejected', requestedOn: '2026-07-20T22:15', decidedOn: '2026-07-21T07:10', decisionNote: 'Unit test that morning; please reschedule.' },
  ],
  102: [],
};

// ── Course fee payments ───────────────────────────────────────────────────
// One order per purchase. FULL orders settle with a single payment;
// INSTALLMENTS orders carry a schedule. `status` 'scheduled' means not yet
// paid — the UI promotes it to 'overdue' once `dueOn` has passed. Invoices are
// issued on paper at the centre; `invoiceNo` is shown for reference only.
export const demoCoursePayments = {
  101: [
    {
      orderId: 6611, orderNumber: 'ORD-2026-0611', courseId: 3001,
      courseName: 'NEET Repeater 2027 — Complete Program', orderDate: '2026-06-15',
      paymentMode: 'INSTALLMENTS', totalAmount: 96000,
      payments: [
        { id: 'P-6611-1', installmentNo: 1, label: 'Installment 1 (admission)', amount: 24000, dueOn: '2026-06-15', paidOn: '2026-06-15', status: 'paid', method: 'bank_transfer', reference: 'UTR 6193XXXX21', invoiceNo: 'INV-26-0611' },
        { id: 'P-6611-2', installmentNo: 2, label: 'Installment 2', amount: 24000, dueOn: '2026-08-15', paidOn: '2026-08-19', status: 'paid', method: 'upi', reference: 'UPI 5220XXXX18', invoiceNo: 'INV-26-0842', late: true },
        { id: 'P-6611-3', installmentNo: 3, label: 'Installment 3', amount: 24000, dueOn: '2026-10-15', paidOn: null, status: 'scheduled', method: null, reference: null, invoiceNo: null },
        { id: 'P-6611-4', installmentNo: 4, label: 'Installment 4', amount: 24000, dueOn: '2026-12-15', paidOn: null, status: 'scheduled', method: null, reference: null, invoiceNo: null },
      ],
    },
    {
      orderId: 6702, orderNumber: 'ORD-2026-0702', courseId: 3002,
      courseName: 'NEET Grand Test Series 2027', orderDate: '2026-07-01',
      paymentMode: 'FULL', totalAmount: 2499,
      payments: [
        { id: 'P-6702-1', installmentNo: 1, label: 'Full payment', amount: 2499, dueOn: '2026-07-01', paidOn: '2026-07-01', status: 'paid', method: 'upi', reference: 'UPI 4471XXXX09', invoiceNo: 'INV-26-0702' },
      ],
    },
    {
      orderId: 6810, orderNumber: 'ORD-2026-0810', courseId: 3003,
      courseName: 'Physics Problem Solving Bootcamp', orderDate: '2026-08-10',
      paymentMode: 'FULL', totalAmount: 4500,
      payments: [
        { id: 'P-6810-1', installmentNo: 1, label: 'Full payment', amount: 4500, dueOn: '2026-08-10', paidOn: '2026-08-10', status: 'paid', method: 'card', reference: 'Card •• 4417', invoiceNo: 'INV-26-0810' },
      ],
    },
    {
      orderId: 6401, orderNumber: 'ORD-2026-0401', courseId: 3004,
      courseName: 'Foundation Bridge Course', orderDate: '2026-04-01',
      paymentMode: 'FULL', totalAmount: 3000,
      payments: [
        { id: 'P-6401-1', installmentNo: 1, label: 'Full payment', amount: 3000, dueOn: '2026-04-01', paidOn: '2026-04-01', status: 'paid', method: 'cash', reference: null, invoiceNo: 'INV-26-0401' },
      ],
    },
  ],
  102: [
    {
      orderId: 6704, orderNumber: 'ORD-2026-0704', courseId: 3101,
      courseName: 'IISER Foundation 2028 — Two Year Program', orderDate: '2026-07-04',
      paymentMode: 'INSTALLMENTS', totalAmount: 120000,
      payments: [
        { id: 'P-6704-1', installmentNo: 1, label: 'Installment 1 (admission)', amount: 20000, dueOn: '2026-07-04', paidOn: '2026-07-04', status: 'paid', method: 'cheque', reference: 'CHQ 004512', invoiceNo: 'INV-26-0704' },
        { id: 'P-6704-2', installmentNo: 2, label: 'Installment 2', amount: 20000, dueOn: '2026-08-04', paidOn: '2026-08-02', status: 'paid', method: 'upi', reference: 'UPI 7731XXXX55', invoiceNo: 'INV-26-0802' },
        { id: 'P-6704-3', installmentNo: 3, label: 'Installment 3', amount: 20000, dueOn: '2026-09-04', paidOn: null, status: 'scheduled', method: null, reference: null, invoiceNo: null },
        { id: 'P-6704-4', installmentNo: 4, label: 'Installment 4', amount: 20000, dueOn: '2026-10-04', paidOn: null, status: 'scheduled', method: null, reference: null, invoiceNo: null },
        { id: 'P-6704-5', installmentNo: 5, label: 'Installment 5', amount: 20000, dueOn: '2026-11-04', paidOn: null, status: 'scheduled', method: null, reference: null, invoiceNo: null },
        { id: 'P-6704-6', installmentNo: 6, label: 'Installment 6', amount: 20000, dueOn: '2026-12-04', paidOn: null, status: 'scheduled', method: null, reference: null, invoiceNo: null },
      ],
    },
    {
      orderId: 6705, orderNumber: 'ORD-2026-0705', courseId: 3102,
      courseName: 'Weekly PYQ Series — Class 11', orderDate: '2026-07-04',
      paymentMode: 'FULL', totalAmount: 1499,
      payments: [
        { id: 'P-6705-1', installmentNo: 1, label: 'Full payment', amount: 1499, dueOn: '2026-07-04', paidOn: '2026-07-04', status: 'paid', method: 'upi', reference: 'UPI 9012XXXX37', invoiceNo: 'INV-26-0705' },
      ],
    },
    {
      orderId: 6820, orderNumber: 'ORD-2026-0820', courseId: 3103,
      courseName: 'Olympiad Mathematics Primer', orderDate: '2026-08-20',
      paymentMode: 'FULL', totalAmount: 1999,
      payments: [
        { id: 'P-6820-1', installmentNo: 1, label: 'Full payment', amount: 1999, dueOn: '2026-08-20', paidOn: '2026-08-20', status: 'paid', method: 'cash', reference: null, invoiceNo: 'INV-26-0820' },
      ],
    },
  ],
};

// ── Contacts ──────────────────────────────────────────────────────────────
// Institute-wide contacts plus the child's class teacher. `phone` is digits
// only (10-digit Indian mobile) so the UI can build tel: / WhatsApp links.
const INSTITUTE_CONTACTS = [
  { id: 'director', role: 'Director', name: 'Amith C S', phone: '9633104657', email: 'amith@crisprlearning.com', note: 'Admissions, fees and escalations' },
  { id: 'academic-head', role: 'Academic Head', name: 'Arathi Krishna', phone: null, email: 'arathi@crisprlearning.com', note: 'Syllabus, tests and academic progress' },
  { id: 'technical-head', role: 'Technical Head', name: 'Abhijith C S', phone: '9043960876', email: null, note: 'App access, login and portal issues' },
];

export const demoContacts = {
  101: [
    { id: 'class-teacher', role: 'Class Teacher', name: 'Afshana Khaleel', phone: '7736758977', email: null, note: 'Day-to-day attendance and classroom matters', primary: true },
    ...INSTITUTE_CONTACTS,
  ],
  102: [
    { id: 'class-teacher', role: 'Class Teacher', name: 'Afshana Khaleel', phone: '7736758977', email: null, note: 'Day-to-day attendance and classroom matters', primary: true },
    ...INSTITUTE_CONTACTS,
  ],
};

// ── Progress reports (PDF, direct download) ────────────────────────────────
export const demoProgressReports = {
  101: [
    { id: 1, title: 'Progress Report : July – September 2026', url: 'https://crisprlearning.b-cdn.net/user-data/progress-reports/candidate/e6ef8db6-4065-4f9f-b978-4e8e1838ca39.pdf', issuedOn: '2026-09-30', fileType: 'pdf' },
    { id: 2, title: 'Progress Report : April – June 2026', url: 'https://crisprlearning.b-cdn.net/user-data/progress-reports/candidate/e6ef8db6-4065-4f9f-b978-4e8e1838ca39.pdf', issuedOn: '2026-07-02', fileType: 'pdf' },
  ],
  102: [],
};
