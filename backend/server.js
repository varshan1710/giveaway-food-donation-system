// server.js
// GiveAway backend entry point — Express app setup, middleware, routes.

const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Connect to MongoDB Atlas
connectDB();

// Start the background donation volunteer timeout checker (runs every 60s)
const { startTimeoutChecker } = require('./utils/timeoutChecker');
startTimeoutChecker();

const app = express();

// --- Security & utility middleware ---
app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving images cross-origin
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Basic rate limiting to slow down brute-force/spam
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ success: true, message: 'GiveAway API is running', version: '1.0.0' });
});
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', timestamp: new Date() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/ngo', require('./routes/ngoRoutes'));
app.use('/api/volunteer', require('./routes/volunteerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`GiveAway server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
