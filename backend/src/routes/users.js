const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  next();
};

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, phone, role, avatar, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// PATCH /api/users/me
router.patch(
  '/me',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().isMobilePhone(),
  ],
  validate,
  async (req, res) => {
    const { name, phone, avatar } = req.body;
    const { rows } = await query(
      `UPDATE users SET
        name    = COALESCE($1, name),
        phone   = COALESCE($2, phone),
        avatar  = COALESCE($3, avatar),
        updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, phone, role, avatar`,
      [name || null, phone || null, avatar || null, req.user.id]
    );
    res.json(rows[0]);
  }
);

// PATCH /api/users/me/password
router.patch(
  '/me/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  validate,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  }
);

// GET /api/users/me/addresses
router.get('/me/addresses', authenticate, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/users/me/addresses
router.post(
  '/me/addresses',
  authenticate,
  [
    body('line1').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('state').notEmpty().trim(),
    body('postal_code').notEmpty().trim(),
    body('country').notEmpty().trim(),
  ],
  validate,
  async (req, res) => {
    const { line1, line2, city, state, postal_code, country, is_default } = req.body;
    if (is_default) {
      await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    const { rows } = await query(
      `INSERT INTO addresses (user_id, line1, line2, city, state, postal_code, country, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, line1, line2 || null, city, state, postal_code, country, is_default || false]
    );
    res.status(201).json(rows[0]);
  }
);

// DELETE /api/users/me/addresses/:id
router.delete('/me/addresses/:id', authenticate, async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Address not found' });
  res.json({ message: 'Address deleted' });
});

module.exports = router;
