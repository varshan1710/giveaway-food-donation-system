// middleware/validateMiddleware.js
// Wraps express-validator's validationResult into a single reusable middleware,
// plus reusable validation chains for each resource.

const { validationResult, body } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['donor', 'ngo', 'volunteer']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const donationValidation = [
  body('foodName').trim().notEmpty().withMessage('Food name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('quantity.value').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('expiryDate').isISO8601().toDate().withMessage('Valid expiry date is required'),
  body('pickupLocation.address').trim().notEmpty().withMessage('Pickup address is required'),
  body('pickupLocation.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates [lng, lat] are required'),
];

module.exports = { validate, registerValidation, loginValidation, donationValidation };
