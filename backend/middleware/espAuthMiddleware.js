// middleware/espAuthMiddleware.js
// Authenticates ESP32 device requests using a static device token.
//
// Usage in routes:
//   router.get('/route', espAuth, handler)
//
// The ESP32 sends the token in the request header:
//   x-device-token: <token>
//
// Valid tokens are stored in the ESP32_DEVICE_TOKENS environment variable
// as a comma-separated list:
//   ESP32_DEVICE_TOKENS=token-esp32-001-secure,token-esp32-002-secure
//
// This deliberately does NOT use JWT — the ESP32 cannot manage rotating tokens.
// Rotate tokens by updating the env var and reflashing the firmware placeholder.

/**
 * Middleware that validates the x-device-token header against
 * the ESP32_DEVICE_TOKENS environment variable.
 *
 * Attaches req.deviceId from the x-device-id header for downstream use.
 */
function espAuth(req, res, next) {
  const token = req.headers['x-device-token'];
  const deviceId = req.headers['x-device-id'] || req.body?.deviceId;

  if (!token) {
    return res.status(401).json({ success: false, message: 'ESP32 device token required (x-device-token header)' });
  }

  const validTokens = (process.env.ESP32_DEVICE_TOKENS || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!validTokens.includes(token)) {
    return res.status(403).json({ success: false, message: 'Invalid or unregistered device token' });
  }

  // Make deviceId available to controllers
  req.deviceId = deviceId || null;
  next();
}

module.exports = { espAuth };
