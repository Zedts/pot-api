const { db } = require('../firebase');
const User = require('../models/user.model');
const { ROLES } = require('../constants/roles');
const { STATUS } = require('../constants/status');

/**
 * User Repository
 * Data Access Layer encapsulating Firestore database operations for 'users'.
 */
class UserRepository {
  constructor() {
    this.collection = db.collection('users');
  }

  /**
   * Create a new user in Firestore
   * @param {Object} userData
   * @param {string|null} customId - Optional custom Doc ID (e.g. Firebase Auth UID)
   * @returns {Promise<User>}
   */
  async create(userData, customId = null) {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date();

    const dataToSave = {
      nama: userData.nama,
      username: userData.username ? userData.username.trim() : '',
      email: userData.email ? userData.email.toLowerCase().trim() : '',
      role: userData.role || ROLES.UNASSIGNED,
      lapak_id: userData.lapak_id || null,
      no_hp: userData.no_hp || '',
      password: userData.password || null,
      status: userData.status || STATUS.ACTIVE,
      authProvider: userData.authProvider || 'password',
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(dataToSave);

    return new User({
      id: docRef.id,
      ...dataToSave,
    });
  }

  /**
   * Find a user by Document ID
   * @param {string} id
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return User.fromFirestore(doc);
  }

  /**
   * Find multiple users by an array of document IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, User>>}
   */
  async findByIds(ids) {
    const map = new Map();
    if (!ids || !Array.isArray(ids) || ids.length === 0) return map;

    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    const chunkSize = 100;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const refs = chunk.map((id) => this.collection.doc(id));
      const snapshots = await db.getAll(...refs);

      snapshots.forEach((doc) => {
        const user = User.fromFirestore(doc);
        if (user) {
          map.set(doc.id, user);
        }
      });
    }

    return map;
  }

  /**
   * Find a user by username
   * @param {string} username
   * @returns {Promise<User|null>}
   */
  async findByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.trim();
    const snapshot = await this.collection.where('username', '==', cleanUsername).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return User.fromFirestore(doc);
  }

  /**
   * Find a user by email
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const snapshot = await this.collection.where('email', '==', cleanEmail).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return User.fromFirestore(doc);
  }

  /**
   * Find a user by mobile phone number (no_hp)
   * @param {string} no_hp
   * @returns {Promise<User|null>}
   */
  async findByPhone(no_hp) {
    if (!no_hp) return null;
    const cleanPhone = no_hp.trim();
    const snapshot = await this.collection.where('no_hp', '==', cleanPhone).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return User.fromFirestore(doc);
  }

  /**
   * Find all users assigned to a specific lapak_id
   * @param {string} lapakId
   * @returns {Promise<Array<User>>}
   */
  async findByLapakId(lapakId) {
    if (!lapakId) return [];
    const snapshot = await this.collection.where('lapak_id', '==', lapakId).get();
    const users = [];
    snapshot.forEach((doc) => {
      const user = User.fromFirestore(doc);
      if (user) users.push(user);
    });
    return users;
  }

  /**
   * Retrieve all users with optional filtering
   * @param {Object} filters { role, status, lapak_id }
   * @returns {Promise<Array<User>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.lapak_id) {
      query = query.where('lapak_id', '==', filters.lapak_id);
    }

    const snapshot = await query.get();
    const users = [];

    snapshot.forEach((doc) => {
      const user = User.fromFirestore(doc);
      if (user) {
        users.push(user);
      }
    });

    return users;
  }

  /**
   * Update an existing user document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<User>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (dataToUpdate.email) {
      dataToUpdate.email = dataToUpdate.email.toLowerCase().trim();
    }

    if (dataToUpdate.username) {
      dataToUpdate.username = dataToUpdate.username.trim();
    }

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return User.fromFirestore(updatedDoc);
  }

  /**
   * Delete a user document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new UserRepository();
