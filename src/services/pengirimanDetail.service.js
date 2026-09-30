const pengirimanDetailRepository = require('../repositories/pengirimanDetail.repository');
const pengirimanRepository = require('../repositories/pengiriman.repository');
const lapakRepository = require('../repositories/lapak.repository');
const produkRepository = require('../repositories/produk.repository');
const userRepository = require('../repositories/user.repository');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * PengirimanDetail Service
 * Encapsulates read, inspection, and response processing operations for shipment details.
 */
class PengirimanDetailService {
  /**
   * Process flat detail items by grouping all detail items with the same pengiriman_id
   * into a single shipment entry enriched with shipment metadata (tanggal, nama lapak, created_by user object, status, total_qty).
   *
   * @param {Array<PengirimanDetail>} details Flat list of shipment detail records
   * @returns {Promise<Array<Object>>} Grouped shipment objects
   */
  async groupDetailsByPengiriman(details) {
    if (!details || !Array.isArray(details) || details.length === 0) {
      return [];
    }

    // 1. Collect unique IDs for batch fetching
    const uniquePengirimanIds = [...new Set(details.map((d) => d.pengiriman_id).filter(Boolean))];
    const uniqueProdukIds = [...new Set(details.map((d) => d.produk_id).filter(Boolean))];

    // 2. Concurrently batch fetch shipments and products
    const [shipmentsMap, produkMap] = await Promise.all([
      pengirimanRepository.findByIds(uniquePengirimanIds),
      produkRepository.findByIds(uniqueProdukIds),
    ]);

    // 3. Collect unique lapak IDs and creator user IDs from retrieved shipments
    const uniqueLapakIds = [
      ...new Set(Array.from(shipmentsMap.values()).map((s) => s.lapak_id).filter(Boolean)),
    ];
    const uniqueUserIds = [
      ...new Set(Array.from(shipmentsMap.values()).map((s) => s.created_by).filter(Boolean)),
    ];

    // Concurrently batch fetch lapak records and user creator profiles
    const [lapakMap, usersMap] = await Promise.all([
      lapakRepository.findByIds(uniqueLapakIds),
      userRepository.findByIds(uniqueUserIds),
    ]);

    // 4. Group detail items by pengiriman_id while maintaining chronological ordering
    const groupedMap = new Map();

    for (const detail of details) {
      const pengirimanId = detail.pengiriman_id;

      if (!groupedMap.has(pengirimanId)) {
        const shipment = shipmentsMap.get(pengirimanId);
        const lapak = shipment ? lapakMap.get(shipment.lapak_id) : null;
        const creatorUser = shipment && shipment.created_by ? usersMap.get(shipment.created_by) : null;

        // Structured created_by object containing id, nama, and email
        const creatorObject = shipment && shipment.created_by
          ? {
              id: shipment.created_by,
              nama: creatorUser ? creatorUser.nama : null,
              email: creatorUser ? creatorUser.email : null,
            }
          : null;

        groupedMap.set(pengirimanId, {
          pengiriman_id: pengirimanId,
          tanggal: shipment && shipment.tanggal
            ? (shipment.tanggal.toISOString ? shipment.tanggal.toISOString() : shipment.tanggal)
            : null,
          nama: lapak ? lapak.nama : null,
          created_by: creatorObject,
          status: shipment ? shipment.status : null,
          total_qty: 0,
          items: [],
        });
      }

      // Retrieve nama_kategori through related produk data using produk_id
      const relatedProduct = produkMap.get(detail.produk_id);
      const namaKategori = (relatedProduct && relatedProduct.nama_kategori)
        ? relatedProduct.nama_kategori
        : (detail.nama_kategori || null);

      // Construct item object: excludes kategori_id directly and omits duplicate pengiriman_id
      const itemData = {
        id: detail.id,
        produk_id: detail.produk_id,
        qty: detail.qty,
        nama_produk: detail.nama_produk,
        harga_produk: detail.harga_produk,
        jenis_satuan: detail.jenis_satuan,
        nama_kategori: namaKategori,
        createdAt: detail.createdAt
          ? (detail.createdAt.toISOString ? detail.createdAt.toISOString() : detail.createdAt)
          : null,
        updatedAt: detail.updatedAt
          ? (detail.updatedAt.toISOString ? detail.updatedAt.toISOString() : detail.updatedAt)
          : null,
      };

      groupedMap.get(pengirimanId).items.push(itemData);
    }

    // 5. Compute total_qty by aggregating qty across all items for each shipment
    for (const shipmentEntry of groupedMap.values()) {
      shipmentEntry.total_qty = shipmentEntry.items.reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0
      );
    }

    return Array.from(groupedMap.values());
  }

  /**
   * Retrieve all shipment detail records with optional filters, grouped by shipment
   * @param {Object} filters { pengiriman_id, produk_id }
   * @returns {Promise<Array<Object>>} Grouped shipment objects with items
   */
  async getAllDetails(filters = {}) {
    const rawDetails = await pengirimanDetailRepository.findAll(filters);
    return await this.groupDetailsByPengiriman(rawDetails);
  }

  /**
   * Retrieve single shipment detail by ID
   * Ensures nama_kategori is retrieved from related product if needed and omits kategori_id
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getDetailById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Detail ID is required.');
    }

    const detail = await pengirimanDetailRepository.findById(id);
    if (!detail) {
      throw new NotFoundError(`Shipment detail with ID '${id}' was not found.`);
    }

    // Retrieve nama_kategori through related produk data if missing
    if (!detail.nama_kategori && detail.produk_id) {
      const product = await produkRepository.findById(detail.produk_id);
      if (product) {
        detail.nama_kategori = product.nama_kategori;
      }
    }

    return detail.toJSON();
  }
}

module.exports = new PengirimanDetailService();
