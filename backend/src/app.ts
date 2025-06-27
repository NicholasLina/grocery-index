/**
 * Main Express application for the Canadian Grocery Index API
 * 
 * This application provides a REST API for accessing StatCan grocery price data.
 * It connects to MongoDB and provides endpoints for querying price data by various criteria.
 * 
 * @author Canadian Grocery Index Team
 * @version 1.0.0
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import statcanRouter from './routes/statcan';

/** Express application instance */
const app = express();

/** Port number for the server (defaults to 3000) */
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

/**
 * MongoDB connection configuration
 * Connects to the local MongoDB instance with the 'statcan' database
 */
mongoose.connect('mongodb://localhost:27017/statcan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/statcan', statcanRouter);

/**
 * Start the Express server
 * Logs the port number when the server starts successfully
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/statcan`);
}); 