const express = require('express');
const bcrypt = require('bcrypt');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /api/users/profile
 * Get current user's profile
 * Requires authentication
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user by ID with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        shiftPreferences: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't return sensitive information like password
    const { password: _, ...userProfile } = user;
    
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
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, notificationEmail, foodCoopUsername } = req.body;
    
    // Build update data object (only include provided fields)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (notificationEmail !== undefined) updateData.notificationEmail = notificationEmail;
    if (foodCoopUsername !== undefined) updateData.foodCoopUsername = foodCoopUsername;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        settings: true
      }
    });

    // Don't return sensitive information
    const { password: _, ...userProfile } = updatedUser;
    
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
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { emailNotifications, checkFrequency, timezone } = req.body;
    
    // Build update data object
    const updateData = {};
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (checkFrequency !== undefined) updateData.checkFrequency = checkFrequency;
    if (timezone !== undefined) updateData.timezone = timezone;

    // Update or create settings
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        checkFrequency: checkFrequency || '5min',
        timezone: timezone || 'America/New_York'
      }
    });

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings
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
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    // Return default settings if none exist
    const userSettings = settings || {
      emailNotifications: true,
      checkFrequency: '5min',
      timezone: 'America/New_York'
    };
    
    res.json({ settings: userSettings });
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

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
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Soft delete - mark as deleted instead of actually removing
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * GET /api/users/notifications
 * Get user's notifications
 * Requires authentication
 */
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 50 // Limit to 50 most recent
    });
    
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/users/notifications/:id/read
 * Mark notification as read
 * Requires authentication
 */
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = parseInt(req.params.id);
    
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId // Ensure user owns the notification
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router; 