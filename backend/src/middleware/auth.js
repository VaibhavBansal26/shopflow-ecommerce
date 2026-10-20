const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided.', 401));
  }
  const token = authHeader.split(' ')[1];

  // Check token blacklist (for logout)
  const isBlacklisted = await cache.get(`blacklist:${token}`);
  if (isBlacklisted) return next(new AppError('Token has been revoked.', 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const { rows } = await query('SELECT id, role, is_active FROM users WHERE id = $1', [decoded.userId]);
  if (!rows.length || !rows[0].is_active) {
    return next(new AppError('User not found or deactivated.', 401));
  }

  req.user = rows[0];
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, role FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
    if (rows.length) req.user = rows[0];
  } catch {}
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
