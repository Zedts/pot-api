const slipGajiRepository = require('../repositories/slipGaji.repository');
const payrollRepository = require('../repositories/payroll.repository');
const userRepository = require('../repositories/user.repository');
const payrollService = require('./payroll.service');
const { uploadPdfBuffer, deleteCloudinaryAsset } = require('../utils/cloudinary');
const { assertValidPdfFile } = require('../utils/fileValidation');
const { BadRequestError, NotFoundError } = require('../errors/AppError');

/**
 * Slip Gaji Service
 * Encapsulates salary slip document management, Cloudinary PDF uploads,
 * automatic date stamping upon file upload, and relational payroll/user enrichment.
 */
class SlipGajiService {
  /**
   * Create a new salary slip record
   * @param {Object} data
   * @returns {Promise<Object>} Enriched slip gaji record
   */
  async createSlipGaji(data) {
    const payrollId = data.payroll_id ? data.payroll_id.trim() : '';
    if (!payrollId) {
      throw new BadRequestError('Field "payroll_id" is required.');
    }

    const payroll = await payrollRepository.findById(payrollId);
    if (!payroll) {
      throw new NotFoundError(`Payroll record with ID '${payrollId}' was not found.`);
    }

    const fileUrl = data.file_url ? data.file_url.trim() : null;
    let tanggal = data.tanggal ? data.tanggal.trim() : null;

    // Tanggal is optional, only populated if file_url is provided
    if (fileUrl && !tanggal) {
      tanggal = new Date().toISOString().split('T')[0];
    }

    const created = await slipGajiRepository.create({
      payroll_id: payrollId,
      file_url: fileUrl,
      tanggal,
    });

    return await this.getSlipGajiById(created.id);
  }

  /**
   * Retrieve all salary slips with optional filtering and relational enrichment
   * @param {Object} filters { payroll_id, tanggal }
   * @returns {Promise<Array<Object>>}
   */
  async getAllSlipGaji(filters = {}) {
    const list = await slipGajiRepository.findAll(filters);
    if (!list || list.length === 0) return [];

    const uniquePayrollIds = [...new Set(list.map((s) => s.payroll_id).filter(Boolean))];
    const payrollsMap = await payrollRepository.findByIds(uniquePayrollIds);

    const uniqueUserIds = [
      ...new Set(Array.from(payrollsMap.values()).map((p) => p.user_id).filter(Boolean)),
    ];
    const usersMap = await userRepository.findByIds(uniqueUserIds);

    for (const p of payrollsMap.values()) {
      if (p.user_id && usersMap.has(p.user_id)) {
        p.user = usersMap.get(p.user_id);
      }
    }

    return list.map((s) => {
      s.payroll = payrollsMap.get(s.payroll_id) || null;
      return s.toJSON();
    });
  }

  /**
   * Retrieve single salary slip record by ID with relational payroll and user enrichment
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getSlipGajiById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('Slip Gaji ID is required.');
    }

    const slip = await slipGajiRepository.findById(id);
    if (!slip) {
      throw new NotFoundError(`Slip gaji record with ID '${id}' was not found.`);
    }

    if (slip.payroll_id) {
      try {
        slip.payroll = await payrollService.getPayrollById(slip.payroll_id);
      } catch {
        slip.payroll = null;
      }
    }

    return slip.toJSON();
  }

  /**
   * Upload PDF document to Cloudinary and patch file_url and tanggal automatically
   * @param {string} id
   * @param {Buffer} fileBuffer
   * @returns {Promise<Object>} Updated slip gaji record
   */
  async uploadFile(id, fileBuffer) {
    // 1. Verify existence before processing
    const existing = await slipGajiRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Slip gaji record with ID '${id}' was not found.`);
    }

    // 2. Strict format and magic bytes validation
    assertValidPdfFile(fileBuffer, 'file');

    const publicId = `slip_gaji_${id}_${Date.now()}`;

    // 3. Upload to Cloudinary
    const uploadResult = await uploadPdfBuffer(fileBuffer, {
      folder: 'pot_slip_gaji',
      public_id: publicId,
    });

    const secureUrl = uploadResult.secure_url || uploadResult.url;
    // Tanggal is automatically stamped with new Date() formatted to YYYY-MM-DD
    const tanggal = new Date().toISOString().split('T')[0];

    // 4. Update repository with rollback if database write fails
    try {
      await slipGajiRepository.update(id, {
        file_url: secureUrl,
        tanggal,
      });
    } catch (dbErr) {
      if (uploadResult && uploadResult.public_id) {
        await deleteCloudinaryAsset(uploadResult.public_id, 'raw');
      }
      throw dbErr;
    }

    return await this.getSlipGajiById(id);
  }

  /**
   * Delete slip gaji record
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteSlipGaji(id) {
    const existing = await slipGajiRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Slip gaji record with ID '${id}' was not found.`);
    }

    await slipGajiRepository.delete(id);
    return true;
  }
}

module.exports = new SlipGajiService();
