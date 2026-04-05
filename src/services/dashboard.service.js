const { getDb } = require('../config/database');

class DashboardService {
  static getSummary() {
    const db = getDb();

    const income = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM records WHERE type = 'income' AND is_deleted = 0"
      )
      .get();

    const expenses = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM records WHERE type = 'expense' AND is_deleted = 0"
      )
      .get();

    const recordCount = db
      .prepare(
        'SELECT COUNT(*) as count FROM records WHERE is_deleted = 0'
      )
      .get();

    return {
      totalIncome: income.total,
      totalExpenses: expenses.total,
      netBalance: income.total - expenses.total,
      totalRecords: recordCount.count,
    };
  }

  static getCategoryTotals() {
    const db = getDb();

    const results = db
      .prepare(
        `SELECT category, type,
                SUM(amount) as total,
                COUNT(*) as count
         FROM records
         WHERE is_deleted = 0
         GROUP BY category, type
         ORDER BY total DESC`
      )
      .all();

    return results;
  }

  static getTrends({ period = 'monthly' } = {}) {
    const db = getDb();

    let dateFormat;
    if (period === 'weekly') {
      // Group by year and week number
      dateFormat = "strftime('%Y-W%W', date)";
    } else {
      // Monthly by default
      dateFormat = "strftime('%Y-%m', date)";
    }

    const results = db
      .prepare(
        `SELECT ${dateFormat} as period,
                type,
                SUM(amount) as total,
                COUNT(*) as count
         FROM records
         WHERE is_deleted = 0
         GROUP BY period, type
         ORDER BY period ASC`
      )
      .all();

    return results;
  }

  static getRecentActivity({ limit = 10 } = {}) {
    const db = getDb();

    const records = db
      .prepare(
        `SELECT r.*, u.name as created_by_name
         FROM records r
         LEFT JOIN users u ON r.created_by = u.id
         WHERE r.is_deleted = 0
         ORDER BY r.created_at DESC
         LIMIT ?`
      )
      .all(limit);

    return records;
  }
}

module.exports = DashboardService;
