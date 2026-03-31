import { Injectable } from '@nestjs/common';

export type EventAction = 'reserve' | 'purchase';

export interface VectorClock {
  [nodeId: string]: number;
}

export interface BookingEvent {
  eventId: string;
  nodeId: string;
  seatId: string;
  action: EventAction;
  vectorClock: VectorClock;
}

export interface ConflictResult {
  winner: BookingEvent;
  loser: BookingEvent;
  isConcurrent: boolean;
  reason: string;
}

@Injectable()
export class ConflictResolverService {
  
  /**
   * Incrementa el reloj lógico del nodo local cuando ocurre un evento local.
   */
  incrementLocalClock(nodeId: string, clock: VectorClock): VectorClock {
    const newClock = { ...clock };
    newClock[nodeId] = (newClock[nodeId] || 0) + 1;
    return newClock;
  }

  /**
   * Combina el reloj local con un reloj recibido desde otro nodo (merge).
   * Al recibir un mensaje, el reloj resultante debe ser el máximo componente a componente,
   * y luego (en la práctica) requeriría hacer un incrementLocalClock() sobre el resultado.
   */
  mergeClocks(local: VectorClock, incoming: VectorClock): VectorClock {
    const nodes = new Set([...Object.keys(local), ...Object.keys(incoming)]);
    const merged: VectorClock = {};
    for (const node of nodes) {
      merged[node] = Math.max(local[node] || 0, incoming[node] || 0);
    }
    return merged;
  }

  /**
   * Compara dos relojes vectoriales.
   * Retorna:
   *  1 si vc1 > vc2 (vc1 ocurre después, incorpora cambios de vc2)
   * -1 si vc1 < vc2 (vc1 ocurre antes, vc2 es más reciente)
   *  0 si vc1 == vc2 (idénticos)
   * null si son concurrentes (ninguno es estrictamente mayor)
   */
  compareVectorClocks(vc1: VectorClock, vc2: VectorClock): number | null {
    const nodes = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);
    
    let isVc1Greater = false;
    let isVc2Greater = false;

    for (const node of nodes) {
      const v1 = vc1[node] || 0;
      const v2 = vc2[node] || 0;

      if (v1 > v2) isVc1Greater = true;
      if (v1 < v2) isVc2Greater = true;
    }

    if (isVc1Greater && isVc2Greater) return null; // Concurrentes cruzados
    if (isVc1Greater) return 1; // vc1 es posterior
    if (isVc2Greater) return -1; // vc2 es posterior
    return 0; // Iguales
  }

  /**
   * Resuelve cualquier conflicto entre dos eventos sobre el mismo asiento.
   * Determina si son concurrentes y aplica políticas si es necesario.
   */
  resolveConflict(eventA: BookingEvent, eventB: BookingEvent): ConflictResult {
    const comparison = this.compareVectorClocks(eventA.vectorClock, eventB.vectorClock);

    // Caso 1: Orden causal estricto (no concurrente)
    if (comparison === 1) {
      return { 
        winner: eventA, 
        loser: eventB, 
        isConcurrent: false, 
        reason: `Causalidad estricta: El estado de ${eventA.eventId} es causalmente posterior a ${eventB.eventId}.` 
      };
    }
    if (comparison === -1) {
      return { 
        winner: eventB, 
        loser: eventA, 
        isConcurrent: false, 
        reason: `Causalidad estricta: El estado de ${eventB.eventId} es causalmente posterior a ${eventA.eventId}.` 
      };
    }

    // Caso 2: Concurrentes (comparison === null o 0, asumiendo 0 como misma ventana sin precedencia)
    // Aplicamos políticas deterministas locales (Checklist 4)
    
    // Regla Política 1: Venta > Reserva
    if (eventA.action === 'purchase' && eventB.action === 'reserve') {
      return { 
        winner: eventA, 
        loser: eventB, 
        isConcurrent: true, 
        reason: 'Política de Negocio: Venta (purchase) siempre prevalece sobre una Reserva (reserve).' 
      };
    }
    if (eventB.action === 'purchase' && eventA.action === 'reserve') {
      return { 
        winner: eventB, 
        loser: eventA, 
        isConcurrent: true, 
        reason: 'Política de Negocio: Venta (purchase) siempre prevalece sobre una Reserva (reserve).' 
      };
    }

    // Regla Política 2: Mismo tipo de acción (Reserva vs Reserva o Venta vs Venta).
    // Desempate determinista por ID de Nodo (el menor gana)
    if (eventA.nodeId < eventB.nodeId) {
      return { 
        winner: eventA, 
        loser: eventB, 
        isConcurrent: true, 
        reason: `Regla de Desempate: Nodo ID '${eventA.nodeId}' es lexicográficamente menor al Nodo ID '${eventB.nodeId}'.` 
      };
    } else if (eventA.nodeId > eventB.nodeId) {
      return { 
        winner: eventB, 
        loser: eventA, 
        isConcurrent: true, 
        reason: `Regla de Desempate: Nodo ID '${eventB.nodeId}' es lexicográficamente menor al Nodo ID '${eventA.nodeId}'.` 
      };
    }

    // Caso extremo: Mismo nodo, mismo tiempo, misma acción (posible duplicidad en request)
    return {
      winner: eventA,
      loser: eventB,
      isConcurrent: true,
      reason: `Desempate final por EventID (Duplicidad local detectada).`
    };
  }

  /**
   * Simulador de conflictos directo para pruebas o APIs.
   */
  simulateConflict(event1: BookingEvent, event2: BookingEvent): ConflictResult {
    // Solo encapsula e invoca internamente
    return this.resolveConflict(event1, event2);
  }
}
