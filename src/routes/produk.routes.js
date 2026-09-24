const { Router } = require('express');
const produkController = require('../controllers/produk.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const { validateCreateProduk, validateUpdateProduk } = require('../middlewares/validateProduk');

const router = Router();

// =========================================================================
// Produk Management Endpoints (All Protected with 30-Day Bearer Token)
// RBAC granularly controlled via centralized PERMISSIONS.PRODUK matrix
// =========================================================================

// Create new produk
router.post(
  '/',
  authenticate,
  authorizePermission('PRODUK', 'CREATE'),
  validateCreateProduk,
  asyncWrapper((req, res) => produkController.create(req, res))
);

// Get all produk (supports ?kategori_id=...&satuan=...)
router.get(
  '/',
  authenticate,
  authorizePermission('PRODUK', 'READ'),
  asyncWrapper((req, res) => produkController.getAll(req, res))
);

// Get produk by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('PRODUK', 'READ'),
  asyncWrapper((req, res) => produkController.getById(req, res))
);

// Update produk by ID
router.put(
  '/:id',
  authenticate,
  authorizePermission('PRODUK', 'UPDATE'),
  validateUpdateProduk,
  asyncWrapper((req, res) => produkController.update(req, res))
);

// Delete produk by ID
router.delete(
  '/:id',
  authenticate,
  authorizePermission('PRODUK', 'DELETE'),
  asyncWrapper((req, res) => produkController.delete(req, res))
);

module.exports = router;
