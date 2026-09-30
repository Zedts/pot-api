const { Router } = require('express');
const pengirimanDetailController = require('../controllers/pengirimanDetail.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');

const router = Router();

// =========================================================================
// PengirimanDetail Inspection Endpoints (Protected with 30-Day Bearer Token)
// RBAC controlled via centralized PERMISSIONS.PENGIRIMAN_DETAIL matrix
//   - Read-only endpoints (items are created atomically via POST /api/v1/pengiriman)
// =========================================================================

// Get all shipment detail records with optional filtering (?pengiriman_id=...&produk_id=...)
router.get(
  '/',
  authenticate,
  authorizePermission('PENGIRIMAN_DETAIL', 'READ'),
  asyncWrapper((req, res) => pengirimanDetailController.getAll(req, res))
);

// Get single shipment detail by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('PENGIRIMAN_DETAIL', 'READ'),
  asyncWrapper((req, res) => pengirimanDetailController.getById(req, res))
);

module.exports = router;
