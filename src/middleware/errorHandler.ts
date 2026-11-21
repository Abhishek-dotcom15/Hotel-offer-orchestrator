import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Request error', {
    message: err.message,
    code: err.code,
    stack: err.stack,
  });

  // Determine error type and status code
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.message.includes('Supplier')) {
    statusCode = 502;
    errorCode = 'SUPPLIER_UNAVAILABLE';
  } else if (err.message.includes('Redis') || err.message.includes('ECONNREFUSED')) {
    statusCode = 503;
    errorCode = 'STORAGE_UNAVAILABLE';
  } else if (err.message.includes('Temporal') || err.message.includes('workflow')) {
    statusCode = 504;
    errorCode = 'WORKFLOW_TIMEOUT';
  }

  res.status(statusCode).json({
    error: errorCode,
    message,
  });
}
