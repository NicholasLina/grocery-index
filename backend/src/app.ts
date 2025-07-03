/**
 * Main Express application for the Canadian Grocery Index API
 * 
 * This application provides a REST API for accessing StatCan grocery price data.
 * It connects to MongoDB and provides endpoints for querying price data by various criteria.
 * 
 * @author Canadian Grocery Index Team
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import statcanRouter from './routes/statcan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

/** Express application instance */
const app = express();

// Load environment variables
dotenv.config();

// Use helmet for security headers
app.use(helmet());

// Use morgan for logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/** Port number for the server (defaults to 3000) */
const PORT = process.env.PORT || 3000;

// Middleware configuration
const allowedOrigins = [
  'https://groceryindex.nicklina.com'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
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

// Health check endpoint
app.get('/health', (req, res) => res.send('OK'));

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal Server Error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

/**
 * Start the Express server
 * Logs the port number when the server starts successfully
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/statcan`);
}); 