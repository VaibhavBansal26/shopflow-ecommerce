const router = require('express').Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { sendOTP, verifyOTP } = require('../services/otpService');

const generateTokens = (userId) => {
  const access = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refresh = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { access, refresh };
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('password').optional().isLength({ min: 8 }),
], validate, async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!email && !phone) throw new AppError('Email or phone required.', 400);

  const passwordHash = password ? await bcrypt.hash(password, 12) : null;

  const { rows } = await query(
    `INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING RETURNING id, name, email, phone, role`,
    [name, email || null, phone || null, passwordHash]
  );
  if (!rows.length) throw new AppError('User already exists.', 409);

  const { access, refresh } = generateTokens(rows[0].id);
  res.status(201).json({ user: rows[0], tokens: { access, refresh } });
});

// POST /api/auth/login
router.post('/login', [
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('password').optional().isString(),
], validate, async (req, res) => {
  const { email, phone, password } = req.body;
  const field = email ? 'email' : 'phone';
  const value = email || phone;
  if (!value) throw new AppError('Email or phone required.', 400);

  const { rows } = await query(
    `SELECT id, name, email, phone, role, password_hash, is_active FROM users WHERE ${field} = $1`,
    [value]
  );
  if (!rows.length) throw new AppError('Invalid credentials.', 401);
  const user = rows[0];
  if (!user.is_active) throw new AppError('Account deactivated.', 403);

  if (password && user.password_hash) {
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid credentials.', 401);
  }

  const { access, refresh } = generateTokens(user.id);
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, tokens: { access, refresh } });
});

// POST /api/auth/send-otp
router.post('/send-otp', [
  body('phone').isMobilePhone(),
], validate, async (req, res) => {
  const { phone } = req.body;
  await sendOTP(phone);
  res.json({ message: 'OTP sent successfully.' });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', [
  body('phone').isMobilePhone(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
], validate, async (req, res) => {
  const { phone, otp } = req.body;
  const userId = await verifyOTP(phone, otp);

  const { rows } = await query(
    `INSERT INTO users (name, phone, is_phone_verified)
     VALUES ($1, $2, true)
     ON CONFLICT (phone) DO UPDATE SET is_phone_verified = true
     RETURNING id, name, email, phone, role`,
    [`User_${phone.slice(-4)}`, phone]
  );

  const { access, refresh } = generateTokens(rows[0].id);
  res.json({ user: rows[0], tokens: { access, refresh } });
});

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google` }),
  (req, res) => {
    const { access, refresh } = generateTokens(req.user.id);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${access}&refresh=${refresh}`);
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required.', 400);

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const { rows } = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
  if (!rows.length) throw new AppError('User not found.', 401);

  const { access, refresh } = generateTokens(decoded.userId);
  res.json({ tokens: { access, refresh } });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await cache.set(`blacklist:${token}`, '1', ttl);
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, phone, role, avatar_url, wallet_balance, region, city, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

module.exports = router;
