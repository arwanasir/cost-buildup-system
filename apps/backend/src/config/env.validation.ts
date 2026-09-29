import * as joi from 'joi';

export const envValidationSchema = joi.object({
  NODE_ENV: joi
    .string()
    .valid('development', 'test', 'production', 'provision')
    .default('development'),
  PORT: joi.number().port().default(3000),
  POSTGRES_HOST: joi.string().required(),
  POSTGRES_PORT: joi.number().default(5432),
  POSTGRES_USER: joi.string().required(),
  POSTGRES_PASSWORD: joi.string().allow('').required(),
  POSTGRES_DB: joi.string().required(),
  DATABASE_URL: joi.string().optional(),

  JWT_ACCESS_SECRET: joi.string().required(),
  JWT_ACCESS_EXPIRATION: joi.string().default('15m'),
  JWT_REFRESH_SECRET: joi.string().required(),
  JWT_REFRESH_EXPIRATION: joi.string().default('7d'),

  MINIO_ENDPOINT: joi.string().default('localhost'),
  MINIO_PORT: joi.number().port().default(9000),
  MINIO_USE_SSL: joi.boolean().default(false),
  MINIO_ROOT_USER: joi.string().required(),
  MINIO_ROOT_PASSWORD: joi.string().required(),
  MINIO_BUCKET: joi.string().default('costbuildup-documents'),

  SMTP_HOST: joi.string().default('localhost'),
  SMTP_PORT: joi.number().port().default(1025),
  SMTP_USER: joi.string().allow('').optional(),
  SMTP_PASS: joi.string().allow('').optional(),
  SMTP_FROM: joi.string().email().default('noreply@costbuildup.local'),

  ERP_BASE_URL: joi.string().uri().default('http://localhost:3001'),
  ERP_API_KEY: joi.string().required(),
});
