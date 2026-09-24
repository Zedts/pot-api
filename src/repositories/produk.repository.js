const { db } = require('../firebase');
const Produk = require('../models/produk.model');

/**
 * Produk Repository
 * Data Access Layer encapsulating Firestore operations for 'produk'.
 */
class ProdukRepository {
  constructor() {
    this.collection = db.collection('produk');
  }

  /**
   * Create a new produk document in Firestore
   * Stores both foreign reference (kategori_id) and category name (nama_kategori)
   * @param {Object} data
   * @param {string|null} customId
   * @returns {Promise<Produk>}
   */
  async create(data, customId = null) {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date();

    const dataToSave = {
      nama: data.nama.trim(),
      harga: Number(data.harga),
      kategori_id: data.kategori_id.trim(),
      nama_kategori: data.nama_kategori ? data.nama_kategori.trim() : '',
      satuan: data.satuan.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(dataToSave);

    return new Produk({
      id: docRef.id,
      ...dataToSave,
    });
  }

  /**
   * Find produk by Document ID
   * @param {string} id
   * @returns {Promise<Produk|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Produk.fromFirestore(doc);
  }

  /**
   * Count how many produk documents reference a specific kategori_id
   * @param {string} kategoriId
   * @returns {Promise<number>}
   */
  async countByKategoriId(kategoriId) {
    if (!kategoriId) return 0;
    const snapshot = await this.collection.where('kategori_id', '==', kategoriId.trim()).get();
    return snapshot.size;
  }

  /**
   * Find all produk referencing a specific kategori_id
   * @param {string} kategoriId
   * @returns {Promise<Array<Produk>>}
   */
  async findByKategoriId(kategoriId) {
    if (!kategoriId) return [];
    const snapshot = await this.collection.where('kategori_id', '==', kategoriId.trim()).get();
    const list = [];
    snapshot.forEach((doc) => {
      const produk = Produk.fromFirestore(doc);
      if (produk) {
        list.push(produk);
      }
    });
    return list;
  }

  /**
   * Synchronize nama_kategori across all produk documents referencing a kategori_id
   * Uses Firestore batched writes for maximum atomicity and efficiency
   * @param {string} kategoriId
   * @param {string} newNamaKategori
   * @returns {Promise<number>} Number of updated products
   */
  async updateNamaKategoriByKategoriId(kategoriId, newNamaKategori) {
    if (!kategoriId || !newNamaKategori) return 0;

    const snapshot = await this.collection.where('kategori_id', '==', kategoriId.trim()).get();
    if (snapshot.empty) return 0;

    const now = new Date();
    const cleanName = newNamaKategori.trim();

    // Firestore batch writes are limited to 500 operations per batch
    const batchSize = 400;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          nama_kategori: cleanName,
          updatedAt: now,
        });
      });

      await batch.commit();
    }

    return docs.length;
  }

  /**
   * Retrieve all produk documents with optional filtering
   * @param {Object} filters { kategori_id, satuan }
   * @returns {Promise<Array<Produk>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const kategoriId = filters.kategori_id || filters.kategoriId;
    if (kategoriId) {
      query = query.where('kategori_id', '==', kategoriId.trim());
    }

    if (filters.satuan) {
      query = query.where('satuan', '==', filters.satuan.trim());
    }

    const snapshot = await query.get();
    const list = [];

    snapshot.forEach((doc) => {
      const produk = Produk.fromFirestore(doc);
      if (produk) {
        list.push(produk);
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
   * Update an existing produk document
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Produk>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (dataToUpdate.harga !== undefined) {
      dataToUpdate.harga = Number(dataToUpdate.harga);
    }

    if (dataToUpdate.kategori_id !== undefined) {
      dataToUpdate.kategori_id = dataToUpdate.kategori_id.trim();
    }

    if (dataToUpdate.nama_kategori !== undefined) {
      dataToUpdate.nama_kategori = dataToUpdate.nama_kategori ? dataToUpdate.nama_kategori.trim() : '';
    }

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Produk.fromFirestore(updatedDoc);
  }

  /**
   * Delete a produk document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new ProdukRepository();
