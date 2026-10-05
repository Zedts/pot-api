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
    spg_id = null,
    spg = null,
    users = [],
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.nama = nama ? nama.trim() : '';
    this.lokasi = lokasi ? lokasi.trim() : '';
    this.keterangan = keterangan ? keterangan.trim() : '';
    this.spg_id = spg_id || null;
    this.spg = spg ? Lapak.formatSpg(spg) : null;
    this.users = Array.isArray(users) ? users.map((u) => Lapak.formatUser(u)).filter(Boolean) : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Format an SPG user object into the standardized response structure:
   * { spg_id, nama, username, email, no_hp, status }
   * @param {Object|null} user
   * @returns {Object|null}
   */
  static formatSpg(user) {
    if (!user) return null;
    return {
      spg_id: user.spg_id || user.id || '',
      nama: user.nama || '',
      username: user.username || '',
      email: user.email || '',
      no_hp: user.no_hp || '',
      status: user.status || '',
    };
  }

  /**
   * Format an assigned staff/user object for the lapak.users array:
   * { id, nama, username, email, no_hp, role, status }
   * @param {Object|null} user
   * @returns {Object|null}
   */
  static formatUser(user) {
    if (!user) return null;
    return {
      id: user.id || user.spg_id || '',
      nama: user.nama || '',
      username: user.username || '',
      email: user.email || '',
      no_hp: user.no_hp || '',
      role: user.role || '',
      status: user.status || '',
    };
  }

  /**
   * Converts entity to a clean plain object for Firestore storage
   */
  toFirestore() {
    const data = {
      nama: this.nama,
      lokasi: this.lokasi,
      keterangan: this.keterangan,
      spg_id: this.spg_id,
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
      spg: this.spg ? Lapak.formatSpg(this.spg) : null,
      users: Array.isArray(this.users) ? this.users : [],
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Lapak entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc, spgUser = null, users = []) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Lapak({
      id: doc.id,
      nama: data.nama,
      lokasi: data.lokasi,
      keterangan: data.keterangan || '',
      spg_id: data.spg_id || null,
      spg: spgUser,
      users: users,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Lapak;
