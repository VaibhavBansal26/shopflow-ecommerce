const { createClient } = require('redis');

let client;
let subscriber;
let publisher;

const createRedisClient = async () => {
  const c = createClient({ url: process.env.REDIS_URL });
  c.on('error', (err) => console.error('Redis Client Error', err));
  await c.connect();
  return c;
};

const getClient = async () => {
  if (!client) {
    client = await createRedisClient();
  }
  return client;
};

const getSubscriber = async () => {
  if (!subscriber) {
    subscriber = await createRedisClient();
  }
  return subscriber;
};

const getPublisher = async () => {
  if (!publisher) {
    publisher = await createRedisClient();
  }
  return publisher;
};

const cache = {
  async get(key) {
    const c = await getClient();
    const val = await c.get(key);
    return val ? JSON.parse(val) : null;
  },
  async set(key, value, ttlSeconds = 3600) {
    const c = await getClient();
    await c.setEx(key, ttlSeconds, JSON.stringify(value));
  },
  async del(key) {
    const c = await getClient();
    await c.del(key);
  },
  async invalidatePattern(pattern) {
    const c = await getClient();
    const keys = await c.keys(pattern);
    if (keys.length > 0) {
      await c.del(keys);
    }
  },
};

module.exports = { getClient, getSubscriber, getPublisher, cache };
