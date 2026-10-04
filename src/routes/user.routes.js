const { Router } = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateUpdateUser,
  validateUpdateRole,
  validateUpdateUserLapak,
} = require('../middlewares/validateUser');

const router = Router();

// =========================================================================
// User Management Endpoints (All Protected with 30-Day Bearer Token)
// Authentication & Registration have been migrated exclusively to /api/v1/auth
// =========================================================================

// Protected: Get all users (Admin only)
router.get(
  '/',
  authenticate,
  authorizePermission('USER', 'READ'),
  asyncWrapper((req, res) => userController.getAllUsers(req, res))
);

// Protected: Get user by ID (Authenticated user)
router.get(
  '/:id',
  authenticate,
  asyncWrapper((req, res) => userController.getUserById(req, res))
);

// Protected: Update user profile (Authenticated user)
router.put(
  '/:id',
  authenticate,
  validateUpdateUser,
  asyncWrapper((req, res) => userController.updateUser(req, res))
);

// Protected: Update user role (Admin only)
router.patch(
  '/:id/role',
  authenticate,
  authorizePermission('USER', 'UPDATE_ROLE'),
  validateUpdateRole,
  asyncWrapper((req, res) => userController.updateUserRole(req, res))
);

// Protected: Update user lapak assignment (Admin / Owner only)
router.patch(
  '/:id/lapak',
  authenticate,
  authorizePermission('USER', 'UPDATE_LAPAK'),
  validateUpdateUserLapak,
  asyncWrapper((req, res) => userController.updateUserLapak(req, res))
);

// Protected: Delete user (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorizePermission('USER', 'DELETE'),
  asyncWrapper((req, res) => userController.deleteUser(req, res))
);

module.exports = router;
