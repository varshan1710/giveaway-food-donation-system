// routes/donationRoutes.js
const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
  getNearbyNGOs,
  acceptDonation,
  rejectDonation,
  assignVolunteer,
  updateDeliveryStatus,
  trackDonation,
  trackVolunteerByPhone,
  ngoSelfPickupDecision,
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, donationValidation } = require('../middleware/validateMiddleware');
const upload = require('../middleware/uploadMiddleware');

router
  .route('/')
  .post(protect, authorize('donor'), upload.single('image'), createDonation)
  .get(protect, getDonations);

router.get('/track-by-phone/:phone', protect, trackVolunteerByPhone);

router
  .route('/:id')
  .get(protect, getDonationById)
  .put(protect, authorize('donor'), upload.single('image'), updateDonation)
  .delete(protect, authorize('donor', 'admin'), deleteDonation);

router.get('/:id/track', protect, trackDonation);
router.get('/:id/nearby-ngos', protect, authorize('donor', 'admin'), getNearbyNGOs);
router.put('/:id/accept', protect, authorize('ngo'), acceptDonation);
router.put('/:id/reject', protect, authorize('ngo'), rejectDonation);
router.put('/:id/assign-volunteer', protect, authorize('ngo'), assignVolunteer);
router.put('/:id/status', protect, authorize('volunteer'), updateDeliveryStatus);
router.put('/:id/self-pickup', protect, authorize('ngo'), ngoSelfPickupDecision);

module.exports = router;
