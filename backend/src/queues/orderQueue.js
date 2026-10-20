const Bull = require('bull');
const { query } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const orderQueue = new Bull('order-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

orderQueue.process('new-order', async (job) => {
  const { orderId, userId } = job.data;
  logger.info(`Processing new order: ${orderId}`);

  // Send order confirmation notification (placeholder for email/SMS service)
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, 'order_confirmed', 'Order Confirmed', 'Your order has been placed successfully.', $2)`,
    [userId, JSON.stringify({ orderId })]
  );

  // Auto-assign rider logic could go here
  logger.info(`Order ${orderId} processed successfully`);
});

orderQueue.process('order-status-update', async (job) => {
  const { orderId, status, userId } = job.data;

  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, 'order_update', 'Order Update', $2, $3)`,
    [userId, `Your order status has been updated to: ${status}`, JSON.stringify({ orderId, status })]
  );
});

orderQueue.on('failed', (job, err) => {
  logger.error(`Order queue job ${job.id} failed: ${err.message}`);
});

const enqueueNewOrder = async (orderId, userId) => {
  await orderQueue.add('new-order', { orderId, userId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
};

const enqueueStatusUpdate = async (orderId, status, userId) => {
  await orderQueue.add('order-status-update', { orderId, status, userId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
};

module.exports = { orderQueue, enqueueNewOrder, enqueueStatusUpdate };
