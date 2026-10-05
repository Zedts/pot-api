const { METODE_PEMBAYARAN } = require('../constants/metodePembayaran');

/**
 * OOP Penjualan Entity
 * Encapsulates sales transaction properties, header metrics, relational objects, and serialization.
 */
class Penjualan {
  constructor({
    id = null,
    spg_id,
    lapak_id,
    tanggal = null,
    total_harga = 0,
    metode_pembayaran = METODE_PEMBAYARAN.TUNAI,
    bukti_qris_url = null,
    catatan = '',
    spg = null,
    lapak = null,
    items = [],
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.spg_id = spg_id ? spg_id.trim() : '';
    this.lapak_id = lapak_id ? lapak_id.trim() : '';
    this.tanggal = tanggal ? (tanggal instanceof Date ? tanggal : new Date(tanggal)) : new Date();
    this.total_harga = typeof total_harga === 'number' ? total_harga : Number(total_harga || 0);
    this.metode_pembayaran = metode_pembayaran || METODE_PEMBAYARAN.TUNAI;
    this.bukti_qris_url = bukti_qris_url ? bukti_qris_url.trim() : null;
    this.catatan = catatan ? catatan.trim() : '';
    this.spg = spg || null;
    this.lapak = lapak || null;
    this.items = Array.isArray(items) ? items : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain object for Firestore persistence
   */
  toFirestore() {
    const data = {
      spg_id: this.spg_id,
      lapak_id: this.lapak_id,
      tanggal: this.tanggal,
      total_harga: this.total_harga,
      metode_pembayaran: this.metode_pembayaran,
      bukti_qris_url: this.bukti_qris_url,
      catatan: this.catatan,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Format sales transaction for client API responses
   * Follows clean response architecture: top-level lapak_id and spg_id are omitted in favor of enriched objects.
   */
  toJSON() {
    return {
      id: this.id,
      tanggal: this.tanggal ? (this.tanggal.toISOString ? this.tanggal.toISOString() : this.tanggal) : null,
      total_harga: this.total_harga,
      metode_pembayaran: this.metode_pembayaran,
      bukti_qris_url: this.bukti_qris_url,
      catatan: this.catatan,
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
      items: this.items.map((item) => (item.toJSON ? item.toJSON({ includePenjualanId: false }) : item)),
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Penjualan entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc, spg = null, lapak = null, items = []) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Penjualan({
      id: doc.id,
      spg_id: data.spg_id || '',
      lapak_id: data.lapak_id || '',
      tanggal: data.tanggal ? (data.tanggal.toDate ? data.tanggal.toDate() : new Date(data.tanggal)) : null,
      total_harga: data.total_harga !== undefined ? data.total_harga : 0,
      metode_pembayaran: data.metode_pembayaran || METODE_PEMBAYARAN.TUNAI,
      bukti_qris_url: data.bukti_qris_url || null,
      catatan: data.catatan || '',
      spg: spg,
      lapak: lapak,
      items: items,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Penjualan;
