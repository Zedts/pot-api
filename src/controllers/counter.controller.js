const counterService = require('../services/counter.service');

/**
 * Counter Controller
 * Handles HTTP requests for inspection and conflict-protected deletion of sequence counters.
 */
class CounterController {
  /**
   * GET /api/v1/counters
   * Retrieve all sequence counters
   */
  async getAll(req, res) {
    const list = await counterService.getAllCounters();
    return res.status(200).json({
      success: true,
      message: 'Counters retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/counters/:id
   * Retrieve single counter by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const counter = await counterService.getCounterById(id);
    return res.status(200).json({
      success: true,
      message: 'Counter retrieved successfully.',
      data: counter,
    });
  }

  /**
   * DELETE /api/v1/counters/:id
   * Delete counter with referential integrity check (throws ConflictError if shipments exist)
   */
  async delete(req, res) {
    const { id } = req.params;
    await counterService.deleteCounter(id);
    return res.status(200).json({
      success: true,
      message: `Counter '${id}' deleted successfully.`,
    });
  }
}

module.exports = new CounterController();
