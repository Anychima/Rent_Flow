/**
 * Environment Variable Validation
 * Validates that all required environment variables are set
 */

import { logger } from '../services/logger';

interface EnvConfig {
  // Required variables
  PORT?: string;
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  SUPABASE_SERVICE_KEY?: string;
  CIRCLE_API_KEY?: string;
  ENTITY_SECRET?: string;
  BLOCKCHAIN_NETWORK?: string;
  USDC_TOKEN_ID?: string;
  OPENAI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  DEPLOYER_PRIVATE_KEY?: string;
  DEPLOYER_ADDRESS?: string;
  AI_WALLET_ADDRESS?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if a variable is set and not empty
 */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== 'undefined';
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env as EnvConfig;

  // Critical variables (must be set)
  const criticalVars = {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_KEY: env.SUPABASE_KEY,
    CIRCLE_API_KEY: env.CIRCLE_API_KEY,
    ENTITY_SECRET: env.ENTITY_SECRET,
    BLOCKCHAIN_NETWORK: env.BLOCKCHAIN_NETWORK,
  };

  for (const [key, value] of Object.entries(criticalVars)) {
    if (!isSet(value)) {
      errors.push(`Critical environment variable ${key} is not set`);
    }
  }

  // Important variables (should be set)
  const importantVars = {
    USDC_TOKEN_ID: env.USDC_TOKEN_ID,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY,
    DEPLOYER_PRIVATE_KEY: env.DEPLOYER_PRIVATE_KEY,
    DEPLOYER_ADDRESS: env.DEPLOYER_ADDRESS,
  };

  for (const [key, value] of Object.entries(importantVars)) {
    if (!isSet(value)) {
      warnings.push(`Important environment variable ${key} is not set`);
    }
  }

  // Validate values
  if (env.BLOCKCHAIN_NETWORK && !['solana', 'ethereum', 'polygon'].includes(env.BLOCKCHAIN_NETWORK.toLowerCase())) {
    warnings.push(`BLOCKCHAIN_NETWORK value "${env.BLOCKCHAIN_NETWORK}" is not recognized. Expected: solana, ethereum, or polygon`);
  }

  if (env.PORT && isNaN(Number(env.PORT))) {
    errors.push(`PORT value "${env.PORT}" is not a valid number`);
  }

  // Log results
  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors }, 'ENV_VALIDATION');
  } else if (warnings.length > 0) {
    logger.warn('Environment validation completed with warnings', { warnings }, 'ENV_VALIDATION');
  } else {
    logger.success('Environment validation passed', undefined, 'ENV_VALIDATION');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get environment summary (sanitized for logging)
 */
export function getEnvironmentSummary(): Record<string, string> {
  const env = process.env as EnvConfig;

  return {
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: env.PORT || '3001',
    BLOCKCHAIN_NETWORK: env.BLOCKCHAIN_NETWORK || 'not set',
    SUPABASE_URL: env.SUPABASE_URL ? 'set' : 'not set',
    SUPABASE_KEY: env.SUPABASE_KEY ? 'set' : 'not set',
    SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY ? 'set' : 'not set',
    CIRCLE_API_KEY: env.CIRCLE_API_KEY ? `${env.CIRCLE_API_KEY.substring(0, 15)}...` : 'not set',
    ENTITY_SECRET: env.ENTITY_SECRET ? 'set (hidden)' : 'not set',
    USDC_TOKEN_ID: env.USDC_TOKEN_ID || 'not set',
    OPENAI_API_KEY: env.OPENAI_API_KEY ? 'set (hidden)' : 'not set',
    ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY ? 'set (hidden)' : 'not set',
    DEPLOYER_ADDRESS: env.DEPLOYER_ADDRESS || 'not set',
  };
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export default {
  validateEnvironment,
  getEnvironmentSummary,
  isProduction,
  isDevelopment
};
