/**
 * OOP StokLapak Entity
 * Encapsulates stall product stock balance, tracking:
 * stok_awal + stok_masuk - stok_terjual = stok_akhir
 */
class StokLapak {
  constructor({
    id = null,
    lapak_id,
    produk_id,
    stok_awal = 0,
    stok_masuk = 0,
    stok_terjual = 0,
    stok_akhir = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.lapak_id = lapak_id ? lapak_id.trim() : '';
    this.produk_id = produk_id ? produk_id.trim() : '';
    this.stok_awal = Number(stok_awal || 0);
    this.stok_masuk = Number(stok_masuk || 0);
    this.stok_terjual = Number(stok_terjual || 0);
    this.stok_akhir = stok_akhir !== null && stok_akhir !== undefined
      ? Number(stok_akhir)
      : this.calculateStokAkhir();
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Calculate current stock balance based on invariant formula:
   * stok_akhir = stok_awal + stok_masuk - stok_terjual
   * @returns {number}
   */
  calculateStokAkhir() {
    return this.stok_awal + this.stok_masuk - this.stok_terjual;
  }

  /**
   * Convert entity to plain Firestore storage object
   */
  toFirestore() {
    const data = {
      lapak_id: this.lapak_id,
      produk_id: this.produk_id,
      stok_awal: this.stok_awal,
      stok_masuk: this.stok_masuk,
      stok_terjual: this.stok_terjual,
      stok_akhir: this.calculateStokAkhir(),
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Convert entity to client API response object (omits redundant lapak_id and produk_id)
   */
  toJSON() {
    return {
      id: this.id,
      stok_awal: this.stok_awal,
      stok_masuk: this.stok_masuk,
      stok_terjual: this.stok_terjual,
      stok_akhir: this.calculateStokAkhir(),
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct StokLapak entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new StokLapak({
      id: doc.id,
      lapak_id: data.lapak_id || '',
      produk_id: data.produk_id || '',
      stok_awal: data.stok_awal || 0,
      stok_masuk: data.stok_masuk || 0,
      stok_terjual: data.stok_terjual || 0,
      stok_akhir: data.stok_akhir !== undefined ? data.stok_akhir : null,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = StokLapak;
