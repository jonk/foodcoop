const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const axios = require('axios');
const cheerio = require('cheerio');

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

/**
 * GET /api/shifts/available
 * Get currently available shifts (this would integrate with your Python script)
 * Requires authentication
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    // Get recent available shifts from database
    const availableShifts = await prisma.availableShift.findMany({
      where: {
        isAvailable: true,
        expiresAt: {
          gte: new Date() // Only show shifts that haven't expired
        }
      },
      orderBy: {
        foundAt: 'desc'
      },
      take: 50 // Limit to 50 most recent
    });

    res.json({
      availableShifts,
      lastChecked: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching available shifts:', error);
    res.status(500).json({ error: 'Failed to fetch available shifts' });
  }
});

/**
 * POST /api/shifts/check
 * Check for available shifts based on user preferences
 * Requires authentication
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's shift preferences
    const userPreferences = await prisma.shiftPreference.findMany({
      where: { 
        userId,
        isActive: true 
      }
    });

    if (userPreferences.length === 0) {
      return res.json({
        message: 'No active preferences found',
        availableShifts: []
      });
    }

    // Get user's coop credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { foodCoopUsername: true }
    });

    if (!user.foodCoopUsername) {
      return res.status(400).json({
        error: 'Food Coop username not configured'
      });
    }

    // TODO: Get password from secure storage or environment
    // For now, we'll need to pass it in the request body
    const { coopPassword } = req.body;
    if (!coopPassword) {
      return res.status(400).json({
        error: 'Coop password required for shift checking'
      });
    }

    const results = await checkShiftsForUser(
      user.foodCoopUsername, 
      coopPassword, 
      userPreferences
    );

    res.json({
      message: 'Shift check completed',
      results
    });

  } catch (error) {
    console.error('Error checking shifts:', error);
    res.status(500).json({ error: 'Failed to check shifts' });
  }
});

/**
 * POST /api/shifts/check-all
 * Check shifts for all users with active preferences (for automated scheduling)
 * This endpoint can be called by a cron job
 */
router.post('/check-all', async (req, res) => {
  try {
    // Get all users with active preferences
    const usersWithPreferences = await prisma.user.findMany({
      where: {
        shiftPreferences: {
          some: {
            isActive: true
          }
        }
      },
      include: {
        shiftPreferences: {
          where: {
            isActive: true
          }
        }
      }
    });

    const results = [];

    for (const user of usersWithPreferences) {
      try {
        // For now, we'll need to get the password from environment or secure storage
        // In production, you'd want to encrypt/store passwords securely
        const coopPassword = process.env[`COOP_PASSWORD_${user.id}`] || process.env.DEFAULT_COOP_PASSWORD;
        
        if (!coopPassword) {
          console.log(`No password configured for user ${user.id}`);
          continue;
        }

        const userResults = await checkShiftsForUser(
          user.foodCoopUsername,
          coopPassword,
          user.shiftPreferences
        );

        if (userResults.length > 0) {
          results.push({
            userId: user.id,
            userEmail: user.notificationEmail,
            results: userResults
          });

          // TODO: Send notification to user
          console.log(`Found shifts for user ${user.id}:`, userResults);
        }

      } catch (error) {
        console.error(`Error checking shifts for user ${user.id}:`, error);
      }
    }

    res.json({
      message: 'Automated shift check completed',
      usersChecked: usersWithPreferences.length,
      usersWithShifts: results.length,
      results
    });

  } catch (error) {
    console.error('Error in automated shift check:', error);
    res.status(500).json({ error: 'Failed to perform automated shift check' });
  }
});

/**
 * Helper function to check shifts for a user based on their preferences
 */
async function checkShiftsForUser(username, password, preferences) {
  const session = axios.create({
    timeout: 30000, // 30 second timeout
    maxRedirects: 5
  });
  
  try {
    // Login to Food Coop
    const loginResult = await loginToFoodCoop(session, username, password);
    if (!loginResult.success) {
      throw new Error('Failed to login to Food Coop');
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    // Check each preference
    for (const preference of preferences) {
      const shiftResults = await checkSpecificShift(
        session, 
        preference, 
        today
      );
      
      if (shiftResults.length > 0) {
        results.push({
          preference: preference,
          availableShifts: shiftResults
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error in checkShiftsForUser:', error.message);
    throw error;
  }
}

/**
 * Login to Food Coop website
 */
async function loginToFoodCoop(session, username, password) {
  try {
    // First get the login page to get CSRF token
    const loginUrl = "https://members.foodcoop.com/services/login/";
    const loginPageResponse = await session.get(loginUrl);
    
    // Parse the HTML to extract CSRF token from the page
    const $ = cheerio.load(loginPageResponse.data);
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();
    
    if (!csrfToken) {
      throw new Error('Could not extract CSRF token');
    }

    // Prepare login data
    const loginData = new URLSearchParams({
      username: username,
      password: password,
      submit: "Log In",
      csrfmiddlewaretoken: csrfToken
    });

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
      "Referer": loginUrl,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": csrfToken
    };

    // Perform login
    const loginResponse = await session.post(loginUrl, loginData.toString(), { headers });
    
    // Simple success check
    return { success: loginResponse.status === 200 };

  } catch (error) {
    console.error('Login error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check for specific shift availability
 */
async function checkSpecificShift(session, preference, today) {
  try {
    const baseUrl = "https://members.foodcoop.com";
    const shiftsPath = "/services/shifts/";
    const availableShifts = [];
    const shiftId = getShiftId(preference.shiftType);

    // Check 2 weeks out (like the Python script)
    for (let i = 0; i < 2; i++) {
      const modifiers = `${i}/${shiftId}/0/`;
      const url = `${baseUrl}${shiftsPath}${modifiers}${today}`;

      const response = await session.get(url);
      
      if (response.status !== 200) {
        continue;
      }

      const $ = cheerio.load(response.data);

      // Find the main grid container
      const gridContainer = $('.grid-container');
      
      if (gridContainer.length === 0) {
        continue;
      }
      
      // Find all day columns
      const columns = gridContainer.find('.col');

      columns.each((index, col) => {
        const $col = $(col);
        
        // Extract date
        const dateElement = $col.find('p b');
        const dateText = dateElement.text().trim();
        
        if (!dateText) {
          return;
        }

        // Check for "No shifts"
        const noShifts = $col.find('p[align="center"]');
        if (noShifts.length > 0 && noShifts.text().includes('-- No shifts --')) {
          return; // Skip days with no shifts
        }

        // Extract shift details
        const shifts = $col.find('a.shift');

        shifts.each((shiftIndex, shift) => {
          const $shift = $(shift);
          const timeElement = $shift.find('b');
          const timeText = timeElement.text().trim();
          
          // Extract remaining text (excluding time)
          const shiftDescription = $shift.text().replace(timeText, '').trim();
          const href = $shift.attr('href') || '';

          // Check if this shift matches the user's time preferences
          if (matchesTimePreference(timeText, preference)) {
            availableShifts.push({
              day: dateText.split()[0],
              date: dateText.split()[1],
              time: timeText,
              description: shiftDescription,
              href: `${baseUrl}${href}`,
              shiftType: preference.shiftType
            });
          }
        });
      });
    }

    return availableShifts;

  } catch (error) {
    console.error('Error in checkSpecificShift:', error.message);
    return [];
  }
}

/**
 * Get shift ID from shift type name
 * This maps the shift names to their numeric IDs
 */
function getShiftId(shiftType) {
  const shiftMapping = {
    "-- All committees' --": 0,
    "🥕 Carrot 🥕": 7,
    "Receiving: Lifting 🚚": 2,
    "Receiving: Stocking 📦": 5,
    "Bathroom Cleaning Plus 🚽": 110,
    "Cart Return and Sidewalk Maintenance 🛒": 4,
    "Case Maintenance 🧽": 1,
    "** Cash Drawer Counting 💰": 114,
    "** Cashier 💵": 38,
    "Checkout 💳": 58,
    "CHIPS Food Drive 🍛": 142,
    "Cleaning Bulk Bins 🧼": 126,
    "Cleaning 🏝": 78,
    "** Enrollment Data Entry and Photo Processing ⌨️": 134,
    "Entrance Desk 🎟": 54,
    "Flex Worker 🥫": 56,
    "Food Processing: Bulk Packaging & Stocking 🍿": 48,
    "** Food Processing: Bulk Team Leader 🍿": 146,
    "Food Processing: Cheese & Olive Packaging 🧀": 94,
    "** Food Processing: Cheese & Olive Team Leader 🧀": 130,
    "** Front End Support 👀": 64,
    "General Meeting for workslot credit 🗳️": 159,
    "Inventory 📋": 6,
    "** Inventory: Data entry 🖥": 50,
    "Inventory: Produce 🍀": 72,
    "** Morning Set-up & Equipment Cleaning 🧺": 40,
    "** New Member Enrollment 📃": 106,
    "Office 📗": 62,
    "** Receiving: Beer Stocking 🍺": 44,
    "Receiving: Bread Stocking 🍞": 74,
    "Receiving: Bulk Lifting 🫘": 174,
    "Receiving: Dairy Lifting 🥛": 172,
    "Receiving: Health and Beauty Support 🧴": 102,
    "Receiving: Meat Processing and Lifting 🍖": 42,
    "Receiving: Produce Lifting and Stocking 🥦": 150,
    "Receiving: Produce Processing 🥬": 90,
    "** Receiving: Team Leader 📦": 157,
    "Receiving: Turkey Runner 🦃": 98,
    "Receiving: Vitamins 🍬": 46,
    "Repairs 🛠": 52,
    "** Scanning Invoices 🖨": 3,
    "Sorting and Collating Documents 🗂": 68,
    "Soup Kitchen Volunteer Appreciation Event 🎉": 169,
    "Soup Kitchen: Deep-Cleaning": 152,
    "Soup Kitchen: Food Services 🍲": 86,
    "Soup Kitchen: Guest Services ✍️": 165,
    "Soup Kitchen: Reception 🙂": 154,
    "Special Project: Data Entry": 171,
    "Voucher Processing 🧾": 122
  };

  return shiftMapping[shiftType] || 0; // Default to "All committees" if not found
}

/**
 * Check if a shift time matches the user's time preferences
 */
function matchesTimePreference(shiftTime, preference) {
  // Parse shift time (e.g., "9:00 AM")
  const timeMatch = shiftTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeMatch) return false;

  let hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const shiftTimeMinutes = hour * 60 + minute;

  // Parse preference times
  const startTime = parseTimeToMinutes(preference.timeRangeStart);
  const endTime = parseTimeToMinutes(preference.timeRangeEnd);

  return shiftTimeMinutes >= startTime && shiftTimeMinutes <= endTime;
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

module.exports = router; 