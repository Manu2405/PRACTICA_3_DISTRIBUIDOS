import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SqlReplicaService,
  SqlReplicaStateSnapshot,
  SqlReplicaTableSnapshot,
} from '../prisma/sql-replica.service';
import {
  EventoOperacionMongo,
  EventoOperacionMongoResumen,
  MongoAuditoriaService,
} from '../mongo-auditoria/mongo-auditoria.service';

type AdminClassSummary = {
  classCode: string;
  className: string;
  seatsSold: number;
  revenueUsd: number;
};

type AdminFlightSummary = {
  flightCode: string;
  route: string;
  status: string;
  totalSeats: number;
  soldSeats: number;
  reservedSeats: number;
  freeSeats: number;
  revenueUsd: number;
  occupancyPct: number;
};

type AdminFleetSummary = {
  model: string;
  economy: number;
  business: number;
  first: number;
  totalCapacity: number;
};

type AdminTableSync = {
  table: SqlReplicaTableSnapshot['table'];
  primaryCount: number;
  primaryMinId: number | null;
  primaryMaxId: number | null;
  secondaryCount: number;
  secondaryMinId: number | null;
  secondaryMaxId: number | null;
  deltaCount: number;
  aligned: boolean;
};

type AdminDashboardSummary = {
  ok: true;
  generatedAt: string;
  sales: {
    totalRevenueUsd: number;
    firstClassRevenueUsd: number;
    economyRevenueUsd: number;
    totalSales: number;
    totalReservations: number;
    totalAnulaciones: number;
    byClass: AdminClassSummary[];
  };
  seats: {
    total: number;
    free: number;
    reserved: number;
    sold: number;
    refund: number;
    byState: Array<{ state: string; count: number }>;
  };
  flights: {
    total: number;
    programados: number;
    enVuelo: number;
    finalizados: number;
    inactivos: number;
    topRoutes: AdminFlightSummary[];
  };
  sync: {
    secondaryEnabled: boolean;
    secondaryAttempted: boolean;
    alignedTables: number;
    totalTables: number;
    alignmentPct: number;
    tableSnapshots: AdminTableSync[];
    mongo: {
      totalEvents: number;
      successRatePct: number;
      latestEventUtc: string | null;
      latestLamportTimestamp: number | null;
      recentEvents: EventoOperacionMongoResumen[];
    };
  };
  fleet: {
    totalAircraft: number;
    totalCapacity: number;
    models: AdminFleetSummary[];
  };
  passengers: {
    total: number;
    withEmail: number;
    withReservations: number;
    withSales: number;
  };
};

function sumMoney(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tableKey(table: SqlReplicaTableSnapshot['table']): string {
  return table;
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function flightStatus(vuelo: { activo: boolean; salidaUtc: Date; llegadaUtc: Date }): string {
  if (!vuelo.activo) {
    return 'Inactivo';
  }

  const now = new Date();

  if (now < new Date(vuelo.salidaUtc)) {
    return 'Programado';
  }

  if (now <= new Date(vuelo.llegadaUtc)) {
    return 'En vuelo';
  }

  return 'Finalizado';
}

function minMaxFromIds<T extends { id: number }>(items: T[]): { minId: number | null; maxId: number | null } {
  if (items.length === 0) {
    return { minId: null, maxId: null };
  }

  let minId = items[0].id;
  let maxId = items[0].id;

  for (const item of items) {
    if (item.id < minId) minId = item.id;
    if (item.id > maxId) maxId = item.id;
  }

  return { minId, maxId };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqlReplica: SqlReplicaService,
    private readonly mongoAuditoria: MongoAuditoriaService,
  ) {}

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const generatedAt = new Date().toISOString();

    const [
      asientos,
      vuelos,
      ventas,
      reservas,
      anulaciones,
      aeronaves,
      pasajeros,
      auditoriaCount,
      secondaryState,
      mongoEvents,
      totalMongoEvents,
    ] = await Promise.all([
      this.prisma.asiento.findMany({
        select: {
          id: true,
          vueloId: true,
          estado: true,
          clase: { select: { codigo: true, nombre: true } },
          vuelo: {
            select: {
              id: true,
              numeroVuelo: true,
              activo: true,
              salidaUtc: true,
              llegadaUtc: true,
              origen: { select: { codigo: true, ciudad: true } },
              destino: { select: { codigo: true, ciudad: true } },
            },
          },
        },
      }),
      this.prisma.vuelo.findMany({
        select: {
          id: true,
          numeroVuelo: true,
          activo: true,
          salidaUtc: true,
          llegadaUtc: true,
          origen: { select: { codigo: true, ciudad: true } },
          destino: { select: { codigo: true, ciudad: true } },
        },
      }),
      this.prisma.venta.findMany({
        select: {
          id: true,
          montoUsd: true,
          estado: true,
          pasajeroId: true,
          asiento: {
            select: {
              vueloId: true,
              clase: { select: { codigo: true, nombre: true } },
              vuelo: {
                select: {
                  id: true,
                  numeroVuelo: true,
                  activo: true,
                  salidaUtc: true,
                  llegadaUtc: true,
                  origen: { select: { codigo: true, ciudad: true } },
                  destino: { select: { codigo: true, ciudad: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.reserva.findMany({
        select: { id: true, pasajeroId: true, estado: true },
      }),
      this.prisma.anulacion.count(),
      this.prisma.aeronave.findMany({
        select: {
          modelo: true,
          capacidadEco: true,
          capacidadBus: true,
          capacidadPri: true,
        },
      }),
      this.prisma.pasajero.findMany({
        select: { id: true, email: true },
      }),
      this.prisma.auditoriaAsiento.count(),
      this.sqlReplica.obtenerEstadoReplica(),
      this.mongoAuditoria.listarEventosRecientes(8),
      this.mongoAuditoria.contarEventos(),
    ]);

    const seatStateGroups = new Map<string, number>();
    for (const asiento of asientos) {
      seatStateGroups.set(asiento.estado, (seatStateGroups.get(asiento.estado) ?? 0) + 1);
    }

    const totalSeats = asientos.length;
    const freeSeats = seatStateGroups.get('LIBRE') ?? 0;
    const reservedSeats = seatStateGroups.get('RESERVADO') ?? 0;
    const soldSeats = seatStateGroups.get('VENDIDO') ?? 0;
    const refundSeats = seatStateGroups.get('DEVOLUCION') ?? 0;

    const salesByClass = new Map<string, AdminClassSummary>();
    const routeSummaries = new Map<string, AdminFlightSummary>();
    let totalRevenueUsd = 0;
    let firstClassRevenueUsd = 0;
    let economyRevenueUsd = 0;

    for (const venta of ventas) {
      const revenue = sumMoney(venta.montoUsd);
      const classCode = venta.asiento.clase?.codigo ?? 'SIN_CLASE';
      const className = venta.asiento.clase?.nombre ?? classCode;
      const currentClass = salesByClass.get(classCode) ?? {
        classCode,
        className,
        seatsSold: 0,
        revenueUsd: 0,
      };

      currentClass.seatsSold += 1;
      currentClass.revenueUsd += revenue;
      salesByClass.set(classCode, currentClass);

      totalRevenueUsd += revenue;
      if (classCode === 'PRI' || classCode === 'BUS') {
        firstClassRevenueUsd += revenue;
      } else {
        economyRevenueUsd += revenue;
      }

      const vuelo = venta.asiento.vuelo;
      const routeKey = vuelo ? vuelo.numeroVuelo : `VUELO-${venta.asiento.vueloId}`;
      const routeLabel = vuelo
        ? `${vuelo.origen.codigo} -> ${vuelo.destino.codigo}`
        : 'N/D';
      const existing = routeSummaries.get(routeKey);

      if (existing) {
        existing.soldSeats += 1;
        existing.revenueUsd += revenue;
        existing.occupancyPct = totalSeats > 0
          ? Math.round((existing.soldSeats / existing.totalSeats) * 1000) / 10
          : 0;
      } else if (vuelo) {
        const totalSeatsOnFlight = asientos.filter((asiento) => asiento.vueloId === vuelo.id).length;
        const reservedOnFlight = asientos.filter(
          (asiento) => asiento.vueloId === vuelo.id && asiento.estado === 'RESERVADO',
        ).length;
        const soldOnFlight = asientos.filter(
          (asiento) => asiento.vueloId === vuelo.id && asiento.estado === 'VENDIDO',
        ).length;

        routeSummaries.set(routeKey, {
          flightCode: vuelo.numeroVuelo,
          route: routeLabel,
          status: flightStatus(vuelo),
          totalSeats: totalSeatsOnFlight,
          soldSeats: soldOnFlight,
          reservedSeats: reservedOnFlight,
          freeSeats: totalSeatsOnFlight - soldOnFlight - reservedOnFlight,
          revenueUsd: revenue,
          occupancyPct:
            totalSeatsOnFlight > 0
              ? Math.round((soldOnFlight / totalSeatsOnFlight) * 1000) / 10
              : 0,
        });
      }
    }

    for (const vuelo of vuelos) {
      if (!routeSummaries.has(vuelo.numeroVuelo)) {
        const totalSeatsOnFlight = asientos.filter((asiento) => asiento.vueloId === vuelo.id).length;
        const reservedOnFlight = asientos.filter(
          (asiento) => asiento.vueloId === vuelo.id && asiento.estado === 'RESERVADO',
        ).length;
        const soldOnFlight = asientos.filter(
          (asiento) => asiento.vueloId === vuelo.id && asiento.estado === 'VENDIDO',
        ).length;

        routeSummaries.set(vuelo.numeroVuelo, {
          flightCode: vuelo.numeroVuelo,
          route: `${vuelo.origen.codigo} -> ${vuelo.destino.codigo}`,
          status: flightStatus(vuelo),
          totalSeats: totalSeatsOnFlight,
          soldSeats: soldOnFlight,
          reservedSeats: reservedOnFlight,
          freeSeats: totalSeatsOnFlight - soldOnFlight - reservedOnFlight,
          revenueUsd: 0,
          occupancyPct:
            totalSeatsOnFlight > 0
              ? Math.round((soldOnFlight / totalSeatsOnFlight) * 1000) / 10
              : 0,
        });
      }
    }

    const asientoIds = minMaxFromIds(asientos);
    const reservaIds = minMaxFromIds(reservas);
    const ventaIds = minMaxFromIds(ventas);
    const anulacionIds = minMaxFromIds(
      await this.prisma.anulacion.findMany({ select: { id: true } }),
    );
    const auditoriaIds = minMaxFromIds(
      await this.prisma.auditoriaAsiento.findMany({ select: { id: true } }),
    );

    const primarySnapshots: SqlReplicaTableSnapshot[] = [
      { table: 'Asientos', count: totalSeats, minId: asientoIds.minId, maxId: asientoIds.maxId },
      { table: 'Reservas', count: reservas.length, minId: reservaIds.minId, maxId: reservaIds.maxId },
      { table: 'Ventas', count: ventas.length, minId: ventaIds.minId, maxId: ventaIds.maxId },
      { table: 'Anulaciones', count: anulaciones, minId: anulacionIds.minId, maxId: anulacionIds.maxId },
      { table: 'AuditoriaAsientos', count: auditoriaCount, minId: auditoriaIds.minId, maxId: auditoriaIds.maxId },
    ];

    const secondaryByTable = new Map(
      secondaryState.tables.map((snapshot) => [tableKey(snapshot.table), snapshot]),
    );

    const tableSnapshots = primarySnapshots.map((primary) => {
      const secondary = secondaryByTable.get(tableKey(primary.table));
      const secondaryCount = secondary?.count ?? 0;
      return {
        table: primary.table,
        primaryCount: primary.count,
        primaryMinId: primary.minId,
        primaryMaxId: primary.maxId,
        secondaryCount,
        secondaryMinId: secondary?.minId ?? null,
        secondaryMaxId: secondary?.maxId ?? null,
        deltaCount: secondaryCount - primary.count,
        aligned:
          secondary != null &&
          secondary.count === primary.count &&
          secondary.minId === primary.minId &&
          secondary.maxId === primary.maxId,
      };
    });

    const alignedTables = tableSnapshots.filter((item) => item.aligned).length;
    const totalTables = tableSnapshots.length;
    const alignmentPct = totalTables > 0
      ? Math.round((alignedTables / totalTables) * 1000) / 10
      : 0;

    const recentMongoEvents = mongoEvents.map((event) => this.eventoMongoAResumen(event));
    const mongoOkCount = mongoEvents.filter((event) => event.sincronizacionSqlSecundaria?.ok).length;
    const successRatePct = mongoEvents.length > 0
      ? Math.round((mongoOkCount / mongoEvents.length) * 1000) / 10
      : 100;

    const withReservations = new Set(reservas.map((item) => item.pasajeroId)).size;
    const withSales = new Set(ventas.map((item) => item.pasajeroId)).size;
    const withEmail = pasajeros.filter((item) => Boolean(item.email?.trim())).length;

    return {
      ok: true,
      generatedAt,
      sales: {
        totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
        firstClassRevenueUsd: Math.round(firstClassRevenueUsd * 100) / 100,
        economyRevenueUsd: Math.round(economyRevenueUsd * 100) / 100,
        totalSales: ventas.length,
        totalReservations: reservas.filter((item) => item.estado === 'ACTIVA').length,
        totalAnulaciones: anulaciones,
        byClass: Array.from(salesByClass.values()).sort((a, b) => b.revenueUsd - a.revenueUsd),
      },
      seats: {
        total: totalSeats,
        free: freeSeats,
        reserved: reservedSeats,
        sold: soldSeats,
        refund: refundSeats,
        byState: Array.from(seatStateGroups.entries())
          .map(([state, count]) => ({ state, count }))
          .sort((a, b) => b.count - a.count),
      },
      flights: {
        total: vuelos.length,
        programados: Array.from(routeSummaries.values()).filter((item) => item.status === 'Programado').length,
        enVuelo: Array.from(routeSummaries.values()).filter((item) => item.status === 'En vuelo').length,
        finalizados: Array.from(routeSummaries.values()).filter((item) => item.status === 'Finalizado').length,
        inactivos: Array.from(routeSummaries.values()).filter((item) => item.status === 'Inactivo').length,
        topRoutes: Array.from(routeSummaries.values())
          .sort((a, b) => b.revenueUsd - a.revenueUsd || b.soldSeats - a.soldSeats)
          .slice(0, 5)
          .map((item) => ({
            ...item,
            revenueUsd: Math.round(item.revenueUsd * 100) / 100,
          })),
      },
      sync: {
        secondaryEnabled: secondaryState.enabled,
        secondaryAttempted: secondaryState.attempted,
        alignedTables,
        totalTables,
        alignmentPct,
        tableSnapshots,
        mongo: {
          totalEvents: totalMongoEvents,
          successRatePct,
          latestEventUtc: mongoEvents[0]?.timestampUtc ?? null,
          latestLamportTimestamp: mongoEvents.reduce(
            (max, event) => Math.max(max, event.lamportTimestamp ?? 0),
            0,
          ) || null,
          recentEvents: recentMongoEvents,
        },
      },
      fleet: {
        totalAircraft: aeronaves.length,
        totalCapacity: aeronaves.reduce(
          (sum, item) => sum + item.capacidadEco + item.capacidadBus + item.capacidadPri,
          0,
        ),
        models: aeronaves.map((item) => ({
          model: item.modelo,
          economy: item.capacidadEco,
          business: item.capacidadBus,
          first: item.capacidadPri,
          totalCapacity: item.capacidadEco + item.capacidadBus + item.capacidadPri,
        })),
      },
      passengers: {
        total: pasajeros.length,
        withEmail,
        withReservations,
        withSales,
      },
    };
  }

  private eventoMongoAResumen(evento: EventoOperacionMongo): EventoOperacionMongoResumen {
    const syncLabel = evento.sincronizacionSqlSecundaria
      ? `SQL secundaria ${evento.sincronizacionSqlSecundaria.ok ? 'OK' : 'fallo'}`
      : 'Sin detalle de replica';

    return {
      time: formatTime(new Date(evento.timestampUtc)),
      event: `${evento.tipoOperacion} · asiento ${evento.asientoId}`,
      detail: `Nodo ${evento.nodoOrigen} | Lamport ${evento.lamportTimestamp ?? 'N/D'} | ${evento.estadoAntes} -> ${evento.estadoDespues} | ${syncLabel}`,
    };
  }
}
