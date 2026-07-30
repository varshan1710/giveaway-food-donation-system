// controllers/feedbackController.js
const asyncHandler = require('express-async-handler');
const Feedback = require('../models/Feedback');

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Private
const createFeedback = asyncHandler(async (req, res) => {
  const { donation, submittedFor, rating, message, type } = req.body;
  const feedback = await Feedback.create({
    donation,
    submittedBy: req.user._id,
    submittedFor,
    rating,
    message,
    type,
  });
  res.status(201).json({ success: true, data: feedback });
});

// @desc    Get feedback (admin: all, user: own submitted)
// @route   GET /api/feedback
// @access  Private
const getFeedback = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { submittedBy: req.user._id };
  const feedback = await Feedback.find(filter)
    .populate('submittedBy', 'name role')
    .populate('submittedFor', 'name role')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: feedback.length, data: feedback });
});

module.exports = { createFeedback, getFeedback };
