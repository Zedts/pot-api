const produkRepository = require('../repositories/produk.repository');
const kategoriRepository = require('../repositories/kategori.repository');
const satuanRepository = require('../repositories/satuan.repository');
const pengirimanDetailRepository = require('../repositories/pengirimanDetail.repository');
const stokLapakRepository = require('../repositories/stokLapak.repository');
const { STATUS, VALID_STATUSES } = require('../constants/status');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

/**
 * Produk Service
 * Encapsulates core business rules, validation, foreign reference verification,
 * and category/unit population for Produk.
 */
class ProdukService {
  /**
   * Create a new produk
   * Validates foreign references (kategori_id, satuan_id) and persists both IDs and readable names to the database
   * @param {Object} data { nama, harga, kategori_id, satuan_id, is_active }
   * @returns {Promise<Produk>}
   */
  async createProduk({ nama, harga, kategori_id, satuan_id, is_active = STATUS.ACTIVE }) {
    if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
      throw new BadRequestError('Field "nama" is required and must be at least 2 characters long.');
    }

    if (harga === undefined || harga === null || isNaN(Number(harga)) || Number(harga) < 0) {
      throw new BadRequestError('Field "harga" is required and must be a non-negative number.');
    }

    if (!kategori_id || typeof kategori_id !== 'string' || !kategori_id.trim()) {
      throw new BadRequestError('Field "kategori_id" is required.');
    }

    if (!satuan_id || typeof satuan_id !== 'string' || !satuan_id.trim()) {
      throw new BadRequestError('Field "satuan_id" is required.');
    }

    const cleanIsActive = is_active ? is_active.toLowerCase().trim() : STATUS.ACTIVE;
    if (!VALID_STATUSES.includes(cleanIsActive)) {
      throw new BadRequestError(
        `Field "is_active" must be one of the allowed values: ${VALID_STATUSES.join(', ')}.`
      );
    }

    const trimmedKategoriId = kategori_id.trim();
    const trimmedSatuanId = satuan_id.trim();

    // Verify foreign reference: validate kategori_id exists in 'kategori' collection
    const kategori = await kategoriRepository.findById(trimmedKategoriId);
    if (!kategori) {
      throw new NotFoundError(`Category with ID '${trimmedKategoriId}' does not exist.`);
    }

    // Verify foreign reference: validate satuan_id exists in 'satuan' collection
    const satuan = await satuanRepository.findById(trimmedSatuanId);
    if (!satuan) {
      throw new NotFoundError(`Unit with ID '${trimmedSatuanId}' does not exist.`);
    }

    // Persist foreign keys and human-readable names directly to the database
    return await produkRepository.create({
      nama: nama.trim(),
      harga: Number(harga),
      kategori_id: trimmedKategoriId,
      nama_kategori: kategori.nama_kategori,
      satuan_id: trimmedSatuanId,
      jenis_satuan: satuan.jenis_satuan,
      is_active: cleanIsActive,
    });
  }

  /**
   * Retrieve all produk with optional filters
   * Reads stored nama_kategori and jenis_satuan directly, with auto-healing fallback if missing
   * @param {Object} filters
   * @returns {Promise<Array<Produk>>}
   */
  async getAllProduk(filters = {}) {
    const list = await produkRepository.findAll(filters);
    if (list.length === 0) {
      return [];
    }

    // Auto-healing fallback: populate nama_kategori if any legacy record is missing it
    const unpopulatedCatIds = [
      ...new Set(list.filter((p) => !p.nama_kategori && p.kategori_id).map((p) => p.kategori_id)),
    ];
    if (unpopulatedCatIds.length > 0) {
      const kategoriMap = await kategoriRepository.findByIds(unpopulatedCatIds);
      list.forEach((p) => {
        if (!p.nama_kategori && p.kategori_id) {
          const cat = kategoriMap.get(p.kategori_id);
          p.nama_kategori = cat ? cat.nama_kategori : null;
        }
      });
    }

    // Auto-healing fallback: populate jenis_satuan if any legacy record is missing it
    const unpopulatedSatuanIds = [
      ...new Set(list.filter((p) => !p.jenis_satuan && p.satuan_id).map((p) => p.satuan_id)),
    ];
    if (unpopulatedSatuanIds.length > 0) {
      const satuanMap = await satuanRepository.findByIds(unpopulatedSatuanIds);
      list.forEach((p) => {
        if (!p.jenis_satuan && p.satuan_id) {
          const sat = satuanMap.get(p.satuan_id);
          p.jenis_satuan = sat ? sat.jenis_satuan : null;
        }
      });
    }

    return list;
  }

  /**
   * Retrieve single produk by ID with nama_kategori and jenis_satuan
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

    // Fallback lookup if nama_kategori is unpopulated
    if (!produk.nama_kategori && produk.kategori_id) {
      const kategori = await kategoriRepository.findById(produk.kategori_id);
      produk.nama_kategori = kategori ? kategori.nama_kategori : null;
    }

    // Fallback lookup if jenis_satuan is unpopulated
    if (!produk.jenis_satuan && produk.satuan_id) {
      const satuan = await satuanRepository.findById(produk.satuan_id);
      produk.jenis_satuan = satuan ? satuan.jenis_satuan : null;
    }

    return produk;
  }

  /**
   * Update produk details
   * Validates foreign references if updated and persists updated readable names directly
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
      const kategori = await kategoriRepository.findById(trimmedKategoriId);
      if (!kategori) {
        throw new NotFoundError(`Category with ID '${trimmedKategoriId}' does not exist.`);
      }

      payload.kategori_id = trimmedKategoriId;
      payload.nama_kategori = kategori.nama_kategori;
    }

    if (updateData.satuan_id !== undefined) {
      if (!updateData.satuan_id || typeof updateData.satuan_id !== 'string' || !updateData.satuan_id.trim()) {
        throw new BadRequestError('Field "satuan_id" cannot be empty.');
      }

      const trimmedSatuanId = updateData.satuan_id.trim();
      const satuan = await satuanRepository.findById(trimmedSatuanId);
      if (!satuan) {
        throw new NotFoundError(`Unit with ID '${trimmedSatuanId}' does not exist.`);
      }

      payload.satuan_id = trimmedSatuanId;
      payload.jenis_satuan = satuan.jenis_satuan;
    }

    if (updateData.is_active !== undefined) {
      const cleanIsActive = updateData.is_active.toLowerCase().trim();
      if (!VALID_STATUSES.includes(cleanIsActive)) {
        throw new BadRequestError(
          `Field "is_active" must be one of the allowed values: ${VALID_STATUSES.join(', ')}.`
        );
      }
      payload.is_active = cleanIsActive;
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    return await produkRepository.update(id, payload);
  }

  /**
   * Update produk status specifically (Admin dedicated operation)
   * Prevents other product fields from being modified through this endpoint.
   * @param {string} id
   * @param {string} status
   * @returns {Promise<Produk>}
   */
  async updateProdukStatus(id, status) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Produk ID is required.');
    }

    if (!status || typeof status !== 'string') {
      throw new BadRequestError('Status is required.');
    }

    const lowerStatus = status.toLowerCase().trim();
    if (!VALID_STATUSES.includes(lowerStatus)) {
      throw new BadRequestError(
        `Invalid status '${status}'. Allowed statuses are strictly: ${VALID_STATUSES.join(', ')}.`
      );
    }

    // Verify produk exists before updating
    await this.getProdukById(id);

    return await produkRepository.update(id, { is_active: lowerStatus });
  }

  /**
   * Delete produk by ID
   * Enforces referential integrity: blocks deletion if referenced by shipment items
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteProduk(id) {
    await this.getProdukById(id);

    // Enforce referential integrity: block deletion if product is referenced by shipment items or inventory
    const referencingCount = await pengirimanDetailRepository.countByProdukId(id);
    if (referencingCount > 0) {
      throw new ConflictError(
        `Cannot delete product: it is currently referenced by ${referencingCount} shipment item(s).`
      );
    }

    const stockCount = await stokLapakRepository.countByProdukId(id);
    if (stockCount > 0) {
      throw new ConflictError(
        `Cannot delete product: it is currently referenced by ${stockCount} inventory record(s).`
      );
    }

    return await produkRepository.delete(id);
  }
}

module.exports = new ProdukService();
