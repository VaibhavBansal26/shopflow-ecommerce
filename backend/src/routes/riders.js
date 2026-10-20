const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { emitOrderUpdate } = require('../websocket');

router.use(authenticate, requireRole('rider', 'admin'));

router.get('/my-orders', async (req, res) => {
  const { rows } = await query(`
    SELECT o.id, o.order_number, o.status, o.total, o.delivery_address,
           o.estimated_delivery, u.name AS customer_name, u.phone AS customer_phone
    FROM orders o JOIN users u ON u.id = o.user_id
    WHERE o.rider_id = $1 AND o.status IN ('assigned','out_for_delivery')
    ORDER BY o.created_at DESC`, [req.user.id]);
  res.json(rows);
});

router.patch('/orders/:id/pickup', async (req, res) => {
  await query(
    "UPDATE orders SET status = 'out_for_delivery', updated_at = NOW() WHERE id = $1 AND rider_id = $2",
    [req.params.id, req.user.id]);
  await emitOrderUpdate(req.params.id, { status: 'out_for_delivery' });
  res.json({ success: true });
});

router.patch('/orders/:id/deliver', async (req, res) => {
  const { payment_collected } = req.body;
  await query(`
    UPDATE orders SET status = 'delivered', delivered_at = NOW(),
    payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END,
    updated_at = NOW()
    WHERE id = $1 AND rider_id = $2`, [req.params.id, req.user.id]);
  await emitOrderUpdate(req.params.id, { status: 'delivered' });
  res.json({ success: true });
});

router.post('/location', async (req, res) => {
  const { latitude, longitude, order_id } = req.body;
  await query(
    'INSERT INTO rider_locations (rider_id, coordinates, order_id) VALUES ($1, ST_SetSRID(ST_MakePoint($2,$3),4326), $4)',
    [req.user.id, longitude, latitude, order_id || null]);
  if (order_id) {
    await emitOrderUpdate(order_id, {
      rider_location: { latitude, longitude },
      rider_id: req.user.id,
    });
  }
  res.json({ success: true });
});

module.exports = router;
