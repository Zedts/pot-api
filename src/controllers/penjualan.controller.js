const penjualanService = require('../services/penjualan.service');
const { uploadImageBuffer, deleteCloudinaryAsset } = require('../utils/cloudinary');
const { assertValidImageFile } = require('../utils/fileValidation');
const { BadRequestError } = require('../errors/AppError');

/**
 * Penjualan Controller
 * Handles HTTP requests for sales transactions and delegates to PenjualanService.
 * Safely guards against orphaned Cloudinary uploads by pre-validating formats & resources
 * and rolling back Cloudinary assets if downstream database operations fail.
 */
class PenjualanController {
  /**
   * POST /api/v1/penjualan
   * Create a new sales transaction
   */
  async createPenjualan(req, res) {
    // 1. Support JSON array if sent as stringified multipart field
    if (typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch {
        throw new BadRequestError('Field "items" must be a valid JSON array.');
      }
    }

    // 2. Pre-validate image file format & magic bytes BEFORE touching Cloudinary
    let uploadRes = null;
    if (req.file) {
      assertValidImageFile(req.file, 'bukti_qris');
      uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_penjualan_qris' });
      req.body.bukti_qris_url = uploadRes.secure_url;
    }

    try {
      const created = await penjualanService.createPenjualan(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Sales transaction recorded successfully.',
        data: created,
      });
    } catch (err) {
      // Rollback Cloudinary asset if sales creation failed
      if (uploadRes && uploadRes.public_id) {
        await deleteCloudinaryAsset(uploadRes.public_id, 'image');
      }
      throw err;
    }
  }

  /**
   * GET /api/v1/penjualan
   * Retrieve all sales transactions with optional filtering
   */
  async getAllPenjualan(req, res) {
    const { lapak_id, spg_id, tanggal, metode_pembayaran } = req.query;
    const list = await penjualanService.getAllPenjualan({
      lapak_id,
      spg_id,
      tanggal,
      metode_pembayaran,
    });

    return res.status(200).json({
      success: true,
      message: 'Sales transactions retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/penjualan/:id
   * Retrieve single sales transaction by ID
   */
  async getPenjualanById(req, res) {
    const { id } = req.params;
    const item = await penjualanService.getPenjualanById(id);
    return res.status(200).json({
      success: true,
      message: 'Sales transaction retrieved successfully.',
      data: item,
    });
  }

  /**
   * PUT /api/v1/penjualan/:id
   * Update sales transaction metadata
   */
  async updatePenjualan(req, res) {
    const { id } = req.params;

    // 1. Verify existence before uploading
    await penjualanService.getPenjualanById(id);

    let uploadRes = null;
    if (req.file) {
      assertValidImageFile(req.file, 'bukti_qris');
      uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_penjualan_qris' });
      req.body.bukti_qris_url = uploadRes.secure_url;
    }

    try {
      const updated = await penjualanService.updatePenjualan(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Sales transaction updated successfully.',
        data: updated,
      });
    } catch (err) {
      if (uploadRes && uploadRes.public_id) {
        await deleteCloudinaryAsset(uploadRes.public_id, 'image');
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/penjualan/:id/bukti-qris
   * Dedicated file upload endpoint for QRIS payment proof image
   */
  async uploadBuktiQris(req, res) {
    const { id } = req.params;

    // 1. Pre-validate sales document existence BEFORE touching Cloudinary
    await penjualanService.getPenjualanById(id);

    // 2. Strict format and magic bytes validation
    if (!req.file || !req.file.buffer) {
      throw new BadRequestError('Valid image file is required.');
    }
    assertValidImageFile(req.file, 'bukti_qris');

    // 3. Upload to Cloudinary
    const uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_penjualan_qris' });

    // 4. Update sales record with automatic rollback on error
    try {
      const updated = await penjualanService.updatePenjualan(id, {
        bukti_qris_url: uploadRes.secure_url,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment proof image uploaded successfully.',
        data: updated,
      });
    } catch (err) {
      if (uploadRes && uploadRes.public_id) {
        await deleteCloudinaryAsset(uploadRes.public_id, 'image');
      }
      throw err;
    }
  }

  /**
   * DELETE /api/v1/penjualan/:id
   * Delete sales transaction and rollback stock balances
   */
  async deletePenjualan(req, res) {
    const { id } = req.params;
    await penjualanService.deletePenjualan(id);
    return res.status(200).json({
      success: true,
      message: 'Sales transaction deleted successfully and inventory rolled back.',
    });
  }
}

module.exports = new PenjualanController();
