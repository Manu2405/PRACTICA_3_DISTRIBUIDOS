import { Test, TestingModule } from '@nestjs/testing';
import { ConflictResolverService } from './conflict-resolver.service';

describe('ConflictResolverService', () => {
  let service: ConflictResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConflictResolverService],
    }).compile();

    service = module.get<ConflictResolverService>(ConflictResolverService);
  });

  describe('Reloj Vectorial', () => {
    it('Validar que el reloj vectorial cambie por evento (incremento local)', () => {
      const clock = { 'node-1': 1, 'node-2': 0 };
      const incremented = service.incrementLocalClock('node-1', clock);
      
      expect(incremented['node-1']).toBe(2);
      expect(incremented['node-2']).toBe(0);
    });

    it('Validar merge de relojes vectoriales', () => {
      const local = { 'node-1': 2, 'node-2': 1 };
      const incoming = { 'node-1': 1, 'node-2': 3, 'node-3': 1 };
      
      const merged = service.mergeClocks(local, incoming);
      expect(merged['node-1']).toBe(2);
      expect(merged['node-2']).toBe(3);
      expect(merged['node-3']).toBe(1);
    });
  });

  describe('Detección de Concurrencia y Conflictos', () => {
    it('Validar que se detecte causalidad (A pasa antes de B)', () => {
      const clockA = { 'node-1': 1, 'node-2': 0 };
      const clockB = { 'node-1': 2, 'node-2': 1 };
      const comparison = service.compareVectorClocks(clockA, clockB);
      expect(comparison).toBe(-1); // clockA es menor a clockB
    });

    it('Validar que se detecte concurrencia correctamente', () => {
      const clockA = { 'node-1': 2, 'node-2': 0 };
      const clockB = { 'node-1': 1, 'node-2': 1 };
      const comparison = service.compareVectorClocks(clockA, clockB);
      expect(comparison).toBeNull(); // Concurrencia!
    });
  });

  describe('Políticas de Resolución (Venta > Reserva)', () => {
    it('Simular dos operaciones concurrentes: Venta debe ganar a Reserva', () => {
      const evt1 = {
        eventId: '1', nodeId: 'node-1', seatId: 'A1', action: 'reserve' as const,
        vectorClock: { 'node-1': 2, 'node-2': 0 }
      };
      const evt2 = {
        eventId: '2', nodeId: 'node-2', seatId: 'A1', action: 'purchase' as const,
        vectorClock: { 'node-1': 1, 'node-2': 1 }
      };

      const result = service.resolveConflict(evt1, evt2);
      expect(result.isConcurrent).toBe(true);
      expect(result.winner.action).toBe('purchase');
      expect(result.winner.nodeId).toBe('node-2');
    });

    it('Validar que la regla de desempate determinista funcione (mismo tipo de evento)', () => {
      const evt1 = {
        eventId: '1', nodeId: 'node-2', seatId: 'B1', action: 'reserve' as const,
        vectorClock: { 'node-1': 1, 'node-2': 1, 'node-3': 0 }
      };
      const evt2 = {
        eventId: '2', nodeId: 'node-1', seatId: 'B1', action: 'reserve' as const,
        vectorClock: { 'node-1': 0, 'node-2': 0, 'node-3': 1 }
      };

      const result = service.resolveConflict(evt1, evt2);
      expect(result.isConcurrent).toBe(true);
      // node-1 < node-2 lexicográficamente, debe ganar node-1
      expect(result.winner.nodeId).toBe('node-1'); 
    });
  });
});
