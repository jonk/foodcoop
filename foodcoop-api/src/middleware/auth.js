const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 * Use this on routes that require authentication
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify the token
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = user; // Add user info to request object
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticateToken }; 