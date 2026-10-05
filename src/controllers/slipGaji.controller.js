const slipGajiService = require('../services/slipGaji.service');
const { assertValidPdfFile } = require('../utils/fileValidation');

/**
 * Slip Gaji Controller
 * Handles HTTP requests for salary slip document management and Cloudinary PDF uploads.
 */
class SlipGajiController {
  /**
   * POST /api/v1/slip-gaji
   * Create new slip gaji record
   */
  async create(req, res) {
    const created = await slipGajiService.createSlipGaji(req.body);
    return res.status(201).json({
      success: true,
      message: 'Slip gaji record created successfully.',
      data: created,
    });
  }

  /**
   * GET /api/v1/slip-gaji
   * Retrieve all slip gaji records with optional filtering
   */
  async getAll(req, res) {
    const { payroll_id, tanggal } = req.query;
    const list = await slipGajiService.getAllSlipGaji({
      payroll_id,
      tanggal,
    });

    return res.status(200).json({
      success: true,
      message: 'Slip gaji records retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/slip-gaji/:id
   * Retrieve single slip gaji record by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const item = await slipGajiService.getSlipGajiById(id);
    return res.status(200).json({
      success: true,
      message: 'Slip gaji record retrieved successfully.',
      data: item,
    });
  }

  /**
   * POST /api/v1/slip-gaji/:id/file
   * Upload PDF document to Cloudinary and auto-patch file_url & tanggal
   */
  async uploadFile(req, res) {
    const { id } = req.params;
    assertValidPdfFile(req.file, 'file');

    const updated = await slipGajiService.uploadFile(id, req.file.buffer);
    return res.status(200).json({
      success: true,
      message: 'Salary slip PDF uploaded successfully.',
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/slip-gaji/:id
   * Delete slip gaji record
   */
  async delete(req, res) {
    const { id } = req.params;
    await slipGajiService.deleteSlipGaji(id);
    return res.status(200).json({
      success: true,
      message: 'Slip gaji record deleted successfully.',
    });
  }
}

module.exports = new SlipGajiController();
