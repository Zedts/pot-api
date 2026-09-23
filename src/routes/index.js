const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');

const router = Router();

// Health check endpoint (Public)
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running smoothly.',
    timestamp: new Date().toISOString(),
  });
});

// Authentication module routes (Public + /me protected)
router.use('/auth', authRoutes);

// User module routes (Protected with 30-day Bearer token)
router.use('/users', userRoutes);

module.exports = router;
