// models/User.js
// Central user account. Role determines dashboard/permissions.
// NGO- and Volunteer-specific profile data live in their own collections
// (NGO.js / Volunteer.js) and reference this document via `user`.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password by default
    },
    role: {
      type: String,
      enum: ['donor', 'ngo', 'volunteer', 'admin'],
      default: 'donor',
    },
    phone: {
      type: String,
      trim: true,
      // Must be in Indian E.164 format: +91 followed by exactly 10 digits
      match: [/^\+91[6-9]\d{9}$/, 'Phone must be in +91XXXXXXXXXX format (Indian mobile number)'],
    },
    address: { type: String, trim: true },
    // GeoJSON location for map-based matching (Leaflet)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    avatar: { type: String, default: '' }, // uploaded image path
    isActive: {
      type: Boolean,
      default: true, // admin can deactivate suspicious/abusive accounts
    },
    isVerified: {
      type: Boolean,
      default: false, // NGOs/Volunteers verified by admin before accepting donations
    },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Geo index for "nearest NGO/volunteer" queries
userSchema.index({ location: '2dsphere' });

// Hash password before saving if it was modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare plaintext password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never leak password hash even if select('+password') was used upstream
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
