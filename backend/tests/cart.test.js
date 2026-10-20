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
const redis = require('../src/config/redis');
const { app } = require('../src/index');

const makeToken = (userId = 'user-1', role = 'customer') =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

describe('Cart Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/cart', () => {
    it('returns cart items for authenticated user', async () => {
      redis.get.mockResolvedValue(null); // no cache
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'ci-1',
            product_id: 'prod-1',
            quantity: 2,
            name: 'Widget',
            price: '9.99',
            images: ['img.jpg'],
            stock_quantity: 10,
          },
        ],
      });

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Widget');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/cart/add', () => {
    it('adds item to cart', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'prod-1', price: '9.99', stock_quantity: 10, is_active: true }] }) // product lookup
        .mockResolvedValueOnce({ rows: [] }) // existing cart item check
        .mockResolvedValueOnce({ rows: [{ id: 'ci-1', product_id: 'prod-1', quantity: 1 }] }); // insert
      redis.del.mockResolvedValue(1);

      const res = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ productId: 'prod-1', quantity: 1 });

      expect(res.status).toBe(201);
    });

    it('returns 400 for out-of-stock product', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'prod-1', price: '9.99', stock_quantity: 0, is_active: true }] });

      const res = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ productId: 'prod-1', quantity: 1 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/cart/:itemId', () => {
    it('removes an item from cart', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'ci-1', user_id: 'user-1' }] }); // ownership check
      query.mockResolvedValueOnce({ rows: [] }); // delete
      redis.del.mockResolvedValue(1);

      const res = await request(app)
        .delete('/api/cart/ci-1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(204);
    });
  });
});
