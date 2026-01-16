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
import dotenv from 'dotenv';
dotenv.config();

/** Express application instance */
const app = express();

/** Port number for the server (defaults to 3000) */
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

/**
 * MongoDB connection configuration
 * Connects to MongoDB using the MONGODB_URI environment variable, or defaults to local instance
 */
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/statcan';

// Fail fast when MongoDB is unavailable to avoid hanging requests.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 5000);

if (shouldConnectMongo) {
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  } as any)
    .then(() => console.log(`✅ MongoDB connected successfully to ${mongoUri}`))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

// Return a clear error instead of hanging when the DB is unavailable.
app.use((req, res, next) => {
  if (!shouldConnectMongo) {
    return next();
  }
  const readyState = mongoose.connection.readyState;
  if (readyState === 1) {
    return next();
  }
  if (readyState === 2) {
    return res.status(503).json({ error: 'Database connection in progress' });
  }
  return res.status(503).json({ error: 'Database not connected' });
});

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