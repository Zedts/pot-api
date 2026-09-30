const pengirimanService = require('../services/pengiriman.service');

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
    const result = await pengirimanService.createPengiriman(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Shipment created successfully.',
      data: result,
    });
  }

  /**
   * GET /api/v1/pengiriman
   * Retrieve all shipments with optional filters (?status=...&lapak_id=...)
   */
  async getAll(req, res) {
    const { status, lapak_id, lapakId, created_by, createdBy } = req.query;
    const list = await pengirimanService.getAllPengiriman({
      status,
      lapak_id: lapak_id || lapakId,
      created_by: created_by || createdBy,
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
   * Update shipment metadata (lapak_id, tanggal)
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await pengirimanService.updatePengiriman(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Shipment updated successfully.',
      data: updated,
    });
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
