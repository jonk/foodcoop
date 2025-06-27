const express = require('express');
const router = express.Router();

// Mock user data - replace with Prisma database later
const users = [
  {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    notificationEmail: 'test@example.com',
    foodCoopUsername: 'testuser',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * GET /api/users/profile
 * Get current user's profile
 * Requires authentication
 */
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user by ID
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't return sensitive information like password
    const { password, ...userProfile } = user;
    
    res.json({ user: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 * Body: { name?, notificationEmail?, foodCoopUsername? }
 * Requires authentication
 */
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, notificationEmail, foodCoopUsername } = req.body;
    
    // Find user by ID
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    const updatedUser = {
      ...users[userIndex],
      ...(name && { name }),
      ...(notificationEmail && { notificationEmail }),
      ...(foodCoopUsername && { foodCoopUsername }),
      updatedAt: new Date()
    };

    users[userIndex] = updatedUser;

    // Don't return sensitive information
    const { password, ...userProfile } = updatedUser;
    
    res.json({
      message: 'Profile updated successfully',
      user: userProfile
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

/**
 * PUT /api/users/settings
 * Update user settings (notification preferences, etc.)
 * Body: { emailNotifications?, checkFrequency?, timezone? }
 * Requires authentication
 */
router.put('/settings', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { emailNotifications, checkFrequency, timezone } = req.body;
    
    // Find user by ID
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update settings
    const updatedUser = {
      ...users[userIndex],
      settings: {
        ...users[userIndex].settings,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        checkFrequency: checkFrequency || '5min', // Default to 5 minutes
        timezone: timezone || 'America/New_York'
      },
      updatedAt: new Date()
    };

    users[userIndex] = updatedUser;

    // Don't return sensitive information
    const { password, ...userProfile } = updatedUser;
    
    res.json({
      message: 'Settings updated successfully',
      user: userProfile
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

/**
 * GET /api/users/settings
 * Get current user's settings
 * Requires authentication
 */
router.get('/settings', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user by ID
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return default settings if none exist
    const settings = user.settings || {
      emailNotifications: true,
      checkFrequency: '5min',
      timezone: 'America/New_York'
    };
    
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

/**
 * POST /api/users/change-password
 * Change user's password
 * Body: { currentPassword, newPassword }
 * Requires authentication
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // Find user by ID
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a real implementation, you would:
    // 1. Verify the current password against the hashed password in the database
    // 2. Hash the new password
    // 3. Update the user record

    // For now, just return success
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * DELETE /api/users/account
 * Delete user account (soft delete)
 * Requires authentication
 */
router.delete('/account', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user by ID
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete - mark as deleted instead of actually removing
    users[userIndex].deletedAt = new Date();
    users[userIndex].isActive = false;

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * Middleware to authenticate JWT tokens
 * Import this from auth.js in a real implementation
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = router; 