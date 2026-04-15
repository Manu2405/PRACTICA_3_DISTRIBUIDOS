// src/algoritmia/algoritmia.module.ts
import { Module } from '@nestjs/common';
import { AlgoritmiaController } from './algoritmia.controller';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { VectorClockService } from './vector-clock/vector-clock.service';
import { ConflictResolverService } from './conflict-resolver/conflict-resolver.service';
import { LamportClockService } from './lamport-clock/lamport-clock.service';

@Module({
  controllers: [AlgoritmiaController],
  providers: [
    DijkstraService,
    VectorClockService,
    ConflictResolverService,
    LamportClockService,
  ],
  exports: [
    DijkstraService,
    VectorClockService,
    ConflictResolverService,
    LamportClockService,
  ],
})
export class AlgoritmiaModule {}
