import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

/**
 * A single error shape keeps the frontend and future API consumers from having
 * to guess whether a failure came from Nest, Prisma, or a custom throw.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: "A unique field already exists with this value.",
          path: request.url,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      response.status(statusCode).json({
        statusCode,
        message:
          typeof payload === "string"
            ? payload
            : (payload as { message?: string | string[] }).message ?? exception.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.error("Unhandled exception", exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
