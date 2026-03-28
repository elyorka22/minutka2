import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { reflectAllowedOrigin } from '../../cors.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };

    const message =
      typeof body === 'string'
        ? body
        : typeof (body as { message?: string | string[] })?.message === 'string'
          ? (body as { message: string }).message
          : Array.isArray((body as { message?: string[] })?.message)
            ? (body as { message: string[] }).message.join(', ')
            : 'Error';

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} -> ${status}`, exception instanceof Error ? exception.stack : String(exception));
    }

    const origin = req.headers.origin;
    const reflected = typeof origin === 'string' ? reflectAllowedOrigin(origin) : false;
    if (reflected) {
      res.setHeader('Access-Control-Allow-Origin', reflected);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
    });
  }
}
