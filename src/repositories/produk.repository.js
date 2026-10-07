const { db } = require('../firebase');
const Produk = require('../models/produk.model');
const { STATUS } = require('../constants/status');

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
   * Stores foreign references (kategori_id, satuan_id) and denormalized names (nama_kategori, jenis_satuan)
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
      satuan_id: data.satuan_id.trim(),
      jenis_satuan: data.jenis_satuan ? data.jenis_satuan.trim() : '',
      is_active: data.is_active || STATUS.ACTIVE,
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
   * Find multiple products by an array of document IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Produk>>}
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
        const produk = Produk.fromFirestore(doc);
        if (produk) {
          map.set(doc.id, produk);
        }
      });
    }

    return map;
  }

  /**
   * Count how many produk documents reference a specific kategori_id
   * @param {string} kategoriId
   * @returns {Promise<number>}
   */
  async countByKategoriId(kategoriId) {
    if (!kategoriId) return 0;
    const snap = await this.collection.where('kategori_id', '==', kategoriId.trim()).count().get();
    return snap.data().count;
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
   * Count how many produk documents reference a specific satuan_id
   * @param {string} satuanId
   * @returns {Promise<number>}
   */
  async countBySatuanId(satuanId) {
    if (!satuanId) return 0;
    const snap = await this.collection.where('satuan_id', '==', satuanId.trim()).count().get();
    return snap.data().count;
  }

  /**
   * Find all produk referencing a specific satuan_id
   * @param {string} satuanId
   * @returns {Promise<Array<Produk>>}
   */
  async findBySatuanId(satuanId) {
    if (!satuanId) return [];
    const snapshot = await this.collection.where('satuan_id', '==', satuanId.trim()).get();
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
   * Synchronize jenis_satuan across all produk documents referencing a satuan_id
   * Uses Firestore batched writes for maximum atomicity and efficiency
   * @param {string} satuanId
   * @param {string} newJenisSatuan
   * @returns {Promise<number>} Number of updated products
   */
  async updateJenisSatuanBySatuanId(satuanId, newJenisSatuan) {
    if (!satuanId || !newJenisSatuan) return 0;

    const snapshot = await this.collection.where('satuan_id', '==', satuanId.trim()).get();
    if (snapshot.empty) return 0;

    const now = new Date();
    const cleanJenis = newJenisSatuan.trim();
    const batchSize = 400;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          jenis_satuan: cleanJenis,
          updatedAt: now,
        });
      });

      await batch.commit();
    }

    return docs.length;
  }

  /**
   * Retrieve all produk documents with optional filtering
   * @param {Object} filters { kategori_id, satuan_id, is_active }
   * @returns {Promise<Array<Produk>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const kategoriId = filters.kategori_id || filters.kategoriId;
    if (kategoriId) {
      query = query.where('kategori_id', '==', kategoriId.trim());
    }

    const satuanId = filters.satuan_id || filters.satuanId;
    if (satuanId) {
      query = query.where('satuan_id', '==', satuanId.trim());
    } else if (filters.satuan) {
      query = query.where('jenis_satuan', '==', filters.satuan.trim());
    }

    const isActive = filters.is_active || filters.isActive;
    if (isActive) {
      query = query.where('is_active', '==', isActive.toLowerCase().trim());
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

    if (dataToUpdate.satuan_id !== undefined) {
      dataToUpdate.satuan_id = dataToUpdate.satuan_id.trim();
    }

    if (dataToUpdate.jenis_satuan !== undefined) {
      dataToUpdate.jenis_satuan = dataToUpdate.jenis_satuan ? dataToUpdate.jenis_satuan.trim() : '';
    }

    if (dataToUpdate.is_active !== undefined) {
      dataToUpdate.is_active = dataToUpdate.is_active.toLowerCase().trim();
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
