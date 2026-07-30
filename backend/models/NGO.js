// models/NGO.js
// Extended profile for users with role='ngo'. Kept separate from User
// to avoid bloating the auth document and to allow admin verification workflow.

const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organizationName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    capacityPerDay: { type: Number, default: 0 }, // meals capacity
    serviceRadiusKm: { type: Number, default: 10 },
    focusAreas: [{ type: String }], // e.g. ["children", "elderly", "disaster relief"]
    verificationDocuments: [{ type: String }], // uploaded doc paths
    isApproved: { type: Boolean, default: true }, // approved by default to receive donation alerts
    totalDonationsAccepted: { type: Number, default: 0 },
    totalMealsDistributed: { type: Number, default: 0 },

    // Permanent registered office location — used for geo-distance SMS alerts.
    // Stored separately from user.location so it represents the physical office
    // address (fixed), not a personal/mobile device location.
    officeLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    officeAddress: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// 2dsphere index on officeLocation for efficient geo-queries
ngoSchema.index({ officeLocation: '2dsphere' });

module.exports = mongoose.model('NGO', ngoSchema);
