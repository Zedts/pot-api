const { Router } = require('express');
const slipGajiController = require('../controllers/slipGaji.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateCreateSlipGaji,
  uploadPdf,
} = require('../middlewares/validateSlipGaji');

const router = Router();

// =========================================================================
// Slip Gaji Endpoints (Employee Monthly Salary Slips)
// =========================================================================

// Protected: Create slip gaji record (Admin/Owner)
router.post(
  '/',
  authenticate,
  authorizePermission('SLIP_GAJI', 'CREATE'),
  validateCreateSlipGaji,
  asyncWrapper((req, res) => slipGajiController.create(req, res))
);

// Protected: Retrieve all salary slips with optional filtering (Admin/Owner/SPG/VIAR/PRODUKSI)
router.get(
  '/',
  authenticate,
  authorizePermission('SLIP_GAJI', 'READ'),
  asyncWrapper((req, res) => slipGajiController.getAll(req, res))
);

// Protected: Retrieve single salary slip record by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('SLIP_GAJI', 'READ'),
  asyncWrapper((req, res) => slipGajiController.getById(req, res))
);

// Protected: Upload PDF document to Cloudflare R2 and auto-patch file_url & tanggal
router.post(
  '/:id/file',
  authenticate,
  authorizePermission('SLIP_GAJI', 'UPLOAD_FILE'),
  uploadPdf.single('file'),
  asyncWrapper((req, res) => slipGajiController.uploadFile(req, res))
);

// Protected: Delete slip gaji record
router.delete(
  '/:id',
  authenticate,
  authorizePermission('SLIP_GAJI', 'DELETE'),
  asyncWrapper((req, res) => slipGajiController.delete(req, res))
);

module.exports = router;
