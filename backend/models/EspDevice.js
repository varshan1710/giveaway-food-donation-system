// models/EspDevice.js
// Registry of physical ESP32 devices used for food quality testing.
//
// A Device identifies the HARDWARE only.
// It does NOT belong to any NGO.
// The same device can be used across multiple donations and NGOs.
//
// Authentication: each device has a static token stored in ESP32_DEVICE_TOKENS
// (comma-separated list in env). The token is validated in espAuthMiddleware.js.

const mongoose = require('mongoose');

const espDeviceSchema = new mongoose.Schema(
  {
    // Application-level device identifier (e.g. "ESP32-001").
    // Set in firmware; must be unique per physical device.
    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      unique: true,
      trim: true,
      maxlength: 64,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Last time the device successfully sent sensor data
    lastSeen: { type: Date, default: null },
    // Free-form label so admins can identify physical units in the dashboard
    label: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EspDevice', espDeviceSchema);
