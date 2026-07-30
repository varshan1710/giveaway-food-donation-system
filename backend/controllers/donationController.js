// controllers/donationController.js
const asyncHandler = require('express-async-handler');
const Donation = require('../models/Donation');
const NGO = require('../models/NGO');
const User = require('../models/User');
const {
  recommendNearestNGOs,
  sortByPriority,
  detectDuplicateOrSuspicious,
} = require('../utils/smartFeatures');
const { notifyNGOsOfNewDonation } = require('../utils/notify');

// @desc    Create a donation (Donor only)
// @route   POST /api/donations
// @access  Private (donor)
// @desc    Create a donation (Donor only)
// @route   POST /api/donations
// @access  Private (donor)
const createDonation = asyncHandler(async (req, res) => {
  const { foodName, category, quantity, description, expiryDate, pickupLocation } = req.body;

  const parsedLocation =
    typeof pickupLocation === 'string' ? JSON.parse(pickupLocation) : pickupLocation;
  const parsedQuantity = typeof quantity === 'string' ? JSON.parse(quantity) : quantity;

  // Duplicate/suspicious detection: compare against this donor's last 24h donations
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentDonorDonations = await Donation.find({ donor: req.user._id, createdAt: { $gte: since } });

  const flags = detectDuplicateOrSuspicious(
    { foodName, quantity: parsedQuantity, pickupLocation: parsedLocation },
    recentDonorDonations
  );

  const donation = await Donation.create({
    donor: req.user._id,
    foodName,
    category,
    quantity: parsedQuantity,
    description,
    expiryDate,
    pickupLocation: parsedLocation,
    image: req.file ? `/uploads/${req.file.filename}` : '',
    flags,
    timeline: [{ status: 'pending', note: 'Donation created', updatedBy: req.user._id }],
  });

  // Alert nearby approved NGOs by email/SMS and return notification confirmation status
  const [notificationStatus, volunteerNotifStatus] = await Promise.all([
    alertNearbyNGOs(donation).catch((err) => {
      console.error('[createDonation] Failed to alert nearby NGOs:', err.message);
      return { notifiedCount: 0, smsSent: false, recipients: [], error: err.message };
    }),
    alertNearbyVolunteers(donation).catch((err) => {
      console.error('[createDonation] Failed to alert nearby volunteers:', err.message);
      return { volunteerCount: 0 };
    }),
  ]);

  res.status(201).json({
    success: true,
    data: donation,
    notificationStatus: {
      ...(notificationStatus || { notifiedCount: 0, smsSent: false, recipients: [] }),
      volunteerCount: volunteerNotifStatus?.volunteerCount || 0,
    },
  });
});

/**
 * Smart expiry-aware NGO alert:
 * - Uses each NGO's permanent officeLocation (from NGO doc) for distance calc.
 * - Dynamically widens alert radius based on food urgency.
 * - Returns notification status so donor receives confirmation popup.
 */
async function alertNearbyNGOs(donation) {
  const { haversineDistanceKm } = require('../utils/smartFeatures');

  // Load all active NGOs with their user info
  const allNGOs = await NGO.find().populate(
    'user',
    'name email phone location isActive'
  );

  const donationCoords = donation.pickupLocation.coordinates; // [lng, lat]
  const hoursToExpiry = Math.max(0, (new Date(donation.expiryDate) - Date.now()) / (1000 * 60 * 60));

  // Determine urgency multiplier
  let radiusMultiplier = 1;
  let urgencyLabel = '';
  if (hoursToExpiry < 2) {
    radiusMultiplier = 2.5;
    urgencyLabel = '🚨 URGENT — expires in < 2 hrs!';
  } else if (hoursToExpiry < 6) {
    radiusMultiplier = 1.5;
    urgencyLabel = '⚠️ High priority — expires in < 6 hrs';
  }

  // Build NGO list using officeLocation for distance (with user.location fallback)
  const allMappedNGOs = allNGOs
    .filter((n) => n.user && n.user.isActive)
    .map((n) => {
      const hasOffice =
        n.officeLocation &&
        n.officeLocation.coordinates &&
        (n.officeLocation.coordinates[0] !== 0 || n.officeLocation.coordinates[1] !== 0);
      const coords = hasOffice ? n.officeLocation.coordinates : (n.user?.location?.coordinates || null);
      if (!coords || (coords[0] === 0 && coords[1] === 0)) return null; // skip NGOs with no coordinates

      const distanceKm = Number(haversineDistanceKm(donationCoords, coords).toFixed(2));
      const effectiveRadius = (n.serviceRadiusKm || 10) * radiusMultiplier;

      return {
        ngo: n,
        distanceKm,
        effectiveRadius,
        withinRadius: distanceKm <= effectiveRadius,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const withinRadiusNGOs = allMappedNGOs.filter((item) => item.withinRadius);
  const ngoList = (withinRadiusNGOs.length > 0 ? withinRadiusNGOs : allMappedNGOs).slice(0, 10);

  if (!ngoList.length) {
    console.log('[alertNearbyNGOs] No active NGOs found for donation', donation._id);
    return { notifiedCount: 0, smsSent: false, recipients: [] };
  }

  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const donationUrl = `${appUrl}/donations/${donation._id}`;
  const expiryHrsText =
    hoursToExpiry < 1
      ? `${Math.round(hoursToExpiry * 60)} minutes`
      : `${hoursToExpiry.toFixed(1)} hours`;

  const recipients = ngoList.map(({ ngo, distanceKm }) => ({
    name: ngo.organizationName,
    email: ngo.user.email,
    phone: ngo.user.phone,
    distanceKm,
  }));

  const notificationResults = await notifyNGOsOfNewDonation(recipients, {
    foodName: donation.foodName,
    quantity: donation.quantity,
    expiryDate: donation.expiryDate,
    pickupLocation: donation.pickupLocation,
    donationId: donation._id.toString(),
    urgencyLabel,
    expiryHrsText,
  });

  const smsSent = notificationResults.some((r) => r.sms && r.sms.sent);
  const notifiedCount = recipients.length;

  console.log(
    `[alertNearbyNGOs] Alerted ${notifiedCount} NGO(s) for donation "${
      donation.foodName
    }" (SMS sent: ${smsSent})`
  );

  return {
    notifiedCount,
    smsSent,
    recipients,
    results: notificationResults,
  };
}

/**
 * Find volunteers currently tracking (trackingEnabled=true) within radiusKm
 * of the donation pickup location. These volunteers will discover the donation
 * on their next poll of GET /api/volunteer/nearby-donations.
 * Returns count of nearby volunteers found.
 */
async function alertNearbyVolunteers(donation) {
  const Volunteer = require('../models/Volunteer');

  const donCoords = donation.pickupLocation?.coordinates; // [lng, lat]
  if (!donCoords) return { volunteerCount: 0 };

  const hoursToExpiry = Math.max(0, (new Date(donation.expiryDate) - Date.now()) / (1000 * 60 * 60));
  // Widen radius if urgent
  const radiusKm = hoursToExpiry < 2 ? 10 : hoursToExpiry < 6 ? 7 : 5;

  // Fetch tracking volunteers with their user location
  const trackingVolunteers = await Volunteer.find({ trackingEnabled: true, isApproved: true }).populate(
    'user',
    'name phone location isActive'
  );

  const nearby = trackingVolunteers.filter((v) => {
    if (!v.user || !v.user.isActive) return false;
    const vCoords = v.user?.location?.coordinates;
    if (!vCoords || (Math.abs(vCoords[0]) < 0.0001 && Math.abs(vCoords[1]) < 0.0001)) return false;
    const { haversineDistanceKm } = require('../utils/smartFeatures');
    return haversineDistanceKm(donCoords, vCoords) <= radiusKm;
  });

  console.log(
    `[alertNearbyVolunteers] ${nearby.length} volunteer(s) within ${radiusKm}km of "${donation.foodName}" — they will see it on next poll`
  );

  return { volunteerCount: nearby.length };
}

// @desc    Get donations (filtered by role, query params for search/filter)
// @route   GET /api/donations
// @access  Private
const getDonations = asyncHandler(async (req, res) => {
  const { status, category, search, near, radiusKm, sortByExpiry } = req.query;
  const filter = {};

  // Role-based visibility
  if (req.user.role === 'donor') {
    filter.donor = req.user._id;
  } else if (req.user.role === 'volunteer') {
    filter.assignedVolunteer = req.user._id;
  }
  // NGOs and Admin see broader lists, refined by query params below

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  if (near) {
    const [lng, lat] = near.split(',').map(Number);
    filter.pickupLocation = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: (Number(radiusKm) || 15) * 1000,
      },
    };
  }

  let query = Donation.find(filter)
    .populate('donor', 'name phone address avatar')
    .populate('acceptedBy', 'name phone')
    .populate('assignedVolunteer', 'name phone');

  let donations = await query.exec();

  if (sortByExpiry === 'true') {
    donations = sortByPriority(donations);
  } else {
    donations = donations.sort((a, b) => b.createdAt - a.createdAt);
  }

  res.json({ success: true, count: donations.length, data: donations });
});

// @desc    Get single donation
// @route   GET /api/donations/:id
// @access  Private
const getDonationById = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id)
    .populate('donor', 'name phone address avatar')
    .populate('acceptedBy', 'name phone')
    .populate('assignedVolunteer', 'name phone');

  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }
  res.json({ success: true, data: donation });
});

// @desc    Update donation (Donor: own pending donations only)
// @route   PUT /api/donations/:id
// @access  Private (donor)
const updateDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }
  if (donation.donor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this donation');
  }
  if (donation.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending donations can be edited');
  }

  const editable = ['foodName', 'category', 'description', 'expiryDate'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) donation[field] = req.body[field];
  });
  if (req.body.quantity) {
    donation.quantity = typeof req.body.quantity === 'string' ? JSON.parse(req.body.quantity) : req.body.quantity;
  }
  if (req.body.pickupLocation) {
    donation.pickupLocation =
      typeof req.body.pickupLocation === 'string' ? JSON.parse(req.body.pickupLocation) : req.body.pickupLocation;
  }
  if (req.file) donation.image = `/uploads/${req.file.filename}`;

  await donation.save();
  res.json({ success: true, data: donation });
});

// @desc    Delete donation (Donor: own pending donations only; Admin: any)
// @route   DELETE /api/donations/:id
// @access  Private (donor, admin)
const deleteDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }
  const isOwner = donation.donor.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this donation');
  }
  if (isOwner && donation.status !== 'pending' && req.user.role !== 'admin') {
    res.status(400);
    throw new Error('Only pending donations can be deleted');
  }

  await donation.deleteOne();
  res.json({ success: true, message: 'Donation deleted' });
});

// @desc    Get nearest NGO recommendations for a donation
// @route   GET /api/donations/:id/nearby-ngos
// @access  Private (donor, admin)
const getNearbyNGOs = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }

  const approvedNGOs = await NGO.find().populate('user', 'name location phone address isActive');
  const ngoList = approvedNGOs
    .filter((n) => n.user && n.user.isActive)
    .map((n) => ({
      ngoProfileId: n._id,
      organizationName: n.organizationName,
      serviceRadiusKm: n.serviceRadiusKm,
      location: n.user.location,
      user: n.user,
    }));

  const recommendations = recommendNearestNGOs(donation.pickupLocation.coordinates, ngoList, 5);
  res.json({ success: true, data: recommendations });
});

// @desc    NGO accepts a donation — ATOMIC first-accept lock
// @route   PUT /api/donations/:id/accept
// @access  Private (ngo)
const acceptDonation = asyncHandler(async (req, res) => {
  // Use findOneAndUpdate with { status: 'pending' } condition so only ONE NGO
  // can ever win the race — if two NGOs click Accept simultaneously, exactly
  // one will match the filter and update; the other gets null back.
  const donation = await Donation.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' }, // atomic guard
    {
      $set: { status: 'accepted', acceptedBy: req.user._id },
      $push: {
        timeline: {
          status: 'accepted',
          note: 'Accepted by NGO — volunteer assignment pending',
          updatedBy: req.user._id,
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!donation) {
    // Either doesn't exist or was already accepted by another NGO
    res.status(400);
    throw new Error(
      'This donation is no longer available — another NGO may have accepted it first.'
    );
  }

  await NGO.findOneAndUpdate({ user: req.user._id }, { $inc: { totalDonationsAccepted: 1 } });

  res.json({ success: true, data: donation });
});

// @desc    NGO rejects a donation
// @route   PUT /api/donations/:id/reject
// @access  Private (ngo)
const rejectDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }
  donation.status = 'rejected';
  donation.timeline.push({ status: 'rejected', note: req.body.reason || 'Rejected by NGO', updatedBy: req.user._id });
  await donation.save();
  res.json({ success: true, data: donation });
});

// @desc    NGO assigns a volunteer to an accepted donation
// @route   PUT /api/donations/:id/assign-volunteer
// @access  Private (ngo)
const assignVolunteer = asyncHandler(async (req, res) => {
  const { volunteerId } = req.body;
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }

  // ── Flow enforcement ────────────────────────────────────────────────────
  // A volunteer can only be assigned AFTER an NGO has accepted the donation.
  // Sequence: Donation posted → Nearby NGOs alerted → NGO accepts → volunteer assigned.
  if (donation.status !== 'accepted') {
    res.status(400);
    throw new Error(
      donation.status === 'pending'
        ? 'Cannot assign a volunteer yet — the donation is still pending NGO acceptance. Nearby NGOs have been alerted automatically.'
        : `Cannot assign a volunteer to a donation with status "${donation.status}".`
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (donation.acceptedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the accepting NGO can assign a volunteer');
  }

  const volunteer = await User.findOne({ _id: volunteerId, role: 'volunteer' });
  if (!volunteer) {
    res.status(404);
    throw new Error('Volunteer not found');
  }

  donation.assignedVolunteer = volunteerId;
  donation.status = 'out_for_pickup';
  donation.timeline.push({ status: 'out_for_pickup', note: 'Volunteer assigned for pickup and delivery', updatedBy: req.user._id });
  await donation.save();

  res.json({ success: true, data: donation });
});

// @desc    Volunteer updates pickup/delivery status
// @route   PUT /api/donations/:id/status
// @access  Private (volunteer)
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['picked_up', 'delivered'];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${allowed.join(', ')}`);
  }

  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }
  if (!donation.assignedVolunteer || donation.assignedVolunteer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not assigned to this donation');
  }

  donation.status = status;
  if (status === 'delivered') {
    donation.deliveredAt = new Date();
    await require('../models/Volunteer').findOneAndUpdate(
      { user: req.user._id },
      { $inc: { totalPickupsCompleted: 1 } }
    );
    await NGO.findOneAndUpdate({ user: donation.acceptedBy }, { $inc: { totalMealsDistributed: donation.estimatedMeals } });
  }
  donation.timeline.push({ status, note, updatedBy: req.user._id });
  await donation.save();

  res.json({ success: true, data: donation });
});

// @desc    Get live tracking data for a donation (volunteer position + pickup location)
// @route   GET /api/donations/:id/track
// @access  Private
const trackDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id)
    .populate('assignedVolunteer', 'name phone location')
    .populate('acceptedBy', 'name');

  if (!donation) {
    res.status(404);
    throw new Error('Donation not found');
  }

  const trackableStatuses = ['out_for_pickup', 'picked_up'];
  if (!trackableStatuses.includes(donation.status) || !donation.assignedVolunteer) {
    return res.json({
      success: true,
      data: {
        trackingAvailable: false,
        reason:
          donation.status === 'accepted'
            ? 'Volunteer not yet assigned.'
            : `Tracking not available for status: ${donation.status}.`,
      },
    });
  }

  const volunteerUser = donation.assignedVolunteer;
  const liveLocation = volunteerUser.location?.coordinates || null;
  const lastUpdated = volunteerUser.updatedAt || null;

  // Mark as stale if no update in the last 2 minutes
  const isStale = lastUpdated && Date.now() - new Date(lastUpdated).getTime() > 2 * 60 * 1000;

  res.json({
    success: true,
    data: {
      trackingAvailable: true,
      volunteer: { name: volunteerUser.name, phone: volunteerUser.phone },
      liveLocation,        // [lng, lat] from volunteer's device
      pickupLocation: donation.pickupLocation,
      status: donation.status,
      lastUpdated,
      isStale,
    },
  });
});

// @desc    Get live tracking data for a volunteer based on their phone number
// @route   GET /api/donations/track-by-phone/:phone
// @access  Private
const trackVolunteerByPhone = asyncHandler(async (req, res) => {
  const rawPhone = (req.params.phone || '').trim();
  if (!rawPhone) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);

  const volunteerUser = await User.findOne({
    role: 'volunteer',
    $or: [
      { phone: rawPhone },
      { phone: `+91${cleanDigits}` },
      { phone: cleanDigits },
    ],
  });

  if (!volunteerUser) {
    res.status(404);
    throw new Error(`No registered volunteer found with phone number "${rawPhone}".`);
  }

  // Find active assigned pickup/delivery donations for this volunteer
  const activePickups = await Donation.find({
    assignedVolunteer: volunteerUser._id,
    status: { $in: ['out_for_pickup', 'picked_up'] },
  }).populate('donor', 'name phone address').populate('acceptedBy', 'name phone');

  const liveLocation = volunteerUser.location?.coordinates || null;
  const lastUpdated = volunteerUser.updatedAt || null;
  const isStale = lastUpdated && Date.now() - new Date(lastUpdated).getTime() > 2 * 60 * 1000;

  res.json({
    success: true,
    data: {
      volunteer: {
        _id: volunteerUser._id,
        name: volunteerUser.name,
        phone: volunteerUser.phone,
        email: volunteerUser.email,
        address: volunteerUser.address,
      },
      liveLocation,
      lastUpdated,
      isStale,
      activePickups,
    },
  });
});

module.exports = {
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
};
