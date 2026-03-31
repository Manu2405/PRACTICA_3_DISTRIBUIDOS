import { Injectable, NotFoundException } from '@nestjs/common';

export interface Edge {
  cost: number;
  time: number;
}

export type GraphData = Record<string, Record<string, Edge>>;

export interface RouteResult {
  path: string[];
  totalValue: number;
  criteria: 'price' | 'time';
}

@Injectable()
export class DijkstraService {
  private readonly graph: GraphData;

  constructor() {
    // Inicializamos el grafo basado en la matriz de adyacencia proveida (Cheklist 2)
    // Se ha derivado el "tiempo" de forma proporcional o estimativa al costo para cumplir con
    // el requerimiento de soportar ambos pesos ("Costo" o "Tiempo").
    this.graph = {
      ATL: {
        TYO: { cost: 1400, time: 14 },
        PAR: { cost: 400, time: 8 },
        FRA: { cost: 800, time: 9 },
        MAD: { cost: 1500, time: 10 },
        AMS: { cost: 800, time: 9 },
        DFW: { cost: 200, time: 2 },
        SAO: { cost: 900, time: 10 },
      },
      PEK: {
        DXB: { cost: 700, time: 8 },
        TYO: { cost: 500, time: 3 },
        LON: { cost: 900, time: 11 },
        FRA: { cost: 950, time: 10 },
        MAD: { cost: 600, time: 12 },
        AMS: { cost: 950, time: 10 },
        DFW: { cost: 1150, time: 14 },
        CAN: { cost: 200, time: 2 },
        SAO: { cost: 1700, time: 25 },
      },
      DXB: {
        PEK: { cost: 700, time: 8 },
        TYO: { cost: 750, time: 9 },
        LON: { cost: 650, time: 7 },
        LAX: { cost: 1300, time: 15 },
        PAR: { cost: 700, time: 7 },
        FRA: { cost: 600, time: 6 },
        IST: { cost: 400, time: 4 },
        MAD: { cost: 600, time: 7 },
        AMS: { cost: 650, time: 7 },
        DFW: { cost: 1200, time: 14 },
        CAN: { cost: 650, time: 8 },
        SAO: { cost: 1400, time: 15 },
      },
      TYO: {
        ATL: { cost: 1400, time: 14 },
        PEK: { cost: 500, time: 3 },
        DXB: { cost: 750, time: 9 },
        LON: { cost: 1000, time: 13 },
        LAX: { cost: 900, time: 10 },
        PAR: { cost: 1050, time: 13 },
        IST: { cost: 900, time: 11 },
        MAD: { cost: 700, time: 14 },
        AMS: { cost: 1100, time: 13 },
        DFW: { cost: 1350, time: 12 },
        CAN: { cost: 550, time: 4 },
      },
      LON: {
        ATL: { cost: 700, time: 8 },
        DXB: { cost: 650, time: 7 },
        TYO: { cost: 1000, time: 13 },
        LAX: { cost: 800, time: 11 },
        PAR: { cost: 150, time: 1 },
        FRA: { cost: 200, time: 2 },
        IST: { cost: 400, time: 4 },
        MAD: { cost: 200, time: 2 },
        AMS: { cost: 150, time: 1 },
        CAN: { cost: 950, time: 13 },
        SAO: { cost: 1100, time: 12 },
      },
      LAX: {
        ATL: { cost: 400, time: 5 },
        PEK: { cost: 1100, time: 13 },
        DXB: { cost: 1300, time: 15 },
        TYO: { cost: 900, time: 10 },
        PAR: { cost: 850, time: 11 },
        FRA: { cost: 900, time: 11 },
        IST: { cost: 1100, time: 13 },
        SIN: { cost: 1400, time: 16 },
        AMS: { cost: 850, time: 11 },
        DFW: { cost: 300, time: 3 },
        CAN: { cost: 1150, time: 14 },
      },
      PAR: {
        ATL: { cost: 750, time: 9 },
        DXB: { cost: 700, time: 7 },
        TYO: { cost: 1050, time: 13 },
        LAX: { cost: 850, time: 11 },
        FRA: { cost: 150, time: 1 },
        IST: { cost: 450, time: 4 },
        MAD: { cost: 950, time: 2 },
        AMS: { cost: 200, time: 1 },
        DFW: { cost: 180, time: 10 },
        CAN: { cost: 950, time: 12 },
        SAO: { cost: 1050, time: 11 },
      },
      FRA: {
        PEK: { cost: 850, time: 10 },
        DXB: { cost: 600, time: 6 },
        TYO: { cost: 950, time: 12 },
        LON: { cost: 200, time: 2 },
        LAX: { cost: 900, time: 11 },
        PAR: { cost: 150, time: 1 },
        IST: { cost: 350, time: 3 },
        MAD: { cost: 900, time: 3 },
        DFW: { cost: 850, time: 11 },
        CAN: { cost: 900, time: 11 },
      },
      IST: {
        PEK: { cost: 800, time: 9 },
        DXB: { cost: 400, time: 4 },
        TYO: { cost: 900, time: 11 },
        LAX: { cost: 1100, time: 13 },
        FRA: { cost: 350, time: 3 },
        MAD: { cost: 800, time: 4 },
        AMS: { cost: 500, time: 4 },
        DFW: { cost: 450, time: 12 },
        CAN: { cost: 800, time: 10 },
        SAO: { cost: 1200, time: 13 },
      },
      SIN: {
        PEK: { cost: 600, time: 6 },
        TYO: { cost: 700, time: 7 },
        LON: { cost: 900, time: 13 },
        PAR: { cost: 950, time: 13 },
        IST: { cost: 800, time: 10 },
        AMS: { cost: 1000, time: 13 },
        DFW: { cost: 1400, time: 16 },
      },
      MAD: {
        DXB: { cost: 750, time: 7 },
        LAX: { cost: 900, time: 12 },
        PAR: { cost: 200, time: 2 },
        FRA: { cost: 250, time: 3 },
        IST: { cost: 500, time: 4 },
        SIN: { cost: 1000, time: 14 },
        AMS: { cost: 200, time: 2 },
        DFW: { cost: 850, time: 10 },
        CAN: { cost: 950, time: 13 },
        SAO: { cost: 1000, time: 10 },
      },
      AMS: {
        ATL: { cost: 780, time: 9 },
        PEK: { cost: 900, time: 10 },
        DXB: { cost: 650, time: 7 },
        TYO: { cost: 1000, time: 12 },
        LON: { cost: 150, time: 1 },
        LAX: { cost: 850, time: 11 },
        FRA: { cost: 200, time: 1 },
        IST: { cost: 450, time: 4 },
        SIN: { cost: 950, time: 13 },
        MAD: { cost: 200, time: 2 },
        DFW: { cost: 800, time: 10 },
        CAN: { cost: 900, time: 12 },
        SAO: { cost: 1050, time: 11 },
      },
      DFW: {
        ATL: { cost: 200, time: 2 },
        DXB: { cost: 1200, time: 14 },
        LAX: { cost: 300, time: 3 },
        PAR: { cost: 800, time: 10 },
        IST: { cost: 1000, time: 12 },
        AMS: { cost: 850, time: 10 },
        CAN: { cost: 1200, time: 15 },
        SAO: { cost: 950, time: 10 },
      },
      CAN: {
        ATL: { cost: 1250, time: 15 },
        PEK: { cost: 200, time: 3 },
        DXB: { cost: 650, time: 8 },
        TYO: { cost: 550, time: 4 },
        LON: { cost: 950, time: 13 },
        LAX: { cost: 1150, time: 14 },
        PAR: { cost: 950, time: 12 },
        IST: { cost: 800, time: 10 },
        SIN: { cost: 500, time: 4 },
        AMS: { cost: 900, time: 12 },
        DFW: { cost: 1200, time: 15 },
        SAO: { cost: 1700, time: 24 },
      },
      SAO: {
        ATL: { cost: 900, time: 10 },
        PEK: { cost: 1700, time: 25 },
        TYO: { cost: 1800, time: 24 },
        LON: { cost: 1100, time: 12 },
        PAR: { cost: 1050, time: 11 },
        FRA: { cost: 1100, time: 12 },
        IST: { cost: 1200, time: 13 },
        MAD: { cost: 1000, time: 10 },
        DFW: { cost: 950, time: 10 },
        CAN: { cost: 1700, time: 24 },
      },
    };
  }

  /**
   * Implementación del Algoritmo de Dijkstra para encontrar la ruta óptima
   * @param origin Nodo de partida
   * @param destination Nodo de destino
   * @param criteria 'price' (Costo) o 'time' (Tiempo)
   */
  findOptimalRoute(origin: string, destination: string, criteria: 'price' | 'time'): RouteResult {
    if (!this.graph[origin]) {
      throw new NotFoundException(`Origen no encontrado: ${origin}`);
    }
    if (!this.graph[destination]) {
      throw new NotFoundException(`Destino no encontrado: ${destination}`);
    }

    const distances: Record<string, number> = {};
    const previousNode: Record<string, string | null> = {};
    const unvisited: Set<string> = new Set(Object.keys(this.graph));

    // Inicializar distancias al infinito
    for (const node of unvisited) {
      distances[node] = Infinity;
      previousNode[node] = null;
    }
    distances[origin] = 0;

    while (unvisited.size > 0) {
      // Extraer el nodo no visitado con la menor distancia
      let currentNode: string | null = null;
      let shortestDistance = Infinity;

      for (const node of unvisited) {
        if (distances[node] < shortestDistance) {
          shortestDistance = distances[node];
          currentNode = node;
        }
      }

      if (currentNode === null || distances[currentNode] === Infinity) {
        break; // Todos los nodos restantes son inalcanzables
      }

      if (currentNode === destination) {
        break; // Hemos encontrado el camino más corto al destino
      }

      unvisited.delete(currentNode);

      // Relajar las aristas (ver vecindario)
      const neighbors = this.graph[currentNode] || {};
      for (const [neighbor, edge] of Object.entries(neighbors)) {
        if (unvisited.has(neighbor)) {
          // Extraemos el peso dependiendo del criterio
          const weight = criteria === 'price' ? edge.cost : edge.time;
          const tentativeDistance = distances[currentNode] + weight;

          if (tentativeDistance < distances[neighbor]) {
            distances[neighbor] = tentativeDistance;
            previousNode[neighbor] = currentNode;
          }
        }
      }
    }

    // Reconstruir el camino si hemos alcanzado el destino
    if (distances[destination] === Infinity) {
      throw new NotFoundException(`No hay ruta disponible entre ${origin} y ${destination}`);
    }

    const path: string[] = [];
    let current: string | null = destination;
    while (current !== null) {
      path.unshift(current);
      current = previousNode[current];
    }

    return {
      path,
      totalValue: distances[destination],
      criteria,
    };
  }
}
