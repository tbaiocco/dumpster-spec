import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.message;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
        details = responseObj.details;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = exception.name;
      details =
        process.env.NODE_ENV === 'development' ? exception.stack : undefined;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      error = 'Unknown Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    if (details) {
      errorResponse.details = details;
    }

    // Log error details
    const url = Array.isArray(request.url) ? request.url[0] : request.url;
    const logMessage = `${request.method} ${url} - ${status} - ${message}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }

    // Send error response
    response.status(status).json(errorResponse);
  }
}
