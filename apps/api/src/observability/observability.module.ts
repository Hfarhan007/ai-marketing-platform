import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HttpObservabilityInterceptor } from './http-observability.interceptor.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';
import { GrafanaAdapter, OpenTelemetryAdapter, PrometheusAdapter, SentryAdapter } from './telemetry-adapters.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('app.environment') === 'production' ? 'info' : 'debug',
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
              '*.secret',
              '*.privateMessage',
              '*.credentials',
              '*.apiKey',
              '*.webhookSecret',
              '*.accessToken',
              '*.refreshToken',
              '*.appSecret',
              '*.clientSecret',
              'req.body.*Token',
              'req.body.*Secret',
            ],
            censor: '[REDACTED]',
          },
          serializers: {
            req: (request: { correlationId?: string; id?: string; method?: string; requestId?: string; traceId?: string; url?: string }) => ({
              id: request.id,
              requestId: request.requestId,
              correlationId: request.correlationId,
              traceId: request.traceId,
              method: request.method,
              url: request.url,
            }),
          },
        },
      }),
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    OpenTelemetryAdapter,
    PrometheusAdapter,
    GrafanaAdapter,
    SentryAdapter,
    { provide: APP_INTERCEPTOR, useClass: HttpObservabilityInterceptor },
  ],
  exports: [MetricsService, OpenTelemetryAdapter, PrometheusAdapter, GrafanaAdapter, SentryAdapter],
})
export class ObservabilityModule {}
