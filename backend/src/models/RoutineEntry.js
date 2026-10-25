const mongoose = require('mongoose');

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const routineEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    kind: { type: String, enum: ['Class', 'Lab', 'Tutorial', 'Other'], default: 'Class' },
    day: { type: String, required: true, enum: DAYS },
    start: { type: String, required: true, match: [TIME_RE, 'Use HH:MM (24-hour)'] },
    end: { type: String, required: true, match: [TIME_RE, 'Use HH:MM (24-hour)'] },
    room: { type: String, trim: true, maxlength: 40, default: '' },
  },
  { timestamps: true }
);

routineEntrySchema.pre('validate', function checkOrder() {
  if (this.start && this.end && this.start >= this.end) {
    this.invalidate('end', 'End time must be after start time');
  }
});

// Two entries clash when they share a day and their time ranges overlap.
const overlaps = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;

module.exports = mongoose.model('RoutineEntry', routineEntrySchema);
module.exports.DAYS = DAYS;
module.exports.overlaps = overlaps;
