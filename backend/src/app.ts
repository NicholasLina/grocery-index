/**
 * Main Express application for the Canadian Grocery Index API (SQLite-backed)
 */

import express from 'express';
import type { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import statcanRouter from './routes/statcan';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { getSqlitePath, isDatabaseReady } from './db/sqlite';

dotenv.config();

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

const app = express();

app.use(cors() as RequestHandler);
app.use(express.json() as RequestHandler);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
});

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

app.use((req, res, next) => {
  if (req.id) {
    res.setHeader('x-request-id', req.id);
  }
  next();
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', storage: 'sqlite' });
});

const shouldConnectDatabase = () =>
  process.env.NODE_ENV !== 'test' || process.env.SKIP_DB_CONNECT !== 'true';

if (shouldConnectDatabase()) {
  logger.info(`SQLite database path: ${getSqlitePath()}`);
}

app.use(async (req, res, next) => {
  if (!shouldConnectDatabase()) {
    return next();
  }
  if (req.path === '/') {
    return next();
  }
  if (isDatabaseReady()) {
    return next();
  }
  return res.status(503).json({ error: 'Database not connected' });
});

app.use('/api/statcan', statcanRouter);

export default app;
