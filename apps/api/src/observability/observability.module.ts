import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

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
            ],
            censor: '[REDACTED]',
          },
          serializers: {
            req: (request: { id?: string; method?: string; url?: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url,
            }),
          },
        },
      }),
    }),
  ],
})
export class ObservabilityModule {}
