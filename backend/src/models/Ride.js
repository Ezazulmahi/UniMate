const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    from: { type: String, required: true, trim: true, maxlength: 100 },
    to: { type: String, required: true, trim: true, maxlength: 100 },
    departAt: { type: Date, required: true, index: true },
    vehicle: { type: String, enum: ['Car', 'CNG', 'Rickshaw', 'Uber/Pathao', 'Other'], default: 'Car' },
    // Seats offered to other students (the host is not counted).
    seats: { type: Number, required: true, min: 1, max: 6 },
    // Whole trip fare in taka, split evenly between the host and passengers.
    totalFare: { type: Number, required: true, min: 0, max: 100000 },
    passengers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: ['open', 'cancelled'], default: 'open' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

rideSchema.virtual('seatsLeft').get(function seatsLeft() {
  return Math.max(this.seats - (this.passengers?.length || 0), 0);
});

rideSchema.virtual('farePerPerson').get(function farePerPerson() {
  const riders = (this.passengers?.length || 0) + 1;
  return Math.ceil(this.totalFare / riders);
});

module.exports = mongoose.model('Ride', rideSchema);
