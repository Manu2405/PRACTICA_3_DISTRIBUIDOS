// src/vuelos/vuelos.module.ts
import { Module } from '@nestjs/common';
import { VuelosController } from './vuelos.controller';
import { VuelosService } from './vuelos.service';

@Module({
  controllers: [VuelosController],
  providers: [VuelosService],
  exports: [VuelosService],
})
export class VuelosModule {}
