import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
@Public()
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metrics: MetricsService, private readonly config: ConfigService) {}
  @Get()
  scrape(@Headers('authorization') authorization?: string): string {
    const token = this.config.get<string>('METRICS_BEARER_TOKEN') ?? process.env.METRICS_BEARER_TOKEN;
    if (token && authorization !== `Bearer ${token}`) throw new UnauthorizedException('Invalid metrics credentials');
    return this.metrics.renderPrometheus();
  }
}
