const router = require('express').Router();
const { query, getClient } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');
const { emitOrderUpdate } = require('../websocket');
const { createPaymentIntent } = require('../services/paymentService');
const orderQueue = require('../queues/orderQueue');

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  next();
};

const generateOrderNumber = () => `SF-${Date.now().toString(36).toUpperCase()}`;

// POST /api/orders — place order
router.post('/', authenticate, [
  body('items').isArray({ min: 1 }),
  body('delivery_address_id').isUUID(),
  body('payment_method').isIn(['card', 'gpay', 'cash', 'wallet', 'subscription']),
  body('delivery_type').optional().isIn(['standard', 'express', 'scheduled', 'team', 'rider']),
  body('scheduled_at').optional().isISO8601(),
  body('discount_code').optional().isString(),
], validate, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { items, delivery_address_id, payment_method, delivery_type = 'standard',
            scheduled_at, discount_code, notes, subscription_id, saved_card_id } = req.body;

    // Fetch address
    const addrRes = await client.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [delivery_address_id, req.user.id]);
    if (!addrRes.rows.length) throw new AppError('Address not found.', 400);
    const address = addrRes.rows[0];

    // Validate and lock product quantities
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const { rows: prod } = await client.query(
        'SELECT id, name, price, quantity, default_image_url FROM products WHERE id = $1 AND is_active = true FOR UPDATE',
        [item.product_id]);
      if (!prod.length) throw new AppError(`Product ${item.product_id} not found.`, 400);
      if (prod[0].quantity < item.quantity) throw new AppError(`Insufficient stock for ${prod[0].name}.`, 400);

      await client.query('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [item.quantity, item.product_id]);
      const lineTotal = parseFloat(prod[0].price) * item.quantity;
      subtotal += lineTotal;
      orderItems.push({ ...prod[0], quantity: item.quantity, unit_price: prod[0].price, total_price: lineTotal });
    }

    // Apply discount
    let discountAmount = 0;
    let discountId = null;
    if (discount_code) {
      const { rows: disc } = await client.query(
        `SELECT * FROM discounts WHERE code = $1 AND is_active = true
         AND (valid_until IS NULL OR valid_until > NOW())
         AND (usage_limit IS NULL OR used_count < usage_limit)`, [discount_code]);
      if (disc.length) {
        const d = disc[0];
        if (subtotal >= (d.min_order_amount || 0)) {
          discountId = d.id;
          if (d.type === 'percentage') discountAmount = subtotal * (d.value / 100);
          else if (d.type === 'fixed') discountAmount = Math.min(d.value, subtotal);
          if (d.max_discount_amount) discountAmount = Math.min(discountAmount, d.max_discount_amount);
          await client.query('UPDATE discounts SET used_count = used_count + 1 WHERE id = $1', [d.id]);
        }
      }
    }

    const deliveryFee = delivery_type === 'express' ? 49 : 0;
    const taxRate = 0.05;
    const taxableAmount = subtotal - discountAmount + deliveryFee;
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;

    // Create order
    const orderNum = generateOrderNumber();
    const { rows: order } = await client.query(`
      INSERT INTO orders (order_number, user_id, status, payment_method, subtotal, discount_amount,
        delivery_fee, tax_amount, total, delivery_type, scheduled_at, delivery_address,
        discount_id, subscription_id, notes, estimated_delivery)
      VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        NOW() + INTERVAL '${delivery_type === 'express' ? '30 minutes' : '4 hours'}')
      RETURNING *`,
      [orderNum, req.user.id, payment_method, subtotal, discountAmount, deliveryFee,
       taxAmount, total, delivery_type, scheduled_at || null,
       JSON.stringify({ ...address }), discountId, subscription_id || null, notes]);

    // Insert order items
    for (const item of orderItems) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order[0].id, item.id, item.name, item.default_image_url, item.quantity, item.unit_price, item.total_price]);
      // Track purchase interaction
      await client.query(`
        INSERT INTO user_product_interactions (user_id, product_id, action, score)
        VALUES ($1,$2,'purchase',3.0)`, [req.user.id, item.id]);
    }

    // Status history
    await client.query(
      'INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)',
      [order[0].id, 'pending', req.user.id]);

    // Payment intent for card/gpay
    let paymentIntent = null;
    if (['card', 'gpay'].includes(payment_method)) {
      paymentIntent = await createPaymentIntent(total, 'inr', { orderId: order[0].id, saved_card_id });
      await client.query('UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2',
        [paymentIntent.id, order[0].id]);
    }

    await client.query('COMMIT');

    // Queue order processing job
    await orderQueue.add('process-order', { orderId: order[0].id });

    // Emit WebSocket event
    emitOrderUpdate(order[0].id, { status: 'pending', order: order[0] });

    res.status(201).json({
      order: order[0],
      ...(paymentIntent && { clientSecret: paymentIntent.client_secret }),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/orders — user's orders
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['o.user_id = $1'];
  const params = [req.user.id];
  if (status) { conditions.push(`o.status = $2`); params.push(status); }

  const { rows } = await query(`
    SELECT o.*, json_agg(oi.*) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY o.id ORDER BY o.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), parseInt(offset)]);
  res.json(rows);
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await query(`
    SELECT o.*, json_agg(DISTINCT oi.*) AS items,
           json_agg(DISTINCT osh.*) AS status_history,
           row_to_json(r.*) AS rider
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN order_status_history osh ON osh.order_id = o.id
    LEFT JOIN users r ON r.id = o.rider_id
    WHERE o.id = $1 AND (o.user_id = $2 OR $3 IN ('admin','super_admin','rider'))
    GROUP BY o.id, r.id`, [req.params.id, req.user.id, req.user.role]);
  if (!rows.length) throw new AppError('Order not found.', 404);
  res.json(rows[0]);
});

// PATCH /api/orders/:id/status — rider/admin
router.patch('/:id/status', authenticate, requireRole('admin', 'super_admin', 'rider'), [
  body('status').isIn(['confirmed','preparing','picked_up','in_transit','delivered','cancelled']),
], validate, async (req, res) => {
  const { status, notes } = req.body;
  const { rows } = await query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (!rows.length) throw new AppError('Order not found.', 404);

  await query('INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES ($1,$2,$3,$4)',
    [req.params.id, status, notes, req.user.id]);

  if (status === 'delivered') {
    await query('UPDATE orders SET delivered_at = NOW() WHERE id = $1', [req.params.id]);
    await query('UPDATE products SET sold_count = sold_count + oi.quantity FROM order_items oi WHERE oi.order_id = $1 AND products.id = oi.product_id', [req.params.id]);
  }

  emitOrderUpdate(req.params.id, { status, updatedAt: new Date() });
  res.json(rows[0]);
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res) => {
  const { reason } = req.body;
  const { rows } = await query(
    `UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1
     WHERE id = $2 AND user_id = $3 AND status IN ('pending','confirmed')
     RETURNING *`, [reason, req.params.id, req.user.id]);
  if (!rows.length) throw new AppError('Order cannot be cancelled.', 400);

  // Restore stock
  await query(`UPDATE products SET quantity = quantity + oi.quantity
    FROM order_items oi WHERE oi.order_id = $1 AND products.id = oi.product_id`, [req.params.id]);

  emitOrderUpdate(req.params.id, { status: 'cancelled' });
  res.json(rows[0]);
});

module.exports = router;
