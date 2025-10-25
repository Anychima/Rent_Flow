/**
 * Logger Service Tests
 */

import Logger, { LogLevel, logger } from '../services/logger';

describe('Logger Service', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Log Levels', () => {
    it('should log debug messages when level is DEBUG', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.DEBUG);
      
      testLogger.debug('Test debug message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when level is INFO', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.INFO);
      
      testLogger.debug('Test debug message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.INFO);
      
      testLogger.info('Test info message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log error messages at any level except NONE', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.ERROR);
      
      testLogger.error('Test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should not log anything when level is NONE', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.NONE);
      
      testLogger.debug('Debug');
      testLogger.info('Info');
      testLogger.warn('Warn');
      testLogger.error('Error');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Context Logging', () => {
    it('should include context in log messages', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.INFO);
      
      testLogger.info('Test message', { key: 'value' }, 'TEST_CONTEXT');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('TEST_CONTEXT'),
        expect.anything()
      );
    });
  });

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should log API requests', () => {
      logger.apiRequest('GET', '/api/test', 'user-123');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Request'),
        expect.anything()
      );
    });

    it('should log API responses', () => {
      logger.apiResponse('GET', '/api/test', 200, 150);
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log payments', () => {
      logger.payment('process', 100, 'completed', 'tx-123');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment process'),
        expect.anything()
      );
    });

    it('should log blockchain transactions', () => {
      logger.blockchain('sign', 'hash-123');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log authentication events', () => {
      logger.auth('login', 'user-123', true);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auth: login'),
        expect.anything()
      );
    });
  });

  describe('Error Logging', () => {
    it('should format Error objects correctly', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.ERROR);
      
      const error = new Error('Test error');
      testLogger.error('An error occurred', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred'),
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String)
        })
      );
    });

    it('should handle non-Error objects', () => {
      const testLogger = new Logger();
      testLogger.setLevel(LogLevel.ERROR);
      
      testLogger.error('Custom error', { code: 500, message: 'Server error' });
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
