const { Router } = require('express');
const counterController = require('../controllers/counter.controller');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermission } = require('../middlewares/rbac.middleware');
const asyncWrapper = require('../middlewares/asyncWrapper');

const router = Router();

// =========================================================================
// Counters Management Endpoints (Protected with 30-Day Bearer Token)
// RBAC controlled via centralized PERMISSIONS.COUNTERS:
//   - Admin, Owner: Read
//   - Admin, Owner: Delete (Protected by referential integrity conflict check)
// =========================================================================

// Retrieve all counters
router.get(
  '/',
  authenticate,
  authorizePermission('COUNTERS', 'READ'),
  asyncWrapper((req, res) => counterController.getAll(req, res))
);

// Retrieve single counter by document ID (e.g. 'pengiriman_20261004')
router.get(
  '/:id',
  authenticate,
  authorizePermission('COUNTERS', 'READ'),
  asyncWrapper((req, res) => counterController.getById(req, res))
);

// Delete counter (enforces referential integrity check; blocks with ConflictError if shipments exist)
router.delete(
  '/:id',
  authenticate,
  authorizePermission('COUNTERS', 'DELETE'),
  asyncWrapper((req, res) => counterController.delete(req, res))
);

module.exports = router;
