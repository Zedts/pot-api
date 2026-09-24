const lapakService = require('../services/lapak.service');

/**
 * Lapak Controller
 * Handles HTTP requests and delegates to LapakService.
 */
class LapakController {
  /**
   * POST /api/v1/lapak
   * Create a new lapak
   */
  async create(req, res) {
    const newLapak = await lapakService.createLapak(req.body);
    return res.status(201).json({
      success: true,
      message: 'Lapak created successfully.',
      data: newLapak.toJSON(),
    });
  }

  /**
   * GET /api/v1/lapak
   * Retrieve all lapak
   */
  async getAll(req, res) {
    const list = await lapakService.getAllLapak();
    return res.status(200).json({
      success: true,
      message: 'Lapak list retrieved successfully.',
      count: list.length,
      data: list.map((l) => l.toJSON()),
    });
  }

  /**
   * GET /api/v1/lapak/:id
   * Retrieve single lapak by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const lapak = await lapakService.getLapakById(id);
    return res.status(200).json({
      success: true,
      message: 'Lapak retrieved successfully.',
      data: lapak.toJSON(),
    });
  }

  /**
   * PUT /api/v1/lapak/:id
   * Update existing lapak
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await lapakService.updateLapak(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Lapak updated successfully.',
      data: updated.toJSON(),
    });
  }

  /**
   * DELETE /api/v1/lapak/:id
   * Delete lapak
   */
  async delete(req, res) {
    const { id } = req.params;
    await lapakService.deleteLapak(id);
    return res.status(200).json({
      success: true,
      message: `Lapak with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new LapakController();
