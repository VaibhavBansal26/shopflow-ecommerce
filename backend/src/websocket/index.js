const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getPublisher, getSubscriber } = require('../config/redis');
const { logger } = require('../utils/logger');

let io;

const initWebSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { rows } = await query('SELECT id, role FROM users WHERE id = $1', [decoded.userId]);
        if (rows.length) socket.user = rows[0];
      }
      next();
    } catch {
      next(); // Allow unauthenticated for public order tracking
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`WS connected: ${socket.id} user=${socket.user?.id || 'anon'}`);

    // Customer: track order
    socket.on('track:order', async ({ orderId }) => {
      try {
        const { rows } = await query(
          'SELECT id, user_id, status FROM orders WHERE id = $1', [orderId]);
        if (!rows.length) return socket.emit('error', { message: 'Order not found' });
        // Allow owner or admin
        if (socket.user && (rows[0].user_id === socket.user.id || ['admin','super_admin'].includes(socket.user.role))) {
          socket.join(`order:${orderId}`);
          socket.emit('order:joined', { orderId, status: rows[0].status });
        }
      } catch (err) {
        socket.emit('error', { message: 'Unable to track order' });
      }
    });

    // Rider: broadcast location
    socket.on('rider:location', async ({ lat, lng, heading, speed, orderId }) => {
      if (!socket.user || socket.user.role !== 'rider') return;

      // Persist latest location
      await query(`
        INSERT INTO rider_locations (rider_id, coordinates, heading, speed)
        VALUES ($1, POINT($2, $3), $4, $5)`,
        [socket.user.id, lng, lat, heading, speed]).catch(() => {});

      // Broadcast to all customers tracking orders assigned to this rider
      const { rows } = await query(
        "SELECT id FROM orders WHERE rider_id = $1 AND status IN ('picked_up','in_transit')",
        [socket.user.id]);

      rows.forEach(order => {
        io.to(`order:${order.id}`).emit('rider:location', { lat, lng, heading, speed, riderId: socket.user.id });
      });

      // Also emit to specific order room if provided
      if (orderId) {
        io.to(`order:${orderId}`).emit('rider:location', { lat, lng, heading, speed });
      }
    });

    // Rider: join duty room
    socket.on('rider:online', () => {
      if (socket.user?.role === 'rider') {
        socket.join('riders:online');
        socket.broadcast.to('admin:room').emit('rider:status', { riderId: socket.user.id, online: true });
      }
    });

    // Admin: join admin room
    socket.on('admin:join', () => {
      if (['admin','super_admin'].includes(socket.user?.role)) {
        socket.join('admin:room');
      }
    });

    // Chat: join session room
    socket.on('chat:join', ({ sessionId }) => {
      socket.join(`chat:${sessionId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`WS disconnected: ${socket.id}`);
      if (socket.user?.role === 'rider') {
        socket.broadcast.to('admin:room').emit('rider:status', { riderId: socket.user.id, online: false });
      }
    });
  });

  // Redis pub/sub for horizontal scaling
  const sub = await getSubscriber();
  await sub.subscribe('order:updates', 'chat:messages', (message, channel) => {
    try {
      const data = JSON.parse(message);
      if (channel === 'order:updates') {
        io.to(`order:${data.orderId}`).emit('order:update', data);
        io.to('admin:room').emit('order:update', data);
      } else if (channel === 'chat:messages') {
        io.to(`chat:${data.sessionId}`).emit('chat:message', data);
      }
    } catch {}
  });

  logger.info('WebSocket server initialized');
  return io;
};

const emitOrderUpdate = async (orderId, data) => {
  const pub = await getPublisher();
  await pub.publish('order:updates', JSON.stringify({ orderId, ...data }));
};

const emitChatMessage = async (sessionId, message) => {
  const pub = await getPublisher();
  await pub.publish('chat:messages', JSON.stringify({ sessionId, ...message }));
};

const getIO = () => io;

module.exports = { initWebSocket, emitOrderUpdate, emitChatMessage, getIO };
