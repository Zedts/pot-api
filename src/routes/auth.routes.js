const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateRegister,
  validateEmailLogin,
  validateGoogleLogin,
} = require('../middlewares/validateAuth');

const router = Router();

// ==========================================
// Public Authentication Endpoints
// ==========================================

// Register with Email & Password (returns 30-day token)
router.post(
  '/register',
  validateRegister,
  asyncWrapper((req, res) => authController.register(req, res))
);

// Login with Email & Password (or Phone & Password, returns 30-day token)
router.post(
  '/login',
  validateEmailLogin,
  asyncWrapper((req, res) => authController.login(req, res))
);

// Login with Google ID Token (returns 30-day token)
router.post(
  '/google',
  validateGoogleLogin,
  asyncWrapper((req, res) => authController.googleLogin(req, res))
);

// ==========================================
// Protected Auth Endpoints
// ==========================================

// Get current user profile (requires Bearer token)
router.get(
  '/me',
  authenticate,
  asyncWrapper((req, res) => authController.getMe(req, res))
);

module.exports = router;
