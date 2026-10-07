const absensiService = require('../services/absensi.service');
const { uploadImageBuffer, deleteCloudinaryAsset } = require('../utils/cloudinary');
const { assertValidImageFile } = require('../utils/fileValidation');
const { BadRequestError, ForbiddenError } = require('../errors/AppError');
const { ADMIN_ROLES } = require('../constants/roles');

/**
 * Absensi Controller
 * Handles HTTP requests for staff attendance and delegates to AbsensiService.
 * Safely guards against orphaned Cloudinary uploads by pre-validating formats & resources
 * and rolling back Cloudinary assets if downstream database operations fail.
 */
class AbsensiController {
  /**
   * POST /api/v1/absensi
   * Record clock-in for staff
   */
  async clockIn(req, res) {
    // 1. Support JSON object if sent as stringified multipart field
    if (typeof req.body.lokasi_masuk === 'string' && req.body.lokasi_masuk.startsWith('{')) {
      try {
        req.body.lokasi_masuk = JSON.parse(req.body.lokasi_masuk);
      } catch {
        // Leave as string if not valid JSON
      }
    }

    // 2. Pre-validate image file format & magic bytes BEFORE touching Cloudinary
    let uploadRes = null;
    if (req.file) {
      assertValidImageFile(req.file, 'foto');
      uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_absensi_foto' });
      req.body.foto_masuk_url = uploadRes.secure_url;
    }

    try {
      const created = await absensiService.clockIn(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Attendance recorded (clock-in) successfully.',
        data: created,
      });
    } catch (err) {
      // Rollback Cloudinary asset if attendance creation failed
      if (uploadRes && uploadRes.public_id) {
        await deleteCloudinaryAsset(uploadRes.public_id, 'image');
      }
      throw err;
    }
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

    // 1. Verify existence before uploading
    await absensiService.getAbsensiById(id);

    let uploadRes = null;
    if (req.file) {
      assertValidImageFile(req.file, 'foto');
      uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_absensi_foto' });
      req.body.foto_masuk_url = uploadRes.secure_url;
    }

    try {
      const updated = await absensiService.updateAbsensi(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully.',
        data: updated,
      });
    } catch (err) {
      if (uploadRes && uploadRes.public_id) {
        await deleteCloudinaryAsset(uploadRes.public_id, 'image');
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/absensi/:id/foto
   * Dedicated file upload endpoint for attendance clock-in photo
   */
  async uploadFoto(req, res) {
    const { id } = req.params;

    // 1. Pre-validate attendance document existence BEFORE touching Cloudinary
    const existing = await absensiService.getAbsensiById(id);

    // 2. Ownership / authorization check
    const currentUser = req.user;
    const isPrivileged = currentUser && ((typeof currentUser.isAdmin === 'function' && currentUser.isAdmin()) || ADMIN_ROLES.includes(currentUser.role));
    const recordUserId = existing.user ? existing.user.id : existing.user_id;
    if (!isPrivileged && currentUser && recordUserId && currentUser.id !== recordUserId) {
      throw new ForbiddenError('You can only upload an attendance photo for your own attendance record.');
    }

    // 3. Strict format and magic bytes validation
    if (!req.file || !req.file.buffer) {
      throw new BadRequestError('Valid image file is required.');
    }
    assertValidImageFile(req.file, 'foto');

    // 4. Upload to Cloudinary
    const uploadRes = await uploadImageBuffer(req.file.buffer, { folder: 'pot_absensi_foto' });

    // 5. Update attendance record with automatic rollback on error
    try {
      const updated = await absensiService.updateAbsensi(id, {
        foto_masuk_url: uploadRes.secure_url,
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance photo uploaded successfully.',
        data: updated,
      });
    } catch (err) {
      if (uploadRes && uploadRes.public_id) {
        await deleteCloudinaryAsset(uploadRes.public_id, 'image');
      }
      throw err;
    }
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
