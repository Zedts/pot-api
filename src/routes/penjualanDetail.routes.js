const { Router } = require('express');
const penjualanDetailController = require('../controllers/penjualanDetail.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');

const router = Router();

// =========================================================================
// PenjualanDetail Endpoints (Sales Line Items)
// Read-only endpoints; mutation occurs atomically through Penjualan
// =========================================================================

// Protected: Get all sales detail items (flat list with enriched product objects)
router.get(
  '/',
  authenticate,
  authorizePermission('PENJUALAN_DETAIL', 'READ'),
  asyncWrapper((req, res) => penjualanDetailController.getAll(req, res))
);

// Protected: Get single sales detail item by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('PENJUALAN_DETAIL', 'READ'),
  asyncWrapper((req, res) => penjualanDetailController.getById(req, res))
);

module.exports = router;
