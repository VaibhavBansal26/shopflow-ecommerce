const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

router.get('/', authenticate, async (req, res) => {
  const { rows } = await query(`
    SELECT s.*, p.name AS product_name, p.default_image_url, p.price
    FROM subscriptions s JOIN products p ON p.id = s.product_id
    WHERE s.user_id = $1 ORDER BY s.created_at DESC`, [req.user.id]);
  res.json(rows);
});

router.post('/', authenticate, async (req, res) => {
  const { product_id, interval, delivery_day, delivery_time, quantity = 1 } = req.body;
  if (!product_id || !interval) throw new AppError('product_id and interval required', 400);

  const { rows: prod } = await query(
    'SELECT * FROM products WHERE id = $1 AND is_active = true AND is_subscribable = true',
    [product_id]);
  if (!prod.length) throw new AppError('Product not available for subscription', 404);

  const next_delivery = computeNextDelivery(interval, delivery_day, delivery_time);

  const { rows } = await query(`
    INSERT INTO subscriptions (user_id, product_id, interval, quantity, delivery_day, delivery_time, next_delivery_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, product_id, interval, quantity, delivery_day, delivery_time, next_delivery]);
  res.status(201).json(rows[0]);
});

router.patch('/:id/pause', authenticate, async (req, res) => {
  const { rows } = await query(
    "UPDATE subscriptions SET status = 'paused', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.user.id]);
  if (!rows.length) throw new AppError('Subscription not found', 404);
  res.json(rows[0]);
});

router.patch('/:id/resume', authenticate, async (req, res) => {
  const { rows } = await query(
    "UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.user.id]);
  if (!rows.length) throw new AppError('Subscription not found', 404);
  res.json(rows[0]);
});

router.delete('/:id', authenticate, async (req, res) => {
  await query("UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]);
  res.json({ success: true });
});

const computeNextDelivery = (interval, day, time) => {
  const now = new Date();
  switch (interval) {
    case 'daily': now.setDate(now.getDate() + 1); break;
    case 'weekly': now.setDate(now.getDate() + 7); break;
    case 'biweekly': now.setDate(now.getDate() + 14); break;
    case 'monthly': now.setMonth(now.getMonth() + 1); break;
    default: now.setDate(now.getDate() + 7);
  }
  return now;
};

module.exports = router;
