import { ConflictException } from '@nestjs/common';
import { OperacionesService } from './operaciones.service';

function buildMocks() {
  const baseAsiento = {
    id: 1,
    vueloId: 1,
    claseId: 1,
    numero: 'A1',
    estado: 'RESERVADO',
    creadoEn: new Date(),
  };

  const tx: any = {
    asiento: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    reserva: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    venta: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    anulacion: {
      create: jest.fn(),
    },
    auditoriaAsiento: {
      create: jest.fn(),
    },
  };

  const prisma: any = {
    asiento: {
      findUnique: jest.fn(),
    },
    auditoriaAsiento: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };

  const mongoAuditoria: any = {
    registrarEvento: jest.fn().mockResolvedValue(true),
  };

  const sqlReplica: any = {
    replicarReserva: jest.fn().mockResolvedValue({
      enabled: true,
      attempted: true,
      ok: true,
      target: 'SQL_SECUNDARIA',
      timestampUtc: new Date().toISOString(),
      error: null,
    }),
    replicarVenta: jest.fn().mockResolvedValue({
      enabled: true,
      attempted: true,
      ok: true,
      target: 'SQL_SECUNDARIA',
      timestampUtc: new Date().toISOString(),
      error: null,
    }),
    replicarAnulacion: jest.fn().mockResolvedValue({
      enabled: true,
      attempted: true,
      ok: true,
      target: 'SQL_SECUNDARIA',
      timestampUtc: new Date().toISOString(),
      error: null,
    }),
  };

  return { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento };
}

describe('OperacionesService', () => {
  it('reserva: genera relojVector cuando no viene y respeta expiracion en 1 minuto', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento } = buildMocks();
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'LIBRE' });
    tx.asiento.findUniqueOrThrow.mockResolvedValue({ id: 1, estado: 'LIBRE' });
    tx.asiento.update.mockResolvedValue({});
    tx.reserva.create.mockImplementation(async ({ data }: any) => ({
      id: 10,
      ...data,
      creadoEn: new Date(),
      asiento: { ...baseAsiento, estado: 'RESERVADO', vuelo: {}, clase: {} },
      pasajero: {},
    }));
    tx.auditoriaAsiento.create.mockResolvedValue({
      id: 100,
      asientoId: 1,
      estadoDesde: 'LIBRE',
      estadoHasta: 'RESERVADO',
      operacion: 'RESERVA',
      referenciaId: 10,
      nodoOrigen: 'NODO_TEST',
      relojVector: '{"NODO_TEST":1}',
      timestampUtc: new Date(),
    });

    const before = Date.now();
    const result = await service.reservar({
      asientoId: 1,
      pasajeroId: 5,
      nodoOrigen: 'NODO_TEST',
      minutosExpiracion: 1,
    });
    const after = Date.now();

    const reservaPayload = tx.reserva.create.mock.calls[0][0].data;
    expect(typeof reservaPayload.relojVector).toBe('string');
    expect(reservaPayload.relojVector.length).toBeGreaterThan(2);

    const expiraTs = new Date(reservaPayload.expiraEn).getTime();
    expect(expiraTs).toBeGreaterThanOrEqual(before + 59_000);
    expect(expiraTs).toBeLessThanOrEqual(after + 61_000);

    const auditoriaPayload = tx.auditoriaAsiento.create.mock.calls[0][0].data;
    expect(auditoriaPayload.relojVector).toBe(reservaPayload.relojVector);
    expect(mongoAuditoria.registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoOperacion: 'RESERVA',
        lamportTimestamp: expect.any(Number),
        asientoId: 1,
        pasajeroId: 5,
        estadoAntes: 'LIBRE',
        estadoDespues: 'RESERVADO',
      }),
    );
    expect(result.lamportTimestamp).toBeGreaterThan(0);
    expect(result.sincronizacion.sqlSecundaria.ok).toBe(true);
    expect(sqlReplica.replicarReserva).toHaveBeenCalled();
    expect(result.estado).toBe('RESERVADO');
  });

  it('reserva: combina lamport local y remoto con max + 1', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento } = buildMocks();
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'LIBRE' });
    tx.asiento.findUniqueOrThrow.mockResolvedValue({ id: 1, estado: 'LIBRE' });
    tx.asiento.update.mockResolvedValue({});
    tx.reserva.create.mockImplementation(async ({ data }: any) => ({
      id: 11,
      ...data,
      creadoEn: new Date(),
      asiento: { ...baseAsiento, estado: 'RESERVADO', vuelo: {}, clase: {} },
      pasajero: {},
    }));
    tx.auditoriaAsiento.create.mockResolvedValue({
      id: 101,
      asientoId: 1,
      estadoDesde: 'LIBRE',
      estadoHasta: 'RESERVADO',
      operacion: 'RESERVA',
      referenciaId: 11,
      nodoOrigen: 'NODO_1',
      relojVector: '{"NODO_1":1}',
      timestampUtc: new Date(),
    });

    const result = await service.reservar({
      asientoId: 1,
      pasajeroId: 5,
      lamportTimestamp: 3,
      lamportRemoto: 9,
    });

    expect(result.lamportTimestamp).toBe(10);
    expect(mongoAuditoria.registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ lamportTimestamp: 10 }),
    );
  });

  it('venta: permite comprar reserva activa del mismo pasajero y marca CONVERTIDA', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento } = buildMocks();
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'RESERVADO' });
    tx.asiento.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      estado: 'RESERVADO',
      vuelo: { precioBaseUsd: 100 },
      clase: { multiplicador: 1.5 },
    });
    tx.reserva.findFirst.mockResolvedValue({
      id: 77,
      asientoId: 1,
      pasajeroId: 5,
      estado: 'ACTIVA',
      expiraEn: new Date(Date.now() + 5 * 60 * 1000),
    });
    tx.reserva.update.mockResolvedValue({});
    tx.asiento.update.mockResolvedValue({});
    tx.venta.create.mockImplementation(async ({ data }: any) => ({
      id: 88,
      ...data,
      creadoEn: new Date(),
      asiento: {
        ...baseAsiento,
        estado: 'VENDIDO',
        vuelo: {},
        clase: {},
      },
      pasajero: {},
    }));
    tx.auditoriaAsiento.create.mockResolvedValue({
      id: 102,
      asientoId: 1,
      estadoDesde: 'RESERVADO',
      estadoHasta: 'VENDIDO',
      operacion: 'VENTA',
      referenciaId: 88,
      nodoOrigen: 'NODO_TEST',
      relojVector: '{"NODO_TEST":1}',
      timestampUtc: new Date(),
    });

    const result = await service.vender({
      asientoId: 1,
      pasajeroId: 5,
      nodoOrigen: 'NODO_TEST',
    });

    expect(tx.reserva.update).toHaveBeenCalledWith({
      where: { id: 77 },
      data: { estado: 'CONVERTIDA' },
    });
    expect(tx.asiento.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: 'VENDIDO' },
    });

    const ventaPayload = tx.venta.create.mock.calls[0][0].data;
    expect(ventaPayload.reservaId).toBe(77);
    expect(typeof ventaPayload.relojVector).toBe('string');
    expect(mongoAuditoria.registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoOperacion: 'VENTA',
        lamportTimestamp: expect.any(Number),
        asientoId: 1,
        pasajeroId: 5,
        estadoAntes: 'RESERVADO',
        estadoDespues: 'VENDIDO',
      }),
    );
    expect(result.lamportTimestamp).toBeGreaterThan(0);
    expect(result.sincronizacion.sqlSecundaria.ok).toBe(true);
    expect(sqlReplica.replicarVenta).toHaveBeenCalled();
    expect(result.estado).toBe('VENDIDO');
  });

  it('venta: rechaza compra si la reserva activa pertenece a otro pasajero', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica } = buildMocks();
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'RESERVADO' });
    tx.asiento.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      estado: 'RESERVADO',
      vuelo: { precioBaseUsd: 100 },
      clase: { multiplicador: 1.5 },
    });
    tx.reserva.findFirst.mockResolvedValue(null);

    await expect(
      service.vender({
        asientoId: 1,
        pasajeroId: 999,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('anulacion de reserva: acepta tipo RESERVA, libera asiento y registra relojVector', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento } = buildMocks();
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'RESERVADO' });
    tx.reserva.findFirst.mockResolvedValue({ id: 77 });
    tx.asiento.update.mockResolvedValue({});
    tx.reserva.update.mockResolvedValue({});
    tx.anulacion.create.mockImplementation(async ({ data }: any) => ({
      id: 99,
      ...data,
      creadoEn: new Date(),
      asiento: { ...baseAsiento, estado: 'LIBRE', vuelo: {} },
      pasajero: {},
    }));
    tx.auditoriaAsiento.create.mockResolvedValue({
      id: 103,
      asientoId: 1,
      estadoDesde: 'RESERVADO',
      estadoHasta: 'LIBRE',
      operacion: 'ANULACION',
      referenciaId: 99,
      nodoOrigen: 'NODO_1',
      relojVector: '{"NODO_1":1}',
      timestampUtc: new Date(),
    });

    const result = await service.anular({
      asientoId: 1,
      pasajeroId: 5,
      tipo: 'RESERVA',
    });

    expect(tx.asiento.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: 'LIBRE' },
    });
    expect(tx.reserva.update).toHaveBeenCalledWith({
      where: { id: 77 },
      data: { estado: 'ANULADA' },
    });
    expect(tx.anulacion.create.mock.calls[0][0].data.tipo).toBe('ANULACION');
    expect(typeof tx.anulacion.create.mock.calls[0][0].data.relojVector).toBe('string');
    expect(mongoAuditoria.registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoOperacion: 'ANULACION',
        lamportTimestamp: expect.any(Number),
        asientoId: 1,
        pasajeroId: 5,
        estadoAntes: 'RESERVADO',
        estadoDespues: 'LIBRE',
      }),
    );
    expect(result.lamportTimestamp).toBeGreaterThan(0);
    expect(result.sincronizacion.sqlSecundaria.ok).toBe(true);
    expect(sqlReplica.replicarAnulacion).toHaveBeenCalled();
    expect(result.estado).toBe('LIBRE');
  });

  it('anulacion de compra: acepta tipo VENTA y pasa a DEVOLUCION', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento } = buildMocks();
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'VENDIDO' });
    tx.venta.findFirst.mockResolvedValue({ id: 44 });
    tx.asiento.update.mockResolvedValue({});
    tx.venta.update.mockResolvedValue({});
    tx.anulacion.create.mockImplementation(async ({ data }: any) => ({
      id: 120,
      ...data,
      creadoEn: new Date(),
      asiento: { ...baseAsiento, estado: 'DEVOLUCION', vuelo: {} },
      pasajero: {},
    }));
    tx.auditoriaAsiento.create.mockResolvedValue({
      id: 104,
      asientoId: 1,
      estadoDesde: 'VENDIDO',
      estadoHasta: 'DEVOLUCION',
      operacion: 'DEVOLUCION',
      referenciaId: 120,
      nodoOrigen: 'NODO_1',
      relojVector: '{"NODO_1":1}',
      timestampUtc: new Date(),
    });

    const result = await service.anular({
      asientoId: 1,
      pasajeroId: 5,
      tipo: 'VENTA',
    });

    expect(tx.asiento.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: 'DEVOLUCION' },
    });
    expect(tx.venta.update).toHaveBeenCalledWith({
      where: { id: 44 },
      data: { estado: 'ANULADA' },
    });
    expect(tx.anulacion.create.mock.calls[0][0].data.tipo).toBe('DEVOLUCION');
    expect(mongoAuditoria.registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoOperacion: 'DEVOLUCION',
        lamportTimestamp: expect.any(Number),
        asientoId: 1,
        pasajeroId: 5,
        estadoAntes: 'VENDIDO',
        estadoDespues: 'DEVOLUCION',
      }),
    );
    expect(result.lamportTimestamp).toBeGreaterThan(0);
    expect(result.sincronizacion.sqlSecundaria.ok).toBe(true);
    expect(result.estado).toBe('DEVOLUCION');
  });

  it('reserva: un fallo en SQL secundaria no rompe la transaccion principal', async () => {
    const { prisma, tx, mongoAuditoria, sqlReplica, baseAsiento } = buildMocks();
    sqlReplica.replicarReserva.mockResolvedValue({
      enabled: true,
      attempted: true,
      ok: false,
      target: 'SQL_SECUNDARIA',
      timestampUtc: new Date().toISOString(),
      error: 'Timeout replica secundaria',
    });
    const service = new OperacionesService(prisma, mongoAuditoria, sqlReplica);

    prisma.asiento.findUnique.mockResolvedValue({ id: 1, estado: 'LIBRE' });
    tx.asiento.findUniqueOrThrow.mockResolvedValue({ id: 1, estado: 'LIBRE' });
    tx.asiento.update.mockResolvedValue({});
    tx.reserva.create.mockImplementation(async ({ data }: any) => ({
      id: 12,
      ...data,
      creadoEn: new Date(),
      asiento: { ...baseAsiento, estado: 'RESERVADO', vuelo: {}, clase: {} },
      pasajero: {},
    }));
    tx.auditoriaAsiento.create.mockResolvedValue({
      id: 105,
      asientoId: 1,
      estadoDesde: 'LIBRE',
      estadoHasta: 'RESERVADO',
      operacion: 'RESERVA',
      referenciaId: 12,
      nodoOrigen: 'NODO_1',
      relojVector: '{"NODO_1":1}',
      timestampUtc: new Date(),
    });

    const result = await service.reservar({
      asientoId: 1,
      pasajeroId: 5,
    });

    expect(result.estado).toBe('RESERVADO');
    expect(result.sincronizacion.sqlPrincipal.ok).toBe(true);
    expect(result.sincronizacion.sqlSecundaria.ok).toBe(false);
    expect(result.sincronizacion.sqlSecundaria.error).toContain('Timeout');
    expect(mongoAuditoria.registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        sincronizacionSqlSecundaria: expect.objectContaining({
          ok: false,
        }),
      }),
    );
  });
});
