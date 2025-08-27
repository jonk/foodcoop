#!/usr/bin/env python3
"""
Cron job script to check for available shifts and send email notifications
Run this script every 15 minutes via crontab
"""

import sys
import os
from datetime import datetime
from dotenv import load_dotenv

# Add the API directory to Python path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Import Flask app and database
from app import app
from models import db
from routes.shifts import check_all_users_shift_preferences
from email_service import send_shift_notification_email

def main():
    """Main function to check shifts and send notifications"""
    print(f"[{datetime.now()}] Starting shift check...")
    
    try:
        # Use Flask app context for database operations
        with app.app_context():
            # Get all matching shifts for all users
            matches = check_all_users_shift_preferences()
            
            if not matches:
                print(f"[{datetime.now()}] No matching shifts found for any users")
                return
            
            print(f"[{datetime.now()}] Found matches for {len(matches)} user(s)")
            
            # Send notifications for each user with matches
            emails_sent = 0
            for user_match in matches:
                user = user_match['user']
                user_matches = user_match['matches']
                
                # Use notification_email if set, otherwise use regular email
                email_to_use = user['notification_email'] or user['email']
                
                if email_to_use:
                    success = send_shift_notification_email(
                        email_to_use,
                        user['name'],
                        user_matches
                    )
                    
                    if success:
                        emails_sent += 1
                        print(f"[{datetime.now()}] Sent notification to {user['name']} ({email_to_use}) for {len(user_matches)} matches")
                    else:
                        print(f"[{datetime.now()}] Failed to send notification to {user['name']} ({email_to_use})")
                else:
                    print(f"[{datetime.now()}] No email address found for user {user['name']}")
            
            print(f"[{datetime.now()}] Shift check completed. Sent {emails_sent} email(s)")
            
    except Exception as e:
        print(f"[{datetime.now()}] Error during shift check: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()