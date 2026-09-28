const jwt = require('jsonwebtoken');

const wrap = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = {
      userId: payload.userId,
      messId: payload.messId,
      role: payload.role
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = {
  wrap,
  requireAuth,
  requireAdmin
};
