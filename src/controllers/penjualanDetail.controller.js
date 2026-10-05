const penjualanDetailService = require('../services/penjualanDetail.service');

/**
 * PenjualanDetail Controller
 * Handles HTTP requests for sales detail line items.
 */
class PenjualanDetailController {
  /**
   * GET /api/v1/penjualan-detail
   * Retrieve all sales detail items as a flat list with enriched product objects
   */
  async getAll(req, res) {
    const { penjualan_id, produk_id } = req.query;
    const list = await penjualanDetailService.getAllDetails({
      penjualan_id,
      produk_id,
    });

    return res.status(200).json({
      success: true,
      message: 'Sales detail items retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/penjualan-detail/:id
   * Retrieve single sales detail item by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const item = await penjualanDetailService.getDetailById(id);
    return res.status(200).json({
      success: true,
      message: 'Sales detail item retrieved successfully.',
      data: item,
    });
  }
}

module.exports = new PenjualanDetailController();
