const {
  PENGIRIMAN_STATUS,
  VALID_PENGIRIMAN_STATUSES,
} = require('../constants/pengirimanStatus');

/**
 * OOP Pengiriman Entity
 * Encapsulates shipment metadata, status lifecycle, total item and quantity calculations.
 */
class Pengiriman {
  constructor({
    id = null,
    tanggal = null,
    lapak_id,
    created_by,
    status = PENGIRIMAN_STATUS.DRAFT,
    total_items = 0,
    total_qty = 0,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.tanggal = tanggal ? (tanggal instanceof Date ? tanggal : new Date(tanggal)) : null;
    this.lapak_id = lapak_id ? lapak_id.trim() : '';
    this.created_by = created_by ? created_by.trim() : '';
    this.status = status || PENGIRIMAN_STATUS.DRAFT;
    this.total_items = Number(total_items || 0);
    this.total_qty = Number(total_qty || 0);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain Firestore storage object
   */
  toFirestore() {
    const data = {
      tanggal: this.tanggal || new Date(),
      lapak_id: this.lapak_id,
      created_by: this.created_by,
      status: this.status,
      total_items: this.total_items,
      total_qty: this.total_qty,
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
      tanggal: this.tanggal ? (this.tanggal.toISOString ? this.tanggal.toISOString() : this.tanggal) : null,
      lapak_id: this.lapak_id,
      created_by: this.created_by,
      status: this.status,
      total_items: this.total_items,
      total_qty: this.total_qty,
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
    return new Pengiriman({
      id: doc.id,
      tanggal: data.tanggal ? (data.tanggal.toDate ? data.tanggal.toDate() : new Date(data.tanggal)) : null,
      lapak_id: data.lapak_id || '',
      created_by: data.created_by || '',
      status: data.status || PENGIRIMAN_STATUS.DRAFT,
      total_items: data.total_items || 0,
      total_qty: data.total_qty || 0,
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
