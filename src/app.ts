import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import router from './routes';
import { AppError } from './core/AppError';
import logger from './utils/logger';

const app: Application = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────

// Allow requests from the ArcPact frontend dev server.
// Must be registered BEFORE routes so preflight OPTIONS requests are handled.
app.use(cors({
  origin: ['http://localhost:5173', 'https://arcpact.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/v1', router);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Route not found', 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.statusCode} — ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  logger.error(`[UnhandledError] ${err.message}`);
  logger.error(err.stack ?? 'No stack trace');

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
  });
});

export default app;
