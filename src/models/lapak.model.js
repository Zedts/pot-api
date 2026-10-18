const { DEFAULT_SHIFT_HOURS, SHIFTS } = require('../constants/shifts');

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
    latitude = null,
    longitude = null,
    radius_meter = 25,
    spg_id = null,
    spg = null,
    users = [],
    shift_pagi = null,
    shift_siang = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.nama = nama ? nama.trim() : '';
    this.lokasi = lokasi ? lokasi.trim() : '';
    this.keterangan = keterangan ? keterangan.trim() : '';
    this.latitude = latitude !== null && latitude !== undefined ? Number(latitude) : null;
    this.longitude = longitude !== null && longitude !== undefined ? Number(longitude) : null;
    this.radius_meter = radius_meter !== null && radius_meter !== undefined ? Math.max(1, Number(radius_meter)) : 25;
    this.spg_id = spg_id || null;
    this.spg = spg ? Lapak.formatSpg(spg) : null;
    this.users = Array.isArray(users) ? users.map((u) => Lapak.formatUser(u)).filter(Boolean) : [];
    this.shift_pagi = Array.isArray(shift_pagi) && shift_pagi.length === 2
      ? shift_pagi
      : [...DEFAULT_SHIFT_HOURS[SHIFTS.PAGI]];
    this.shift_siang = Array.isArray(shift_siang) && shift_siang.length === 2
      ? shift_siang
      : [...DEFAULT_SHIFT_HOURS[SHIFTS.SIANG]];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Format an SPG user object into the standardized response structure:
   * { spg_id, nama, username, email, no_hp, shift, status }
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
      shift: user.shift || null,
      status: user.status || '',
    };
  }

  /**
   * Format an assigned staff/user object for the lapak.users array:
   * { id, nama, username, email, no_hp, role, shift, status }
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
      shift: user.shift || null,
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
      latitude: this.latitude,
      longitude: this.longitude,
      radius_meter: this.radius_meter,
      spg_id: this.spg_id,
      shift_pagi: this.shift_pagi,
      shift_siang: this.shift_siang,
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
      latitude: this.latitude,
      longitude: this.longitude,
      radius_meter: this.radius_meter,
      spg: Array.isArray(this.users) && this.users.length > 0
        ? this.users
        : (Array.isArray(this.spg) ? this.spg : (this.spg ? [Lapak.formatSpg(this.spg)] : [])),
      shift_pagi: this.shift_pagi,
      shift_siang: this.shift_siang,
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
      latitude: data.latitude !== undefined ? data.latitude : null,
      longitude: data.longitude !== undefined ? data.longitude : null,
      radius_meter: data.radius_meter !== undefined && data.radius_meter !== null ? Number(data.radius_meter) : 25,
      spg_id: data.spg_id || null,
      spg: spgUser,
      users: users,
      shift_pagi: data.shift_pagi || null,
      shift_siang: data.shift_siang || null,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = Lapak;
