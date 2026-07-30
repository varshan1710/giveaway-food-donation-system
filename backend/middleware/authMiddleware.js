// middleware/authMiddleware.js
// Verifies JWT from the Authorization header and attaches the user to req.user.

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// `protect` — requires a valid JWT
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    if (!user.isActive) {
      res.status(403);
      throw new Error('This account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

// `authorize(...roles)` — restricts route to specific roles. Use after `protect`.
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user ? req.user.role : 'guest'}' is not authorized to access this resource`);
    }
    next();
  };
};

module.exports = { protect, authorize };
