import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const normalized = this.normalizeHttpException(statusCode, exceptionResponse);

      response.status(statusCode).json({
        error: {
          ...normalized,
          path: request.url,
          statusCode,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Log the actual error for debugging
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`Unhandled exception on ${request.url}: ${errorMessage}`, errorStack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'internal_error',
        message: 'Internal server error',
        path: request.url,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private normalizeHttpException(statusCode: number, exceptionResponse: string | object) {
    if (typeof exceptionResponse === 'string') {
      return {
        code: this.codeForStatus(statusCode),
        message: exceptionResponse,
      };
    }

    const response = exceptionResponse as {
      error?: string;
      message?: string | string[];
    };

    const details = Array.isArray(response.message) ? response.message : undefined;
    const message = Array.isArray(response.message)
      ? response.message.join(', ')
      : typeof response.message === 'string' && response.message
        ? response.message
        : typeof response.error === 'string' && response.error
          ? response.error
          : 'Request failed';

    return {
      code: this.codeForStatus(statusCode),
      ...(details && details.length > 0 ? { details } : {}),
      message,
    };
  }

  private codeForStatus(statusCode: number) {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'bad_request';
      case HttpStatus.UNAUTHORIZED:
        return 'unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'forbidden';
      case HttpStatus.NOT_FOUND:
        return 'not_found';
      case HttpStatus.CONFLICT:
        return 'conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'unprocessable_entity';
      default:
        return statusCode >= 500 ? 'internal_error' : 'request_error';
    }
  }
}
