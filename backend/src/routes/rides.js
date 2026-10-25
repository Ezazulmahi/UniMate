const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const { HttpError, pick, assertId, escapeRegex } = require('../utils');

const router = express.Router();
const POPULATE = [
  { path: 'host', select: 'name department' },
  { path: 'passengers', select: 'name department' },
];

router.get('/', async (req, res) => {
  const filter = { status: 'open', departAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } };
  if (req.query.from) filter.from = new RegExp(escapeRegex(req.query.from), 'i');
  if (req.query.to) filter.to = new RegExp(escapeRegex(req.query.to), 'i');
  if (req.query.mine === 'true') {
    delete filter.departAt;
    filter.$or = [{ host: req.userId }, { passengers: req.userId }];
  }
  const rides = await Ride.find(filter).sort({ departAt: 1 }).limit(100).populate(POPULATE);
  res.json({ rides });
});

router.post('/', async (req, res) => {
  const fields = pick(req.body, ['from', 'to', 'departAt', 'vehicle', 'seats', 'totalFare', 'notes']);
  if (fields.departAt && new Date(fields.departAt) < new Date()) {
    throw new HttpError(400, 'Departure time must be in the future');
  }
  const ride = await Ride.create({ ...fields, host: req.userId });
  await ride.populate(POPULATE);
  res.status(201).json({ ride });
});

// Joining is a single conditional update, so two students can never both
// take the last seat even if they click at the same moment.
router.post('/:id/join', async (req, res) => {
  assertId(req.params.id, 'Ride');
  const userId = new mongoose.Types.ObjectId(req.userId);
  const ride = await Ride.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'open',
      host: { $ne: userId },
      passengers: { $ne: userId },
      departAt: { $gte: new Date() },
      $expr: { $lt: [{ $size: '$passengers' }, '$seats'] },
    },
    { $push: { passengers: userId } },
    { new: true }
  ).populate(POPULATE);

  if (!ride) {
    const existing = await Ride.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Ride not found');
    if (existing.status !== 'open') throw new HttpError(409, 'This ride was cancelled');
    if (String(existing.host) === req.userId) throw new HttpError(409, 'You are hosting this ride');
    if (existing.passengers.some((p) => String(p) === req.userId)) throw new HttpError(409, 'You already joined');
    if (existing.departAt < new Date()) throw new HttpError(409, 'This ride has already left');
    throw new HttpError(409, 'No seats left');
  }
  res.json({ ride });
});

router.post('/:id/leave', async (req, res) => {
  assertId(req.params.id, 'Ride');
  const ride = await Ride.findOneAndUpdate(
    { _id: req.params.id, passengers: req.userId },
    { $pull: { passengers: req.userId } },
    { new: true }
  ).populate(POPULATE);
  if (!ride) throw new HttpError(404, 'You are not on this ride');
  res.json({ ride });
});

router.post('/:id/cancel', async (req, res) => {
  assertId(req.params.id, 'Ride');
  const ride = await Ride.findOneAndUpdate(
    { _id: req.params.id, host: req.userId, status: 'open' },
    { status: 'cancelled' },
    { new: true }
  ).populate(POPULATE);
  if (!ride) throw new HttpError(404, 'Ride not found, or you are not the host');
  res.json({ ride });
});

module.exports = router;
