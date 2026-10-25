// Basic word filter for reviews and posts. It blocks obvious abuse and
// personal contact details; it is not meant to catch everything.
const BLOCKED = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'slut', 'whore', 'retard',
  'idiot', 'stupid', 'moron', 'chutiya', 'khanki', 'harami',
];

const PHONE_RE = /(\+?88)?01[3-9]\d{8}/;

function checkText(text) {
  const lower = String(text || '').toLowerCase();
  const words = lower.split(/[^a-zঀ-৿]+/);
  const hit = BLOCKED.find((w) => words.includes(w));
  if (hit) return 'Please keep it respectful: remove insulting or abusive words';
  if (PHONE_RE.test(lower.replace(/[\s-]/g, ''))) return 'Please do not share phone numbers here';
  return null;
}

module.exports = { checkText };
