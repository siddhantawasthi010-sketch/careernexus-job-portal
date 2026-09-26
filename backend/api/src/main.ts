import { NestFactory } from '@nestjs/core';
import { setDefaultResultOrder } from 'node:dns';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Use the project's .env values when a parent shell has stale SMTP variables.
dotenv.config({ override: true });
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : process.env.NODE_ENV !== 'production',
  });

  const port = Number(process.env.PORT) || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is listening on port ${port}`);
}

bootstrap();
