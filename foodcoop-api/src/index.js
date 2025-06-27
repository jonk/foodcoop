const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Import route modules
const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shifts');
const userRoutes = require('./routes/users');

// Create Express app instance
const app = express();

// Middleware configuration
// CORS allows your React frontend to make requests to this API
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite's default port
  credentials: true // Allows cookies to be sent with requests
}));

// Parse JSON request bodies (for POST/PUT requests)
app.use(express.json());

// Parse URL-encoded request bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Basic logging middleware - logs all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint - useful for monitoring
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
// All routes are prefixed with /api for organization
app.use('/api/auth', authRoutes);    // Authentication routes (login, register, logout)
app.use('/api/shifts', shiftRoutes); // Shift management routes
app.use('/api/users', userRoutes);   // User profile and settings routes

// 404 handler for undefined routes
app.use('/{*any}', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler - catches any errors thrown in routes
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
    
  res.status(error.status || 500).json({ 
    error: message 
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // Export for testing purposes 