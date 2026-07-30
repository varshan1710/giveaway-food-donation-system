// routes/volunteerRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMyPickups,
  getMyVolunteerProfile,
  updateMyVolunteerProfile,
  updateLiveLocation,
  startTracking,
  stopTracking,
  getNearbyOpenDonations,
  volunteerAcceptDonation,
} = require('../controllers/volunteerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/pickups', protect, authorize('volunteer'), getMyPickups);
router.get('/profile', protect, authorize('volunteer'), getMyVolunteerProfile);
router.put('/profile', protect, authorize('volunteer'), updateMyVolunteerProfile);
router.put('/location', protect, authorize('volunteer'), updateLiveLocation);

// Live tracking toggle
router.put('/tracking/start', protect, authorize('volunteer'), startTracking);
router.put('/tracking/stop', protect, authorize('volunteer'), stopTracking);

// Nearby donation poll (for in-app notifications)
router.get('/nearby-donations', protect, authorize('volunteer'), getNearbyOpenDonations);

// Volunteer self-accept (first-accept-wins)
router.put('/donations/:id/accept', protect, authorize('volunteer'), volunteerAcceptDonation);

module.exports = router;
