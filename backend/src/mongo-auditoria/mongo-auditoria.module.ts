import { Global, Module } from '@nestjs/common';
import { MongoAuditoriaService } from './mongo-auditoria.service';

@Global()
@Module({
  providers: [MongoAuditoriaService],
  exports: [MongoAuditoriaService],
})
export class MongoAuditoriaModule {}
