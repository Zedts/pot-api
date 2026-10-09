const { CLOSING_STATUS } = require('../constants/closingStatus');
const { getLocalDateString } = require('../utils/timezone');

/**
 * OOP Closing Entity
 * Encapsulates daily booth financial & inventory reconciliation,
 * discrepancy calculations (selisih_stok & selisih_uang), and relational enrichment.
 */
class Closing {
  constructor({
    id = null,
    spg_id,
    lapak_id,
    tanggal,
    stok_sistem = 0,
    stok_fisik = 0,
    total_omset = 0,
    tunai_sistem = 0,
    qris_sistem = 0,
    transfer_sistem = 0,
    uang_tunai_fisik = 0,
    selisih_stok = null,
    selisih_uang = null,
    catatan = '',
    status = CLOSING_STATUS.PENDING,
    validated_by = null,
    spg = null,
    lapak = null,
    validator = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.spg_id = spg_id ? spg_id.trim() : '';
    this.lapak_id = lapak_id ? lapak_id.trim() : '';
    // Always format to year, month, and day (YYYY-MM-DD)
    this.tanggal = tanggal || getLocalDateString(new Date());
    this.stok_sistem = Number(stok_sistem || 0);
    this.stok_fisik = Number(stok_fisik || 0);
    this.total_omset = Number(total_omset || 0);
    this.tunai_sistem = Number(tunai_sistem || 0);
    this.qris_sistem = Number(qris_sistem || 0);
    this.transfer_sistem = Number(transfer_sistem || 0);
    this.uang_tunai_fisik = Number(uang_tunai_fisik || 0);

    // Calculated discrepancies
    this.selisih_stok = selisih_stok !== null && selisih_stok !== undefined
      ? Number(selisih_stok)
      : (this.stok_fisik - this.stok_sistem);

    this.selisih_uang = selisih_uang !== null && selisih_uang !== undefined
      ? Number(selisih_uang)
      : (this.uang_tunai_fisik - this.total_omset);

    this.catatan = catatan ? catatan.trim() : '';
    this.status = status || CLOSING_STATUS.PENDING;
    this.validated_by = validated_by ? validated_by.trim() : null;

    // Populated relational entities
    this.spg = spg || null;
    this.lapak = lapak || null;
    this.validator = validator || null;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain object for Firestore storage
   */
  toFirestore() {
    const data = {
      spg_id: this.spg_id,
      lapak_id: this.lapak_id,
      tanggal: this.tanggal,
      stok_sistem: this.stok_sistem,
      stok_fisik: this.stok_fisik,
      total_omset: this.total_omset,
      tunai_sistem: this.tunai_sistem,
      qris_sistem: this.qris_sistem,
      transfer_sistem: this.transfer_sistem,
      uang_tunai_fisik: this.uang_tunai_fisik,
      selisih_stok: this.selisih_stok,
      selisih_uang: this.selisih_uang,
      catatan: this.catatan,
      status: this.status,
      validated_by: this.validated_by,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Format entity for client API response
   * Follows clean response architecture: top-level spg_id, lapak_id, and validated_by are omitted
   * in favor of enriched objects.
   */
  toJSON() {
    return {
      id: this.id,
      tanggal: this.tanggal,
      stok_sistem: this.stok_sistem,
      stok_fisik: this.stok_fisik,
      total_omset: this.total_omset,
      tunai_sistem: this.tunai_sistem,
      qris_sistem: this.qris_sistem,
      transfer_sistem: this.transfer_sistem,
      uang_tunai_fisik: this.uang_tunai_fisik,
      selisih_stok: this.selisih_stok,
      selisih_uang: this.selisih_uang,
      catatan: this.catatan,
      status: this.status,
      spg: this.spg
        ? {
            id: this.spg.id || this.spg.spg_id || '',
            nama: this.spg.nama || '',
            username: this.spg.username || '',
            email: this.spg.email || '',
            no_hp: this.spg.no_hp || '',
            role: this.spg.role || '',
            status: this.spg.status || '',
          }
        : null,
      lapak: this.lapak ? (this.lapak.toJSON ? this.lapak.toJSON() : this.lapak) : null,
      validator: this.validator
        ? {
            id: this.validator.id || '',
            nama: this.validator.nama || '',
            username: this.validator.username || '',
            email: this.validator.email || '',
            role: this.validator.role || '',
          }
        : null,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Closing entity from Firestore DocumentSnapshot
   */
  static fromFirestore(doc, spg = null, lapak = null, validator = null) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Closing({
      id: doc.id,
      spg_id: data.spg_id || '',
      lapak_id: data.lapak_id || '',
      tanggal: data.tanggal || '',
      stok_sistem: data.stok_sistem !== undefined ? data.stok_sistem : 0,
      stok_fisik: data.stok_fisik !== undefined ? data.stok_fisik : 0,
      total_omset: data.total_omset !== undefined ? data.total_omset : 0,
      tunai_sistem: data.tunai_sistem !== undefined ? data.tunai_sistem : 0,
      qris_sistem: data.qris_sistem !== undefined ? data.qris_sistem : 0,
      transfer_sistem: data.transfer_sistem !== undefined ? data.transfer_sistem : 0,
      uang_tunai_fisik: data.uang_tunai_fisik !== undefined ? data.uang_tunai_fisik : 0,
      selisih_stok: data.selisih_stok !== undefined ? data.selisih_stok : null,
      selisih_uang: data.selisih_uang !== undefined ? data.selisih_uang : null,
      catatan: data.catatan || '',
      status: data.status || CLOSING_STATUS.PENDING,
      validated_by: data.validated_by || null,
      spg: spg,
      lapak: lapak,
      validator: validator,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Closing;
