// src/app.module.ts  — REEMPLAZA el archivo existente
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AeropuertosModule } from './aeropuertos/aeropuertos.module';
import { VuelosModule } from './vuelos/vuelos.module';
import { OperacionesModule } from './operaciones/operaciones.module';

@Module({
  imports: [
    PrismaModule,        // Global: PrismaService disponible en todos los módulos
    AeropuertosModule,
    VuelosModule,
    OperacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
