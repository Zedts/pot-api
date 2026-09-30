const { Router } = require('express');
const satuanController = require('../controllers/satuan.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const { validateCreateSatuan, validateUpdateSatuan } = require('../middlewares/validateSatuan');

const router = Router();

// =========================================================================
// Satuan Management Endpoints (All Protected with 30-Day Bearer Token)
// RBAC granularly controlled via centralized PERMISSIONS.SATUAN matrix
// =========================================================================

// Create new satuan
router.post(
  '/',
  authenticate,
  authorizePermission('SATUAN', 'CREATE'),
  validateCreateSatuan,
  asyncWrapper((req, res) => satuanController.create(req, res))
);

// Get all satuan
router.get(
  '/',
  authenticate,
  authorizePermission('SATUAN', 'READ'),
  asyncWrapper((req, res) => satuanController.getAll(req, res))
);

// Get satuan by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('SATUAN', 'READ'),
  asyncWrapper((req, res) => satuanController.getById(req, res))
);

// Update satuan by ID
router.put(
  '/:id',
  authenticate,
  authorizePermission('SATUAN', 'UPDATE'),
  validateUpdateSatuan,
  asyncWrapper((req, res) => satuanController.update(req, res))
);

// Delete satuan by ID
router.delete(
  '/:id',
  authenticate,
  authorizePermission('SATUAN', 'DELETE'),
  asyncWrapper((req, res) => satuanController.delete(req, res))
);

module.exports = router;
