const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

// Create router instance
const router = express.Router();

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
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Hash the password (never store plain text passwords!)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with default settings
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        notificationEmail: email, // Default to same email
        settings: {
          create: {
            emailNotifications: true,
            checkFrequency: '5min',
            timezone: 'America/New_York'
          }
        }
      },
      include: {
        settings: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated' 
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
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // req.user is set by the authenticateToken middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        settings: true,
        shiftPreferences: {
          where: { isActive: true }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't return sensitive information like password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router; 