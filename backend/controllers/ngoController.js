// controllers/ngoController.js
const asyncHandler = require('express-async-handler');
const NGO = require('../models/NGO');
const User = require('../models/User');

// @desc    Get all approved volunteers (for NGO to assign pickups)
// @route   GET /api/ngo/volunteers
// @access  Private (ngo)
const getAvailableVolunteers = asyncHandler(async (req, res) => {
  const Volunteer = require('../models/Volunteer');
  const volunteers = await Volunteer.find().populate(
    'user',
    'name phone location isActive'
  );
  const active = volunteers.filter((v) => v.user && v.user.isActive);
  res.json({ success: true, count: active.length, data: active });
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
  // Update permanent office location if a new pin was placed
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
