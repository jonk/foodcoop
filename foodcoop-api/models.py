from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY, JSON


# Create db instance that will be initialized in app.py
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(255), nullable=False)  # Hashed password
    notification_email = db.Column(db.String(255), nullable=False)
    coop_username = db.Column(db.String(255))
    coop_password = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime)  # Soft delete
    
    # Relationships
    shift_preferences = db.relationship('ShiftPreference', backref='user', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan')
    settings = db.relationship('UserSettings', backref='user', lazy=True, uselist=False, cascade='all, delete-orphan')

class UserSettings(db.Model):
    __tablename__ = 'user_settings'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    email_notifications = db.Column(db.Boolean, default=True)
    check_frequency = db.Column(db.String(50), default='5min')
    timezone = db.Column(db.String(100), default='America/New_York')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ShiftPreference(db.Model):
    __tablename__ = 'shift_preferences'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shift_type = db.Column(db.String(255), nullable=False)
    days = db.Column(ARRAY(db.String), nullable=False)  # Array of days: ["Monday", "Wednesday"]
    time_range_start = db.Column(db.String(10), nullable=False)  # e.g., "17:00"
    time_range_end = db.Column(db.String(10), nullable=False)  # e.g., "22:00"
    notification_email = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    already_emailed = db.Column(db.Boolean, default=False)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(100), nullable=False)  # "SHIFT_AVAILABLE", "SYSTEM", etc.
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    action = db.Column(db.String(255), nullable=False)  # e.g., "USER_LOGIN", "SHIFT_CHECK", "EMAIL_SENT"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    details = db.Column(JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AvailableShift(db.Model):
    __tablename__ = 'available_shifts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    shift_type = db.Column(db.String(255), nullable=False)
    shift_type_id = db.Column(db.Integer)
    day = db.Column(db.String(50), nullable=False)  # e.g., "Monday"
    date = db.Column(db.String(10), nullable=False)  # e.g., "2024-01-15"
    time = db.Column(db.String(100), nullable=False)  # e.g., "5:00 PM - 10:00 PM"
    location = db.Column(db.String(255))
    href = db.Column(db.Text)  # Link to the shift on the website
    is_available = db.Column(db.Boolean, default=True)
    found_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime) 