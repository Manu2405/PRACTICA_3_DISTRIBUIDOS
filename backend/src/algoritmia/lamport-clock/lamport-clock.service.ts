import { Injectable } from '@nestjs/common';

export interface LamportTimestampEvent {
  nodeId: string;
  lamportTimestamp: number;
  timestamp: string;
}

export interface LamportComparableEvent {
  nodeId: string;
  lamportTimestamp: number;
}

export type LamportRelation = 'BEFORE' | 'AFTER' | 'EQUAL';

@Injectable()
export class LamportClockService {
  generarTimestamp(nodeId: string, valorInicial = 0): LamportTimestampEvent {
    return {
      nodeId,
      lamportTimestamp: this.normalizar(valorInicial),
      timestamp: new Date().toISOString(),
    };
  }

  incrementar(relojLocal: number): number {
    return this.normalizar(relojLocal) + 1;
  }

  combinar(local: number, incoming: number): number {
    return Math.max(this.normalizar(local), this.normalizar(incoming)) + 1;
  }

  comparar(eventoA: LamportComparableEvent, eventoB: LamportComparableEvent): {
    relation: LamportRelation;
    usedTieBreak: boolean;
  } {
    const a = this.normalizar(eventoA.lamportTimestamp);
    const b = this.normalizar(eventoB.lamportTimestamp);

    if (a < b) return { relation: 'BEFORE', usedTieBreak: false };
    if (a > b) return { relation: 'AFTER', usedTieBreak: false };

    if (eventoA.nodeId === eventoB.nodeId) {
      return { relation: 'EQUAL', usedTieBreak: false };
    }

    return {
      relation: eventoA.nodeId < eventoB.nodeId ? 'BEFORE' : 'AFTER',
      usedTieBreak: true,
    };
  }

  private normalizar(valor: number): number {
    if (!Number.isFinite(valor)) return 0;
    if (valor < 0) return 0;
    return Math.floor(valor);
  }
}
