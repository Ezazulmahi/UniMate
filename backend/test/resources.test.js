const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, signUp } = require('./helpers');
const config = require('../src/config');
const ai = require('../src/services/ai');
const { chunkText } = require('../src/services/retrieval');

const NOTES = `Stacks and queues

A stack is a last in, first out (LIFO) structure. Push adds to the top and pop removes from the top.

A queue is first in, first out (FIFO). Enqueue adds at the rear and dequeue removes from the front.

Binary search trees keep smaller keys on the left and larger keys on the right, so search takes O(log n) on a balanced tree.`;

test('chunkText splits long text into overlapping pieces', () => {
  const long = 'Sentence about trees. '.repeat(200);
  const chunks = chunkText(long, 500, 100);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((c) => c.length <= 500));
});

test('upload a text file, search for it, download it and delete it', async () => {
  const owner = await signUp();
  const other = await signUp();

  const created = await request(app)
    .post('/api/resources')
    .set(owner.auth)
    .field('title', 'CSE220 data structures notes')
    .field('courseCode', 'cse 220')
    .field('kind', 'Notes')
    .attach('file', Buffer.from(NOTES), 'notes.txt')
    .expect(201);
  const resource = created.body.resource;
  assert.equal(resource.courseCode, 'CSE220');
  assert.ok(resource.indexedChunks >= 1);
  assert.equal(resource.file.originalName, 'notes.txt');
  assert.equal(resource.file.storedName, undefined);

  const found = await request(app).get('/api/resources?q=structures').set(other.auth).expect(200);
  assert.equal(found.body.resources.length, 1);
  const byCourse = await request(app).get('/api/resources?course=CSE220').set(other.auth).expect(200);
  assert.equal(byCourse.body.resources.length, 1);

  const file = await request(app).get(`/api/resources/${resource._id}/file`).set(other.auth).expect(200);
  assert.match(file.headers['content-disposition'], /notes\.txt/);

  await request(app).delete(`/api/resources/${resource._id}`).set(other.auth).expect(404);
  await request(app).delete(`/api/resources/${resource._id}`).set(owner.auth).expect(204);
});

test('resources need a file or a valid link, and reject unsupported files', async () => {
  const { auth } = await signUp();
  await request(app).post('/api/resources').set(auth).send({ title: 'Nothing', courseCode: 'CSE110' }).expect(400);
  await request(app)
    .post('/api/resources')
    .set(auth)
    .send({ title: 'Bad link', courseCode: 'CSE110', link: 'javascript:alert(1)' })
    .expect(400);
  await request(app)
    .post('/api/resources')
    .set(auth)
    .field('title', 'Program')
    .field('courseCode', 'CSE110')
    .attach('file', Buffer.from('MZ'), 'virus.exe')
    .expect(400);
  await request(app)
    .post('/api/resources')
    .set(auth)
    .send({ title: 'Drive folder', courseCode: 'CSE110', link: 'https://drive.google.com/x' })
    .expect(201);
});

test('study assistant finds passages without AI, and uses AI when configured', async () => {
  const { auth } = await signUp();
  await request(app)
    .post('/api/resources')
    .set(auth)
    .field('title', 'DS notes')
    .field('courseCode', 'CSE220')
    .attach('file', Buffer.from(NOTES), 'notes.txt')
    .expect(201);

  const search = await request(app)
    .post('/api/assistant/ask')
    .set(auth)
    .send({ question: 'What is a queue and FIFO?' })
    .expect(200);
  assert.equal(search.body.mode, 'search');
  assert.ok(search.body.passages[0].text.includes('FIFO'));

  const none = await request(app)
    .post('/api/assistant/ask')
    .set(auth)
    .send({ question: 'photosynthesis chlorophyll', courseCode: 'CSE220' })
    .expect(200);
  assert.equal(none.body.mode, 'none');

  let prompt;
  config.anthropicApiKey = 'test-key';
  ai.setClientForTests({
    beta: {
      messages: {
        create: async (req) => {
          prompt = req.messages[0].content;
          return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'A queue is FIFO [1].' }] };
        },
      },
    },
  });
  try {
    const answered = await request(app)
      .post('/api/assistant/ask')
      .set(auth)
      .send({ question: 'What is a queue?', courseCode: 'cse220' })
      .expect(200);
    assert.equal(answered.body.mode, 'ai');
    assert.equal(answered.body.answer, 'A queue is FIFO [1].');
    assert.match(prompt, /FIFO/);
  } finally {
    config.anthropicApiKey = '';
    ai.setClientForTests(undefined);
  }
});
