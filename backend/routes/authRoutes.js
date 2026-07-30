// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, registerValidation, loginValidation } = require('../middleware/validateMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', registerValidation, validate, registerUser);
router.post('/login', loginValidation, validate, loginUser);
router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('avatar'), updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
