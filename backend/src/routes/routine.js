const express = require('express');
const RoutineEntry = require('../models/RoutineEntry');
const { HttpError, pick, assertId } = require('../utils');

const router = express.Router();
const FIELDS = ['courseCode', 'title', 'kind', 'day', 'start', 'end', 'room'];

// Returns pairs of entry ids that overlap, so the UI can highlight them.
function findClashes(entries) {
  const clashes = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (RoutineEntry.overlaps(entries[i], entries[j])) {
        clashes.push([String(entries[i]._id), String(entries[j]._id)]);
      }
    }
  }
  return clashes;
}

async function clashesFor(userId, entry) {
  const sameDay = await RoutineEntry.find({ user: userId, day: entry.day, _id: { $ne: entry._id } });
  return sameDay.filter((other) => RoutineEntry.overlaps(entry, other));
}

router.get('/', async (req, res) => {
  const entries = await RoutineEntry.find({ user: req.userId }).sort({ start: 1 });
  entries.sort((a, b) => RoutineEntry.DAYS.indexOf(a.day) - RoutineEntry.DAYS.indexOf(b.day));
  res.json({ entries, clashes: findClashes(entries), days: RoutineEntry.DAYS });
});

// Saving a clashing entry is allowed; the response lists what it clashes with.
router.post('/', async (req, res) => {
  const entry = await RoutineEntry.create({ ...pick(req.body, FIELDS), user: req.userId });
  res.status(201).json({ entry, clashesWith: await clashesFor(req.userId, entry) });
});

router.put('/:id', async (req, res) => {
  assertId(req.params.id, 'Routine entry');
  const entry = await RoutineEntry.findOne({ _id: req.params.id, user: req.userId });
  if (!entry) throw new HttpError(404, 'Routine entry not found');
  entry.set(pick(req.body, FIELDS));
  await entry.save();
  res.json({ entry, clashesWith: await clashesFor(req.userId, entry) });
});

router.delete('/:id', async (req, res) => {
  assertId(req.params.id, 'Routine entry');
  const result = await RoutineEntry.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Routine entry not found');
  res.status(204).end();
});

module.exports = router;
module.exports.findClashes = findClashes;
