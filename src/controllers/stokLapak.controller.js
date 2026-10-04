const stokLapakService = require('../services/stokLapak.service');

/**
 * StokLapak Controller
 * Handles HTTP requests and delegates to StokLapakService.
 */
class StokLapakController {
  /**
   * POST /api/v1/stok-lapak
   * Create stock tracking for a lapak and product
   */
  async create(req, res) {
    const result = await stokLapakService.createStokLapak(req.body);
    return res.status(201).json({
      success: true,
      message: 'Stock record created successfully.',
      data: result,
    });
  }

  /**
   * GET /api/v1/stok-lapak
   * Retrieve all stock records with optional filters (?lapak_id=...&produk_id=...)
   */
  async getAll(req, res) {
    const { lapak_id, lapakId, produk_id, produkId } = req.query;
    const list = await stokLapakService.getAllStokLapak({
      lapak_id: lapak_id || lapakId,
      produk_id: produk_id || produkId,
    });

    return res.status(200).json({
      success: true,
      message: 'Stock records retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/stok-lapak/:id
   * Retrieve single stock record with populated lapak and product
   */
  async getById(req, res) {
    const { id } = req.params;
    const result = await stokLapakService.getStokLapakById(id);
    return res.status(200).json({
      success: true,
      message: 'Stock record retrieved successfully.',
      data: result,
    });
  }

  /**
   * PUT /api/v1/stok-lapak/:id
   * Update stock numbers (stok_awal, stok_masuk, stok_terjual)
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await stokLapakService.updateStokLapak(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Stock record updated successfully.',
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/stok-lapak/:id
   * Delete a stock record
   */
  async delete(req, res) {
    const { id } = req.params;
    await stokLapakService.deleteStokLapak(id);
    return res.status(200).json({
      success: true,
      message: `Stock record with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new StokLapakController();
