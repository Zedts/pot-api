const { db } = require('../firebase');
const StokLapak = require('../models/stokLapak.model');

/**
 * StokLapak Repository
 * Data Access Layer encapsulating Firestore operations for 'stok_lapak'.
 */
class StokLapakRepository {
  constructor() {
    this.collection = db.collection('stok_lapak');
  }

  /**
   * Find single stock balance record for a given lapak and product
   * @param {string} lapakId
   * @param {string} produkId
   * @returns {Promise<StokLapak|null>}
   */
  async findByLapakAndProduk(lapakId, produkId) {
    if (!lapakId || !produkId) return null;

    const snapshot = await this.collection
      .where('lapak_id', '==', lapakId.trim())
      .where('produk_id', '==', produkId.trim())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return StokLapak.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Find single stock record by document ID
   * @param {string} id
   * @returns {Promise<StokLapak|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id.trim()).get();
    return StokLapak.fromFirestore(doc);
  }

  /**
   * Find all stock records for a specific lapak
   * @param {string} lapakId
   * @returns {Promise<Array<StokLapak>>}
   */
  async findByLapakId(lapakId) {
    if (!lapakId) return [];

    const snapshot = await this.collection
      .where('lapak_id', '==', lapakId.trim())
      .get();

    const list = [];
    snapshot.forEach((doc) => {
      const item = StokLapak.fromFirestore(doc);
      if (item) list.push(item);
    });

    return list;
  }

  /**
   * Retrieve all stock records with optional filtering
   * @param {Object} filters { lapak_id, produk_id }
   * @returns {Promise<Array<StokLapak>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const lapakId = filters.lapak_id || filters.lapakId;
    if (lapakId) {
      query = query.where('lapak_id', '==', lapakId.trim());
    }

    const produkId = filters.produk_id || filters.produkId;
    if (produkId) {
      query = query.where('produk_id', '==', produkId.trim());
    }

    const snapshot = await query.get();
    const list = [];

    snapshot.forEach((doc) => {
      const item = StokLapak.fromFirestore(doc);
      if (item) list.push(item);
    });

    list.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }

  /**
   * Create a new stock record
   * @param {Object} data { lapak_id, produk_id, stok_awal, stok_masuk, stok_terjual }
   * @returns {Promise<StokLapak>}
   */
  async create(data) {
    const docRef = this.collection.doc();
    const now = new Date();

    const entity = new StokLapak({
      id: docRef.id,
      lapak_id: data.lapak_id,
      produk_id: data.produk_id,
      stok_awal: data.stok_awal || 0,
      stok_masuk: data.stok_masuk || 0,
      stok_terjual: data.stok_terjual || 0,
      createdAt: now,
      updatedAt: now,
    });

    await docRef.set(entity.toFirestore());
    return entity;
  }

  /**
   * Update stock numbers and recalculate stok_akhir
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<StokLapak>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const current = doc.data();
    const stokAwal = updateData.stok_awal !== undefined ? Number(updateData.stok_awal) : (current.stok_awal || 0);
    const stokMasuk = updateData.stok_masuk !== undefined ? Number(updateData.stok_masuk) : (current.stok_masuk || 0);
    const stokTerjual = updateData.stok_terjual !== undefined ? Number(updateData.stok_terjual) : (current.stok_terjual || 0);
    const stokAkhir = stokAwal + stokMasuk - stokTerjual;

    const dataToSave = {
      stok_awal: stokAwal,
      stok_masuk: stokMasuk,
      stok_terjual: stokTerjual,
      stok_akhir: stokAkhir,
      updatedAt: new Date(),
    };

    await docRef.update(dataToSave);
    const updatedDoc = await docRef.get();
    return StokLapak.fromFirestore(updatedDoc);
  }

  /**
   * Atomically increment stok_masuk for a specific lapak and product
   * Creates record if not exists
   * @param {string} lapakId
   * @param {string} produkId
   * @param {number} qty
   * @returns {Promise<StokLapak>}
   */
  async incrementStokMasuk(lapakId, produkId, qty) {
    const cleanLapakId = lapakId.trim();
    const cleanProdukId = produkId.trim();
    const addQty = Number(qty || 0);

    const snapshot = await this.collection
      .where('lapak_id', '==', cleanLapakId)
      .where('produk_id', '==', cleanProdukId)
      .limit(1)
      .get();

    const now = new Date();

    if (snapshot.empty) {
      // Create new record with baseline 0 and incoming qty
      return await this.create({
        lapak_id: cleanLapakId,
        produk_id: cleanProdukId,
        stok_awal: 0,
        stok_masuk: addQty,
        stok_terjual: 0,
      });
    }

    const docRef = snapshot.docs[0].ref;
    const current = snapshot.docs[0].data();
    const newStokMasuk = Number(current.stok_masuk || 0) + addQty;
    const stokAwal = Number(current.stok_awal || 0);
    const stokTerjual = Number(current.stok_terjual || 0);
    const stokAkhir = stokAwal + newStokMasuk - stokTerjual;

    await docRef.update({
      stok_masuk: newStokMasuk,
      stok_akhir: stokAkhir,
      updatedAt: now,
    });

    const updatedDoc = await docRef.get();
    return StokLapak.fromFirestore(updatedDoc);
  }

  /**
   * Atomically decrement stok_masuk for a specific lapak and product (used on receipt deletion)
   * @param {string} lapakId
   * @param {string} produkId
   * @param {number} qty
   * @returns {Promise<StokLapak|null>}
   */
  async decrementStokMasuk(lapakId, produkId, qty) {
    const cleanLapakId = lapakId.trim();
    const cleanProdukId = produkId.trim();
    const subQty = Number(qty || 0);

    const snapshot = await this.collection
      .where('lapak_id', '==', cleanLapakId)
      .where('produk_id', '==', cleanProdukId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const docRef = snapshot.docs[0].ref;
    const current = snapshot.docs[0].data();
    const newStokMasuk = Math.max(0, Number(current.stok_masuk || 0) - subQty);
    const stokAwal = Number(current.stok_awal || 0);
    const stokTerjual = Number(current.stok_terjual || 0);
    const stokAkhir = stokAwal + newStokMasuk - stokTerjual;

    await docRef.update({
      stok_masuk: newStokMasuk,
      stok_akhir: stokAkhir,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return StokLapak.fromFirestore(updatedDoc);
  }

  /**
   * Count records referencing lapakId
   * @param {string} lapakId
   * @returns {Promise<number>}
   */
  async countByLapakId(lapakId) {
    if (!lapakId) return 0;
    const snapshot = await this.collection.where('lapak_id', '==', lapakId.trim()).get();
    return snapshot.size;
  }

  /**
   * Count records referencing produkId
   * @param {string} produkId
   * @returns {Promise<number>}
   */
  async countByProdukId(produkId) {
    if (!produkId) return 0;
    const snapshot = await this.collection.where('produk_id', '==', produkId.trim()).get();
    return snapshot.size;
  }

  /**
   * Delete stock record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new StokLapakRepository();
