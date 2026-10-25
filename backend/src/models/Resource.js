const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    kind: { type: String, enum: ['Notes', 'Past paper', 'Slides', 'Book', 'Other'], default: 'Notes' },
    link: {
      type: String,
      trim: true,
      default: '',
      match: [/^$|^https?:\/\/\S+$/i, 'Links must start with http:// or https://'],
    },
    file: {
      storedName: String,
      originalName: String,
      mimeType: String,
      size: Number,
    },
    // Number of text chunks indexed for the AI study assistant.
    indexedChunks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resourceSchema.index({ title: 'text', description: 'text', courseCode: 'text' });

resourceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    if (ret.file) delete ret.file.storedName;
    delete ret.__v;
    return ret;
  },
});

// A searchable slice of a resource's text, used by the study assistant.
const resourceChunkSchema = new mongoose.Schema({
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true, index: true },
  courseCode: { type: String, required: true, index: true },
  position: { type: Number, required: true },
  text: { type: String, required: true },
  terms: { type: [String], index: true },
});

module.exports = {
  Resource: mongoose.model('Resource', resourceSchema),
  ResourceChunk: mongoose.model('ResourceChunk', resourceChunkSchema),
};
