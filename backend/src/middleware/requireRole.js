/**
 * requireRole(...roles) — must be used AFTER authenticate middleware.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 *
 * Usage:
 *   router.post('/content', authenticate, requireRole('writer'), handler)
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role || 'none'}.`
      });
    }

    return next();
  };
}

module.exports = requireRole;
