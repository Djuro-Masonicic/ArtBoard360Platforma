import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";

/**
 * Lightweight request logging helps during development and debugging without
 * introducing a heavier logging stack too early in the project.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        console.info(`${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`);
      }),
    );
  }
}
