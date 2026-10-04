const { db } = require('../firebase');
const { Pengiriman } = require('../models/pengiriman.model');
const { PENGIRIMAN_STATUS } = require('../constants/pengirimanStatus');
const pengirimanDetailRepository = require('./pengirimanDetail.repository');

/**
 * Pengiriman Repository
 * Data Access Layer encapsulating Firestore operations for 'pengiriman'.
 */
class PengirimanRepository {
  constructor() {
    this.collection = db.collection('pengiriman');
  }

  /**
   * Atomically create a shipment and all its detail items using a Firestore WriteBatch
   * @param {Object} pengirimanData
   * @param {Array<Object>} itemsData
   * @returns {Promise<{ pengiriman: Pengiriman, items: Array<PengirimanDetail> }>}
   */
  async createWithDetails(pengirimanData, itemsData) {
    const batch = db.batch();
    const docRef = this.collection.doc();
    const now = new Date();

    const dataToSave = {
      tanggal: pengirimanData.tanggal || now,
      lapak_id: pengirimanData.lapak_id.trim(),
      created_by: pengirimanData.created_by.trim(),
      status: pengirimanData.status || PENGIRIMAN_STATUS.DRAFT,
      total_items: itemsData.length,
      total_qty: itemsData.reduce((sum, item) => sum + Number(item.qty), 0),
      createdAt: now,
      updatedAt: now,
    };

    batch.set(docRef, dataToSave);

    // Attach generated shipment ID to all detail records
    const itemsWithPengirimanId = itemsData.map((item) => ({
      ...item,
      pengiriman_id: docRef.id,
    }));

    const detailEntities = pengirimanDetailRepository.prepareBatchCreate(itemsWithPengirimanId, batch);

    // Commit both header and line items atomically
    await batch.commit();

    const pengirimanEntity = new Pengiriman({
      id: docRef.id,
      ...dataToSave,
    });

    return {
      pengiriman: pengirimanEntity,
      items: detailEntities,
    };
  }

  /**
   * Find shipment by Document ID
   * @param {string} id
   * @returns {Promise<Pengiriman|null>}
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id).get();
    return Pengiriman.fromFirestore(doc);
  }

  /**
   * Find multiple shipments by an array of document IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Pengiriman>>}
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
        const pengiriman = Pengiriman.fromFirestore(doc);
        if (pengiriman) {
          map.set(doc.id, pengiriman);
        }
      });
    }

    return map;
  }

  /**
   * Count how many shipments reference a specific lapak_id
   * Used for referential integrity enforcement on lapak deletion
   * @param {string} lapakId
   * @returns {Promise<number>}
   */
  async countByLapakId(lapakId) {
    if (!lapakId) return 0;
    const snapshot = await this.collection.where('lapak_id', '==', lapakId.trim()).get();
    return snapshot.size;
  }

  /**
   * Count how many shipments reference a specific created_by user ID
   * Used for referential integrity enforcement on user deletion
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countByCreatedBy(userId) {
    if (!userId) return 0;
    const snapshot = await this.collection.where('created_by', '==', userId.trim()).get();
    return snapshot.size;
  }

  /**
   * Retrieve all shipments with optional filtering
   * @param {Object} filters { status, lapak_id, created_by }
   * @returns {Promise<Array<Pengiriman>>}
   */
  async findAll(filters = {}) {
    let query = this.collection;

    const status = filters.status;
    if (status) {
      query = query.where('status', '==', status.trim());
    }

    const lapakId = filters.lapak_id || filters.lapakId;
    if (lapakId) {
      query = query.where('lapak_id', '==', lapakId.trim());
    }

    const createdBy = filters.created_by || filters.createdBy;
    if (createdBy) {
      query = query.where('created_by', '==', createdBy.trim());
    }

    const snapshot = await query.get();
    const list = [];

    snapshot.forEach((doc) => {
      const pengiriman = Pengiriman.fromFirestore(doc);
      if (pengiriman) {
        list.push(pengiriman);
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
   * Update shipment metadata (e.g., lapak_id, tanggal)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Pengiriman>}
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (dataToUpdate.lapak_id !== undefined) {
      dataToUpdate.lapak_id = dataToUpdate.lapak_id.trim();
    }

    if (dataToUpdate.tanggal !== undefined && dataToUpdate.tanggal) {
      dataToUpdate.tanggal = dataToUpdate.tanggal instanceof Date ? dataToUpdate.tanggal : new Date(dataToUpdate.tanggal);
    }

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Pengiriman.fromFirestore(updatedDoc);
  }

  /**
   * Update shipment status
   * @param {string} id
   * @param {string} newStatus
   * @returns {Promise<Pengiriman>}
   */
  async updateStatus(id, newStatus) {
    const docRef = this.collection.doc(id);
    const dataToUpdate = {
      status: newStatus.trim(),
      updatedAt: new Date(),
    };

    await docRef.update(dataToUpdate);
    const updatedDoc = await docRef.get();
    return Pengiriman.fromFirestore(updatedDoc);
  }

  /**
   * Delete shipment document
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.collection.doc(id).delete();
    return true;
  }
}

module.exports = new PengirimanRepository();
