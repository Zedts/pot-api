const produkService = require('../services/produk.service');

/**
 * Produk Controller
 * Handles HTTP requests and delegates to ProdukService.
 */
class ProdukController {
  /**
   * POST /api/v1/produk
   * Create a new produk
   */
  async create(req, res) {
    const newProduk = await produkService.createProduk(req.body);
    return res.status(201).json({
      success: true,
      message: 'Produk created successfully.',
      data: newProduk.toJSON(),
    });
  }

  /**
   * GET /api/v1/produk
   * Retrieve all produk with optional filtering (?kategori_id=...&satuan=...)
   */
  async getAll(req, res) {
    const { kategori_id, kategori, satuan } = req.query;
    const list = await produkService.getAllProduk({
      kategori_id: kategori_id || kategori,
      satuan,
    });
    return res.status(200).json({
      success: true,
      message: 'Produk list retrieved successfully.',
      count: list.length,
      data: list.map((p) => p.toJSON()),
    });
  }

  /**
   * GET /api/v1/produk/:id
   * Retrieve single produk by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const produk = await produkService.getProdukById(id);
    return res.status(200).json({
      success: true,
      message: 'Produk retrieved successfully.',
      data: produk.toJSON(),
    });
  }

  /**
   * PUT /api/v1/produk/:id
   * Update existing produk
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await produkService.updateProduk(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Produk updated successfully.',
      data: updated.toJSON(),
    });
  }

  /**
   * DELETE /api/v1/produk/:id
   * Delete produk
   */
  async delete(req, res) {
    const { id } = req.params;
    await produkService.deleteProduk(id);
    return res.status(200).json({
      success: true,
      message: `Produk with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new ProdukController();
