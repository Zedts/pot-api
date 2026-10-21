const pengirimanService = require('../services/pengiriman.service');
const { uploadImageBuffer, deleteR2Asset } = require('../utils/r2');
const { assertValidImageFile } = require('../utils/fileValidation');

/**
 * Pengiriman Controller
 * Handles HTTP requests and delegates to PengirimanService.
 */
class PengirimanController {
  /**
   * POST /api/v1/pengiriman
   * Create a new shipment and line items atomically
   */
  async create(req, res) {
    let uploadRes = null;
    if (req.file) {
      assertValidImageFile(req.file, req.file.fieldname || 'ttd_pengirim');
      uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_pengiriman_ttd' });
      req.body.ttd_pengirim_url = uploadRes.secure_url;
    }

    try {
      const result = await pengirimanService.createPengiriman(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Shipment created successfully.',
        data: result,
      });
    } catch (err) {
      if (uploadRes && uploadRes.public_id) {
        await deleteR2Asset(uploadRes.public_id, 'image').catch(() => {});
      }
      throw err;
    }
  }

  /**
   * GET /api/v1/pengiriman
   * Retrieve all shipments with optional filters (?status=...&lapak_id=...)
   */
  async getAll(req, res) {
    const { status, lapak_id, lapakId, created_by, createdBy, pengirim_id, pengirimId } = req.query;
    const list = await pengirimanService.getAllPengiriman({
      status,
      lapak_id: lapak_id || lapakId,
      created_by: created_by || createdBy,
      pengirim_id: pengirim_id || pengirimId,
    });

    return res.status(200).json({
      success: true,
      message: 'Shipments retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/pengiriman/:id
   * Retrieve single shipment with populated details, lapak, and creator
   */
  async getById(req, res) {
    const { id } = req.params;
    const shipment = await pengirimanService.getPengirimanById(id);
    return res.status(200).json({
      success: true,
      message: 'Shipment retrieved successfully.',
      data: shipment,
    });
  }

  /**
   * PUT /api/v1/pengiriman/:id
   * Update shipment metadata (lapak_id, tanggal, ttd_pengirim)
   */
  async update(req, res) {
    const { id } = req.params;
    let uploadRes = null;
    if (req.file) {
      assertValidImageFile(req.file, req.file.fieldname || 'ttd_pengirim');
      uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_pengiriman_ttd' });
      req.body.ttd_pengirim_url = uploadRes.secure_url;
    }

    try {
      const updated = await pengirimanService.updatePengiriman(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Shipment updated successfully.',
        data: updated,
      });
    } catch (err) {
      if (uploadRes && uploadRes.public_id) {
        await deleteR2Asset(uploadRes.public_id, 'image').catch(() => {});
      }
      throw err;
    }
  }

  /**
   * PATCH /api/v1/pengiriman/:id/status
   * Update shipment status transition
   */
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await pengirimanService.updateStatus(id, status);
    return res.status(200).json({
      success: true,
      message: 'Shipment status updated successfully.',
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/pengiriman/:id
   * Delete shipment and cascade delete all child line items
   */
  async delete(req, res) {
    const { id } = req.params;
    await pengirimanService.deletePengiriman(id);
    return res.status(200).json({
      success: true,
      message: `Shipment with ID '${id}' and its detail items have been successfully deleted.`,
    });
  }
}

module.exports = new PengirimanController();
