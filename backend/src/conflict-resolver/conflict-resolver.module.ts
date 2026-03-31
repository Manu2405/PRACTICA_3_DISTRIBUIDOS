import { Module } from '@nestjs/common';
import { ConflictResolverService } from './conflict-resolver.service';

@Module({
  providers: [ConflictResolverService],
  exports: [ConflictResolverService],
})
export class ConflictResolverModule {}
