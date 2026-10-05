const { ABSENSI_STATUS } = require('../constants/absensiStatus');

/**
 * OOP Absensi Entity
 * Encapsulates staff attendance records, geolocation stamps, photo proofs, and relational objects.
 */
class Absensi {
  constructor({
    id = null,
    user_id,
    lapak_id,
    tanggal,
    jam_masuk = null,
    jam_pulang = null,
    lokasi_masuk = null,
    foto_masuk_url = null,
    status = ABSENSI_STATUS.HADIR,
    keterangan = '',
    user = null,
    lapak = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.user_id = user_id ? user_id.trim() : '';
    this.lapak_id = lapak_id ? lapak_id.trim() : '';
    this.tanggal = tanggal || new Date().toISOString().split('T')[0];
    this.jam_masuk = jam_masuk ? (jam_masuk instanceof Date ? jam_masuk : new Date(jam_masuk)) : new Date();
    this.jam_pulang = jam_pulang ? (jam_pulang instanceof Date ? jam_pulang : new Date(jam_pulang)) : null;
    this.lokasi_masuk = lokasi_masuk || null;
    this.foto_masuk_url = foto_masuk_url ? foto_masuk_url.trim() : null;
    this.status = status || ABSENSI_STATUS.HADIR;
    this.keterangan = keterangan ? keterangan.trim() : '';
    this.user = user || null;
    this.lapak = lapak || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert entity to plain object for Firestore persistence
   */
  toFirestore() {
    const data = {
      user_id: this.user_id,
      lapak_id: this.lapak_id,
      tanggal: this.tanggal,
      jam_masuk: this.jam_masuk,
      jam_pulang: this.jam_pulang,
      lokasi_masuk: this.lokasi_masuk,
      foto_masuk_url: this.foto_masuk_url,
      status: this.status,
      keterangan: this.keterangan,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Format attendance record for client API responses
   * Follows clean response architecture: top-level user_id and lapak_id are omitted in favor of enriched objects.
   */
  toJSON() {
    return {
      id: this.id,
      tanggal: this.tanggal,
      jam_masuk: this.jam_masuk ? (this.jam_masuk.toISOString ? this.jam_masuk.toISOString() : this.jam_masuk) : null,
      jam_pulang: this.jam_pulang ? (this.jam_pulang.toISOString ? this.jam_pulang.toISOString() : this.jam_pulang) : null,
      lokasi_masuk: this.lokasi_masuk,
      foto_masuk_url: this.foto_masuk_url,
      status: this.status,
      keterangan: this.keterangan,
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
      lapak: this.lapak ? (this.lapak.toJSON ? this.lapak.toJSON() : this.lapak) : null,
      createdAt: this.createdAt ? (this.createdAt.toISOString ? this.createdAt.toISOString() : this.createdAt) : null,
      updatedAt: this.updatedAt ? (this.updatedAt.toISOString ? this.updatedAt.toISOString() : this.updatedAt) : null,
    };
  }

  /**
   * Factory method to reconstruct Absensi entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc, user = null, lapak = null) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Absensi({
      id: doc.id,
      user_id: data.user_id || '',
      lapak_id: data.lapak_id || '',
      tanggal: data.tanggal || '',
      jam_masuk: data.jam_masuk ? (data.jam_masuk.toDate ? data.jam_masuk.toDate() : new Date(data.jam_masuk)) : null,
      jam_pulang: data.jam_pulang ? (data.jam_pulang.toDate ? data.jam_pulang.toDate() : new Date(data.jam_pulang)) : null,
      lokasi_masuk: data.lokasi_masuk || null,
      foto_masuk_url: data.foto_masuk_url || null,
      status: data.status || ABSENSI_STATUS.HADIR,
      keterangan: data.keterangan || '',
      user: user,
      lapak: lapak,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Absensi;
