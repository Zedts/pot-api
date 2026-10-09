const { db } = require('../firebase');
const Penjualan = require('../models/penjualan.model');
const PenjualanDetail = require('../models/penjualanDetail.model');
const { getLocalDateString } = require('../utils/timezone');
const { BadRequestError } = require('../errors/AppError');

/**
 * Penjualan Repository
 * Handles data persistence and transactions for the 'penjualan' Firestore collection.
 */
class PenjualanRepository {
  constructor() {
    this.collection = db.collection('penjualan');
    this.detailsCollection = db.collection('penjualan_detail');
  }

  /**
   * Atomically create a penjualan header and all its associated line items in a single Firestore batch
   * @param {Object} headerData { spg_id, lapak_id, tanggal, metode_pembayaran, bukti_qris_url, catatan }
   * @param {Array<Object>} itemsData Array of items { produk_id, nama_produk, qty, harga_satuan, subtotal }
   * @returns {Promise<{ penjualan: Penjualan, items: Array<PenjualanDetail> }>}
   */
  async createWithDetails(headerData, itemsData) {
    const batch = db.batch();
    const now = new Date();
    const headerRef = this.collection.doc();

    const calculatedTotal = itemsData.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    const penjualanEntity = new Penjualan({
      id: headerRef.id,
      spg_id: headerData.spg_id,
      lapak_id: headerData.lapak_id,
      tanggal: headerData.tanggal || now,
      total_harga: calculatedTotal,
      metode_pembayaran: headerData.metode_pembayaran,
      bukti_qris_url: headerData.bukti_qris_url || null,
      catatan: headerData.catatan || '',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(headerRef, penjualanEntity.toFirestore());

    const createdDetails = [];

    for (const item of itemsData) {
      const detailRef = this.detailsCollection.doc();
      const detailEntity = new PenjualanDetail({
        id: detailRef.id,
        penjualan_id: headerRef.id,
        produk_id: item.produk_id,
        nama_produk: item.nama_produk,
        qty: item.qty,
        harga_satuan: item.harga_satuan,
        subtotal: item.subtotal,
        createdAt: now,
        updatedAt: now,
      });

      batch.set(detailRef, detailEntity.toFirestore());
      createdDetails.push(detailEntity);
    }

    await batch.commit();

    penjualanEntity.items = createdDetails;
    return {
      penjualan: penjualanEntity,
      items: createdDetails,
    };
  }

  /**
   * Atomically create a penjualan header, details, and increment stok_terjual in a single transaction
   * @param {Object} headerData
   * @param {Array<Object>} itemsData
   * @param {string} targetLapakId
   * @returns {Promise<{ penjualan: Penjualan, items: Array<PenjualanDetail> }>}
   */
  async createWithDetailsAndStock(headerData, itemsData, targetLapakId) {
    const now = new Date();
    const headerRef = this.collection.doc();
    const calculatedTotal = itemsData.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    const penjualanEntity = new Penjualan({
      id: headerRef.id,
      spg_id: headerData.spg_id,
      lapak_id: headerData.lapak_id,
      tanggal: headerData.tanggal || now,
      total_harga: calculatedTotal,
      metode_pembayaran: headerData.metode_pembayaran,
      bukti_qris_url: headerData.bukti_qris_url || null,
      catatan: headerData.catatan || '',
      createdAt: now,
      updatedAt: now,
    });

    const stokCollection = db.collection('stok_lapak');
    const stokItems = [];

    for (const item of itemsData) {
      const snap = await stokCollection
        .where('lapak_id', '==', targetLapakId.trim())
        .where('produk_id', '==', item.produk_id.trim())
        .limit(1)
        .get();

      const docRef = snap.empty ? stokCollection.doc() : snap.docs[0].ref;
      stokItems.push({ item, docRef, isNew: snap.empty });
    }

    const createdDetails = [];

    await db.runTransaction(async (transaction) => {
      // 1. Transaction Read Phase: read all existing stock docs and validate stock availability
      const stockReadData = [];
      for (const entry of stokItems) {
        if (!entry.isNew) {
          const doc = await transaction.get(entry.docRef);
          stockReadData.push({ ...entry, docData: doc.exists ? doc.data() : null });
        } else {
          stockReadData.push({ ...entry, docData: null });
        }
      }

      // Assert stock availability for all items before applying any writes
      for (const entry of stockReadData) {
        const requestedQty = Number(entry.item.qty || 0);
        if (!entry.docData) {
          throw new BadRequestError(
            `Stok untuk produk "${entry.item.nama_produk}" belum tersedia di lapak ini.`
          );
        }

        const current = entry.docData;
        const stokAwal = Number(current.stok_awal || 0);
        const stokMasuk = Number(current.stok_masuk || 0);
        const stokTerjual = Number(current.stok_terjual || 0);
        const availableStock = stokAwal + stokMasuk - stokTerjual;

        if (requestedQty > availableStock) {
          throw new BadRequestError(
            `Stok produk "${entry.item.nama_produk}" tidak mencukupi (tersedia: ${availableStock} pcs, diminta: ${requestedQty} pcs).`
          );
        }
      }

      // 2. Transaction Write Phase: set header, line items, and increment stok_terjual
      transaction.set(headerRef, penjualanEntity.toFirestore());

      for (const entry of stockReadData) {
        const detailRef = this.detailsCollection.doc();
        const detailEntity = new PenjualanDetail({
          id: detailRef.id,
          penjualan_id: headerRef.id,
          produk_id: entry.item.produk_id,
          nama_produk: entry.item.nama_produk,
          qty: entry.item.qty,
          harga_satuan: entry.item.harga_satuan,
          subtotal: entry.item.subtotal,
          createdAt: now,
          updatedAt: now,
        });
        transaction.set(detailRef, detailEntity.toFirestore());
        createdDetails.push(detailEntity);

        const current = entry.docData;
        const newStokTerjual = Number(current.stok_terjual || 0) + Number(entry.item.qty || 0);
        const stokAwal = Number(current.stok_awal || 0);
        const stokMasuk = Number(current.stok_masuk || 0);
        const stokAkhir = stokAwal + stokMasuk - newStokTerjual;

        transaction.update(entry.docRef, {
          stok_terjual: newStokTerjual,
          stok_akhir: stokAkhir,
          updatedAt: now,
        });
      }
    });

    penjualanEntity.items = createdDetails;
    return {
      penjualan: penjualanEntity,
      items: createdDetails,
    };
  }

  /**
   * Retrieve single sales transaction by document ID
   * @param {string} id
   * @returns {Promise<Penjualan|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Penjualan.fromFirestore(doc);
  }

  /**
   * Retrieve all sales transactions with optional filtering
   * @param {Object} filters { lapak_id, spg_id, tanggal, metode_pembayaran }
   * @returns {Promise<Array<Penjualan>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const lapakId = filters.lapak_id || filters.lapakId;
    if (lapakId) {
      query = query.where('lapak_id', '==', lapakId.trim());
    }

    const spgId = filters.spg_id || filters.spgId;
    if (spgId) {
      query = query.where('spg_id', '==', spgId.trim());
    }

    if (filters.metode_pembayaran) {
      query = query.where('metode_pembayaran', '==', filters.metode_pembayaran.trim().toLowerCase());
    }

    const limitVal = filters.limit ? parseInt(filters.limit, 10) : null;

    const snapshot = await query.get();
    let list = [];
    snapshot.forEach((doc) => {
      const entity = Penjualan.fromFirestore(doc);
      if (entity) list.push(entity);
    });

    // In-memory filter for tanggal to avoid Firestore composite index requirement
    if (filters.tanggal) {
      const targetDateStr = getLocalDateString(filters.tanggal);
      list = list.filter((p) => {
        if (!p.tanggal) return false;
        return getLocalDateString(p.tanggal) === targetDateStr;
      });
    }

    // Default sort by tanggal descending
    list.sort((a, b) => {
      const timeA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
      const timeB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
      return timeB - timeA;
    });

    if (limitVal && !isNaN(limitVal) && limitVal > 0) {
      list = list.slice(0, Math.min(limitVal, 100));
    }

    return list;
  }

  /**
   * Update transaction metadata (e.g. catatan, metode_pembayaran, bukti_qris_url)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Penjualan|null>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Penjualan.fromFirestore(updatedDoc);
  }

  /**
   * Atomically delete a sales transaction header and all its line items
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteWithDetails(id) {
    const docRef = this.collection.doc(id);
    const headerDoc = await docRef.get();
    if (!headerDoc.exists) return false;

    const detailsSnapshot = await this.detailsCollection.where('penjualan_id', '==', id).get();

    const batch = db.batch();
    batch.delete(docRef);
    detailsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return true;
  }

  /**
   * Atomically delete a sales transaction, its line items, and rollback stock balances in a single Firestore transaction
   * @param {string} id
   * @param {string} lapakId
   * @param {Array<PenjualanDetail>} items
   * @returns {Promise<boolean>}
   */
  async deleteWithRollback(id, lapakId, items = []) {
    const headerRef = this.collection.doc(id);
    const detailsSnapshot = await this.detailsCollection.where('penjualan_id', '==', id).get();

    // Pre-query stock doc refs for each item to be able to read them in the transaction
    const cleanLapakId = (lapakId || '').trim();
    const stockDocsMap = new Map();

    for (const item of items) {
      const pId = (item.produk_id || '').trim();
      if (cleanLapakId && pId && !stockDocsMap.has(pId)) {
        const snap = await db.collection('stok_lapak')
          .where('lapak_id', '==', cleanLapakId)
          .where('produk_id', '==', pId)
          .limit(1)
          .get();
        if (!snap.empty) {
          stockDocsMap.set(pId, snap.docs[0].ref);
        }
      }
    }

    const now = new Date();

    await db.runTransaction(async (transaction) => {
      // 1. Transaction READS
      const headerDoc = await transaction.get(headerRef);
      if (!headerDoc.exists) {
        return;
      }

      const stockSnapshots = new Map();
      for (const [pId, stockRef] of stockDocsMap.entries()) {
        const stockDoc = await transaction.get(stockRef);
        if (stockDoc.exists) {
          stockSnapshots.set(pId, stockDoc);
        }
      }

      // 2. Transaction WRITES
      // 2a. Rollback inventory balances
      for (const item of items) {
        const pId = (item.produk_id || '').trim();
        const stockDoc = stockSnapshots.get(pId);
        if (stockDoc) {
          const current = stockDoc.data();
          const subQty = Number(item.qty || 0);
          const newStokTerjual = Math.max(0, Number(current.stok_terjual || 0) - subQty);
          const stokAwal = Number(current.stok_awal || 0);
          const stokMasuk = Number(current.stok_masuk || 0);
          const stokAkhir = stokAwal + stokMasuk - newStokTerjual;

          transaction.update(stockDoc.ref, {
            stok_terjual: newStokTerjual,
            stok_akhir: stokAkhir,
            updatedAt: now,
          });
        }
      }

      // 2b. Delete details
      detailsSnapshot.forEach((doc) => {
        transaction.delete(doc.ref);
      });

      // 2c. Delete header
      transaction.delete(headerRef);
    });

    return true;
  }

  /**
   * Count transactions referencing a specific lapak_id
   * @param {string} lapakId
   * @returns {Promise<number>}
   */
  async countByLapakId(lapakId) {
    if (!lapakId) return 0;
    const snap = await this.collection.where('lapak_id', '==', lapakId.trim()).count().get();
    return snap.data().count;
  }

  /**
   * Count transactions referencing a specific spg_id
   * @param {string} spgId
   * @returns {Promise<number>}
   */
  async countBySpgId(spgId) {
    if (!spgId) return 0;
    const snap = await this.collection.where('spg_id', '==', spgId.trim()).count().get();
    return snap.data().count;
  }
}

module.exports = new PenjualanRepository();
