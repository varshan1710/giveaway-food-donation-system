// models/Volunteer.js
// Extended profile for users with role='volunteer'.

const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleType: { type: String, enum: ['bike', 'car', 'van', 'on_foot', 'other'], default: 'bike' },
    availability: {
      type: String,
      enum: ['weekdays', 'weekends', 'evenings', 'flexible'],
      default: 'flexible',
    },
    isApproved: { type: Boolean, default: true },
    totalPickupsCompleted: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // ── Live Tracking Fields ─────────────────────────────────────────────
    // trackingEnabled: volunteer clicked "Start Tracking" in their dashboard
    trackingEnabled: { type: Boolean, default: false },
    // availabilityStatus: current operational state visible on admin map
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'offline',
    },
    // lastLocationUpdate: timestamp of the most recent GPS ping sent by the volunteer
    lastLocationUpdate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Volunteer', volunteerSchema);
