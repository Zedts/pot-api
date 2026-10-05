const payrollRepository = require('../repositories/payroll.repository');
const userRepository = require('../repositories/user.repository');
const slipGajiRepository = require('../repositories/slipGaji.repository');
const { PAYROLL_STATUS } = require('../constants/payrollStatus');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

/**
 * Payroll Service
 * Encapsulates salary computation, net pay calculations, monthly payroll status lifecycle,
 * and relational user enrichment.
 */
class PayrollService {
  /**
   * Create a new payroll record
   * @param {Object} data
   * @returns {Promise<Object>} Enriched payroll record
   */
  async createPayroll(data) {
    const userId = data.user_id ? data.user_id.trim() : '';
    if (!userId) {
      throw new BadRequestError('Field "user_id" is required.');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID '${userId}' was not found.`);
    }

    const periode = data.periode ? data.periode.trim() : '';
    if (!periode) {
      throw new BadRequestError('Field "periode" is required (e.g. "YYYY-MM").');
    }

    const hariKerja = Number(data.hari_kerja || 0);
    const totalPenjualan = Number(data.total_penjualan || 0);
    const gajiPokok = Number(data.gaji_pokok || 0);
    const bonusPenjualan = Number(data.bonus_penjualan || 0);
    const lembur = Number(data.lembur || 0);
    const potongan = Number(data.potongan || 0);
    const kasbon = Number(data.kasbon || 0);

    // Calculated net salary formula: (gaji_pokok + bonus_penjualan + lembur) - (potongan + kasbon)
    const totalGaji = (gajiPokok + bonusPenjualan + lembur) - (potongan + kasbon);

    const status = data.status || PAYROLL_STATUS.DRAFT;

    const created = await payrollRepository.create({
      user_id: userId,
      periode,
      hari_kerja: hariKerja,
      total_penjualan: totalPenjualan,
      gaji_pokok: gajiPokok,
      bonus_penjualan: bonusPenjualan,
      lembur,
      potongan,
      kasbon,
      total_gaji: totalGaji,
      status,
    });

    return await this.getPayrollById(created.id);
  }

  /**
   * Retrieve all payroll records with optional filtering and relational user enrichment
   * @param {Object} filters { user_id, periode, status }
   * @returns {Promise<Array<Object>>}
   */
  async getAllPayroll(filters = {}) {
    const list = await payrollRepository.findAll(filters);
    if (!list || list.length === 0) return [];

    const uniqueUserIds = [...new Set(list.map((p) => p.user_id).filter(Boolean))];
    const usersMap = await userRepository.findByIds(uniqueUserIds);

    return list.map((p) => {
      p.user = usersMap.get(p.user_id) || null;
      return p.toJSON();
    });
  }

  /**
   * Retrieve single payroll record by ID with relational user enrichment
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPayrollById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Payroll ID is required.');
    }

    const payroll = await payrollRepository.findById(id);
    if (!payroll) {
      throw new NotFoundError(`Payroll record with ID '${id}' was not found.`);
    }

    if (payroll.user_id) {
      payroll.user = await userRepository.findById(payroll.user_id);
    }

    return payroll.toJSON();
  }

  /**
   * Update payroll record and recompute net salary if numeric components change
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updatePayroll(id, updateData) {
    const existing = await payrollRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Payroll record with ID '${id}' was not found.`);
    }

    const payload = {};

    if (updateData.periode !== undefined) payload.periode = updateData.periode.trim();
    if (updateData.hari_kerja !== undefined) payload.hari_kerja = Number(updateData.hari_kerja);
    if (updateData.total_penjualan !== undefined) payload.total_penjualan = Number(updateData.total_penjualan);
    if (updateData.gaji_pokok !== undefined) payload.gaji_pokok = Number(updateData.gaji_pokok);
    if (updateData.bonus_penjualan !== undefined) payload.bonus_penjualan = Number(updateData.bonus_penjualan);
    if (updateData.lembur !== undefined) payload.lembur = Number(updateData.lembur);
    if (updateData.potongan !== undefined) payload.potongan = Number(updateData.potongan);
    if (updateData.kasbon !== undefined) payload.kasbon = Number(updateData.kasbon);

    // Recompute total_gaji if any salary component is modified
    const currentGajiPokok = payload.gaji_pokok !== undefined ? payload.gaji_pokok : existing.gaji_pokok;
    const currentBonus = payload.bonus_penjualan !== undefined ? payload.bonus_penjualan : existing.bonus_penjualan;
    const currentLembur = payload.lembur !== undefined ? payload.lembur : existing.lembur;
    const currentPotongan = payload.potongan !== undefined ? payload.potongan : existing.potongan;
    const currentKasbon = payload.kasbon !== undefined ? payload.kasbon : existing.kasbon;

    payload.total_gaji = (currentGajiPokok + currentBonus + currentLembur) - (currentPotongan + currentKasbon);

    await payrollRepository.update(id, payload);
    return await this.getPayrollById(id);
  }

  /**
   * Update payroll status (draft -> published)
   * @param {string} id
   * @param {string} newStatus
   * @returns {Promise<Object>}
   */
  async updateStatus(id, newStatus) {
    const existing = await payrollRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Payroll record with ID '${id}' was not found.`);
    }

    if (!Object.values(PAYROLL_STATUS).includes(newStatus)) {
      throw new BadRequestError(`Invalid status '${newStatus}'. Allowed: ${Object.values(PAYROLL_STATUS).join(', ')}`);
    }

    await payrollRepository.update(id, { status: newStatus });
    return await this.getPayrollById(id);
  }

  /**
   * Delete payroll record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deletePayroll(id) {
    const existing = await payrollRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Payroll record with ID '${id}' was not found.`);
    }

    const existingSlip = await slipGajiRepository.findByPayrollId(id);
    if (existingSlip) {
      throw new ConflictError(
        `Cannot delete payroll: it is currently referenced by an existing salary slip (ID: '${existingSlip.id}'). Please delete the salary slip first.`
      );
    }

    await payrollRepository.delete(id);
    return true;
  }
}

module.exports = new PayrollService();
