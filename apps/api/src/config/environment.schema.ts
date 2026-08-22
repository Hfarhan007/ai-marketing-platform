import 'reflect-metadata';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

function environmentBoolean({ value }: { value: unknown }): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function emptyStringToUndefined({ value }: { value: unknown }): unknown {
  return value === '' ? undefined : value;
}

export class EnvironmentVariables {
  @IsIn(['fake', 'stripe'])
  BILLING_PROVIDER = 'fake';

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  BILLING_GRACE_PERIOD_DAYS = 7;
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65_535)
  PORT = 3001;
  @IsString()
  @IsNotEmpty()
  HOST = '0.0.0.0';
  @IsString()
  @IsNotEmpty()
  @Matches(/^mongodb(?:\+srv)?:\/\/.+/u)
  MONGODB_URI = 'mongodb://localhost:27017/ai-marketing-platform';
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/u)
  MONGODB_DATABASE?: string;
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/u)
  MONGODB_DATABASE_PREFIX = 'ai_marketing';
  @IsInt()
  @Min(1)
  MONGODB_MIN_POOL_SIZE = 2;
  @IsInt()
  @Min(2)
  MONGODB_MAX_POOL_SIZE = 20;
  @IsInt()
  @Min(1)
  @Max(20)
  MONGODB_MAX_CONNECTING = 4;
  @IsInt()
  @Min(1_000)
  MONGODB_MAX_IDLE_TIME_MS = 60_000;
  @IsInt()
  @Min(100)
  MONGODB_WAIT_QUEUE_TIMEOUT_MS = 2_000;
  @IsInt()
  @Min(500)
  MONGODB_SERVER_SELECTION_TIMEOUT_MS = 5_000;
  @IsInt()
  @Min(1_000)
  MONGODB_SOCKET_TIMEOUT_MS = 45_000;
  @Transform(environmentBoolean)
  @IsBoolean()
  MONGODB_ATLAS_SEARCH_ENABLED = false;
  @IsString()
  @IsNotEmpty()
  REDIS_URL = 'redis://localhost:6379';
  @IsInt()
  @Min(100)
  REQUEST_TIMEOUT_MS = 30_000;
  @IsInt()
  @Min(10)
  MAX_INFLIGHT_REQUESTS = 1_000;
  @IsInt()
  @Min(10)
  MAX_EVENT_LOOP_LAG_MS = 250;
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';
  @IsInt()
  @Min(1)
  RATE_LIMIT_TTL_MS = 60_000;
  @IsInt()
  @Min(1)
  RATE_LIMIT_MAX = 100;
  @IsString()
  TRUST_PROXY = 'false';
  @IsInt()
  @Min(1_024)
  APP_MAX_BODY_SIZE_BYTES = 1_048_576;
  @IsOptional()
  @IsString()
  METRICS_BEARER_TOKEN?: string;
  @IsUrl({ require_tld: false })
  STORAGE_PUBLIC_URL = 'http://localhost:3001/api/v1/files';
  @IsEnum(['local', 's3', 'r2'])
  STORAGE_PROVIDER: 'local' | 's3' | 'r2' = 'local';
  @IsString()
  STORAGE_LOCAL_PATH = '.data/uploads';
  @IsOptional() @IsString() STORAGE_BUCKET?: string;
  @IsOptional() @IsString() STORAGE_REGION?: string;
  @IsOptional() @IsUrl({ require_tld: false }) STORAGE_ENDPOINT?: string;
  @IsOptional() @IsString() STORAGE_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() STORAGE_SECRET_ACCESS_KEY?: string;
  @IsInt() @Min(1) STORAGE_MAX_FILE_SIZE_BYTES = 52_428_800;
  @IsString()
  AUTH_ISSUER = 'ai-marketing-platform';
  @IsString()
  @MinLength(32)
  AUTH_ACCESS_TOKEN_SECRET = 'development-access-token-secret-change-me';
  @IsString()
  @Matches(/^[A-Za-z0-9+/]{43}=$/u)
  AUTH_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  @IsInt()
  @Min(60)
  AUTH_ACCESS_TOKEN_TTL_SECONDS = 900;
  @IsInt()
  @Min(300)
  AUTH_REFRESH_TOKEN_TTL_SECONDS = 2_592_000;
  @IsInt()
  @Min(1)
  AUTH_LOCKOUT_ATTEMPTS = 5;
  @IsInt()
  @Min(60)
  AUTH_LOCKOUT_SECONDS = 900;
  @Transform(environmentBoolean)
  @IsBoolean()
  AUTH_COOKIE_SECURE = false;
  @Transform(environmentBoolean)
  @IsBoolean()
  AUTH_RESET_REVOKES_ALL_SESSIONS = true;
  @IsString()
  AI_PROVIDER = 'disabled';
  @IsString()
  AI_ALLOWED_PROVIDERS = 'ollama';
  @IsInt() @Min(100) AI_TIMEOUT_MS = 30_000;
  @IsInt() @Min(1) AI_MONTHLY_TOKEN_QUOTA = 1_000_000;
  @Type(() => Number) @Min(0) AI_MONTHLY_COST_QUOTA_USD = 100;
  @IsOptional() @IsString() OPENAI_API_KEY?: string;
  @IsOptional() @IsUrl({ require_tld: false }) OPENAI_BASE_URL?: string;
  @IsOptional() @IsString() GEMINI_API_KEY?: string;
  @IsOptional() @IsUrl({ require_tld: false }) GEMINI_BASE_URL?: string;
  @IsOptional() @IsString() GROQ_API_KEY?: string;
  @IsOptional() @IsUrl({ require_tld: false }) GROQ_BASE_URL?: string;
  @IsOptional() @IsString() OPENROUTER_API_KEY?: string;
  @IsOptional() @IsUrl({ require_tld: false }) OPENROUTER_BASE_URL?: string;
  @IsUrl({ require_tld: false }) OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
  @IsOptional() @IsString() META_APP_ID?: string;
  @IsOptional() @IsString() META_APP_SECRET?: string;
  @IsString() META_GRAPH_API_VERSION = 'v23.0';
  @IsOptional() @IsString() META_WEBHOOK_VERIFY_TOKEN?: string;
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUrl({ require_tld: false })
  META_REDIRECT_URI?: string;
  @IsOptional() @IsString() HIGHLEVEL_CLIENT_ID?: string;
  @IsOptional() @IsString() HIGHLEVEL_CLIENT_SECRET?: string;
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUrl({ require_tld: false })
  HIGHLEVEL_REDIRECT_URI?: string;
  @IsOptional() @IsString() HIGHLEVEL_WEBHOOK_PUBLIC_KEY?: string;
  @IsOptional() @IsUrl() HIGHLEVEL_API_BASE_URL?: string;
}

export function validateEnvironment(input: Record<string, unknown>): Record<string, unknown> {
  const environment = plainToInstance(EnvironmentVariables, input, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(environment, {
    forbidUnknownValues: true,
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new Error(`Environment validation failed: ${messages.join('; ')}`);
  }
  if (
    environment.NODE_ENV === Environment.Production &&
    (environment.AUTH_ACCESS_TOKEN_SECRET.includes('development') ||
      environment.AUTH_ENCRYPTION_KEY === 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' ||
      !environment.AUTH_COOKIE_SECURE)
  ) {
    throw new Error('Production authentication secrets and secure cookies must be configured');
  }
  return environment as unknown as Record<string, unknown>;
}
