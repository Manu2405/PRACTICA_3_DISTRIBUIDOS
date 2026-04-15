// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { MongoAuditoriaModule } from './mongo-auditoria/mongo-auditoria.module';
import { PrismaModule } from './prisma/prisma.module';
import { AeropuertosModule } from './aeropuertos/aeropuertos.module';
import { VuelosModule } from './vuelos/vuelos.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { AlgoritmiaModule } from './algoritmia/algoritmia.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    MongoAuditoriaModule,
    PrismaModule,
    AeropuertosModule,
    VuelosModule,
    OperacionesModule,
    AlgoritmiaModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
