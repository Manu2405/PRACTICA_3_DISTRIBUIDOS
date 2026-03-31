// src/app.service.ts
// REEMPLAZA el archivo existente — arregla el error 500 del endpoint /shortest-path
import { Injectable, BadRequestException } from '@nestjs/common';

// Import con require para evitar problemas de tipos con emitDecoratorMetadata
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dijkstra = require('dijkstrajs') as {
  find_path: (graph: object, from: string, to: string) => string[];
};

function distanciaDelCamino(
  graph: Record<string, Record<string, number>>,
  path: string[],
): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const w = graph[a]?.[b];
    if (w === undefined) {
      throw new Error(`Arista inválida en el camino: ${a} → ${b}`);
    }
    total += w;
  }
  return total;
}

// Grafo de ejemplo — el módulo de Algoritmia lo reemplazará con datos reales de BD
const GRAPH: Record<string, Record<string, number>> = {
  A: { B: 5, C: 2 },
  B: { D: 1, E: 3 },
  C: { B: 8, E: 7 },
  D: { F: 2 },
  E: { F: 5 },
  F: {},
};

@Injectable()
export class AppService {
  private readonly graph = GRAPH;

  computeShortestPath(from: string, to: string) {
    try {
      if (!this.graph[from]) {
        throw new BadRequestException(`Nodo origen '${from}' no existe en el grafo`);
      }
      if (!this.graph[to]) {
        throw new BadRequestException(`Nodo destino '${to}' no existe en el grafo`);
      }

      const path = dijkstra.find_path(this.graph, from, to);
      const distance = distanciaDelCamino(this.graph, path);

      return {
        ok: true,
        from,
        to,
        path,
        distance,
        graph: this.graph,
      };
    } catch (err: any) {
      if (err?.status) throw err; // re-throw NestJS exceptions
      throw new BadRequestException(
        `No se encontró camino de '${from}' a '${to}': ${err?.message ?? 'error desconocido'}`,
      );
    }
  }
}
