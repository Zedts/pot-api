const { db } = require('../firebase');
const SlipGaji = require('../models/slipGaji.model');

/**
 * Slip Gaji Repository
 * Handles data persistence and queries for the 'slip_gaji' Firestore collection.
 */
class SlipGajiRepository {
  constructor() {
    this.collection = db.collection('slip_gaji');
  }

  /**
   * Create a new slip_gaji document
   * @param {Object} data
   * @returns {Promise<SlipGaji>}
   */
  async create(data) {
    const docRef = this.collection.doc();
    const now = new Date();

    const entity = new SlipGaji({
      id: docRef.id,
      payroll_id: data.payroll_id,
      file_url: data.file_url || null,
      tanggal: data.tanggal || null,
      createdAt: now,
      updatedAt: now,
    });

    await docRef.set(entity.toFirestore());
    return entity;
  }

  /**
   * Find single slip_gaji document by ID
   * @param {string} id
   * @returns {Promise<SlipGaji|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return SlipGaji.fromFirestore(doc);
  }

  /**
   * Find slip_gaji by payroll_id
   * @param {string} payrollId
   * @returns {Promise<SlipGaji|null>}
   */
  async findByPayrollId(payrollId) {
    if (!payrollId) return null;
    const snapshot = await this.collection
      .where('payroll_id', '==', payrollId.trim())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return SlipGaji.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Batch fetch slip_gaji documents by IDs
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, SlipGaji>>}
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
        const item = SlipGaji.fromFirestore(doc);
        if (item) {
          map.set(doc.id, item);
        }
      });
    }

    return map;
  }

  /**
   * Retrieve all slip_gaji documents with optional filtering
   * @param {Object} filters { payroll_id, tanggal }
   * @returns {Promise<Array<SlipGaji>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.payroll_id) {
      query = query.where('payroll_id', '==', filters.payroll_id.trim());
    }

    if (filters.tanggal) {
      query = query.where('tanggal', '==', filters.tanggal.trim());
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.forEach((doc) => {
      const entity = SlipGaji.fromFirestore(doc);
      if (entity) list.push(entity);
    });

    // Default sort by createdAt descending
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }

  /**
   * Update slip_gaji document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<SlipGaji|null>}
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
    return SlipGaji.fromFirestore(updatedDoc);
  }

  /**
   * Delete slip_gaji document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new SlipGajiRepository();
