const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./errors/errorHandler');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Base health/info endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the POT Serverless Backend API',
    docs: '/api/v1/health',
  });
});

// API Routes
app.use('/api/v1', routes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized safe error handler
app.use(errorHandler);

module.exports = app;
