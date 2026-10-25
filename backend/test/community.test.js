const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, signUp } = require('./helpers');

const inOneDay = () => new Date(Date.now() + 86400000).toISOString();

test('faculty reviews: one per student, averages, anonymity and moderation', async () => {
  const a = await signUp();
  const b = await signUp();
  const created = await request(app)
    .post('/api/faculty')
    .set(a.auth)
    .send({ name: 'Dr. Rahman', initials: 'mrn', department: 'CSE', courses: 'cse220, cse221' })
    .expect(201);
  const id = created.body.faculty._id;
  assert.deepEqual(created.body.faculty.courses, ['CSE220', 'CSE221']);
  await request(app).post('/api/faculty').set(b.auth).send({ name: 'dr. rahman', department: 'cse' }).expect(409);

  await request(app)
    .post(`/api/faculty/${id}/reviews`)
    .set(a.auth)
    .send({ rating: 5, difficulty: 4, comment: 'Explains recursion really well, tough quizzes.' })
    .expect(201);
  // Writing again updates the same review instead of adding one.
  await request(app)
    .post(`/api/faculty/${id}/reviews`)
    .set(a.auth)
    .send({ rating: 4, difficulty: 4, comment: 'Explains recursion well, quizzes are tough.' })
    .expect(201);
  await request(app)
    .post(`/api/faculty/${id}/reviews`)
    .set(b.auth)
    .send({ rating: 2, comment: 'Lectures are rushed and slides are thin.', anonymous: false })
    .expect(201);
  await request(app)
    .post(`/api/faculty/${id}/reviews`)
    .set(b.auth)
    .send({ rating: 1, comment: 'This teacher is an idiot honestly' })
    .expect(400);

  const viewA = await request(app).get(`/api/faculty/${id}`).set(a.auth).expect(200);
  assert.equal(viewA.body.faculty.reviewCount, 2);
  assert.equal(viewA.body.faculty.ratingAverage, 3);
  const mine = viewA.body.reviews.find((r) => r.mine);
  const theirs = viewA.body.reviews.find((r) => !r.mine);
  assert.ok(mine.author, 'you can see your own anonymous review is yours');
  assert.equal(theirs.author.name, b.user.name, 'non-anonymous reviews show the author');

  const viewB = await request(app).get(`/api/faculty/${id}`).set(b.auth).expect(200);
  assert.equal(viewB.body.reviews.find((r) => !r.mine).author, null, 'anonymous reviews hide the author');

  const summary = await request(app).get(`/api/faculty/${id}/summary`).set(a.auth).expect(200);
  assert.equal(summary.body.summary.source, 'basic');
  assert.match(summary.body.summary.text, /3\/5 from 2 review/);

  await request(app).delete(`/api/faculty/${id}/reviews/mine`).set(a.auth).expect(204);
  const after = await request(app).get(`/api/faculty/${id}`).set(a.auth).expect(200);
  assert.equal(after.body.faculty.reviewCount, 1);
});

test('rides: seats can not be overbooked, fare splits, leave and cancel', async () => {
  const host = await signUp();
  const riders = await Promise.all([signUp(), signUp(), signUp(), signUp()]);
  const created = await request(app)
    .post('/api/rides')
    .set(host.auth)
    .send({ from: 'Mohakhali', to: 'Merul Badda', departAt: inOneDay(), seats: 2, totalFare: 300 })
    .expect(201);
  const id = created.body.ride._id;
  assert.equal(created.body.ride.farePerPerson, 300);

  await request(app).post(`/api/rides/${id}/join`).set(host.auth).expect(409);

  // Four students race for two seats.
  const results = await Promise.all(riders.map((r) => request(app).post(`/api/rides/${id}/join`).set(r.auth)));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 200, 409, 409]);

  const joined = riders.filter((_, i) => results[i].status === 200);
  const left = riders.find((_, i) => results[i].status === 409);
  await request(app).post(`/api/rides/${id}/join`).set(joined[0].auth).expect(409);

  const list = await request(app).get('/api/rides').set(left.auth).expect(200);
  const ride = list.body.rides.find((r) => r._id === id);
  assert.equal(ride.seatsLeft, 0);
  assert.equal(ride.farePerPerson, 100);

  await request(app).post(`/api/rides/${id}/leave`).set(joined[0].auth).expect(200);
  await request(app).post(`/api/rides/${id}/join`).set(left.auth).expect(200);

  await request(app).post(`/api/rides/${id}/cancel`).set(left.auth).expect(404);
  await request(app).post(`/api/rides/${id}/cancel`).set(host.auth).expect(200);
  await request(app).post(`/api/rides/${id}/join`).set(joined[0].auth).expect(409);

  await request(app)
    .post('/api/rides')
    .set(host.auth)
    .send({ from: 'A', to: 'B', departAt: new Date(Date.now() - 60000).toISOString(), seats: 1, totalFare: 50 })
    .expect(400);
});

test('tutoring: help requests, tutor profiles and chat', async () => {
  const student = await signUp();
  const tutor = await signUp();

  const req1 = await request(app)
    .post('/api/tutoring/requests')
    .set(student.auth)
    .send({ courseCode: 'mat216', title: 'Need help with eigenvalues', details: 'Before Thursday quiz' })
    .expect(201);
  await request(app)
    .patch(`/api/tutoring/requests/${req1.body.request._id}`)
    .set(tutor.auth)
    .send({ status: 'resolved' })
    .expect(404);

  await request(app).put('/api/tutoring/tutors/me').set(tutor.auth).send({ courses: '' }).expect(400);
  const profile = await request(app)
    .put('/api/tutoring/tutors/me')
    .set(tutor.auth)
    .send({ courses: 'MAT216, mat120', rate: 0, mode: 'Online', availability: 'Evenings' })
    .expect(200);
  assert.deepEqual(profile.body.tutor.courses, ['MAT216', 'MAT120']);
  const tutors = await request(app).get('/api/tutoring/tutors?course=mat216').set(student.auth).expect(200);
  assert.equal(tutors.body.tutors.length, 1);

  const conv = await request(app)
    .post('/api/chat')
    .set(student.auth)
    .send({ userId: tutor.user._id, topic: 'MAT216 help' })
    .expect(201);
  const again = await request(app).post('/api/chat').set(tutor.auth).send({ userId: student.user._id }).expect(201);
  assert.equal(again.body.conversation._id, conv.body.conversation._id, 'one conversation per pair');
  const cid = conv.body.conversation._id;

  await request(app).post(`/api/chat/${cid}/messages`).set(student.auth).send({ text: 'Hi! Free tonight?' }).expect(201);
  const inbox = await request(app).get('/api/chat').set(tutor.auth).expect(200);
  assert.equal(inbox.body.conversations[0].unread, true);
  assert.equal(inbox.body.conversations[0].other.name, student.user.name);

  const msgs = await request(app).get(`/api/chat/${cid}/messages`).set(tutor.auth).expect(200);
  assert.equal(msgs.body.messages.length, 1);
  const inboxAfter = await request(app).get('/api/chat').set(tutor.auth).expect(200);
  assert.equal(inboxAfter.body.conversations[0].unread, false);

  const outsider = await signUp();
  await request(app).get(`/api/chat/${cid}/messages`).set(outsider.auth).expect(404);
  await request(app).post('/api/chat').set(student.auth).send({ userId: student.user._id }).expect(400);

  await request(app)
    .patch(`/api/tutoring/requests/${req1.body.request._id}`)
    .set(student.auth)
    .send({ status: 'resolved' })
    .expect(200);
  const open = await request(app).get('/api/tutoring/requests').set(tutor.auth).expect(200);
  assert.equal(open.body.requests.length, 0);
});
