import { MongoAuditoriaService } from './mongo-auditoria.service';

describe('MongoAuditoriaService', () => {
  it('devuelve false cuando Mongo no esta configurado', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    const service = new MongoAuditoriaService();
    const result = await service.registrarEvento({
      tipoOperacion: 'RESERVA',
      nodoOrigen: 'NODO_TEST',
      relojVector: '{"NODO_TEST":1}',
      timestampUtc: new Date().toISOString(),
      asientoId: 1,
      pasajeroId: 5,
      estadoAntes: 'LIBRE',
      estadoDespues: 'RESERVADO',
    });

    expect(result).toBe(false);

    if (originalUri) {
      process.env.MONGODB_URI = originalUri;
    }
  });

  it('inserta un evento cuando hay coleccion disponible', async () => {
    const service = new MongoAuditoriaService();
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });

    (service as any).getCollection = jest.fn().mockResolvedValue({ insertOne });

    const evento = {
      tipoOperacion: 'VENTA',
      nodoOrigen: 'NODO_TEST',
      relojVector: '{"NODO_TEST":2}',
      timestampUtc: new Date().toISOString(),
      asientoId: 7,
      pasajeroId: 9,
      estadoAntes: 'RESERVADO',
      estadoDespues: 'VENDIDO',
      referenciaId: 33,
    };

    const result = await service.registrarEvento(evento);

    expect(result).toBe(true);
    expect(insertOne).toHaveBeenCalledWith(evento);
  });
});
