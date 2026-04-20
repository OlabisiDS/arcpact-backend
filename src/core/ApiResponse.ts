import { Response } from 'express';

/**
 * Sends a standardized success response.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Sends a standardized error response.
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
