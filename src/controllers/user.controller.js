const userService = require('../services/user.service');

/**
 * User Controller
 * Handles HTTP requests and delegates to the User Service.
 */
class UserController {
  /**
   * GET /api/v1/users
   * Retrieve all users with optional query filtering (Admin only)
   */
  async getAllUsers(req, res) {
    const { role, status, lapak_id } = req.query;
    const users = await userService.getAllUsers({ role, status, lapak_id });
    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      count: users.length,
      data: users.map((u) => u.toJSON()),
    });
  }

  /**
   * GET /api/v1/users/:id
   * Retrieve single user by ID
   */
  async getUserById(req, res) {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully.',
      data: user.toJSON(),
    });
  }

  /**
   * PUT /api/v1/users/:id
   * Update an existing user
   */
  async updateUser(req, res) {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUser.toJSON(),
    });
  }

  /**
   * PATCH /api/v1/users/:id/role
   * Update a user's role (Admin only)
   */
  async updateUserRole(req, res) {
    const { id } = req.params;
    const { role } = req.body;
    const updatedUser = await userService.updateUserRole(id, role);
    return res.status(200).json({
      success: true,
      message: `User role has been successfully updated to '${role}'.`,
      data: updatedUser.toJSON(),
    });
  }

  /**
   * PATCH /api/v1/users/:id/lapak
   * Update a user's lapak assignment (Admin / Owner only)
   */
  async updateUserLapak(req, res) {
    const { id } = req.params;
    const { lapak_id } = req.body;
    const updatedUser = await userService.updateUserLapak(id, lapak_id, req.user);
    return res.status(200).json({
      success: true,
      message: lapak_id
        ? `User lapak assignment updated successfully to '${lapak_id}'.`
        : 'User lapak assignment cleared successfully.',
      data: updatedUser.toJSON(),
    });
  }

  /**
   * DELETE /api/v1/users/:id
   * Delete a user (Admin only)
   */
  async deleteUser(req, res) {
    const { id } = req.params;
    await userService.deleteUser(id);
    return res.status(200).json({
      success: true,
      message: `User with ID '${id}' has been successfully deleted.`,
    });
  }
}

module.exports = new UserController();
