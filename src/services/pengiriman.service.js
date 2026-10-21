const { db } = require('../firebase');
const pengirimanRepository = require('../repositories/pengiriman.repository');
const pengirimanDetailRepository = require('../repositories/pengirimanDetail.repository');
const penerimaanRepository = require('../repositories/penerimaan.repository');
const lapakRepository = require('../repositories/lapak.repository');
const lapakService = require('./lapak.service');
const produkRepository = require('../repositories/produk.repository');
const userRepository = require('../repositories/user.repository');
const stokLapakRepository = require('../repositories/stokLapak.repository');
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
   * @param {Object} data { tanggal, lapak_id, pengirim_id, items, asal_lapak_id, ttd_pengirim_url }
   * @param {Object} currentUser Authenticated user from auth middleware
   * @returns {Promise<Object>} Created shipment with populated lapak and items
   */
  async createPengiriman({ tanggal, lapak_id, pengirim_id, items, asal_lapak_id, ttd_pengirim_url }, currentUser) {
    if (!lapak_id || typeof lapak_id !== 'string' || !lapak_id.trim()) {
      throw new BadRequestError('Field "lapak_id" is required.');
    }

    if (!pengirim_id || typeof pengirim_id !== 'string' || !pengirim_id.trim()) {
      throw new BadRequestError('Field "pengirim_id" is required.');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Field "items" is required and must contain at least one product item.');
    }

    const trimmedLapakId = lapak_id.trim();
    const trimmedPengirimId = pengirim_id.trim();
    const cleanAsalLapakId = asal_lapak_id && typeof asal_lapak_id === 'string' && asal_lapak_id.trim() ? asal_lapak_id.trim() : null;

    if (cleanAsalLapakId && cleanAsalLapakId === trimmedLapakId) {
      throw new BadRequestError('Outlet asal dan outlet tujuan tidak boleh sama.');
    }

    // 1. Verify lapak existence, pengirim existence, and optional asal_lapak in parallel
    const checks = [
      lapakRepository.findById(trimmedLapakId),
      userRepository.findById(trimmedPengirimId),
    ];
    if (cleanAsalLapakId) {
      checks.push(lapakRepository.findById(cleanAsalLapakId));
    }

    const [lapak, pengirimUser, asalLapak] = await Promise.all(checks);

    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${trimmedLapakId}' does not exist.`);
    }

    if (!pengirimUser) {
      throw new NotFoundError(`Pengirim user with ID '${trimmedPengirimId}' does not exist.`);
    }

    if (cleanAsalLapakId && !asalLapak) {
      throw new NotFoundError(`Lapak asal with ID '${cleanAsalLapakId}' does not exist.`);
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

      // If transfer from origin lapak, verify stock availability at origin stall
      if (cleanAsalLapakId) {
        const originStock = await stokLapakRepository.findByLapakAndProduk(cleanAsalLapakId, produkId);
        const availableStock = originStock ? originStock.calculateStokAkhir() : 0;
        if (availableStock < totalItemQty) {
          throw new BadRequestError(
            `Stok produk "${product.nama}" di lapak asal tidak mencukupi (Tersedia: ${availableStock}, Diminta transfer: ${totalItemQty}).`
          );
        }
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

    // 5. If origin stall exists, atomically increment stok_transfer at origin stall
    if (cleanAsalLapakId) {
      for (const item of snapshotItems) {
        await stokLapakRepository.incrementStokTransfer(cleanAsalLapakId, item.produk_id, item.qty);
      }
    }

    // 6. Execute atomic creation of pengiriman header and pengiriman_detail line items
    const { pengiriman, items: createdDetails } = await pengirimanRepository.createWithDetails(
      {
        tanggal: parsedTanggal,
        lapak_id: trimmedLapakId,
        asal_lapak_id: cleanAsalLapakId,
        created_by: createdBy,
        pengirim_id: trimmedPengirimId,
        status: PENGIRIMAN_STATUS.DRAFT,
        ttd_pengirim_url: ttd_pengirim_url && typeof ttd_pengirim_url === 'string' ? ttd_pengirim_url.trim() : null,
      },
      snapshotItems
    );

    const enrichedLapak = await lapakService.getLapakById(trimmedLapakId);
    const enrichedAsalLapak = cleanAsalLapakId ? await lapakService.getLapakById(cleanAsalLapakId) : null;

    return {
      ...pengiriman.toJSON(),
      lapak: enrichedLapak ? enrichedLapak.toJSON() : null,
      asal_lapak: enrichedAsalLapak ? enrichedAsalLapak.toJSON() : null,
      creator: currentUser
        ? {
            id: currentUser.id,
            nama: currentUser.nama,
            email: currentUser.email,
            role: currentUser.role,
          }
        : null,
      pengirim: {
        id: pengirimUser.id,
        nama: pengirimUser.nama,
        username: pengirimUser.username,
        email: pengirimUser.email,
        role: pengirimUser.role,
        no_hp: pengirimUser.no_hp,
      },
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

    // Populate lapak, creator, and pengirim details efficiently in batch
    const uniqueLapakIds = [
      ...new Set([
        ...shipments.map((s) => s.lapak_id),
        ...shipments.map((s) => s.asal_lapak_id),
      ].filter(Boolean)),
    ];
    const uniqueCreatorIds = [...new Set(shipments.map((s) => s.created_by).filter(Boolean))];
    const uniquePengirimIds = [...new Set(shipments.map((s) => s.pengirim_id).filter(Boolean))];
    const allUserIds = [...new Set([...uniqueCreatorIds, ...uniquePengirimIds])];

    const [lapakMap, usersMap] = await Promise.all([
      lapakRepository.findByIds(uniqueLapakIds),
      userRepository.findByIds(allUserIds),
    ]);
    await lapakService.enrichLapakList(Array.from(lapakMap.values()));

    return shipments.map((s) => {
      const json = s.toJSON();
      const lapak = lapakMap.get(s.lapak_id);
      const asalLapak = s.asal_lapak_id ? lapakMap.get(s.asal_lapak_id) : null;
      const creator = usersMap.get(s.created_by);
      const pengirimUser = s.pengirim_id ? usersMap.get(s.pengirim_id) : creator;

      json.lapak = lapak ? lapak.toJSON() : null;
      json.asal_lapak = asalLapak ? asalLapak.toJSON() : null;
      json.creator = creator
        ? {
            id: creator.id,
            nama: creator.nama,
            email: creator.email,
            role: creator.role,
          }
        : null;
      json.pengirim = pengirimUser
        ? {
            id: pengirimUser.id,
            nama: pengirimUser.nama,
            username: pengirimUser.username,
            email: pengirimUser.email,
            role: pengirimUser.role,
            no_hp: pengirimUser.no_hp,
          }
        : (json.creator ? { ...json.creator } : null);

      return json;
    });
  }

  /**
   * Retrieve single shipment by ID with populated lapak, creator, pengirim, and items
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

    const [items, lapak, asalLapak, creator, pengirimUser] = await Promise.all([
      pengirimanDetailRepository.findByPengirimanId(id),
      shipment.lapak_id ? lapakService.getLapakById(shipment.lapak_id) : null,
      shipment.asal_lapak_id ? lapakService.getLapakById(shipment.asal_lapak_id) : null,
      shipment.created_by ? userRepository.findById(shipment.created_by) : null,
      shipment.pengirim_id ? userRepository.findById(shipment.pengirim_id) : null,
    ]);

    const resolvedPengirim = pengirimUser || creator;

    return {
      ...shipment.toJSON(),
      lapak: lapak ? lapak.toJSON() : null,
      asal_lapak: asalLapak ? asalLapak.toJSON() : null,
      creator: creator
        ? {
            id: creator.id,
            nama: creator.nama,
            email: creator.email,
            role: creator.role,
          }
        : null,
      pengirim: resolvedPengirim
        ? {
            id: resolvedPengirim.id,
            nama: resolvedPengirim.nama,
            username: resolvedPengirim.username,
            email: resolvedPengirim.email,
            role: resolvedPengirim.role,
            no_hp: resolvedPengirim.no_hp,
          }
        : null,
      items: items.map((i) => i.toJSON()),
    };
  }

  /**
   * Update shipment metadata (lapak_id, tanggal, pengirim_id)
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

    if (updateData.pengirim_id !== undefined) {
      if (!updateData.pengirim_id || typeof updateData.pengirim_id !== 'string' || !updateData.pengirim_id.trim()) {
        throw new BadRequestError('Field "pengirim_id" cannot be empty.');
      }

      const trimmedPengirimId = updateData.pengirim_id.trim();
      const pengirimUser = await userRepository.findById(trimmedPengirimId);
      if (!pengirimUser) {
        throw new NotFoundError(`Pengirim user with ID '${trimmedPengirimId}' does not exist.`);
      }

      payload.pengirim_id = trimmedPengirimId;
    }

    if (updateData.tanggal !== undefined) {
      payload.tanggal = parseDateOrDefault(updateData.tanggal, false);
    }

    if (updateData.status !== undefined) {
      if (!updateData.status || typeof updateData.status !== 'string' || !updateData.status.trim()) {
        throw new BadRequestError('Field "status" cannot be empty.');
      }
      const cleanStatus = updateData.status.trim().toLowerCase();
      if (!VALID_PENGIRIMAN_STATUSES.includes(cleanStatus)) {
        throw new BadRequestError(
          `Invalid status '${cleanStatus}'. Allowed values are: ${VALID_PENGIRIMAN_STATUSES.join(', ')}.`
        );
      }
      payload.status = cleanStatus;
    }

    const hasItemsUpdate = updateData.items !== undefined;
    if (hasItemsUpdate && existing.status !== 'draft') {
      throw new BadRequestError('Tidak dapat memperbarui item produk pada pengiriman dengan status selain draft.');
    }

    let cleanNewAsalLapakId = undefined;
    if (updateData.asal_lapak_id !== undefined) {
      cleanNewAsalLapakId = updateData.asal_lapak_id && typeof updateData.asal_lapak_id === 'string' && updateData.asal_lapak_id.trim()
        ? updateData.asal_lapak_id.trim()
        : null;

      const targetLapakId = payload.lapak_id || existing.lapak_id;
      if (cleanNewAsalLapakId && cleanNewAsalLapakId === targetLapakId) {
        throw new BadRequestError('Outlet asal dan outlet tujuan tidak boleh sama.');
      }

      if (cleanNewAsalLapakId) {
        const asalLapak = await lapakRepository.findById(cleanNewAsalLapakId);
        if (!asalLapak) {
          throw new NotFoundError(`Lapak asal with ID '${cleanNewAsalLapakId}' does not exist.`);
        }
      }

      payload.asal_lapak_id = cleanNewAsalLapakId;
    }

    const effectiveAsalLapakId = payload.asal_lapak_id !== undefined ? payload.asal_lapak_id : existing.asal_lapak_id;
    const oldAsalLapakId = existing.asal_lapak_id || null;

    if (hasItemsUpdate) {
      const oldDetails = existing.items || (await pengirimanDetailRepository.findByPengirimanId(id));

      // 1. Rollback old origin stall stok_transfer if previously a transfer
      if (oldAsalLapakId) {
        for (const item of oldDetails) {
          if (item.produk_id && item.qty > 0) {
            await stokLapakRepository.decrementStokTransfer(oldAsalLapakId, item.produk_id, item.qty);
          }
        }
      }

      // 2. Merge duplicate items by produk_id and validate quantities
      const mergedItemsMap = new Map();
      for (let i = 0; i < updateData.items.length; i++) {
        const item = updateData.items[i];
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

      // 3. Validate all products exist and capture snapshot data
      const productIds = Array.from(mergedItemsMap.keys());
      const productsMap = await produkRepository.findByIds(productIds);
      const snapshotItems = [];

      for (const [produkId, totalItemQty] of mergedItemsMap.entries()) {
        const product = productsMap.get(produkId);
        if (!product) {
          if (oldAsalLapakId) {
            for (const item of oldDetails) {
              if (item.produk_id && item.qty > 0) {
                await stokLapakRepository.incrementStokTransfer(oldAsalLapakId, item.produk_id, item.qty);
              }
            }
          }
          throw new NotFoundError(`Product with ID '${produkId}' was not found in the database.`);
        }

        if (effectiveAsalLapakId) {
          const originStock = await stokLapakRepository.findByLapakAndProduk(effectiveAsalLapakId, produkId);
          const availableStock = originStock ? originStock.calculateStokAkhir() : 0;
          if (availableStock < totalItemQty) {
            if (oldAsalLapakId) {
              for (const item of oldDetails) {
                if (item.produk_id && item.qty > 0) {
                  await stokLapakRepository.incrementStokTransfer(oldAsalLapakId, item.produk_id, item.qty);
                }
              }
            }
            throw new BadRequestError(
              `Stok produk "${product.nama}" di lapak asal tidak mencukupi (Tersedia: ${availableStock}, Diminta transfer: ${totalItemQty}).`
            );
          }
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

      // 4. Increment stok_transfer at effective origin stall
      if (effectiveAsalLapakId) {
        for (const item of snapshotItems) {
          await stokLapakRepository.incrementStokTransfer(effectiveAsalLapakId, item.produk_id, item.qty);
        }
      }

      // 5. Replace detail records atomically
      await pengirimanDetailRepository.deleteByPengirimanId(id);
      const batch = db.batch();
      pengirimanDetailRepository.prepareBatchCreate(
        snapshotItems.map((item) => ({
          pengiriman_id: id,
          pengiriman_unique_id: existing.unique_id,
          ...item,
        })),
        batch
      );
      await batch.commit();

      const totalQty = snapshotItems.reduce((acc, i) => acc + i.qty, 0);
      payload.total_qty = totalQty;
      payload.total_items = snapshotItems.length;
      payload.qty_kirim = totalQty;
    } else if (cleanNewAsalLapakId !== undefined && cleanNewAsalLapakId !== oldAsalLapakId) {
      // Items didn't change, but origin stall changed
      const details = existing.items || (await pengirimanDetailRepository.findByPengirimanId(id));

      if (oldAsalLapakId) {
        for (const item of details) {
          if (item.produk_id && item.qty > 0) {
            await stokLapakRepository.decrementStokTransfer(oldAsalLapakId, item.produk_id, item.qty);
          }
        }
      }

      if (cleanNewAsalLapakId) {
        for (const item of details) {
          if (item.produk_id && item.qty > 0) {
            const originStock = await stokLapakRepository.findByLapakAndProduk(cleanNewAsalLapakId, item.produk_id);
            const availableStock = originStock ? originStock.calculateStokAkhir() : 0;
            if (availableStock < item.qty) {
              if (oldAsalLapakId) {
                for (const rollbackItem of details) {
                  if (rollbackItem.produk_id && rollbackItem.qty > 0) {
                    await stokLapakRepository.incrementStokTransfer(oldAsalLapakId, rollbackItem.produk_id, rollbackItem.qty);
                  }
                }
              }
              throw new BadRequestError(
                `Stok produk "${item.nama_produk || item.produk_id}" di lapak asal tidak mencukupi (Tersedia: ${availableStock}, Diminta transfer: ${item.qty}).`
              );
            }
            await stokLapakRepository.incrementStokTransfer(cleanNewAsalLapakId, item.produk_id, item.qty);
          }
        }
      }
    }

    const effectiveOrigin = payload.asal_lapak_id !== undefined ? payload.asal_lapak_id : existing.asal_lapak_id;
    const effectiveDestination = payload.lapak_id || existing.lapak_id;
    if (effectiveOrigin && effectiveOrigin === effectiveDestination) {
      throw new BadRequestError('Outlet asal dan outlet tujuan tidak boleh sama.');
    }

    if (updateData.ttd_pengirim_url !== undefined) {
      payload.ttd_pengirim_url = updateData.ttd_pengirim_url;
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

    // 3. Rollback origin stall's stok_transfer if this was a transfer shipment
    if (existing.asal_lapak_id) {
      const details = await pengirimanDetailRepository.findByPengirimanId(id);
      for (const item of details) {
        if (item.produk_id && item.qty > 0) {
          await stokLapakRepository.decrementStokTransfer(existing.asal_lapak_id, item.produk_id, item.qty);
        }
      }
    }

    // 4. Cascade delete all child items in 'pengiriman_detail'
    await pengirimanDetailRepository.deleteByPengirimanId(id);

    // 5. Delete parent 'pengiriman' document
    return await pengirimanRepository.delete(id);
  }
}

module.exports = new PengirimanService();
