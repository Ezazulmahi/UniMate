const express = require('express');
const { GradeEntry, Exam, GRADE_POINTS, computeCgpa } = require('../models/Academic');
const { HttpError, pick, assertId } = require('../utils');

const router = express.Router();
const GRADE_FIELDS = ['courseCode', 'title', 'credits', 'grade', 'semester'];
const EXAM_FIELDS = ['courseCode', 'title', 'date', 'location'];

router.get('/grades', async (req, res) => {
  const grades = await GradeEntry.find({ user: req.userId }).sort({ createdAt: 1 });
  res.json({ grades, scale: GRADE_POINTS, ...computeCgpa(grades) });
});

router.post('/grades', async (req, res) => {
  const grade = await GradeEntry.create({ ...pick(req.body, GRADE_FIELDS), user: req.userId });
  res.status(201).json({ grade });
});

router.delete('/grades/:id', async (req, res) => {
  assertId(req.params.id, 'Grade');
  const result = await GradeEntry.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Grade not found');
  res.status(204).end();
});

// "What if" calculator: works on grades sent in the body without saving them.
router.post('/cgpa/preview', (req, res) => {
  const rows = Array.isArray(req.body?.grades) ? req.body.grades : [];
  const valid = rows.filter((r) => r && GRADE_POINTS[r.grade] !== undefined && Number(r.credits) > 0);
  res.json(computeCgpa(valid.map((r) => ({ ...r, credits: Number(r.credits), semester: r.semester || 'Preview' }))));
});

router.get('/exams', async (req, res) => {
  const filter = { user: req.userId };
  if (req.query.upcoming === 'true') filter.date = { $gte: new Date() };
  const exams = await Exam.find(filter).sort({ date: 1 });
  res.json({ exams });
});

router.post('/exams', async (req, res) => {
  const exam = await Exam.create({ ...pick(req.body, EXAM_FIELDS), user: req.userId });
  res.status(201).json({ exam });
});

router.delete('/exams/:id', async (req, res) => {
  assertId(req.params.id, 'Exam');
  const result = await Exam.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Exam not found');
  res.status(204).end();
});

module.exports = router;
