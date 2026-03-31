import { Module } from '@nestjs/common';
import { DijkstraService } from './dijkstra.service';

@Module({
  providers: [DijkstraService],
  exports: [DijkstraService],
})
export class DijkstraModule {}
