const axios = require('axios');

/**
 * Simple scheduler for checking shifts
 * This can be run as a cron job or with a process manager like PM2
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function checkAllShifts() {
  try {
    console.log(`[${new Date().toISOString()}] Starting automated shift check...`);
    
    const response = await axios.post(`${API_BASE_URL}/api/shifts/check-all`);
    
    console.log(`[${new Date().toISOString()}] Shift check completed:`, {
      usersChecked: response.data.usersChecked,
      usersWithShifts: response.data.usersWithShifts
    });

    if (response.data.results.length > 0) {
      console.log(`[${new Date().toISOString()}] Found shifts for ${response.data.results.length} users`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in automated shift check:`, error.message);
  }
}

// If running directly, check once
if (require.main === module) {
  checkAllShifts();
}

module.exports = { checkAllShifts }; 