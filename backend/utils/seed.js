// utils/seed.js
// Run with `npm run seed`. Creates an admin account (from .env) and a small
// set of demo users/donations so the dashboard has data to display out of the box.
// Safe to re-run: skips creation if records already exist.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
const Donation = require('../models/Donation');

const run = async () => {
  await connectDB();

  // 1. Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@giveaway.org';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Platform Admin',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    console.log('Admin already exists, skipping.');
  }

  // 2. Demo donor
  let donor = await User.findOne({ email: 'donor@example.com' });
  if (!donor) {
    donor = await User.create({
      name: 'Green Leaf Restaurant',
      email: 'donor@example.com',
      password: 'Password123!',
      role: 'donor',
      phone: '+919876543210',
      address: 'MG Road, Chennai',
      location: { type: 'Point', coordinates: [80.2707, 13.0827] },
    });
    console.log('Demo donor created: donor@example.com / Password123!');
  }

  // 3. Demo NGO
  let ngoUser = await User.findOne({ email: 'ngo@example.com' });
  if (!ngoUser) {
    ngoUser = await User.create({
      name: 'Hope Foundation',
      email: 'ngo@example.com',
      password: 'Password123!',
      role: 'ngo',
      phone: '+919876500000',
      address: 'Anna Nagar, Chennai',
      location: { type: 'Point', coordinates: [80.2101, 13.0850] },
      isVerified: true,
    });
    await NGO.create({
      user: ngoUser._id,
      organizationName: 'Hope Foundation',
      capacityPerDay: 200,
      serviceRadiusKm: 15,
      focusAreas: ['children', 'elderly'],
      isApproved: true,
    });
    console.log('Demo NGO created: ngo@example.com / Password123!');
  }

  // 4. Demo volunteer
  let volUser = await User.findOne({ email: 'volunteer@example.com' });
  if (!volUser) {
    volUser = await User.create({
      name: 'Ravi Kumar',
      email: 'volunteer@example.com',
      password: 'Password123!',
      role: 'volunteer',
      phone: '+919876511111',
      address: 'T Nagar, Chennai',
      location: { type: 'Point', coordinates: [80.2337, 13.0418] },
      isVerified: true,
    });
    await Volunteer.create({
      user: volUser._id,
      vehicleType: 'bike',
      availability: 'flexible',
      isApproved: true,
    });
    console.log('Demo volunteer created: volunteer@example.com / Password123!');
  }

  // 5. A couple of demo donations
  const donationCount = await Donation.countDocuments({ donor: donor._id });
  if (donationCount === 0) {
    await Donation.create([
      {
        donor: donor._id,
        foodName: 'Vegetable Biryani',
        category: 'Cooked Meals',
        quantity: { value: 10, unit: 'kg' },
        description: 'Freshly cooked, surplus from a catering event.',
        expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
        pickupLocation: {
          address: 'MG Road, Chennai',
          type: 'Point',
          coordinates: [80.2707, 13.0827],
        },
        timeline: [{ status: 'pending', note: 'Donation created' }],
      },
      {
        donor: donor._id,
        foodName: 'Assorted Bread & Pastries',
        category: 'Bakery',
        quantity: { value: 25, unit: 'packets' },
        description: 'End-of-day bakery surplus.',
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        pickupLocation: {
          address: 'MG Road, Chennai',
          type: 'Point',
          coordinates: [80.2707, 13.0827],
        },
        timeline: [{ status: 'pending', note: 'Donation created' }],
      },
    ]);
    console.log('Demo donations created.');
  }

  console.log('Seeding complete.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
