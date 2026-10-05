const { Router } = require('express');
const payrollController = require('../controllers/payroll.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');
const {
  validateCreatePayroll,
  validateUpdatePayroll,
  validateUpdateStatusPayroll,
} = require('../middlewares/validatePayroll');

const router = Router();

// =========================================================================
// Payroll Endpoints (Employee Monthly Payroll Management)
// =========================================================================

// Protected: Create monthly payroll record (Admin/Owner)
router.post(
  '/',
  authenticate,
  authorizePermission('PAYROLL', 'CREATE'),
  validateCreatePayroll,
  asyncWrapper((req, res) => payrollController.create(req, res))
);

// Protected: Retrieve all payroll records with filtering
router.get(
  '/',
  authenticate,
  authorizePermission('PAYROLL', 'READ'),
  asyncWrapper((req, res) => payrollController.getAll(req, res))
);

// Protected: Retrieve single payroll record by ID
router.get(
  '/:id',
  authenticate,
  authorizePermission('PAYROLL', 'READ'),
  asyncWrapper((req, res) => payrollController.getById(req, res))
);

// Protected: Update payroll record details
router.put(
  '/:id',
  authenticate,
  authorizePermission('PAYROLL', 'UPDATE'),
  validateUpdatePayroll,
  asyncWrapper((req, res) => payrollController.update(req, res))
);

// Protected: Update payroll status (draft -> published)
router.patch(
  '/:id/status',
  authenticate,
  authorizePermission('PAYROLL', 'UPDATE_STATUS'),
  validateUpdateStatusPayroll,
  asyncWrapper((req, res) => payrollController.updateStatus(req, res))
);

// Protected: Delete payroll record
router.delete(
  '/:id',
  authenticate,
  authorizePermission('PAYROLL', 'DELETE'),
  asyncWrapper((req, res) => payrollController.delete(req, res))
);

module.exports = router;
