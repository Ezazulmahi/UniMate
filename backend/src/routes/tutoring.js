const express = require('express');
const { HelpRequest, TutorProfile } = require('../models/Tutoring');
const { checkText } = require('../services/moderation');
const { HttpError, pick, assertId, escapeRegex, normalizeCourseCode } = require('../utils');

const router = express.Router();
const PERSON = 'name department';

const courseList = (value) =>
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map(normalizeCourseCode)
    .filter(Boolean);

// Help requests

router.get('/requests', async (req, res) => {
  const filter = {};
  if (req.query.mine === 'true') filter.author = req.userId;
  else filter.status = req.query.status === 'resolved' ? 'resolved' : 'open';
  if (req.query.course) filter.courseCode = normalizeCourseCode(req.query.course);
  if (req.query.q) {
    const re = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: re }, { details: re }];
  }
  const requests = await HelpRequest.find(filter).sort({ createdAt: -1 }).limit(100).populate('author', PERSON);
  res.json({ requests });
});

router.post('/requests', async (req, res) => {
  const fields = pick(req.body, ['title', 'details']);
  const problem = checkText(`${fields.title || ''} ${fields.details || ''}`);
  if (problem) throw new HttpError(400, problem);
  const request = await HelpRequest.create({
    ...fields,
    courseCode: normalizeCourseCode(req.body.courseCode),
    author: req.userId,
  });
  await request.populate('author', PERSON);
  res.status(201).json({ request });
});

router.patch('/requests/:id', async (req, res) => {
  assertId(req.params.id, 'Request');
  const request = await HelpRequest.findOneAndUpdate(
    { _id: req.params.id, author: req.userId },
    pick(req.body, ['status', 'title', 'details']),
    { new: true, runValidators: true }
  ).populate('author', PERSON);
  if (!request) throw new HttpError(404, 'Request not found, or it is not yours');
  res.json({ request });
});

router.delete('/requests/:id', async (req, res) => {
  assertId(req.params.id, 'Request');
  const result = await HelpRequest.deleteOne({ _id: req.params.id, author: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Request not found, or it is not yours');
  res.status(204).end();
});

// Tutors

router.get('/tutors', async (req, res) => {
  const filter = { active: true };
  if (req.query.course) filter.courses = normalizeCourseCode(req.query.course);
  if (req.query.free === 'true') filter.rate = 0;
  const tutors = await TutorProfile.find(filter).sort({ rate: 1, updatedAt: -1 }).limit(100).populate('user', PERSON);
  res.json({ tutors });
});

router.get('/tutors/me', async (req, res) => {
  const tutor = await TutorProfile.findOne({ user: req.userId });
  res.json({ tutor });
});

// Creates or updates the viewer's tutor profile.
router.put('/tutors/me', async (req, res) => {
  const fields = pick(req.body, ['rate', 'mode', 'availability', 'about', 'active']);
  fields.courses = courseList(req.body.courses);
  const problem = checkText(`${fields.about || ''} ${fields.availability || ''}`);
  if (problem) throw new HttpError(400, problem);
  const tutor = await TutorProfile.findOneAndUpdate(
    { user: req.userId },
    { $set: fields },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('user', PERSON);
  res.json({ tutor });
});

module.exports = router;
