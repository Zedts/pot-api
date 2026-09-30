const { db } = require('../firebase');
const Satuan = require('../models/satuan.model');

/**
 * Satuan Repository
 * Data Access Layer encapsulating Firestore operations for 'satuan'.
 */
class SatuanRepository {
  constructor() {
    this.collection = db.collection('satuan');
  }

  /**
   * Create a new satuan document in Firestore
   * @param {Object} data
   * @param {string|null} customId
   * @returns {Promise<Satuan>}
   */
  async create(data, customId = null) {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date();

    const dataToSave = {
      jenis_satuan: data.jenis_satuan.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(dataToSave);

    return new Satuan({
      id: docRef.id,
      ...dataToSave,
    });
  }

  /**
   * Find satuan by Document ID
   * @param {string} id
   * @returns {Promise<Satuan|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Satuan.fromFirestore(doc);
  }

  /**
   * Find multiple satuan records by an array of document IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Satuan>>}
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
        const satuan = Satuan.fromFirestore(doc);
        if (satuan) {
          map.set(doc.id, satuan);
        }
      });
    }

    return map;
  }

  /**
   * Find satuan by exact jenis_satuan (case-sensitive as per Firestore)
   * @param {string} jenisSatuan
   * @returns {Promise<Satuan|null>}
   */
  async findByJenis(jenisSatuan) {
    if (!jenisSatuan || typeof jenisSatuan !== 'string') return null;
    const snapshot = await this.collection
      .where('jenis_satuan', '==', jenisSatuan.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return Satuan.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Retrieve all satuan documents
   * @returns {Promise<Array<Satuan>>}
   */
  async findAll() {
    const snapshot = await this.collection.get();
    const list = [];

    snapshot.forEach((doc) => {
      const satuan = Satuan.fromFirestore(doc);
      if (satuan) {
        list.push(satuan);
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
   * Update an existing satuan document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Satuan>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Satuan.fromFirestore(updatedDoc);
  }

  /**
   * Delete a satuan document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new SatuanRepository();
