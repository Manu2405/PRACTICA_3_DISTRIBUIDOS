// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SqlReplicaService } from './sql-replica.service';

@Global()
@Module({
  providers: [PrismaService, SqlReplicaService],
  exports: [PrismaService, SqlReplicaService],
})
export class PrismaModule {}
