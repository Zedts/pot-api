/**
 * OOP Lapak Entity
 * Encapsulates Lapak (stall/booth) domain properties, serialization, and business rules.
 */
class Lapak {
  constructor({
    id = null,
    nama,
    lokasi,
    keterangan = '',
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.nama = nama ? nama.trim() : '';
    this.lokasi = lokasi ? lokasi.trim() : '';
    this.keterangan = keterangan ? keterangan.trim() : '';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Converts entity to a clean plain object for Firestore storage
   */
  toFirestore() {
    const data = {
      nama: this.nama,
      lokasi: this.lokasi,
      keterangan: this.keterangan,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Converts entity to a sanitized JSON object for client API responses
   */
  toJSON() {
    return {
      id: this.id,
      nama: this.nama,
      lokasi: this.lokasi,
      keterangan: this.keterangan,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Lapak entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Lapak({
      id: doc.id,
      nama: data.nama,
      lokasi: data.lokasi,
      keterangan: data.keterangan || '',
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Lapak;
