const {
  PENGIRIMAN_STATUS,
  VALID_PENGIRIMAN_STATUSES,
} = require('../constants/pengirimanStatus');

/**
 * OOP Pengiriman Entity
 * Encapsulates shipment metadata, unique_id (#PG-YYYYMMDD-COUNTER), status lifecycle,
 * total items count, and total dispatched quantity (qty_kirim).
 */
class Pengiriman {
  constructor({
    id = null,
    unique_id = null,
    counters_id = null,
    tanggal = null,
    lapak_id,
    created_by,
    status = PENGIRIMAN_STATUS.DRAFT,
    total_items = 0,
    qty_kirim = 0,
    total_qty = 0,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.unique_id = unique_id ? unique_id.trim() : null;

    this.tanggal = tanggal ? (tanggal instanceof Date ? tanggal : new Date(tanggal)) : null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    // Resolve counters_id: explicit, or derived from unique_id (#PG-YYYYMMDD-COUNTER -> pengiriman_YYYYMMDD), or from tanggal/createdAt
    let resolvedCountersId = counters_id || null;
    if (!resolvedCountersId && this.unique_id && /^#PG-(\d{8})-/.test(this.unique_id)) {
      const match = this.unique_id.match(/^#PG-(\d{8})-/);
      if (match) resolvedCountersId = `pengiriman_${match[1]}`;
    }
    if (!resolvedCountersId && (this.tanggal || this.createdAt)) {
      const d = this.tanggal || this.createdAt;
      const dateObj = d instanceof Date ? d : new Date(d);
      if (!isNaN(dateObj.getTime())) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        resolvedCountersId = `pengiriman_${yyyy}${mm}${dd}`;
      }
    }
    this.counters_id = resolvedCountersId ? resolvedCountersId.trim() : null;
    this.lapak_id = lapak_id ? lapak_id.trim() : '';
    this.created_by = created_by ? created_by.trim() : '';
    this.status = status || PENGIRIMAN_STATUS.DRAFT;
    this.total_items = Number(total_items || 0);
    this.qty_kirim = Number(qty_kirim !== undefined && qty_kirim !== null ? qty_kirim : (total_qty || 0));
    this.total_qty = this.qty_kirim; // Backwards-compatible alias
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain Firestore storage object
   */
  toFirestore() {
    const data = {
      unique_id: this.unique_id,
      counters_id: this.counters_id,
      tanggal: this.tanggal || new Date(),
      lapak_id: this.lapak_id,
      created_by: this.created_by,
      status: this.status,
      total_items: this.total_items,
      qty_kirim: this.qty_kirim,
      total_qty: this.qty_kirim,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Convert entity to client API response object
   */
  toJSON() {
    return {
      id: this.id,
      unique_id: this.unique_id,
      counters_id: this.counters_id,
      tanggal: this.tanggal ? (this.tanggal.toISOString ? this.tanggal.toISOString() : this.tanggal) : null,
      lapak_id: this.lapak_id,
      created_by: this.created_by,
      status: this.status,
      total_items: this.total_items,
      qty_kirim: this.qty_kirim,
      total_qty: this.qty_kirim,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Pengiriman entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    const qtyKirimVal = data.qty_kirim !== undefined ? data.qty_kirim : (data.total_qty || 0);

    return new Pengiriman({
      id: doc.id,
      unique_id: data.unique_id || null,
      counters_id: data.counters_id || data.counter_id || null,
      tanggal: data.tanggal ? (data.tanggal.toDate ? data.tanggal.toDate() : new Date(data.tanggal)) : null,
      lapak_id: data.lapak_id || '',
      created_by: data.created_by || '',
      status: data.status || PENGIRIMAN_STATUS.DRAFT,
      total_items: data.total_items || 0,
      qty_kirim: qtyKirimVal,
      total_qty: qtyKirimVal,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = {
  Pengiriman,
  PENGIRIMAN_STATUS,
  VALID_PENGIRIMAN_STATUSES,
};
