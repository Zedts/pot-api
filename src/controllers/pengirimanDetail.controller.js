const pengirimanDetailService = require('../services/pengirimanDetail.service');

/**
 * PengirimanDetail Controller
 * Handles HTTP requests and delegates to PengirimanDetailService.
 */
class PengirimanDetailController {
  /**
   * GET /api/v1/pengiriman-detail
   * Retrieve all shipment detail records with optional filtering (?pengiriman_id=...&produk_id=...)
   */
  async getAll(req, res) {
    const { pengiriman_id, pengirimanId, produk_id, produkId } = req.query;
    const list = await pengirimanDetailService.getAllDetails({
      pengiriman_id: pengiriman_id || pengirimanId,
      produk_id: produk_id || produkId,
    });

    return res.status(200).json({
      success: true,
      message: 'Shipment details retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/pengiriman-detail/:id
   * Retrieve single shipment detail by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const item = await pengirimanDetailService.getDetailById(id);
    return res.status(200).json({
      success: true,
      message: 'Shipment detail retrieved successfully.',
      data: item,
    });
  }
}

module.exports = new PengirimanDetailController();
