const bcrypt = require('bcryptjs');
const { auth } = require('../firebase');
const userRepository = require('../repositories/user.repository');
const lapakRepository = require('../repositories/lapak.repository');
const pengirimanRepository = require('../repositories/pengiriman.repository');
const { ROLES, VALID_ROLES, ADMIN_ROLES } = require('../constants/roles');
const { VALID_STATUSES } = require('../constants/status');
const { PERMISSIONS } = require('../constants/permissions');
const { isValidEmail } = require('../utils/validators');
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
    const { role, status, lapak_id } = filters;
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
      if (!VALID_STATUSES.includes(lowerStatus)) {
        throw new BadRequestError(`Invalid status filter. Allowed statuses: ${VALID_STATUSES.join(', ')}.`);
      }
      queryFilters.status = lowerStatus;
    }

    if (lapak_id) {
      queryFilters.lapak_id = lapak_id.trim();
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
      const isPrivileged = ADMIN_ROLES.includes(currentUser.role) || (currentUser.isAdmin && currentUser.isAdmin());
      const canUpdateLapak = PERMISSIONS.USER?.UPDATE_LAPAK?.includes(currentUser.role);

      if (!isPrivileged && !isSelf) {
        throw new ForbiddenError('Forbidden: You can only update your own user profile.');
      }

      if (!isPrivileged && (updateData.role !== undefined || updateData.status !== undefined)) {
        throw new ForbiddenError('Forbidden: Only administrators or owners can modify user role or account status.');
      }

      if (updateData.lapak_id !== undefined && !canUpdateLapak) {
        throw new ForbiddenError('Forbidden: Only administrators or owners can modify user lapak assignment.');
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

    if (updateData.username !== undefined) {
      const cleanUsername = updateData.username.trim();
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
        throw new BadRequestError('Username must be 3-30 characters containing only letters, numbers, and underscores.');
      }
      if (cleanUsername !== existingUser.username) {
        const holder = await userRepository.findByUsername(cleanUsername);
        if (holder && holder.id !== id) {
          throw new ConflictError(`The username '${cleanUsername}' is already in use by another account.`);
        }
        payload.username = cleanUsername;
      }
    }

    if (updateData.email !== undefined) {
      const cleanEmail = updateData.email.toLowerCase().trim();
      if (!isValidEmail(cleanEmail)) {
        throw new BadRequestError('Email must be a valid email address.');
      }
      if (cleanEmail !== existingUser.email) {
        const holder = await userRepository.findByEmail(cleanEmail);
        if (holder && holder.id !== id) {
          throw new ConflictError(`The email '${cleanEmail}' is already in use by another account.`);
        }
        payload.email = cleanEmail;
      }
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
      if (!VALID_STATUSES.includes(lowerStatus)) {
        throw new BadRequestError(`Invalid status '${updateData.status}'. Allowed statuses are: ${VALID_STATUSES.join(', ')}.`);
      }
      payload.status = lowerStatus;
    }

    if (updateData.lapak_id !== undefined) {
      const cleanLapakId = updateData.lapak_id ? updateData.lapak_id.trim() : null;
      if (cleanLapakId !== existingUser.lapak_id) {
        if (cleanLapakId) {
          const targetLapak = await lapakRepository.findById(cleanLapakId);
          if (!targetLapak) {
            throw new NotFoundError(`Lapak with ID '${cleanLapakId}' was not found.`);
          }
        }
        payload.lapak_id = cleanLapakId;
      }
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

    // Synchronize displayName, email, or password updates to Firebase Auth if applicable
    const authUpdates = {};
    if (payload.nama) authUpdates.displayName = payload.nama;
    if (payload.email) authUpdates.email = payload.email;
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

    const updatedUser = await userRepository.update(id, payload);

    // Bidirectional sync: if lapak_id was modified and user is an SPG, keep lapak.spg_id consistent
    if (payload.lapak_id !== undefined) {
      const oldLapakId = existingUser.lapak_id;
      const newLapakId = payload.lapak_id;

      // 1. If user previously had a lapak, clear old lapak's spg_id if it referenced this user
      if (oldLapakId && oldLapakId !== newLapakId) {
        const oldLapak = await lapakRepository.findById(oldLapakId);
        if (oldLapak && oldLapak.spg_id === id) {
          await lapakRepository.update(oldLapakId, { spg_id: null });
        }
      }

      // 2. If new lapak assigned and user is SPG, point target lapak.spg_id to this user
      if (newLapakId) {
        const targetLapak = await lapakRepository.findById(newLapakId);
        if (targetLapak && targetLapak.spg_id !== id) {
          // If target lapak had another SPG, unassign that previous SPG's lapak_id
          if (targetLapak.spg_id) {
            const previousSpg = await userRepository.findById(targetLapak.spg_id);
            if (previousSpg && previousSpg.id !== id) {
              await userRepository.update(previousSpg.id, { lapak_id: null });
            }
          }
          await lapakRepository.update(newLapakId, { spg_id: id });
        }
      }
    }

    return updatedUser;
  }

  /**
   * Update user lapak assignment specifically (Admin/Owner operation)
   * @param {string} id Target user ID
   * @param {string|null} lapakId New lapak ID or null
   * @param {Object} currentUser Authenticated caller context
   * @returns {Promise<User>}
   */
  async updateUserLapak(id, lapakId, currentUser) {
    return await this.updateUser(id, { lapak_id: lapakId }, currentUser);
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

    // 3. Clear any lapak assignment where this user is the assigned SPG
    const assignedLapak = await lapakRepository.findBySpgId(id);
    if (assignedLapak) {
      await lapakRepository.update(assignedLapak.id, { spg_id: null });
    }

    // 4. Delete user from Firebase Authentication
    let authDeleted = false;

    try {
      await auth.deleteUser(id);
      authDeleted = true;
    } catch (fbErr) {
      if (fbErr.code !== 'auth/user-not-found') {
        console.error(`[AUTH_DELETE_ERROR] Failed to delete auth user with UID '${id}':`, fbErr.message);
        throw new InternalServerError(`Failed to delete Firebase Authentication account: ${fbErr.message}`);
      }
    }

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

    // 5. Delete from Firestore database
    return await userRepository.delete(id);
  }
}

module.exports = new UserService();
