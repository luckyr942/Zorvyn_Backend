const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-records';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_PATH = ':memory:';

const app = require('../src/app');
const { resetDatabase } = require('../src/config/database');

describe('Records Endpoints', () => {
  let adminToken;
  let recordId;

  beforeAll(async () => {
    // Reset database for clean test isolation
    resetDatabase();

    // Register admin
    const res = await request(app).post('/api/auth/register').send({
      name: 'Records Admin',
      email: 'records-admin@test.com',
      password: 'admin123',
      role: 'admin',
    });
    adminToken = res.body.data.token;
  });

  describe('POST /api/records', () => {
    it('should create a record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 5000,
          type: 'income',
          category: 'salary',
          date: '2026-01-15',
          description: 'Monthly salary',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.amount).toBe(5000);
      expect(res.body.data.record.type).toBe('income');
      expect(res.body.data.record.category).toBe('salary');

      recordId = res.body.data.record.id;
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate amount is positive', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: -100,
          type: 'income',
          category: 'test',
          date: '2026-01-15',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should validate type enum', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100,
          type: 'invalid',
          category: 'test',
          date: '2026-01-15',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/records', () => {
    beforeAll(async () => {
      // Create multiple records for filtering tests
      const records = [
        { amount: 2000, type: 'expense', category: 'food', date: '2026-01-10', description: 'Groceries' },
        { amount: 3000, type: 'expense', category: 'transport', date: '2026-02-15', description: 'Fuel costs' },
        { amount: 10000, type: 'income', category: 'freelance', date: '2026-02-20', description: 'Project payment' },
        { amount: 1500, type: 'expense', category: 'food', date: '2026-03-01', description: 'Dining out' },
      ];

      for (const record of records) {
        await request(app)
          .post('/api/records')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(record);
      }
    });

    it('should list all records', async () => {
      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.records.length).toBeGreaterThan(0);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by type', async () => {
      const res = await request(app)
        .get('/api/records?type=expense')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.records.every((r) => r.type === 'expense')).toBe(
        true
      );
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/records?category=food')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.records.every((r) => r.category === 'food')).toBe(
        true
      );
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/records?startDate=2026-02-01&endDate=2026-02-28')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(
        res.body.data.records.every(
          (r) => r.date >= '2026-02-01' && r.date <= '2026-02-28'
        )
      ).toBe(true);
    });

    it('should search by description', async () => {
      const res = await request(app)
        .get('/api/records?search=Groceries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.records.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/records?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.records.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
    });

    it('should sort by amount ascending', async () => {
      const res = await request(app)
        .get('/api/records?sort=amount&order=asc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const amounts = res.body.data.records.map((r) => r.amount);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
      }
    });
  });

  describe('GET /api/records/:id', () => {
    it('should get a single record', async () => {
      const res = await request(app)
        .get(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.record.id).toBe(recordId);
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .get('/api/records/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/records/:id', () => {
    it('should update a record', async () => {
      const res = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 6000,
          description: 'Updated salary',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.record.amount).toBe(6000);
      expect(res.body.data.record.description).toBe('Updated salary');
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .put('/api/records/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1000 });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/records/:id', () => {
    it('should soft delete a record', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Record deleted successfully');
    });

    it('should not find soft-deleted record', async () => {
      const res = await request(app)
        .get(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for already deleted record', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
