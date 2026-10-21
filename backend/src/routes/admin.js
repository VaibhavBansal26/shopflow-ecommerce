const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const adminOnly = requireRole('admin');
const adminOrVendor = requireRole('admin', 'vendor');

router.use(authenticate);

router.get('/dashboard', adminOnly, async (req, res) => {
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

// Orders
router.get('/orders', adminOnly, async (req, res) => {
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

router.patch('/orders/:id/status', adminOnly, async (req, res) => {
  const { status, rider_id } = req.body;
  const updates = ['status = $1', 'updated_at = NOW()'];
  const params = [status, req.params.id];
  if (rider_id) { updates.push(`rider_id = $${params.length + 1}`); params.push(rider_id); }
  if (status === 'delivered') { updates.push(`delivered_at = NOW()`); }
  await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $2`, params);
  res.json({ success: true });
});

// Users / Shoppers
router.get('/users', adminOnly, async (req, res) => {
  const { role } = req.query;
  let sql = "SELECT id, name, email, phone, role, region, is_active, created_at FROM users";
  const params = [];
  if (role) { sql += ' WHERE role = $1'; params.push(role); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.patch('/users/:id/role', adminOnly, async (req, res) => {
  const { role } = req.body;
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
  res.json({ success: true });
});

router.patch('/users/:id/status', adminOnly, async (req, res) => {
  const { rows } = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active', [req.params.id]);
  res.json({ is_active: rows[0].is_active });
});

// Vendors
router.get('/vendors', adminOnly, async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
           COUNT(p.id) AS product_count
    FROM users u
    LEFT JOIN products p ON p.vendor_id = u.id AND p.is_active = true
    WHERE u.role = 'vendor'
    GROUP BY u.id ORDER BY u.name`);
  res.json(rows);
});

router.patch('/vendors/:id/status', adminOnly, async (req, res) => {
  const { rows } = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active', [req.params.id]);
  res.json({ is_active: rows[0].is_active });
});

// Riders
router.get('/riders', adminOnly, async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.name, u.phone, u.is_active,
           COUNT(o.id) FILTER (WHERE o.status = 'out_for_delivery') AS active_deliveries,
           COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS total_delivered
    FROM users u
    LEFT JOIN orders o ON o.rider_id = u.id
    WHERE u.role = 'rider'
    GROUP BY u.id ORDER BY u.name`);
  res.json(rows);
});

router.patch('/riders/:id/status', adminOnly, async (req, res) => {
  const { rows } = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active', [req.params.id]);
  res.json({ is_active: rows[0].is_active });
});

// Categories
router.get('/categories', adminOrVendor, async (req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

router.post('/categories', adminOrVendor, async (req, res) => {
  const { name, slug, parent_id } = req.body;
  const { rows } = await query(
    'INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, $3) RETURNING *',
    [name, slug || name.toLowerCase().replace(/\s+/g, '-'), parent_id || null]
  );
  res.status(201).json(rows[0]);
});

// Products (admin sees all; vendor sees/manages only their own)
router.get('/products', adminOrVendor, async (req, res) => {
  const { vendor_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT p.*, c.name AS category_name, u.name AS vendor_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN users u ON u.id = p.vendor_id`;
  const params = [];
  // vendors are scoped to their own products
  const scopedVendorId = req.user.role === 'vendor' ? req.user.id : (vendor_id || null);
  if (scopedVendorId) { sql += ' WHERE p.vendor_id = $1'; params.push(scopedVendorId); }
  sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.post('/products', adminOrVendor, async (req, res) => {
  const { name, description, price, compare_at_price, category_id, quantity, sku, default_image_url, images, is_active } = req.body;
  // vendors always own their own products
  const vendor_id = req.user.role === 'vendor' ? req.user.id : (req.body.vendor_id || null);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const { rows } = await query(
    `INSERT INTO products (name, slug, description, price, compare_at_price, category_id, vendor_id, quantity, sku, default_image_url, images, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [name, slug, description || null, price, compare_at_price || null, category_id || null, vendor_id,
     quantity || 0, sku || null, default_image_url || null, JSON.stringify(images || []), is_active !== false]
  );
  res.status(201).json(rows[0]);
});

router.patch('/products/:id', adminOrVendor, async (req, res) => {
  // vendors can only edit their own products
  if (req.user.role === 'vendor') {
    const { rows: check } = await query('SELECT vendor_id FROM products WHERE id = $1', [req.params.id]);
    if (!check.length || check[0].vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own products' });
    }
  }
  const fields = ['name','description','price','compare_at_price','category_id','quantity','sku','default_image_url','images','is_active','is_featured'];
  const updates = [];
  const params = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      params.push(f === 'images' ? JSON.stringify(req.body[f]) : req.body[f]);
      updates.push(`${f} = $${params.length}`);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  updates.push('updated_at = NOW()');
  const { rows } = await query(
    `UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
  res.json(rows[0]);
});

router.delete('/products/:id', adminOrVendor, async (req, res) => {
  if (req.user.role === 'vendor') {
    const { rows: check } = await query('SELECT vendor_id FROM products WHERE id = $1', [req.params.id]);
    if (!check.length || check[0].vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own products' });
    }
  }
  await query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
