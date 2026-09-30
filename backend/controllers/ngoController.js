// controllers/ngoController.js
const asyncHandler = require('express-async-handler');
const NGO = require('../models/NGO');
const User = require('../models/User');
const Donation = require('../models/Donation');
const { haversineDistanceKm } = require('../utils/smartFeatures');

// @desc    Get approved volunteers registered within 65 km radius (for NGO assignment)
// @route   GET /api/ngo/volunteers
// @access  Private (ngo)
const getAvailableVolunteers = asyncHandler(async (req, res) => {
  const Volunteer = require('../models/Volunteer');

  // Load NGO profile to get NGO's registered office location
  const ngoProfile = await NGO.findOne({ user: req.user._id });
  const ngoCoords = ngoProfile?.officeLocation?.coordinates || req.user.location?.coordinates;

  let centerCoords = ngoCoords;
  if (req.query.donationId) {
    const donation = await Donation.findById(req.query.donationId);
    if (donation?.pickupLocation?.coordinates) {
      centerCoords = donation.pickupLocation.coordinates;
    }
  }

  const volunteers = await Volunteer.find().populate(
    'user',
    'name phone location isActive'
  );

  const activeVolunteers = volunteers.filter((v) => v.user && v.user.isActive);

  // Filter volunteers strictly within 65km based on FIXED registered location (serviceLocation or user.location)
  const eligible = activeVolunteers.filter((v) => {
    let volCoords = null;
    if (
      v.serviceLocation &&
      Array.isArray(v.serviceLocation.coordinates) &&
      (v.serviceLocation.coordinates[0] !== 0 || v.serviceLocation.coordinates[1] !== 0)
    ) {
      volCoords = v.serviceLocation.coordinates;
    } else if (v.user && v.user.location && Array.isArray(v.user.location.coordinates)) {
      volCoords = v.user.location.coordinates;
    }

    if (!volCoords || (volCoords[0] === 0 && volCoords[1] === 0)) return false;

    if (centerCoords && (centerCoords[0] !== 0 || centerCoords[1] !== 0)) {
      const dist = haversineDistanceKm(centerCoords, volCoords);
      v._distanceKm = Number(dist.toFixed(1));
      return dist <= 65; // Strictly <= 65 km
    }
    return true;
  });

  const data = eligible.map((v) => ({
    ...v.toObject(),
    distanceKm: v._distanceKm,
  }));

  res.json({ success: true, count: data.length, data });
});

// @desc    Get/update own NGO profile
// @route   GET /api/ngo/profile
// @access  Private (ngo)
const getMyNgoProfile = asyncHandler(async (req, res) => {
  const profile = await NGO.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('NGO profile not found');
  }
  res.json({ success: true, data: profile });
});

// @route   PUT /api/ngo/profile
// @access  Private (ngo)
const updateMyNgoProfile = asyncHandler(async (req, res) => {
  const { organizationName, registrationNumber, capacityPerDay, serviceRadiusKm, focusAreas, officeCoordinates, officeAddress } = req.body;
  const profile = await NGO.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('NGO profile not found');
  }

  if (organizationName) profile.organizationName = organizationName;
  if (registrationNumber) profile.registrationNumber = registrationNumber;
  if (capacityPerDay !== undefined) profile.capacityPerDay = capacityPerDay;
  if (serviceRadiusKm !== undefined) profile.serviceRadiusKm = serviceRadiusKm;
  if (focusAreas) profile.focusAreas = focusAreas;
  if (officeCoordinates && Array.isArray(officeCoordinates)) {
    profile.officeLocation = { type: 'Point', coordinates: officeCoordinates };
  }
  if (officeAddress) profile.officeAddress = officeAddress;

  await profile.save();
  res.json({ success: true, data: profile });
});

// @desc    List all approved NGOs (public directory for donors)
// @route   GET /api/ngo
// @access  Private
const listNGOs = asyncHandler(async (req, res) => {
  const ngos = await NGO.find().populate('user', 'name phone address location avatar');
  res.json({ success: true, count: ngos.length, data: ngos });
});

module.exports = { getAvailableVolunteers, getMyNgoProfile, updateMyNgoProfile, listNGOs };
