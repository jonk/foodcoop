#!/bin/bash

# Food Coop API - Python Flask Backend Startup Script

echo "🚀 Starting Food Coop API (Python Flask Backend)"
echo "================================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if requirements.txt is newer than venv
if [ requirements.txt -nt venv/pyvenv.cfg ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Please create a .env file with the following variables:"
    echo "DATABASE_URL=postgresql://username:password@localhost:5432/foodcoop"
    echo "JWT_SECRET=your-secret-key-here"
    echo "FRONTEND_URL=http://localhost:5173"
    echo "NODE_ENV=development"
    echo "PORT=3000"
    echo ""
    echo "Creating a sample .env file..."
    cat > .env << EOF
DATABASE_URL=sqlite:///foodcoop.db
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000
EOF
    echo "📝 Created sample .env file. Please update it with your actual values."
fi

# Test the conversion
echo "🧪 Testing Python Flask backend..."
python test_conversion.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Tests passed! Starting the server..."
    echo "🌐 Server will be available at: http://localhost:3000"
    echo "📊 Health check: http://localhost:3000/health"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    # Start the Flask application
    python run.py
else
    echo "❌ Tests failed. Please check the errors above."
    exit 1
fi 