// models/Feedback.js
// Post-donation feedback/rating between parties (donor <-> NGO/volunteer),
// and general platform feedback.

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' }, // optional, null = general feedback
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submittedFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who is being rated, optional
    rating: { type: Number, min: 1, max: 5 },
    message: { type: String, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['donation_experience', 'platform_feedback', 'complaint'],
      default: 'donation_experience',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
