from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ShiftPreference, User
from datetime import datetime
from flask import jsonify
import requests
import os
from datetime import datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import json

# Load environment variables
load_dotenv()
COOP_BASEURL = os.getenv('COOP_BASEURL', 'https://members.foodcoop.com')

shifts_bp = Blueprint('shifts', __name__)

@shifts_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_shift_preferences():
    """Get all shift preferences for the authenticated user"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get preferences for the current user
        user_preferences = ShiftPreference.query.filter_by(
            user_id=current_user_id,
            is_active=True
        ).order_by(ShiftPreference.created_at.desc()).all()
        
        preferences_data = []
        for pref in user_preferences:
            preferences_data.append({
                'id': pref.id,
                'shiftType': pref.shift_type,
                'days': pref.days,
                'timeRangeStart': pref.time_range_start,
                'timeRangeEnd': pref.time_range_end,
                'notificationEmail': pref.notification_email,
                'isActive': pref.is_active,
                'createdAt': pref.created_at.isoformat(),
                'updatedAt': pref.updated_at.isoformat()
            })
        
        return jsonify({'preferences': preferences_data})
        
    except Exception as e:
        print(f'Error fetching shift preferences: {e}')
        return jsonify({'error': 'Failed to fetch shift preferences'}), 500

@shifts_bp.route('/preferences', methods=['POST'])
@jwt_required()
def create_shift_preference():
    """Create a new shift preference"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        shift_type = data.get('shiftType')
        days = data.get('days')
        time_range_start = data.get('timeRangeStart')
        time_range_end = data.get('timeRangeEnd')
        notification_email = data.get('notificationEmail')

        # Validate required fields
        if not shift_type or not days or not time_range_start or not time_range_end:
            return jsonify({
                'error': 'shiftType, days, timeRangeStart, and timeRangeEnd are required'
            }), 400

        # Validate days array
        if not isinstance(days, list) or len(days) == 0:
            return jsonify({
                'error': 'days must be a non-empty array'
            }), 400

        # Get user's default notification email if not provided
        email_to_use = notification_email
        if not email_to_use:
            user = User.query.filter_by(id=current_user_id).first()
            email_to_use = user.notification_email

        # Create new preference
        new_preference = ShiftPreference(
            user_id=current_user_id,
            shift_type=shift_type,
            days=days,
            time_range_start=time_range_start,
            time_range_end=time_range_end,
            notification_email=email_to_use,
            is_active=True
        )
        
        db.session.add(new_preference)
        db.session.commit()

        preference_data = {
            'id': new_preference.id,
            'shiftType': new_preference.shift_type,
            'days': new_preference.days,
            'timeRangeStart': new_preference.time_range_start,
            'timeRangeEnd': new_preference.time_range_end,
            'notificationEmail': new_preference.notification_email,
            'isActive': new_preference.is_active,
            'createdAt': new_preference.created_at.isoformat(),
            'updatedAt': new_preference.updated_at.isoformat()
        }

        return jsonify({
            'message': 'Shift preference created successfully',
            'preference': preference_data
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f'Error creating shift preference: {e}')
        return jsonify({'error': 'Failed to create shift preference'}), 500

@shifts_bp.route('/preferences/<int:preference_id>', methods=['PUT'])
@jwt_required()
def update_shift_preference(preference_id):
    """Update an existing shift preference"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Find the preference and verify ownership
        existing_preference = ShiftPreference.query.filter_by(
            id=preference_id,
            user_id=current_user_id
        ).first()

        if not existing_preference:
            return jsonify({'error': 'Shift preference not found'}), 404

        # Update the preference with provided fields
        if 'shiftType' in data:
            existing_preference.shift_type = data['shiftType']
        if 'days' in data:
            existing_preference.days = data['days']
        if 'timeRangeStart' in data:
            existing_preference.time_range_start = data['timeRangeStart']
        if 'timeRangeEnd' in data:
            existing_preference.time_range_end = data['timeRangeEnd']
        if 'notificationEmail' in data:
            existing_preference.notification_email = data['notificationEmail']
        if 'isActive' in data:
            existing_preference.is_active = data['isActive']
        
        existing_preference.updated_at = datetime.utcnow()
        db.session.commit()

        updated_preference_data = {
            'id': existing_preference.id,
            'shiftType': existing_preference.shift_type,
            'days': existing_preference.days,
            'timeRangeStart': existing_preference.time_range_start,
            'timeRangeEnd': existing_preference.time_range_end,
            'notificationEmail': existing_preference.notification_email,
            'isActive': existing_preference.is_active,
            'createdAt': existing_preference.created_at.isoformat(),
            'updatedAt': existing_preference.updated_at.isoformat()
        }

        return jsonify({
            'message': 'Shift preference updated successfully',
            'preference': updated_preference_data
        })

    except Exception as e:
        db.session.rollback()
        print(f'Error updating shift preference: {e}')
        return jsonify({'error': 'Failed to update shift preference'}), 500

@shifts_bp.route('/preferences/<int:preference_id>', methods=['DELETE'])
@jwt_required()
def delete_shift_preference(preference_id):
    """Delete a shift preference"""
    try:
        current_user_id = int(get_jwt_identity())

        # Find and verify ownership
        existing_preference = ShiftPreference.query.filter_by(
            id=preference_id,
            user_id=current_user_id
        ).first()

        if not existing_preference:
            return jsonify({'error': 'Shift preference not found'}), 404

        # Store preference data before deletion
        deleted_preference_data = {
            'id': existing_preference.id,
            'shiftType': existing_preference.shift_type,
            'days': existing_preference.days,
            'timeRangeStart': existing_preference.time_range_start,
            'timeRangeEnd': existing_preference.time_range_end,
            'notificationEmail': existing_preference.notification_email,
            'isActive': existing_preference.is_active,
            'createdAt': existing_preference.created_at.isoformat(),
            'updatedAt': existing_preference.updated_at.isoformat()
        }

        # Delete the preference
        db.session.delete(existing_preference)
        db.session.commit()

        return jsonify({
            'message': 'Shift preference deleted successfully',
            'preference': deleted_preference_data
        })

    except Exception as e:
        db.session.rollback()
        print(f'Error deleting shift preference: {e}')
        return jsonify({'error': 'Failed to delete shift preference'}), 500 

@shifts_bp.route('/check-shifts', methods=['GET'])
@jwt_required()
def check_shifts():
    """Check for shifts"""
    try:
        current_user_id = int(get_jwt_identity())
        shifts = check_all_shifts()
        return jsonify({
            'shifts': shifts
        })
    except Exception as e:
        print(f'Error checking shifts: {e}')
        return jsonify({'error': 'Failed to check shifts'}), 500


def get_open_shifts_next_2_weeks(session, login_data, headers):
    mapped_shift = 0 # all committees
    # URL of the page to monitor
    today = datetime.now().strftime('%Y-%m-%d')
    shifts_path = "/services/shifts/"
    shifts_by_day = []

    # check 2 weeks out 
    for i in range(2):
        modifiers = f"{i}/{mapped_shift}/0/"
        url = f"{COOP_BASEURL}{shifts_path}{modifiers}{today}"
        print(url)

        response = session.get(url, data=login_data, headers=headers)

        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
    
        # Find the main grid container
        grid_container = soup.find("div", class_="grid-container")

        # Find all day columns within the grid container
        columns = grid_container.find_all("div", class_="col") if grid_container else []

        # Loop through each day's shifts
        for col in columns:
            # Extract date
            date_element = col.find("p").find("b")
            date_text = date_element.get_text(strip=True) if date_element else ""

            # Check for "No shifts"
            no_shifts = col.find("p", align="center")
            if no_shifts and "-- No shifts --" in no_shifts.get_text():
                shifts_by_day.append({
                    "day": date_text.split()[0],  # Extract day (e.g., "Sun")
                    "date": date_text.split()[1],  # Extract date (e.g., "3/16/2025")
                    "shifts": []  # No shifts available
                })
                continue  # Skip further processing for this column

            # Extract shift details
            shifts = []
            for shift in col.find_all("a", class_="shift"):
                time_element = shift.find("b")  # Extract the bolded time
                time_text = time_element.get_text(strip=True) if time_element else ""

                # Extract remaining text (excluding time)
                shift_description = shift.get_text(strip=True).replace(time_text, "").strip()

                # Get the link
                href = shift.get("href", "").strip()

                # Store in dictionary format
                shifts.append({
                    "time": time_text,
                    "description": shift_description,
                    "href": f"{COOP_BASEURL}{href}"
                })

            # Store day's shifts
            shifts_by_day.append({
                "day": date_text.split()[0],  # Extract day (e.g., "Mon")
                "date": date_text.split()[1],  # Extract date (e.g., "3/17/2025")
                "shifts": shifts
            })    

    return shifts_by_day

def check_all_shifts():
    """Check all shifts for all users"""
    session = requests.Session()
    data, headers = login(session, os.getenv('COOP_USERNAME'), os.getenv('COOP_PASSWORD'))
    open_shifts = get_open_shifts_next_2_weeks(session, data, headers)
    return open_shifts


def login(session, user, pw):
    # First we gotta find the CSRF token + cookie
    session.get(COOP_BASEURL + "/services/login/")
    csrf_token = session.cookies.get("csrftoken")  # Some sites store it in cookies
    login_data = {
        "username": user,
        "password": pw,
        "submit": "Log In",
        "csrfmiddlewaretoken": csrf_token
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        "Referer": "https://members.foodcoop.com/services/login/",
        "X-CSRFToken": csrf_token
    }

    print(login_data)

    # Get the session loaded
    session.post(COOP_BASEURL + "/services/login/", data=login_data, headers=headers)
    return (login_data, headers)


def found_shifts(shifts):
    return any(day["shifts"] for day in shifts)

def check_all_users_shift_preferences():
    """Iterate over all users and check if their shift preferences match available shifts"""
    try:
        # Get all available shifts
        open_shifts = get_open_shifts_next_2_weeks(
            requests.Session(), 
            *login(requests.Session(), os.getenv('COOP_USERNAME'), os.getenv('COOP_PASSWORD'))
        )
        
        # Get all active users with their shift preferences
        users_with_preferences = db.session.query(User).join(ShiftPreference).filter(
            User.is_active == True,
            User.deleted_at.is_(None),
            ShiftPreference.is_active == True
        ).distinct().all()
        
        matches = []
        
        for user in users_with_preferences:
            user_matches = []
            
            # Check each preference for this user
            for preference in user.shift_preferences:
                if not preference.is_active:
                    continue
                    
                preference_matches = []
                
                # Check against all available shifts
                for day_data in open_shifts:
                    day_name = day_data["day"]
                    
                    # Check if this day matches the user's preferred days
                    if day_name in preference.days:
                        for shift in day_data["shifts"]:
                            # Check if shift type matches (case-insensitive partial match)
                            if preference.shift_type.lower() in shift["description"].lower():
                                # Parse shift time to check if it falls within preferred time range
                                if is_time_in_range(shift["time"], preference.time_range_start, preference.time_range_end):
                                    preference_matches.append({
                                        "day": day_name,
                                        "date": day_data["date"],
                                        "shift": shift,
                                        "matched_preference": {
                                            "id": preference.id,
                                            "shift_type": preference.shift_type,
                                            "days": preference.days,
                                            "time_range_start": preference.time_range_start,
                                            "time_range_end": preference.time_range_end,
                                            "notification_email": preference.notification_email
                                        }
                                    })
                
                if preference_matches:
                    user_matches.extend(preference_matches)
            
            if user_matches:
                matches.append({
                    "user": {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "notification_email": user.notification_email
                    },
                    "matches": user_matches
                })
        
        return matches
        
    except Exception as e:
        print(f'Error checking all users shift preferences: {e}')
        raise e

def is_time_in_range(shift_time_str, start_time, end_time):
    """
    Check if a shift time falls within a user's preferred time range.
    
    Args:
        shift_time_str: String like "5:00 PM - 10:00 PM" or "17:00 - 22:00"
        start_time: String like "17:00"
        end_time: String like "22:00"
    
    Returns:
        bool: True if shift overlaps with preferred time range
    """
    try:
        # Parse the shift time string to extract start and end times
        if " - " in shift_time_str:
            shift_start_str, shift_end_str = shift_time_str.split(" - ")
            
            # Convert 12-hour format to 24-hour if needed
            shift_start_24 = convert_to_24_hour(shift_start_str.strip())
            shift_end_24 = convert_to_24_hour(shift_end_str.strip())
            
            # Convert times to minutes for easier comparison
            shift_start_minutes = time_to_minutes(shift_start_24)
            shift_end_minutes = time_to_minutes(shift_end_24)
            start_minutes = time_to_minutes(start_time)
            end_minutes = time_to_minutes(end_time)
            
            # Check for overlap: shift overlaps if it starts before preference ends and ends after preference starts
            return shift_start_minutes < end_minutes and shift_end_minutes > start_minutes
            
    except Exception as e:
        print(f'Error parsing time range: {e}')
        return False
    
    return False

def convert_to_24_hour(time_str):
    """Convert 12-hour format to 24-hour format"""
    try:
        if "AM" in time_str or "PM" in time_str:
            # Parse 12-hour format
            time_part = time_str.replace("AM", "").replace("PM", "").strip()
            hour, minute = time_part.split(":")
            hour = int(hour)
            minute = int(minute)
            
            if "PM" in time_str and hour != 12:
                hour += 12
            elif "AM" in time_str and hour == 12:
                hour = 0
                
            return f"{hour:02d}:{minute:02d}"
        else:
            # Already in 24-hour format
            return time_str
    except Exception:
        return time_str

def time_to_minutes(time_str):
    """Convert time string (HH:MM) to minutes since midnight"""
    try:
        hour, minute = time_str.split(":")
        return int(hour) * 60 + int(minute)
    except Exception:
        return 0