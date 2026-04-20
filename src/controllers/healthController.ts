import { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/healthService';

/**
 * GET /health
 * Returns the health status of the ArcPact service.
 */
export const healthCheck = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const status = getHealthStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};
