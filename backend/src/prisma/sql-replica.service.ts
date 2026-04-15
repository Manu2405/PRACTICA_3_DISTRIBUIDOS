import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type SqlReplicaSyncResult = {
  enabled: boolean;
  attempted: boolean;
  ok: boolean;
  target: 'SQL_SECUNDARIA';
  timestampUtc: string;
  error?: string | null;
};

export type SqlReplicaTableSnapshot = {
  table: 'Asientos' | 'Reservas' | 'Ventas' | 'Anulaciones' | 'AuditoriaAsientos';
  count: number;
  minId: number | null;
  maxId: number | null;
};

export type SqlReplicaStateSnapshot = {
  enabled: boolean;
  attempted: boolean;
  timestampUtc: string;
  tables: SqlReplicaTableSnapshot[];
  error?: string | null;
};

type ReplicaAsiento = {
  id: number;
  vueloId: number;
  claseId: number;
  numero: string;
  estado: string;
  creadoEn: Date;
};

type ReplicaReserva = {
  id: number;
  asientoId: number;
  pasajeroId: number;
  nodoOrigen: string;
  relojVector: string | null;
  creadoEn: Date;
  expiraEn: Date | null;
  estado: string;
};

type ReplicaVenta = {
  id: number;
  asientoId: number;
  pasajeroId: number;
  reservaId: number | null;
  montoUsd: unknown;
  nodoOrigen: string;
  relojVector: string | null;
  creadoEn: Date;
  estado: string;
};

type ReplicaAnulacion = {
  id: number;
  asientoId: number;
  pasajeroId: number;
  reservaId: number | null;
  ventaId: number | null;
  motivo: string | null;
  tipo: string;
  nodoOrigen: string;
  relojVector: string | null;
  creadoEn: Date;
};

type ReplicaAuditoria = {
  id: number;
  asientoId: number;
  estadoDesde: string;
  estadoHasta: string;
  operacion: string;
  referenciaId: number | null;
  nodoOrigen: string;
  relojVector: string | null;
  timestampUtc: Date;
};

type ReplicaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type IdentityInsertTable =
  | 'Asientos'
  | 'Reservas'
  | 'Ventas'
  | 'Anulaciones'
  | 'AuditoriaAsientos';

type ReplicaReservaPayload = {
  asiento: ReplicaAsiento;
  reserva: ReplicaReserva;
  auditoria: ReplicaAuditoria;
};

type ReplicaVentaPayload = {
  asiento: ReplicaAsiento;
  venta: ReplicaVenta;
  auditoria: ReplicaAuditoria;
  reservaConvertidaId?: number | null;
};

type ReplicaAnulacionPayload = {
  asiento: ReplicaAsiento;
  anulacion: ReplicaAnulacion;
  auditoria: ReplicaAuditoria;
  reservaAnuladaId?: number | null;
  ventaAnuladaId?: number | null;
};

@Injectable()
export class SqlReplicaService implements OnModuleDestroy {
  private readonly logger = new Logger(SqlReplicaService.name);
  private client: PrismaClient | null = null;
  private connectionPromise: Promise<PrismaClient | null> | null = null;
  private disabledWarningShown = false;

  private get secondaryDatabaseUrl(): string | null {
    return process.env.SECONDARY_DATABASE_URL?.trim() || null;
  }

  private async getClient(): Promise<PrismaClient | null> {
    if (this.client) {
      return this.client;
    }

    if (!this.secondaryDatabaseUrl) {
      if (!this.disabledWarningShown) {
        this.logger.warn(
          'Replica SQL secundaria deshabilitada: falta configurar SECONDARY_DATABASE_URL.',
        );
        this.disabledWarningShown = true;
      }
      return null;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        this.client = new PrismaClient({
          datasources: {
            db: {
              url: this.secondaryDatabaseUrl as string,
            },
          },
        });
        await this.client.$connect();
        this.logger.log('Replica SQL secundaria activa.');
        return this.client;
      } catch (error) {
        this.logger.error(
          'No se pudo conectar a SQL secundaria.',
          error instanceof Error ? error.stack : undefined,
        );
        this.connectionPromise = null;
        this.client = null;
        return null;
      }
    })();

    return this.connectionPromise;
  }

  async replicarReserva(payload: ReplicaReservaPayload): Promise<SqlReplicaSyncResult> {
    return this.runReplication(async (client) => {
      await client.$transaction(async (tx) => {
        await this.withIdentityInsert(tx, 'Asientos', async () => {
          await tx.asiento.upsert({
            where: { id: payload.asiento.id },
            update: {
              estado: payload.asiento.estado,
            },
            create: {
              id: payload.asiento.id,
              vueloId: payload.asiento.vueloId,
              claseId: payload.asiento.claseId,
              numero: payload.asiento.numero,
              estado: payload.asiento.estado,
              creadoEn: payload.asiento.creadoEn,
            },
          });
        });

        await this.withIdentityInsert(tx, 'Reservas', async () => {
          await tx.reserva.upsert({
            where: { id: payload.reserva.id },
            update: {
              asientoId: payload.reserva.asientoId,
              pasajeroId: payload.reserva.pasajeroId,
              nodoOrigen: payload.reserva.nodoOrigen,
              relojVector: payload.reserva.relojVector,
              expiraEn: payload.reserva.expiraEn,
              estado: payload.reserva.estado,
            },
            create: {
              id: payload.reserva.id,
              asientoId: payload.reserva.asientoId,
              pasajeroId: payload.reserva.pasajeroId,
              nodoOrigen: payload.reserva.nodoOrigen,
              relojVector: payload.reserva.relojVector,
              creadoEn: payload.reserva.creadoEn,
              expiraEn: payload.reserva.expiraEn,
              estado: payload.reserva.estado,
            },
          });
        });

        await this.upsertAuditoria(tx, payload.auditoria);
      });
    });
  }

  async replicarVenta(payload: ReplicaVentaPayload): Promise<SqlReplicaSyncResult> {
    return this.runReplication(async (client) => {
      await client.$transaction(async (tx) => {
        await this.withIdentityInsert(tx, 'Asientos', async () => {
          await tx.asiento.upsert({
            where: { id: payload.asiento.id },
            update: {
              estado: payload.asiento.estado,
            },
            create: {
              id: payload.asiento.id,
              vueloId: payload.asiento.vueloId,
              claseId: payload.asiento.claseId,
              numero: payload.asiento.numero,
              estado: payload.asiento.estado,
              creadoEn: payload.asiento.creadoEn,
            },
          });
        });

        if (payload.reservaConvertidaId) {
          await tx.reserva.updateMany({
            where: { id: payload.reservaConvertidaId },
            data: { estado: 'CONVERTIDA' },
          });
        }

        await this.withIdentityInsert(tx, 'Ventas', async () => {
          await tx.venta.upsert({
            where: { id: payload.venta.id },
            update: {
              asientoId: payload.venta.asientoId,
              pasajeroId: payload.venta.pasajeroId,
              reservaId: payload.venta.reservaId,
              montoUsd: payload.venta.montoUsd as never,
              nodoOrigen: payload.venta.nodoOrigen,
              relojVector: payload.venta.relojVector,
              estado: payload.venta.estado,
            },
            create: {
              id: payload.venta.id,
              asientoId: payload.venta.asientoId,
              pasajeroId: payload.venta.pasajeroId,
              reservaId: payload.venta.reservaId,
              montoUsd: payload.venta.montoUsd as never,
              nodoOrigen: payload.venta.nodoOrigen,
              relojVector: payload.venta.relojVector,
              creadoEn: payload.venta.creadoEn,
              estado: payload.venta.estado,
            },
          });
        });

        await this.upsertAuditoria(tx, payload.auditoria);
      });
    });
  }

  async replicarAnulacion(payload: ReplicaAnulacionPayload): Promise<SqlReplicaSyncResult> {
    return this.runReplication(async (client) => {
      await client.$transaction(async (tx) => {
        await this.withIdentityInsert(tx, 'Asientos', async () => {
          await tx.asiento.upsert({
            where: { id: payload.asiento.id },
            update: {
              estado: payload.asiento.estado,
            },
            create: {
              id: payload.asiento.id,
              vueloId: payload.asiento.vueloId,
              claseId: payload.asiento.claseId,
              numero: payload.asiento.numero,
              estado: payload.asiento.estado,
              creadoEn: payload.asiento.creadoEn,
            },
          });
        });

        if (payload.reservaAnuladaId) {
          await tx.reserva.updateMany({
            where: { id: payload.reservaAnuladaId },
            data: { estado: 'ANULADA' },
          });
        }

        if (payload.ventaAnuladaId) {
          await tx.venta.updateMany({
            where: { id: payload.ventaAnuladaId },
            data: { estado: 'ANULADA' },
          });
        }

        await this.withIdentityInsert(tx, 'Anulaciones', async () => {
          await tx.anulacion.upsert({
            where: { id: payload.anulacion.id },
            update: {
              asientoId: payload.anulacion.asientoId,
              pasajeroId: payload.anulacion.pasajeroId,
              reservaId: payload.anulacion.reservaId,
              ventaId: payload.anulacion.ventaId,
              motivo: payload.anulacion.motivo,
              tipo: payload.anulacion.tipo,
              nodoOrigen: payload.anulacion.nodoOrigen,
              relojVector: payload.anulacion.relojVector,
            },
            create: {
              id: payload.anulacion.id,
              asientoId: payload.anulacion.asientoId,
              pasajeroId: payload.anulacion.pasajeroId,
              reservaId: payload.anulacion.reservaId,
              ventaId: payload.anulacion.ventaId,
              motivo: payload.anulacion.motivo,
              tipo: payload.anulacion.tipo,
              nodoOrigen: payload.anulacion.nodoOrigen,
              relojVector: payload.anulacion.relojVector,
              creadoEn: payload.anulacion.creadoEn,
            },
          });
        });

        await this.upsertAuditoria(tx, payload.auditoria);
      });
    });
  }

  private async upsertAuditoria(
    tx: ReplicaTx,
    auditoria: ReplicaAuditoria,
  ) {
    await this.withIdentityInsert(tx, 'AuditoriaAsientos', async () => {
      await tx.auditoriaAsiento.upsert({
        where: { id: auditoria.id },
        update: {
          asientoId: auditoria.asientoId,
          estadoDesde: auditoria.estadoDesde,
          estadoHasta: auditoria.estadoHasta,
          operacion: auditoria.operacion,
          referenciaId: auditoria.referenciaId,
          nodoOrigen: auditoria.nodoOrigen,
          relojVector: auditoria.relojVector,
          timestampUtc: auditoria.timestampUtc,
        },
        create: {
          id: auditoria.id,
          asientoId: auditoria.asientoId,
          estadoDesde: auditoria.estadoDesde,
          estadoHasta: auditoria.estadoHasta,
          operacion: auditoria.operacion,
          referenciaId: auditoria.referenciaId,
          nodoOrigen: auditoria.nodoOrigen,
          relojVector: auditoria.relojVector,
          timestampUtc: auditoria.timestampUtc,
        },
      });
    });
  }

  private async withIdentityInsert<T>(
    tx: ReplicaTx,
    table: IdentityInsertTable,
    action: () => Promise<T>,
  ): Promise<T> {
    const qualifiedTable = `[dbo].[${table}]`;
    await tx.$executeRawUnsafe(`SET IDENTITY_INSERT ${qualifiedTable} ON`);

    try {
      return await action();
    } finally {
      try {
        await tx.$executeRawUnsafe(`SET IDENTITY_INSERT ${qualifiedTable} OFF`);
      } catch (error) {
        this.logger.warn(
          `No se pudo desactivar IDENTITY_INSERT para ${table}.`,
          error instanceof Error ? error.message : undefined,
        );
      }
    }
  }

  private async runReplication(
    executor: (client: PrismaClient) => Promise<void>,
  ): Promise<SqlReplicaSyncResult> {
    const timestampUtc = new Date().toISOString();
    const client = await this.getClient();

    if (!client) {
      return {
        enabled: false,
        attempted: false,
        ok: false,
        target: 'SQL_SECUNDARIA',
        timestampUtc,
        error: 'SECONDARY_DATABASE_URL no configurada o no disponible.',
      };
    }

    try {
      await executor(client);
      return {
        enabled: true,
        attempted: true,
        ok: true,
        target: 'SQL_SECUNDARIA',
        timestampUtc,
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido en replica SQL secundaria.';
      this.logger.error(
        'Fallo la replicacion hacia SQL secundaria.',
        error instanceof Error ? error.stack : undefined,
      );
      return {
        enabled: true,
        attempted: true,
        ok: false,
        target: 'SQL_SECUNDARIA',
        timestampUtc,
        error: message,
      };
    }
  }

  async obtenerEstadoReplica(): Promise<SqlReplicaStateSnapshot> {
    const timestampUtc = new Date().toISOString();
    const client = await this.getClient();

    if (!client) {
      return {
        enabled: false,
        attempted: false,
        timestampUtc,
        tables: [],
        error: 'SECONDARY_DATABASE_URL no configurada o no disponible.',
      };
    }

    try {
      const [asientos, reservas, ventas, anulaciones, auditorias] =
        await Promise.all([
          client.asiento.aggregate({
            _count: { id: true },
            _min: { id: true },
            _max: { id: true },
          }),
          client.reserva.aggregate({
            _count: { id: true },
            _min: { id: true },
            _max: { id: true },
          }),
          client.venta.aggregate({
            _count: { id: true },
            _min: { id: true },
            _max: { id: true },
          }),
          client.anulacion.aggregate({
            _count: { id: true },
            _min: { id: true },
            _max: { id: true },
          }),
          client.auditoriaAsiento.aggregate({
            _count: { id: true },
            _min: { id: true },
            _max: { id: true },
          }),
        ]);

      return {
        enabled: true,
        attempted: true,
        timestampUtc,
        tables: [
          {
            table: 'Asientos',
            count: asientos._count.id,
            minId: asientos._min.id ?? null,
            maxId: asientos._max.id ?? null,
          },
          {
            table: 'Reservas',
            count: reservas._count.id,
            minId: reservas._min.id ?? null,
            maxId: reservas._max.id ?? null,
          },
          {
            table: 'Ventas',
            count: ventas._count.id,
            minId: ventas._min.id ?? null,
            maxId: ventas._max.id ?? null,
          },
          {
            table: 'Anulaciones',
            count: anulaciones._count.id,
            minId: anulaciones._min.id ?? null,
            maxId: anulaciones._max.id ?? null,
          },
          {
            table: 'AuditoriaAsientos',
            count: auditorias._count.id,
            minId: auditorias._min.id ?? null,
            maxId: auditorias._max.id ?? null,
          },
        ],
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido al leer la replica SQL.';

      this.logger.error(
        'No se pudo leer el estado de SQL secundaria.',
        error instanceof Error ? error.stack : undefined,
      );

      return {
        enabled: true,
        attempted: true,
        timestampUtc,
        tables: [],
        error: message,
      };
    }
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }

    await this.client.$disconnect();
    this.client = null;
    this.connectionPromise = null;
  }
}
