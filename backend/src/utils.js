const mongoose = require('mongoose');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Picks the listed keys from a request body, ignoring everything else.
function pick(body, keys) {
  const out = {};
  for (const key of keys) {
    if (body && body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function assertId(id, label = 'Item') {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, `${label} not found`);
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeCourseCode = (code) =>
  String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '');

function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message])
    );
    return res.status(400).json({ error: 'Please check the highlighted fields', details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ error: 'That already exists' });
  }
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong' });
}

module.exports = { HttpError, pick, assertId, escapeRegex, normalizeCourseCode, errorHandler };
