const kategoriService = require('../services/kategori.service');

/**
 * Kategori Controller
 * Handles HTTP requests and delegates to KategoriService.
 */
class KategoriController {
  /**
   * POST /api/v1/kategori
   * Create a new kategori
   */
  async create(req, res) {
    const newKategori = await kategoriService.createKategori(req.body);
    return res.status(201).json({
      success: true,
      message: 'Kategori created successfully.',
      data: newKategori.toJSON(),
    });
  }

  /**
   * GET /api/v1/kategori
   * Retrieve all kategori
   */
  async getAll(req, res) {
    const list = await kategoriService.getAllKategori();
    return res.status(200).json({
      success: true,
      message: 'Kategori list retrieved successfully.',
      count: list.length,
      data: list.map((k) => k.toJSON()),
    });
  }

  /**
   * GET /api/v1/kategori/:id
   * Retrieve single kategori by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const kategori = await kategoriService.getKategoriById(id);
    return res.status(200).json({
      success: true,
      message: 'Kategori retrieved successfully.',
      data: kategori.toJSON(),
    });
  }

  /**
   * PUT /api/v1/kategori/:id
   * Update existing kategori
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await kategoriService.updateKategori(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Kategori updated successfully.',
      data: updated.toJSON(),
    });
  }

  /**
   * DELETE /api/v1/kategori/:id
   * Delete kategori
   */
  async delete(req, res) {
    const { id } = req.params;
    await kategoriService.deleteKategori(id);
    return res.status(200).json({
      success: true,
      message: `Kategori with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new KategoriController();
