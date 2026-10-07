const penerimaanService = require('../services/penerimaan.service');
const { assertValidImageFile } = require('../utils/fileValidation');

/**
 * Penerimaan Controller
 * Handles HTTP requests and delegates to PenerimaanService.
 */
class PenerimaanController {
  /**
   * POST /api/v1/penerimaan
   * Record new receipt for a shipment at a stall
   */
  async create(req, res) {
    const result = await penerimaanService.createPenerimaan(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: result.status === 'sesuai'
        ? 'Penerimaan recorded successfully.'
        : 'Penerimaan recorded successfully with discrepancy.',
      data: result,
    });
  }

  /**
   * GET /api/v1/penerimaan
   * Retrieve all receipts with optional filters (?pengiriman_id=...&unique_id=...&counters_id=...&spg_id=...&status=...)
   */
  async getAll(req, res) {
    const { pengiriman_id, pengirimanId, unique_id, uniqueId, counter_id, counterId, counters_id, spg_id, spgId, tanggal, status } = req.query;
    const list = await penerimaanService.getAllPenerimaan({
      pengiriman_id: pengiriman_id || pengirimanId,
      unique_id: unique_id || uniqueId,
      counters_id: counters_id || counter_id || counterId,
      spg_id: spg_id || spgId,
      tanggal,
      status,
    });

    return res.status(200).json({
      success: true,
      message: 'Receipts retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/penerimaan/:id
   * Retrieve single receipt with populated shipment, SPG, and lapak
   */
  async getById(req, res) {
    const { id } = req.params;
    const result = await penerimaanService.getPenerimaanById(id);
    return res.status(200).json({
      success: true,
      message: 'Receipt retrieved successfully.',
      data: result,
    });
  }

  /**
   * PUT /api/v1/penerimaan/:id
   * Update receipt metadata (catatan, nota_url)
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await penerimaanService.updatePenerimaan(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Receipt updated successfully.',
      data: updated,
    });
  }

  /**
   * POST /api/v1/penerimaan/:id/nota
   * Upload image foto nota and attach Cloudinary URL
   */
  async uploadNota(req, res) {
    const { id } = req.params;
    assertValidImageFile(req.file, 'nota');
    const updated = await penerimaanService.uploadNota(id, req.file.buffer);
    return res.status(200).json({
      success: true,
      message: 'Foto nota uploaded successfully to Cloudinary.',
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/penerimaan/:id
   * Delete receipt document
   */
  async delete(req, res) {
    const { id } = req.params;
    await penerimaanService.deletePenerimaan(id);
    return res.status(200).json({
      success: true,
      message: `Receipt with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new PenerimaanController();
