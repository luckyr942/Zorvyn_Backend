const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-rbac';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_PATH = ':memory:';

const app = require('../src/app');
const { resetDatabase } = require('../src/config/database');

describe('RBAC Enforcement', () => {
  let adminToken, analystToken, viewerToken;
  let recordId;

  beforeAll(async () => {
    // Reset database for clean test isolation
    resetDatabase();

    // Register admin
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Admin',
      email: 'admin@rbac.com',
      password: 'admin123',
      role: 'admin',
    });
    adminToken = adminRes.body.data.token;

    // Register analyst
    const analystRes = await request(app).post('/api/auth/register').send({
      name: 'Analyst',
      email: 'analyst@rbac.com',
      password: 'analyst123',
      role: 'analyst',
    });
    analystToken = analystRes.body.data.token;

    // Register viewer
    const viewerRes = await request(app).post('/api/auth/register').send({
      name: 'Viewer',
      email: 'viewer@rbac.com',
      password: 'viewer123',
      role: 'viewer',
    });
    viewerToken = viewerRes.body.data.token;

    // Create a record as admin
    const recordRes = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 1000,
        type: 'income',
        category: 'salary',
        date: '2026-01-15',
        description: 'Test record',
      });
    recordId = recordRes.body.data.record.id;
  });

  // ─── Records RBAC ─────────────────────────────────────────────────────

  describe('Records RBAC', () => {
    it('should allow viewer to list records', async () => {
      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should allow analyst to list records', async () => {
      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should deny viewer from creating records', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          amount: 500,
          type: 'expense',
          category: 'food',
          date: '2026-01-15',
        });

      expect(res.statusCode).toBe(403);
    });

    it('should deny analyst from creating records', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          amount: 500,
          type: 'expense',
          category: 'food',
          date: '2026-01-15',
        });

      expect(res.statusCode).toBe(403);
    });

    it('should deny viewer from updating records', async () => {
      const res = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ amount: 2000 });

      expect(res.statusCode).toBe(403);
    });

    it('should deny analyst from updating records', async () => {
      const res = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .send({ amount: 2000 });

      expect(res.statusCode).toBe(403);
    });

    it('should deny viewer from deleting records', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should deny analyst from deleting records', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to update records', async () => {
      const res = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 2000 });

      expect(res.statusCode).toBe(200);
    });
  });

  // ─── Dashboard RBAC ───────────────────────────────────────────────────

  describe('Dashboard RBAC', () => {
    it('should deny viewer from accessing summary', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should deny viewer from accessing category-totals', async () => {
      const res = await request(app)
        .get('/api/dashboard/category-totals')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should deny viewer from accessing trends', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow viewer to access recent activity', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should allow analyst to access summary', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should allow analyst to access trends', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should allow admin to access all dashboard endpoints', async () => {
      const summary = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summary.statusCode).toBe(200);

      const categories = await request(app)
        .get('/api/dashboard/category-totals')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(categories.statusCode).toBe(200);

      const trends = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(trends.statusCode).toBe(200);

      const recent = await request(app)
        .get('/api/dashboard/recent')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(recent.statusCode).toBe(200);
    });
  });

  // ─── User Management RBAC ────────────────────────────────────────────

  describe('User Management RBAC', () => {
    it('should deny viewer from listing users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should deny analyst from listing users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to list users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
    });
  });
});
