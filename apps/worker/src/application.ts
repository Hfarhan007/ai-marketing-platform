import Redis from 'ioredis';
import mongoose from 'mongoose';
import { loadConfig, type WorkerConfig } from './config.js';
import { HealthServer } from './health/health-server.js';
import { createLogger, type Logger } from './logging.js';
import { createProcessorRegistry } from './processors/processors.js';
import { QueueRegistry } from './queues/queue-registry.js';
import { WorkerRegistry } from './workers/worker-registry.js';
export interface WorkerResources {
  config: WorkerConfig;
  logger: Logger;
  redis: Redis;
  queues: QueueRegistry;
  workers: WorkerRegistry;
  health: HealthServer;
}
export async function startApplication(config = loadConfig()): Promise<WorkerResources> {
  const logger = createLogger(config),
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  await redis.connect();
  await mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
    autoIndex: config.NODE_ENV !== 'production',
  });
  const queues = new QueueRegistry(redis, config.WORKER_PREFIX),
    workers = new WorkerRegistry(redis, config, queues, createProcessorRegistry(), logger),
    health = new HealthServer(config.WORKER_PORT, redis, mongoose, queues, logger);
  workers.start();
  health.start();
  logger.info({ queues: queues.entries().map(([name]) => name) }, 'worker started');
  return { config, logger, redis, queues, workers, health };
}
export async function stopApplication(resources: WorkerResources) {
  resources.logger.info('worker shutdown started');
  await resources.health.close();
  await resources.workers.close();
  await resources.queues.close();
  await mongoose.disconnect();
  await resources.redis.quit();
  resources.logger.info('worker shutdown complete');
}
