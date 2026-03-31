import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DijkstraModule } from './dijkstra/dijkstra.module';
import { ConflictResolverModule } from './conflict-resolver/conflict-resolver.module';

@Module({
  imports: [DijkstraModule, ConflictResolverModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
