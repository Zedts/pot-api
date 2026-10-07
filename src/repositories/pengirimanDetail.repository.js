const { db } = require('../firebase');
const PengirimanDetail = require('../models/pengirimanDetail.model');

/**
 * PengirimanDetail Repository
 * Data Access Layer encapsulating Firestore operations for 'pengiriman_detail'.
 */
class PengirimanDetailRepository {
  constructor() {
    this.collection = db.collection('pengiriman_detail');
  }

  /**
   * Prepare batch creation of shipment details within an active Firestore WriteBatch
   * @param {Array<Object>} items
   * @param {FirebaseFirestore.WriteBatch} batch
   * @returns {Array<PengirimanDetail>}
   */
  prepareBatchCreate(items, batch) {
    const createdEntities = [];
    const now = new Date();

    for (const item of items) {
      const docRef = this.collection.doc();
      const dataToSave = {
        pengiriman_id: item.pengiriman_id.trim(),
        pengiriman_unique_id: item.pengiriman_unique_id ? item.pengiriman_unique_id.trim() : null,
        produk_id: item.produk_id.trim(),
        qty: Number(item.qty),
        nama_produk: item.nama_produk ? item.nama_produk.trim() : '',
        harga_produk: typeof item.harga_produk === 'number' ? item.harga_produk : Number(item.harga_produk || 0),
        jenis_satuan: item.jenis_satuan ? item.jenis_satuan.trim() : '',
        kategori_id: item.kategori_id ? item.kategori_id.trim() : null,
        nama_kategori: item.nama_kategori ? item.nama_kategori.trim() : null,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, dataToSave);

      createdEntities.push(
        new PengirimanDetail({
          id: docRef.id,
          ...dataToSave,
        })
      );
    }

    return createdEntities;
  }

  /**
   * Find all shipment details for a specific shipment ID or unique_id (#PG-...)
   * @param {string} pengirimanId
   * @returns {Promise<Array<PengirimanDetail>>}
   */
  async findByPengirimanId(pengirimanId) {
    if (!pengirimanId) return [];

    const cleanId = pengirimanId.trim();
    let snapshot;
    if (cleanId.startsWith('#PG-')) {
      snapshot = await this.collection.where('pengiriman_unique_id', '==', cleanId).get();
      // Fallback: if details didn't have pengiriman_unique_id saved, find shipment first
      if (snapshot.empty) {
        const shipmentDoc = await db.collection('pengiriman').where('unique_id', '==', cleanId).limit(1).get();
        if (!shipmentDoc.empty) {
          snapshot = await this.collection.where('pengiriman_id', '==', shipmentDoc.docs[0].id).get();
        }
      }
    } else {
      snapshot = await this.collection.where('pengiriman_id', '==', cleanId).get();
    }

    const list = [];
    if (snapshot && !snapshot.empty) {
      snapshot.forEach((doc) => {
        const detail = PengirimanDetail.fromFirestore(doc);
        if (detail) {
          list.push(detail);
        }
      });
    }

    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    return list;
  }

  /**
   * Count how many details reference a specific product ID
   * Enforces referential integrity on product deletion
   * @param {string} produkId
   * @returns {Promise<number>}
   */
  async countByProdukId(produkId) {
    if (!produkId) return 0;
    const snap = await this.collection.where('produk_id', '==', produkId.trim()).count().get();
    return snap.data().count;
  }

  /**
   * Delete all detail records belonging to a shipment
   * Supports chunked batched deletion (Firestore max 500 ops per batch)
   * @param {string} pengirimanId
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteByPengirimanId(pengirimanId) {
    if (!pengirimanId) return 0;

    const snapshot = await this.collection.where('pengiriman_id', '==', pengirimanId.trim()).get();
    if (snapshot.empty) return 0;

    const docs = snapshot.docs;
    const batchSize = 400;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }

    return docs.length;
  }

  /**
   * Find single shipment detail by Document ID
   * @param {string} id
   * @returns {Promise<PengirimanDetail|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return PengirimanDetail.fromFirestore(doc);
  }

  /**
   * Retrieve all shipment details with optional filters
   * @param {Object} filters { pengiriman_id, produk_id }
   * @returns {Promise<Array<PengirimanDetail>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const pengirimanId = filters.pengiriman_id || filters.pengirimanId;
    if (pengirimanId) {
      const cleanId = pengirimanId.trim();
      if (cleanId.startsWith('#PG-')) {
        query = query.where('pengiriman_unique_id', '==', cleanId);
      } else {
        query = query.where('pengiriman_id', '==', cleanId);
      }
    }

    const produkId = filters.produk_id || filters.produkId;
    if (produkId) {
      query = query.where('produk_id', '==', produkId.trim());
    }

    const snapshot = await query.get();
    const list = [];

    snapshot.forEach((doc) => {
      const detail = PengirimanDetail.fromFirestore(doc);
      if (detail) {
        list.push(detail);
      }
    });

    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    return list;
  }
}

module.exports = new PengirimanDetailRepository();
