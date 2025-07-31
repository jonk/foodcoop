#!/usr/bin/env python3
"""
Run script for the Flask application
"""

from app import app
from models import db

if __name__ == '__main__':
    with app.app_context():
        # Create all database tables
        db.create_all()
        print("Database tables created/verified")
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=3000, debug=True) 