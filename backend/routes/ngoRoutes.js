// routes/ngoRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAvailableVolunteers,
  getMyNgoProfile,
  updateMyNgoProfile,
  listNGOs,
} = require('../controllers/ngoController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, listNGOs);
router.get('/volunteers', protect, authorize('ngo'), getAvailableVolunteers);
router.get('/profile', protect, authorize('ngo'), getMyNgoProfile);
router.put('/profile', protect, authorize('ngo'), updateMyNgoProfile);

module.exports = router;
