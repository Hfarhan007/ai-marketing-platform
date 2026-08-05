import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

export interface RedisTestEnvironment { database: number; stop(): Promise<void>; url: string }

export async function startRedisContainer(database = 15): Promise<RedisTestEnvironment> {
  const container: StartedTestContainer = await new GenericContainer('redis:7.4-alpine')
    .withExposedPorts(6379).withWaitStrategy(Wait.forLogMessage('Ready to accept connections')).start();
  return { database, url: `redis://${container.getHost()}:${container.getMappedPort(6379)}/${database}`, stop: () => container.stop().then(() => undefined) };
}

export function isolatedRedisUrl(baseUrl: string, database: number): string {
  if (!Number.isInteger(database) || database < 0 || database > 15) throw new Error('Redis test database must be between 0 and 15');
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}
