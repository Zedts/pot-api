const stokLapakRepository = require('../repositories/stokLapak.repository');
const lapakRepository = require('../repositories/lapak.repository');
const produkRepository = require('../repositories/produk.repository');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

/**
 * StokLapak Service
 * Encapsulates inventory business rules, continuous balance calculation,
 * and relational enrichment with Lapak and Produk.
 */
class StokLapakService {
  /**
   * Enrich stock items with lapak and produk details via efficient batch queries
   * @param {Array<StokLapak>} stockList
   * @returns {Promise<Array<Object>>}
   */
  async enrichStockList(stockList) {
    if (!stockList || stockList.length === 0) return [];

    const uniqueLapakIds = [...new Set(stockList.map((s) => s.lapak_id).filter(Boolean))];
    const uniqueProdukIds = [...new Set(stockList.map((s) => s.produk_id).filter(Boolean))];

    const [lapakMap, produkMap] = await Promise.all([
      lapakRepository.findByIds(uniqueLapakIds),
      produkRepository.findByIds(uniqueProdukIds),
    ]);

    return stockList.map((s) => {
      const json = s.toJSON();
      const lapak = lapakMap.get(s.lapak_id);
      const produk = produkMap.get(s.produk_id);

      json.lapak = lapak ? lapak.toJSON() : null;
      json.produk = produk ? produk.toJSON() : null;
      return json;
    });
  }

  /**
   * Retrieve all stock records with optional filtering
   * @param {Object} filters { lapak_id, produk_id }
   * @returns {Promise<Array<Object>>}
   */
  async getAllStokLapak(filters = {}) {
    const list = await stokLapakRepository.findAll(filters);
    return await this.enrichStockList(list);
  }

  /**
   * Retrieve single stock record by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getStokLapakById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Stock ID is required.');
    }

    const item = await stokLapakRepository.findById(id);
    if (!item) {
      throw new NotFoundError(`Stock record with ID '${id}' was not found.`);
    }

    const [lapak, produk] = await Promise.all([
      lapakRepository.findById(item.lapak_id),
      produkRepository.findById(item.produk_id),
    ]);

    const json = item.toJSON();
    json.lapak = lapak ? lapak.toJSON() : null;
    json.produk = produk ? produk.toJSON() : null;
    return json;
  }

  /**
   * Create a new stock tracking record
   * @param {Object} data { lapak_id, produk_id, stok_awal, stok_masuk, stok_terjual }
   * @returns {Promise<Object>}
   */
  async createStokLapak({ lapak_id, produk_id, stok_awal = 0, stok_masuk = 0, stok_terjual = 0 }) {
    if (!lapak_id || typeof lapak_id !== 'string' || !lapak_id.trim()) {
      throw new BadRequestError('Field "lapak_id" is required.');
    }
    if (!produk_id || typeof produk_id !== 'string' || !produk_id.trim()) {
      throw new BadRequestError('Field "produk_id" is required.');
    }

    const cleanLapakId = lapak_id.trim();
    const cleanProdukId = produk_id.trim();

    // Verify foreign entities
    const [lapak, produk] = await Promise.all([
      lapakRepository.findById(cleanLapakId),
      produkRepository.findById(cleanProdukId),
    ]);

    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${cleanLapakId}' was not found.`);
    }
    if (!produk) {
      throw new NotFoundError(`Produk with ID '${cleanProdukId}' was not found.`);
    }

    // Check if stock record already exists for this stall & product
    const existing = await stokLapakRepository.findByLapakAndProduk(cleanLapakId, cleanProdukId);
    if (existing) {
      throw new ConflictError(
        `Stock tracking for Lapak '${cleanLapakId}' and Produk '${cleanProdukId}' already exists.`
      );
    }

    const parsedAwal = Number(stok_awal || 0);
    const parsedMasuk = Number(stok_masuk || 0);
    const parsedTerjual = Number(stok_terjual || 0);

    if (parsedAwal < 0 || parsedMasuk < 0 || parsedTerjual < 0) {
      throw new BadRequestError('Stock values (stok_awal, stok_masuk, stok_terjual) cannot be negative.');
    }

    const created = await stokLapakRepository.create({
      lapak_id: cleanLapakId,
      produk_id: cleanProdukId,
      stok_awal: parsedAwal,
      stok_masuk: parsedMasuk,
      stok_terjual: parsedTerjual,
    });

    return await this.getStokLapakById(created.id);
  }

  /**
   * Update stock numbers and recalculate balance
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateStokLapak(id, updateData) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Stock ID is required.');
    }

    const existing = await stokLapakRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Stock record with ID '${id}' was not found.`);
    }

    const payload = {};
    if (updateData.stok_awal !== undefined) {
      const val = Number(updateData.stok_awal);
      if (isNaN(val) || val < 0) {
        throw new BadRequestError('Field "stok_awal" must be a non-negative number.');
      }
      payload.stok_awal = val;
    }

    if (updateData.stok_masuk !== undefined) {
      const val = Number(updateData.stok_masuk);
      if (isNaN(val) || val < 0) {
        throw new BadRequestError('Field "stok_masuk" must be a non-negative number.');
      }
      payload.stok_masuk = val;
    }

    if (updateData.stok_terjual !== undefined) {
      const val = Number(updateData.stok_terjual);
      if (isNaN(val) || val < 0) {
        throw new BadRequestError('Field "stok_terjual" must be a non-negative number.');
      }
      payload.stok_terjual = val;
    }

    if (Object.keys(payload).length === 0) {
      return await this.getStokLapakById(id);
    }

    await stokLapakRepository.update(id, payload);
    return await this.getStokLapakById(id);
  }

  /**
   * Delete a stock record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteStokLapak(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Stock ID is required.');
    }

    const existing = await stokLapakRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Stock record with ID '${id}' was not found.`);
    }

    return await stokLapakRepository.delete(id);
  }
}

module.exports = new StokLapakService();
