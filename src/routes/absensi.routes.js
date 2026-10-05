const { Router } = require('express');
const absensiController = require('../controllers/absensi.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const uploadImage = require('../middlewares/uploadImage.middleware');
const {
  validateClockIn,
  validateUpdateAbsensi,
} = require('../middlewares/validateAbsensi');

const router = Router();

// =========================================================================
// Absensi Endpoints (Staff Attendance)
// =========================================================================

// Protected: Clock-in / record attendance
router.post(
  '/',
  authenticate,
  authorizePermission('ABSENSI', 'CREATE'),
  uploadImage.single('foto'),
  validateClockIn,
  asyncWrapper((req, res) => absensiController.clockIn(req, res))
);

// Protected: Clock-out / record jam_pulang
router.patch(
  '/:id/pulang',
  authenticate,
  authorizePermission('ABSENSI', 'CLOCK_OUT'),
  asyncWrapper((req, res) => absensiController.clockOut(req, res))
);

// Protected: Get all attendance records (Filtered)
router.get(
  '/',
  authenticate,
  authorizePermission('ABSENSI', 'READ'),
  asyncWrapper((req, res) => absensiController.getAllAbsensi(req, res))
);

// Protected: Get single attendance record by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('ABSENSI', 'READ'),
  asyncWrapper((req, res) => absensiController.getAbsensiById(req, res))
);

// Protected: Update attendance record (Admin / correction)
router.put(
  '/:id',
  authenticate,
  authorizePermission('ABSENSI', 'UPDATE'),
  uploadImage.single('foto'),
  validateUpdateAbsensi,
  asyncWrapper((req, res) => absensiController.updateAbsensi(req, res))
);

// Protected: Delete attendance record (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorizePermission('ABSENSI', 'DELETE'),
  asyncWrapper((req, res) => absensiController.deleteAbsensi(req, res))
);

module.exports = router;
