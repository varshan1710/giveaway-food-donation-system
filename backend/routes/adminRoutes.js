// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
  getUsers,
  setUserActiveStatus,
  approveNGO,
  approveVolunteer,
  getAllNGOs,
  getAllVolunteers,
  getAllDonations,
  getAnalytics,
  getLiveVolunteers,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin')); // all admin routes require admin role

router.get('/users', getUsers);
router.put('/users/:id/status', setUserActiveStatus);
router.get('/ngo', getAllNGOs);
router.put('/ngo/:id/approve', approveNGO);
router.get('/volunteer', getAllVolunteers);
router.put('/volunteer/:id/approve', approveVolunteer);
router.get('/donations', getAllDonations);
router.get('/analytics', getAnalytics);

// Live volunteer tracking map
router.get('/volunteers/live', getLiveVolunteers);

module.exports = router;
