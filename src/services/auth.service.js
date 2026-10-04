const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { auth } = require('../firebase');
const userRepository = require('../repositories/user.repository');
const { ROLES } = require('../constants/roles');
const { STATUS } = require('../constants/status');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  InternalServerError,
} = require('../errors/AppError');

/**
 * Authentication Service
 * Manages user registration, email login, Google Sign-In, and 30-day JWT generation.
 */
class AuthService {
  /**
   * Helper: Generate a signed 30-day JWT token
   * @param {User} user
   * @returns {string}
   */
  generateToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerError('JWT_SECRET environment variable is not configured.');
    }

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '30d' } // Exactly 30 days as required
    );
  }

  /**
   * Helper: Generate unique sanitized username from a base string
   * @param {string} base
   * @returns {Promise<string>}
   */
  async generateUniqueUsername(base) {
    let clean = (base || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    if (clean.length < 3) {
      clean = `${clean}_user`;
    }

    let candidate = clean;
    let counter = 1;

    while (await userRepository.findByUsername(candidate)) {
      candidate = `${clean}_${counter}`;
      counter += 1;
    }

    return candidate;
  }

  /**
   * Register a new user with Email, Username, and Password
   */
  async register({ nama, username, email, password, no_hp = '' }) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username ? username.trim() : '';
    const cleanName = nama.trim();
    const cleanPhone = no_hp ? no_hp.trim() : '';

    // 1. Check if username is already taken
    const existingUsername = await userRepository.findByUsername(cleanUsername);
    if (existingUsername) {
      throw new ConflictError(`The username '${cleanUsername}' is already taken.`);
    }

    // 2. Check if user already exists in Firestore by email
    const existingUser = await userRepository.findByEmail(cleanEmail);
    if (existingUser) {
      throw new ConflictError(`An account with email '${cleanEmail}' is already registered.`);
    }

    // 3. Check if phone is already registered (if provided)
    if (cleanPhone) {
      const existingPhone = await userRepository.findByPhone(cleanPhone);
      if (existingPhone) {
        throw new ConflictError(`The phone number '${cleanPhone}' is already in use.`);
      }
    }

    // 4. Create user in Firebase Authentication
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: cleanEmail,
        password,
        displayName: cleanName,
      });
    } catch (fbErr) {
      if (fbErr.code === 'auth/email-already-exists') {
        throw new ConflictError(`An account with email '${cleanEmail}' already exists in Firebase Auth.`);
      }
      throw new BadRequestError(`Firebase Auth error: ${fbErr.message}`);
    }

    // 5. Hash password with bcrypt for secondary storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Store user document in Firestore with Doc ID = Firebase Auth UID
    const newUser = await userRepository.create(
      {
        nama: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        role: ROLES.UNASSIGNED, // Default role for newly registered users is 'unassigned'
        lapak_id: null,
        no_hp: cleanPhone,
        password: hashedPassword,
        status: STATUS.ACTIVE,
        authProvider: 'password',
      },
      firebaseUser.uid
    );

    // 7. Generate 30-day JWT authentication token
    const token = this.generateToken(newUser);

    return {
      token,
      user: newUser.toJSON(),
    };
  }

  /**
   * Log in with Email, Username, or Phone and Password
   */
  async login({ email, username, no_hp, password }) {
    if (!password) {
      throw new BadRequestError('Password is required.');
    }

    let user;

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      let authenticatedUid = null;

      // 1. Authenticate with Firebase Authentication using Web API Key if available
      const webApiKey = process.env.FIREBASE_WEB_API_KEY;
      if (webApiKey) {
        try {
          const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`;
          const fbRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              returnSecureToken: true,
            }),
          });

          const fbData = await fbRes.json();
          if (fbRes.ok && fbData.localId) {
            authenticatedUid = fbData.localId;
          }
        } catch (err) {
          console.warn('[AUTH_FB_SIGNIN_FALLBACK]: Firebase Auth REST API check failed:', err.message);
        }
      }

      // 2. Fetch user from Firestore by email
      user = await userRepository.findByEmail(cleanEmail);

      // 3. Fallback verification with bcrypt if Firebase Web API Key was unavailable or for legacy accounts
      if (!authenticatedUid) {
        if (!user || !user.password) {
          throw new UnauthorizedError('Invalid email or password.');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw new UnauthorizedError('Invalid email or password.');
        }
      } else if (!user) {
        // If authenticated via Firebase Auth but doc not yet in Firestore, find by ID
        user = await userRepository.findById(authenticatedUid);
        if (!user) {
          throw new NotFoundError('User profile not found in database.');
        }
      }
    } else if (username) {
      // Authenticate via username
      const cleanUsername = username.trim();
      user = await userRepository.findByUsername(cleanUsername);
      if (!user || !user.password) {
        throw new UnauthorizedError('Invalid username or password.');
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid username or password.');
      }
    } else if (no_hp) {
      // Authenticate via phone number
      const cleanPhone = no_hp.trim();
      user = await userRepository.findByPhone(cleanPhone);
      if (!user || !user.password) {
        throw new UnauthorizedError('Invalid phone number or password.');
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid phone number or password.');
      }
    } else {
      throw new BadRequestError('Either email, username, or phone number (no_hp) is required for login.');
    }

    // Check if user is active
    if (!user.isActive()) {
      throw new UnauthorizedError('Account is inactive. Please contact support.');
    }

    // Generate 30-day JWT authentication token
    const token = this.generateToken(user);

    return {
      token,
      user: user.toJSON(),
    };
  }

  /**
   * Log in with Google Sign-In (verifies Google ID Token via Firebase Admin)
   */
  async loginWithGoogle({ idToken }) {
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired Google ID token.');
    }

    const { uid, email, name } = decoded;
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    // Look for existing user by UID or email
    let user = await userRepository.findById(uid);
    if (!user && cleanEmail) {
      user = await userRepository.findByEmail(cleanEmail);
    }

    // If first time Google sign-in, create user in Firestore
    if (!user) {
      const generatedUsername = await this.generateUniqueUsername(
        cleanEmail ? cleanEmail.split('@')[0] : (name || 'google_user')
      );

      user = await userRepository.create(
        {
          nama: name || 'Google User',
          username: generatedUsername,
          email: cleanEmail,
          role: ROLES.UNASSIGNED,
          lapak_id: null,
          no_hp: '',
          password: null,
          status: STATUS.ACTIVE,
          authProvider: 'google',
        },
        uid
      );
    }

    if (!user.isActive()) {
      throw new UnauthorizedError('Account is inactive. Please contact support.');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: user.toJSON(),
    };
  }
}

module.exports = new AuthService();
