const payrollService = require('../services/payroll.service');

/**
 * Payroll Controller
 * Handles HTTP requests for employee monthly payroll management.
 */
class PayrollController {
  /**
   * POST /api/v1/payroll
   * Create new payroll record
   */
  async create(req, res) {
    const created = await payrollService.createPayroll(req.body);
    return res.status(201).json({
      success: true,
      message: 'Payroll record created successfully.',
      data: created,
    });
  }

  /**
   * GET /api/v1/payroll
   * Retrieve all payroll records with optional filtering
   */
  async getAll(req, res) {
    const { user_id, periode, status } = req.query;
    const list = await payrollService.getAllPayroll({
      user_id,
      periode,
      status,
    });

    return res.status(200).json({
      success: true,
      message: 'Payroll records retrieved successfully.',
      count: list.length,
      data: list,
    });
  }

  /**
   * GET /api/v1/payroll/:id
   * Retrieve single payroll record by ID
   */
  async getById(req, res) {
    const { id } = req.params;
    const item = await payrollService.getPayrollById(id);
    return res.status(200).json({
      success: true,
      message: 'Payroll record retrieved successfully.',
      data: item,
    });
  }

  /**
   * PUT /api/v1/payroll/:id
   * Update payroll record
   */
  async update(req, res) {
    const { id } = req.params;
    const updated = await payrollService.updatePayroll(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Payroll record updated successfully.',
      data: updated,
    });
  }

  /**
   * PATCH /api/v1/payroll/:id/status
   * Update payroll status (draft -> published)
   */
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await payrollService.updateStatus(id, status);
    return res.status(200).json({
      success: true,
      message: `Payroll status updated to '${status}' successfully.`,
      data: updated,
    });
  }

  /**
   * DELETE /api/v1/payroll/:id
   * Delete payroll record
   */
  async delete(req, res) {
    const { id } = req.params;
    await payrollService.deletePayroll(id);
    return res.status(200).json({
      success: true,
      message: 'Payroll record deleted successfully.',
    });
  }
}

module.exports = new PayrollController();
