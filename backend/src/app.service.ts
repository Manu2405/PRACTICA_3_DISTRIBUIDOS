import { Injectable } from '@nestjs/common';
import * as dijkstra from 'dijkstrajs';

@Injectable()
export class AppService {
  private readonly graph = {
    A: { B: 5, C: 2 },
    B: { D: 1, E: 3 },
    C: { B: 8, E: 7 },
    D: { F: 2 },
    E: { F: 5 },
    F: {}
  };

  computeShortestPath(from: string, to: string) {
    const path = dijkstra.find_path(this.graph, from, to);
    const distance = dijkstra.distance(this.graph, from, to);
    return {
      from,
      to,
      path,
      distance,
      graph: this.graph
    };
  }
}
