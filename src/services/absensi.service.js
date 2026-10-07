const absensiRepository = require('../repositories/absensi.repository');
const lapakService = require('./lapak.service');
const lapakRepository = require('../repositories/lapak.repository');
const userRepository = require('../repositories/user.repository');
const { ADMIN_ROLES } = require('../constants/roles');
const { ABSENSI_STATUS } = require('../constants/absensiStatus');
const { parseDateOrDefault } = require('../utils/validators');
const { getLocalDateString, getLocalTimeParts } = require('../utils/timezone');
const { BadRequestError, NotFoundError, ConflictError, ForbiddenError } = require('../errors/AppError');

/**
 * Absensi Service
 * Encapsulates attendance business rules, clock-in, clock-out, daily uniqueness,
 * and relational enrichment with User and Lapak entities.
 */
class AbsensiService {
  /**
   * Clock-in / record daily staff attendance
   * @param {Object} data { lapak_id, tanggal, lokasi_masuk, foto_masuk_url, status, keterangan }
   * @param {Object} currentUser Authenticated caller
   * @returns {Promise<Object>} Enriched attendance record
   */
  async clockIn(data, currentUser) {
    const userId = currentUser ? currentUser.id : null;
    if (!userId) {
      throw new BadRequestError('Authenticated user is required for attendance recording.');
    }

    const targetLapakId = data.lapak_id || (currentUser ? currentUser.lapak_id : null);
    if (!targetLapakId) {
      throw new BadRequestError('Field "lapak_id" is required (user must have an assigned stall).');
    }

    // 1. Verify target lapak exists and has valid coordinates set (exempt for izin)
    const isIzin = (data.status || '').toLowerCase() === ABSENSI_STATUS.IZIN;
    const lapak = await lapakService.getLapakById(targetLapakId);
    if (!lapak) {
      throw new NotFoundError(`Lapak with ID '${targetLapakId}' was not found.`);
    }
    if (!isIzin && (lapak.latitude === null || lapak.longitude === null)) {
      throw new BadRequestError('Lokasi koordinat lapak belum ditentukan oleh Admin. Presensi dinonaktifkan.');
    }

    // 2. Resolve check-in timestamp (accepting client device time with server sanity check)
    let jamMasuk = new Date();
    if (data.jam_masuk) {
      const parsedClientTime = parseDateOrDefault(data.jam_masuk, false);
      if (parsedClientTime) {
        // Sanity check: allow within 15 minutes of server time
        const diffMinutes = Math.abs(Date.now() - parsedClientTime.getTime()) / (1000 * 60);
        if (diffMinutes <= 15) {
          jamMasuk = parsedClientTime;
        }
      }
    }

    // 3. Resolve date in Indonesian local time (Asia/Jakarta, WIB)
    let tanggal;
    if (data.tanggal && typeof data.tanggal === 'string' && data.tanggal.trim()) {
      tanggal = data.tanggal.trim();
    } else {
      tanggal = getLocalDateString(jamMasuk);
    }

    // 4. Calculate attendance status (08:00 WIB late cutoff)
    let finalStatus = isIzin ? ABSENSI_STATUS.IZIN : ABSENSI_STATUS.HADIR;
    if (!isIzin) {
      const { hour, minute } = getLocalTimeParts(jamMasuk);
      const isLate = hour > 8 || (hour === 8 && minute > 0);
      finalStatus = isLate ? ABSENSI_STATUS.TERLAMBAT : ABSENSI_STATUS.HADIR;
    }

    // 5. Prevent duplicate clock-in for the same user on the same date
    const existing = await absensiRepository.findByUserAndDate(userId, tanggal);
    if (existing) {
      throw new ConflictError(`User has already clocked in on date '${tanggal}'. Record ID: '${existing.id}'.`);
    }

    // 6. Create attendance document
    const created = await absensiRepository.create({
      user_id: userId,
      lapak_id: targetLapakId,
      tanggal,
      jam_masuk: isIzin ? null : jamMasuk,
      jam_pulang: null,
      lokasi_masuk: data.lokasi_masuk || null,
      foto_masuk_url: data.foto_masuk_url || null,
      status: finalStatus,
      keterangan: data.keterangan || '',
    });

    return await this.getAbsensiById(created.id);
  }

  /**
   * Clock-out: record jam_pulang on an existing attendance document
   * @param {string} id
   * @param {Object} currentUser Authenticated caller
   * @returns {Promise<Object>} Enriched updated attendance record
   */
  async clockOut(id, currentUser, data = {}) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Attendance ID is required.');
    }

    const existing = await absensiRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Attendance record with ID '${id}' was not found.`);
    }

    // Ownership check: user can only clock out their own record unless caller is admin/owner
    const isPrivileged = currentUser && ((typeof currentUser.isAdmin === 'function' && currentUser.isAdmin()) || ADMIN_ROLES.includes(currentUser.role));
    if (!isPrivileged && currentUser.id !== existing.user_id) {
      throw new ForbiddenError('You can only record clock-out for your own attendance record.');
    }

    if (existing.jam_pulang) {
      throw new BadRequestError(`Clock-out has already been recorded for this attendance entry at ${existing.jam_pulang}.`);
    }

    let jamPulang = new Date();
    if (data && data.jam_pulang) {
      const parsedClientTime = parseDateOrDefault(data.jam_pulang, false);
      if (parsedClientTime) {
        const diffMinutes = Math.abs(Date.now() - parsedClientTime.getTime()) / (1000 * 60);
        if (diffMinutes <= 15) {
          jamPulang = parsedClientTime;
        }
      }
    }

    await absensiRepository.update(id, {
      jam_pulang: jamPulang,
    });

    return await this.getAbsensiById(id);
  }

  /**
   * Retrieve all attendance records with optional filtering and relational enrichment
   * @param {Object} filters { user_id, lapak_id, tanggal, status }
   * @returns {Promise<Array<Object>>}
   */
  async getAllAbsensi(filters = {}) {
    const normalizedFilters = { ...filters };
    if (normalizedFilters.tanggal) {
      const parsed = new Date(normalizedFilters.tanggal);
      if (!isNaN(parsed.getTime())) {
        normalizedFilters.tanggal = getLocalDateString(parsed);
      }
    }

    const list = await absensiRepository.findAll(normalizedFilters);
    if (!list || list.length === 0) return [];

    const uniqueLapakIds = [...new Set(list.map((a) => a.lapak_id).filter(Boolean))];
    const uniqueUserIds = [...new Set(list.map((a) => a.user_id).filter(Boolean))];

    const [lapakMap, usersMap] = await Promise.all([
      lapakRepository.findByIds(uniqueLapakIds),
      userRepository.findByIds(uniqueUserIds),
    ]);

    await lapakService.enrichLapakList(Array.from(lapakMap.values()));

    return list.map((a) => {
      a.lapak = lapakMap.get(a.lapak_id) || null;
      a.user = usersMap.get(a.user_id) || null;
      return a.toJSON();
    });
  }

  /**
   * Retrieve single attendance record by ID with populated relations
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getAbsensiById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Attendance ID is required.');
    }

    const attendance = await absensiRepository.findById(id);
    if (!attendance) {
      throw new NotFoundError(`Attendance record with ID '${id}' was not found.`);
    }

    const [lapak, user] = await Promise.all([
      attendance.lapak_id ? lapakService.getLapakById(attendance.lapak_id) : null,
      attendance.user_id ? userRepository.findById(attendance.user_id) : null,
    ]);

    attendance.lapak = lapak;
    attendance.user = user;

    return attendance.toJSON();
  }

  /**
   * Update attendance record (Admin / correction operation)
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateAbsensi(id, updateData) {
    const existing = await this.getAbsensiById(id);

    const payload = {};
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.lokasi_masuk !== undefined) payload.lokasi_masuk = updateData.lokasi_masuk;
    if (updateData.foto_masuk_url !== undefined) payload.foto_masuk_url = updateData.foto_masuk_url;
    if (updateData.keterangan !== undefined) {
      payload.keterangan = typeof updateData.keterangan === 'string' ? updateData.keterangan.trim() : (updateData.keterangan || '');
    }
    if (updateData.tanggal !== undefined) {
      const parsed = parseDateOrDefault(updateData.tanggal, false);
      if (parsed) payload.tanggal = getLocalDateString(parsed);
    }
    if (updateData.lapak_id !== undefined) {
      const lapak = await lapakService.getLapakById(updateData.lapak_id);
      if (!lapak) throw new NotFoundError(`Lapak with ID '${updateData.lapak_id}' not found.`);
      payload.lapak_id = updateData.lapak_id;
    }
    if (updateData.jam_masuk !== undefined) payload.jam_masuk = new Date(updateData.jam_masuk);
    if (updateData.jam_pulang !== undefined) payload.jam_pulang = updateData.jam_pulang ? new Date(updateData.jam_pulang) : null;

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    await absensiRepository.update(id, payload);
    return await this.getAbsensiById(id);
  }

  /**
   * Delete attendance record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteAbsensi(id) {
    const existing = await absensiRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Attendance record with ID '${id}' was not found.`);
    }

    await absensiRepository.delete(id);
    return true;
  }
}

module.exports = new AbsensiService();
