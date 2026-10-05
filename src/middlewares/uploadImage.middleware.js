const multer = require('multer');
const { BadRequestError } = require('../errors/AppError');

const path = require('path');
const { ALLOWED_IMAGE_EXTS, ALLOWED_IMAGE_MIMES } = require('../utils/fileValidation');

/**
 * Reusable Multer memory storage configuration for image uploads
 * Fully compatible with stateless serverless execution on Vercel
 */
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (!ALLOWED_IMAGE_MIMES.includes(mime) || !ALLOWED_IMAGE_EXTS.includes(ext)) {
      return cb(
        new BadRequestError(
          `Invalid file format for "${file.fieldname}". Only image files (JPEG, PNG, WebP) are allowed.`
        ),
        false
      );
    }

    cb(null, true);
  },
});

module.exports = uploadImage;
