import { SqlReplicaService } from './sql-replica.service';

describe('SqlReplicaService', () => {
  it('devuelve replica deshabilitada cuando no existe SECONDARY_DATABASE_URL', async () => {
    const originalUrl = process.env.SECONDARY_DATABASE_URL;
    delete process.env.SECONDARY_DATABASE_URL;

    const service = new SqlReplicaService();
    const result = await service.replicarReserva({
      asiento: {
        id: 1,
        vueloId: 1,
        claseId: 1,
        numero: 'A1',
        estado: 'RESERVADO',
        creadoEn: new Date(),
      },
      reserva: {
        id: 1,
        asientoId: 1,
        pasajeroId: 1,
        nodoOrigen: 'NODO_1',
        relojVector: '{"NODO_1":1}',
        creadoEn: new Date(),
        expiraEn: new Date(),
        estado: 'ACTIVA',
      },
      auditoria: {
        id: 1,
        asientoId: 1,
        estadoDesde: 'LIBRE',
        estadoHasta: 'RESERVADO',
        operacion: 'RESERVA',
        referenciaId: 1,
        nodoOrigen: 'NODO_1',
        relojVector: '{"NODO_1":1}',
        timestampUtc: new Date(),
      },
    });

    expect(result.enabled).toBe(false);
    expect(result.attempted).toBe(false);
    expect(result.ok).toBe(false);

    if (originalUrl) {
      process.env.SECONDARY_DATABASE_URL = originalUrl;
    }
  });
});
