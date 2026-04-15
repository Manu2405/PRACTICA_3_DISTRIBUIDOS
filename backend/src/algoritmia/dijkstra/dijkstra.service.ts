// src/algoritmia/dijkstra/dijkstra.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';

// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface RouteEdge {
  /** Costo en USD (precio del vuelo) */
  cost: number;
  /** Tiempo de vuelo en horas */
  time: number;
}

/** Grafo: nodo → vecinos → pesos */
export type GraphData = Record<string, Record<string, RouteEdge>>;

export interface RouteResult {
  /** Lista ordenada de ciudades (IATA) en la ruta óptima */
  path: string[];
  /** Valor total según el criterio elegido */
  totalValue: number;
  /** Criterio usado: 'price' o 'time' */
  criteria: 'price' | 'time';
}

// ── Servicio ────────────────────────────────────────────────────────────────

@Injectable()
export class DijkstraService {
  /**
   * Grafo de rutas aéreas internacionales.
   * 15 aeropuertos con pesos duales: costo (USD) y tiempo (horas).
   * Fuente: adaptado del módulo de Oscar (Rama Oscar / PRACTICA_3_DISTRIBUIDOS).
   */
  private readonly graph: GraphData = {
    ATL: {
      TYO: { cost: 1400, time: 14 },
      PAR: { cost: 400,  time: 8  },
      FRA: { cost: 800,  time: 9  },
      MAD: { cost: 1500, time: 10 },
      AMS: { cost: 800,  time: 9  },
      DFW: { cost: 200,  time: 2  },
      SAO: { cost: 900,  time: 10 },
    },
    PEK: {
      DXB: { cost: 700,  time: 8  },
      TYO: { cost: 500,  time: 3  },
      LON: { cost: 900,  time: 11 },
      FRA: { cost: 950,  time: 10 },
      MAD: { cost: 600,  time: 12 },
      AMS: { cost: 950,  time: 10 },
      DFW: { cost: 1150, time: 14 },
      CAN: { cost: 200,  time: 2  },
      SAO: { cost: 1700, time: 25 },
    },
    DXB: {
      PEK: { cost: 700,  time: 8  },
      TYO: { cost: 750,  time: 9  },
      LON: { cost: 650,  time: 7  },
      LAX: { cost: 1300, time: 15 },
      PAR: { cost: 700,  time: 7  },
      FRA: { cost: 600,  time: 6  },
      IST: { cost: 400,  time: 4  },
      MAD: { cost: 600,  time: 7  },
      AMS: { cost: 650,  time: 7  },
      DFW: { cost: 1200, time: 14 },
      CAN: { cost: 650,  time: 8  },
      SAO: { cost: 1400, time: 15 },
    },
    TYO: {
      ATL: { cost: 1400, time: 14 },
      PEK: { cost: 500,  time: 3  },
      DXB: { cost: 750,  time: 9  },
      LON: { cost: 1000, time: 13 },
      LAX: { cost: 900,  time: 10 },
      PAR: { cost: 1050, time: 13 },
      IST: { cost: 900,  time: 11 },
      MAD: { cost: 700,  time: 14 },
      AMS: { cost: 1100, time: 13 },
      DFW: { cost: 1350, time: 12 },
      CAN: { cost: 550,  time: 4  },
    },
    LON: {
      ATL: { cost: 700,  time: 8  },
      DXB: { cost: 650,  time: 7  },
      TYO: { cost: 1000, time: 13 },
      LAX: { cost: 800,  time: 11 },
      PAR: { cost: 150,  time: 1  },
      FRA: { cost: 200,  time: 2  },
      IST: { cost: 400,  time: 4  },
      MAD: { cost: 200,  time: 2  },
      AMS: { cost: 150,  time: 1  },
      CAN: { cost: 950,  time: 13 },
      SAO: { cost: 1100, time: 12 },
    },
    LAX: {
      ATL: { cost: 400,  time: 5  },
      PEK: { cost: 1100, time: 13 },
      DXB: { cost: 1300, time: 15 },
      TYO: { cost: 900,  time: 10 },
      PAR: { cost: 850,  time: 11 },
      FRA: { cost: 900,  time: 11 },
      IST: { cost: 1100, time: 13 },
      SIN: { cost: 1400, time: 16 },
      AMS: { cost: 850,  time: 11 },
      DFW: { cost: 300,  time: 3  },
      CAN: { cost: 1150, time: 14 },
    },
    PAR: {
      ATL: { cost: 750,  time: 9  },
      DXB: { cost: 700,  time: 7  },
      TYO: { cost: 1050, time: 13 },
      LAX: { cost: 850,  time: 11 },
      FRA: { cost: 150,  time: 1  },
      IST: { cost: 450,  time: 4  },
      MAD: { cost: 950,  time: 2  },
      AMS: { cost: 200,  time: 1  },
      DFW: { cost: 180,  time: 10 },
      CAN: { cost: 950,  time: 12 },
      SAO: { cost: 1050, time: 11 },
    },
    FRA: {
      PEK: { cost: 850,  time: 10 },
      DXB: { cost: 600,  time: 6  },
      TYO: { cost: 950,  time: 12 },
      LON: { cost: 200,  time: 2  },
      LAX: { cost: 900,  time: 11 },
      PAR: { cost: 150,  time: 1  },
      IST: { cost: 350,  time: 3  },
      MAD: { cost: 900,  time: 3  },
      DFW: { cost: 850,  time: 11 },
      CAN: { cost: 900,  time: 11 },
    },
    IST: {
      PEK: { cost: 800,  time: 9  },
      DXB: { cost: 400,  time: 4  },
      TYO: { cost: 900,  time: 11 },
      LAX: { cost: 1100, time: 13 },
      FRA: { cost: 350,  time: 3  },
      MAD: { cost: 800,  time: 4  },
      AMS: { cost: 500,  time: 4  },
      DFW: { cost: 450,  time: 12 },
      CAN: { cost: 800,  time: 10 },
      SAO: { cost: 1200, time: 13 },
    },
    SIN: {
      PEK: { cost: 600,  time: 6  },
      TYO: { cost: 700,  time: 7  },
      LON: { cost: 900,  time: 13 },
      PAR: { cost: 950,  time: 13 },
      IST: { cost: 800,  time: 10 },
      AMS: { cost: 1000, time: 13 },
      DFW: { cost: 1400, time: 16 },
    },
    MAD: {
      DXB: { cost: 750,  time: 7  },
      LAX: { cost: 900,  time: 12 },
      PAR: { cost: 200,  time: 2  },
      FRA: { cost: 250,  time: 3  },
      IST: { cost: 500,  time: 4  },
      SIN: { cost: 1000, time: 14 },
      AMS: { cost: 200,  time: 2  },
      DFW: { cost: 850,  time: 10 },
      CAN: { cost: 950,  time: 13 },
      SAO: { cost: 1000, time: 10 },
    },
    AMS: {
      ATL: { cost: 780,  time: 9  },
      PEK: { cost: 900,  time: 10 },
      DXB: { cost: 650,  time: 7  },
      TYO: { cost: 1000, time: 12 },
      LON: { cost: 150,  time: 1  },
      LAX: { cost: 850,  time: 11 },
      FRA: { cost: 200,  time: 1  },
      IST: { cost: 450,  time: 4  },
      SIN: { cost: 950,  time: 13 },
      MAD: { cost: 200,  time: 2  },
      DFW: { cost: 800,  time: 10 },
      CAN: { cost: 900,  time: 12 },
      SAO: { cost: 1050, time: 11 },
    },
    DFW: {
      ATL: { cost: 200,  time: 2  },
      DXB: { cost: 1200, time: 14 },
      LAX: { cost: 300,  time: 3  },
      PAR: { cost: 800,  time: 10 },
      IST: { cost: 1000, time: 12 },
      AMS: { cost: 850,  time: 10 },
      CAN: { cost: 1200, time: 15 },
      SAO: { cost: 950,  time: 10 },
    },
    CAN: {
      ATL: { cost: 1250, time: 15 },
      PEK: { cost: 200,  time: 3  },
      DXB: { cost: 650,  time: 8  },
      TYO: { cost: 550,  time: 4  },
      LON: { cost: 950,  time: 13 },
      LAX: { cost: 1150, time: 14 },
      PAR: { cost: 950,  time: 12 },
      IST: { cost: 800,  time: 10 },
      SIN: { cost: 500,  time: 4  },
      AMS: { cost: 900,  time: 12 },
      DFW: { cost: 1200, time: 15 },
      SAO: { cost: 1700, time: 24 },
    },
    SAO: {
      ATL: { cost: 900,  time: 10 },
      PEK: { cost: 1700, time: 25 },
      TYO: { cost: 1800, time: 24 },
      LON: { cost: 1100, time: 12 },
      PAR: { cost: 1050, time: 11 },
      FRA: { cost: 1100, time: 12 },
      IST: { cost: 1200, time: 13 },
      MAD: { cost: 1000, time: 10 },
      DFW: { cost: 950,  time: 10 },
      CAN: { cost: 1700, time: 24 },
    },
  };

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Calcula la ruta óptima entre dos aeropuertos con Dijkstra.
   * @param origin  Código IATA de origen  (ej: "ATL")
   * @param destination Código IATA de destino (ej: "LON")
   * @param criteria 'price' | 'time' — criterio de optimización
   */
  calcularRuta(
    origin: string,
    destination: string,
    criteria: 'price' | 'time' = 'price',
  ): RouteResult {
    if (!origin || !destination) {
      throw new Error('Origen y destino son obligatorios');
    }

    const orig = origin.toUpperCase();
    const dest = destination.toUpperCase();

    if (!this.graph[orig]) {
      throw new NotFoundException(`Aeropuerto de origen no encontrado: ${orig}`);
    }
    if (!this.graph[dest]) {
      throw new NotFoundException(`Aeropuerto de destino no encontrado: ${dest}`);
    }

    return this._dijkstra(orig, dest, criteria);
  }

  /** Lista los códigos IATA disponibles en el grafo */
  listarAeropuertos(): string[] {
    return Object.keys(this.graph).sort();
  }

  /**
   * Suma una métrica (cost o time) a lo largo de un camino ya calculado.
   * Útil para obtener el valor complementario de una ruta óptima.
   * Ej: la ruta óptima-por-precio → ¿cuánto tiempo tarda exactamente?
   * @param path   Array de IATA en orden (ej. ['ATL','DFW','LON'])
   * @param metric 'price' | 'time'
   * @returns      Suma total de la métrica a lo largo del camino, o -1 si algún tramo no existe
   */
  calcularRutaMetrica(path: string[], metric: 'price' | 'time'): number {
    if (!path || path.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to   = path[i + 1];
      const edge = this.graph[from]?.[to];
      if (!edge) return -1; // tramo no existe en el grafo
      total += metric === 'price' ? edge.cost : edge.time;
    }
    return total;
  }

  // ── Dijkstra interno ───────────────────────────────────────────────────────

  private _dijkstra(
    origin: string,
    destination: string,
    criteria: 'price' | 'time',
  ): RouteResult {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set(Object.keys(this.graph));

    for (const node of unvisited) {
      distances[node] = Infinity;
      previous[node] = null;
    }
    distances[origin] = 0;

    while (unvisited.size > 0) {
      // Nodo no visitado con menor distancia acumulada
      let current: string | null = null;
      let shortest = Infinity;
      for (const node of unvisited) {
        if (distances[node] < shortest) {
          shortest = distances[node];
          current = node;
        }
      }

      if (!current || distances[current] === Infinity) break;
      if (current === destination) break;

      unvisited.delete(current);

      for (const [neighbor, edge] of Object.entries(this.graph[current] ?? {})) {
        if (!unvisited.has(neighbor)) continue;
        const weight = criteria === 'price' ? edge.cost : edge.time;
        const tentative = distances[current] + weight;
        if (tentative < distances[neighbor]) {
          distances[neighbor] = tentative;
          previous[neighbor] = current;
        }
      }
    }

    if (distances[destination] === Infinity) {
      throw new NotFoundException(
        `No existe ruta entre ${origin} y ${destination}`,
      );
    }

    // Reconstruir camino
    const path: string[] = [];
    let cur: string | null = destination;
    while (cur !== null) {
      path.unshift(cur);
      cur = previous[cur];
    }

    return { path, totalValue: distances[destination], criteria };
  }
}
