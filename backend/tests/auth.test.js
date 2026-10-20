const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setex: jest.fn(),
}));
jest.mock('twilio', () => () => ({
  messages: { create: jest.fn().mockResolvedValue({ sid: 'SM123' }) },
}));

const { query } = require('../src/config/database');
const redis = require('../src/config/redis');
const { app } = require('../src/index');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns tokens', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // check existing email
        .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'customer' }] }); // insert

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'Password1!' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('returns 409 if email already registered', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'Password1!' });

      expect(res.status).toBe(409);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const hashed = await bcrypt.hash('Password1!', 10);
      query.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'test@example.com', password: hashed, role: 'customer', name: 'Test', is_active: true }],
      });
      redis.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('returns 401 for wrong password', async () => {
      const hashed = await bcrypt.hash('OtherPassword1!', 10);
      query.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'test@example.com', password: hashed, role: 'customer', is_active: true }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
    });

    it('returns 404 for unknown email', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password1!' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/send-otp', () => {
    it('sends OTP to valid phone number', async () => {
      redis.setex.mockResolvedValue('OK');

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '+15550001234' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/OTP sent/i);
    });
  });
});
