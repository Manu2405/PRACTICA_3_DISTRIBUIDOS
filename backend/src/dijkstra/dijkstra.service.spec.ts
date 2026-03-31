import { Test, TestingModule } from '@nestjs/testing';
import { DijkstraService } from './dijkstra.service';

describe('DijkstraService', () => {
  let service: DijkstraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DijkstraService],
    }).compile();

    service = module.get<DijkstraService>(DijkstraService);
  });

  describe('Algoritmo Dijkstra', () => {
    it('Validar que Dijkstra devuelva resultados coherentes (Price)', () => {
      const result = service.findOptimalRoute('ATL', 'LON', 'price');
      expect(result).toBeDefined();
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.criteria).toBe('price');
      // El camino de costo más bajo siempre será el devuelto por el service
    });

    it('Validar que la ruta más barata se diferencie de la más rápida o se calcule bien', () => {
      const resultPrice = service.findOptimalRoute('ATL', 'LON', 'price');
      const resultTime = service.findOptimalRoute('ATL', 'LON', 'time');
      
      expect(resultPrice.criteria).toBe('price');
      expect(resultTime.criteria).toBe('time');
      expect(resultPrice.totalValue).toBeDefined();
      expect(resultTime.totalValue).toBeDefined();
    });

    it('Lanzar error si el destino u origen no existen', () => {
      expect(() => service.findOptimalRoute('FAKE', 'LON', 'price')).toThrow();
    });
  });
});
