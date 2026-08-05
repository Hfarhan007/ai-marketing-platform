import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class HttpObservabilityInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = performance.now();
    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; routeOptions?: { url?: string }; url: string }>();
    const reply = http.getResponse<{ statusCode: number }>();
    return next.handle().pipe(finalize(() => this.metrics.observeHttp(request.method, request.routeOptions?.url ?? request.url, reply.statusCode, performance.now() - started)));
  }
}
