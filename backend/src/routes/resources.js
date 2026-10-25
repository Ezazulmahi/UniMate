const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { Resource, ResourceChunk } = require('../models/Resource');
const { extractText } = require('../services/extractText');
const { indexResourceText } = require('../services/retrieval');
const { HttpError, pick, assertId, escapeRegex, normalizeCourseCode } = require('../utils');

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.txt', '.md', '.csv', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg',
]);

fs.mkdirSync(config.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new HttpError(400, 'That file type is not supported'));
  },
});

const removeFile = (storedName) =>
  storedName && fs.promises.unlink(path.join(config.uploadDir, storedName)).catch(() => {});

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.course) filter.courseCode = normalizeCourseCode(req.query.course);
  if (req.query.kind) filter.kind = String(req.query.kind);
  const q = String(req.query.q || '').trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: re }, { description: re }, { courseCode: re }];
  }
  const resources = await Resource.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('uploader', 'name department');
  res.json({ resources });
});

router.post('/', upload.single('file'), async (req, res) => {
  const fields = pick(req.body, ['title', 'description', 'kind', 'link']);
  const courseCode = normalizeCourseCode(req.body.courseCode);
  if (!req.file && !fields.link) throw new HttpError(400, 'Attach a file or add a link');

  let resource;
  try {
    resource = await Resource.create({
      ...fields,
      courseCode,
      uploader: req.userId,
      file: req.file && {
        storedName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    if (req.file) await removeFile(req.file.filename);
    throw err;
  }

  // Index readable text (and the description) for the study assistant.
  let text = [resource.title, resource.description].filter(Boolean).join('\n\n');
  if (req.file) {
    try {
      text += `\n\n${await extractText(req.file.path, req.file.originalname)}`;
    } catch (err) {
      console.warn(`Could not read text from ${req.file.originalname}:`, err.message);
    }
  }
  resource.indexedChunks = await indexResourceText(resource, text);
  await resource.save();
  await resource.populate('uploader', 'name department');
  res.status(201).json({ resource });
});

router.get('/:id/file', async (req, res) => {
  assertId(req.params.id, 'Resource');
  const resource = await Resource.findById(req.params.id);
  if (!resource || !resource.file?.storedName) throw new HttpError(404, 'File not found');
  res.download(path.join(config.uploadDir, resource.file.storedName), resource.file.originalName);
});

router.delete('/:id', async (req, res) => {
  assertId(req.params.id, 'Resource');
  const resource = await Resource.findOne({ _id: req.params.id, uploader: req.userId });
  if (!resource) throw new HttpError(404, 'Resource not found, or it is not yours');
  await Promise.all([
    Resource.deleteOne({ _id: resource._id }),
    ResourceChunk.deleteMany({ resource: resource._id }),
    removeFile(resource.file?.storedName),
  ]);
  res.status(204).end();
});

module.exports = router;
