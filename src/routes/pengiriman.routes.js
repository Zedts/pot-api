const { Router } = require('express');
const pengirimanController = require('../controllers/pengiriman.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const uploadImage = require('../middlewares/uploadImage.middleware');
const {
  validateCreatePengiriman,
  validateUpdatePengiriman,
  validateUpdateStatus,
} = require('../middlewares/validatePengiriman');

const router = Router();

// =========================================================================
// Pengiriman Management Endpoints (Protected with 30-Day Bearer Token)
// RBAC controlled via centralized PERMISSIONS.PENGIRIMAN matrix:
//   - Admin, Owner, Produksi, Viar, SPG: Create & Read access
// =========================================================================

const uploadTtdPengirimMiddleware = (req, res, next) => {
  uploadImage.single('ttd_pengirim')(req, res, (err) => {
    if (err) return next(err);
    if (typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch {
        // Will be caught by validateCreatePengiriman
      }
    }
    next();
  });
};

// Create new shipment with items atomically
router.post(
  '/',
  authenticate,
  authorizePermission('PENGIRIMAN', 'CREATE'),
  uploadTtdPengirimMiddleware,
  validateCreatePengiriman,
  asyncWrapper((req, res) => pengirimanController.create(req, res))
);

// Get all shipments with optional query filters (?status=...&lapak_id=...)
router.get(
  '/',
  authenticate,
  authorizePermission('PENGIRIMAN', 'READ'),
  asyncWrapper((req, res) => pengirimanController.getAll(req, res))
);

// Get shipment by ID with populated details, lapak, and creator
router.get(
  '/:id',
  authenticate,
  authorizePermission('PENGIRIMAN', 'READ'),
  asyncWrapper((req, res) => pengirimanController.getById(req, res))
);

// Update shipment metadata (lapak_id, tanggal, ttd_pengirim)
router.put(
  '/:id',
  authenticate,
  authorizePermission('PENGIRIMAN', 'UPDATE'),
  uploadTtdPengirimMiddleware,
  validateUpdatePengiriman,
  asyncWrapper((req, res) => pengirimanController.update(req, res))
);

// Update shipment status lifecycle (draft -> dikirim_viar -> diterima_spg -> selesai)
router.patch(
  '/:id/status',
  authenticate,
  authorizePermission('PENGIRIMAN', 'UPDATE_STATUS'),
  validateUpdateStatus,
  asyncWrapper((req, res) => pengirimanController.updateStatus(req, res))
);

// Delete shipment and cascade-delete child detail items
router.delete(
  '/:id',
  authenticate,
  authorizePermission('PENGIRIMAN', 'DELETE'),
  asyncWrapper((req, res) => pengirimanController.delete(req, res))
);

module.exports = router;
