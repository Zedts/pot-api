const { Router } = require('express');
const stokLapakController = require('../controllers/stokLapak.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateCreateStokLapak,
  validateUpdateStokLapak,
} = require('../middlewares/validateStokLapak');

const router = Router();

// =========================================================================
// Stok Lapak Management Endpoints (Protected with 30-Day Bearer Token)
// RBAC controlled via centralized PERMISSIONS.STOK_LAPAK matrix:
//   - Admin, Owner: Full CRUD
//   - Produksi, SPG: Read access
//   - SPG: Update access (adjust stock after sales/physical count)
// =========================================================================

// Initialize or create stock tracking record
router.post(
  '/',
  authenticate,
  authorizePermission('STOK_LAPAK', 'CREATE'),
  validateCreateStokLapak,
  asyncWrapper((req, res) => stokLapakController.create(req, res))
);

// Get all stock tracking records with optional filters (?lapak_id=...&produk_id=...)
router.get(
  '/',
  authenticate,
  authorizePermission('STOK_LAPAK', 'READ'),
  asyncWrapper((req, res) => stokLapakController.getAll(req, res))
);

// Get stock record by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('STOK_LAPAK', 'READ'),
  asyncWrapper((req, res) => stokLapakController.getById(req, res))
);

// Update stock counts (stok_awal, stok_masuk, stok_terjual)
router.put(
  '/:id',
  authenticate,
  authorizePermission('STOK_LAPAK', 'UPDATE'),
  validateUpdateStokLapak,
  asyncWrapper((req, res) => stokLapakController.update(req, res))
);

// Delete stock record
router.delete(
  '/:id',
  authenticate,
  authorizePermission('STOK_LAPAK', 'DELETE'),
  asyncWrapper((req, res) => stokLapakController.delete(req, res))
);

module.exports = router;
