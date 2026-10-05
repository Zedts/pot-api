const { PAYROLL_STATUS } = require('../constants/payrollStatus');

/**
 * OOP Payroll Entity
 * Encapsulates monthly employee salary computation, breakdown components,
 * and relational user enrichment.
 */
class Payroll {
  constructor({
    id = null,
    user_id,
    periode,
    hari_kerja = 0,
    total_penjualan = 0,
    gaji_pokok = 0,
    bonus_penjualan = 0,
    lembur = 0,
    potongan = 0,
    kasbon = 0,
    total_gaji = null,
    status = PAYROLL_STATUS.DRAFT,
    user = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.user_id = user_id ? user_id.trim() : '';
    this.periode = periode ? periode.trim() : '';
    this.hari_kerja = Number(hari_kerja || 0);
    this.total_penjualan = Number(total_penjualan || 0);
    this.gaji_pokok = Number(gaji_pokok || 0);
    this.bonus_penjualan = Number(bonus_penjualan || 0);
    this.lembur = Number(lembur || 0);
    this.potongan = Number(potongan || 0);
    this.kasbon = Number(kasbon || 0);

    // Calculated net salary: (gaji_pokok + bonus_penjualan + lembur) - (potongan + kasbon)
    this.total_gaji = total_gaji !== null && total_gaji !== undefined
      ? Number(total_gaji)
      : (this.gaji_pokok + this.bonus_penjualan + this.lembur) - (this.potongan + this.kasbon);

    this.status = status || PAYROLL_STATUS.DRAFT;
    this.user = user || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain object for Firestore persistence
   */
  toFirestore() {
    const data = {
      user_id: this.user_id,
      periode: this.periode,
      hari_kerja: this.hari_kerja,
      total_penjualan: this.total_penjualan,
      gaji_pokok: this.gaji_pokok,
      bonus_penjualan: this.bonus_penjualan,
      lembur: this.lembur,
      potongan: this.potongan,
      kasbon: this.kasbon,
      total_gaji: this.total_gaji,
      status: this.status,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Format entity for client API responses
   * Follows clean response architecture: top-level user_id is omitted in favor of enriched user object.
   */
  toJSON() {
    return {
      id: this.id,
      periode: this.periode,
      hari_kerja: this.hari_kerja,
      total_penjualan: this.total_penjualan,
      gaji_pokok: this.gaji_pokok,
      bonus_penjualan: this.bonus_penjualan,
      lembur: this.lembur,
      potongan: this.potongan,
      kasbon: this.kasbon,
      total_gaji: this.total_gaji,
      status: this.status,
      user: this.user
        ? {
            id: this.user.id || this.user.spg_id || '',
            nama: this.user.nama || '',
            username: this.user.username || '',
            email: this.user.email || '',
            no_hp: this.user.no_hp || '',
            role: this.user.role || '',
            status: this.user.status || '',
          }
        : null,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Payroll entity from Firestore DocumentSnapshot
   */
  static fromFirestore(doc, user = null) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Payroll({
      id: doc.id,
      user_id: data.user_id || '',
      periode: data.periode || '',
      hari_kerja: data.hari_kerja !== undefined ? data.hari_kerja : 0,
      total_penjualan: data.total_penjualan !== undefined ? data.total_penjualan : 0,
      gaji_pokok: data.gaji_pokok !== undefined ? data.gaji_pokok : 0,
      bonus_penjualan: data.bonus_penjualan !== undefined ? data.bonus_penjualan : 0,
      lembur: data.lembur !== undefined ? data.lembur : 0,
      potongan: data.potongan !== undefined ? data.potongan : 0,
      kasbon: data.kasbon !== undefined ? data.kasbon : 0,
      total_gaji: data.total_gaji !== undefined ? data.total_gaji : null,
      status: data.status || PAYROLL_STATUS.DRAFT,
      user: user,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Payroll;
