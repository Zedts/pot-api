const { getObjectStream } = require('../utils/r2');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * Storage Controller
 * Delivers files (images, PDFs, documents) from Cloudflare R2 storage to clients.
 * Provides public proxy delivery to ensure 100% reliable accessibility across
 * all networks and mobile ISPs without client-side DNS restrictions.
 */
class StorageController {
  /**
   * GET /api/v1/storage/*path
   * Stream requested file directly from Cloudflare R2 storage
   */
  async getFile(req, res) {
    const rawPath = req.params.path;
    const key = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');

    if (!key || typeof key !== 'string') {
      throw new BadRequestError('File key path is required.');
    }

    // Path traversal safeguard
    if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
      throw new BadRequestError('Invalid file key path.');
    }

    let objectData;
    try {
      objectData = await getObjectStream(key);
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw new NotFoundError(`File '${key}' was not found in storage.`);
      }
      throw err;
    }

    const { stream, contentType, contentLength, etag, lastModified } = objectData;

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (etag) {
      res.setHeader('ETag', etag);
    }
    if (lastModified) {
      res.setHeader('Last-Modified', lastModified instanceof Date ? lastModified.toUTCString() : new Date(lastModified).toUTCString());
    }

    // Aggressive client caching: uploaded files are content-addressed and immutable
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Support HTTP 304 Not Modified
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Stream binary content to HTTP response
    stream.on('error', (streamErr) => {
      console.error('[STORAGE_STREAM_ERROR]:', streamErr);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    stream.pipe(res);
  }
}

module.exports = new StorageController();
