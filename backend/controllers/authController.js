// controllers/authController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
const generateToken = require('../utils/generateToken');

// @desc    Register new user (donor, ngo, volunteer). Admins are seeded, not self-registered.
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, address, coordinates, organizationName, vehicleType, officeCoordinates, officeAddress } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const safeRole = ['donor', 'ngo', 'volunteer'].includes(role) ? role : 'donor';

  const user = await User.create({
    name,
    email,
    password,
    role: safeRole,
    phone,
    address,
    location: coordinates ? { type: 'Point', coordinates } : undefined,
    isVerified: true,
  });

  // Create the role-specific profile document
  if (safeRole === 'ngo') {
    await NGO.create({
      user: user._id,
      organizationName: organizationName || name,
      // Save the permanent office location captured from the map picker
      officeLocation: officeCoordinates
        ? { type: 'Point', coordinates: officeCoordinates }
        : coordinates
        ? { type: 'Point', coordinates }
        : { type: 'Point', coordinates: [0, 0] },
      officeAddress: officeAddress || address || '',
      isApproved: true,
    });
  } else if (safeRole === 'volunteer') {
    await Volunteer.create({
      user: user._id,
      vehicleType: vehicleType || 'bike',
      isApproved: true,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    },
  });
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact support.');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    },
  });
});

// @desc    Get logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  let roleProfile = null;
  if (user.role === 'ngo') roleProfile = await NGO.findOne({ user: user._id });
  if (user.role === 'volunteer') roleProfile = await Volunteer.findOne({ user: user._id });

  res.json({ success: true, data: { user, roleProfile } });
});

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, address, coordinates } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (coordinates) user.location = { type: 'Point', coordinates };
  if (req.file) user.avatar = `/uploads/${req.file.filename}`;

  await user.save();
  res.json({ success: true, data: user });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

module.exports = { registerUser, loginUser, getMe, updateMe, changePassword };
