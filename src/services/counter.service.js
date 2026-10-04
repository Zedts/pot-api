const counterRepository = require('../repositories/counter.repository');
const { NotFoundError, BadRequestError } = require('../errors/AppError');

/**
 * Counter Service
 * Encapsulates business logic, inspection, and referential integrity conflict checks for counters.
 */
class CounterService {
  /**
   * Retrieve all sequence counters enriched with referencing shipments count
   * @returns {Promise<Array<Object>>}
   */
  async getAllCounters() {
    const counters = await counterRepository.findAll();
    return await Promise.all(
      counters.map(async (c) => {
        const count = await counterRepository.countReferencingShipments(c.id);
        return {
          ...c,
          referencing_shipments_count: count,
        };
      })
    );
  }

  /**
   * Retrieve a single counter by document ID
   * @param {string} id e.g. 'pengiriman_20261004'
   * @returns {Promise<Object>}
   */
  async getCounterById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Counter ID is required.');
    }

    const counter = await counterRepository.findById(id.trim());
    if (!counter) {
      throw new NotFoundError(`Counter with ID '${id}' was not found.`);
    }

    const referencingCount = await counterRepository.countReferencingShipments(id.trim());
    return {
      ...counter,
      referencing_shipments_count: referencingCount,
    };
  }

  /**
   * Check if a counter has referential conflicts
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async checkConflict(id) {
    return await counterRepository.checkConflict(id);
  }

  /**
   * Delete counter with referential integrity enforcement
   * Throws ConflictError if any shipments reference this counter
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteCounter(id) {
    return await counterRepository.delete(id);
  }
}

module.exports = new CounterService();
