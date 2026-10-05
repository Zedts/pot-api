const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a buffer (e.g. from multer memoryStorage) to Cloudinary raw storage as a PDF
 * @param {Buffer} buffer
 * @param {Object} [options]
 * @param {string} [options.folder]
 * @param {string} [options.public_id]
 * @returns {Promise<Object>} Cloudinary upload result
 */
function uploadPdfBuffer(buffer, { folder = 'pot_nota_penerimaan', public_id } = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder,
        format: 'pdf',
        ...(public_id ? { public_id } : {}),
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Uploads an image buffer (e.g. from multer memoryStorage) to Cloudinary
 * @param {Buffer} buffer
 * @param {Object} [options]
 * @param {string} [options.folder]
 * @param {string} [options.public_id]
 * @param {string} [options.format]
 * @returns {Promise<Object>} Cloudinary upload result
 */
function uploadImageBuffer(buffer, { folder = 'pot_images', public_id, format } = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        ...(format ? { format } : {}),
        ...(public_id ? { public_id } : {}),
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Safely delete an asset from Cloudinary (e.g. for rollback on downstream error)
 * @param {string} publicId
 * @param {string} [resourceType='image'] 'image' or 'raw'
 * @returns {Promise<Object>}
 */
function deleteCloudinaryAsset(publicId, resourceType = 'image') {
  if (!publicId) return Promise.resolve(null);
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.warn('[CLOUDINARY_CLEANUP_WARN]:', error.message);
          return resolve(null);
        }
        resolve(result);
      }
    );
  });
}

module.exports = {
  cloudinary,
  uploadPdfBuffer,
  uploadImageBuffer,
  deleteCloudinaryAsset,
};
