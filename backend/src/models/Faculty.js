const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    initials: { type: String, trim: true, uppercase: true, maxlength: 10, default: '' },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    courses: [{ type: String, trim: true, uppercase: true, maxlength: 20 }],
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratingAverage: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    summary: {
      text: String,
      source: { type: String, enum: ['ai', 'basic'] },
      reviewCount: Number,
      cacheKey: String,
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

facultySchema.index({ name: 1, department: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const reviewSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseCode: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    comment: { type: String, required: true, trim: true, minlength: 10, maxlength: 1500 },
    anonymous: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One review per student per teacher; editing replaces it.
reviewSchema.index({ faculty: 1, author: 1 }, { unique: true });

module.exports = {
  Faculty: mongoose.model('Faculty', facultySchema),
  Review: mongoose.model('Review', reviewSchema),
};
