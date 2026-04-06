const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

class AuthService {
  static register({ name, email, password, role }) {
    // Check if email already exists
    const existing = User.findByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409, 'CONFLICT');
    }

    const user = User.create({ name, email, password, role });
    const token = AuthService.generateToken(user);

    return { user, token };
  }

  static login({ email, password }) {
    const user = User.findByEmail(email);

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      throw new AppError('Account has been deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    const isMatch = User.comparePassword(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    const token = AuthService.generateToken(userWithoutPassword);

    return { user: userWithoutPassword, token };
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-fallback-secret-here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }
}

module.exports = AuthService;
