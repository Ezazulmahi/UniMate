const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { requireAuth } = require('./middleware/auth');
const { errorHandler } = require('./utils');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin.toLowerCase())),
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/routine', requireAuth, require('./routes/routine'));
app.use('/api/academic', requireAuth, require('./routes/academic'));
app.use('/api/resources', requireAuth, require('./routes/resources'));
app.use('/api/faculty', requireAuth, require('./routes/faculty'));
app.use('/api/rides', requireAuth, require('./routes/rides'));
app.use('/api/tutoring', requireAuth, require('./routes/tutoring'));
app.use('/api/chat', requireAuth, require('./routes/chat'));
app.use('/api/assistant', requireAuth, require('./routes/assistant'));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
