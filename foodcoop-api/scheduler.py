import requests
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

"""
Simple scheduler for checking shifts
This can be run as a cron job or with a process manager like PM2
"""

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

def check_all_shifts():
    """Check all shifts for all users"""
    try:
        print(f"[{datetime.utcnow().isoformat()}] Starting automated shift check...")
        
        response = requests.post(f"{API_BASE_URL}/api/shifts/check-all")
        response.raise_for_status()  # Raise an exception for bad status codes
        
        data = response.json()
        print(f"[{datetime.utcnow().isoformat()}] Shift check completed:", {
            'usersChecked': data.get('usersChecked'),
            'usersWithShifts': data.get('usersWithShifts')
        })

        if data.get('results') and len(data['results']) > 0:
            print(f"[{datetime.utcnow().isoformat()}] Found shifts for {len(data['results'])} users")

    except requests.exceptions.RequestException as e:
        print(f"[{datetime.utcnow().isoformat()}] Error in automated shift check: {e}")
    except Exception as e:
        print(f"[{datetime.utcnow().isoformat()}] Unexpected error in automated shift check: {e}")

if __name__ == "__main__":
    check_all_shifts() 