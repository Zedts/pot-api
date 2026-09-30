/**
 * OOP Satuan Entity
 * Encapsulates Satuan (unit of measurement) domain properties, serialization, and business rules.
 */
class Satuan {
  constructor({
    id = null,
    jenis_satuan,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.jenis_satuan = jenis_satuan ? jenis_satuan.trim() : '';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Converts entity to a clean plain object for Firestore storage
   */
  toFirestore() {
    const data = {
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
   */
  toJSON() {
    return {
      id: this.id,
      jenis_satuan: this.jenis_satuan,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Satuan entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Satuan({
      id: doc.id,
      jenis_satuan: data.jenis_satuan,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Satuan;
