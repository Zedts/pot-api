const { db } = require('../firebase');
const Absensi = require('../models/absensi.model');
const { getLocalDateString } = require('../utils/timezone');

/**
 * Absensi Repository
 * Handles data persistence and queries for the 'absensi' Firestore collection.
 */
class AbsensiRepository {
  constructor() {
    this.collection = db.collection('absensi');
  }

  /**
   * Create a new attendance document
   * @param {Object} data
   * @returns {Promise<Absensi>}
   */
  async create(data) {
    const docRef = this.collection.doc();
    const now = new Date();

    const isIzin = (data.status || '').toLowerCase() === 'izin';
    const entity = new Absensi({
      id: docRef.id,
      user_id: data.user_id,
      lapak_id: data.lapak_id,
      tanggal: data.tanggal || getLocalDateString(now),
      jam_masuk: data.jam_masuk !== undefined ? data.jam_masuk : (isIzin ? null : now),
      jam_pulang: data.jam_pulang || null,
      lokasi_masuk: data.lokasi_masuk || null,
      foto_masuk_url: data.foto_masuk_url || null,
      status: data.status,
      keterangan: data.keterangan || '',
      createdAt: now,
      updatedAt: now,
    });

    await docRef.set(entity.toFirestore());
    return entity;
  }

  /**
   * Find single attendance record by ID
   * @param {string} id
   * @returns {Promise<Absensi|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Absensi.fromFirestore(doc);
  }

  /**
   * Find attendance record for a user on a specific date (YYYY-MM-DD)
   * @param {string} userId
   * @param {string} tanggal
   * @returns {Promise<Absensi|null>}
   */
  async findByUserAndDate(userId, tanggal) {
    if (!userId || !tanggal) return null;
    const snapshot = await this.collection
      .where('user_id', '==', userId.trim())
      .where('tanggal', '==', tanggal.trim())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return Absensi.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Retrieve all attendance records with optional filtering
   * @param {Object} filters { user_id, lapak_id, tanggal, status }
   * @returns {Promise<Array<Absensi>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.user_id) {
      query = query.where('user_id', '==', filters.user_id.trim());
    }

    if (filters.lapak_id) {
      query = query.where('lapak_id', '==', filters.lapak_id.trim());
    }

    if (filters.tanggal) {
      query = query.where('tanggal', '==', filters.tanggal.trim());
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status.trim().toLowerCase());
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.forEach((doc) => {
      const entity = Absensi.fromFirestore(doc);
      if (entity) list.push(entity);
    });

    // Default sort descending by jam_masuk, falling back to createdAt or tanggal for records without jam_masuk (e.g. izin)
    const getRecordTime = (record) => {
      if (record.jam_masuk) {
        const t = new Date(record.jam_masuk).getTime();
        if (!isNaN(t)) return t;
      }
      if (record.createdAt) {
        const t = new Date(record.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (record.tanggal) {
        const t = new Date(record.tanggal).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    list.sort((a, b) => getRecordTime(b) - getRecordTime(a));

    return list;
  }

  /**
   * Update attendance document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Absensi|null>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const dataToSave = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(dataToSave);
    const updatedDoc = await docRef.get();
    return Absensi.fromFirestore(updatedDoc);
  }

  /**
   * Delete attendance document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Count attendance records referencing lapakId
   * @param {string} lapakId
   * @returns {Promise<number>}
   */
  async countByLapakId(lapakId) {
    if (!lapakId) return 0;
    const snapshot = await this.collection.where('lapak_id', '==', lapakId.trim()).get();
    return snapshot.size;
  }

  /**
   * Count attendance records referencing userId
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countByUserId(userId) {
    if (!userId) return 0;
    const snapshot = await this.collection.where('user_id', '==', userId.trim()).get();
    return snapshot.size;
  }
}

module.exports = new AbsensiRepository();
