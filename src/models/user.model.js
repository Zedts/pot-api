const { ROLES } = require('../constants/roles');
const { USER_STATUS } = require('../constants/userStatus');

/**
 * OOP User Entity
 * Encapsulates User domain properties, serialization, and business rules.
 */
class User {
  constructor({
    id = null,
    nama,
    email = '',
    role = ROLES.UNASSIGNED,
    no_hp = '',
    password = null,
    status = USER_STATUS.ACTIVE,
    authProvider = 'password',
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.nama = nama ? nama.trim() : '';
    this.email = email ? email.toLowerCase().trim() : '';
    this.role = role || ROLES.UNASSIGNED;
    this.no_hp = no_hp ? no_hp.trim() : '';
    this.password = password;
    this.status = status;
    this.authProvider = authProvider;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Check if user account is currently active
   */
  isActive() {
    return this.status === USER_STATUS.ACTIVE;
  }

  /**
   * Check if user has administrator or owner privileges
   */
  isAdmin() {
    return this.role === ROLES.ADMIN || this.role === ROLES.OWNER;
  }

  /**
   * Check if user has owner role
   */
  isOwner() {
    return this.role === ROLES.OWNER;
  }

  /**
   * Check if user has produksi role
   */
  isProduksi() {
    return this.role === ROLES.PRODUKSI;
  }

  /**
   * Check if user has viar role
   */
  isViar() {
    return this.role === ROLES.VIAR;
  }

  /**
   * Check if user has spg role
   */
  isSpg() {
    return this.role === ROLES.SPG;
  }

  /**
   * Check if user has unassigned role
   */
  isUnassigned() {
    return this.role === ROLES.UNASSIGNED;
  }

  /**
   * Converts entity to a clean plain object for Firestore storage
   */
  toFirestore() {
    const data = {
      nama: this.nama,
      email: this.email,
      role: this.role,
      no_hp: this.no_hp,
      password: this.password,
      status: this.status,
      authProvider: this.authProvider,
      updatedAt: this.updatedAt || new Date(),
    };

    if (this.createdAt) {
      data.createdAt = this.createdAt;
    }

    return data;
  }

  /**
   * Converts entity to a sanitized JSON object (never reveals password)
   */
  toJSON() {
    return {
      id: this.id,
      nama: this.nama,
      email: this.email,
      role: this.role,
      no_hp: this.no_hp,
      status: this.status,
      authProvider: this.authProvider,
      createdAt: this.createdAt ? this.createdAt.toISOString?.() || this.createdAt : null,
      updatedAt: this.updatedAt ? this.updatedAt.toISOString?.() || this.updatedAt : null,
    };
  }

  /**
   * Factory method to reconstruct User entity from a Firestore DocumentSnapshot
   */
  static fromFirestore(doc) {
    if (!doc || !doc.exists) {
      return null;
    }

    const data = doc.data();
    return new User({
      id: doc.id,
      nama: data.nama,
      email: data.email || '',
      role: data.role || ROLES.UNASSIGNED,
      no_hp: data.no_hp || '',
      password: data.password || null,
      status: data.status,
      authProvider: data.authProvider || 'password',
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
    });
  }
}

module.exports = User;
