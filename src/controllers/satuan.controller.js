const satuanService = require('../services/satuan.service');

/**
 * Satuan Controller
 * Handles HTTP requests and delegates to SatuanService.
 */
class SatuanController {
  /**
   * POST /api/v1/satuan
   * Create a new satuan
   */
  async create(req, res) {
    const newSatuan = await satuanService.createSatuan(req.body);
    return res.status(201).json({
      success: true,
      message: 'Satuan created successfully.',
      data: newSatuan.toJSON(),
    });
  }

  /**
   * GET /api/v1/satuan
   * Retrieve all satuan
   */
  async getAll(req, res) {
    const list = await satuanService.getAllSatuan();
    return res.status(200).json({
      success: true,
      message: 'Satuan list retrieved successfully.',
      count: list.length,
      data: list.map((s) => s.toJSON()),
    });
  }

  /**
   * GET /api/v1/satuan/:id
   * Retrieve single satuan by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const satuan = await satuanService.getSatuanById(id);
    return res.status(200).json({
      success: true,
      message: 'Satuan retrieved successfully.',
      data: satuan.toJSON(),
    });
  }

  /**
   * PUT /api/v1/satuan/:id
   * Update existing satuan
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await satuanService.updateSatuan(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Satuan updated successfully.',
      data: updated.toJSON(),
    });
  }

  /**
   * DELETE /api/v1/satuan/:id
   * Delete satuan
   */
  async delete(req, res) {
    const { id } = req.params;
    await satuanService.deleteSatuan(id);
    return res.status(200).json({
      success: true,
      message: `Satuan with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new SatuanController();
