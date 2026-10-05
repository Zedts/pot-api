const { Router } = require('express');
const penjualanController = require('../controllers/penjualan.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const uploadImage = require('../middlewares/uploadImage.middleware');
const {
  validateCreatePenjualan,
  validateUpdatePenjualan,
} = require('../middlewares/validatePenjualan');

const router = Router();

// =========================================================================
// Penjualan Endpoints (Sales Transactions)
// =========================================================================

// Protected: Record new sale (SPG / Admin)
router.post(
  '/',
  authenticate,
  authorizePermission('PENJUALAN', 'CREATE'),
  uploadImage.single('bukti_qris'),
  validateCreatePenjualan,
  asyncWrapper((req, res) => penjualanController.createPenjualan(req, res))
);

// Protected: Get all sales transactions (Filtered)
router.get(
  '/',
  authenticate,
  authorizePermission('PENJUALAN', 'READ'),
  asyncWrapper((req, res) => penjualanController.getAllPenjualan(req, res))
);

// Protected: Get single sales transaction by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('PENJUALAN', 'READ'),
  asyncWrapper((req, res) => penjualanController.getPenjualanById(req, res))
);

// Protected: Update sales transaction metadata (Admin only)
router.put(
  '/:id',
  authenticate,
  authorizePermission('PENJUALAN', 'UPDATE'),
  uploadImage.single('bukti_qris'),
  validateUpdatePenjualan,
  asyncWrapper((req, res) => penjualanController.updatePenjualan(req, res))
);

// Protected: Upload / attach QRIS payment proof image
router.post(
  '/:id/bukti-qris',
  authenticate,
  authorizePermission('PENJUALAN', 'UPLOAD_BUKTI'),
  uploadImage.single('bukti_qris'),
  asyncWrapper((req, res) => penjualanController.uploadBuktiQris(req, res))
);

// Protected: Delete sales transaction with atomic stock rollback (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorizePermission('PENJUALAN', 'DELETE'),
  asyncWrapper((req, res) => penjualanController.deletePenjualan(req, res))
);

module.exports = router;
