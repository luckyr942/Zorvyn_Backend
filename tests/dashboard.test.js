const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-dashboard';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_PATH = ':memory:';

const app = require('../src/app');
const { resetDatabase } = require('../src/config/database');

describe('Dashboard Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    // Reset database for clean test isolation
    resetDatabase();

    // Register admin
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Dashboard Admin',
      email: 'dashadmin@test.com',
      password: 'admin123',
      role: 'admin',
    });
    adminToken = adminRes.body.data.token;

    // Create sample records
    const records = [
      { amount: 50000, type: 'income', category: 'salary', date: '2026-01-15', description: 'Jan salary' },
      { amount: 50000, type: 'income', category: 'salary', date: '2026-02-15', description: 'Feb salary' },
      { amount: 10000, type: 'income', category: 'freelance', date: '2026-01-20', description: 'Side project' },
      { amount: 20000, type: 'expense', category: 'rent', date: '2026-01-01', description: 'Jan rent' },
      { amount: 20000, type: 'expense', category: 'rent', date: '2026-02-01', description: 'Feb rent' },
      { amount: 5000, type: 'expense', category: 'food', date: '2026-01-10', description: 'Groceries' },
      { amount: 3000, type: 'expense', category: 'transport', date: '2026-02-12', description: 'Fuel' },
    ];

    for (const record of records) {
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(record);
    }
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return correct financial summary', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary } = res.body.data;
      expect(summary.totalIncome).toBe(110000); // 50000 + 50000 + 10000
      expect(summary.totalExpenses).toBe(48000); // 20000 + 20000 + 5000 + 3000
      expect(summary.netBalance).toBe(62000); // 110000 - 48000
      expect(summary.totalRecords).toBe(7);
    });
  });

  describe('GET /api/dashboard/category-totals', () => {
    it('should return category-wise breakdown', async () => {
      const res = await request(app)
        .get('/api/dashboard/category-totals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.categoryTotals)).toBe(true);

      const categories = res.body.data.categoryTotals;
      expect(categories.length).toBeGreaterThan(0);

      // Each entry should have category, type, total, count
      const salaryEntry = categories.find(
        (c) => c.category === 'salary' && c.type === 'income'
      );
      expect(salaryEntry).toBeDefined();
      expect(salaryEntry.total).toBe(100000);
      expect(salaryEntry.count).toBe(2);
    });
  });

  describe('GET /api/dashboard/trends', () => {
    it('should return monthly trends', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.trends)).toBe(true);
      expect(res.body.data.trends.length).toBeGreaterThan(0);

      // Each trend entry should have period, type, total, count
      const trend = res.body.data.trends[0];
      expect(trend).toHaveProperty('period');
      expect(trend).toHaveProperty('type');
      expect(trend).toHaveProperty('total');
      expect(trend).toHaveProperty('count');
    });

    it('should support weekly period', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends?period=weekly')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.trends)).toBe(true);
    });
  });

  describe('GET /api/dashboard/recent', () => {
    it('should return recent records', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.records)).toBe(true);
      expect(res.body.data.records.length).toBeLessThanOrEqual(10);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent?limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.records.length).toBeLessThanOrEqual(3);
    });
  });
});
