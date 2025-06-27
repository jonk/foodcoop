const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Create router instance
const router = express.Router();

// Mock user database - replace with Prisma later
const users = [];

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { email, password, name }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Hash the password (never store plain text passwords!)
    const saltRounds = 10; // Number of salt rounds for bcrypt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: users.length + 1, // Simple ID generation - use UUID in production
      email,
      name,
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key', // Use environment variable in production
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  // In a more secure setup, you might maintain a blacklist of tokens
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authenticateToken, (req, res) => {
  // req.user is set by the authenticateToken middleware
  const user = users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

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

module.exports = router; 