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
   * Retrieve all lapak documents
   * @returns {Promise<Array<Lapak>>}
   */
  async findAll() {
    const snapshot = await this.collection.get();
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
