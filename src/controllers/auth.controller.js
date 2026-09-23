const authService = require('../services/auth.service');

/**
 * Auth Controller
 * Handles HTTP requests for user authentication, Google Sign-In, and user profile.
 */
class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register with Email & Password
   */
  async register(req, res) {
    const result = await authService.register(req.body);
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: result,
    });
  }

  /**
   * POST /api/v1/auth/login
   * Login with Email & Password (or Phone & Password)
   */
  async login(req, res) {
    const result = await authService.login(req.body);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  }

  /**
   * POST /api/v1/auth/google
   * Login or Register with Google ID Token
   */
  async googleLogin(req, res) {
    const result = await authService.loginWithGoogle(req.body);
    return res.status(200).json({
      success: true,
      message: 'Google login successful.',
      data: result,
    });
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user profile
   */
  async getMe(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Current user profile retrieved.',
      data: req.user.toJSON(),
    });
  }
}

module.exports = new AuthController();
