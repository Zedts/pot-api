const { db } = require('../firebase');
const Closing = require('../models/closing.model');
const { getLocalDateString } = require('../utils/timezone');

/**
 * Closing Repository
 * Handles data persistence and queries for the 'closing' Firestore collection.
 */
class ClosingRepository {
  constructor() {
    this.collection = db.collection('closing');
  }

  /**
   * Create a new closing record
   * @param {Object} data
   * @returns {Promise<Closing>}
   */
  async create(data) {
    const docRef = this.collection.doc();
    const now = new Date();

    const entity = new Closing({
      id: docRef.id,
      spg_id: data.spg_id,
      lapak_id: data.lapak_id,
      tanggal: data.tanggal || getLocalDateString(now),
      stok_sistem: data.stok_sistem,
      stok_fisik: data.stok_fisik,
      total_omset: data.total_omset,
      tunai_sistem: data.tunai_sistem,
      qris_sistem: data.qris_sistem,
      transfer_sistem: data.transfer_sistem,
      uang_tunai_fisik: data.uang_tunai_fisik,
      selisih_stok: data.selisih_stok,
      selisih_uang: data.selisih_uang,
      catatan: data.catatan || '',
      status: data.status,
      validated_by: data.validated_by || null,
      createdAt: now,
      updatedAt: now,
    });

    await docRef.set(entity.toFirestore());
    return entity;
  }

  /**
   * Find single closing document by ID
   * @param {string} id
   * @returns {Promise<Closing|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Closing.fromFirestore(doc);
  }

  /**
   * Retrieve all closing records with optional filtering
   * @param {Object} filters { lapak_id, spg_id, tanggal, status }
   * @returns {Promise<Array<Closing>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.lapak_id) {
      query = query.where('lapak_id', '==', filters.lapak_id.trim());
    }

    if (filters.spg_id) {
      query = query.where('spg_id', '==', filters.spg_id.trim());
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status.trim().toLowerCase());
    }

    const snapshot = await query.get();
    let list = [];
    snapshot.forEach((doc) => {
      const entity = Closing.fromFirestore(doc);
      if (entity) list.push(entity);
    });

    // In-memory filter for tanggal to avoid Firestore composite index requirement
    if (filters.tanggal) {
      const targetDate = filters.tanggal.trim();
      list = list.filter((c) => c.tanggal === targetDate);
    }

    // Default sort by createdAt descending
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }

  /**
   * Update closing document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Closing|null>}
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
    return Closing.fromFirestore(updatedDoc);
  }

  /**
   * Delete closing document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Count closing records referencing a lapak_id
   * @param {string} lapakId
   * @returns {Promise<number>}
   */
  async countByLapakId(lapakId) {
    if (!lapakId) return 0;
    const snapshot = await this.collection.where('lapak_id', '==', lapakId.trim()).get();
    return snapshot.size;
  }

  /**
   * Count closing records referencing an spg_id
   * @param {string} spgId
   * @returns {Promise<number>}
   */
  async countBySpgId(spgId) {
    if (!spgId) return 0;
    const snapshot = await this.collection.where('spg_id', '==', spgId.trim()).get();
    return snapshot.size;
  }
}

module.exports = new ClosingRepository();
