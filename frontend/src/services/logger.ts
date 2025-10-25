/**
 * Frontend Logging Service
 * Provides structured logging for React application
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Format timestamp for logs
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Get emoji for log level
   */
  private getLevelEmoji(level: string): string {
    const emojis: Record<string, string> = {
      DEBUG: '🔍',
      INFO: '📋',
      WARN: '⚠️',
      ERROR: '❌',
      SUCCESS: '✅'
    };
    return emojis[level] || '📝';
  }

  /**
   * Format log message
   */
  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? `[${context}]` : '';
    return `[${timestamp}] ${level} ${contextStr} ${message}`;
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const emoji = this.getLevelEmoji('DEBUG');
      console.log(`${emoji} ${this.formatMessage('DEBUG', message, context)}`, data || '');
    }
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const emoji = this.getLevelEmoji('INFO');
      console.log(`${emoji} ${this.formatMessage('INFO', message, context)}`, data || '');
    }
  }

  /**
   * Success logging
   */
  success(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const emoji = this.getLevelEmoji('SUCCESS');
      console.log(`${emoji} ${this.formatMessage('SUCCESS', message, context)}`, data || '');
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.WARN) {
      const emoji = this.getLevelEmoji('WARN');
      console.warn(`${emoji} ${this.formatMessage('WARN', message, context)}`, data || '');
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      const emoji = this.getLevelEmoji('ERROR');
      const errorData = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(`${emoji} ${this.formatMessage('ERROR', message, context)}`, errorData || '');
    }
  }

  /**
   * Component lifecycle logging
   */
  component(componentName: string, action: string, data?: any): void {
    this.debug(`[${componentName}] ${action}`, data, 'COMPONENT');
  }

  /**
   * API call logging
   */
  api(method: string, endpoint: string, status?: 'success' | 'error', data?: any): void {
    const message = `API ${method} ${endpoint}`;
    if (status === 'error') {
      this.error(message, data, 'API');
    } else {
      this.info(message, data, 'API');
    }
  }

  /**
   * User action logging
   */
  userAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, data, 'USER');
  }

  /**
   * Navigation logging
   */
  navigation(from: string, to: string): void {
    this.debug(`Navigation: ${from} → ${to}`, undefined, 'NAVIGATION');
  }

  /**
   * Authentication logging
   */
  auth(action: string, success: boolean, data?: any): void {
    if (success) {
      this.info(`Auth: ${action}`, data, 'AUTH');
    } else {
      this.warn(`Auth: ${action} failed`, data, 'AUTH');
    }
  }

  /**
   * Form validation logging
   */
  validation(formName: string, isValid: boolean, errors?: any): void {
    if (isValid) {
      this.debug(`Form ${formName} validated successfully`, undefined, 'VALIDATION');
    } else {
      this.warn(`Form ${formName} validation failed`, errors, 'VALIDATION');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export default Logger;
