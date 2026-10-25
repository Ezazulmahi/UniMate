const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { HttpError, pick } = require('../utils');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again in a few minutes' },
  skip: () => process.env.NODE_ENV === 'test',
});

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;

function isUniversityEmail(email) {
  const match = EMAIL_RE.exec(email);
  if (!match) return false;
  const domain = match[1].toLowerCase();
  return config.allowedEmailDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

const signToken = (user) =>
  jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

router.post('/register', authLimiter, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const department = String(req.body?.department || '').trim();

  if (!name) throw new HttpError(400, 'Name is required');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
  if (!isUniversityEmail(email)) {
    throw new HttpError(400, 'Use your university email address', {
      allowedDomains: config.allowedEmailDomains,
    });
  }
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, department });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', authLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
});

router.patch('/me', requireAuth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, pick(req.body, ['name', 'department', 'bio']), {
    new: true,
    runValidators: true,
  });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
});

module.exports = router;
module.exports.isUniversityEmail = isUniversityEmail;
