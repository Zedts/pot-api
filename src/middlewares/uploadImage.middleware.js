const multer = require('multer');
const { BadRequestError } = require('../errors/AppError');

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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Only image files (JPEG, PNG, WebP) are allowed.'));
    }
  },
});

module.exports = uploadImage;
