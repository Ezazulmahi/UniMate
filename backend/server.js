const mongoose = require('mongoose');
const config = require('./src/config');
const app = require('./src/app');

async function start() {
  if (!config.mongoUri) {
    console.error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('JWT_SECRET must be set in production.');
      process.exit(1);
    }
    console.warn('JWT_SECRET is not set; using an insecure development secret.');
  }
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Could not start the server:', err.message);
  process.exit(1);
});
