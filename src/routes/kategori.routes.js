const { Router } = require('express');
const kategoriController = require('../controllers/kategori.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const { validateCreateKategori, validateUpdateKategori } = require('../middlewares/validateKategori');

const router = Router();

// =========================================================================
// Kategori Management Endpoints (All Protected with 30-Day Bearer Token)
// RBAC granularly controlled via centralized PERMISSIONS.KATEGORI matrix
// =========================================================================

// Create new kategori
router.post(
  '/',
  authenticate,
  authorizePermission('KATEGORI', 'CREATE'),
  validateCreateKategori,
  asyncWrapper((req, res) => kategoriController.create(req, res))
);

// Get all kategori
router.get(
  '/',
  authenticate,
  authorizePermission('KATEGORI', 'READ'),
  asyncWrapper((req, res) => kategoriController.getAll(req, res))
);

// Get kategori by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('KATEGORI', 'READ'),
  asyncWrapper((req, res) => kategoriController.getById(req, res))
);

// Update kategori by ID
router.put(
  '/:id',
  authenticate,
  authorizePermission('KATEGORI', 'UPDATE'),
  validateUpdateKategori,
  asyncWrapper((req, res) => kategoriController.update(req, res))
);

// Delete kategori by ID
router.delete(
  '/:id',
  authenticate,
  authorizePermission('KATEGORI', 'DELETE'),
  asyncWrapper((req, res) => kategoriController.delete(req, res))
);

module.exports = router;
