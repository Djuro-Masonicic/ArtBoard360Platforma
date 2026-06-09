import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: env.webOrigins,
      credentials: true,
    },
  });

  // Global validation keeps controllers lean and ensures DTOs are the single
  // place where request contracts are described.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // These global helpers make local debugging easier without forcing extra
  // boilerplate into every module.
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.enableShutdownHooks();

  // Railway and Docker expose the application through the container network,
  // so the server has to bind to all interfaces instead of localhost only.
  await app.listen(env.apiPort, "0.0.0.0");

  console.info(`API listening on 0.0.0.0:${env.apiPort}`);
}

void bootstrap();
