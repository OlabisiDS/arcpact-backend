/**
 * AppError is a custom error class used throughout ArcPact.
 * It carries an HTTP status code alongside the error message,
 * so controllers and middleware can respond correctly.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);

    // Restore the correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}
