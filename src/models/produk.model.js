/**
 * OOP Produk Entity
 * Encapsulates Produk (product/item) domain properties, serialization, and business rules.
 */
class Produk {
  constructor({
    id = null,
    nama,
    harga,
    kategori_id,
    nama_kategori = null,
    satuan_id,
    jenis_satuan = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.nama = nama ? nama.trim() : '';
    this.harga = typeof harga === 'number' ? harga : Number(harga || 0);
    this.kategori_id = kategori_id ? kategori_id.trim() : '';
    this.nama_kategori = nama_kategori ? nama_kategori.trim() : null;
    this.satuan_id = satuan_id ? satuan_id.trim() : '';
    this.jenis_satuan = jenis_satuan ? jenis_satuan.trim() : null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Converts entity to a clean plain object for Firestore storage
   * Stores foreign keys (kategori_id, satuan_id) and readable names (nama_kategori, jenis_satuan)
   */
  toFirestore() {
    const data = {
      nama: this.nama,
      harga: this.harga,
      kategori_id: this.kategori_id,
      nama_kategori: this.nama_kategori,
      satuan_id: this.satuan_id,
      jenis_satuan: this.jenis_satuan,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Converts entity to a sanitized JSON object for client API responses
   * Includes both IDs and readable names for category and unit
   */
  toJSON() {
    return {
      id: this.id,
      nama: this.nama,
      harga: this.harga,
      kategori_id: this.kategori_id,
      nama_kategori: this.nama_kategori,
      satuan_id: this.satuan_id,
      jenis_satuan: this.jenis_satuan,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Produk entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Produk({
      id: doc.id,
      nama: data.nama,
      harga: data.harga,
      kategori_id: data.kategori_id || '',
      nama_kategori: data.nama_kategori || null,
      satuan_id: data.satuan_id || '',
      jenis_satuan: data.jenis_satuan || data.satuan || null,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Produk;
