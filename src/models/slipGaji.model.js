const { getLocalDateString } = require('../utils/timezone');

/**
 * OOP Slip Gaji Entity
 * Represents the salary slip document record linked to a monthly payroll record.
 * Contains Cloudflare R2 file URL, issue date, and relational payroll enrichment.
 */
class SlipGaji {
  constructor({
    id = null,
    payroll_id,
    file_url = null,
    tanggal = null,
    payroll = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.payroll_id = payroll_id ? payroll_id.trim() : '';
    this.file_url = file_url ? file_url.trim() : null;
    // Tanggal is optional, only populated if file_url is also provided
    this.tanggal = tanggal || (this.file_url ? getLocalDateString(new Date()) : null);
    this.payroll = payroll || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain object for Firestore persistence
   */
  toFirestore() {
    const data = {
      payroll_id: this.payroll_id,
      file_url: this.file_url,
      tanggal: this.tanggal,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Format entity for client API response
   * Follows clean response architecture: top-level payroll_id is omitted in favor of enriched payroll object.
   */
  toJSON() {
    return {
      id: this.id,
      file_url: this.file_url,
      tanggal: this.tanggal,
      payroll: this.payroll ? (this.payroll.toJSON ? this.payroll.toJSON() : this.payroll) : null,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct SlipGaji entity from Firestore DocumentSnapshot
   */
  static fromFirestore(doc, payroll = null) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new SlipGaji({
      id: doc.id,
      payroll_id: data.payroll_id || '',
      file_url: data.file_url || null,
      tanggal: data.tanggal || null,
      payroll: payroll,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = SlipGaji;
