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

const makeToken = (role = 'customer') =>
  jwt.sign({ userId: 'user-1', role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

describe('Products Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/products', () => {
    it('returns product list', async () => {
      redis.get.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({
          rows: [
            { id: 'prod-1', name: 'Widget', price: '9.99', slug: 'widget', images: [], rating: '4.5', stock_quantity: 10 },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('applies search filter', async () => {
      redis.get.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const res = await request(app).get('/api/products?search=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(0);
    });
  });

  describe('GET /api/products/:slug', () => {
    it('returns single product by slug', async () => {
      redis.get.mockResolvedValue(null);
      query
        .mockResolvedValueOnce({
          rows: [{ id: 'prod-1', name: 'Widget', slug: 'widget', price: '9.99', images: [], description: 'A widget' }],
        })
        .mockResolvedValueOnce({ rows: [] }); // reviews

      const res = await request(app).get('/api/products/widget');

      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('widget');
    });

    it('returns 404 for unknown slug', async () => {
      redis.get.mockResolvedValue(null);
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/products/does-not-exist');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/products (admin)', () => {
    it('creates product as admin', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'prod-new', name: 'New Product', slug: 'new-product', price: '19.99' }],
      });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${makeToken('admin')}`)
        .send({
          name: 'New Product',
          price: 19.99,
          categoryId: 'cat-1',
          description: 'Desc',
          stockQuantity: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Product');
    });

    it('returns 403 for non-admin', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${makeToken('customer')}`)
        .send({ name: 'Nope', price: 9.99 });

      expect(res.status).toBe(403);
    });
  });
});
