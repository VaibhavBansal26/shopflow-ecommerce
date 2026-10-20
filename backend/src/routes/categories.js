const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// GET /api/categories
router.get('/', cache(3600), async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, slug, image_url, description, parent_id FROM categories WHERE is_active = true ORDER BY sort_order ASC, name ASC'
  );
  res.json(rows);
});

// GET /api/categories/:slug
router.get('/:slug', cache(3600), async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, slug, image_url, description, parent_id FROM categories WHERE slug = $1 AND is_active = true',
    [req.params.slug]
  );
  if (!rows.length) return res.status(404).json({ error: 'Category not found' });
  res.json(rows[0]);
});

// GET /api/categories/:slug/products
router.get('/:slug/products', optionalAuth, cache(300), async (req, res) => {
  const { page = 1, limit = 20, sort = 'popular' } = req.query;
  const offset = (page - 1) * limit;

  const cat = await query(
    'SELECT id FROM categories WHERE slug = $1 AND is_active = true',
    [req.params.slug]
  );
  if (!cat.rows.length) return res.status(404).json({ error: 'Category not found' });
  const categoryId = cat.rows[0].id;

  const orderMap = {
    popular: 'p.views_count DESC',
    newest: 'p.created_at DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    rating: 'p.rating DESC',
  };
  const orderBy = orderMap[sort] || orderMap.popular;

  const { rows } = await query(
    `SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.images, p.rating, p.reviews_count, p.stock_quantity
     FROM products p
     WHERE p.category_id = $1 AND p.is_active = true
     ORDER BY ${orderBy}
     LIMIT $2 OFFSET $3`,
    [categoryId, limit, offset]
  );

  const count = await query(
    'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true',
    [categoryId]
  );

  res.json({
    products: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(count.rows[0].count),
      pages: Math.ceil(count.rows[0].count / limit),
    },
  });
});

module.exports = router;
