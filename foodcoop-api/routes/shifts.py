from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ShiftPreference, User
from datetime import datetime

shifts_bp = Blueprint('shifts', __name__)

@shifts_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_shift_preferences():
    """Get all shift preferences for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        
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
        current_user_id = get_jwt_identity()['user_id']
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
        current_user_id = get_jwt_identity()['user_id']
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
        current_user_id = get_jwt_identity()['user_id']

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