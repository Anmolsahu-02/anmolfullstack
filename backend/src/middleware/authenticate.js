const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: payload.sub || payload.id,
      role: payload.role || null
    };

    if (!req.user.id) {
      return res.status(401).json({ error: 'Invalid token subject' });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
