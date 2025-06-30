const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /api/shifts/preferences
 * Get all shift preferences for the authenticated user
 * Requires authentication
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get preferences for the current user
    const userPreferences = await prisma.shiftPreference.findMany({
      where: { 
        userId,
        isActive: true 
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      preferences: userPreferences
    });
  } catch (error) {
    console.error('Error fetching shift preferences:', error);
    res.status(500).json({ error: 'Failed to fetch shift preferences' });
  }
});

/**
 * POST /api/shifts/preferences
 * Create a new shift preference
 * Body: { shiftType, days, timeRangeStart, timeRangeEnd, notificationEmail? }
 * Requires authentication
 */
router.post('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shiftType, days, timeRangeStart, timeRangeEnd, notificationEmail } = req.body;

    // Validate required fields
    if (!shiftType || !days || !timeRangeStart || !timeRangeEnd) {
      return res.status(400).json({
        error: 'shiftType, days, timeRangeStart, and timeRangeEnd are required'
      });
    }

    // Validate days array
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        error: 'days must be a non-empty array'
      });
    }

    // Get user's default notification email if not provided
    let emailToUse = notificationEmail;
    if (!emailToUse) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationEmail: true }
      });
      emailToUse = user.notificationEmail;
    }

    // Create new preference
    const newPreference = await prisma.shiftPreference.create({
      data: {
        userId,
        shiftType,
        days,
        timeRangeStart,
        timeRangeEnd,
        notificationEmail: emailToUse,
        isActive: true
      }
    });

    res.status(201).json({
      message: 'Shift preference created successfully',
      preference: newPreference
    });

  } catch (error) {
    console.error('Error creating shift preference:', error);
    res.status(500).json({ error: 'Failed to create shift preference' });
  }
});

/**
 * PUT /api/shifts/preferences/:id
 * Update an existing shift preference
 * Body: { shiftType?, days?, timeRangeStart?, timeRangeEnd?, notificationEmail?, isActive? }
 * Requires authentication
 */
router.put('/preferences/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferenceId = parseInt(req.params.id);
    const updates = req.body;

    // Find the preference and verify ownership
    const existingPreference = await prisma.shiftPreference.findFirst({
      where: {
        id: preferenceId,
        userId
      }
    });

    if (!existingPreference) {
      return res.status(404).json({ error: 'Shift preference not found' });
    }

    // Update the preference
    const updatedPreference = await prisma.shiftPreference.update({
      where: { id: preferenceId },
      data: updates
    });

    res.json({
      message: 'Shift preference updated successfully',
      preference: updatedPreference
    });

  } catch (error) {
    console.error('Error updating shift preference:', error);
    res.status(500).json({ error: 'Failed to update shift preference' });
  }
});

/**
 * DELETE /api/shifts/preferences/:id
 * Delete a shift preference
 * Requires authentication
 */
router.delete('/preferences/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferenceId = parseInt(req.params.id);

    // Find and verify ownership
    const existingPreference = await prisma.shiftPreference.findFirst({
      where: {
        id: preferenceId,
        userId
      }
    });

    if (!existingPreference) {
      return res.status(404).json({ error: 'Shift preference not found' });
    }

    // Delete the preference
    const deletedPreference = await prisma.shiftPreference.delete({
      where: { id: preferenceId }
    });

    res.json({
      message: 'Shift preference deleted successfully',
      preference: deletedPreference
    });

  } catch (error) {
    console.error('Error deleting shift preference:', error);
    res.status(500).json({ error: 'Failed to delete shift preference' });
  }
});

module.exports = router; 