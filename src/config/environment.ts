import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  HTTPS_PORT: Joi.number().default(3001),

  // Database
  MONGODB_URI: Joi.string().required(),
  MONGODB_TEST_URI: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Admin
  ADMIN_USERNAME: Joi.string().default('admin'),
  ADMIN_PASSWORD: Joi.string().min(6).required(),

  // WhatsApp
  WHATSAPP_SESSION_PATH: Joi.string().default('./sessions/whatsapp'),
  WHATSAPP_TIMEOUT: Joi.number().default(60000),

  // Telegram
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_API_ID: Joi.number().optional(),
  TELEGRAM_API_HASH: Joi.string().allow('').optional(),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // API Key
  MASTER_API_KEY: Joi.string().allow('').optional(),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),

  // SSL/TLS
  SSL_CERT_PATH: Joi.string().optional(),
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_INTERMEDIATE_PATH: Joi.string().optional(),

}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  httpsPort: envVars.HTTPS_PORT,

  database: {
    uri: envVars.NODE_ENV === 'test' ? envVars.MONGODB_TEST_URI : envVars.MONGODB_URI,
    testUri: envVars.MONGODB_TEST_URI
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN
  },

  admin: {
    username: envVars.ADMIN_USERNAME,
    password: envVars.ADMIN_PASSWORD
  },

  whatsapp: {
    sessionPath: envVars.WHATSAPP_SESSION_PATH,
    timeout: envVars.WHATSAPP_TIMEOUT
  },

  telegram: {
    botToken: envVars.TELEGRAM_BOT_TOKEN,
    apiId: envVars.TELEGRAM_API_ID,
    apiHash: envVars.TELEGRAM_API_HASH,
  },

  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW_MS,
      maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
    },
    masterApiKey: envVars.MASTER_API_KEY
  },

  cors: {
    origin: envVars.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
    credentials: envVars.CORS_CREDENTIALS
  },

  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE
  },

  ssl: {
    certPath: envVars.SSL_CERT_PATH,
    keyPath: envVars.SSL_KEY_PATH,
    intermediatePath: envVars.SSL_INTERMEDIATE_PATH
  },

};

export default config;