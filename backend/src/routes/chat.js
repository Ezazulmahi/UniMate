const express = require('express');
const User = require('../models/User');
const { Conversation, Message } = require('../models/Tutoring');
const { HttpError, assertId } = require('../utils');

const router = express.Router();
const PERSON = 'name department';

async function loadConversation(id, userId) {
  assertId(id, 'Conversation');
  const conversation = await Conversation.findOne({ _id: id, participants: userId });
  if (!conversation) throw new HttpError(404, 'Conversation not found');
  return conversation;
}

function present(conversation, userId) {
  const json = conversation.toJSON();
  const lastRead = conversation.lastReadAt?.get(userId);
  json.unread = Boolean(conversation.lastMessage) && (!lastRead || lastRead < conversation.lastMessageAt);
  json.other = (conversation.participants || []).find((p) => String(p._id || p) !== userId) || null;
  delete json.lastReadAt;
  return json;
}

router.get('/', async (req, res) => {
  const conversations = await Conversation.find({ participants: req.userId })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate('participants', PERSON);
  res.json({ conversations: conversations.map((c) => present(c, req.userId)) });
});

// Opens (or reuses) the conversation between the viewer and another student.
router.post('/', async (req, res) => {
  const otherId = String(req.body?.userId || '');
  assertId(otherId, 'Student');
  if (otherId === req.userId) throw new HttpError(400, 'You cannot message yourself');
  if (!(await User.exists({ _id: otherId }))) throw new HttpError(404, 'Student not found');

  const pairKey = [req.userId, otherId].sort().join(':');
  const topic = String(req.body?.topic || '').slice(0, 150);
  const conversation = await Conversation.findOneAndUpdate(
    { pairKey },
    { $setOnInsert: { pairKey, participants: [req.userId, otherId], topic } },
    { new: true, upsert: true }
  ).populate('participants', PERSON);
  res.status(201).json({ conversation: present(conversation, req.userId) });
});

// Returns messages, optionally only those newer than ?after=<ISO date> (for polling).
router.get('/:id/messages', async (req, res) => {
  const conversation = await loadConversation(req.params.id, req.userId);
  const filter = { conversation: conversation._id };
  const after = req.query.after ? new Date(req.query.after) : null;
  if (after && !Number.isNaN(after.getTime())) filter.createdAt = { $gt: after };
  const messages = (await Message.find(filter).sort({ createdAt: -1 }).limit(200)).reverse();
  conversation.lastReadAt.set(req.userId, new Date());
  await conversation.save();
  res.json({ messages });
});

router.post('/:id/messages', async (req, res) => {
  const conversation = await loadConversation(req.params.id, req.userId);
  const text = String(req.body?.text || '').trim();
  if (!text) throw new HttpError(400, 'Message is empty');
  const message = await Message.create({ conversation: conversation._id, sender: req.userId, text });
  conversation.lastMessage = text.slice(0, 120);
  conversation.lastMessageAt = message.createdAt;
  conversation.lastReadAt.set(req.userId, message.createdAt);
  await conversation.save();
  res.status(201).json({ message });
});

module.exports = router;
