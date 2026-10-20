const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

router.get('/', authenticate, async (req, res) => {
  const { rows } = await query(`
    SELECT ci.id, ci.quantity, ci.price,
           p.id AS product_id, p.name, p.slug, p.default_image_url,
           p.quantity AS stock, (ci.quantity * ci.price) AS line_total
    FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    WHERE c.user_id = $1`, [req.user.id]);

  const total = rows.reduce((s, r) => s + parseFloat(r.line_total), 0);
  res.json({ items: rows, total: total.toFixed(2), count: rows.length });
});

router.post('/items', authenticate, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) throw new AppError('product_id required', 400);

  const { rows: prod } = await query(
    'SELECT id, name, price, quantity FROM products WHERE id = $1 AND is_active = true',
    [product_id]);
  if (!prod.length) throw new AppError('Product not found', 404);
  if (prod[0].quantity < quantity) throw new AppError('Insufficient stock', 400);

  let { rows: cart } = await query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);
  if (!cart.length) {
    const r = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [req.user.id]);
    cart = r.rows;
  }

  await query(`
    INSERT INTO cart_items (cart_id, product_id, quantity, price)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
    [cart[0].id, product_id, quantity, prod[0].price]);

  res.json({ success: true, message: `Added ${quantity}× ${prod[0].name} to cart` });
});

router.put('/items/:itemId', authenticate, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) throw new AppError('Valid quantity required', 400);

  const { rows } = await query(`
    UPDATE cart_items SET quantity = $1
    WHERE id = $2 AND cart_id = (SELECT id FROM carts WHERE user_id = $3)
    RETURNING *`, [quantity, req.params.itemId, req.user.id]);

  if (!rows.length) throw new AppError('Cart item not found', 404);
  res.json({ success: true });
});

router.delete('/items/:itemId', authenticate, async (req, res) => {
  const { rows } = await query(`
    DELETE FROM cart_items
    WHERE id = $1 AND cart_id = (SELECT id FROM carts WHERE user_id = $2)
    RETURNING *`, [req.params.itemId, req.user.id]);

  if (!rows.length) throw new AppError('Cart item not found', 404);
  res.json({ success: true });
});

router.delete('/', authenticate, async (req, res) => {
  await query('DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)', [req.user.id]);
  res.json({ success: true });
});

module.exports = router;
