const { Router } = require('express');
const closingController = require('../controllers/closing.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateCreateClosing,
  validateUpdateClosing,
  validateUpdateStatusClosing,
} = require('../middlewares/validateClosing');

const router = Router();

// =========================================================================
// Closing Endpoints (Daily Financial & Inventory Reconciliation)
// =========================================================================

// Protected: Record daily closing (Admin / SPG)
router.post(
  '/',
  authenticate,
  authorizePermission('CLOSING', 'CREATE'),
  validateCreateClosing,
  asyncWrapper((req, res) => closingController.create(req, res))
);

// Protected: Retrieve all closing records with filtering
router.get(
  '/',
  authenticate,
  authorizePermission('CLOSING', 'READ'),
  asyncWrapper((req, res) => closingController.getAll(req, res))
);

// Protected: Retrieve single closing record by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('CLOSING', 'READ'),
  asyncWrapper((req, res) => closingController.getById(req, res))
);

// Protected: Update closing inputs
router.put(
  '/:id',
  authenticate,
  authorizePermission('CLOSING', 'UPDATE'),
  validateUpdateClosing,
  asyncWrapper((req, res) => closingController.update(req, res))
);

// Protected: Update closing status (Admin/Owner verification)
router.patch(
  '/:id/status',
  authenticate,
  authorizePermission('CLOSING', 'UPDATE_STATUS'),
  validateUpdateStatusClosing,
  asyncWrapper((req, res) => closingController.updateStatus(req, res))
);

// Protected: Delete closing record (Admin/Owner only)
router.delete(
  '/:id',
  authenticate,
  authorizePermission('CLOSING', 'DELETE'),
  asyncWrapper((req, res) => closingController.delete(req, res))
);

module.exports = router;
