const router = require('express').Router();
const { optionalAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const REC_ENGINE_URL = process.env.REC_ENGINE_URL || 'http://localhost:8001';
const REC_ENGINE_TOKEN = process.env.INTERNAL_API_TOKEN || 'shopflow-internal-token';

const callEngine = async (path, body) => {
  const res = await fetch(`${REC_ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-token': REC_ENGINE_TOKEN },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AppError('Recommendation engine error', 502);
  return res.json();
};

router.post('/search', async (req, res) => {
  const { query, region, category, max_price, limit } = req.body;
  if (!query) throw new AppError('query required', 400);
  const data = await callEngine('/search', { query, region, category, max_price, limit });
  res.json(data);
});

router.post('/for-you', optionalAuth, async (req, res) => {
  const { region, context, limit, exclude_ids } = req.body;
  const user_id = req.user?.id;
  const data = await callEngine('/recommend', { user_id, region, context, limit, exclude_ids });
  res.json(data);
});

router.post('/checkout', async (req, res) => {
  const { cart_product_ids, region, limit } = req.body;
  const data = await callEngine('/recommend/checkout', {
    cart_product_ids, user_id: null, region, limit,
  });
  res.json(data);
});

router.post('/trending', async (req, res) => {
  const { region, limit } = req.body;
  const data = await callEngine('/recommend/regional', { region, limit });
  res.json(data);
});

module.exports = router;
