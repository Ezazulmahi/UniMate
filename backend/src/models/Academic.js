const mongoose = require('mongoose');

// Common 4.0 scale used by most Bangladeshi private universities.
const GRADE_POINTS = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  F: 0,
};

const gradeEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    credits: { type: Number, required: true, min: 0.5, max: 6 },
    grade: { type: String, required: true, enum: Object.keys(GRADE_POINTS) },
    semester: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { timestamps: true }
);

const examSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    title: { type: String, trim: true, maxlength: 120, default: 'Exam' },
    date: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 80, default: '' },
  },
  { timestamps: true }
);

function computeCgpa(entries) {
  const round = (n) => Math.round(n * 100) / 100;
  const bySemester = new Map();
  let points = 0;
  let credits = 0;
  for (const e of entries) {
    const p = GRADE_POINTS[e.grade] * e.credits;
    points += p;
    credits += e.credits;
    const s = bySemester.get(e.semester) || { semester: e.semester, points: 0, credits: 0 };
    s.points += p;
    s.credits += e.credits;
    bySemester.set(e.semester, s);
  }
  return {
    cgpa: credits ? round(points / credits) : null,
    totalCredits: credits,
    semesters: [...bySemester.values()].map((s) => ({
      semester: s.semester,
      credits: s.credits,
      gpa: round(s.points / s.credits),
    })),
  };
}

module.exports = {
  GradeEntry: mongoose.model('GradeEntry', gradeEntrySchema),
  Exam: mongoose.model('Exam', examSchema),
  GRADE_POINTS,
  computeCgpa,
};
