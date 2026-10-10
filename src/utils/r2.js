const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

/**
 * Initialize S3Client for Cloudflare R2
 */
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Helper to construct public URL for an R2 object key
 * Uses proxy storage endpoint by default to guarantee accessibility across all networks/ISPs
 * @param {string} key
 * @returns {string}
 */
function getPublicUrl(key) {
  // If an explicit custom domain R2_PUBLIC_URL is configured (and not the blocked generic r2.dev domain)
  if (process.env.R2_PUBLIC_URL && process.env.R2_PUBLIC_URL.trim() && !process.env.R2_PUBLIC_URL.includes('.r2.dev')) {
    const base = process.env.R2_PUBLIC_URL.trim().replace(/\/$/, '');
    return `${base}/${key}`;
  }

  // Route through the server's public storage streaming endpoint (supports Render automatic URL)
  const baseUrl = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).trim().replace(/\/$/, '');
  return `${baseUrl}/api/v1/storage/${key}`;
}

/**
 * Detect image MIME type and file extension from binary buffer magic bytes
 * @param {Buffer} buffer
 * @param {string} [preferredFormat]
 * @returns {{ mimeType: string, ext: string }}
 */
function detectImageMeta(buffer, preferredFormat) {
  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 4) {
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { mimeType: 'image/jpeg', ext: '.jpg' };
    }
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { mimeType: 'image/png', ext: '.png' };
    }
    // WebP: RIFF ... WEBP
    if (buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { mimeType: 'image/webp', ext: '.webp' };
    }
  }

  // Fallback to preferredFormat if specified
  if (preferredFormat) {
    const cleanFmt = preferredFormat.toLowerCase().replace(/^\./, '');
    if (cleanFmt === 'png') return { mimeType: 'image/png', ext: '.png' };
    if (cleanFmt === 'webp') return { mimeType: 'image/webp', ext: '.webp' };
    if (cleanFmt === 'jpg' || cleanFmt === 'jpeg') return { mimeType: 'image/jpeg', ext: '.jpg' };
  }

  return { mimeType: 'image/jpeg', ext: '.jpg' };
}

/**
 * Uploads a PDF buffer to Cloudflare R2 storage
 * @param {Buffer} buffer
 * @param {Object} [options]
 * @param {string} [options.folder='pot_slip_gaji']
 * @param {string} [options.public_id]
 * @returns {Promise<Object>} Upload result containing key, url, and secure_url
 */
async function uploadPdfBuffer(buffer, { folder = 'pot_slip_gaji', public_id } = {}) {
  let fileName = public_id ? public_id.trim() : `slip_gaji_${crypto.randomUUID()}`;
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    fileName = `${fileName}.pdf`;
  }

  const key = folder ? `${folder}/${fileName}` : fileName;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'pot-storage',
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  });

  await r2Client.send(command);

  const publicUrl = getPublicUrl(key);
  return {
    key,
    public_id: key,
    url: publicUrl,
    secure_url: publicUrl,
  };
}

/**
 * Uploads an image buffer to Cloudflare R2 storage
 * @param {Buffer} buffer
 * @param {Object} [options]
 * @param {string} [options.folder='pot_images']
 * @param {string} [options.public_id]
 * @param {string} [options.format]
 * @returns {Promise<Object>} Upload result containing key, url, and secure_url
 */
async function uploadImageBuffer(buffer, { folder = 'pot_images', public_id, format } = {}) {
  const { mimeType, ext } = detectImageMeta(buffer, format);

  let fileName = public_id ? public_id.trim() : crypto.randomUUID();
  if (!/\.(jpe?g|png|webp)$/i.test(fileName)) {
    fileName = `${fileName}${ext}`;
  }

  const key = folder ? `${folder}/${fileName}` : fileName;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'pot-storage',
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await r2Client.send(command);

  const publicUrl = getPublicUrl(key);
  return {
    key,
    public_id: key,
    url: publicUrl,
    secure_url: publicUrl,
  };
}

/**
 * Safely delete an asset from Cloudflare R2 (e.g. for rollback on downstream error)
 * @param {string} key Object key in R2
 * @param {string} [resourceType] Optional parameter preserved for backwards-compatibility
 * @returns {Promise<Object|null>}
 */
async function deleteR2Asset(key, resourceType) {
  if (!key) return null;
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'pot-storage',
      Key: key,
    });
    return await r2Client.send(command);
  } catch (error) {
    console.warn('[R2_CLEANUP_WARN]:', error.message);
    return null;
  }
}

/**
 * Retrieves an object stream and metadata from Cloudflare R2
 * @param {string} key
 * @returns {Promise<{ stream: import('stream').Readable, contentType: string, contentLength: number, etag: string, lastModified: Date }>}
 */
async function getObjectStream(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'pot-storage',
    Key: key,
  });

  const response = await r2Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength,
    etag: response.ETag,
    lastModified: response.LastModified,
  };
}

/**
 * Normalizes any legacy or external R2 storage URL to the working proxy URL
 * @param {string} url
 * @returns {string}
 */
function normalizeStorageUrl(url) {
  if (!url || typeof url !== 'string') return url;

  // Match https://...r2.cloudflarestorage.com/<bucket>/<key>
  const s3Match = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/);
  if (s3Match) {
    return getPublicUrl(s3Match[1]);
  }

  // Match https://pub-...r2.dev/<key>
  const r2DevMatch = url.match(/pub-[a-zA-Z0-9]+\.r2\.dev\/(.+)$/);
  if (r2DevMatch) {
    return getPublicUrl(r2DevMatch[1]);
  }

  return url;
}

module.exports = {
  r2Client,
  uploadPdfBuffer,
  uploadImageBuffer,
  deleteR2Asset,
  getObjectStream,
  getPublicUrl,
  normalizeStorageUrl,
};
