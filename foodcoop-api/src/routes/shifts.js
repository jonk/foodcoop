const express = require('express');
const router = express.Router();

// Mock data - replace with Prisma database later
const shiftPreferences = [];

/**
 * GET /api/shifts/preferences
 * Get all shift preferences for the authenticated user
 * Requires authentication
 */
router.get('/preferences', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Filter preferences for the current user
    const userPreferences = shiftPreferences.filter(pref => pref.userId === userId);
    
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
 * Body: { shiftType, days, timeRange, notificationEmail }
 * Requires authentication
 */
router.post('/preferences', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { shiftType, days, timeRange, notificationEmail } = req.body;

    // Validate required fields
    if (!shiftType || !days || !timeRange || !notificationEmail) {
      return res.status(400).json({
        error: 'shiftType, days, timeRange, and notificationEmail are required'
      });
    }

    // Validate days array
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        error: 'days must be a non-empty array'
      });
    }

    // Validate time range
    if (!timeRange.start || !timeRange.end) {
      return res.status(400).json({
        error: 'timeRange must have start and end times'
      });
    }

    // Create new preference
    const newPreference = {
      id: shiftPreferences.length + 1,
      userId,
      shiftType,
      days,
      timeRange,
      notificationEmail,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    shiftPreferences.push(newPreference);

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
 * Body: { shiftType?, days?, timeRange?, notificationEmail?, isActive? }
 * Requires authentication
 */
router.put('/preferences/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const preferenceId = parseInt(req.params.id);
    const updates = req.body;

    // Find the preference
    const preferenceIndex = shiftPreferences.findIndex(
      pref => pref.id === preferenceId && pref.userId === userId
    );

    if (preferenceIndex === -1) {
      return res.status(404).json({ error: 'Shift preference not found' });
    }

    // Update the preference
    const updatedPreference = {
      ...shiftPreferences[preferenceIndex],
      ...updates,
      updatedAt: new Date()
    };

    shiftPreferences[preferenceIndex] = updatedPreference;

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
router.delete('/preferences/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const preferenceId = parseInt(req.params.id);

    // Find and remove the preference
    const preferenceIndex = shiftPreferences.findIndex(
      pref => pref.id === preferenceId && pref.userId === userId
    );

    if (preferenceIndex === -1) {
      return res.status(404).json({ error: 'Shift preference not found' });
    }

    const deletedPreference = shiftPreferences.splice(preferenceIndex, 1)[0];

    res.json({
      message: 'Shift preference deleted successfully',
      preference: deletedPreference
    });

  } catch (error) {
    console.error('Error deleting shift preference:', error);
    res.status(500).json({ error: 'Failed to delete shift preference' });
  }
});

/**
 * GET /api/shifts/available
 * Get currently available shifts (this would integrate with your Python script)
 * Requires authentication
 */
router.get('/available', authenticateToken, (req, res) => {
  try {
    // This endpoint would integrate with your shift_checker.py script
    // For now, return mock data
    const mockAvailableShifts = [
      {
        id: 1,
        shiftType: 'STOCKING',
        day: 'Monday',
        date: '2024-01-15',
        time: '5:00 PM - 10:00 PM',
        location: 'Main Floor',
        available: true
      },
      {
        id: 2,
        shiftType: 'DAIRY_LIFTING',
        day: 'Wednesday',
        date: '2024-01-17',
        time: '8:00 AM - 12:00 PM',
        location: 'Dairy Section',
        available: true
      }
    ];

    res.json({
      availableShifts: mockAvailableShifts,
      lastChecked: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching available shifts:', error);
    res.status(500).json({ error: 'Failed to fetch available shifts' });
  }
});

/**
 * POST /api/shifts/check
 * Manually trigger a shift check (for testing)
 * Requires authentication
 */
router.post('/check', authenticateToken, (req, res) => {
  try {
    // This would trigger your Python shift checker script
    // For now, just return a success message
    res.json({
      message: 'Shift check triggered successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering shift check:', error);
    res.status(500).json({ error: 'Failed to trigger shift check' });
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