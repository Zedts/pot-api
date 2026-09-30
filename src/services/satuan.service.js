const satuanRepository = require('../repositories/satuan.repository');
const produkRepository = require('../repositories/produk.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

/**
 * Satuan Service
 * Encapsulates core business rules, validation, uniqueness, and referential integrity for Satuan.
 */
class SatuanService {
  /**
   * Create a new satuan
   * @param {Object} data { jenis_satuan }
   * @returns {Promise<Satuan>}
   */
  async createSatuan({ jenis_satuan }) {
    if (!jenis_satuan || typeof jenis_satuan !== 'string' || jenis_satuan.trim().length < 1) {
      throw new BadRequestError('Field "jenis_satuan" is required and cannot be empty.');
    }

    const trimmedJenis = jenis_satuan.trim();

    // Check duplicate unit name
    const existing = await satuanRepository.findByJenis(trimmedJenis);
    if (existing) {
      throw new ConflictError(`Unit with name '${trimmedJenis}' already exists.`);
    }

    return await satuanRepository.create({
      jenis_satuan: trimmedJenis,
    });
  }

  /**
   * Retrieve all satuan
   * @returns {Promise<Array<Satuan>>}
   */
  async getAllSatuan() {
    return await satuanRepository.findAll();
  }

  /**
   * Retrieve single satuan by ID
   * @param {string} id
   * @returns {Promise<Satuan>}
   */
  async getSatuanById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Satuan ID is required.');
    }

    const satuan = await satuanRepository.findById(id);
    if (!satuan) {
      throw new NotFoundError(`Satuan with ID '${id}' was not found.`);
    }

    return satuan;
  }

  /**
   * Update satuan details
   * @param {string} id
   * @param {Object} updateData { jenis_satuan }
   * @returns {Promise<Satuan>}
   */
  async updateSatuan(id, updateData) {
    const existing = await this.getSatuanById(id);

    if (updateData.jenis_satuan === undefined) {
      return existing;
    }

    if (!updateData.jenis_satuan || typeof updateData.jenis_satuan !== 'string' || updateData.jenis_satuan.trim().length < 1) {
      throw new BadRequestError('Field "jenis_satuan" cannot be empty.');
    }

    const trimmedJenis = updateData.jenis_satuan.trim();

    // Check if new name is already used by another unit
    if (trimmedJenis.toLowerCase() !== existing.jenis_satuan.toLowerCase()) {
      const duplicate = await satuanRepository.findByJenis(trimmedJenis);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Unit with name '${trimmedJenis}' already exists.`);
      }
    }

    const updated = await satuanRepository.update(id, {
      jenis_satuan: trimmedJenis,
    });

    // Synchronize stored jenis_satuan across all referencing products in database
    await produkRepository.updateJenisSatuanBySatuanId(id, trimmedJenis);

    return updated;
  }

  /**
   * Safely delete satuan by ID
   * Prevents orphaned products by blocking deletion if unit is referenced by any product.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteSatuan(id) {
    // 1. Verify unit exists
    await this.getSatuanById(id);

    // 2. Referential integrity check: ensure no produk is linked to this satuan_id
    const referencingCount = await produkRepository.countBySatuanId(id);
    if (referencingCount > 0) {
      throw new ConflictError(
        `Cannot delete unit: it is currently referenced by ${referencingCount} product(s). Please reassign or delete the associated products first.`
      );
    }

    // 3. Delete unit
    return await satuanRepository.delete(id);
  }
}

module.exports = new SatuanService();
