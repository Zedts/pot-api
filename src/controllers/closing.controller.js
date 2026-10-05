const closingService = require('../services/closing.service');

/**
 * Closing Controller
 * Handles HTTP requests for daily closing financial & inventory reconciliation.
 */
class ClosingController {
  /**
   * POST /api/v1/closing
   * Record new daily closing
   */
  async create(req, res) {
    const created = await closingService.createClosing(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Daily closing recorded successfully.',
      data: created,
    });
  }

  /**
   * GET /api/v1/closing
   * Retrieve all closing records with filtering
   */
  async getAll(req, res) {
    const { lapak_id, spg_id, tanggal, status } = req.query;
    const list = await closingService.getAllClosing({
      lapak_id,
      spg_id,
      tanggal,
      status,
    });

    return res.status(200).json({
      success: true,
      message: 'Closing records retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/closing/:id
   * Retrieve single closing record by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const item = await closingService.getClosingById(id);
    return res.status(200).json({
      success: true,
      message: 'Closing record retrieved successfully.',
      data: item,
    });
  }

  /**
   * PUT /api/v1/closing/:id
   * Update closing record details
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await closingService.updateClosing(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Closing record updated successfully.',
      data: updated,
    });
  }

  /**
   * PATCH /api/v1/closing/:id/status
   * Update closing status (Verification by Admin/Owner)
   */
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await closingService.updateStatus(id, status, req.user);
    return res.status(200).json({
      success: true,
      message: `Closing status updated to '${status}' successfully.`,
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/closing/:id
   * Delete closing record
   */
  async delete(req, res) {
    const { id } = req.params;
    await closingService.deleteClosing(id);
    return res.status(200).json({
      success: true,
      message: 'Closing record deleted successfully.',
    });
  }
}

module.exports = new ClosingController();
