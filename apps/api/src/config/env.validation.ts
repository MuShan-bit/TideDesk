import * as Joi from 'joi';
import { crawlerAdapterNames } from '../modules/crawler/crawler.constants';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  DATABASE_URL: Joi.string().required(),
  INTERNAL_API_SHARED_SECRET: Joi.string().min(16).required(),
  CREDENTIAL_ENCRYPTION_KEY: Joi.string().min(16).required(),
  CRAWLER_ADAPTER_NAME: Joi.string()
    .valid(...crawlerAdapterNames)
    .default('mock'),
  X_BROWSER_EXECUTABLE_PATH: Joi.string().optional(),
  X_BROWSER_CHANNEL: Joi.string().optional(),
  X_BINDING_SESSION_TIMEOUT_SECONDS: Joi.number()
    .integer()
    .min(60)
    .default(600),
  REAL_CRAWLER_MAX_POSTS: Joi.number().integer().min(1).max(100).default(20),
  AI_PROVIDER_DEFAULT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(30000),
  AI_GATEWAY_RATE_LIMIT_WINDOW_SECONDS: Joi.number()
    .integer()
    .min(10)
    .max(3600)
    .default(60),
  AI_GATEWAY_MAX_REQUESTS_PER_WINDOW: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(20),
  AI_GATEWAY_DAILY_TOKEN_LIMIT: Joi.number()
    .integer()
    .min(1000)
    .max(100000000)
    .default(2000000),
});
