const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { VALID_ROLES } = require('../constants/roles');
const { VALID_USER_STATUSES } = require('../constants/userStatus');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../errors/AppError');

/**
 * User Service
 * Encapsulates core business rules, validation, hashing, and workflows for user management.
 */
class UserService {
  /**
   * Retrieve all users with optional filters
   * @param {Object} filters
   * @returns {Promise<Array<User>>}
   */
  async getAllUsers(filters = {}) {
    const { role, status } = filters;
    const queryFilters = {};

    if (role) {
      const lowerRole = role.toLowerCase().trim();
      if (!VALID_ROLES.includes(lowerRole)) {
        throw new BadRequestError(`Invalid role filter. Allowed roles: ${VALID_ROLES.join(', ')}.`);
      }
      queryFilters.role = lowerRole;
    }

    if (status) {
      const lowerStatus = status.toLowerCase().trim();
      if (!VALID_USER_STATUSES.includes(lowerStatus)) {
        throw new BadRequestError(`Invalid status filter. Allowed statuses: ${VALID_USER_STATUSES.join(', ')}.`);
      }
      queryFilters.status = lowerStatus;
    }

    return await userRepository.findAll(queryFilters);
  }

  /**
   * Retrieve single user by ID
   * @param {string} id
   * @returns {Promise<User>}
   */
  async getUserById(id) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('User ID is required.');
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' was not found.`);
    }

    return user;
  }

  /**
   * Update user details
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<User>}
   */
  async updateUser(id, updateData) {
    const existingUser = await this.getUserById(id);

    const payload = {};

    if (updateData.nama !== undefined) {
      if (!updateData.nama || typeof updateData.nama !== 'string' || updateData.nama.trim().length < 2) {
        throw new BadRequestError('Nama must be at least 2 characters.');
      }
      payload.nama = updateData.nama.trim();
    }

    if (updateData.role !== undefined) {
      const lowerRole = updateData.role.toLowerCase().trim();
      if (!VALID_ROLES.includes(lowerRole)) {
        throw new BadRequestError(`Invalid role '${updateData.role}'. Allowed roles are strictly: ${VALID_ROLES.join(', ')}.`);
      }
      payload.role = lowerRole;
    }

    if (updateData.status !== undefined) {
      const lowerStatus = updateData.status.toLowerCase().trim();
      if (!VALID_USER_STATUSES.includes(lowerStatus)) {
        throw new BadRequestError(`Invalid status '${updateData.status}'. Allowed statuses are: ${VALID_USER_STATUSES.join(', ')}.`);
      }
      payload.status = lowerStatus;
    }

    if (updateData.no_hp !== undefined) {
      const cleanedPhone = updateData.no_hp.trim();
      if (cleanedPhone !== existingUser.no_hp) {
        const phoneHolder = await userRepository.findByPhone(cleanedPhone);
        if (phoneHolder && phoneHolder.id !== id) {
          throw new ConflictError(`The phone number '${cleanedPhone}' is already in use by another account.`);
        }
        payload.no_hp = cleanedPhone;
      }
    }

    if (updateData.password !== undefined) {
      if (typeof updateData.password !== 'string' || updateData.password.length < 6) {
        throw new BadRequestError('Password must be at least 6 characters long.');
      }
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(updateData.password, salt);
    }

    if (Object.keys(payload).length === 0) {
      return existingUser;
    }

    return await userRepository.update(id, payload);
  }

  /**
   * Update user role specifically (Admin dedicated operation)
   * @param {string} id
   * @param {string} role
   * @returns {Promise<User>}
   */
  async updateUserRole(id, role) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestError('User ID is required.');
    }

    if (!role || typeof role !== 'string') {
      throw new BadRequestError('Role is required.');
    }

    const lowerRole = role.toLowerCase().trim();
    if (!VALID_ROLES.includes(lowerRole)) {
      throw new BadRequestError(
        `Invalid role '${role}'. Allowed roles are strictly: ${VALID_ROLES.join(', ')}.`
      );
    }

    // Verify user exists before updating
    await this.getUserById(id);

    return await userRepository.update(id, { role: lowerRole });
  }

  /**
   * Delete a user by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteUser(id) {
    // Ensure user exists before deleting
    await this.getUserById(id);
    return await userRepository.delete(id);
  }
}

module.exports = new UserService();
