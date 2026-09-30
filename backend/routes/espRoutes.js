// routes/espRoutes.js
// All ESP32 sensor integration routes.
// Mounted in server.js as: app.use('/api/esp', require('./routes/espRoutes'))
//
// Route overview:
//
//  Volunteer-initiated (JWT required):
//    POST   /api/esp/tests/start                       — start a new food test
//    POST   /api/esp/tests/:testId/complete             — finalize test & calc score
//    GET    /api/esp/tests/:testId                      — get test details
//    GET    /api/esp/tests/donation/:donationId/latest  — latest test for a donation
//
//  ESP32 hardware (device token required via x-device-token header):
//    GET    /api/esp/tests/active/:deviceId             — poll for active test
//    POST   /api/esp/tests/:testId/readings             — submit sensor reading
//
//  Admin only (JWT + admin role):
//    POST   /api/esp/devices                            — register a device
//    GET    /api/esp/devices                            — list all devices
//    GET    /api/esp/devices/:deviceId/tests            — device test history

const express = require('express');
const router = express.Router();

const {
  createFoodTest,
  getActiveTest,
  addReading,
  completeTest,
  getTest,
  getLatestTestForDonation,
  registerDevice,
  listDevices,
  getDeviceTests,
} = require('../controllers/espController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { espAuth } = require('../middleware/espAuthMiddleware');

// ── Volunteer JWT routes ─────────────────────────────────────────────────────

// Start a food test (volunteer must be assigned to the donation)
router.post('/tests/start', protect, authorize('volunteer', 'admin'), createFoodTest);

// Finalize test and calculate score (volunteer or admin)
router.post('/tests/:testId/complete', protect, authorize('volunteer', 'admin'), completeTest);

// Get test details (any authenticated user)
router.get('/tests/donation/:donationId/latest', protect, getLatestTestForDonation);

// IMPORTANT: this specific route must come BEFORE /tests/:testId to avoid
// "donation" being treated as a testId param.
// Express matches routes in registration order.

router.get('/tests/:testId', protect, getTest);

// ── ESP32 device token routes ────────────────────────────────────────────────

// ESP32 polls this to get its active test (device token auth only)
router.get('/tests/active/:deviceId', espAuth, getActiveTest);

// ESP32 sends sensor readings (device token auth only)
router.post('/tests/:testId/readings', espAuth, addReading);

// ── Admin routes ─────────────────────────────────────────────────────────────

// Register a new ESP32 device
router.post('/devices', protect, authorize('admin'), registerDevice);

// List all registered devices
router.get('/devices', protect, authorize('admin'), listDevices);

// Device test history
router.get('/devices/:deviceId/tests', protect, authorize('admin'), getDeviceTests);

module.exports = router;
