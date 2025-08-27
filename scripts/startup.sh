#!/bin/bash

# Foodcoop Development Environment Startup Script
# This script starts all required services in separate screen sessions

echo "Starting Foodcoop development environment..."

# Check if screen is installed
if ! command -v screen &> /dev/null; then
    echo "Error: screen is not installed. Please install it with: brew install screen"
    exit 1
fi

# Kill any existing session to avoid conflicts
echo "Cleaning up existing screen session..."
screen -S foodcoop -X quit 2>/dev/null || true

# Create a new screen session with multiple windows
echo "Creating screen session with multiple windows..."

# Start the session with PostgreSQL in the first window
echo "Starting PostgreSQL server..."
screen -dmS foodcoop -c /dev/null zsh -c "brew services restart postgresql; exec zsh"

# Wait a moment for PostgreSQL to start
sleep 2

# Add a new window for the Python API server
echo "Starting Python API server..."
screen -S foodcoop -X screen -t api zsh -c "source /Users/jonkalfayan/Developer/foodcoop/.venv/bin/activate && cd /Users/jonkalfayan/Developer/foodcoop/foodcoop-api && python run.py; exec zsh"

# Add a new window for the React frontend
echo "Starting React frontend server..."
screen -S foodcoop -X screen -t frontend zsh -c "cd /Users/jonkalfayan/Developer/foodcoop/foodcoop-react && npm run dev; exec zsh"

# Set window titles for better organization
screen -S foodcoop -p 0 -X title "postgres"

# Set up cron job for shift checking
echo "Setting up cron job for shift checking..."
API_DIR="/Users/jonkalfayan/Developer/foodcoop/foodcoop-api"
(crontab -l 2>/dev/null | grep -v check_shifts_cron.py; echo "* * * * * cd $API_DIR && /Users/jonkalfayan/Developer/foodcoop/.venv/bin/python3 check_shifts_cron.py >> /tmp/foodcoop_shifts.log 2>&1") | crontab -
echo "Cron job added successfully!"

echo ""
echo "All services started! Here's how to manage them:"
echo ""
echo "Attach to the screen session:"
echo "  screen -r foodcoop"
echo ""
echo "Once attached, navigate between windows:"
echo "  Ctrl+A, then 0  # PostgreSQL window"
echo "  Ctrl+A, then 1  # Python API window"
echo "  Ctrl+A, then 2  # React frontend window"
echo "  Ctrl+A, then n  # Next window"
echo "  Ctrl+A, then p  # Previous window"
echo "  Ctrl+A, then \"  # List all windows"
echo ""
echo "Detach from session: Ctrl+A, then D"
echo ""
echo "Stop all services:"
echo "  ./scripts/shutdown.sh"
echo ""
echo "Shift checking cron job:"
echo "  Runs every 15 minutes automatically"
echo "  Logs to: /tmp/foodcoop_shifts.log"
echo "  View logs: tail -f /tmp/foodcoop_shifts.log"
echo "  Remove cron: crontab -l | grep -v check_shifts_cron.py | crontab -"
echo ""
echo "Development environment is ready!"