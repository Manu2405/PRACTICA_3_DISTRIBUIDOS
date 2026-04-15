import { Module } from '@nestjs/common';
import { OperacionesController } from './operaciones.controller';
import { OperacionesService } from './operaciones.service';
import { AlgoritmiaModule } from '../algoritmia/algoritmia.module';
import { MongoAuditoriaModule } from '../mongo-auditoria/mongo-auditoria.module';

@Module({
  imports: [AlgoritmiaModule, MongoAuditoriaModule],
  controllers: [OperacionesController],
  providers: [OperacionesService],
  exports: [OperacionesService],
})
export class OperacionesModule {}
