const { db } = require('../firebase');
const { ConflictError, NotFoundError } = require('../errors/AppError');

/**
 * Counter Repository
 * Handles atomic sequence counters in the 'counters' collection
 * Document ID format: 'pengiriman_YYYYMMDD'
 */
class CounterRepository {
  constructor() {
    this.collection = db.collection('counters');
  }

  /**
   * Find a counter document by its document ID (e.g. 'pengiriman_20261004')
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id || typeof id !== 'string') return null;
    const doc = await this.collection.doc(id.trim()).get();
    if (!doc.exists) return null;
    const data = doc.data();
    delete data.counter_id;
    return {
      id: doc.id,
      ...data,
    };
  }

  /**
   * Find a counter document by date string (e.g. '20261004')
   * @param {string} dateStr
   * @returns {Promise<Object|null>}
   */
  async findByDate(dateStr) {
    if (!dateStr) return null;
    return await this.findById(`pengiriman_${dateStr.trim()}`);
  }

  /**
   * Atomically increment and retrieve the next sequence counter for a given date
   * @param {string} dateStr 'YYYYMMDD'
   * @returns {Promise<number>} next counter value
   */
  async increment(dateStr) {
    const counterDocId = `pengiriman_${dateStr}`;
    const counterRef = this.collection.doc(counterDocId);

    const nextCounter = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let count = 1;

      if (counterDoc.exists) {
        const data = counterDoc.data();
        count = (data.last_counter || 0) + 1;
      } else {
        // Self-healing: only query if counter document was deleted
        // Uses targeted indexed prefix range query
        const prefix = `#PG-${dateStr}-`;
        const existingDocs = await db.collection('pengiriman')
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

    return nextCounter;
  }

  /**
   * Batch find multiple counter documents by array of IDs
   * @param {Array<string>} ids
   * @returns {Promise<Map<string, Object>>} Map of id -> counter data
   */
  async findByIds(ids) {
    const map = new Map();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return map;
    }

    const uniqueIds = [...new Set(ids.filter(Boolean).map((id) => id.trim()))];
    if (uniqueIds.length === 0) {
      return map;
    }

    const chunkSize = 30;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const docRefs = chunk.map((id) => this.collection.doc(id));
      const snapshots = await db.getAll(...docRefs);

      snapshots.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();
          delete data.counter_id;
          map.set(doc.id, {
            id: doc.id,
            ...data,
          });
        }
      });
    }

    return map;
  }

  /**
   * Check if any shipments reference a specific counter document
   * @param {string} counterId e.g. 'pengiriman_20261004'
   * @returns {Promise<number>}
   */
  async countReferencingShipments(countersId) {
    if (!countersId) return 0;
    const cleanId = countersId.trim();

    // 1. Query by explicit counters_id
    const snapshot = await db.collection('pengiriman').where('counters_id', '==', cleanId).get();
    if (!snapshot.empty) {
      return snapshot.size;
    }

    // 2. Query by legacy counter_id for backwards compatibility
    const legacySnapshot = await db.collection('pengiriman').where('counter_id', '==', cleanId).get();
    if (!legacySnapshot.empty) {
      return legacySnapshot.size;
    }

    // 2. Fallback check by date derived from counterId using indexed prefix range
    const parts = cleanId.split('_');
    if (parts.length >= 2 && /^\d{8}$/.test(parts[1])) {
      const dateStr = parts[1];
      const prefix = `#PG-${dateStr}-`;
      const prefixSnap = await db.collection('pengiriman')
        .where('unique_id', '>=', prefix)
        .where('unique_id', '<=', prefix + '\uf8ff')
        .get();
      return prefixSnap.size;
    }

    return 0;
  }

  /**
   * Referential Integrity Conflict Check for Counters
   * Throws ConflictError if any shipments reference this counter
   * @param {string} counterId e.g. 'pengiriman_20261004'
   * @throws {ConflictError}
   */
  async checkConflict(counterId) {
    const referencingCount = await this.countReferencingShipments(counterId);
    if (referencingCount > 0) {
      throw new ConflictError(
        `Cannot delete counter '${counterId}': it is currently referenced by ${referencingCount} shipment(s). Deleting this counter would corrupt sequential numbering.`
      );
    }
    return true;
  }

  /**
   * Delete a counter document with referential integrity enforcement
   * @param {string} id e.g. 'pengiriman_20261004'
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    if (!id || typeof id !== 'string') {
      throw new NotFoundError('Counter ID is required.');
    }
    const cleanId = id.trim();

    const existing = await this.findById(cleanId);
    if (!existing) {
      throw new NotFoundError(`Counter with ID '${cleanId}' was not found.`);
    }

    // Referential integrity check - throws ConflictError if referenced
    await this.checkConflict(cleanId);

    await this.collection.doc(cleanId).delete();
    return true;
  }

  /**
   * Retrieve all counter documents
   * @returns {Promise<Array<Object>>}
   */
  async findAll() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      delete data.counter_id;
      return {
        id: doc.id,
        ...data,
      };
    });
  }
}

module.exports = new CounterRepository();
