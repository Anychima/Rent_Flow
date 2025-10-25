/**
 * API Error Handling Middleware
 * Provides standardized error responses and error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  data?: any;

  constructor(statusCode: number, message: string, isOperational = true, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error creators
 */
export class ApiErrors {
  static badRequest(message: string, data?: any): ApiError {
    return new ApiError(400, message, true, data);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string, data?: any): ApiError {
    return new ApiError(409, message, true, data);
  }

  static unprocessable(message: string, data?: any): ApiError {
    return new ApiError(422, message, true, data);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, false);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(503, message);
  }
}

/**
 * Error response formatter
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    data?: any;
    stack?: string;
  };
}

function formatErrorResponse(error: ApiError, includeStack = false): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
    }
  };

  if (error.data) {
    response.error.data = error.data;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Global error handler middleware
 * Should be placed after all routes
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 server error
  let statusCode = 500;
  let isOperational = false;
  let data: any = undefined;

  // Check if it's our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    isOperational = err.isOperational;
    data = err.data;
  }

  // Log error
  const errorContext = {
    method: req.method,
    path: req.path,
    statusCode,
    isOperational,
    userId: (req as any).user?.id,
  };

  if (isOperational) {
    logger.warn(`Operational error: ${err.message}`, errorContext, 'ERROR_HANDLER');
  } else {
    logger.error('Unexpected error', { ...errorContext, error: err }, 'ERROR_HANDLER');
  }

  // Determine if we should send stack trace (only in development)
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Send error response
  const apiError = err instanceof ApiError 
    ? err 
    : new ApiError(statusCode, err.message, isOperational, data);

  res.status(statusCode).json(formatErrorResponse(apiError, isDevelopment));
}

/**
 * 404 Not Found handler
 * Should be placed before error handler but after all valid routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = ApiErrors.notFound(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 * Formats validation errors in a consistent way
 */
export function validationErrorHandler(errors: any[]): ApiError {
  const formattedErrors = errors.map(err => ({
    field: err.path || err.param,
    message: err.msg || err.message,
    value: err.value
  }));

  return ApiErrors.unprocessable('Validation failed', { errors: formattedErrors });
}

/**
 * Database error handler
 * Converts database errors to API errors
 */
export function handleDatabaseError(error: any): ApiError {
  // PostgreSQL error codes
  const errorCode = error.code;

  switch (errorCode) {
    case '23505': // Unique violation
      return ApiErrors.conflict('Resource already exists', {
        constraint: error.constraint,
        detail: error.detail
      });
    
    case '23503': // Foreign key violation
      return ApiErrors.badRequest('Referenced resource does not exist', {
        constraint: error.constraint,
        detail: error.detail
      });
    
    case '23502': // Not null violation
      return ApiErrors.badRequest('Required field is missing', {
        column: error.column
      });
    
    case '22P02': // Invalid text representation
      return ApiErrors.badRequest('Invalid data format', {
        detail: error.detail
      });

    default:
      logger.error('Unhandled database error', { errorCode, error }, 'DATABASE');
      return ApiErrors.internal('Database operation failed');
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

export default {
  ApiError,
  ApiErrors,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  handleDatabaseError,
  successResponse
};
