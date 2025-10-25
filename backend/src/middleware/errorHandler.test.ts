/**
 * Error Handler Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiErrors, errorHandler, validationErrorHandler, handleDatabaseError } from '../middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn(() => ({ json: jsonSpy }));
    
    mockRequest = {
      method: 'GET',
      path: '/test'
    };
    
    mockResponse = {
      status: statusSpy as any
    };
    
    mockNext = jest.fn();
  });

  describe('ApiError', () => {
    it('should create an operational error', () => {
      const error = new ApiError(400, 'Bad request', true);
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(500, 'Server error');
      
      expect(error.stack).toBeDefined();
    });
  });

  describe('ApiErrors helpers', () => {
    it('should create bad request error', () => {
      const error = ApiErrors.badRequest('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create unauthorized error', () => {
      const error = ApiErrors.unauthorized();
      
      expect(error.statusCode).toBe(401);
    });

    it('should create not found error', () => {
      const error = ApiErrors.notFound();
      
      expect(error.statusCode).toBe(404);
    });

    it('should create internal server error', () => {
      const error = ApiErrors.internal();
      
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('errorHandler', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError(404, 'Not found');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Not found',
            statusCode: 404
          })
        })
      );
    });

    it('should handle regular Error as 500', () => {
      const error = new Error('Unexpected error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(500);
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new ApiError(500, 'Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String)
          })
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new ApiError(500, 'Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      const callArg = jsonSpy.mock.calls[0][0];
      expect(callArg.error.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validationErrorHandler', () => {
    it('should format validation errors', () => {
      const errors = [
        { param: 'email', msg: 'Invalid email', value: 'invalid' },
        { param: 'password', msg: 'Too short', value: '123' }
      ];
      
      const apiError = validationErrorHandler(errors);
      
      expect(apiError.statusCode).toBe(422);
      expect(apiError.data.errors).toHaveLength(2);
      expect(apiError.data.errors[0]).toHaveProperty('field', 'email');
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle unique violation (23505)', () => {
      const dbError = {
        code: '23505',
        constraint: 'users_email_key',
        detail: 'Key (email)=(test@test.com) already exists.'
      };
      
      const apiError = handleDatabaseError(dbError);
      
      expect(apiError.statusCode).toBe(409);
      expect(apiError.message).toContain('already exists');
    });

    it('should handle foreign key violation (23503)', () => {
      const dbError = {
        code: '23503',
        constraint: 'fk_user_id'
      };
      
      const apiError = handleDatabaseError(dbError);
      
      expect(apiError.statusCode).toBe(400);
      expect(apiError.message).toContain('does not exist');
    });

    it('should handle not null violation (23502)', () => {
      const dbError = {
        code: '23502',
        column: 'email'
      };
      
      const apiError = handleDatabaseError(dbError);
      
      expect(apiError.statusCode).toBe(400);
      expect(apiError.message).toContain('Required field');
    });

    it('should handle unknown database errors', () => {
      const dbError = {
        code: 'UNKNOWN',
        message: 'Something went wrong'
      };
      
      const apiError = handleDatabaseError(dbError);
      
      expect(apiError.statusCode).toBe(500);
    });
  });
});
