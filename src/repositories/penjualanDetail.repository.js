const { db } = require('../firebase');
const PenjualanDetail = require('../models/penjualanDetail.model');

/**
 * PenjualanDetail Repository
 * Handles data persistence and queries for the 'penjualan_detail' Firestore collection.
 */
class PenjualanDetailRepository {
  constructor() {
    this.collection = db.collection('penjualan_detail');
  }

  /**
   * Find single line item by ID
   * @param {string} id
   * @returns {Promise<PenjualanDetail|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return PenjualanDetail.fromFirestore(doc);
  }

  /**
   * Find all line items for a specific penjualan ID
   * @param {string} penjualanId
   * @returns {Promise<Array<PenjualanDetail>>}
   */
  async findByPenjualanId(penjualanId) {
    if (!penjualanId) return [];
    const snapshot = await this.collection
      .where('penjualan_id', '==', penjualanId.trim())
      .get();

    const items = [];
    snapshot.forEach((doc) => {
      const item = PenjualanDetail.fromFirestore(doc);
      if (item) items.push(item);
    });
    return items;
  }

  /**
   * Find all line items for multiple penjualan IDs
   * @param {Array<string>} penjualanIds
   * @returns {Promise<Map<string, Array<PenjualanDetail>>>}
   */
  async findByPenjualanIds(penjualanIds) {
    const map = new Map();
    if (!penjualanIds || !Array.isArray(penjualanIds) || penjualanIds.length === 0) return map;

    const uniqueIds = [...new Set(penjualanIds.filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    uniqueIds.forEach((id) => map.set(id, []));

    const chunkSize = 30;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const snapshot = await this.collection.where('penjualan_id', 'in', chunk).get();
      snapshot.forEach((doc) => {
        const item = PenjualanDetail.fromFirestore(doc);
        if (item && item.penjualan_id && map.has(item.penjualan_id)) {
          map.get(item.penjualan_id).push(item);
        }
      });
    }

    return map;
  }

  /**
   * Retrieve all details with optional query filtering
   * @param {Object} filters { penjualan_id, produk_id }
   * @returns {Promise<Array<PenjualanDetail>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    if (filters.penjualan_id) {
      query = query.where('penjualan_id', '==', filters.penjualan_id.trim());
    }

    if (filters.produk_id) {
      query = query.where('produk_id', '==', filters.produk_id.trim());
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.forEach((doc) => {
      const item = PenjualanDetail.fromFirestore(doc);
      if (item) list.push(item);
    });

    return list;
  }

  /**
   * Delete single line item
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Delete all line items referencing a penjualan ID
   * @param {string} penjualanId
   * @returns {Promise<number>}
   */
  async deleteByPenjualanId(penjualanId) {
    if (!penjualanId) return 0;
    const snapshot = await this.collection.where('penjualan_id', '==', penjualanId.trim()).get();
    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  /**
   * Count line items referencing a specific produk_id
   * @param {string} produkId
   * @returns {Promise<number>}
   */
  async countByProdukId(produkId) {
    if (!produkId) return 0;
    const snap = await this.collection.where('produk_id', '==', produkId.trim()).count().get();
    return snap.data().count;
  }
}

module.exports = new PenjualanDetailRepository();
