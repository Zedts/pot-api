const multer = require('multer');
const path = require('path');
const { BadRequestError } = require('../errors/AppError');
const { ALLOWED_PDF_EXTS, ALLOWED_PDF_MIMES } = require('../utils/fileValidation');

/**
 * Reusable Multer memory storage configuration for PDF uploads
 * Fully compatible with stateless serverless execution on Vercel
 */
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (!ALLOWED_PDF_MIMES.includes(mime) || !ALLOWED_PDF_EXTS.includes(ext)) {
      return cb(
        new BadRequestError(
          `Invalid file format for "${file.fieldname}". Only PDF documents (.pdf) are allowed.`
        ),
        false
      );
    }

    cb(null, true);
  },
});

module.exports = uploadPdf;
