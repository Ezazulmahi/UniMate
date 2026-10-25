process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = '';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `unimate-test-uploads-${process.pid}`);

const { before, after, beforeEach } = require('node:test');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  await require('fs/promises').rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

let counter = 0;
async function signUp(overrides = {}) {
  counter += 1;
  const body = {
    name: `Student ${counter}`,
    email: `student${counter}@g.bracu.ac.bd`,
    password: 'password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body).expect(201);
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
}

module.exports = { app, request, signUp };
