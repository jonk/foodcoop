from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from models import db, User, UserSettings
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')

        # Validate input
        if not email or not password or not name:
            return jsonify({'error': 'Email, password, and name are required'}), 400

        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), 409

        # Hash the password
        salt_rounds = 10
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(salt_rounds))

        # Create new user with default settings
        new_user = User(
            email=email,
            name=name,
            password=hashed_password.decode('utf-8'),
            notification_email=email  # Default to same email
        )
        
        db.session.add(new_user)
        db.session.flush()  # Get the user ID
        
        # Create default settings
        default_settings = UserSettings(
            user_id=new_user.id,
            email_notifications=True,
            check_frequency='5min',
            timezone='America/New_York'
        )
        db.session.add(default_settings)
        db.session.commit()

        # Generate JWT token
        token = create_access_token(
            identity=str(new_user.id)
        )

        # Return user data (without password) and token
        user_data = {
            'id': new_user.id,
            'email': new_user.email,
            'name': new_user.name,
            'notificationEmail': new_user.notification_email,
            'coopUsername': new_user.coop_username,
            'isActive': new_user.is_active,
            'createdAt': new_user.created_at.isoformat(),
            'updatedAt': new_user.updated_at.isoformat(),
            'settings': {
                'emailNotifications': default_settings.email_notifications,
                'checkFrequency': default_settings.check_frequency,
                'timezone': default_settings.timezone
            }
        }

        return jsonify({
            'message': 'User registered successfully',
            'user': user_data,
            'token': token
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f'Registration error: {e}')
        return jsonify({'error': 'Failed to register user'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login existing user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # Validate input
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401

        # Compare password with hashed password
        is_password_valid = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
        if not is_password_valid:
            return jsonify({'error': 'Invalid email or password'}), 401

        # Generate JWT token
        token = create_access_token(
            identity=str(user.id)
        )

        # Get user settings
        settings = user.settings
        settings_data = {
            'emailNotifications': True,
            'checkFrequency': '5min',
            'timezone': 'America/New_York'
        }
        if settings:
            settings_data = {
                'emailNotifications': settings.email_notifications,
                'checkFrequency': settings.check_frequency,
                'timezone': settings.timezone
            }

        # Return user data (without password) and token
        user_data = {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'notificationEmail': user.notification_email,
            'coopUsername': user.coop_username,
            'isActive': user.is_active,
            'createdAt': user.created_at.isoformat(),
            'updatedAt': user.updated_at.isoformat(),
            'settings': settings_data
        }

        return jsonify({
            'message': 'Login successful',
            'user': user_data,
            'token': token
        })

    except Exception as e:
        print(f'Login error: {e}')
        return jsonify({'error': 'Failed to login'}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user (client-side token removal)"""
    # JWT tokens are stateless, so logout is handled client-side
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user profile (requires authentication)"""
    try:
        current_user_id = int(get_jwt_identity())
        
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

        user_data = {
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

        return jsonify({'user': user_data})

    except Exception as e:
        print(f'Error fetching user profile: {e}')
        return jsonify({'error': 'Failed to fetch user profile'}), 500 