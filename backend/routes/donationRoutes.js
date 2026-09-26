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
  predictDonationETA,
  foodSafetyReview,
  volunteerRespondInvitation,
  volunteerCompleteDelivery,
  ngoConfirmDelivery,
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
  .delete(protect, authorize('donor', 'ngo', 'volunteer', 'admin'), deleteDonation);

router.get('/:id/track', protect, trackDonation);
router.post('/:id/predict-eta', protect, predictDonationETA);
router.get('/:id/nearby-ngos', protect, authorize('donor', 'admin'), getNearbyNGOs);
router.put('/:id/accept', protect, authorize('ngo'), acceptDonation);
router.put('/:id/reject', protect, authorize('ngo'), rejectDonation);
router.put('/:id/assign-volunteer', protect, authorize('ngo'), assignVolunteer);
router.put('/:id/status', protect, authorize('volunteer', 'ngo'), updateDeliveryStatus);
router.put('/:id/self-pickup', protect, authorize('ngo'), ngoSelfPickupDecision);
router.put('/:id/food-review', protect, authorize('volunteer'), foodSafetyReview);
router.put('/:id/volunteer-response', protect, authorize('volunteer'), volunteerRespondInvitation);
router.put('/:id/volunteer-complete', protect, authorize('volunteer'), volunteerCompleteDelivery);
router.put('/:id/ngo-confirm-delivery', protect, authorize('ngo'), ngoConfirmDelivery);

module.exports = router;
