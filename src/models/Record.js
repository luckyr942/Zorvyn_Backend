const { getDb } = require('../config/database');

class Record {
  static create({ amount, type, category, date, description, created_by }) {
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO records (amount, type, category, date, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(amount, type, category, date, description || null, created_by);

    return Record.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const db = getDb();
    return db
      .prepare(
        `SELECT r.*, u.name as created_by_name
         FROM records r
         LEFT JOIN users u ON r.created_by = u.id
         WHERE r.id = ? AND r.is_deleted = 0`
      )
      .get(id);
  }

  static findAll({
    type,
    category,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 20,
    sort = 'date',
    order = 'desc',
  } = {}) {
    const db = getDb();
    const conditions = ['r.is_deleted = 0'];
    const params = [];

    if (type) {
      conditions.push('r.type = ?');
      params.push(type);
    }

    if (category) {
      conditions.push('r.category = ?');
      params.push(category);
    }

    if (startDate) {
      conditions.push('r.date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('r.date <= ?');
      params.push(endDate);
    }

    if (search) {
      conditions.push('r.description LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Whitelist sort columns and order direction
    const allowedSorts = ['date', 'amount', 'category', 'type', 'created_at'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'date';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total
    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM records r WHERE ${whereClause}`)
      .get(...params);

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Fetch records
    const records = db
      .prepare(
        `SELECT r.*, u.name as created_by_name
         FROM records r
         LEFT JOIN users u ON r.created_by = u.id
         WHERE ${whereClause}
         ORDER BY r.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static update(id, { amount, type, category, date, description }) {
    const db = getDb();
    const fields = [];
    const params = [];

    if (amount !== undefined) {
      fields.push('amount = ?');
      params.push(amount);
    }
    if (type !== undefined) {
      fields.push('type = ?');
      params.push(type);
    }
    if (category !== undefined) {
      fields.push('category = ?');
      params.push(category);
    }
    if (date !== undefined) {
      fields.push('date = ?');
      params.push(date);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      params.push(description);
    }

    if (fields.length === 0) {
      return Record.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(
      `UPDATE records SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`
    ).run(...params);

    return Record.findById(id);
  }

  static softDelete(id) {
    const db = getDb();
    const result = db
      .prepare(
        'UPDATE records SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0'
      )
      .run(id);

    return result.changes > 0;
  }
}

module.exports = Record;
