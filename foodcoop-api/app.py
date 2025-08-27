from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///foodcoop.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'your-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # 24 hours

# Initialize extensions
jwt = JWTManager(app)
CORS(app, origins=[
    os.getenv('FRONTEND_URL', 'http://localhost:5173'),
    'http://108.14.120.169'
], supports_credentials=True)

# Import models and routes after db initialization
from models import db as models_db, User, UserSettings, ShiftPreference, Notification, AuditLog, AvailableShift
from routes.auth import auth_bp
from routes.shifts import shifts_bp
from routes.users import users_bp

# Initialize the database with the app
migrate = Migrate(app, models_db)
models_db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(shifts_bp, url_prefix='/api/shifts')
app.register_blueprint(users_bp, url_prefix='/api/users')

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': os.getenv('NODE_ENV', 'development')
    })

# 404 handler
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Route not found',
        'path': request.path
    }), 404

# Global error handler
@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f'Error: {e}')
    
    # Don't expose internal errors in production
    message = 'Internal server error' if os.getenv('NODE_ENV') == 'production' else str(e)
    
    return jsonify({'error': message}), 500

# Logging middleware
@app.before_request
def log_request():
    app.logger.info(f'{datetime.utcnow().isoformat()} - {request.method} {request.path}')

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('NODE_ENV') != 'production') 