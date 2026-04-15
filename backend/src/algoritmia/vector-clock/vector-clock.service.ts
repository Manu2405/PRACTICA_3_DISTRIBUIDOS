// src/algoritmia/vector-clock/vector-clock.service.ts
import { Injectable } from '@nestjs/common';

// ── Tipos públicos ──────────────────────────────────────────────────────────

/**
 * Reloj Vectorial: un mapa de { nodeId → contador }.
 * Cada nodo mantiene su propio contador y conoce el contador de los demás.
 */
export type VectorClock = Record<string, number>;

export interface VectorClockEvent {
  nodeId: string;
  clock: VectorClock;
  timestamp: string; // ISO 8601 UTC
}

export type CausalRelation =
  | 'BEFORE'        // clockA ocurre antes de clockB
  | 'AFTER'         // clockA ocurre después de clockB
  | 'EQUAL'         // relojes idénticos
  | 'CONCURRENT';   // eventos concurrentes (conflicto)

// ── Servicio ────────────────────────────────────────────────────────────────

@Injectable()
export class VectorClockService {
  /**
   * Genera un nuevo reloj vectorial inicial para un nodo.
   * Todos los contadores empiezan en 0.
   *
   * @param nodeId    ID del nodo local  (ej: "NODO_1")
   * @param nodeIds   Lista de todos los nodos del sistema (ej: ["NODO_1","NODO_2","NODO_3"])
   */
  generarReloj(nodeId: string, nodeIds: string[] = ['NODO_1', 'NODO_2', 'NODO_3']): VectorClockEvent {
    const allNodes = nodeIds.includes(nodeId) ? nodeIds : [...nodeIds, nodeId];
    const clock: VectorClock = {};
    for (const id of allNodes) clock[id] = 0;
    return {
      nodeId,
      clock,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Incrementa el contador local del nodo cuando ocurre un evento local.
   * Debe llamarse antes de enviar un mensaje o antes de registrar una operación.
   */
  incrementar(nodeId: string, clock: VectorClock): VectorClock {
    const next = { ...clock };
    next[nodeId] = (next[nodeId] ?? 0) + 1;
    return next;
  }

  /**
   * Combina el reloj local con un reloj recibido de otro nodo (merge).
   * Regla: componente a componente, tomar el máximo.
   * Se debe llamar al RECIBIR un mensaje y luego incrementar el propio.
   */
  combinar(local: VectorClock, incoming: VectorClock): VectorClock {
    const allNodes = new Set([...Object.keys(local), ...Object.keys(incoming)]);
    const merged: VectorClock = {};
    for (const node of allNodes) {
      merged[node] = Math.max(local[node] ?? 0, incoming[node] ?? 0);
    }
    return merged;
  }

  /**
   * Compara dos relojes vectoriales y determina su relación causal.
   *
   * Reglas del algoritmo:
   *   - BEFORE  : ∀i: vc1[i] ≤ vc2[i]  y  ∃i: vc1[i] < vc2[i]
   *   - AFTER   : ∀i: vc1[i] ≥ vc2[i]  y  ∃i: vc1[i] > vc2[i]
   *   - EQUAL   : ∀i: vc1[i] = vc2[i]
   *   - CONCURRENT: ninguna de las anteriores (conflicto)
   */
  comparar(vc1: VectorClock, vc2: VectorClock): CausalRelation {
    const nodes = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);
    let vc1Greater = false;
    let vc2Greater = false;

    for (const node of nodes) {
      const v1 = vc1[node] ?? 0;
      const v2 = vc2[node] ?? 0;
      if (v1 > v2) vc1Greater = true;
      if (v1 < v2) vc2Greater = true;
    }

    if (vc1Greater && vc2Greater) return 'CONCURRENT';
    if (vc1Greater)               return 'AFTER';
    if (vc2Greater)               return 'BEFORE';
    return 'EQUAL';
  }

  /**
   * Serializa un reloj vectorial a string JSON para almacenarlo en la BD.
   * Compatible con el campo `relojVector` del schema de Prisma.
   */
  serializar(clock: VectorClock): string {
    return JSON.stringify(clock);
  }

  /**
   * Parsea un string JSON (guardado en BD) de vuelta a VectorClock.
   * Maneja el caso de que sea null o una cadena vacía.
   */
  parsear(raw: string | null | undefined): VectorClock {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as VectorClock;
    } catch {
      return {};
    }
  }
}
