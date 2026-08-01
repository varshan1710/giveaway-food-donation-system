// models/Donation.js
// Core entity of the platform: a food donation posted by a Donor,
// optionally accepted by an NGO and fulfilled by a Volunteer.

const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    foodName: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      required: true,
      enum: ['Cooked Meals', 'Bakery', 'Fruits & Vegetables', 'Grains & Staples', 'Dairy', 'Packaged Food', 'Beverages', 'Other'],
    },
    quantity: {
      value: { type: Number, required: [true, 'Quantity value is required'], min: 0.1 },
      unit: { type: String, enum: ['kg', 'plates', 'packets', 'liters', 'items'], default: 'kg' },
    },
    // Approximate meals derived from quantity, used for dashboard "meals served" stat
    estimatedMeals: { type: Number, default: 0 },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, default: '' }, // uploaded food image path
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: 'Expiry date must be in the future',
      },
    },
    pickupLocation: {
      address: { type: String, required: [true, 'Pickup address is required'] },
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'out_for_pickup', 'picked_up', 'delivered', 'expired', 'cancelled', 'no_ngo_reachable', 'awaiting_ngo_selfpickup'],
      default: 'pending',
    },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // NGO user
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isSelfPickup: { type: Boolean, default: false },
    notifiedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    volunteerNotifiedAt: { type: Date, default: null },
    // Priority score computed server-side: sooner expiry + larger quantity = higher priority
    priorityScore: { type: Number, default: 0 },
    // Flags set by the duplicate/suspicious-donation detector
    flags: {
      isDuplicateSuspected: { type: Boolean, default: false },
      isSuspicious: { type: Boolean, default: false },
      reason: { type: String, default: '' },
    },
    timeline: [
      {
        status: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

donationSchema.index({ pickupLocation: '2dsphere' });
donationSchema.index({ status: 1, expiryDate: 1 });
donationSchema.index({ foodName: 'text', description: 'text' });

// Auto-calculate estimated meals (rough heuristic: 1kg ~ 3 meals, 1 plate = 1 meal, etc.)
donationSchema.pre('save', function (next) {
  const { value, unit } = this.quantity;
  const mealsPerUnit = { kg: 3, plates: 1, packets: 2, liters: 2, items: 1 };
  this.estimatedMeals = Math.round(value * (mealsPerUnit[unit] || 1));

  // Priority score: higher when expiry is closer (in hours) and quantity is larger
  const hoursToExpiry = Math.max(1, (this.expiryDate - Date.now()) / (1000 * 60 * 60));
  this.priorityScore = Number((this.estimatedMeals / hoursToExpiry).toFixed(4));

  next();
});

module.exports = mongoose.model('Donation', donationSchema);
