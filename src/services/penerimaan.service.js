const penerimaanRepository = require('../repositories/penerimaan.repository');
const pengirimanRepository = require('../repositories/pengiriman.repository');
const pengirimanDetailRepository = require('../repositories/pengirimanDetail.repository');
const stokLapakRepository = require('../repositories/stokLapak.repository');
const userRepository = require('../repositories/user.repository');
const lapakRepository = require('../repositories/lapak.repository');
const lapakService = require('./lapak.service');
const { PENERIMAAN_STATUS } = require('../constants/penerimaanStatus');
const { PENGIRIMAN_STATUS } = require('../constants/pengirimanStatus');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');
const { uploadImageBuffer, deleteR2Asset } = require('../utils/r2');
const { assertValidImageFile } = require('../utils/fileValidation');
const { parseDateOrDefault } = require('../utils/validators');

/**
 * Penerimaan Service
 * Encapsulates receipt recording, quantity comparison (qty_terima vs qty_kirim),
 * shipment lifecycle transitions, automatic stock inflow to stok_lapak, and Cloudflare R2 file storage.
 * - pengiriman_id strictly references the pengiriman document ID.
 * - unique_id strictly references the #PG-YYYYMMDD-COUNTER unique identifier.
 * - counters_id strictly references the counters collection document ID (pengiriman_YYYYMMDD).
 */
class PenerimaanService {
  /**
   * Enrich receipt records with user (SPG), shipment, lapak, and counter details
   * @param {Array<Penerimaan>} receipts
   * @returns {Promise<Array<Object>>}
   */
  async enrichReceipts(receipts) {
    if (!receipts || receipts.length === 0) return [];

    const spgIds = [...new Set(receipts.map((r) => r.spg_id).filter(Boolean))];
    const shipmentDocIds = [...new Set(receipts.map((r) => r.pengiriman_id).filter(Boolean))];
    const [usersMap, shipmentsMap] = await Promise.all([
      userRepository.findByIds(spgIds),
      pengirimanRepository.findByIds(shipmentDocIds),
    ]);

    const lapakIds = [
      ...new Set(Array.from(shipmentsMap.values()).map((s) => s.lapak_id).filter(Boolean)),
    ];
    const lapakMap = await lapakRepository.findByIds(lapakIds);
    await lapakService.enrichLapakList(Array.from(lapakMap.values()));

    return receipts.map((r) => {
      const json = r.toJSON();
      const spgUser = usersMap.get(r.spg_id);
      const shipment = shipmentsMap.get(r.pengiriman_id);
      const lapak = shipment ? lapakMap.get(shipment.lapak_id) : null;

      json.spg = spgUser
        ? {
            id: spgUser.id,
            nama: spgUser.nama,
            email: spgUser.email,
            role: spgUser.role,
          }
        : null;

      json.pengiriman = shipment
        ? {
            id: shipment.id,
            unique_id: shipment.unique_id,
            counters_id: shipment.counters_id,
            status: shipment.status,
            qty_kirim: shipment.qty_kirim,
            total_items: shipment.total_items,
          }
        : null;

      json.lapak = lapak ? lapak.toJSON() : null;

      return json;
    });
  }

  /**
   * Record new receipt for a shipment at a stall
   * @param {Object} data { pengiriman_id, unique_id, tanggal, qty_terima, nota_url, catatan }
   * @param {Object} currentUser Authenticated user
   * @returns {Promise<Object>}
   */
  async createPenerimaan(data, currentUser) {
    const { pengiriman_id, unique_id, tanggal, qty_terima, nota_url, catatan } = data;

    const identifier = (pengiriman_id || unique_id || '').trim();
    if (!identifier) {
      throw new BadRequestError('Field "pengiriman_id" or "unique_id" is required.');
    }

    // 1. Look up shipment (supports both document ID and #PG-... unique ID)
    const shipment = await pengirimanRepository.findById(identifier);
    if (!shipment) {
      throw new NotFoundError(`Shipment '${identifier}' was not found.`);
    }

    // 2. Ensure shipment has a valid unique_id and validate against counters collection
    const shipmentUniqueId = await pengirimanRepository.ensureUniqueId(shipment);

    if (unique_id && unique_id.trim() !== shipmentUniqueId) {
      throw new BadRequestError(
        `Provided unique_id '${unique_id}' does not match shipment unique_id '${shipmentUniqueId}'.`
      );
    }

    const counterVerification = await pengirimanRepository.verifyUniqueIdAgainstCounter(shipmentUniqueId);
    if (!counterVerification.valid) {
      if (!counterVerification.counterDocExists) {
        throw new ConflictError(
          `Referential integrity conflict: The counter record '${counterVerification.counterId}' for shipment '${shipmentUniqueId}' was not found in the counters collection. It may have been deleted.`
        );
      }
      throw new BadRequestError(
        `Shipment unique_id '${shipmentUniqueId}' failed counters validation: ${counterVerification.reason}`
      );
    }

    // 3. Prevent duplicate receipts for the same shipment
    const existingReceipt = await penerimaanRepository.findByPengirimanId(shipment.id);
    if (existingReceipt) {
      throw new ConflictError(
        `Penerimaan for shipment '${shipmentUniqueId}' (ID: ${shipment.id}) has already been recorded.`
      );
    }

    // 4. Validate qty_terima
    if (qty_terima === undefined || qty_terima === null || qty_terima === '') {
      throw new BadRequestError('Field "qty_terima" is required.');
    }

    const parsedQtyTerima = Number(qty_terima);
    if (isNaN(parsedQtyTerima) || !Number.isInteger(parsedQtyTerima) || parsedQtyTerima < 0) {
      throw new BadRequestError('Field "qty_terima" must be a non-negative integer.');
    }

    // 5. Validate or default tanggal (defaults to now if omitted or empty)
    const parsedTanggal = parseDateOrDefault(tanggal);

    // 6. Determine status via comparison: qty_terima vs pengiriman.qty_kirim
    const calculatedStatus = (parsedQtyTerima === Number(shipment.qty_kirim))
      ? PENERIMAAN_STATUS.SESUAI
      : PENERIMAAN_STATUS.SELISIH;

    const spgId = currentUser ? (currentUser.id || currentUser.uid) : (data.spg_id || '');

    const dateStr = shipmentUniqueId.split('-')[1];
    const counterId = `pengiriman_${dateStr}`;

    // 7. Save receipt entity: pengiriman_id is shipment doc ID, unique_id is #PG-..., counters_id is pengiriman_YYYYMMDD
    const receipt = await penerimaanRepository.create({
      pengiriman_id: shipment.id,
      unique_id: shipmentUniqueId,
      counters_id: shipment.counters_id || counterId,
      lapak_id: shipment.lapak_id || null,
      spg_id: spgId,
      tanggal: parsedTanggal,
      qty_terima: parsedQtyTerima,
      nota_url: nota_url ? nota_url.trim() : null,
      catatan: catatan ? catatan.trim() : '',
      status: calculatedStatus,
    });

    // 8. Transition shipment status based on receipt outcome
    const targetShipmentStatus = (calculatedStatus === PENERIMAAN_STATUS.SESUAI)
      ? PENGIRIMAN_STATUS.SELESAI
      : PENGIRIMAN_STATUS.DITERIMA_SPG;

    await pengirimanRepository.updateStatus(shipment.id, targetShipmentStatus);

    // 9. Automatic stock inflow: for each item in pengiriman_detail, increment stok_masuk in stok_lapak
    const details = await pengirimanDetailRepository.findByPengirimanId(shipment.id);
    for (const detail of details) {
      if (detail.produk_id && detail.qty > 0) {
        await stokLapakRepository.incrementStokMasuk(shipment.lapak_id, detail.produk_id, detail.qty);
      }
    }

    return await this.getPenerimaanById(receipt.id);
  }

  /**
   * Retrieve all receipts with optional filters
   * @param {Object} filters
   * @returns {Promise<Array<Object>>}
   */
  async getAllPenerimaan(filters = {}) {
    let receipts = await penerimaanRepository.findAll(filters);
    // Backward-compatibility fallback: if lapak_id was queried but returned 0 (e.g. legacy receipts without lapak_id field),
    // query without lapak_id filter and let enrichment filter by lapak
    if (filters.lapak_id && receipts.length === 0) {
      const { lapak_id, lapakId, ...otherFilters } = filters;
      const allReceipts = await penerimaanRepository.findAll(otherFilters);
      if (allReceipts.length > 0) {
        receipts = allReceipts;
      }
    }
    const enriched = await this.enrichReceipts(receipts);
    if (filters.lapak_id) {
      const cleanLapakId = filters.lapak_id.trim();
      return enriched.filter((r) => r.lapak && (r.lapak.id === cleanLapakId || r.lapak.lapak_id === cleanLapakId));
    }
    return enriched;
  }

  /**
   * Retrieve single receipt by ID with relations
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPenerimaanById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Penerimaan ID is required.');
    }

    const receipt = await penerimaanRepository.findById(id);
    if (!receipt) {
      throw new NotFoundError(`Penerimaan with ID '${id}' was not found.`);
    }

    const enrichedList = await this.enrichReceipts([receipt]);
    return enrichedList[0];
  }

  /**
   * Update receipt metadata (e.g. catatan or nota_url)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updatePenerimaan(id, updateData) {
    const existing = await this.getPenerimaanById(id);

    const payload = {};
    if (updateData.catatan !== undefined) {
      payload.catatan = typeof updateData.catatan === 'string' ? updateData.catatan.trim() : '';
    }
    if (updateData.nota_url !== undefined) {
      payload.nota_url = updateData.nota_url ? updateData.nota_url.trim() : null;
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    await penerimaanRepository.update(id, payload);
    return await this.getPenerimaanById(id);
  }

  /**
   * Upload image nota for a specific penerimaan record and store to Cloudflare R2
   * @param {string} id
   * @param {Buffer} fileBuffer
   * @returns {Promise<Object>}
   */
  async uploadNota(id, fileBuffer) {
    // 1. Verify existence before processing
    const existing = await this.getPenerimaanById(id);

    // 2. Strict format and magic bytes validation
    assertValidImageFile(fileBuffer, 'nota');

    const uniqueIdentifier = existing.unique_id || (existing.pengiriman && existing.pengiriman.unique_id) || id;
    const cleanIdentifier = uniqueIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `nota_${cleanIdentifier}_${Date.now()}`;

    // 3. Upload to Cloudflare R2
    const uploadResult = await uploadImageBuffer(fileBuffer, {
      folder: 'pot_nota_penerimaan',
      public_id: publicId,
    });

    const secureUrl = uploadResult.secure_url || uploadResult.url;

    // 4. Update repository with rollback if database write fails
    try {
      await penerimaanRepository.update(id, { nota_url: secureUrl });
    } catch (dbErr) {
      if (uploadResult && uploadResult.public_id) {
        await deleteR2Asset(uploadResult.public_id, 'image');
      }
      throw dbErr;
    }

    return await this.getPenerimaanById(id);
  }

  /**
   * Delete a receipt record
   * Rolls back inventory stock inflow in stok_lapak and reverts shipment status to dikirim_viar
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deletePenerimaan(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Penerimaan ID is required.');
    }

    const existing = await penerimaanRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Penerimaan with ID '${id}' was not found.`);
    }

    // Rollback stock inflow and reset shipment status if shipment exists
    if (existing.pengiriman_id) {
      const shipment = await pengirimanRepository.findById(existing.pengiriman_id);
      if (shipment) {
        const details = await pengirimanDetailRepository.findByPengirimanId(shipment.id);
        for (const detail of details) {
          if (detail.produk_id && detail.qty > 0) {
            await stokLapakRepository.decrementStokMasuk(shipment.lapak_id, detail.produk_id, detail.qty);
          }
        }
        await pengirimanRepository.updateStatus(shipment.id, PENGIRIMAN_STATUS.DIKIRIM_VIAR);
      }
    }

    return await penerimaanRepository.delete(id);
  }
}

module.exports = new PenerimaanService();
