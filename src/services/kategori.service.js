const kategoriRepository = require('../repositories/kategori.repository');
const produkRepository = require('../repositories/produk.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

/**
 * Kategori Service
 * Encapsulates core business rules, validation, uniqueness, and referential integrity for Kategori.
 */
class KategoriService {
  /**
   * Create a new kategori
   * @param {Object} data { nama_kategori }
   * @returns {Promise<Kategori>}
   */
  async createKategori({ nama_kategori }) {
    if (!nama_kategori || typeof nama_kategori !== 'string' || nama_kategori.trim().length < 2) {
      throw new BadRequestError('Field "nama_kategori" is required and must be at least 2 characters long.');
    }

    const trimmedName = nama_kategori.trim();

    // Check duplicate category name
    const existing = await kategoriRepository.findByNama(trimmedName);
    if (existing) {
      throw new ConflictError(`Category with name '${trimmedName}' already exists.`);
    }

    return await kategoriRepository.create({
      nama_kategori: trimmedName,
    });
  }

  /**
   * Retrieve all kategori
   * @returns {Promise<Array<Kategori>>}
   */
  async getAllKategori() {
    return await kategoriRepository.findAll();
  }

  /**
   * Retrieve single kategori by ID
   * @param {string} id
   * @returns {Promise<Kategori>}
   */
  async getKategoriById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Category ID is required.');
    }

    const kategori = await kategoriRepository.findById(id);
    if (!kategori) {
      throw new NotFoundError(`Category with ID '${id}' was not found.`);
    }

    return kategori;
  }

  /**
   * Update kategori details
   * @param {string} id
   * @param {Object} updateData { nama_kategori }
   * @returns {Promise<Kategori>}
   */
  async updateKategori(id, updateData) {
    const existing = await this.getKategoriById(id);

    if (updateData.nama_kategori === undefined) {
      return existing;
    }

    if (!updateData.nama_kategori || typeof updateData.nama_kategori !== 'string' || updateData.nama_kategori.trim().length < 2) {
      throw new BadRequestError('Field "nama_kategori" must be at least 2 characters long.');
    }

    const trimmedName = updateData.nama_kategori.trim();

    // Check if new name is already used by another category
    if (trimmedName.toLowerCase() !== existing.nama_kategori.toLowerCase()) {
      const duplicate = await kategoriRepository.findByNama(trimmedName);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Category with name '${trimmedName}' already exists.`);
      }
    }

    const updated = await kategoriRepository.update(id, {
      nama_kategori: trimmedName,
    });

    // Synchronize stored nama_kategori across all referencing products in database
    await produkRepository.updateNamaKategoriByKategoriId(id, trimmedName);

    return updated;
  }

  /**
   * Safely delete kategori by ID
   * Prevents orphaned products by blocking deletion if category is referenced by any product.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteKategori(id) {
    // 1. Verify category exists
    await this.getKategoriById(id);

    // 2. Referential integrity check: ensure no produk is linked to this kategori_id
    const referencingProductsCount = await produkRepository.countByKategoriId(id);
    if (referencingProductsCount > 0) {
      throw new ConflictError(
        `Cannot delete category: it is currently referenced by ${referencingProductsCount} product(s). Please reassign or delete the associated products first.`
      );
    }

    // 3. Delete category
    return await kategoriRepository.delete(id);
  }
}

module.exports = new KategoriService();
