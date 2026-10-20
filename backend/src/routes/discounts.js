const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

router.post('/validate', authenticate, async (req, res) => {
  const { code, order_amount } = req.body;
  if (!code) throw new AppError('Coupon code required', 400);

  const { rows } = await query(
    `SELECT * FROM discounts WHERE code = UPPER($1) AND is_active = true
     AND (valid_from IS NULL OR valid_from <= NOW())
     AND (valid_until IS NULL OR valid_until > NOW())
     AND (usage_limit IS NULL OR used_count < usage_limit)`,
    [code]);

  if (!rows.length) throw new AppError('Invalid or expired coupon code', 404);
  const discount = rows[0];

  if (discount.min_order_amount && order_amount < discount.min_order_amount) {
    throw new AppError(`Minimum order amount ₹${discount.min_order_amount} required`, 400);
  }

  let discount_amount = 0;
  if (discount.type === 'percentage') {
    discount_amount = order_amount * (discount.value / 100);
    if (discount.max_discount_amount) {
      discount_amount = Math.min(discount_amount, discount.max_discount_amount);
    }
  } else {
    discount_amount = discount.value;
  }

  res.json({
    valid: true,
    discount_id: discount.id,
    discount_amount: Math.round(discount_amount * 100) / 100,
    message: discount.type === 'percentage'
      ? `${discount.value}% off (max ₹${discount.max_discount_amount || '∞'})`
      : `₹${discount.value} off`,
  });
});

// Admin routes
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { rows } = await query('SELECT * FROM discounts ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { code, type, value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until } = req.body;
  const { rows } = await query(
    `INSERT INTO discounts (code, type, value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until)
     VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [code, type, value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until]);
  res.status(201).json(rows[0]);
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { is_active } = req.body;
  const { rows } = await query(
    'UPDATE discounts SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [is_active, req.params.id]);
  if (!rows.length) throw new AppError('Discount not found', 404);
  res.json(rows[0]);
});

module.exports = router;
