const Lapak = require('../models/lapak.model');
const lapakRepository = require('../repositories/lapak.repository');
const userRepository = require('../repositories/user.repository');
const pengirimanRepository = require('../repositories/pengiriman.repository');
const stokLapakRepository = require('../repositories/stokLapak.repository');
const penjualanRepository = require('../repositories/penjualan.repository');
const absensiRepository = require('../repositories/absensi.repository');
const closingRepository = require('../repositories/closing.repository');
const { ROLES } = require('../constants/roles');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

/**
 * Lapak Service
 * Encapsulates core business rules, validation, and operations for Lapak.
 */
class LapakService {
  /**
   * Batch enrich a list of Lapak entities with their related SPG user info
   * @param {Array<Lapak>} lapakList
   * @returns {Promise<Array<Lapak>>}
   */
  async enrichLapakList(lapakList) {
    if (!lapakList || lapakList.length === 0) return [];

    const lapakIds = lapakList.map((l) => l.id).filter(Boolean);
    const spgIds = [...new Set(lapakList.map((l) => l.spg_id).filter(Boolean))];

    const [usersMap, lapakUsersMap] = await Promise.all([
      userRepository.findByIds(spgIds),
      userRepository.findByLapakIds(lapakIds),
    ]);

    return lapakList.map((lapak) => {
      const spgUser = lapak.spg_id ? usersMap.get(lapak.spg_id) : null;
      lapak.spg = spgUser ? Lapak.formatSpg(spgUser) : null;
      const assignedUsers = lapakUsersMap.get(lapak.id) || [];
      lapak.users = assignedUsers.map((u) => Lapak.formatUser(u)).filter(Boolean);
      return lapak;
    });
  }

  /**
   * Create a new lapak
   * @param {Object} data { nama, lokasi, keterangan, spg_id }
   * @returns {Promise<Lapak>}
   */
  async createLapak({ nama, lokasi, keterangan = '', spg_id = null }) {
    if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
      throw new BadRequestError('Field "nama" is required and must be at least 2 characters long.');
    }

    if (!lokasi || typeof lokasi !== 'string' || !lokasi.trim()) {
      throw new BadRequestError('Field "lokasi" is required.');
    }

    const cleanSpgId = spg_id ? spg_id.trim() : null;
    let spgUser = null;

    if (cleanSpgId) {
      spgUser = await userRepository.findById(cleanSpgId);
      if (!spgUser) {
        throw new NotFoundError(`User with ID '${cleanSpgId}' was not found.`);
      }
      if (spgUser.role !== ROLES.SPG) {
        throw new BadRequestError(`Assigned user must have the 'spg' role. User '${spgUser.nama}' has role '${spgUser.role}'.`);
      }
    }

    const newLapak = await lapakRepository.create({
      nama: nama.trim(),
      lokasi: lokasi.trim(),
      keterangan: keterangan ? keterangan.trim() : '',
      spg_id: cleanSpgId,
    });

    // Bidirectional sync: assign lapak_id on target user
    if (cleanSpgId) {
      if (spgUser.lapak_id && spgUser.lapak_id !== newLapak.id) {
        const oldLapak = await lapakRepository.findById(spgUser.lapak_id);
        if (oldLapak && oldLapak.spg_id === cleanSpgId) {
          await lapakRepository.update(oldLapak.id, { spg_id: null });
        }
      }
      await userRepository.update(cleanSpgId, { lapak_id: newLapak.id });
    }

    newLapak.spg = spgUser ? Lapak.formatSpg(spgUser) : null;
    newLapak.users = spgUser ? [Lapak.formatUser(spgUser)] : [];
    return newLapak;
  }

  /**
   * Retrieve all lapak
   * @returns {Promise<Array<Lapak>>}
   */
  async getAllLapak() {
    const list = await lapakRepository.findAll();
    return await this.enrichLapakList(list);
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

    const [spgUser, assignedUsers] = await Promise.all([
      lapak.spg_id ? userRepository.findById(lapak.spg_id) : null,
      userRepository.findByLapakId(id),
    ]);

    lapak.spg = spgUser ? Lapak.formatSpg(spgUser) : null;
    lapak.users = (assignedUsers || []).map((u) => Lapak.formatUser(u)).filter(Boolean);

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

    if (updateData.spg_id !== undefined) {
      const cleanSpgId = updateData.spg_id ? updateData.spg_id.trim() : null;
      if (cleanSpgId !== existing.spg_id) {
        if (cleanSpgId) {
          const spgUser = await userRepository.findById(cleanSpgId);
          if (!spgUser) {
            throw new NotFoundError(`User with ID '${cleanSpgId}' was not found.`);
          }
          if (spgUser.role !== ROLES.SPG) {
            throw new BadRequestError(
              `Assigned user must have the 'spg' role. User '${spgUser.nama}' has role '${spgUser.role}'.`
            );
          }
        }
        payload.spg_id = cleanSpgId;
      }
    }

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    const updatedLapak = await lapakRepository.update(id, payload);

    // Bidirectional sync: update user.lapak_id
    if (payload.spg_id !== undefined) {
      const oldSpgId = existing.spg_id;
      const newSpgId = payload.spg_id;

      // 1. Unassign previous SPG
      if (oldSpgId && oldSpgId !== newSpgId) {
        const prevUser = await userRepository.findById(oldSpgId);
        if (prevUser && prevUser.lapak_id === id) {
          await userRepository.update(oldSpgId, { lapak_id: null });
        }
      }

      // 2. Assign new SPG
      if (newSpgId) {
        const targetUser = await userRepository.findById(newSpgId);
        if (targetUser) {
          // If new SPG was assigned to another lapak, clear old lapak's spg_id
          if (targetUser.lapak_id && targetUser.lapak_id !== id) {
            const oldLapak = await lapakRepository.findById(targetUser.lapak_id);
            if (oldLapak && oldLapak.spg_id === newSpgId) {
              await lapakRepository.update(oldLapak.id, { spg_id: null });
            }
          }
          await userRepository.update(newSpgId, { lapak_id: id });
        }
      }
    }

    const [spgUser, assignedUsers] = await Promise.all([
      updatedLapak.spg_id ? userRepository.findById(updatedLapak.spg_id) : null,
      userRepository.findByLapakId(id),
    ]);
    updatedLapak.spg = spgUser ? Lapak.formatSpg(spgUser) : null;
    updatedLapak.users = (assignedUsers || []).map((u) => Lapak.formatUser(u)).filter(Boolean);

    return updatedLapak;
  }

  /**
   * Delete lapak by ID
   * Prevents orphaned shipments by blocking deletion if lapak is referenced by any shipment
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteLapak(id) {
    const existing = await this.getLapakById(id);

    // Referential integrity checks: ensure no shipment or inventory references this lapak
    const shipmentCount = await pengirimanRepository.countByLapakId(id);
    if (shipmentCount > 0) {
      throw new ConflictError(
        `Cannot delete lapak: it is currently referenced by ${shipmentCount} shipment(s). Please reassign or delete the associated shipments first.`
      );
    }

    const stockCount = await stokLapakRepository.countByLapakId(id);
    if (stockCount > 0) {
      throw new ConflictError(
        `Cannot delete lapak: it is currently referenced by ${stockCount} inventory record(s). Please clear or archive associated stock records first.`
      );
    }

    const salesCount = await penjualanRepository.countByLapakId(id);
    if (salesCount > 0) {
      throw new ConflictError(
        `Cannot delete lapak: it is currently referenced by ${salesCount} sales transaction(s). Please archive or delete the associated transactions first.`
      );
    }

    const attendanceCount = await absensiRepository.countByLapakId(id);
    if (attendanceCount > 0) {
      throw new ConflictError(
        `Cannot delete lapak: it is currently referenced by ${attendanceCount} attendance record(s). Please archive or delete the associated attendance records first.`
      );
    }

    const closingCount = await closingRepository.countByLapakId(id);
    if (closingCount > 0) {
      throw new ConflictError(
        `Cannot delete lapak: it is currently referenced by ${closingCount} closing record(s). Please archive or delete the associated closing records first.`
      );
    }

    // Bidirectional sync: clear lapak_id for assigned SPG
    if (existing.spg_id) {
      const user = await userRepository.findById(existing.spg_id);
      if (user && user.lapak_id === id) {
        await userRepository.update(existing.spg_id, { lapak_id: null });
      }
    }

    // Also clear any other user referencing this lapak_id
    const assignedUsers = await userRepository.findByLapakId(id);
    for (const u of assignedUsers) {
      if (u.id !== existing.spg_id) {
        await userRepository.update(u.id, { lapak_id: null });
      }
    }

    return await lapakRepository.delete(id);
  }
}

module.exports = new LapakService();
