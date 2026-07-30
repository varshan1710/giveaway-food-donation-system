// controllers/adminController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
const Donation = require('../models/Donation');
const { predictDemand } = require('../utils/smartFeatures');

// @desc    Get all users (with optional role filter)
// @route   GET /api/admin/users
// @access  Private (admin)
const getUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
});

// @desc    Activate/deactivate a user
// @route   PUT /api/admin/users/:id/status
// @access  Private (admin)
const setUserActiveStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.isActive = isActive;
  await user.save();
  res.json({ success: true, data: user });
});

// @desc    Approve NGO
// @route   PUT /api/admin/ngo/:id/approve
// @access  Private (admin)
const approveNGO = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) {
    res.status(404);
    throw new Error('NGO profile not found');
  }
  ngo.isApproved = true;
  await ngo.save();
  await User.findByIdAndUpdate(ngo.user, { isVerified: true });
  res.json({ success: true, data: ngo });
});

// @desc    Approve Volunteer
// @route   PUT /api/admin/volunteer/:id/approve
// @access  Private (admin)
const approveVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) {
    res.status(404);
    throw new Error('Volunteer profile not found');
  }
  volunteer.isApproved = true;
  await volunteer.save();
  await User.findByIdAndUpdate(volunteer.user, { isVerified: true });
  res.json({ success: true, data: volunteer });
});

// @desc    List all NGOs / volunteers (including pending approval) for admin management
// @route   GET /api/admin/ngo
// @route   GET /api/admin/volunteer
// @access  Private (admin)
const getAllNGOs = asyncHandler(async (req, res) => {
  const ngos = await NGO.find().populate('user', 'name email phone isActive isVerified');
  res.json({ success: true, count: ngos.length, data: ngos });
});

const getAllVolunteers = asyncHandler(async (req, res) => {
  const volunteers = await Volunteer.find().populate('user', 'name email phone isActive isVerified');
  res.json({ success: true, count: volunteers.length, data: volunteers });
});

// @desc    Get all donations (admin oversight, with filters)
// @route   GET /api/admin/donations
// @access  Private (admin)
const getAllDonations = asyncHandler(async (req, res) => {
  const { status, flagged } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (flagged === 'true') filter.$or = [{ 'flags.isDuplicateSuspected': true }, { 'flags.isSuspicious': true }];

  const donations = await Donation.find(filter)
    .populate('donor', 'name email phone')
    .populate('acceptedBy', 'name')
    .populate('assignedVolunteer', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: donations.length, data: donations });
});

// @desc    Platform-wide analytics for the admin dashboard
// @route   GET /api/admin/analytics
// @access  Private (admin)
const getAnalytics = asyncHandler(async (req, res) => {
  const [totalDonations, totalUsers, deliveredDonations, activeDonations] = await Promise.all([
    Donation.countDocuments(),
    User.countDocuments(),
    Donation.find({ status: 'delivered' }),
    Donation.countDocuments({ status: { $in: ['pending', 'accepted', 'out_for_pickup'] } }),
  ]);

  const totalMealsServed = deliveredDonations.reduce((sum, d) => sum + d.estimatedMeals, 0);
  // Rough food-waste-saved estimate: 1 meal ≈ 0.4kg food saved from landfill
  const foodSavedKg = Number((totalMealsServed * 0.4).toFixed(1));

  const usersByRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

  const statusStats = await Donation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

  const categoryStats = await Donation.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 }, totalMeals: { $sum: '$estimatedMeals' } } },
  ]);

  // Donation trend: daily counts for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trendAgg = await Donation.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const donationTrend = trendAgg.map((t) => ({ date: t._id, count: t.count }));

  // Demand prediction for next 7 days based on the trend above
  const demandForecast = predictDemand(donationTrend, 7);

  res.json({
    success: true,
    data: {
      totalDonations,
      totalUsers,
      activeDonations,
      totalMealsServed,
      foodSavedKg,
      usersByRole,
      statusStats,
      categoryStats,
      donationTrend,
      demandForecast,
    },
  });
});

// @desc    Get all volunteers currently with trackingEnabled = true (for admin live map)
// @route   GET /api/admin/volunteers/live
// @access  Private (admin)
const getLiveVolunteers = asyncHandler(async (req, res) => {
  // Find all volunteer profiles with tracking ON
  const trackingVolunteers = await Volunteer.find({ trackingEnabled: true }).populate(
    'user',
    'name email phone location isActive'
  );

  const liveData = trackingVolunteers
    .filter((v) => v.user && v.user.isActive)
    .map((v) => {
      const coords = v.user?.location?.coordinates || [0, 0];
      const hasValidCoords =
        coords.length === 2 &&
        !(Math.abs(coords[0]) < 0.0001 && Math.abs(coords[1]) < 0.0001);

      return {
        volunteerId: v._id,
        userId: v.user._id,
        name: v.user.name,
        phone: v.user.phone,
        email: v.user.email,
        availabilityStatus: v.availabilityStatus,
        vehicleType: v.vehicleType,
        trackingEnabled: v.trackingEnabled,
        lastLocationUpdate: v.lastLocationUpdate,
        coordinates: hasValidCoords ? coords : null, // [lng, lat]
        totalPickupsCompleted: v.totalPickupsCompleted,
        rating: v.rating,
        isStale: v.lastLocationUpdate
          ? Date.now() - new Date(v.lastLocationUpdate).getTime() > 3 * 60 * 1000
          : true,
      };
    });

  res.json({ success: true, count: liveData.length, data: liveData });
});

module.exports = {
  getUsers,
  setUserActiveStatus,
  approveNGO,
  approveVolunteer,
  getAllNGOs,
  getAllVolunteers,
  getAllDonations,
  getAnalytics,
  getLiveVolunteers,
};
