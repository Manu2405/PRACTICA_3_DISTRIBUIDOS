import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(3001);
  logger.log('Backend escuchando en http://localhost:3001');
  logger.log('Endpoints disponibles:');
  logger.log('  GET  /aeropuertos');
  logger.log('  GET  /vuelos');
  logger.log('  GET  /vuelos/:id');
  logger.log('  GET  /vuelos/:id/asientos');
  logger.log('  POST /vuelos');
  logger.log('  POST /reservas');
  logger.log('  POST /ventas');
  logger.log('  POST /anulaciones');
  logger.log('  GET  /asientos/:id/auditoria');
  logger.log('  GET  /shortest-path?from=A&to=F');
}

bootstrap();
