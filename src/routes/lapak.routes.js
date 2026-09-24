const { Router } = require('express');
const lapakController = require('../controllers/lapak.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const { validateCreateLapak, validateUpdateLapak } = require('../middlewares/validateLapak');

const router = Router();

// =========================================================================
// Lapak Management Endpoints (All Protected with 30-Day Bearer Token)
// RBAC granularly controlled via centralized PERMISSIONS.LAPAK matrix
// =========================================================================

// Create new lapak
router.post(
  '/',
  authenticate,
  authorizePermission('LAPAK', 'CREATE'),
  validateCreateLapak,
  asyncWrapper((req, res) => lapakController.create(req, res))
);

// Get all lapak
router.get(
  '/',
  authenticate,
  authorizePermission('LAPAK', 'READ'),
  asyncWrapper((req, res) => lapakController.getAll(req, res))
);

// Get lapak by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('LAPAK', 'READ'),
  asyncWrapper((req, res) => lapakController.getById(req, res))
);

// Update lapak by ID
router.put(
  '/:id',
  authenticate,
  authorizePermission('LAPAK', 'UPDATE'),
  validateUpdateLapak,
  asyncWrapper((req, res) => lapakController.update(req, res))
);

// Delete lapak by ID
router.delete(
  '/:id',
  authenticate,
  authorizePermission('LAPAK', 'DELETE'),
  asyncWrapper((req, res) => lapakController.delete(req, res))
);

module.exports = router;
