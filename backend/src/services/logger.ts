/**
 * Centralized Logging Service
 * Provides structured logging with different levels and formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  context?: string;
}

class Logger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
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
   * Format log entry with color coding for console
   */
  private formatMessage(level: string, message: string, data?: any, context?: string): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? `[${context}]` : '';
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] ${level} ${contextStr} ${message}${dataStr}`;
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
   * Debug level logging
   */
  debug(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const emoji = this.getLevelEmoji('DEBUG');
      console.log(`${emoji} ${this.formatMessage('DEBUG', message, data, context)}`);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const emoji = this.getLevelEmoji('INFO');
      console.log(`${emoji} ${this.formatMessage('INFO', message, data, context)}`);
    }
  }

  /**
   * Success logging (special case of info)
   */
  success(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const emoji = this.getLevelEmoji('SUCCESS');
      console.log(`${emoji} ${this.formatMessage('SUCCESS', message, data, context)}`);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any, context?: string): void {
    if (this.currentLevel <= LogLevel.WARN) {
      const emoji = this.getLevelEmoji('WARN');
      console.warn(`${emoji} ${this.formatMessage('WARN', message, data, context)}`);
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
      console.error(`${emoji} ${this.formatMessage('ERROR', message, errorData, context)}`);
    }
  }

  /**
   * API request logging
   */
  apiRequest(method: string, path: string, userId?: string): void {
    this.info(`API Request: ${method} ${path}`, { userId }, 'API');
  }

  /**
   * API response logging
   */
  apiResponse(method: string, path: string, statusCode: number, duration?: number): void {
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    const message = `API Response: ${method} ${path} - ${statusCode}`;
    const data = duration ? { duration: `${duration}ms` } : undefined;
    
    if (level === 'WARN') {
      this.warn(message, data, 'API');
    } else {
      this.info(message, data, 'API');
    }
  }

  /**
   * Database query logging
   */
  dbQuery(operation: string, table: string, duration?: number): void {
    this.debug(`DB Query: ${operation} on ${table}`, duration ? { duration: `${duration}ms` } : undefined, 'DATABASE');
  }

  /**
   * Payment transaction logging
   */
  payment(action: string, amount: number, status: string, transactionId?: string): void {
    this.info(`Payment ${action}: ${amount} USDC - ${status}`, { transactionId }, 'PAYMENT');
  }

  /**
   * Blockchain transaction logging
   */
  blockchain(action: string, hash?: string, error?: any): void {
    if (error) {
      this.error(`Blockchain ${action} failed`, error, 'BLOCKCHAIN');
    } else {
      this.info(`Blockchain ${action}`, { hash }, 'BLOCKCHAIN');
    }
  }

  /**
   * Authentication logging
   */
  auth(action: string, userId?: string, success: boolean = true): void {
    if (success) {
      this.info(`Auth: ${action}`, { userId }, 'AUTH');
    } else {
      this.warn(`Auth: ${action} failed`, { userId }, 'AUTH');
    }
  }

  /**
   * Environment configuration logging
   */
  config(message: string, data?: any): void {
    this.info(message, data, 'CONFIG');
  }

  /**
   * Service initialization logging
   */
  service(name: string, status: 'initialized' | 'failed', error?: any): void {
    if (status === 'initialized') {
      this.success(`${name} service initialized`, undefined, 'SERVICE');
    } else {
      this.error(`${name} service initialization failed`, error, 'SERVICE');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export default Logger;
