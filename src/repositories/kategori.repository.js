const { db } = require('../firebase');
const Kategori = require('../models/kategori.model');

/**
 * Kategori Repository
 * Data Access Layer encapsulating Firestore operations for 'kategori'.
 */
class KategoriRepository {
  constructor() {
    this.collection = db.collection('kategori');
  }

  /**
   * Create a new kategori document in Firestore
   * @param {Object} data
   * @param {string|null} customId
   * @returns {Promise<Kategori>}
   */
  async create(data, customId = null) {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date();

    const dataToSave = {
      nama_kategori: data.nama_kategori.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(dataToSave);

    return new Kategori({
      id: docRef.id,
      ...dataToSave,
    });
  }

  /**
   * Find kategori by Document ID
   * @param {string} id
   * @returns {Promise<Kategori|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Kategori.fromFirestore(doc);
  }

  /**
   * Find multiple categories by an array of document IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Kategori>>}
   */
  async findByIds(ids) {
    const map = new Map();
    if (!ids || !Array.isArray(ids) || ids.length === 0) return map;

    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    // Chunk into batches of 100 to stay safely within Firestore batch limits
    const chunkSize = 100;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const refs = chunk.map((id) => this.collection.doc(id));
      const snapshots = await db.getAll(...refs);

      snapshots.forEach((doc) => {
        const kategori = Kategori.fromFirestore(doc);
        if (kategori) {
          map.set(doc.id, kategori);
        }
      });
    }

    return map;
  }

  /**
   * Find kategori by exact nama_kategori (case-sensitive as per Firestore)
   * @param {string} namaKategori
   * @returns {Promise<Kategori|null>}
   */
  async findByNama(namaKategori) {
    if (!namaKategori || typeof namaKategori !== 'string') return null;
    const snapshot = await this.collection
      .where('nama_kategori', '==', namaKategori.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return Kategori.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Retrieve all kategori documents
   * @returns {Promise<Array<Kategori>>}
   */
  async findAll() {
    const snapshot = await this.collection.get();
    const list = [];

    snapshot.forEach((doc) => {
      const kategori = Kategori.fromFirestore(doc);
      if (kategori) {
        list.push(kategori);
      }
    });

    // In-memory sort by createdAt descending to avoid composite index requirement
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }

  /**
   * Update an existing kategori document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Kategori>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Kategori.fromFirestore(updatedDoc);
  }

  /**
   * Delete a kategori document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new KategoriRepository();
