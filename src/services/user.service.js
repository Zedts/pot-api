const bcrypt = require('bcryptjs');
const { auth } = require('../firebase');
const userRepository = require('../repositories/user.repository');
const pengirimanRepository = require('../repositories/pengiriman.repository');
const { VALID_ROLES } = require('../constants/roles');
const { VALID_USER_STATUSES } = require('../constants/userStatus');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
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
   * @param {Object} [currentUser] Optional authenticated user context
   * @returns {Promise<User>}
   */
  async updateUser(id, updateData, currentUser) {
    if (currentUser) {
      const isSelf = currentUser.id === id || currentUser.uid === id;
      const isAdmin = currentUser.role === 'admin';

      if (!isAdmin && !isSelf) {
        throw new ForbiddenError('Forbidden: You can only update your own user profile.');
      }

      if (!isAdmin && (updateData.role !== undefined || updateData.status !== undefined)) {
        throw new ForbiddenError('Forbidden: Only administrators can modify user role or account status.');
      }
    }

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

    // Synchronize displayName or password updates to Firebase Auth if applicable
    const authUpdates = {};
    if (payload.nama) authUpdates.displayName = payload.nama;
    if (updateData.password) authUpdates.password = updateData.password;

    if (Object.keys(authUpdates).length > 0) {
      try {
        await auth.updateUser(id, authUpdates);
      } catch (fbErr) {
        if (fbErr.code !== 'auth/user-not-found') {
          console.warn(`[AUTH_UPDATE_WARN] Could not sync user updates to Firebase Auth for UID '${id}':`, fbErr.message);
        }
      }
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
   * Delete a user by ID from both Firebase Authentication and Firestore
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteUser(id) {
    // 1. Ensure user exists in Firestore
    const user = await this.getUserById(id);

    // 2. Referential integrity check: prevent deleting user if they have created shipments
    const referencingShipmentsCount = await pengirimanRepository.countByCreatedBy(id);
    if (referencingShipmentsCount > 0) {
      throw new ConflictError(
        `Cannot delete user: this user is associated with ${referencingShipmentsCount} shipment record(s). Please reassign or delete the associated shipments first.`
      );
    }

    // 3. Delete user from Firebase Authentication
    let authDeleted = false;

    // Primary attempt: delete by Firestore doc ID (which matches Firebase Auth UID)
    try {
      await auth.deleteUser(id);
      authDeleted = true;
    } catch (fbErr) {
      if (fbErr.code !== 'auth/user-not-found') {
        console.error(`[AUTH_DELETE_ERROR] Failed to delete auth user with UID '${id}':`, fbErr.message);
        throw new InternalServerError(`Failed to delete Firebase Authentication account: ${fbErr.message}`);
      }
    }

    // Fallback attempt: if not found by UID but user has an email, find by email and delete
    if (!authDeleted && user.email) {
      try {
        const fbUser = await auth.getUserByEmail(user.email);
        if (fbUser && fbUser.uid) {
          await auth.deleteUser(fbUser.uid);
        }
      } catch (fbErr) {
        if (fbErr.code !== 'auth/user-not-found') {
          console.error(`[AUTH_DELETE_ERROR] Failed to delete auth user with email '${user.email}':`, fbErr.message);
          throw new InternalServerError(`Failed to delete Firebase Authentication account: ${fbErr.message}`);
        }
      }
    }

    // 3. Delete from Firestore database
    return await userRepository.delete(id);
  }
}

module.exports = new UserService();
