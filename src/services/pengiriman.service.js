const pengirimanRepository = require('../repositories/pengiriman.repository');
const pengirimanDetailRepository = require('../repositories/pengirimanDetail.repository');
const penerimaanRepository = require('../repositories/penerimaan.repository');
const lapakRepository = require('../repositories/lapak.repository');
const produkRepository = require('../repositories/produk.repository');
const userRepository = require('../repositories/user.repository');
const { VALID_PENGIRIMAN_STATUSES, PENGIRIMAN_STATUS } = require('../constants/pengirimanStatus');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');
const { parseDateOrDefault } = require('../utils/validators');

/**
 * Pengiriman Service
 * Encapsulates core business rules, transactional shipment creation,
 * product snapshotting, quantity aggregation, status lifecycle, and cascade deletion.
 */
class PengirimanService {
  /**
   * Create a new shipment with detail items atomically
   * @param {Object} data { tanggal, lapak_id, items }
   * @param {Object} currentUser Authenticated user from auth middleware
   * @returns {Promise<Object>} Created shipment with populated lapak and items
   */
  async createPengiriman({ tanggal, lapak_id, items }, currentUser) {
    if (!lapak_id || typeof lapak_id !== 'string' || !lapak_id.trim()) {
      throw new BadRequestError('Field "lapak_id" is required.');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Field "items" is required and must contain at least one product item.');
    }

    const trimmedLapakId = lapak_id.trim();

    // 1. Verify lapak existence
    const lapak = await lapakRepository.findById(trimmedLapakId);
    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${trimmedLapakId}' does not exist.`);
    }

    // 2. Validate and parse tanggal (defaults to now if omitted or empty)
    const parsedTanggal = parseDateOrDefault(tanggal);

    // 3. Merge duplicate items by produk_id and validate quantities
    const mergedItemsMap = new Map();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') {
        throw new BadRequestError(`Invalid item structure at index ${i}.`);
      }

      const { produk_id, qty } = item;
      if (!produk_id || typeof produk_id !== 'string' || !produk_id.trim()) {
        throw new BadRequestError(`Item at index ${i} is missing a valid "produk_id".`);
      }

      const parsedQty = Number(qty);
      if (isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty <= 0) {
        throw new BadRequestError(`Item at index ${i} has an invalid "qty". Quantity must be a positive integer.`);
      }

      const cleanProdukId = produk_id.trim();
      const currentQty = mergedItemsMap.get(cleanProdukId) || 0;
      mergedItemsMap.set(cleanProdukId, currentQty + parsedQty);
    }

    // 4. Validate all products exist and capture snapshot data via batch query
    const productIds = Array.from(mergedItemsMap.keys());
    const productsMap = await produkRepository.findByIds(productIds);

    const snapshotItems = [];
    for (const [produkId, totalItemQty] of mergedItemsMap.entries()) {
      const product = productsMap.get(produkId);
      if (!product) {
        throw new NotFoundError(`Product with ID '${produkId}' was not found in the database.`);
      }

      snapshotItems.push({
        produk_id: product.id,
        qty: totalItemQty,
        nama_produk: product.nama,
        harga_produk: product.harga,
        jenis_satuan: product.jenis_satuan,
        kategori_id: product.kategori_id || null,
        nama_kategori: product.nama_kategori || null,
      });
    }

    const createdBy = currentUser ? currentUser.id || currentUser.uid : '';

    // 5. Execute atomic creation of pengiriman header and pengiriman_detail line items
    const { pengiriman, items: createdDetails } = await pengirimanRepository.createWithDetails(
      {
        tanggal: parsedTanggal,
        lapak_id: trimmedLapakId,
        created_by: createdBy,
        status: PENGIRIMAN_STATUS.DRAFT,
      },
      snapshotItems
    );

    if (lapak) {
      const [spgUser, assignedUsers] = await Promise.all([
        lapak.spg_id ? userRepository.findById(lapak.spg_id) : null,
        userRepository.findByLapakId(lapak.id),
      ]);
      lapak.spg = spgUser ? Lapak.formatSpg(spgUser) : null;
      lapak.users = (assignedUsers || []).map((u) => Lapak.formatUser(u)).filter(Boolean);
    }

    return {
      ...pengiriman.toJSON(),
      lapak: lapak.toJSON(),
      creator: currentUser
        ? {
            id: currentUser.id,
            nama: currentUser.nama,
            email: currentUser.email,
            role: currentUser.role,
          }
        : null,
      items: createdDetails.map((d) => d.toJSON()),
    };
  }

  /**
   * Retrieve all shipments with optional filters
   * @param {Object} filters { status, lapak_id, created_by }
   * @returns {Promise<Array<Object>>}
   */
  async getAllPengiriman(filters = {}) {
    const shipments = await pengirimanRepository.findAll(filters);
    if (shipments.length === 0) {
      return [];
    }

    // Populate lapak details efficiently in single batch
    const uniqueLapakIds = [...new Set(shipments.map((s) => s.lapak_id).filter(Boolean))];
    const lapakMap = await lapakRepository.findByIds(uniqueLapakIds);
    const lapakSpgIds = [...new Set(Array.from(lapakMap.values()).map((l) => l.spg_id).filter(Boolean))];
    const [lapakSpgMap, lapakUsersMap] = await Promise.all([
      userRepository.findByIds(lapakSpgIds),
      userRepository.findByLapakIds(uniqueLapakIds),
    ]);
    for (const lapak of lapakMap.values()) {
      if (lapak.spg_id) {
        lapak.spg = lapakSpgMap.get(lapak.spg_id) || null;
      }
      const assignedUsers = lapakUsersMap.get(lapak.id) || [];
      lapak.users = assignedUsers.map((u) => Lapak.formatUser(u)).filter(Boolean);
    }

    return shipments.map((s) => {
      const json = s.toJSON();
      const lapak = lapakMap.get(s.lapak_id);
      json.lapak = lapak ? lapak.toJSON() : null;
      return json;
    });
  }

  /**
   * Retrieve single shipment by ID with populated lapak, creator, and items
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPengirimanById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Shipment ID is required.');
    }

    const shipment = await pengirimanRepository.findById(id);
    if (!shipment) {
      throw new NotFoundError(`Shipment with ID '${id}' was not found.`);
    }

    const [items, lapak, creator] = await Promise.all([
      pengirimanDetailRepository.findByPengirimanId(id),
      lapakRepository.findById(shipment.lapak_id),
      shipment.created_by ? userRepository.findById(shipment.created_by) : null,
    ]);

    if (lapak) {
      const [spgUser, assignedUsers] = await Promise.all([
        lapak.spg_id ? userRepository.findById(lapak.spg_id) : null,
        userRepository.findByLapakId(lapak.id),
      ]);
      lapak.spg = spgUser ? Lapak.formatSpg(spgUser) : null;
      lapak.users = (assignedUsers || []).map((u) => Lapak.formatUser(u)).filter(Boolean);
    }

    return {
      ...shipment.toJSON(),
      lapak: lapak ? lapak.toJSON() : null,
      creator: creator
        ? {
            id: creator.id,
            nama: creator.nama,
            email: creator.email,
            role: creator.role,
          }
        : null,
      items: items.map((i) => i.toJSON()),
    };
  }

  /**
   * Update shipment metadata (lapak_id, tanggal)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updatePengiriman(id, updateData) {
    const existing = await this.getPengirimanById(id);

    const payload = {};

    if (updateData.lapak_id !== undefined) {
      if (!updateData.lapak_id || typeof updateData.lapak_id !== 'string' || !updateData.lapak_id.trim()) {
        throw new BadRequestError('Field "lapak_id" cannot be empty.');
      }

      const trimmedLapakId = updateData.lapak_id.trim();
      const lapak = await lapakRepository.findById(trimmedLapakId);
      if (!lapak) {
        throw new NotFoundError(`Lapak with ID '${trimmedLapakId}' does not exist.`);
      }

      payload.lapak_id = trimmedLapakId;
    }

    if (updateData.tanggal !== undefined) {
      payload.tanggal = parseDateOrDefault(updateData.tanggal, false);
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    await pengirimanRepository.update(id, payload);
    return await this.getPengirimanById(id);
  }

  /**
   * Update shipment status transition
   * @param {string} id
   * @param {string} newStatus
   * @returns {Promise<Object>}
   */
  async updateStatus(id, newStatus) {
    if (!newStatus || typeof newStatus !== 'string' || !newStatus.trim()) {
      throw new BadRequestError('Field "status" is required.');
    }

    const cleanStatus = newStatus.trim().toLowerCase();
    if (!VALID_PENGIRIMAN_STATUSES.includes(cleanStatus)) {
      throw new BadRequestError(
        `Invalid status '${cleanStatus}'. Allowed values are: ${VALID_PENGIRIMAN_STATUSES.join(', ')}.`
      );
    }

    const existing = await pengirimanRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Shipment with ID '${id}' was not found.`);
    }

    await pengirimanRepository.updateStatus(id, cleanStatus);
    return await this.getPengirimanById(id);
  }

  /**
   * Delete shipment by ID and cascade delete all associated detail items
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deletePengiriman(id) {
    // 1. Verify existence
    const existing = await pengirimanRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Shipment with ID '${id}' was not found.`);
    }

    // 2. Referential integrity check: ensure no receipt (penerimaan) references this shipment
    const receiptCount = await penerimaanRepository.countByPengirimanId(id);
    if (receiptCount > 0) {
      throw new ConflictError(
        `Cannot delete shipment '${existing.unique_id || id}': it is currently referenced by ${receiptCount} receipt record(s) (penerimaan). Please delete the associated receipt first.`
      );
    }

    // 3. Cascade delete all child items in 'pengiriman_detail'
    await pengirimanDetailRepository.deleteByPengirimanId(id);

    // 4. Delete parent 'pengiriman' document
    return await pengirimanRepository.delete(id);
  }
}

module.exports = new PengirimanService();
