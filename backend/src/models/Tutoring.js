const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const helpRequestSchema = new mongoose.Schema(
  {
    author: { type: ObjectId, ref: 'User', required: true, index: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    details: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  },
  { timestamps: true }
);

const tutorProfileSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, unique: true },
    courses: {
      type: [{ type: String, trim: true, uppercase: true, maxlength: 20 }],
      validate: [(v) => v.length > 0, 'Add at least one course you can teach'],
      index: true,
    },
    // Taka per hour; 0 means free peer help.
    rate: { type: Number, min: 0, max: 10000, default: 0 },
    mode: { type: String, enum: ['Online', 'In person', 'Both'], default: 'Both' },
    availability: { type: String, trim: true, maxlength: 200, default: '' },
    about: { type: String, trim: true, maxlength: 1000, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: ObjectId, ref: 'User' }],
      validate: [(v) => v.length === 2, 'A conversation has exactly two people'],
      index: true,
    },
    // Sorted participant ids joined with ":", so each pair has one conversation.
    pairKey: { type: String, required: true, unique: true },
    topic: { type: String, trim: true, maxlength: 150, default: '' },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastReadAt: { type: Map, of: Date, default: {} },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

module.exports = {
  HelpRequest: mongoose.model('HelpRequest', helpRequestSchema),
  TutorProfile: mongoose.model('TutorProfile', tutorProfileSchema),
  Conversation: mongoose.model('Conversation', conversationSchema),
  Message: mongoose.model('Message', messageSchema),
};
