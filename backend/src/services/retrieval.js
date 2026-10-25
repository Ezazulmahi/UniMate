// Lightweight keyword retrieval over resource chunks. Good enough for course
// notes without needing an embeddings service.
const { ResourceChunk } = require('../models/Resource');

const STOP_WORDS = new Set(
  `a an and are as at be by can do does for from has have how i if in into is it its
   of on or so that the their then there these this to was what when where which who
   why will with you your we our me my explain define describe tell about`.split(/\s+/)
);

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// Splits text into overlapping chunks of roughly `size` characters,
// breaking on paragraph or sentence boundaries where possible.
function chunkText(text, size = 900, overlap = 150) {
  const clean = String(text).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '));
      if (breakAt > size * 0.5) end = start + breakAt + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

async function indexResourceText(resource, text) {
  await ResourceChunk.deleteMany({ resource: resource._id });
  const chunks = chunkText(text).slice(0, 500);
  if (!chunks.length) return 0;
  await ResourceChunk.insertMany(
    chunks.map((chunk, position) => ({
      resource: resource._id,
      courseCode: resource.courseCode,
      position,
      text: chunk,
      terms: [...new Set(tokenize(chunk))],
    }))
  );
  return chunks.length;
}

// Scores chunks by how many query terms they contain (weighted by how often
// each term appears), and returns the best few.
async function searchChunks(question, { courseCode, limit = 5 } = {}) {
  const terms = [...new Set(tokenize(question))];
  if (!terms.length) return [];
  const filter = { terms: { $in: terms } };
  if (courseCode) filter.courseCode = courseCode;
  const candidates = await ResourceChunk.find(filter)
    .limit(400)
    .populate('resource', 'title courseCode kind');
  const scored = candidates
    .filter((c) => c.resource)
    .map((c) => {
      const lower = c.text.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (!c.terms.includes(t)) continue;
        score += 1 + Math.min(lower.split(t).length - 2, 4) * 0.25;
      }
      return { chunk: c, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ chunk, score }) => ({
    resourceId: String(chunk.resource._id),
    title: chunk.resource.title,
    courseCode: chunk.resource.courseCode,
    text: chunk.text,
    score,
  }));
}

module.exports = { tokenize, chunkText, indexResourceText, searchChunks };
