const penjualanRepository = require('../repositories/penjualan.repository');
const penjualanDetailRepository = require('../repositories/penjualanDetail.repository');
const lapakService = require('./lapak.service');
const lapakRepository = require('../repositories/lapak.repository');
const produkRepository = require('../repositories/produk.repository');
const userRepository = require('../repositories/user.repository');
const stokLapakRepository = require('../repositories/stokLapak.repository');
const { ROLES } = require('../constants/roles');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * Penjualan Service
 * Encapsulates sales transaction logic, line item snapshots, continuous inventory updates,
 * and structured relational enrichment.
 */
class PenjualanService {
  /**
   * Create a new sales transaction with atomic line items and stock decrement
   * @param {Object} data { tanggal, parsedTanggal, lapak_id, metode_pembayaran, bukti_qris_url, catatan, items }
   * @param {Object} currentUser Authenticated user
   * @returns {Promise<Object>} Enriched sales transaction
   */
  async createPenjualan(data, currentUser) {
    const { parsedTanggal, lapak_id, metode_pembayaran, bukti_qris_url, catatan, items } = data;

    const targetLapakId = lapak_id || (currentUser ? currentUser.lapak_id : null);
    if (!targetLapakId) {
      throw new BadRequestError('Field "lapak_id" is required.');
    }

    // 1. Verify target lapak exists
    const lapak = await lapakService.getLapakById(targetLapakId);
    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${targetLapakId}' was not found.`);
    }

    // 2. Aggregate quantities by product ID and validate products
    const mergedQuantities = new Map();
    for (const item of items) {
      const prodId = item.produk_id.trim();
      const currentQty = mergedQuantities.get(prodId) || 0;
      mergedQuantities.set(prodId, currentQty + Number(item.qty));
    }

    const uniqueProductIds = Array.from(mergedQuantities.keys());
    const productMap = await produkRepository.findByIds(uniqueProductIds);

    for (const prodId of uniqueProductIds) {
      if (!productMap.has(prodId)) {
        throw new NotFoundError(`Produk with ID '${prodId}' was not found.`);
      }
    }

    // 3. Build snapshot line items with frozen product names and prices
    const snapshotItems = [];
    for (const [prodId, totalQty] of mergedQuantities.entries()) {
      const prod = productMap.get(prodId);
      const unitPrice = Number(prod.harga || 0);
      snapshotItems.push({
        produk_id: prod.id,
        nama_produk: prod.nama,
        qty: totalQty,
        harga_satuan: unitPrice,
        subtotal: totalQty * unitPrice,
      });
    }

    // 4. Determine SPG user ID (the authenticated SPG recording the sale, or explicit spg_id if recorded by admin)
    const spgId = (currentUser && currentUser.role === ROLES.SPG)
      ? currentUser.id
      : (data.spg_id ? data.spg_id.trim() : (currentUser ? currentUser.id : lapak.spg_id));

    // 5. Persist transaction header, details, and inventory stock atomically
    const { penjualan } = await penjualanRepository.createWithDetailsAndStock(
      {
        spg_id: spgId,
        lapak_id: targetLapakId,
        tanggal: parsedTanggal || new Date(),
        metode_pembayaran: metode_pembayaran,
        bukti_qris_url: bukti_qris_url || null,
        catatan: catatan ? catatan.trim() : '',
      },
      snapshotItems,
      targetLapakId
    );

    return await this.getPenjualanById(penjualan.id);
  }

  /**
   * Retrieve all sales transactions with optional filtering and relational enrichment
   * @param {Object} filters { lapak_id, spg_id, tanggal, metode_pembayaran }
   * @returns {Promise<Array<Object>>}
   */
  async getAllPenjualan(filters = {}) {
    const list = await penjualanRepository.findAll(filters);
    if (!list || list.length === 0) return [];

    const uniqueLapakIds = [...new Set(list.map((p) => p.lapak_id).filter(Boolean))];
    const uniqueSpgIds = [...new Set(list.map((p) => p.spg_id).filter(Boolean))];
    const penjualanIds = list.map((p) => p.id);

    const [lapakMap, usersMap, detailsMap] = await Promise.all([
      lapakRepository.findByIds(uniqueLapakIds),
      userRepository.findByIds(uniqueSpgIds),
      penjualanDetailRepository.findByPenjualanIds(penjualanIds),
    ]);

    await lapakService.enrichLapakList(Array.from(lapakMap.values()));

    return list.map((p) => {
      p.lapak = lapakMap.get(p.lapak_id) || null;
      p.spg = usersMap.get(p.spg_id) || null;
      p.items = detailsMap.get(p.id) || [];
      return p.toJSON();
    });
  }

  /**
   * Retrieve single sales transaction by ID with relations
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPenjualanById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Penjualan ID is required.');
    }

    const penjualan = await penjualanRepository.findById(id);
    if (!penjualan) {
      throw new NotFoundError(`Sales transaction with ID '${id}' was not found.`);
    }

    const [lapak, spgUser, items] = await Promise.all([
      penjualan.lapak_id ? lapakService.getLapakById(penjualan.lapak_id) : null,
      penjualan.spg_id ? userRepository.findById(penjualan.spg_id) : null,
      penjualanDetailRepository.findByPenjualanId(id),
    ]);

    penjualan.lapak = lapak;
    penjualan.spg = spgUser;
    penjualan.items = items;

    return penjualan.toJSON();
  }

  /**
   * Update sales transaction metadata (catatan, metode_pembayaran, bukti_qris_url)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updatePenjualan(id, updateData) {
    const existing = await this.getPenjualanById(id);

    const payload = {};
    if (updateData.metode_pembayaran !== undefined) {
      payload.metode_pembayaran = updateData.metode_pembayaran.toLowerCase().trim();
    }
    if (updateData.bukti_qris_url !== undefined) {
      payload.bukti_qris_url = updateData.bukti_qris_url ? updateData.bukti_qris_url.trim() : null;
    }
    if (updateData.catatan !== undefined) {
      payload.catatan = typeof updateData.catatan === 'string' ? updateData.catatan.trim() : '';
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    await penjualanRepository.update(id, payload);
    return await this.getPenjualanById(id);
  }

  /**
   * Delete sales transaction and rollback stock balances atomically
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deletePenjualan(id) {
    const existing = await penjualanRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Sales transaction with ID '${id}' was not found.`);
    }

    const items = await penjualanDetailRepository.findByPenjualanId(id);

    // Rollback inventory: decrement stok_terjual for each line item
    for (const item of items) {
      await stokLapakRepository.decrementStokTerjual(existing.lapak_id, item.produk_id, item.qty);
    }

    await penjualanRepository.deleteWithDetails(id);
    return true;
  }
}

module.exports = new PenjualanService();
