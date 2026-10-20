const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setex: jest.fn(),
}));

const { query } = require('../src/config/database');
const { app } = require('../src/index');

const makeToken = (role = 'customer') =>
  jwt.sign({ userId: 'user-1', role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

describe('Discounts Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/discounts/validate', () => {
    it('validates a percentage coupon', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'disc-1',
          code: 'SAVE10',
          type: 'percentage',
          value: '10',
          minimum_order: '0',
          max_uses: 100,
          uses_count: 5,
          expires_at: new Date(Date.now() + 86400000),
          is_active: true,
        }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // user usage check

      const res = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ code: 'SAVE10', orderTotal: 100 });

      expect(res.status).toBe(200);
      expect(res.body.discount).toBeDefined();
      expect(res.body.discountAmount).toBe(10);
    });

    it('validates a fixed coupon', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'disc-2',
          code: 'FLAT5',
          type: 'fixed',
          value: '5',
          minimum_order: '20',
          max_uses: null,
          uses_count: 0,
          expires_at: new Date(Date.now() + 86400000),
          is_active: true,
        }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const res = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ code: 'FLAT5', orderTotal: 50 });

      expect(res.status).toBe(200);
      expect(res.body.discountAmount).toBe(5);
    });

    it('returns 404 for unknown coupon', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ code: 'BOGUS', orderTotal: 50 });

      expect(res.status).toBe(404);
    });

    it('returns 400 when order total below minimum', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'disc-2',
          code: 'FLAT5',
          type: 'fixed',
          value: '5',
          minimum_order: '100',
          max_uses: null,
          uses_count: 0,
          expires_at: new Date(Date.now() + 86400000),
          is_active: true,
        }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const res = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ code: 'FLAT5', orderTotal: 30 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/discounts (admin)', () => {
    it('creates a discount as admin', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'disc-3', code: 'NEWCODE', type: 'percentage', value: '15' }],
      });

      const res = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${makeToken('admin')}`)
        .send({ code: 'NEWCODE', type: 'percentage', value: 15, maxUses: 50 });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('NEWCODE');
    });

    it('returns 403 for non-admin', async () => {
      const res = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${makeToken('customer')}`)
        .send({ code: 'X', type: 'fixed', value: 5 });

      expect(res.status).toBe(403);
    });
  });
});
