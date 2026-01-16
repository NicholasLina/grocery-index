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

// Middleware configuration
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

/**
 * MongoDB connection configuration
 * Connects to MongoDB using the MONGODB_URI environment variable, or defaults to local instance
 */
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/statcan';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any)
  .then(() => console.log(`✅ MongoDB connected successfully to ${mongoUri}`))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/statcan', statcanRouter);

export default app;