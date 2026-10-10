const { PENERIMAAN_STATUS, VALID_PENERIMAAN_STATUSES } = require('../constants/penerimaanStatus');
const { normalizeStorageUrl } = require('../utils/r2');

/**
 * OOP Penerimaan Entity
 * Represents receipt of shipments at stalls:
 * id, pengiriman_id (references pengiriman doc ID), unique_id (#PG-YYYYMMDD-COUNTER),
 * spg_id, tanggal, qty_terima, nota_url, catatan, status ('sesuai' | 'selisih')
 */
class Penerimaan {
  constructor({
    id = null,
    pengiriman_id,
    unique_id = null,
    counters_id = null,
    lapak_id = null,
    spg_id,
    tanggal = null,
    qty_terima = 0,
    nota_url = null,
    catatan = '',
    status = PENERIMAAN_STATUS.SESUAI,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.pengiriman_id = pengiriman_id ? pengiriman_id.trim() : '';
    this.unique_id = unique_id ? unique_id.trim() : null;
    this.lapak_id = lapak_id ? lapak_id.trim() : null;

    this.tanggal = tanggal ? (tanggal instanceof Date ? tanggal : new Date(tanggal)) : null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    // Resolve counters_id: explicit or derived from unique_id (#PG-YYYYMMDD-COUNTER -> pengiriman_YYYYMMDD), or from tanggal/createdAt
    let resolvedCountersId = counters_id || null;
    if (!resolvedCountersId && this.unique_id && /^#PG-(\d{8})-/.test(this.unique_id)) {
      const match = this.unique_id.match(/^#PG-(\d{8})-/);
      if (match) resolvedCountersId = `pengiriman_${match[1]}`;
    }
    if (!resolvedCountersId && (this.tanggal || this.createdAt)) {
      const d = this.tanggal || (this.createdAt instanceof Date ? this.createdAt : new Date(this.createdAt));
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        resolvedCountersId = `pengiriman_${yyyy}${mm}${dd}`;
      }
    }
    this.counters_id = resolvedCountersId ? resolvedCountersId.trim() : null;

    this.spg_id = spg_id ? spg_id.trim() : '';
    this.qty_terima = Number(qty_terima || 0);
    this.nota_url = nota_url ? nota_url.trim() : null;
    this.catatan = catatan ? catatan.trim() : '';
    this.status = status || PENERIMAAN_STATUS.SESUAI;
  }

  /**
   * Convert entity to plain Firestore storage object
   */
  toFirestore() {
    const data = {
      pengiriman_id: this.pengiriman_id,
      unique_id: this.unique_id,
      counters_id: this.counters_id,
      lapak_id: this.lapak_id,
      spg_id: this.spg_id,
      tanggal: this.tanggal || new Date(),
      qty_terima: this.qty_terima,
      nota_url: this.nota_url,
      catatan: this.catatan,
      status: this.status,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Convert entity to client API response object (removes redundant spg_id, returns only counters_id)
   */
  toJSON() {
    return {
      id: this.id,
      pengiriman_id: this.pengiriman_id,
      unique_id: this.unique_id,
      counters_id: this.counters_id,
      lapak_id: this.lapak_id,
      tanggal: this.tanggal ? (this.tanggal.toISOString ? this.tanggal.toISOString() : this.tanggal) : null,
      qty_terima: this.qty_terima,
      nota_url: normalizeStorageUrl(this.nota_url),
      catatan: this.catatan,
      status: this.status,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Penerimaan entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Penerimaan({
      id: doc.id,
      pengiriman_id: data.pengiriman_id || '',
      unique_id: data.unique_id || (typeof data.pengiriman_id === 'string' && data.pengiriman_id.startsWith('#PG-') ? data.pengiriman_id : null),
      counters_id: data.counters_id || data.counter_id || null,
      lapak_id: data.lapak_id || null,
      spg_id: data.spg_id || '',
      tanggal: data.tanggal ? (data.tanggal.toDate ? data.tanggal.toDate() : new Date(data.tanggal)) : null,
      qty_terima: Number(data.qty_terima || 0),
      nota_url: data.nota_url || null,
      catatan: data.catatan || '',
      status: data.status || PENERIMAAN_STATUS.SESUAI,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = {
  Penerimaan,
  PENERIMAAN_STATUS,
  VALID_PENERIMAAN_STATUSES,
};
