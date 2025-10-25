/**
 * Request Validation Middleware
 * Validates incoming request data against schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ApiErrors } from './errorHandler';

/**
 * Validation schema interface
 */
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'uuid';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * Validate a single field
 */
function validateField(fieldName: string, value: any, rule: ValidationRule): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // If field is not required and value is empty, skip other validations
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Check type
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${fieldName} must be a string`;
        }
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${fieldName} must be a number`;
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${fieldName} must be a boolean`;
        }
        break;
      
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `${fieldName} must be an object`;
        }
        break;
      
      case 'array':
        if (!Array.isArray(value)) {
          return `${fieldName} must be an array`;
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return `${fieldName} must be a valid email address`;
        }
        break;
      
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(value))) {
          return `${fieldName} must be a valid UUID`;
        }
        break;
    }
  }

  // Check min/max for numbers and strings
  if (rule.min !== undefined) {
    if (typeof value === 'number' && value < rule.min) {
      return `${fieldName} must be at least ${rule.min}`;
    }
    if (typeof value === 'string' && value.length < rule.min) {
      return `${fieldName} must be at least ${rule.min} characters`;
    }
  }

  if (rule.max !== undefined) {
    if (typeof value === 'number' && value > rule.max) {
      return `${fieldName} must be at most ${rule.max}`;
    }
    if (typeof value === 'string' && value.length > rule.max) {
      return `${fieldName} must be at most ${rule.max} characters`;
    }
  }

  // Check pattern
  if (rule.pattern && typeof value === 'string') {
    if (!rule.pattern.test(value)) {
      return `${fieldName} has invalid format`;
    }
  }

  // Check enum
  if (rule.enum && !rule.enum.includes(value)) {
    return `${fieldName} must be one of: ${rule.enum.join(', ')}`;
  }

  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (result !== true) {
      return typeof result === 'string' ? result : `${fieldName} is invalid`;
    }
  }

  return null;
}

/**
 * Validate request body middleware
 */
export function validateBody(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate each field in schema
    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = req.body[fieldName];
      const error = validateField(fieldName, value, rule);
      
      if (error) {
        errors.push({ field: fieldName, message: error });
      }
    }

    if (errors.length > 0) {
      throw ApiErrors.unprocessable('Validation failed', { errors });
    }

    next();
  };
}

/**
 * Validate request query parameters middleware
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    for (const [fieldName, rule] of Object.entries(schema)) {
      let value: any = req.query[fieldName];
      
      // Try to parse numbers from query strings
      if (rule.type === 'number' && typeof value === 'string') {
        const parsed = Number(value);
        if (!isNaN(parsed)) {
          value = parsed;
        }
      }

      const error = validateField(fieldName, value, rule);
      
      if (error) {
        errors.push({ field: fieldName, message: error });
      }
    }

    if (errors.length > 0) {
      throw ApiErrors.unprocessable('Validation failed', { errors });
    }

    next();
  };
}

/**
 * Validate request params middleware
 */
export function validateParams(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = req.params[fieldName];
      const error = validateField(fieldName, value, rule);
      
      if (error) {
        errors.push({ field: fieldName, message: error });
      }
    }

    if (errors.length > 0) {
      throw ApiErrors.unprocessable('Validation failed', { errors });
    }

    next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: {
    type: 'uuid' as const,
    required: true
  },
  email: {
    type: 'email' as const,
    required: true
  },
  positiveNumber: {
    type: 'number' as const,
    required: true,
    min: 0
  },
  nonEmptyString: {
    type: 'string' as const,
    required: true,
    min: 1
  },
  pagination: {
    page: {
      type: 'number' as const,
      required: false,
      min: 1
    },
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100
    }
  }
};

export default {
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas
};
