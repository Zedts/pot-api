const absensiService = require('../services/absensi.service');
const { uploadImageBuffer } = require('../utils/cloudinary');
const { BadRequestError } = require('../errors/AppError');

/**
 * Absensi Controller
 * Handles HTTP requests for staff attendance and delegates to AbsensiService.
 */
class AbsensiController {
  /**
   * POST /api/v1/absensi
   * Record clock-in for staff
   */
  async clockIn(req, res) {
    if (req.file) {
      const uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_absensi_foto' });
      req.body.foto_masuk_url = uploadRes.secure_url;
    }

    // Support JSON object if sent as stringified multipart field
    if (typeof req.body.lokasi_masuk === 'string' && req.body.lokasi_masuk.startsWith('{')) {
      try {
        req.body.lokasi_masuk = JSON.parse(req.body.lokasi_masuk);
      } catch {
        // Leave as string if not valid JSON
      }
    }

    const created = await absensiService.clockIn(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Attendance recorded (clock-in) successfully.',
      data: created,
    });
  }

  /**
   * PATCH /api/v1/absensi/:id/pulang
   * Record clock-out time
   */
  async clockOut(req, res) {
    const { id } = req.params;
    const updated = await absensiService.clockOut(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Attendance updated (clock-out) successfully.',
      data: updated,
    });
  }

  /**
   * GET /api/v1/absensi
   * Retrieve all attendance records with filtering
   */
  async getAllAbsensi(req, res) {
    const { user_id, lapak_id, tanggal, status } = req.query;
    const list = await absensiService.getAllAbsensi({
      user_id,
      lapak_id,
      tanggal,
      status,
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/absensi/:id
   * Retrieve single attendance record by ID
   */
  async getAbsensiById(req, res) {
    const { id } = req.params;
    const item = await absensiService.getAbsensiById(id);
    return res.status(200).json({
      success: true,
      message: 'Attendance record retrieved successfully.',
      data: item,
    });
  }

  /**
   * PUT /api/v1/absensi/:id
   * Update attendance record (Admin / correction)
   */
  async updateAbsensi(req, res) {
    const { id } = req.params;

    if (req.file) {
      const uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_absensi_foto' });
      req.body.foto_masuk_url = uploadRes.secure_url;
    }

    const updated = await absensiService.updateAbsensi(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully.',
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/absensi/:id
   * Delete attendance record (Admin only)
   */
  async deleteAbsensi(req, res) {
    const { id } = req.params;
    await absensiService.deleteAbsensi(id);
    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully.',
    });
  }
}

module.exports = new AbsensiController();
