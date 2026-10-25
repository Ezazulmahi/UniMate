// Runs the API against a throwaway in-memory MongoDB, so you can try the app
// without an Atlas cluster. Data is lost when the process stops.
//   npm run dev:memory
process.env.JWT_SECRET ||= 'local-demo-secret';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../src/config');
const app = require('../src/app');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port} (in-memory database)`);
  });
  const stop = async () => {
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();
