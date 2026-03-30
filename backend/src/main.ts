// src/main.ts  — REEMPLAZA el archivo existente
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  (await app).enableCors({
    origin: '*',       // En producción limitar al dominio del frontend
    methods: 'GET,POST,PUT,DELETE',
  });

  // Pipe global para validación de DTOs
  (await app).useGlobalPipes(
    new ValidationPipe({
      whitelist: true,   // quita campos no declarados en el DTO
      forbidNonWhitelisted: false,
      transform: true,   // convierte tipos automáticamente (string→number)
    }),
  );

  await (await app).listen(3001);
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