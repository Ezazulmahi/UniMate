require('dotenv').config({ quiet: true });

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Only emails ending in one of these domains can sign up.
  allowedEmailDomains: list(process.env.ALLOWED_EMAIL_DOMAINS, 'edu,edu.bd,ac.bd'),
  corsOrigins: list(process.env.CORS_ORIGINS, 'http://localhost:5173'),
  uploadDir: process.env.UPLOAD_DIR || require('path').join(__dirname, '..', 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 10,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
};
