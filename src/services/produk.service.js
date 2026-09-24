const produkRepository = require('../repositories/produk.repository');
const kategoriRepository = require('../repositories/kategori.repository');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * Produk Service
 * Encapsulates core business rules, validation, foreign reference verification,
 * and category population for Produk.
 */
class ProdukService {
  /**
   * Create a new produk
   * Validates foreign reference and persists both kategori_id and nama_kategori to the database
   * @param {Object} data { nama, harga, kategori_id, satuan }
   * @returns {Promise<Produk>}
   */
  async createProduk({ nama, harga, kategori_id, satuan }) {
    if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
      throw new BadRequestError('Field "nama" is required and must be at least 2 characters long.');
    }

    if (harga === undefined || harga === null || isNaN(Number(harga)) || Number(harga) < 0) {
      throw new BadRequestError('Field "harga" is required and must be a non-negative number.');
    }

    if (!kategori_id || typeof kategori_id !== 'string' || !kategori_id.trim()) {
      throw new BadRequestError('Field "kategori_id" is required.');
    }

    if (!satuan || typeof satuan !== 'string' || !satuan.trim()) {
      throw new BadRequestError('Field "satuan" is required.');
    }

    const trimmedKategoriId = kategori_id.trim();

    // Verify foreign reference: validate kategori_id exists in 'kategori' collection
    const kategori = await kategoriRepository.findById(trimmedKategoriId);
    if (!kategori) {
      throw new NotFoundError(`Category with ID '${trimmedKategoriId}' does not exist.`);
    }

    // Persist both kategori_id and nama_kategori directly to the database
    return await produkRepository.create({
      nama: nama.trim(),
      harga: Number(harga),
      kategori_id: trimmedKategoriId,
      nama_kategori: kategori.nama_kategori,
      satuan: satuan.trim(),
    });
  }

  /**
   * Retrieve all produk with optional filters
   * Reads stored nama_kategori from database directly, with auto-healing fallback if missing
   * @param {Object} filters
   * @returns {Promise<Array<Produk>>}
   */
  async getAllProduk(filters = {}) {
    const list = await produkRepository.findAll(filters);
    if (list.length === 0) {
      return [];
    }

    // Auto-healing fallback: populate nama_kategori if any legacy record is missing it
    const unpopulatedIds = [
      ...new Set(list.filter((p) => !p.nama_kategori && p.kategori_id).map((p) => p.kategori_id)),
    ];

    if (unpopulatedIds.length > 0) {
      const kategoriMap = await kategoriRepository.findByIds(unpopulatedIds);
      list.forEach((p) => {
        if (!p.nama_kategori && p.kategori_id) {
          const cat = kategoriMap.get(p.kategori_id);
          p.nama_kategori = cat ? cat.nama_kategori : null;
        }
      });
    }

    return list;
  }

  /**
   * Retrieve single produk by ID with nama_kategori
   * @param {string} id
   * @returns {Promise<Produk>}
   */
  async getProdukById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Produk ID is required.');
    }

    const produk = await produkRepository.findById(id);
    if (!produk) {
      throw new NotFoundError(`Produk with ID '${id}' was not found.`);
    }

    // If doc already has nama_kategori stored, return directly; otherwise fallback lookup
    if (!produk.nama_kategori && produk.kategori_id) {
      const kategori = await kategoriRepository.findById(produk.kategori_id);
      produk.nama_kategori = kategori ? kategori.nama_kategori : null;
    }

    return produk;
  }

  /**
   * Update produk details
   * Validates foreign reference if updated and persists updated nama_kategori directly to the database
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Produk>}
   */
  async updateProduk(id, updateData) {
    const existing = await this.getProdukById(id);

    const payload = {};

    if (updateData.nama !== undefined) {
      if (!updateData.nama || typeof updateData.nama !== 'string' || updateData.nama.trim().length < 2) {
        throw new BadRequestError('Field "nama" must be at least 2 characters long.');
      }
      payload.nama = updateData.nama.trim();
    }

    if (updateData.harga !== undefined) {
      if (isNaN(Number(updateData.harga)) || Number(updateData.harga) < 0) {
        throw new BadRequestError('Field "harga" must be a non-negative number.');
      }
      payload.harga = Number(updateData.harga);
    }

    if (updateData.kategori_id !== undefined) {
      if (!updateData.kategori_id || typeof updateData.kategori_id !== 'string' || !updateData.kategori_id.trim()) {
        throw new BadRequestError('Field "kategori_id" cannot be empty.');
      }

      const trimmedKategoriId = updateData.kategori_id.trim();

      // Verify foreign reference: validate kategori_id exists in 'kategori' collection
      const kategori = await kategoriRepository.findById(trimmedKategoriId);
      if (!kategori) {
        throw new NotFoundError(`Category with ID '${trimmedKategoriId}' does not exist.`);
      }

      payload.kategori_id = trimmedKategoriId;
      payload.nama_kategori = kategori.nama_kategori;
    }

    if (updateData.satuan !== undefined) {
      if (!updateData.satuan || typeof updateData.satuan !== 'string' || !updateData.satuan.trim()) {
        throw new BadRequestError('Field "satuan" cannot be empty.');
      }
      payload.satuan = updateData.satuan.trim();
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    return await produkRepository.update(id, payload);
  }

  /**
   * Delete produk by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteProduk(id) {
    await this.getProdukById(id);
    return await produkRepository.delete(id);
  }
}

module.exports = new ProdukService();
