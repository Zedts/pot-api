/**
 * OOP Kategori Entity
 * Encapsulates Kategori (category) domain properties, serialization, and business rules.
 */
class Kategori {
  constructor({
    id = null,
    nama_kategori,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.nama_kategori = nama_kategori ? nama_kategori.trim() : '';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Converts entity to a clean plain object for Firestore storage
   */
  toFirestore() {
    const data = {
      nama_kategori: this.nama_kategori,
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
      nama_kategori: this.nama_kategori,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Kategori entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Kategori({
      id: doc.id,
      nama_kategori: data.nama_kategori,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Kategori;
