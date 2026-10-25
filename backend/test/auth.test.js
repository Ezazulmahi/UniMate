const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, signUp } = require('./helpers');
const { isUniversityEmail } = require('../src/routes/auth');

test('only university email domains are accepted', () => {
  assert.equal(isUniversityEmail('a@g.bracu.ac.bd'), true);
  assert.equal(isUniversityEmail('a@northsouth.edu'), true);
  assert.equal(isUniversityEmail('a@du.edu.bd'), true);
  assert.equal(isUniversityEmail('a@gmail.com'), false);
  assert.equal(isUniversityEmail('a@fakeedu.com'), false);
  assert.equal(isUniversityEmail('a@notac.bd'), false);
});

test('register, log in and read the current user', async () => {
  const { auth, user } = await signUp({ email: 'Rafi@G.BRACU.ac.bd' });
  assert.equal(user.email, 'rafi@g.bracu.ac.bd');
  assert.equal(user.passwordHash, undefined);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'rafi@g.bracu.ac.bd', password: 'password123' })
    .expect(200);
  assert.ok(login.body.token);

  const me = await request(app).get('/api/auth/me').set(auth).expect(200);
  assert.equal(me.body.user.email, 'rafi@g.bracu.ac.bd');
});

test('rejects personal emails, short passwords, duplicates and wrong passwords', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'X', email: 'x@gmail.com', password: 'password123' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'X', email: 'x@uni.edu', password: 'short' })
    .expect(400);
  await signUp({ email: 'dup@uni.edu' });
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'X', email: 'dup@uni.edu', password: 'password123' })
    .expect(409);
  await request(app).post('/api/auth/login').send({ email: 'dup@uni.edu', password: 'nope-nope' }).expect(401);
});

test('protected routes need a valid token', async () => {
  await request(app).get('/api/routine').expect(401);
  await request(app).get('/api/routine').set('Authorization', 'Bearer garbage').expect(401);
});
