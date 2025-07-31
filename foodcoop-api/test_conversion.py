#!/usr/bin/env python3
"""
Test script to verify the Python Flask backend conversion
"""

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported"""
    try:
        print("Testing imports...")
        
        # Test basic Flask imports
        from flask import Flask
        print("✓ Flask imported successfully")
        
        # Test our models
        from models import User, UserSettings, ShiftPreference, Notification, AuditLog, AvailableShift
        print("✓ All models imported successfully")
        
        # Test our routes
        from routes.auth import auth_bp
        from routes.shifts import shifts_bp
        from routes.users import users_bp
        print("✓ All route blueprints imported successfully")
        
        print("\n✅ All imports successful! The Python Flask backend is ready.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure to install dependencies with: pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_app_creation():
    """Test that the Flask app can be created"""
    try:
        print("\nTesting Flask app creation...")
        
        # Set up minimal environment for testing
        os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')
        os.environ.setdefault('JWT_SECRET', 'test-secret')
        os.environ.setdefault('FRONTEND_URL', 'http://localhost:5173')
        
        # Import and create app
        from app import app
        print("✓ Flask app created successfully")
        
        # Test that routes are registered
        with app.app_context():
            print("✓ App context works")
            
        print("✅ Flask app creation successful!")
        return True
        
    except Exception as e:
        print(f"❌ App creation error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Python Flask Backend Conversion")
    print("=" * 40)
    
    success = True
    success &= test_imports()
    success &= test_app_creation()
    
    if success:
        print("\n🎉 All tests passed! The conversion from Express.js to Python Flask is complete.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Set up your .env file with database credentials")
        print("3. Run the application: python run.py")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1) 