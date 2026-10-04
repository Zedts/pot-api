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

module.exports = {
  cloudinary,
  uploadPdfBuffer,
};
