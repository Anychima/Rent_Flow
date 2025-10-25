/**
 * Environment Validator Tests
 */

import { validateEnvironment, getEnvironmentSummary, isProduction, isDevelopment } from '../utils/envValidator';

describe('Environment Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should pass validation with all required variables set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_KEY = 'test-key';
      process.env.CIRCLE_API_KEY = 'test-circle-key';
      process.env.ENTITY_SECRET = 'test-secret';
      process.env.BLOCKCHAIN_NETWORK = 'solana';

      const result = validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when critical variables are missing', () => {
      process.env.SUPABASE_URL = undefined;
      process.env.SUPABASE_KEY = undefined;

      const result = validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain(
        expect.stringContaining('SUPABASE_URL')
      );
    });

    it('should warn about missing important variables', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_KEY = 'test-key';
      process.env.CIRCLE_API_KEY = 'test-circle-key';
      process.env.ENTITY_SECRET = 'test-secret';
      process.env.BLOCKCHAIN_NETWORK = 'solana';
      process.env.OPENAI_API_KEY = undefined;

      const result = validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate PORT is a number', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_KEY = 'test-key';
      process.env.CIRCLE_API_KEY = 'test-circle-key';
      process.env.ENTITY_SECRET = 'test-secret';
      process.env.BLOCKCHAIN_NETWORK = 'solana';
      process.env.PORT = 'invalid-port';

      const result = validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('PORT')
      );
    });

    it('should validate BLOCKCHAIN_NETWORK value', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_KEY = 'test-key';
      process.env.CIRCLE_API_KEY = 'test-circle-key';
      process.env.ENTITY_SECRET = 'test-secret';
      process.env.BLOCKCHAIN_NETWORK = 'invalid-network';

      const result = validateEnvironment();

      expect(result.warnings).toContain(
        expect.stringContaining('BLOCKCHAIN_NETWORK')
      );
    });
  });

  describe('getEnvironmentSummary', () => {
    it('should return sanitized environment summary', () => {
      process.env.CIRCLE_API_KEY = 'TEST_API_KEY:very-long-secret-key-here';
      process.env.SUPABASE_URL = 'https://test.supabase.co';

      const summary = getEnvironmentSummary();

      expect(summary.CIRCLE_API_KEY).toContain('...');
      expect(summary.CIRCLE_API_KEY).not.toContain('very-long-secret-key');
      expect(summary.SUPABASE_URL).toBe('set');
    });

    it('should show "not set" for missing variables', () => {
      process.env.OPENAI_API_KEY = undefined;

      const summary = getEnvironmentSummary();

      expect(summary.OPENAI_API_KEY).toBe('not set');
    });
  });

  describe('Environment Detection', () => {
    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';

      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';

      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(true);
    });

    it('should treat undefined NODE_ENV as development', () => {
      process.env.NODE_ENV = undefined;

      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(true);
    });
  });
});
