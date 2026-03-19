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
});
