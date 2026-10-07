const closingRepository = require('../repositories/closing.repository');
const lapakService = require('./lapak.service');
const lapakRepository = require('../repositories/lapak.repository');
const userRepository = require('../repositories/user.repository');
const { ROLES } = require('../constants/roles');
const { getLocalDateString } = require('../utils/timezone');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * Closing Service
 * Encapsulates daily booth financial & inventory reconciliation,
 * automated discrepancy calculations, verification workflows, and relational enrichment.
 */
class ClosingService {
  /**
   * Create a new daily closing record
   * @param {Object} data
   * @param {Object} currentUser Authenticated user
   * @returns {Promise<Object>} Enriched closing record
   */
  async createClosing(data, currentUser) {
    const targetLapakId = data.lapak_id || (currentUser ? currentUser.lapak_id : null);
    if (!targetLapakId) {
      throw new BadRequestError('Field "lapak_id" is required.');
    }

    // 1. Verify lapak existence
    const lapak = await lapakService.getLapakById(targetLapakId);
    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${targetLapakId}' was not found.`);
    }

    // 2. Determine SPG user ID
    const spgId = (currentUser && currentUser.role === ROLES.SPG)
      ? currentUser.id
      : (data.spg_id ? data.spg_id.trim() : (currentUser ? currentUser.id : lapak.spg_id));

    if (!spgId) {
      throw new BadRequestError('Field "spg_id" is required.');
    }

    // 3. Resolve date: strictly current date formatted to YYYY-MM-DD in Asia/Jakarta local time
    const tanggal = getLocalDateString(new Date());

    // 4. Calculate discrepancies automatically
    const stokSistem = Number(data.stok_sistem || 0);
    const stokFisik = Number(data.stok_fisik || 0);
    const tunaiSistem = Number(data.tunai_sistem || 0);
    const uangTunaiFisik = Number(data.uang_tunai_fisik || 0);

    const selisihStok = stokFisik - stokSistem;
    const selisihUang = uangTunaiFisik - tunaiSistem;

    // 5. Persist closing document
    const created = await closingRepository.create({
      spg_id: spgId,
      lapak_id: targetLapakId,
      tanggal,
      stok_sistem: stokSistem,
      stok_fisik: stokFisik,
      total_omset: Number(data.total_omset || 0),
      tunai_sistem: tunaiSistem,
      qris_sistem: Number(data.qris_sistem || 0),
      transfer_sistem: Number(data.transfer_sistem || 0),
      uang_tunai_fisik: uangTunaiFisik,
      selisih_stok: selisihStok,
      selisih_uang: selisihUang,
      catatan: data.catatan ? data.catatan.trim() : '',
      status: data.status,
      validated_by: null,
    });

    return await this.getClosingById(created.id);
  }

  /**
   * Retrieve all closing records with optional filtering and relational enrichment
   * @param {Object} filters { lapak_id, spg_id, tanggal, status }
   * @returns {Promise<Array<Object>>}
   */
  async getAllClosing(filters = {}) {
    const list = await closingRepository.findAll(filters);
    if (!list || list.length === 0) return [];

    const uniqueLapakIds = [...new Set(list.map((c) => c.lapak_id).filter(Boolean))];
    const uniqueUserIds = [
      ...new Set([
        ...list.map((c) => c.spg_id).filter(Boolean),
        ...list.map((c) => c.validated_by).filter(Boolean),
      ]),
    ];

    const [lapakMap, usersMap] = await Promise.all([
      lapakRepository.findByIds(uniqueLapakIds),
      userRepository.findByIds(uniqueUserIds),
    ]);

    await lapakService.enrichLapakList(Array.from(lapakMap.values()));

    return list.map((c) => {
      c.lapak = lapakMap.get(c.lapak_id) || null;
      c.spg = usersMap.get(c.spg_id) || null;
      c.validator = c.validated_by ? usersMap.get(c.validated_by) || null : null;
      return c.toJSON();
    });
  }

  /**
   * Retrieve single closing record by ID with populated relations
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getClosingById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Closing ID is required.');
    }

    const closing = await closingRepository.findById(id);
    if (!closing) {
      throw new NotFoundError(`Closing record with ID '${id}' was not found.`);
    }

    const [lapak, spgUser, validatorUser] = await Promise.all([
      closing.lapak_id ? lapakService.getLapakById(closing.lapak_id) : null,
      closing.spg_id ? userRepository.findById(closing.spg_id) : null,
      closing.validated_by ? userRepository.findById(closing.validated_by) : null,
    ]);

    closing.lapak = lapak;
    closing.spg = spgUser;
    closing.validator = validatorUser;

    return closing.toJSON();
  }

  /**
   * Update closing record details and recompute discrepancies if relevant fields change
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateClosing(id, updateData) {
    const existing = await closingRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Closing record with ID '${id}' was not found.`);
    }

    const payload = {};

    if (updateData.stok_sistem !== undefined) payload.stok_sistem = Number(updateData.stok_sistem);
    if (updateData.stok_fisik !== undefined) payload.stok_fisik = Number(updateData.stok_fisik);
    if (updateData.total_omset !== undefined) payload.total_omset = Number(updateData.total_omset);
    if (updateData.tunai_sistem !== undefined) payload.tunai_sistem = Number(updateData.tunai_sistem);
    if (updateData.qris_sistem !== undefined) payload.qris_sistem = Number(updateData.qris_sistem);
    if (updateData.transfer_sistem !== undefined) payload.transfer_sistem = Number(updateData.transfer_sistem);
    if (updateData.uang_tunai_fisik !== undefined) payload.uang_tunai_fisik = Number(updateData.uang_tunai_fisik);
    if (updateData.catatan !== undefined) payload.catatan = typeof updateData.catatan === 'string' ? updateData.catatan.trim() : '';

    // Recompute selisih_stok if either stock value changed
    const currentStokSistem = payload.stok_sistem !== undefined ? payload.stok_sistem : existing.stok_sistem;
    const currentStokFisik = payload.stok_fisik !== undefined ? payload.stok_fisik : existing.stok_fisik;
    payload.selisih_stok = currentStokFisik - currentStokSistem;

    // Recompute selisih_uang if either cash value changed
    const currentTunaiSistem = payload.tunai_sistem !== undefined ? payload.tunai_sistem : existing.tunai_sistem;
    const currentUangTunaiFisik = payload.uang_tunai_fisik !== undefined ? payload.uang_tunai_fisik : existing.uang_tunai_fisik;
    payload.selisih_uang = currentUangTunaiFisik - currentTunaiSistem;

    if (Object.keys(payload).length === 0) {
      return await this.getClosingById(id);
    }

    await closingRepository.update(id, payload);
    return await this.getClosingById(id);
  }

  /**
   * Update closing status (Verification by Admin/Owner)
   * @param {string} id
   * @param {string} newStatus 'terverifikasi' or 'perlu_revisi'
   * @param {Object} currentUser Admin caller
   * @returns {Promise<Object>}
   */
  async updateStatus(id, newStatus, currentUser) {
    const existing = await closingRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Closing record with ID '${id}' was not found.`);
    }

    const validatorId = currentUser ? currentUser.id : null;

    await closingRepository.update(id, {
      status: newStatus,
      validated_by: validatorId,
    });

    return await this.getClosingById(id);
  }

  /**
   * Delete closing record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteClosing(id) {
    const existing = await closingRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Closing record with ID '${id}' was not found.`);
    }

    await closingRepository.delete(id);
    return true;
  }
}

module.exports = new ClosingService();
