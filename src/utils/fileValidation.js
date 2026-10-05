const path = require('path');
const { BadRequestError } = require('../errors/AppError');

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const ALLOWED_PDF_EXTS = ['.pdf'];
const ALLOWED_PDF_MIMES = ['application/pdf'];

/**
 * Validate image buffer using magic bytes (file signature)
 * Supports JPEG, PNG, and WebP
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    return false;
  }

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  if (isJpeg) return true;

  // PNG: 89 50 4E 47 (\x89PNG)
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  if (isPng) return true;

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (buffer.length >= 12) {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    if (isRiff && isWebp) return true;
  }

  return false;
}

/**
 * Validate PDF buffer using magic bytes (file signature)
 * Checks for %PDF- header (0x25 0x50 0x44 0x46 0x2D)
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidPdfBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 5) {
    return false;
  }

  return (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 && // F
    buffer[4] === 0x2D    // -
  );
}

/**
 * Comprehensive validation for uploaded image file
 * Validates existence, extension, mimetype, and binary magic bytes
 * @param {Object} file Multer file object
 * @param {string} [fieldName='file'] Field name for error message
 */
function assertValidImageFile(file, fieldName = 'image') {
  if (!file || !file.buffer) {
    throw new BadRequestError(`Field "${fieldName}" is required and must contain a valid image file.`);
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_IMAGE_EXTS.includes(ext) || !ALLOWED_IMAGE_MIMES.includes(mime)) {
    throw new BadRequestError(
      `Invalid image format for "${fieldName}". Only JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp) are allowed.`
    );
  }

  if (!isValidImageBuffer(file.buffer)) {
    throw new BadRequestError(
      `File content verification failed for "${fieldName}". The uploaded file is corrupted or not a valid JPEG, PNG, or WebP image.`
    );
  }
}

/**
 * Comprehensive validation for uploaded PDF file
 * Validates existence, extension, mimetype, and binary magic bytes
 * @param {Object|Buffer} fileOrBuffer Multer file object or Buffer
 * @param {string} [fieldName='file'] Field name for error message
 */
function assertValidPdfFile(fileOrBuffer, fieldName = 'file') {
  const buffer = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : (fileOrBuffer ? fileOrBuffer.buffer : null);

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new BadRequestError(`Field "${fieldName}" is required and must contain a valid PDF file.`);
  }

  if (!Buffer.isBuffer(fileOrBuffer)) {
    const ext = path.extname(fileOrBuffer.originalname || '').toLowerCase();
    const mime = (fileOrBuffer.mimetype || '').toLowerCase();

    if (!ALLOWED_PDF_EXTS.includes(ext) || !ALLOWED_PDF_MIMES.includes(mime)) {
      throw new BadRequestError(
        `Invalid file format for "${fieldName}". Only PDF documents (.pdf) are allowed.`
      );
    }
  }

  if (!isValidPdfBuffer(buffer)) {
    throw new BadRequestError(
      `File content verification failed for "${fieldName}". The uploaded file is corrupted or not a valid PDF document.`
    );
  }
}

module.exports = {
  ALLOWED_IMAGE_EXTS,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_PDF_EXTS,
  ALLOWED_PDF_MIMES,
  isValidImageBuffer,
  isValidPdfBuffer,
  assertValidImageFile,
  assertValidPdfFile,
};
