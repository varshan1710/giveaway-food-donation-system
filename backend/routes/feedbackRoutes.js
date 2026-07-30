// routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const { createFeedback, getFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createFeedback).get(protect, getFeedback);

module.exports = router;
