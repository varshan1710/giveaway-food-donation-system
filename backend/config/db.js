const dns = require('dns');

// Force Node to use Google's DNS instead of localhost
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Auto-sync approval & verification for all registered NGOs & Volunteers
    const NGO = require('../models/NGO');
    const Volunteer = require('../models/Volunteer');
    const User = require('../models/User');

    await Promise.all([
      NGO.updateMany({ isApproved: { $ne: true } }, { isApproved: true }),
      Volunteer.updateMany({ isApproved: { $ne: true } }, { isApproved: true }),
      User.updateMany({ role: { $in: ['ngo', 'volunteer'] }, isVerified: { $ne: true } }, { isVerified: true }),
    ]);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;