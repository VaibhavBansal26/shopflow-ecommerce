const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  const [orders, revenue, users, products] = await Promise.all([
    query("SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '30 days'"),
    query("SELECT COALESCE(SUM(total),0) AS revenue FROM orders WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '30 days'"),
    query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'"),
    query('SELECT COUNT(*) FROM products WHERE is_active = true'),
  ]);
  res.json({
    orders_this_month: parseInt(orders.rows[0].count),
    revenue_this_month: parseFloat(revenue.rows[0].revenue),
    new_users: parseInt(users.rows[0].count),
    active_products: parseInt(products.rows[0].count),
  });
});

router.get('/orders', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT o.*, u.name AS customer_name, u.email, u.phone
             FROM orders o JOIN users u ON u.id = o.user_id`;
  const params = [];
  if (status) { sql += ' WHERE o.status = $1'; params.push(status); }
  sql += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.patch('/orders/:id/status', async (req, res) => {
  const { status, rider_id } = req.body;
  const updates = ['status = $1', 'updated_at = NOW()'];
  const params = [status, req.params.id];
  if (rider_id) { updates.push(`rider_id = $${params.length + 1}`); params.push(rider_id); }
  if (status === 'delivered') { updates.push(`delivered_at = NOW()`); }
  await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $2`, params);
  res.json({ success: true });
});

router.get('/users', async (req, res) => {
  const { rows } = await query(
    "SELECT id, name, email, phone, role, region, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100");
  res.json(rows);
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
  res.json({ success: true });
});

router.get('/riders', async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.name, u.phone, u.is_active,
           COUNT(o.id) FILTER (WHERE o.status = 'out_for_delivery') AS active_deliveries
    FROM users u
    LEFT JOIN orders o ON o.rider_id = u.id
    WHERE u.role = 'rider'
    GROUP BY u.id ORDER BY u.name`);
  res.json(rows);
});

module.exports = router;
