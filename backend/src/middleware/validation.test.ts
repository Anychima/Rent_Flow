import { Request, Response, NextFunction } from 'express';
import { validateBody, validateParams, validateQuery, commonSchemas } from './validation';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    it('should pass validation with valid data', () => {
      mockReq.body = {
        name: 'John Doe',
        age: 25,
        email: 'john@example.com',
      };

      const middleware = validateBody({
        name: { type: 'string', required: true, min: 3, max: 50 },
        age: { type: 'number', required: true, min: 18, max: 100 },
        email: { type: 'email', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation when required field is missing', () => {
      mockReq.body = {
        name: 'John',
      };

      const middleware = validateBody({
        name: { type: 'string', required: true },
        email: { type: 'email', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('email'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation when string is too short', () => {
      mockReq.body = {
        name: 'Jo',
      };

      const middleware = validateBody({
        name: { type: 'string', required: true, min: 3 },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('at least 3 characters'),
        })
      );
    });

    it('should fail validation when number is below minimum', () => {
      mockReq.body = {
        age: 15,
      };

      const middleware = validateBody({
        age: { type: 'number', required: true, min: 18 },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('at least 18'),
        })
      );
    });

    it('should validate email format', () => {
      mockReq.body = {
        email: 'invalid-email',
      };

      const middleware = validateBody({
        email: { type: 'email', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('valid email'),
        })
      );
    });

    it('should validate UUID format', () => {
      mockReq.body = {
        userId: 'not-a-uuid',
      };

      const middleware = validateBody({
        userId: { type: 'uuid', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('valid UUID'),
        })
      );
    });

    it('should validate enum values', () => {
      mockReq.body = {
        role: 'admin',
      };

      const middleware = validateBody({
        role: { type: 'string', required: true, enum: ['manager', 'tenant'] },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('manager, tenant'),
        })
      );
    });

    it('should validate pattern regex', () => {
      mockReq.body = {
        date: '2025/01/24',
      };

      const middleware = validateBody({
        date: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('pattern'),
        })
      );
    });

    it('should execute custom validation function', () => {
      mockReq.body = {
        password: 'weak',
      };

      const middleware = validateBody({
        password: {
          type: 'string',
          required: true,
          custom: (value: string) => {
            if (value.length < 8) return 'Password must be at least 8 characters';
            return true;
          },
        },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('at least 8 characters'),
        })
      );
    });

    it('should allow optional fields to be undefined', () => {
      mockReq.body = {
        name: 'John',
      };

      const middleware = validateBody({
        name: { type: 'string', required: true },
        nickname: { type: 'string', required: false },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should validate URL parameters', () => {
      mockReq.params = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const middleware = validateParams({
        id: { type: 'uuid', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail when param is invalid', () => {
      mockReq.params = {
        id: 'invalid',
      };

      const middleware = validateParams({
        id: { type: 'uuid', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      mockReq.query = {
        page: '1',
        limit: '10',
        role: 'tenant',
      };

      const middleware = validateQuery({
        page: { type: 'number', required: false, min: 1 },
        limit: { type: 'number', required: false, min: 1, max: 100 },
        role: { type: 'string', required: true, enum: ['manager', 'tenant'] },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail when query param is out of range', () => {
      mockReq.query = {
        limit: '200',
      };

      const middleware = validateQuery({
        limit: { type: 'number', required: true, min: 1, max: 100 },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('commonSchemas', () => {
    it('should validate UUID with common schema', () => {
      mockReq.params = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const middleware = validateParams({
        userId: commonSchemas.uuid,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate email with common schema', () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      const middleware = validateBody({
        email: commonSchemas.email,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate positive number with common schema', () => {
      mockReq.body = {
        amount: 100,
      };

      const middleware = validateBody({
        amount: commonSchemas.positiveNumber,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Array validation', () => {
    it('should validate array type', () => {
      mockReq.body = {
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const middleware = validateBody({
        tags: { type: 'array', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail when non-array provided for array type', () => {
      mockReq.body = {
        tags: 'not-an-array',
      };

      const middleware = validateBody({
        tags: { type: 'array', required: true },
      });

      // Expect ApiError to be thrown
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow();
    });
  });

  describe('Object validation', () => {
    it('should validate object type', () => {
      mockReq.body = {
        metadata: { key: 'value' },
      };

      const middleware = validateBody({
        metadata: { type: 'object', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail when non-object provided for object type', () => {
      mockReq.body = {
        metadata: 'not-an-object',
      };

      const middleware = validateBody({
        metadata: { type: 'object', required: true },
      });

      // Expect ApiError to be thrown
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow();
    });
  });

  describe('Boolean validation', () => {
    it('should validate boolean type', () => {
      mockReq.body = {
        isActive: true,
      };

      const middleware = validateBody({
        isActive: { type: 'boolean', required: true },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail when non-boolean provided', () => {
      mockReq.body = {
        isActive: 'yes',
      };

      const middleware = validateBody({
        isActive: { type: 'boolean', required: true },
      });

      // Expect ApiError to be thrown
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow();
    });
  });
});
