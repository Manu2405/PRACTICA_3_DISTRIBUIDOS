// src/algoritmia/conflict-resolver/conflict-resolver.service.ts
import { Injectable } from '@nestjs/common';
import { VectorClock, VectorClockService, CausalRelation } from '../vector-clock/vector-clock.service';

// ── Tipos públicos ──────────────────────────────────────────────────────────

/** Tipo de acción sobre un asiento */
export type EventAction = 'reserve' | 'purchase' | 'cancel';

/**
 * Evento de reserva/venta/anulación que lleva su reloj vectorial.
 * Se usa tanto para simular conflictos como para validar operaciones reales.
 */
export interface BookingEvent {
  /** ID único del evento (UUID o correlación) */
  eventId: string;
  /** Nodo que originó el evento (ej: "NODO_1") */
  nodeId: string;
  /** ID del asiento involucrado */
  seatId: string;
  /** Tipo de operación */
  action: EventAction;
  /** Estado del reloj vectorial en el momento del evento */
  vectorClock: VectorClock;
}

/** Resultado de la resolución de un conflicto */
export interface ConflictResult {
  winner: BookingEvent;
  loser: BookingEvent;
  /** true si los eventos eran concurrentes (no hay orden causal claro) */
  isConcurrent: boolean;
  /** Relación causal detectada */
  causalRelation: CausalRelation;
  /** Explicación humana de por qué ganó el winner */
  reason: string;
}

// ── Servicio ────────────────────────────────────────────────────────────────

@Injectable()
export class ConflictResolverService {
  constructor(private readonly vcService: VectorClockService) {}

  /**
   * Resuelve el conflicto entre dos eventos sobre el mismo asiento.
   *
   * Política de resolución (determinista):
   *   1. Si hay orden causal estricto (BEFORE/AFTER) → gana el más reciente.
   *   2. Si son CONCURRENT → se aplican reglas de negocio:
   *      a. purchase > reserve  (venta prevalece sobre reserva)
   *      b. cancel  > reserve   (anulación libera el asiento)
   *      c. Mismo tipo → desempate lexicográfico por nodeId (determinista)
   */
  resolverConflicto(eventA: BookingEvent, eventB: BookingEvent): ConflictResult {
    const relation = this.vcService.comparar(eventA.vectorClock, eventB.vectorClock);

    // ── Caso 1: orden causal claro ─────────────────────────────────────────
    if (relation === 'AFTER') {
      return {
        winner: eventA,
        loser:  eventB,
        isConcurrent: false,
        causalRelation: relation,
        reason: `Causalidad estricta: ${eventA.eventId} es causalmente POSTERIOR a ${eventB.eventId}.`,
      };
    }
    if (relation === 'BEFORE') {
      return {
        winner: eventB,
        loser:  eventA,
        isConcurrent: false,
        causalRelation: relation,
        reason: `Causalidad estricta: ${eventB.eventId} es causalmente POSTERIOR a ${eventA.eventId}.`,
      };
    }

    // ── Caso 2: eventos concurrentes (CONCURRENT o EQUAL) ─────────────────
    // Regla 2a: purchase gana sobre reserve
    if (eventA.action === 'purchase' && eventB.action === 'reserve') {
      return this._concurrentResult(eventA, eventB, relation,
        'Política de negocio: COMPRA siempre prevalece sobre RESERVA en conflicto concurrente.');
    }
    if (eventB.action === 'purchase' && eventA.action === 'reserve') {
      return this._concurrentResult(eventB, eventA, relation,
        'Política de negocio: COMPRA siempre prevalece sobre RESERVA en conflicto concurrente.');
    }

    // Regla 2b: cancel gana sobre reserve (liberar asiento es prioritario)
    if (eventA.action === 'cancel' && eventB.action === 'reserve') {
      return this._concurrentResult(eventA, eventB, relation,
        'Política de negocio: ANULACIÓN libera el asiento; prevalece sobre RESERVA.');
    }
    if (eventB.action === 'cancel' && eventA.action === 'reserve') {
      return this._concurrentResult(eventB, eventA, relation,
        'Política de negocio: ANULACIÓN libera el asiento; prevalece sobre RESERVA.');
    }

    // Regla 2c: mismo tipo de acción → desempate por nodeId (lexicográfico)
    if (eventA.nodeId < eventB.nodeId) {
      return this._concurrentResult(eventA, eventB, relation,
        `Desempate determinista: nodo "${eventA.nodeId}" < nodo "${eventB.nodeId}" (orden lexicográfico).`);
    }
    if (eventB.nodeId < eventA.nodeId) {
      return this._concurrentResult(eventB, eventA, relation,
        `Desempate determinista: nodo "${eventB.nodeId}" < nodo "${eventA.nodeId}" (orden lexicográfico).`);
    }

    // Caso extremo: mismo nodo, mismo reloj (duplicado)
    return this._concurrentResult(eventA, eventB, relation,
      `Duplicado detectado: mismo nodo y reloj. Conservando el primer evento recibido (${eventA.eventId}).`);
  }

  // ── Helper privado ─────────────────────────────────────────────────────────

  private _concurrentResult(
    winner: BookingEvent,
    loser: BookingEvent,
    relation: CausalRelation,
    reason: string,
  ): ConflictResult {
    return { winner, loser, isConcurrent: true, causalRelation: relation, reason };
  }
}
