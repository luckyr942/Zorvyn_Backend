const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

class UserService {
  static getAllUsers() {
    return User.findAll();
  }

  static getUserById(id) {
    const user = User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return user;
  }

  static updateUserRole(id, role) {
    const user = User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return User.updateRole(id, role);
  }

  static updateUserStatus(id, status) {
    const user = User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return User.updateStatus(id, status);
  }

  static deleteUser(id, requestingUserId) {
    if (id === requestingUserId) {
      throw new AppError('Cannot delete your own account', 400, 'BAD_REQUEST');
    }

    const user = User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return User.delete(id);
  }
}

module.exports = UserService;
