/**
 * OOP PengirimanDetail Entity
 * Encapsulates shipment item details, captured product snapshots, quantity, and unit.
 * Note: per architectural requirements, stores jenis_satuan (no satuan_id needed).
 * The field `qty` strictly represents the line-item dispatched quantity.
 */
class PengirimanDetail {
  constructor({
    id = null,
    pengiriman_id,
    pengiriman_unique_id = null,
    produk_id,
    qty,
    nama_produk = null,
    harga_produk = 0,
    jenis_satuan = null,
    kategori_id = null,
    nama_kategori = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.pengiriman_id = pengiriman_id ? pengiriman_id.trim() : '';
    this.pengiriman_unique_id = pengiriman_unique_id ? pengiriman_unique_id.trim() : null;
    this.produk_id = produk_id ? produk_id.trim() : '';
    this.qty = typeof qty === 'number' ? qty : Number(qty || 0);
    this.nama_produk = nama_produk ? nama_produk.trim() : '';
    this.harga_produk = typeof harga_produk === 'number' ? harga_produk : Number(harga_produk || 0);
    this.jenis_satuan = jenis_satuan ? jenis_satuan.trim() : '';
    this.kategori_id = kategori_id ? kategori_id.trim() : null;
    this.nama_kategori = nama_kategori ? nama_kategori.trim() : null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain Firestore storage object
   */
  toFirestore() {
    const data = {
      pengiriman_id: this.pengiriman_id,
      pengiriman_unique_id: this.pengiriman_unique_id,
      produk_id: this.produk_id,
      qty: this.qty,
      nama_produk: this.nama_produk,
      harga_produk: this.harga_produk,
      jenis_satuan: this.jenis_satuan,
      kategori_id: this.kategori_id,
      nama_kategori: this.nama_kategori,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Convert entity to client API response object
   * Excludes kategori_id directly per architectural response requirements
   */
  toJSON({ includePengirimanId = true } = {}) {
    const data = {
      id: this.id,
      produk_id: this.produk_id,
      qty: this.qty,
      nama_produk: this.nama_produk,
      harga_produk: this.harga_produk,
      jenis_satuan: this.jenis_satuan,
      nama_kategori: this.nama_kategori,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };

    if (includePengirimanId) {
      data.pengiriman_id = this.pengiriman_id;
      if (this.pengiriman_unique_id) {
        data.pengiriman_unique_id = this.pengiriman_unique_id;
      }
    }

    return data;
  }

  /**
   * Factory method to reconstruct PengirimanDetail entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new PengirimanDetail({
      id: doc.id,
      pengiriman_id: data.pengiriman_id || '',
      pengiriman_unique_id: data.pengiriman_unique_id || null,
      produk_id: data.produk_id || '',
      qty: data.qty !== undefined ? data.qty : (data.qty_kirim || 0),
      nama_produk: data.nama_produk || '',
      harga_produk: data.harga_produk || 0,
      jenis_satuan: data.jenis_satuan || '',
      kategori_id: data.kategori_id || null,
      nama_kategori: data.nama_kategori || null,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = PengirimanDetail;
