const { Router } = require('express');
const penerimaanController = require('../controllers/penerimaan.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateCreatePenerimaan,
  validateUpdatePenerimaan,
  validateUploadNota,
} = require('../middlewares/validatePenerimaan');

const router = Router();

const uploadImage = require('../middlewares/uploadImage.middleware');

// =========================================================================
// Penerimaan Management Endpoints (Protected with 30-Day Bearer Token)
// RBAC controlled via centralized PERMISSIONS.PENERIMAAN matrix:
//   - Admin, Owner, SPG: Create & Update
//   - Admin, Owner, Produksi, Viar, SPG: Read
//   - Admin, Owner: Delete
// =========================================================================

// Record receipt of a shipment at a stall
router.post(
  '/',
  authenticate,
  authorizePermission('PENERIMAAN', 'CREATE'),
  validateCreatePenerimaan,
  asyncWrapper((req, res) => penerimaanController.create(req, res))
);

// Get all receipts with optional filters (?pengiriman_id=...&spg_id=...&status=...)
router.get(
  '/',
  authenticate,
  authorizePermission('PENERIMAAN', 'READ'),
  asyncWrapper((req, res) => penerimaanController.getAll(req, res))
);

// Get receipt by ID with populated shipment, SPG, and lapak
router.get(
  '/:id',
  authenticate,
  authorizePermission('PENERIMAAN', 'READ'),
  asyncWrapper((req, res) => penerimaanController.getById(req, res))
);

// Update receipt metadata (catatan, nota_url)
router.put(
  '/:id',
  authenticate,
  authorizePermission('PENERIMAAN', 'UPDATE'),
  validateUpdatePenerimaan,
  asyncWrapper((req, res) => penerimaanController.update(req, res))
);

// Upload foto nota and attach Cloudinary image URL
router.post(
  '/:id/nota',
  authenticate,
  authorizePermission('PENERIMAAN', 'UPDATE'),
  uploadImage.single('nota'),
  validateUploadNota,
  asyncWrapper((req, res) => penerimaanController.uploadNota(req, res))
);

// Delete receipt document
router.delete(
  '/:id',
  authenticate,
  authorizePermission('PENERIMAAN', 'DELETE'),
  asyncWrapper((req, res) => penerimaanController.delete(req, res))
);

module.exports = router;
