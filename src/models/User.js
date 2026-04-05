const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static findAll() {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
      )
      .all();
  }

  static findById(id) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?'
      )
      .get(id);
  }

  static findByEmail(email) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static create({ name, email, password, role = 'viewer' }) {
    const db = getDb();
    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(name, email, hashedPassword, role);

    return User.findById(result.lastInsertRowid);
  }

  static updateRole(id, role) {
    const db = getDb();
    db.prepare(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(role, id);

    return User.findById(id);
  }

  static updateStatus(id, status) {
    const db = getDb();
    db.prepare(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, id);

    return User.findById(id);
  }

  static delete(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
}

module.exports = User;
