import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MongoAuditoriaModule } from '../mongo-auditoria/mongo-auditoria.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, MongoAuditoriaModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
