const penjualanDetailRepository = require('../repositories/penjualanDetail.repository');
const produkRepository = require('../repositories/produk.repository');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * PenjualanDetail Service
 * Handles read queries for sales line items and enriches them with structured product objects.
 */
class PenjualanDetailService {
  /**
   * Retrieve all sales detail items as a flat list enriched with product objects
   * @param {Object} filters { penjualan_id, produk_id }
   * @returns {Promise<Array<Object>>}
   */
  async getAllDetails(filters = {}) {
    const details = await penjualanDetailRepository.findAll(filters);
    if (!details || details.length === 0) return [];

    const uniqueProductIds = [...new Set(details.map((d) => d.produk_id).filter(Boolean))];
    const productMap = await produkRepository.findByIds(uniqueProductIds);

    return details.map((d) => {
      d.produk = productMap.get(d.produk_id) || null;
      return d.toJSON();
    });
  }

  /**
   * Retrieve single sales detail item by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getDetailById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Detail ID is required.');
    }

    const detail = await penjualanDetailRepository.findById(id);
    if (!detail) {
      throw new NotFoundError(`Sales detail with ID '${id}' was not found.`);
    }

    if (detail.produk_id) {
      detail.produk = await produkRepository.findById(detail.produk_id);
    }

    return detail.toJSON();
  }
}

module.exports = new PenjualanDetailService();
