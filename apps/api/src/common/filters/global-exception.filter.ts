import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

interface HttpRequestContext {
  correlationId?: string;
  method: string;
  url: string;
}

interface HttpReplyContext {
  status(code: number): { send(body: unknown): unknown };
}

interface ExceptionBody {
  code?: string;
  details?: unknown;
  error?: string;
  message?: string | string[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<HttpRequestContext>();
    const reply = context.getResponse<HttpReplyContext>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = this.toBody(exception);
    const message = Array.isArray(body.message)
      ? 'Request validation failed'
      : (body.message ?? body.error ?? 'Internal server error');
    if (status >= 500) {
      this.logger.error({ err: exception, requestId: request.correlationId, method: request.method, url: request.url }, 'Request failed');
    }
    void reply.status(status).send({
      statusCode: status,
      requestId: request.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
      error: {
        code: body.code ?? (status === 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`),
        message,
        ...(body.details === undefined && !Array.isArray(body.message) ? {} : { details: body.details ?? body.message }),
      },
    });
  }

  private toBody(exception: unknown): ExceptionBody {
    if (!(exception instanceof HttpException)) return {};
    const response: unknown = exception.getResponse();
    return typeof response === 'string' ? { message: response } : (response as ExceptionBody);
  }
}
