/**
 * OOP PenjualanDetail Entity
 * Encapsulates sale line item properties, product snapshots, quantity, unit price, and subtotal.
 */
class PenjualanDetail {
  constructor({
    id = null,
    penjualan_id,
    produk_id,
    nama_produk = '',
    qty = 1,
    harga_satuan = 0,
    subtotal = 0,
    produk = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.penjualan_id = penjualan_id ? penjualan_id.trim() : '';
    this.produk_id = produk_id ? produk_id.trim() : '';
    this.nama_produk = nama_produk ? nama_produk.trim() : '';
    this.qty = typeof qty === 'number' ? qty : Number(qty || 0);
    this.harga_satuan = typeof harga_satuan === 'number' ? harga_satuan : Number(harga_satuan || 0);
    this.subtotal = typeof subtotal === 'number' ? subtotal : (this.qty * this.harga_satuan);
    this.produk = produk || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain object for Firestore persistence
   */
  toFirestore() {
    const data = {
      penjualan_id: this.penjualan_id,
      produk_id: this.produk_id,
      nama_produk: this.nama_produk,
      qty: this.qty,
      harga_satuan: this.harga_satuan,
      subtotal: this.subtotal,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Format line item for client API responses
   * Follows the clean response pattern: if enriched produk object is present, duplicate produk_id is omitted.
   */
  toJSON({ includePenjualanId = true, includeProdukId = false } = {}) {
    const data = {
      id: this.id,
    };

    if (includePenjualanId) {
      data.penjualan_id = this.penjualan_id;
    }

    if (this.produk) {
      data.produk = this.produk.toJSON ? this.produk.toJSON() : this.produk;
      if (includeProdukId) {
        data.produk_id = this.produk_id;
      }
    } else {
      data.produk_id = this.produk_id;
    }

    data.nama_produk = this.nama_produk;
    data.qty = this.qty;
    data.harga_satuan = this.harga_satuan;
    data.subtotal = this.subtotal;
    data.createdAt = this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null;
    data.updatedAt = this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null;

    return data;
  }

  /**
   * Factory method to reconstruct PenjualanDetail entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc, produk = null) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new PenjualanDetail({
      id: doc.id,
      penjualan_id: data.penjualan_id || '',
      produk_id: data.produk_id || '',
      nama_produk: data.nama_produk || '',
      qty: data.qty !== undefined ? data.qty : 0,
      harga_satuan: data.harga_satuan !== undefined ? data.harga_satuan : 0,
      subtotal: data.subtotal !== undefined ? data.subtotal : 0,
      produk: produk,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = PenjualanDetail;
