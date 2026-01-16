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
import type { Request, Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import statcanRouter from './routes/statcan';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
dotenv.config();

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/** Express application instance */
const app = express();

// Middleware configuration
app.use(cors() as RequestHandler); // Enable CORS for all routes
app.use(express.json() as RequestHandler); // Parse JSON request bodies

// Structured logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
});

// Structured request logging with correlation IDs
const httpLogger = pinoHttp({
  logger,
  genReqId: (req: Request) => {
    const existing = req.headers['x-request-id'];
    if (typeof existing === 'string' && existing.length > 0) {
      return existing;
    }
    return randomUUID();
  },
  customLogLevel: (_req: Request, res: Response, err?: Error) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req: Request) {
      const socket = req.socket;
      const connection = (req as Request & { connection?: { remoteAddress?: string; remotePort?: number } })
        .connection;
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          'x-request-id': req.headers['x-request-id'],
          'user-agent': req.headers['user-agent'],
        },
        remoteAddress:
          socket?.remoteAddress ?? connection?.remoteAddress ?? req.ip,
        remotePort: socket?.remotePort ?? connection?.remotePort,
      };
    },
  },
}) as unknown as RequestHandler;

app.use(httpLogger);

// Echo correlation ID back to the client
app.use((req, res, next) => {
  if (req.id) {
    res.setHeader('x-request-id', req.id);
  }
  next();
});

// Healthcheck endpoint (no DB dependency)
app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * MongoDB connection configuration
 * Connects to MongoDB using the MONGODB_URI environment variable, or defaults to local instance
 */
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/statcan';
const shouldConnectMongo =
  process.env.NODE_ENV !== 'test' && process.env.SKIP_MONGO_CONNECT !== 'true';

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
    .then(() => logger.info(`✅ MongoDB connected successfully to ${mongoUri}`))
    .catch((err: unknown) => logger.error({ err }, '❌ MongoDB connection error'));
}

// Return a clear error instead of hanging when the DB is unavailable.
app.use((req, res, next) => {
  if (!shouldConnectMongo) {
    return next();
  }
  if (req.path === '/') {
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

export default app;