const { Router } = require('express');
const storageController = require('../controllers/storage.controller');
const asyncWrapper = require('../middlewares/asyncWrapper');

const router = Router();

// =========================================================================
// Storage Proxy Endpoints (File Delivery from Cloudflare R2)
// Publicly accessible for client image previews, documents, and downloads
// =========================================================================

router.get(
  '/*path',
  asyncWrapper((req, res) => storageController.getFile(req, res))
);

module.exports = router;
