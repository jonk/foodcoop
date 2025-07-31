from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import bcrypt
from models import db, User, UserSettings, Notification
from datetime import datetime

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get current user's profile"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        
        # Find user by ID with related data
        user = User.query.filter_by(id=current_user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get active shift preferences
        shift_preferences = []
        for pref in user.shift_preferences:
            if pref.is_active:
                shift_preferences.append({
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

        # Get settings
        settings_data = {
            'emailNotifications': True,
            'checkFrequency': '5min',
            'timezone': 'America/New_York'
        }
        if user.settings:
            settings_data = {
                'emailNotifications': user.settings.email_notifications,
                'checkFrequency': user.settings.check_frequency,
                'timezone': user.settings.timezone
            }

        user_profile = {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'notificationEmail': user.notification_email,
            'coopUsername': user.coop_username,
            'isActive': user.is_active,
            'createdAt': user.created_at.isoformat(),
            'updatedAt': user.updated_at.isoformat(),
            'settings': settings_data,
            'shiftPreferences': shift_preferences
        }
        
        return jsonify({'user': user_profile})
        
    except Exception as e:
        print(f'Error fetching user profile: {e}')
        return jsonify({'error': 'Failed to fetch user profile'}), 500

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """Update current user's profile"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        data = request.get_json()
        
        name = data.get('name')
        notification_email = data.get('notificationEmail')
        coop_username = data.get('coopUsername')
        coop_password = data.get('coopPassword')
        
        # Build update data object (only include provided fields)
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if notification_email is not None:
            update_data['notification_email'] = notification_email
        if coop_username is not None:
            update_data['coop_username'] = coop_username
        if coop_password is not None:
            update_data['coop_password'] = coop_password

        # Update user
        user = User.query.filter_by(id=current_user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        for key, value in update_data.items():
            setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        db.session.commit()

        # Get updated user with settings
        updated_user = User.query.filter_by(id=current_user_id).first()
        
        # Get settings
        settings_data = {
            'emailNotifications': True,
            'checkFrequency': '5min',
            'timezone': 'America/New_York'
        }
        if updated_user.settings:
            settings_data = {
                'emailNotifications': updated_user.settings.email_notifications,
                'checkFrequency': updated_user.settings.check_frequency,
                'timezone': updated_user.settings.timezone
            }

        user_profile = {
            'id': updated_user.id,
            'email': updated_user.email,
            'name': updated_user.name,
            'notificationEmail': updated_user.notification_email,
            'coopUsername': updated_user.coop_username,
            'isActive': updated_user.is_active,
            'createdAt': updated_user.created_at.isoformat(),
            'updatedAt': updated_user.updated_at.isoformat(),
            'settings': settings_data
        }
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user_profile
        })
        
    except Exception as e:
        db.session.rollback()
        print(f'Error updating user profile: {e}')
        return jsonify({'error': 'Failed to update user profile'}), 500

@users_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_user_settings():
    """Update user settings (notification preferences, etc.)"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        data = request.get_json()
        
        email_notifications = data.get('emailNotifications')
        check_frequency = data.get('checkFrequency')
        timezone = data.get('timezone')
        
        # Build update data object
        update_data = {}
        if email_notifications is not None:
            update_data['email_notifications'] = email_notifications
        if check_frequency is not None:
            update_data['check_frequency'] = check_frequency
        if timezone is not None:
            update_data['timezone'] = timezone

        # Update or create settings
        existing_settings = UserSettings.query.filter_by(user_id=current_user_id).first()
        
        if existing_settings:
            # Update existing settings
            for key, value in update_data.items():
                setattr(existing_settings, key, value)
            existing_settings.updated_at = datetime.utcnow()
            updated_settings = existing_settings
        else:
            # Create new settings
            updated_settings = UserSettings(
                user_id=current_user_id,
                email_notifications=email_notifications if email_notifications is not None else True,
                check_frequency=check_frequency or '5min',
                timezone=timezone or 'America/New_York'
            )
            db.session.add(updated_settings)
        
        db.session.commit()

        settings_data = {
            'id': updated_settings.id,
            'userId': updated_settings.user_id,
            'emailNotifications': updated_settings.email_notifications,
            'checkFrequency': updated_settings.check_frequency,
            'timezone': updated_settings.timezone,
            'createdAt': updated_settings.created_at.isoformat(),
            'updatedAt': updated_settings.updated_at.isoformat()
        }

        return jsonify({
            'message': 'Settings updated successfully',
            'settings': settings_data
        })
        
    except Exception as e:
        db.session.rollback()
        print(f'Error updating user settings: {e}')
        return jsonify({'error': 'Failed to update user settings'}), 500

@users_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_user_settings():
    """Get current user's settings"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        
        # Find user settings
        settings = UserSettings.query.filter_by(user_id=current_user_id).first()
        
        # Return default settings if none exist
        if settings:
            user_settings = {
                'id': settings.id,
                'userId': settings.user_id,
                'emailNotifications': settings.email_notifications,
                'checkFrequency': settings.check_frequency,
                'timezone': settings.timezone,
                'createdAt': settings.created_at.isoformat(),
                'updatedAt': settings.updated_at.isoformat()
            }
        else:
            user_settings = {
                'emailNotifications': True,
                'checkFrequency': '5min',
                'timezone': 'America/New_York'
            }
        
        return jsonify({'settings': user_settings})
        
    except Exception as e:
        print(f'Error fetching user settings: {e}')
        return jsonify({'error': 'Failed to fetch user settings'}), 500

@users_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user's password"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        data = request.get_json()
        
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        # Validate input
        if not current_password or not new_password:
            return jsonify({
                'error': 'Current password and new password are required'
            }), 400

        # Find user
        user = User.query.filter_by(id=current_user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify current password
        is_current_password_valid = bcrypt.checkpw(
            current_password.encode('utf-8'), 
            user.password.encode('utf-8')
        )
        if not is_current_password_valid:
            return jsonify({'error': 'Current password is incorrect'}), 400

        # Hash new password
        salt_rounds = 10
        hashed_new_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(salt_rounds))

        # Update password
        user.password = hashed_new_password.decode('utf-8')
        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Password changed successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f'Error changing password: {e}')
        return jsonify({'error': 'Failed to change password'}), 500

@users_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete user account (soft delete)"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        
        # Soft delete - mark as deleted instead of actually removing
        user = User.query.filter_by(id=current_user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.deleted_at = datetime.utcnow()
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Account deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f'Error deleting account: {e}')
        return jsonify({'error': 'Failed to delete account'}), 500

@users_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get user's notifications"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        
        notifications = Notification.query.filter_by(user_id=current_user_id)\
            .order_by(Notification.sent_at.desc())\
            .limit(50).all()  # Limit to 50 most recent
        
        notifications_data = []
        for notification in notifications:
            notifications_data.append({
                'id': notification.id,
                'type': notification.type,
                'title': notification.title,
                'message': notification.message,
                'isRead': notification.is_read,
                'sentAt': notification.sent_at.isoformat(),
                'readAt': notification.read_at.isoformat() if notification.read_at else None
            })
        
        return jsonify({'notifications': notifications_data})
        
    except Exception as e:
        print(f'Error fetching notifications: {e}')
        return jsonify({'error': 'Failed to fetch notifications'}), 500

@users_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark notification as read"""
    try:
        current_user_id = get_jwt_identity()['user_id']
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'})
        
    except Exception as e:
        db.session.rollback()
        print(f'Error marking notification as read: {e}')
        return jsonify({'error': 'Failed to mark notification as read'}), 500 