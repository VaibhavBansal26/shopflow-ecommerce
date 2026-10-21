const { cache: redisCache } = require('../config/redis');

const cache = (ttl = 300) => async (req, res, next) => {
  if (req.method !== 'GET') return next();
  const key = `cache:${req.originalUrl}`;
  try {
    const cached = await redisCache.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
  } catch {
    // Redis unavailable — proceed without cache
  }
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    try {
      await redisCache.set(key, data, ttl);
    } catch { /* ignore */ }
    res.setHeader('X-Cache', 'MISS');
    return originalJson(data);
  };
  next();
};

module.exports = { cache };
