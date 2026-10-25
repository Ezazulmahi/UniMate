const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { HttpError } = require('../utils');

// Requires a valid "Authorization: Bearer <token>" header and sets req.userId.
function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Login required');
  try {
    req.userId = jwt.verify(token, jwtSecret).sub;
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }
  next();
}

module.exports = { requireAuth };
