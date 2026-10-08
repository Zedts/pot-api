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

const uploadBuktiBayarMiddleware = (req, res, next) => {
  uploadImage.fields([
    { name: 'bukti_bayar', maxCount: 1 },
    { name: 'bukti_qris', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      if (req.files.bukti_bayar && req.files.bukti_bayar[0]) {
        req.file = req.files.bukti_bayar[0];
      } else if (req.files.bukti_qris && req.files.bukti_qris[0]) {
        req.file = req.files.bukti_qris[0];
      }
    }
    next();
  });
};

// Protected: Record new sale (SPG / Admin)
router.post(
  '/',
  authenticate,
  authorizePermission('PENJUALAN', 'CREATE'),
  uploadBuktiBayarMiddleware,
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
  uploadBuktiBayarMiddleware,
  validateUpdatePenjualan,
  asyncWrapper((req, res) => penjualanController.updatePenjualan(req, res))
);

// Protected: Upload / attach payment proof image (bukti bayar)
router.post(
  '/:id/bukti-bayar',
  authenticate,
  authorizePermission('PENJUALAN', 'UPLOAD_BUKTI'),
  uploadBuktiBayarMiddleware,
  asyncWrapper((req, res) => penjualanController.uploadBuktiBayar(req, res))
);

// Backward-compatible alias for previous /bukti-qris
router.post(
  '/:id/bukti-qris',
  authenticate,
  authorizePermission('PENJUALAN', 'UPLOAD_BUKTI'),
  uploadBuktiBayarMiddleware,
  asyncWrapper((req, res) => penjualanController.uploadBuktiBayar(req, res))
);

// Protected: Delete sales transaction with atomic stock rollback (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorizePermission('PENJUALAN', 'DELETE'),
  asyncWrapper((req, res) => penjualanController.deletePenjualan(req, res))
);

module.exports = router;
