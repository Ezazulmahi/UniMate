const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, signUp } = require('./helpers');

test('routine entries report clashes but are still saved', async () => {
  const { auth } = await signUp();
  const first = await request(app)
    .post('/api/routine')
    .set(auth)
    .send({ courseCode: 'cse220', day: 'Sun', start: '08:00', end: '09:20', room: 'UB-1' })
    .expect(201);
  assert.equal(first.body.entry.courseCode, 'CSE220');
  assert.deepEqual(first.body.clashesWith, []);

  const second = await request(app)
    .post('/api/routine')
    .set(auth)
    .send({ courseCode: 'MAT216', day: 'Sun', start: '09:00', end: '10:20' })
    .expect(201);
  assert.equal(second.body.clashesWith.length, 1);

  // Back-to-back classes do not clash.
  const third = await request(app)
    .post('/api/routine')
    .set(auth)
    .send({ courseCode: 'PHY111', day: 'Sun', start: '10:20', end: '11:40' })
    .expect(201);
  assert.equal(third.body.clashesWith.length, 0);

  const list = await request(app).get('/api/routine').set(auth).expect(200);
  assert.equal(list.body.entries.length, 3);
  assert.equal(list.body.clashes.length, 1);
});

test('routine validates times and keeps entries private', async () => {
  const a = await signUp();
  const b = await signUp();
  await request(app)
    .post('/api/routine')
    .set(a.auth)
    .send({ courseCode: 'CSE110', day: 'Mon', start: '11:00', end: '10:00' })
    .expect(400);
  await request(app)
    .post('/api/routine')
    .set(a.auth)
    .send({ courseCode: 'CSE110', day: 'Funday', start: '10:00', end: '11:00' })
    .expect(400);
  const created = await request(app)
    .post('/api/routine')
    .set(a.auth)
    .send({ courseCode: 'CSE110', day: 'Mon', start: '10:00', end: '11:00' })
    .expect(201);
  await request(app).delete(`/api/routine/${created.body.entry._id}`).set(b.auth).expect(404);
  const bList = await request(app).get('/api/routine').set(b.auth).expect(200);
  assert.equal(bList.body.entries.length, 0);
});

test('CGPA is credit-weighted across semesters', async () => {
  const { auth } = await signUp();
  const rows = [
    { courseCode: 'CSE110', credits: 3, grade: 'A', semester: 'Spring 2025' },
    { courseCode: 'MAT110', credits: 3, grade: 'B', semester: 'Spring 2025' },
    { courseCode: 'CSE111', credits: 4, grade: 'B+', semester: 'Summer 2025' },
  ];
  for (const row of rows) await request(app).post('/api/academic/grades').set(auth).send(row).expect(201);
  const res = await request(app).get('/api/academic/grades').set(auth).expect(200);
  // (4*3 + 3*3 + 3.3*4) / 10 = 3.42
  assert.equal(res.body.cgpa, 3.42);
  assert.equal(res.body.totalCredits, 10);
  assert.deepEqual(
    res.body.semesters.map((s) => [s.semester, s.gpa]),
    [['Spring 2025', 3.5], ['Summer 2025', 3.3]]
  );
  await request(app)
    .post('/api/academic/grades')
    .set(auth)
    .send({ courseCode: 'X', credits: 3, grade: 'Z', semester: 'S' })
    .expect(400);

  const preview = await request(app)
    .post('/api/academic/cgpa/preview')
    .set(auth)
    .send({ grades: [{ grade: 'A', credits: 3 }, { grade: 'C', credits: 3 }] })
    .expect(200);
  assert.equal(preview.body.cgpa, 3);
});

test('exams can be listed as upcoming only', async () => {
  const { auth } = await signUp();
  const soon = new Date(Date.now() + 3 * 86400000).toISOString();
  const past = new Date(Date.now() - 3 * 86400000).toISOString();
  await request(app).post('/api/academic/exams').set(auth).send({ courseCode: 'CSE220', title: 'Midterm', date: soon }).expect(201);
  await request(app).post('/api/academic/exams').set(auth).send({ courseCode: 'CSE110', title: 'Quiz', date: past }).expect(201);
  const all = await request(app).get('/api/academic/exams').set(auth).expect(200);
  const upcoming = await request(app).get('/api/academic/exams?upcoming=true').set(auth).expect(200);
  assert.equal(all.body.exams.length, 2);
  assert.equal(upcoming.body.exams.length, 1);
  assert.equal(upcoming.body.exams[0].title, 'Midterm');
});
