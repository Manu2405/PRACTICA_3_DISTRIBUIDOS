// src/aeropuertos/aeropuertos.module.ts
import { Module } from '@nestjs/common';
import { AeropuertosController } from './aeropuertos.controller';
import { AeropuertosService } from './aeropuertos.service';

@Module({
  controllers: [AeropuertosController],
  providers: [AeropuertosService],
  exports: [AeropuertosService],
})
export class AeropuertosModule {}
