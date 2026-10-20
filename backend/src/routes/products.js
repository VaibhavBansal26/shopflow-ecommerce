const router = require('express').Router();
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { body, query: qv, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  next();
};

// GET /api/products — list with filters, pagination, search
router.get('/', optionalAuth, async (req, res) => {
  const {
    page = 1, limit = 20, category, search, sort = 'created_at',
    order = 'DESC', min_price, max_price, featured, region,
  } = req.query;
  const offset = (page - 1) * limit;

  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const conditions = ['p.is_active = true'];
  const params = [];
  let pi = 1;

  if (category) { conditions.push(`c.slug = $${pi++}`); params.push(category); }
  if (search) { conditions.push(`(p.name ILIKE $${pi++} OR p.description ILIKE $${pi++})`); params.push(`%${search}%`, `%${search}%`); }
  if (min_price) { conditions.push(`p.price >= $${pi++}`); params.push(min_price); }
  if (max_price) { conditions.push(`p.price <= $${pi++}`); params.push(max_price); }
  if (featured) { conditions.push(`p.is_featured = true`); }
  if (region) { conditions.push(`$${pi++} = ANY(p.region_tags)`); params.push(region); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSorts = { price: 'p.price', name: 'p.name', created_at: 'p.created_at', rating: 'p.average_rating', sold: 'p.sold_count' };
  const sortCol = allowedSorts[sort] || 'p.created_at';
  const sortDir = order === 'ASC' ? 'ASC' : 'DESC';

  params.push(parseInt(limit), parseInt(offset));
  const dataQ = `
    SELECT p.id, p.name, p.slug, p.price, p.compare_at_price, p.default_image_url,
           p.images, p.average_rating, p.review_count, p.sold_count, p.quantity,
           p.is_featured, p.has_subscription, p.tags, p.short_description,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${where}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT $${pi++} OFFSET $${pi++}`;

  const countQ = `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`;

  const [data, count] = await Promise.all([
    query(dataQ, params),
    query(countQ, params.slice(0, -2)),
  ]);

  const result = {
    products: data.rows,
    total: parseInt(count.rows[0].count),
    page: parseInt(page),
    pages: Math.ceil(count.rows[0].count / limit),
  };

  await cache.set(cacheKey, result, 300);
  res.json(result);
});

// GET /api/products/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  const cacheKey = `product:${req.params.slug}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await query(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
           json_agg(DISTINCT pv.*) FILTER (WHERE pv.id IS NOT NULL) AS variants,
           json_agg(DISTINCT sp.*) FILTER (WHERE sp.id IS NOT NULL) AS subscription_plans
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN subscription_plans sp ON sp.product_id = p.id AND sp.is_active = true
    WHERE p.slug = $1 AND p.is_active = true
    GROUP BY p.id, c.name, c.slug`, [req.params.slug]);

  if (!rows.length) throw new AppError('Product not found.', 404);

  // Track view interaction
  if (req.user) {
    query(`INSERT INTO user_product_interactions (user_id, product_id, action, region)
           VALUES ($1, $2, 'view', (SELECT region FROM users WHERE id = $1))
           ON CONFLICT DO NOTHING`, [req.user.id, rows[0].id]).catch(() => {});
  }

  await cache.set(cacheKey, rows[0], 600);
  res.json(rows[0]);
});

// POST /api/products — admin only
router.post('/', authenticate, requireRole('admin', 'super_admin'), [
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('category_id').optional().isUUID(),
], validate, async (req, res) => {
  const { name, description, short_description, price, compare_at_price, cost_price,
          quantity, category_id, images, tags, metadata, is_featured, has_subscription,
          weight, dimensions, region_tags, sku } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const defaultImg = images?.[0] || null;

  const { rows } = await query(`
    INSERT INTO products (name, slug, description, short_description, price, compare_at_price,
      cost_price, quantity, category_id, images, default_image_url, tags, metadata, is_featured,
      has_subscription, weight, dimensions, region_tags, sku)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *`,
    [name, slug, description, short_description, price, compare_at_price, cost_price,
     quantity || 0, category_id, JSON.stringify(images || []), defaultImg,
     tags, JSON.stringify(metadata || {}), is_featured || false,
     has_subscription || false, weight, JSON.stringify(dimensions || {}), region_tags, sku]);

  await cache.invalidatePattern('products:*');
  res.status(201).json(rows[0]);
});

// PUT /api/products/:id — admin only
router.put('/:id', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  const allowed = ['name','description','short_description','price','compare_at_price',
    'quantity','category_id','images','default_image_url','tags','metadata',
    'is_featured','has_subscription','weight','dimensions','region_tags','is_active'];

  const updates = Object.entries(req.body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v]);

  if (!updates.length) throw new AppError('No valid fields to update.', 400);

  const setClause = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = [req.params.id, ...updates.map(([, v]) => v)];

  const { rows } = await query(`UPDATE products SET ${setClause} WHERE id = $1 RETURNING *`, values);
  if (!rows.length) throw new AppError('Product not found.', 404);

  await cache.invalidatePattern('products:*');
  await cache.del(`product:${rows[0].slug}`);
  res.json(rows[0]);
});

// GET /api/products/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  const { rows } = await query(`
    SELECT r.*, u.name AS user_name, u.avatar_url
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 20`, [req.params.id]);
  res.json(rows);
});

// POST /api/products/:id/reviews
router.post('/:id/reviews', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 1000 }),
], validate, async (req, res) => {
  const { rating, comment, images, order_id } = req.body;
  const { rows } = await query(`
    INSERT INTO reviews (product_id, user_id, order_id, rating, comment, images, is_verified_purchase)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.params.id, req.user.id, order_id, rating, comment, images, !!order_id]);

  // Update product average rating
  await query(`UPDATE products SET
    average_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = $1),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
    WHERE id = $1`, [req.params.id]);

  await cache.del(`product:${req.params.id}`);
  res.status(201).json(rows[0]);
});

module.exports = router;
