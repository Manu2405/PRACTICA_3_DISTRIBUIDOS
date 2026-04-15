// src/algoritmia/algoritmia.spec.ts
// Ejecutar: cd backend && npx jest algoritmia --no-coverage

import { Test, TestingModule } from '@nestjs/testing';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { VectorClockService } from './vector-clock/vector-clock.service';
import { ConflictResolverService } from './conflict-resolver/conflict-resolver.service';
import { LamportClockService } from './lamport-clock/lamport-clock.service';

describe('Modulo de Algoritmia', () => {
  let dijkstra: DijkstraService;
  let vc: VectorClockService;
  let resolver: ConflictResolverService;
  let lamport: LamportClockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DijkstraService,
        VectorClockService,
        ConflictResolverService,
        LamportClockService,
      ],
    }).compile();

    dijkstra = module.get(DijkstraService);
    vc = module.get(VectorClockService);
    resolver = module.get(ConflictResolverService);
    lamport = module.get(LamportClockService);
  });

  describe('DijkstraService', () => {
    it('calcularRuta: devuelve un camino valido entre ATL y LON por precio', () => {
      const result = dijkstra.calcularRuta('ATL', 'LON', 'price');
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[0]).toBe('ATL');
      expect(result.path[result.path.length - 1]).toBe('LON');
      expect(result.criteria).toBe('price');
      expect(result.totalValue).toBeGreaterThan(0);
    });

    it('calcularRuta: la ruta mas barata puede diferir de la mas rapida', () => {
      const porPrecio = dijkstra.calcularRuta('ATL', 'LON', 'price');
      const porTiempo = dijkstra.calcularRuta('ATL', 'LON', 'time');
      expect(porPrecio.criteria).toBe('price');
      expect(porTiempo.criteria).toBe('time');
      const distinct =
        porPrecio.totalValue !== porTiempo.totalValue ||
        JSON.stringify(porPrecio.path) !== JSON.stringify(porTiempo.path);
      expect(distinct).toBe(true);
    });

    it('calcularRuta: acepta codigos en minusculas', () => {
      const result = dijkstra.calcularRuta('atl', 'lon', 'price');
      expect(result.path[0]).toBe('ATL');
    });

    it('calcularRuta: lanza error si el origen no existe', () => {
      expect(() => dijkstra.calcularRuta('INEXISTENTE', 'LON', 'price')).toThrow();
    });

    it('calcularRuta: lanza error si el destino no existe', () => {
      expect(() => dijkstra.calcularRuta('ATL', 'FAKE', 'price')).toThrow();
    });

    it('listarAeropuertos: devuelve al menos 15 aeropuertos', () => {
      const lista = dijkstra.listarAeropuertos();
      expect(lista.length).toBeGreaterThanOrEqual(15);
      expect(lista).toContain('ATL');
      expect(lista).toContain('LON');
    });
  });

  describe('VectorClockService', () => {
    it('generarReloj: crea un reloj con todos los contadores en 0', () => {
      const evento = vc.generarReloj('NODO_1', ['NODO_1', 'NODO_2', 'NODO_3']);
      expect(evento.nodeId).toBe('NODO_1');
      expect(evento.clock.NODO_1).toBe(0);
      expect(evento.clock.NODO_2).toBe(0);
      expect(evento.clock.NODO_3).toBe(0);
    });

    it('incrementar: solo sube el contador del nodo local', () => {
      const reloj = { NODO_1: 1, NODO_2: 0, NODO_3: 2 };
      const nuevo = vc.incrementar('NODO_1', reloj);
      expect(nuevo.NODO_1).toBe(2);
      expect(nuevo.NODO_2).toBe(0);
      expect(nuevo.NODO_3).toBe(2);
    });

    it('combinar: toma el maximo componente a componente', () => {
      const local = { NODO_1: 3, NODO_2: 1 };
      const incoming = { NODO_1: 2, NODO_2: 4, NODO_3: 1 };
      const merged = vc.combinar(local, incoming);
      expect(merged.NODO_1).toBe(3);
      expect(merged.NODO_2).toBe(4);
      expect(merged.NODO_3).toBe(1);
    });

    it('comparar: detecta A BEFORE B correctamente', () => {
      const vc1 = { NODO_1: 1, NODO_2: 0 };
      const vc2 = { NODO_1: 2, NODO_2: 1 };
      expect(vc.comparar(vc1, vc2)).toBe('BEFORE');
    });

    it('comparar: detecta A AFTER B correctamente', () => {
      const vc1 = { NODO_1: 2, NODO_2: 1 };
      const vc2 = { NODO_1: 1, NODO_2: 0 };
      expect(vc.comparar(vc1, vc2)).toBe('AFTER');
    });

    it('comparar: detecta CONCURRENT cuando se cruzan los contadores', () => {
      const vc1 = { NODO_1: 2, NODO_2: 0 };
      const vc2 = { NODO_1: 1, NODO_2: 1 };
      expect(vc.comparar(vc1, vc2)).toBe('CONCURRENT');
    });

    it('serializar / parsear: son operaciones inversas', () => {
      const original = { NODO_1: 3, NODO_2: 7 };
      const str = vc.serializar(original);
      const parsed = vc.parsear(str);
      expect(parsed).toEqual(original);
    });

    it('parsear: retorna {} para null o string vacio', () => {
      expect(vc.parsear(null)).toEqual({});
      expect(vc.parsear('')).toEqual({});
      expect(vc.parsear(undefined)).toEqual({});
    });
  });

  describe('LamportClockService', () => {
    it('generarTimestamp: crea timestamp lamport por nodo', () => {
      const evento = lamport.generarTimestamp('NODO_1');
      expect(evento.nodeId).toBe('NODO_1');
      expect(evento.lamportTimestamp).toBe(0);
    });

    it('incrementar: incrementa el reloj local en eventos', () => {
      expect(lamport.incrementar(4)).toBe(5);
    });

    it('combinar: actualiza al recibir evento remoto', () => {
      expect(lamport.combinar(5, 9)).toBe(10);
      expect(lamport.combinar(12, 3)).toBe(13);
    });

    it('comparar: ordena por timestamp lamport', () => {
      const result = lamport.comparar(
        { nodeId: 'NODO_1', lamportTimestamp: 3 },
        { nodeId: 'NODO_2', lamportTimestamp: 5 },
      );
      expect(result.relation).toBe('BEFORE');
      expect(result.usedTieBreak).toBe(false);
    });

    it('comparar: si el contador es igual usa desempate por nodo', () => {
      const result = lamport.comparar(
        { nodeId: 'NODO_2', lamportTimestamp: 7 },
        { nodeId: 'NODO_1', lamportTimestamp: 7 },
      );
      expect(result.relation).toBe('AFTER');
      expect(result.usedTieBreak).toBe(true);
    });
  });

  describe('ConflictResolverService', () => {
    const makeEvent = (
      eventId: string,
      nodeId: string,
      action: 'reserve' | 'purchase' | 'cancel',
      clock: Record<string, number>,
    ) => ({ eventId, nodeId, seatId: 'A12', action, vectorClock: clock });

    it('orden causal: el evento mas reciente (AFTER) gana sin politica', () => {
      const A = makeEvent('evt-A', 'NODO_1', 'reserve', { NODO_1: 3, NODO_2: 2 });
      const B = makeEvent('evt-B', 'NODO_2', 'purchase', { NODO_1: 2, NODO_2: 1 });
      const result = resolver.resolverConflicto(A, B);
      expect(result.isConcurrent).toBe(false);
      expect(result.causalRelation).toBe('AFTER');
      expect(result.winner.eventId).toBe('evt-A');
    });

    it('politica de negocio: purchase gana sobre reserve en concurrencia', () => {
      const reserva = makeEvent('evt-R', 'NODO_2', 'reserve', { NODO_1: 0, NODO_2: 1 });
      const compra = makeEvent('evt-C', 'NODO_1', 'purchase', { NODO_1: 1, NODO_2: 0 });
      const result = resolver.resolverConflicto(reserva, compra);
      expect(result.isConcurrent).toBe(true);
      expect(result.winner.action).toBe('purchase');
    });

    it('politica de negocio: cancel gana sobre reserve en concurrencia', () => {
      const reserva = makeEvent('evt-R', 'NODO_2', 'reserve', { NODO_1: 0, NODO_2: 1 });
      const anulacion = makeEvent('evt-A', 'NODO_1', 'cancel', { NODO_1: 1, NODO_2: 0 });
      const result = resolver.resolverConflicto(reserva, anulacion);
      expect(result.isConcurrent).toBe(true);
      expect(result.winner.action).toBe('cancel');
    });

    it('desempate lexicografico: NODO_1 gana sobre NODO_2', () => {
      const evtNodo1 = makeEvent('evt-1', 'NODO_1', 'reserve', { NODO_1: 1, NODO_2: 0 });
      const evtNodo2 = makeEvent('evt-2', 'NODO_2', 'reserve', { NODO_1: 0, NODO_2: 1 });
      const result = resolver.resolverConflicto(evtNodo1, evtNodo2);
      expect(result.isConcurrent).toBe(true);
      expect(result.winner.nodeId).toBe('NODO_1');
    });

    it('demo: purchase (NODO_1) gana sobre reserve (NODO_2)', () => {
      const reserva = makeEvent('evt-R', 'NODO_2', 'reserve', {
        NODO_1: 2,
        NODO_2: 5,
        NODO_3: 1,
      });
      const compra = makeEvent('evt-C', 'NODO_1', 'purchase', {
        NODO_1: 3,
        NODO_2: 4,
        NODO_3: 1,
      });
      const result = resolver.resolverConflicto(reserva, compra);
      expect(result.winner.action).toBe('purchase');
      expect(result.winner.nodeId).toBe('NODO_1');
    });
  });
});
