const { db } = require('../firebase');
const Payroll = require('../models/payroll.model');

/**
 * Payroll Repository
 * Handles data persistence and queries for the 'payroll' Firestore collection.
 */
class PayrollRepository {
  constructor() {
    this.collection = db.collection('payroll');
  }

  /**
   * Create a new payroll document
   * @param {Object} data
   * @returns {Promise<Payroll>}
   */
  async create(data) {
    const docRef = this.collection.doc();
    const now = new Date();

    const entity = new Payroll({
      id: docRef.id,
      user_id: data.user_id,
      periode: data.periode,
      hari_kerja: data.hari_kerja,
      total_penjualan: data.total_penjualan,
      gaji_pokok: data.gaji_pokok,
      bonus_penjualan: data.bonus_penjualan,
      lembur: data.lembur,
      potongan: data.potongan,
      kasbon: data.kasbon,
      total_gaji: data.total_gaji,
      status: data.status,
      createdAt: now,
      updatedAt: now,
    });

    await docRef.set(entity.toFirestore());
    return entity;
  }

  /**
   * Find single payroll document by ID
   * @param {string} id
   * @returns {Promise<Payroll|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Payroll.fromFirestore(doc);
  }

  /**
   * Batch fetch payroll documents by array of IDs
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Payroll>>}
   */
  async findByIds(ids = []) {
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
        const item = Payroll.fromFirestore(doc);
        if (item) {
          map.set(doc.id, item);
        }
      });
    }

    return map;
  }

  /**
   * Find payroll document by user_id and period (yyyy-mm)
   * @param {string} userId
   * @param {string} periode
   * @returns {Promise<Payroll|null>}
   */
  async findByUserAndPeriod(userId, periode) {
    if (!userId || !periode) return null;
    const snapshot = await this.collection
      .where('user_id', '==', userId.trim())
      .where('periode', '==', periode.trim())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return Payroll.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Retrieve all payroll documents with optional filtering
   * @param {Object} filters { user_id, periode, status }
   * @returns {Promise<Array<Payroll>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.user_id) {
      query = query.where('user_id', '==', filters.user_id.trim());
    }

    if (filters.periode) {
      query = query.where('periode', '==', filters.periode.trim());
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status.trim().toLowerCase());
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.forEach((doc) => {
      const entity = Payroll.fromFirestore(doc);
      if (entity) list.push(entity);
    });

    // Default sort by periode descending, then createdAt descending
    list.sort((a, b) => {
      if (a.periode !== b.periode) {
        return (b.periode || '').localeCompare(a.periode || '');
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }

  /**
   * Update payroll document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Payroll|null>}
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
    return Payroll.fromFirestore(updatedDoc);
  }

  /**
   * Delete payroll document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Count payroll records referencing a user_id
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countByUserId(userId) {
    if (!userId) return 0;
    const snapshot = await this.collection.where('user_id', '==', userId.trim()).get();
    return snapshot.size;
  }
}

module.exports = new PayrollRepository();
