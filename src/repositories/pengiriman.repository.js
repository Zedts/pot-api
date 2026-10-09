const { db } = require('../firebase');
const { Pengiriman } = require('../models/pengiriman.model');
const { PENGIRIMAN_STATUS } = require('../constants/pengirimanStatus');
const { getLocalDateString } = require('../utils/timezone');
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
   * Atomically generate a sequential unique ID for a given date in format: #PG-YYYYMMDD-COUNTER
   * @param {Date|string} date
   * @returns {Promise<string>}
   */
  async generateUniqueId(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const dateStr = getLocalDateString(d).replace(/-/g, '');
    const counterRef = db.collection('counters').doc(`pengiriman_${dateStr}`);

    const nextCounter = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let count = 1;

      if (counterDoc.exists) {
        const data = counterDoc.data();
        count = (data.last_counter || 0) + 1;
      } else {
        // Self-healing: only query if counter document was manually deleted
        // Uses targeted indexed prefix range query instead of full collection scan
        const prefix = `#PG-${dateStr}-`;
        const existingDocs = await this.collection
          .where('unique_id', '>=', prefix)
          .where('unique_id', '<=', prefix + '\uf8ff')
          .get();

        let maxExistingCounter = 0;
        existingDocs.forEach((doc) => {
          const data = doc.data();
          if (data.unique_id) {
            const parts = data.unique_id.split('-');
            const num = parseInt(parts[2], 10);
            if (!isNaN(num) && num > maxExistingCounter) {
              maxExistingCounter = num;
            }
          }
        });
        count = maxExistingCounter + 1;
      }

      transaction.set(
        counterRef,
        {
          last_counter: count,
          date: dateStr,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      return count;
    });

    const paddedCounter = String(nextCounter).padStart(3, '0');
    return `#PG-${dateStr}-${paddedCounter}`;
  }

  /**
   * Validate whether a string conforms to the unique_id format #PG-YYYYMMDD-COUNTER
   * @param {string} uniqueId
   * @returns {boolean}
   */
  validateUniqueIdFormat(uniqueId) {
    if (!uniqueId || typeof uniqueId !== 'string') return false;
    return /^#PG-\d{8}-\d{3,}$/.test(uniqueId.trim());
  }

  /**
   * Verify a given unique_id against the counters collection
   * @param {string} uniqueId
   * @returns {Promise<{ valid: boolean, counterId?: string, dateStr?: string, counter?: number, lastCounter?: number, counterDocExists: boolean, reason?: string }>}
   */
  async verifyUniqueIdAgainstCounter(uniqueId) {
    if (!this.validateUniqueIdFormat(uniqueId)) {
      return { valid: false, counterDocExists: false, reason: 'Invalid format. Must match #PG-YYYYMMDD-COUNTER' };
    }

    const clean = uniqueId.trim();
    const parts = clean.split('-');
    const dateStr = parts[1];
    const counterNum = parseInt(parts[2], 10);
    const counterId = `pengiriman_${dateStr}`;

    const counterDoc = await db.collection('counters').doc(counterId).get();
    if (!counterDoc.exists) {
      return {
        valid: false,
        counterId,
        dateStr,
        counter: counterNum,
        counterDocExists: false,
        reason: `No counter document found for date ${dateStr} (ID: ${counterId})`,
      };
    }

    const lastCounter = counterDoc.data().last_counter || 0;
    const isValid = counterNum <= lastCounter;

    return {
      valid: isValid,
      counterId,
      dateStr,
      counter: counterNum,
      lastCounter,
      counterDocExists: true,
      reason: isValid ? 'Counter verified' : `Counter ${counterNum} exceeds latest recorded counter ${lastCounter}`,
    };
  }

  /**
   * Ensure a shipment has a unique_id, generating one via counters if missing
   * @param {Pengiriman} shipment
   * @returns {Promise<string>}
   */
  async ensureUniqueId(shipment) {
    if (shipment.unique_id && this.validateUniqueIdFormat(shipment.unique_id)) {
      if (!shipment.counters_id) {
        const dateStr = shipment.unique_id.split('-')[1];
        const countersId = `pengiriman_${dateStr}`;
        await this.collection.doc(shipment.id).update({
          counters_id: countersId,
          updatedAt: new Date(),
        });
        shipment.counters_id = countersId;
      }
      return shipment.unique_id;
    }

    const generatedId = await this.generateUniqueId(shipment.tanggal || new Date());
    const dateStr = generatedId.split('-')[1];
    const countersId = `pengiriman_${dateStr}`;

    await this.collection.doc(shipment.id).update({
      unique_id: generatedId,
      counters_id: countersId,
      updatedAt: new Date(),
    });
    shipment.unique_id = generatedId;
    shipment.counters_id = countersId;
    return generatedId;
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
    const uniqueId = await this.generateUniqueId(pengirimanData.tanggal || now);
    const dateStr = uniqueId.split('-')[1];
    const countersId = `pengiriman_${dateStr}`;

    const calculatedQtyKirim = itemsData.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    const dataToSave = {
      unique_id: uniqueId,
      counters_id: countersId,
      tanggal: pengirimanData.tanggal || now,
      lapak_id: pengirimanData.lapak_id.trim(),
      created_by: pengirimanData.created_by.trim(),
      status: pengirimanData.status || PENGIRIMAN_STATUS.DRAFT,
      total_items: itemsData.length,
      qty_kirim: calculatedQtyKirim,
      total_qty: calculatedQtyKirim,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(docRef, dataToSave);

    // Attach generated shipment ID and unique_id to all detail records
    const itemsWithPengirimanId = itemsData.map((item) => ({
      ...item,
      pengiriman_id: docRef.id,
      pengiriman_unique_id: uniqueId,
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
   * Find shipment by unique_id (#PG-YYYYMMDD-COUNTER)
   * @param {string} uniqueId
   * @returns {Promise<Pengiriman|null>}
   */
  async findByUniqueId(uniqueId) {
    if (!uniqueId) return null;
    const snapshot = await this.collection.where('unique_id', '==', uniqueId.trim()).limit(1).get();
    if (snapshot.empty) return null;
    return Pengiriman.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Find shipment by Document ID or unique_id (#PG-...)
   * Dual lookup compatibility
   * @param {string} id
   * @returns {Promise<Pengiriman|null>}
   */
  async findById(id) {
    if (!id) return null;
    const cleanId = typeof id === 'string' ? id.trim() : id;
    if (typeof cleanId === 'string' && cleanId.startsWith('#PG-')) {
      return this.findByUniqueId(cleanId);
    }
    const doc = await this.collection.doc(cleanId).get();
    return Pengiriman.fromFirestore(doc);
  }

  /**
   * Find multiple shipments by an array of document IDs or unique IDs
   * Efficiently batches requests via db.getAll() with chunking
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Pengiriman>>}
   */
  async findByIds(ids) {
    const map = new Map();
    if (!ids || !Array.isArray(ids) || ids.length === 0) return map;

    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    const standardDocIds = [];
    const customUniqueIds = [];

    uniqueIds.forEach((id) => {
      const clean = id.trim();
      if (clean.startsWith('#PG-')) {
        customUniqueIds.push(clean);
      } else {
        standardDocIds.push(clean);
      }
    });

    // 1. Process standard document IDs via getAll
    if (standardDocIds.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < standardDocIds.length; i += chunkSize) {
        const chunk = standardDocIds.slice(i, i + chunkSize);
        const refs = chunk.map((id) => this.collection.doc(id));
        const snapshots = await db.getAll(...refs);

        snapshots.forEach((doc) => {
          const pengiriman = Pengiriman.fromFirestore(doc);
          if (pengiriman) {
            map.set(doc.id, pengiriman);
            if (pengiriman.unique_id) {
              map.set(pengiriman.unique_id, pengiriman);
            }
          }
        });
      }
    }

    // 2. Process custom unique IDs via query
    if (customUniqueIds.length > 0) {
      for (const customId of customUniqueIds) {
        if (!map.has(customId)) {
          const p = await this.findByUniqueId(customId);
          if (p) {
            map.set(p.id, p);
            map.set(customId, p);
          }
        }
      }
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
    const snap = await this.collection.where('lapak_id', '==', lapakId.trim()).count().get();
    return snap.data().count;
  }

  /**
   * Count how many shipments reference a specific created_by user ID
   * Used for referential integrity enforcement on user deletion
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countByCreatedBy(userId) {
    if (!userId) return 0;
    const snap = await this.collection.where('created_by', '==', userId.trim()).count().get();
    return snap.data().count;
  }

  /**
   * Count how many shipments reference a specific counter document
   * Used for referential integrity enforcement on counter deletion
   * @param {string} countersId e.g. 'pengiriman_20261004'
   * @returns {Promise<number>}
   */
  async countByCountersId(countersId) {
    if (!countersId) return 0;
    const cleanId = countersId.trim();

    // 1. Direct match on counters_id
    const snap = await this.collection.where('counters_id', '==', cleanId).count().get();
    if (snap.data().count > 0) {
      return snap.data().count;
    }

    // 2. Direct match on legacy counter_id for backwards compatibility
    const legacySnap = await this.collection.where('counter_id', '==', cleanId).count().get();
    if (legacySnap.data().count > 0) {
      return legacySnap.data().count;
    }

    // 3. Fallback check by date in unique_id if older documents don't have counters_id explicitly
    const parts = cleanId.split('_');
    if (parts.length >= 2 && /^\d{8}$/.test(parts[1])) {
      const dateStr = parts[1];
      const prefix = `#PG-${dateStr}-`;
      const prefixSnap = await this.collection
        .where('unique_id', '>=', prefix)
        .where('unique_id', '<=', prefix + '\uf8ff')
        .count()
        .get();
      return prefixSnap.data().count;
    }

    return 0;
  }

  /**
   * Alias for backwards compatibility
   */
  async countByCounterId(countersId) {
    return await this.countByCountersId(countersId);
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

    if (filters.tanggal) {
      const targetDateStr = typeof filters.tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.tanggal.trim())
        ? filters.tanggal.trim()
        : getLocalDateString(filters.tanggal);

      return list.filter((p) => {
        if (!p.tanggal) return false;
        const pDate = p.tanggal instanceof Date ? p.tanggal : new Date(p.tanggal);
        return getLocalDateString(pDate) === targetDateStr;
      });
    }

    return list;
  }

  /**
   * Update shipment metadata (e.g., lapak_id, tanggal)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Pengiriman>}
   */
  async update(id, updateData) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const docRef = this.collection.doc(existing.id);
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
    const existing = await this.findById(id);
    if (!existing) return null;

    const docRef = this.collection.doc(existing.id);
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
    const existing = await this.findById(id);
    if (!existing) return false;
    await this.collection.doc(existing.id).delete();
    return true;
  }
}

module.exports = new PengirimanRepository();
