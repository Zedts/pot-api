const { db } = require('../firebase');
const Lapak = require('../models/lapak.model');

/**
 * Lapak Repository
 * Data Access Layer encapsulating Firestore operations for 'lapak'.
 */
class LapakRepository {
  constructor() {
    this.collection = db.collection('lapak');
  }

  /**
   * Create a new lapak document in Firestore
   * @param {Object} data
   * @param {string|null} customId
   * @returns {Promise<Lapak>}
   */
  async create(data, customId = null) {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date();

    const dataToSave = {
      nama: data.nama.trim(),
      lokasi: data.lokasi.trim(),
      keterangan: data.keterangan ? data.keterangan.trim() : '',
      spg_id: data.spg_id || null,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(dataToSave);

    return new Lapak({
      id: docRef.id,
      ...dataToSave,
    });
  }

  /**
   * Find lapak by Document ID
   * @param {string} id
   * @returns {Promise<Lapak|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Lapak.fromFirestore(doc);
  }

  /**
   * Find a lapak by assigned SPG User ID
   * @param {string} spgId
   * @returns {Promise<Lapak|null>}
   */
  async findBySpgId(spgId) {
    if (!spgId) return null;
    const cleanId = spgId.trim();
    const snapshot = await this.collection.where('spg_id', '==', cleanId).limit(1).get();
    if (snapshot.empty) return null;
    return Lapak.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Find multiple lapak by an array of document IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Lapak>>}
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
        const lapak = Lapak.fromFirestore(doc);
        if (lapak) {
          map.set(doc.id, lapak);
        }
      });
    }

    return map;
  }

  /**
   * Retrieve all lapak documents with optional filtering
   * @param {Object} [filters]
   * @returns {Promise<Array<Lapak>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.spg_id) {
      query = query.where('spg_id', '==', filters.spg_id);
    }

    const snapshot = await query.get();
    const list = [];

    snapshot.forEach((doc) => {
      const lapak = Lapak.fromFirestore(doc);
      if (lapak) {
        list.push(lapak);
      }
    });

    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }

  /**
   * Update an existing lapak document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Lapak>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Lapak.fromFirestore(updatedDoc);
  }

  /**
   * Delete a lapak document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new LapakRepository();
