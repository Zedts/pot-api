const lapakRepository = require('../repositories/lapak.repository');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * Lapak Service
 * Encapsulates core business rules, validation, and operations for Lapak.
 */
class LapakService {
  /**
   * Create a new lapak
   * @param {Object} data { nama, lokasi, keterangan }
   * @returns {Promise<Lapak>}
   */
  async createLapak({ nama, lokasi, keterangan = '' }) {
    if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
      throw new BadRequestError('Field "nama" is required and must be at least 2 characters long.');
    }

    if (!lokasi || typeof lokasi !== 'string' || !lokasi.trim()) {
      throw new BadRequestError('Field "lokasi" is required.');
    }

    return await lapakRepository.create({
      nama: nama.trim(),
      lokasi: lokasi.trim(),
      keterangan: keterangan ? keterangan.trim() : '',
    });
  }

  /**
   * Retrieve all lapak
   * @returns {Promise<Array<Lapak>>}
   */
  async getAllLapak() {
    return await lapakRepository.findAll();
  }

  /**
   * Retrieve single lapak by ID
   * @param {string} id
   * @returns {Promise<Lapak>}
   */
  async getLapakById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Lapak ID is required.');
    }

    const lapak = await lapakRepository.findById(id);
    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${id}' was not found.`);
    }

    return lapak;
  }

  /**
   * Update lapak details
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Lapak>}
   */
  async updateLapak(id, updateData) {
    const existing = await this.getLapakById(id);

    const payload = {};

    if (updateData.nama !== undefined) {
      if (!updateData.nama || typeof updateData.nama !== 'string' || updateData.nama.trim().length < 2) {
        throw new BadRequestError('Field "nama" must be at least 2 characters long.');
      }
      payload.nama = updateData.nama.trim();
    }

    if (updateData.lokasi !== undefined) {
      if (!updateData.lokasi || typeof updateData.lokasi !== 'string' || !updateData.lokasi.trim()) {
        throw new BadRequestError('Field "lokasi" cannot be empty.');
      }
      payload.lokasi = updateData.lokasi.trim();
    }

    if (updateData.keterangan !== undefined) {
      if (typeof updateData.keterangan !== 'string') {
        throw new BadRequestError('Field "keterangan" must be a string.');
      }
      payload.keterangan = updateData.keterangan.trim();
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    return await lapakRepository.update(id, payload);
  }

  /**
   * Delete lapak by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteLapak(id) {
    await this.getLapakById(id);
    return await lapakRepository.delete(id);
  }
}

module.exports = new LapakService();
