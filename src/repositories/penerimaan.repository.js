const { db } = require('../firebase');
const { Penerimaan } = require('../models/penerimaan.model');

/**
 * Penerimaan Repository
 * Data Access Layer encapsulating Firestore operations for 'penerimaan'.
 */
class PenerimaanRepository {
  constructor() {
    this.collection = db.collection('penerimaan');
  }

  /**
   * Find receipt by shipment Document ID or shipment unique_id (#PG-...)
   * @param {string} identifier
   * @returns {Promise<Penerimaan|null>}
   */
  async findByPengirimanId(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();

    let snapshot;
    if (clean.startsWith('#PG-')) {
      snapshot = await this.collection.where('unique_id', '==', clean).limit(1).get();
      // Backwards-compatibility fallback if old records had #PG- stored in pengiriman_id
      if (snapshot.empty) {
        snapshot = await this.collection.where('pengiriman_id', '==', clean).limit(1).get();
      }
    } else {
      snapshot = await this.collection.where('pengiriman_id', '==', clean).limit(1).get();
    }

    if (!snapshot || snapshot.empty) return null;
    return Penerimaan.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Find receipt by unique_id (#PG-YYYYMMDD-COUNTER)
   * @param {string} uniqueId
   * @returns {Promise<Penerimaan|null>}
   */
  async findByUniqueId(uniqueId) {
    if (!uniqueId) return null;
    const clean = uniqueId.trim();
    const snapshot = await this.collection.where('unique_id', '==', clean).limit(1).get();
    if (snapshot.empty) return null;
    return Penerimaan.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Find single receipt by document ID
   * @param {string} id
   * @returns {Promise<Penerimaan|null>}
   */
  async findById(id) {
    if (!id) return null;
    const clean = id.trim();
    if (clean.startsWith('#PG-')) {
      return this.findByUniqueId(clean);
    }
    const doc = await this.collection.doc(clean).get();
    return Penerimaan.fromFirestore(doc);
  }

  /**
   * Retrieve all receipts with optional filtering
   * @param {Object} filters { pengiriman_id, unique_id, spg_id, tanggal, status }
   * @returns {Promise<Array<Penerimaan>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const pengirimanId = filters.pengiriman_id || filters.pengirimanId;
    if (pengirimanId) {
      const clean = pengirimanId.trim();
      if (clean.startsWith('#PG-')) {
        query = query.where('unique_id', '==', clean);
      } else {
        query = query.where('pengiriman_id', '==', clean);
      }
    }

    const uniqueId = filters.unique_id || filters.uniqueId;
    if (uniqueId) {
      query = query.where('unique_id', '==', uniqueId.trim());
    }

    const spgId = filters.spg_id || filters.spgId;
    if (spgId) {
      query = query.where('spg_id', '==', spgId.trim());
    }

    const status = filters.status;
    if (status) {
      query = query.where('status', '==', status.trim());
    }

    const countersId = filters.counters_id || filters.counter_id;
    if (countersId) {
      query = query.where('counters_id', '==', countersId.trim());
    }

    const snapshot = await query.get();
    const list = [];

    snapshot.forEach((doc) => {
      const item = Penerimaan.fromFirestore(doc);
      if (item) list.push(item);
    });

    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    if (filters.tanggal) {
      const target = filters.tanggal.trim();
      return list.filter((item) => {
        if (!item.tanggal) return false;
        if (typeof item.tanggal === 'string') {
          return item.tanggal.startsWith(target);
        }
        if (item.tanggal instanceof Date) {
          const iso = item.tanggal.toISOString();
          return iso.startsWith(target);
        }
        return false;
      });
    }

    return list;
  }

  /**
   * Find receipts by counters_id
   * @param {string} countersId
   * @returns {Promise<Array<Penerimaan>>}
   */
  async findByCountersId(countersId) {
    if (!countersId) return [];
    return await this.findAll({ counters_id: countersId });
  }

  /**
   * Alias for backwards compatibility
   */
  async findByCounterId(countersId) {
    return await this.findByCountersId(countersId);
  }

  /**
   * Create new receipt record
   * @param {Object} data
   * @returns {Promise<Penerimaan>}
   */
  async create(data) {
    const docRef = this.collection.doc();
    const now = new Date();

    const entity = new Penerimaan({
      id: docRef.id,
      pengiriman_id: data.pengiriman_id, // Document ID of related shipment
      unique_id: data.unique_id,         // #PG-YYYYMMDD-COUNTER from related shipment
      counters_id: data.counters_id || data.counter_id, // Foreign key to counters collection
      spg_id: data.spg_id,
      tanggal: data.tanggal,
      qty_terima: data.qty_terima,
      nota_url: data.nota_url,
      catatan: data.catatan,
      status: data.status,
      createdAt: now,
      updatedAt: now,
    });

    await docRef.set(entity.toFirestore());
    return entity;
  }

  /**
   * Update receipt record
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Penerimaan>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToSave = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(dataToSave);
    const updatedDoc = await docRef.get();
    return Penerimaan.fromFirestore(updatedDoc);
  }

  /**
   * Count receipts referencing a given spg_id
   * @param {string} spgId
   * @returns {Promise<number>}
   */
  async countBySpgId(spgId) {
    if (!spgId) return 0;
    const snap = await this.collection.where('spg_id', '==', spgId.trim()).count().get();
    return snap.data().count;
  }

  /**
   * Count receipts referencing a given pengiriman_id or unique_id
   * @param {string} identifier
   * @returns {Promise<number>}
   */
  async countByPengirimanId(identifier) {
    if (!identifier) return 0;
    const clean = identifier.trim();
    if (clean.startsWith('#PG-')) {
      const snap = await this.collection.where('unique_id', '==', clean).count().get();
      return snap.data().count;
    }
    const snap = await this.collection.where('pengiriman_id', '==', clean).count().get();
    return snap.data().count;
  }

  /**
   * Delete receipt record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new PenerimaanRepository();
