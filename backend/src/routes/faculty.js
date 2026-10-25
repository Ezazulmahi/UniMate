const express = require('express');
const mongoose = require('mongoose');
const { Faculty, Review } = require('../models/Faculty');
const ai = require('../services/ai');
const { checkText } = require('../services/moderation');
const { HttpError, pick, assertId, escapeRegex, normalizeCourseCode } = require('../utils');

const router = express.Router();

async function refreshStats(facultyId) {
  const [stats] = await Review.aggregate([
    { $match: { faculty: new mongoose.Types.ObjectId(facultyId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Faculty.updateOne(
    { _id: facultyId },
    { ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0, reviewCount: stats?.count || 0 }
  );
}

// Hides the author of anonymous reviews from everyone except themselves.
function presentReview(review, viewerId) {
  const json = review.toJSON();
  const mine = String(review.author?._id || review.author) === viewerId;
  json.mine = mine;
  if (review.anonymous && !mine) json.author = null;
  return json;
}

router.get('/', async (req, res) => {
  const filter = {};
  const q = String(req.query.q || '').trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: re }, { initials: re }, { department: re }, { courses: re }];
  }
  if (req.query.department) filter.department = new RegExp(`^${escapeRegex(req.query.department)}$`, 'i');
  const faculty = await Faculty.find(filter).sort({ reviewCount: -1, name: 1 }).limit(100).select('-summary');
  res.json({ faculty });
});

router.post('/', async (req, res) => {
  const fields = pick(req.body, ['name', 'initials', 'department']);
  const courses = (Array.isArray(req.body.courses) ? req.body.courses : String(req.body.courses || '').split(','))
    .map(normalizeCourseCode)
    .filter(Boolean);
  const faculty = await Faculty.create({ ...fields, courses, addedBy: req.userId });
  res.status(201).json({ faculty });
});

router.get('/:id', async (req, res) => {
  assertId(req.params.id, 'Teacher');
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) throw new HttpError(404, 'Teacher not found');
  const reviews = await Review.find({ faculty: faculty._id })
    .sort({ createdAt: -1 })
    .populate('author', 'name department');
  res.json({ faculty, reviews: reviews.map((r) => presentReview(r, req.userId)), aiEnabled: ai.isEnabled() });
});

// Creates the viewer's review, or updates it if they already wrote one.
router.post('/:id/reviews', async (req, res) => {
  assertId(req.params.id, 'Teacher');
  if (!(await Faculty.exists({ _id: req.params.id }))) throw new HttpError(404, 'Teacher not found');
  const fields = pick(req.body, ['rating', 'difficulty', 'comment', 'anonymous']);
  fields.courseCode = normalizeCourseCode(req.body.courseCode);
  const problem = checkText(fields.comment);
  if (problem) throw new HttpError(400, problem);

  const review = await Review.findOneAndUpdate(
    { faculty: req.params.id, author: req.userId },
    { $set: fields },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('author', 'name department');
  await refreshStats(req.params.id);
  res.status(201).json({ review: presentReview(review, req.userId) });
});

router.delete('/:id/reviews/mine', async (req, res) => {
  assertId(req.params.id, 'Teacher');
  const result = await Review.deleteOne({ faculty: req.params.id, author: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'You have not reviewed this teacher');
  await refreshStats(req.params.id);
  res.status(204).end();
});

function basicSummary(faculty, reviews) {
  const avgDifficulty = reviews.reduce((s, r) => s + (r.difficulty || 3), 0) / reviews.length;
  const best = reviews.filter((r) => r.rating >= 4).slice(0, 2);
  const worst = reviews.filter((r) => r.rating <= 2).slice(0, 2);
  const clip = (t) => (t.length > 160 ? `${t.slice(0, 157)}...` : t);
  const lines = [
    `${faculty.name} has an average rating of ${faculty.ratingAverage}/5 from ${reviews.length} review(s), ` +
      `with an average difficulty of ${avgDifficulty.toFixed(1)}/5.`,
  ];
  if (best.length) lines.push(`Students liked: ${best.map((r) => `"${clip(r.comment)}"`).join(' ')}`);
  if (worst.length) lines.push(`Concerns: ${worst.map((r) => `"${clip(r.comment)}"`).join(' ')}`);
  return lines.join('\n\n');
}

// Summarises the reviews into pros and cons. The result is cached until the
// reviews are added, edited or removed.
router.get('/:id/summary', async (req, res) => {
  assertId(req.params.id, 'Teacher');
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) throw new HttpError(404, 'Teacher not found');
  const reviews = await Review.find({ faculty: faculty._id }).sort({ updatedAt: -1 }).limit(60);
  if (!reviews.length) return res.json({ summary: null });

  const total = await Review.countDocuments({ faculty: faculty._id });
  const cacheKey = `${total}:${reviews[0].updatedAt.getTime()}`;
  const cached = faculty.summary;
  const wantsAi = ai.isEnabled();
  if (cached?.text && cached.cacheKey === cacheKey && (cached.source === 'ai' || !wantsAi)) {
    return res.json({ summary: cached });
  }

  let text = null;
  let source = 'basic';
  if (wantsAi) {
    try {
      const list = reviews
        .map((r, i) => `${i + 1}. Rating ${r.rating}/5, difficulty ${r.difficulty}/5${r.courseCode ? `, ${r.courseCode}` : ''}: ${r.comment}`)
        .join('\n');
      text = await ai.complete({
        system:
          'You summarise student reviews of a university teacher for other students. Be fair and specific. ' +
          'Write plain text with three short sections titled "Pros:", "Cons:" and "Tips:", each with 2 to 4 ' +
          'bullet points starting with "- ". Do not invent facts that are not in the reviews, and never ' +
          'include personal attacks or details about the teacher\'s private life.',
        prompt: `Teacher: ${faculty.name} (${faculty.department})\nReviews:\n${list}`,
        maxTokens: 600,
      });
      if (text) source = 'ai';
    } catch (err) {
      console.warn('AI summary failed, using basic summary:', err.message);
    }
  }
  if (!text) text = basicSummary(faculty, reviews);

  faculty.summary = { text, source, reviewCount: total, cacheKey, generatedAt: new Date() };
  await faculty.save();
  res.json({ summary: faculty.summary });
});

module.exports = router;
