// controllers/volunteerController.js
const asyncHandler = require('express-async-handler');
const Volunteer = require('../models/Volunteer');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { haversineDistanceKm } = require('../utils/smartFeatures');

// @desc    Get logged-in volunteer's assigned pickups
// @route   GET /api/volunteer/pickups
// @access  Private (volunteer)
const getMyPickups = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { assignedVolunteer: req.user._id };
  if (status) filter.status = status;

  const pickups = await Donation.find(filter)
    .populate('donor', 'name phone address')
    .populate('acceptedBy', 'name phone address')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: pickups.length, data: pickups });
});

// @desc    Get/update own volunteer profile
// @route   GET /api/volunteer/profile
// @access  Private (volunteer)
const getMyVolunteerProfile = asyncHandler(async (req, res) => {
  const profile = await Volunteer.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Volunteer profile not found');
  }
  res.json({ success: true, data: profile });
});

// @route   PUT /api/volunteer/profile
// @access  Private (volunteer)
const updateMyVolunteerProfile = asyncHandler(async (req, res) => {
  const { vehicleType, availability } = req.body;
  const profile = await Volunteer.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Volunteer profile not found');
  }
  if (vehicleType) profile.vehicleType = vehicleType;
  if (availability) profile.availability = availability;
  await profile.save();
  res.json({ success: true, data: profile });
});

// @desc    Update volunteer's live location (beacon sent during active pickup/delivery)
// @route   PUT /api/volunteer/location
// @access  Private (volunteer)
const updateLiveLocation = asyncHandler(async (req, res) => {
  const { coordinates } = req.body; // [lng, lat]
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    res.status(400);
    throw new Error('Coordinates must be an array of [lng, lat]');
  }

  // Reject [0,0] Null Island coordinates
  if (Math.abs(coordinates[0]) < 0.0001 && Math.abs(coordinates[1]) < 0.0001) {
    return res.status(400).json({ success: false, message: 'Skipped uninitialized [0,0] coordinates' });
  }

  const [lng, lat] = coordinates;

  // Update User.location (for map queries)
  await User.findByIdAndUpdate(req.user._id, {
    location: { type: 'Point', coordinates },
  });

  // Also update Volunteer profile with last update timestamp and flat coords
  await Volunteer.findOneAndUpdate(
    { user: req.user._id },
    {
      lastLocationUpdate: new Date(),
      // If volunteer is tracking and currently available, keep them available
      // If they have an active pickup, mark them busy
    }
  );

  // Auto-set availabilityStatus based on whether volunteer has active pickups
  const activePick = await Donation.countDocuments({
    assignedVolunteer: req.user._id,
    status: { $in: ['out_for_pickup', 'picked_up'] },
  });
  await Volunteer.findOneAndUpdate(
    { user: req.user._id, trackingEnabled: true },
    { availabilityStatus: activePick > 0 ? 'busy' : 'available' }
  );

  res.json({ success: true, message: 'Location updated', lat, lng });
});

// @desc    Volunteer starts live tracking (sets trackingEnabled = true)
// @route   PUT /api/volunteer/tracking/start
// @access  Private (volunteer)
const startTracking = asyncHandler(async (req, res) => {
  const profile = await Volunteer.findOneAndUpdate(
    { user: req.user._id },
    { trackingEnabled: true, availabilityStatus: 'available', lastLocationUpdate: new Date() },
    { new: true }
  );
  if (!profile) {
    res.status(404);
    throw new Error('Volunteer profile not found');
  }
  res.json({ success: true, message: 'Tracking started', data: profile });
});

// @desc    Volunteer stops live tracking (sets trackingEnabled = false)
// @route   PUT /api/volunteer/tracking/stop
// @access  Private (volunteer)
const stopTracking = asyncHandler(async (req, res) => {
  const profile = await Volunteer.findOneAndUpdate(
    { user: req.user._id },
    { trackingEnabled: false, availabilityStatus: 'offline' },
    { new: true }
  );
  if (!profile) {
    res.status(404);
    throw new Error('Volunteer profile not found');
  }
  res.json({ success: true, message: 'Tracking stopped', data: profile });
});

// @desc    Get pending donations near this volunteer's current location (for notification poll)
// @route   GET /api/volunteer/nearby-donations
// @access  Private (volunteer)
const getNearbyOpenDonations = asyncHandler(async (req, res) => {
  const volunteerUser = await User.findById(req.user._id);
  const coords = volunteerUser?.location?.coordinates;

  // If volunteer has no location stored, return empty
  if (
    !coords ||
    (Math.abs(coords[0]) < 0.0001 && Math.abs(coords[1]) < 0.0001)
  ) {
    return res.json({ success: true, count: 0, data: [] });
  }

  const radiusKm = Number(req.query.radius) || 5; // default 5 km

  // Find pending donations (not yet accepted by anyone) within radius
  const allPending = await Donation.find({ status: 'pending' })
    .populate('donor', 'name phone address avatar')
    .sort({ priorityScore: -1, expiryDate: 1 });

  const nearby = allPending
    .filter((d) => {
      const donCoords = d.pickupLocation?.coordinates;
      if (!donCoords) return false;
      const dist = haversineDistanceKm(coords, donCoords);
      d._distanceKm = Number(dist.toFixed(2));
      return dist <= radiusKm;
    })
    .map((d) => ({
      ...d.toObject(),
      distanceKm: d._distanceKm,
    }));

  res.json({ success: true, count: nearby.length, data: nearby });
});

// @desc    Volunteer self-accepts a pending donation (first-accept-wins atomic lock)
// @route   PUT /api/volunteer/donations/:id/accept
// @access  Private (volunteer)
const volunteerAcceptDonation = asyncHandler(async (req, res) => {
  // Atomic: only matches if status is still 'pending'
  const donation = await Donation.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    {
      $set: {
        status: 'out_for_pickup',
        assignedVolunteer: req.user._id,
      },
      $push: {
        timeline: {
          status: 'out_for_pickup',
          note: 'Volunteer self-accepted and is heading to pickup location',
          updatedBy: req.user._id,
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!donation) {
    res.status(400);
    throw new Error('This donation is no longer available — another volunteer may have accepted it first.');
  }

  // Mark volunteer as busy
  await Volunteer.findOneAndUpdate(
    { user: req.user._id },
    { availabilityStatus: 'busy' }
  );

  // Increment completed pickups will happen on delivery
  res.json({ success: true, data: donation });
});

module.exports = {
  getMyPickups,
  getMyVolunteerProfile,
  updateMyVolunteerProfile,
  updateLiveLocation,
  startTracking,
  stopTracking,
  getNearbyOpenDonations,
  volunteerAcceptDonation,
};
