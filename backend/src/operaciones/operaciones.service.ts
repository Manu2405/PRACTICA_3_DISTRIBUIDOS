// src/operaciones/operaciones.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SqlReplicaService } from '../prisma/sql-replica.service';
import { MongoAuditoriaService } from '../mongo-auditoria/mongo-auditoria.service';
import { ReservaDto } from './dto/operaciones.dto';
import { VentaDto } from './dto/operaciones.dto';
import { AnulacionDto } from './dto/operaciones.dto';
import { LamportClockService } from '../algoritmia/lamport-clock/lamport-clock.service';

// ── Máquina de estados del asiento ───────────────────────────────
// LIBRE      → RESERVADO  (reserva)
// LIBRE      → VENDIDO    (venta directa)
// RESERVADO  → VENDIDO    (venta desde reserva)
// RESERVADO  → LIBRE      (anulación de reserva)
// VENDIDO    → DEVOLUCION (devolución)
// DEVOLUCION → LIBRE      (liberación posterior — proceso admin)

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  LIBRE: ['RESERVADO', 'VENDIDO'],
  RESERVADO: ['VENDIDO', 'LIBRE'],
  VENDIDO: ['DEVOLUCION'],
  DEVOLUCION: ['LIBRE'],
};

function validarTransicion(desde: string, hasta: string) {
  const permitidos = TRANSICIONES_VALIDAS[desde] ?? [];
  if (!permitidos.includes(hasta)) {
    throw new BadRequestException(
      `Transición de estado inválida: ${desde} → ${hasta}`,
    );
  }
}

@Injectable()
export class OperacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mongoAuditoria: MongoAuditoriaService,
    private readonly sqlReplica: SqlReplicaService = new SqlReplicaService(),
    private readonly lamportService: LamportClockService = new LamportClockService(),
  ) { }

  // ── Helpers privados ───────────────────────────────────────────

  private async getAsientoOFail(id: number) {
    const asiento = await this.prisma.asiento.findUnique({ where: { id } });
    if (!asiento) throw new NotFoundException(`Asiento ${id} no encontrado`);
    return asiento;
  }

  private async registrarAuditoria(
    tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    params: {
      asientoId: number;
      desde: string;
      hasta: string;
      operacion: string;
      referenciaId: number;
      nodo: string;
      relojVector?: string;
    },
  ) {
    return tx.auditoriaAsiento.create({
      data: {
        asientoId: params.asientoId,
        estadoDesde: params.desde,
        estadoHasta: params.hasta,
        operacion: params.operacion,
        referenciaId: params.referenciaId,
        nodoOrigen: params.nodo,
        relojVector: params.relojVector,
      },
    });
  }

  private normalizarRelojVector(reloj: string | undefined, nodo: string): string {
    if (typeof reloj === 'string' && reloj.trim().length > 0) {
      return reloj;
    }

    return JSON.stringify({
      [nodo]: Date.now(),
    });
  }

  private resolverLamportTimestamp(
    lamportLocal: number | undefined,
    lamportRemoto: number | undefined,
  ): number {
    if (typeof lamportRemoto === 'number') {
      return this.lamportService.combinar(lamportLocal ?? 0, lamportRemoto);
    }
    return this.lamportService.incrementar(lamportLocal ?? 0);
  }

  // ── RESERVA ───────────────────────────────────────────────────
  async reservar(dto: ReservaDto) {
    const asiento = await this.getAsientoOFail(dto.asientoId);
    validarTransicion(asiento.estado, 'RESERVADO');

    const nodo = dto.nodoOrigen ?? 'NODO_1';
    const minutos = dto.minutosExpiracion ?? 30;
    const expiraEn = new Date(Date.now() + minutos * 60 * 1000);
    const relojVector = this.normalizarRelojVector(dto.relojVector, nodo);
    const lamportTimestamp = this.resolverLamportTimestamp(
      dto.lamportTimestamp,
      dto.lamportRemoto,
    );

    const resultado = await this.prisma.$transaction(async (tx) => {
      // Bloquear y verificar estado actual dentro de la transacción
      const asientoActual = await tx.asiento.findUniqueOrThrow({
        where: { id: dto.asientoId },
      });

      if (asientoActual.estado !== 'LIBRE') {
        throw new ConflictException(
          `El asiento ya no está disponible (estado: ${asientoActual.estado})`,
        );
      }

      // Cambiar estado
      await tx.asiento.update({
        where: { id: dto.asientoId },
        data: { estado: 'RESERVADO' },
      });

      // Crear reserva
      const reserva = await tx.reserva.create({
        data: {
          asientoId: dto.asientoId,
          pasajeroId: dto.pasajeroId,
          nodoOrigen: nodo,
          relojVector,
          expiraEn,
          estado: 'ACTIVA',
        },
        include: {
          asiento: { include: { vuelo: true, clase: true } },
          pasajero: true,
        },
      });

      const auditoria = await this.registrarAuditoria(tx as any, {
        asientoId: dto.asientoId,
        desde: 'LIBRE',
        hasta: 'RESERVADO',
        operacion: 'RESERVA',
        referenciaId: reserva.id,
        nodo,
        relojVector,
      });

      return {
        operacion: 'RESERVA',
        reservaId: reserva.id,
        estado: 'RESERVADO',
        expiraEn,
        nodoOrigen: nodo,
        lamportTimestamp,
        timestampUtc: new Date().toISOString(),
        auditoria,
        detalle: reserva,
      };
    });

    const replicaSqlSecundaria = await this.sqlReplica.replicarReserva({
      asiento: {
        id: resultado.detalle.asiento.id,
        vueloId: resultado.detalle.asiento.vueloId,
        claseId: resultado.detalle.asiento.claseId,
        numero: resultado.detalle.asiento.numero,
        estado: resultado.detalle.asiento.estado,
        creadoEn: resultado.detalle.asiento.creadoEn,
      },
      reserva: {
        id: resultado.detalle.id,
        asientoId: resultado.detalle.asientoId,
        pasajeroId: resultado.detalle.pasajeroId,
        nodoOrigen: resultado.detalle.nodoOrigen,
        relojVector: resultado.detalle.relojVector,
        creadoEn: resultado.detalle.creadoEn,
        expiraEn: resultado.detalle.expiraEn,
        estado: resultado.detalle.estado,
      },
      auditoria: {
        id: resultado.auditoria.id,
        asientoId: resultado.auditoria.asientoId,
        estadoDesde: resultado.auditoria.estadoDesde,
        estadoHasta: resultado.auditoria.estadoHasta,
        operacion: resultado.auditoria.operacion,
        referenciaId: resultado.auditoria.referenciaId,
        nodoOrigen: resultado.auditoria.nodoOrigen,
        relojVector: resultado.auditoria.relojVector,
        timestampUtc: resultado.auditoria.timestampUtc,
      },
    });

    const mongoReplicado = await this.mongoAuditoria.registrarEvento({
      tipoOperacion: 'RESERVA',
      nodoOrigen: nodo,
      relojVector,
      lamportTimestamp,
      sincronizacionSqlSecundaria: replicaSqlSecundaria,
      timestampUtc: resultado.timestampUtc,
      asientoId: dto.asientoId,
      pasajeroId: dto.pasajeroId,
      estadoAntes: 'LIBRE',
      estadoDespues: 'RESERVADO',
      referenciaId: resultado.reservaId,
    });

    return {
      ...resultado,
      sincronizacion: {
        sqlPrincipal: { ok: true },
        sqlSecundaria: replicaSqlSecundaria,
        mongo: { ok: mongoReplicado },
      },
    };
  }

  // ── VENTA ─────────────────────────────────────────────────────
  async vender(dto: VentaDto) {
    const asiento = await this.getAsientoOFail(dto.asientoId);

    if (!['LIBRE', 'RESERVADO'].includes(asiento.estado)) {
      throw new BadRequestException(
        `No se puede vender un asiento en estado: ${asiento.estado}`,
      );
    }

    const nodo = dto.nodoOrigen ?? 'NODO_1';
    const relojVector = this.normalizarRelojVector(dto.relojVector, nodo);
    const lamportTimestamp = this.resolverLamportTimestamp(
      dto.lamportTimestamp,
      dto.lamportRemoto,
    );

    const resultado = await this.prisma.$transaction(async (tx) => {
      const asientoActual = await tx.asiento.findUniqueOrThrow({
        where: { id: dto.asientoId },
        include: {
          clase: true,
          vuelo: true,
        },
      });

      let reservaIdFinal: number | null = dto.reservaId ?? null;

      // Si el asiento está reservado, permitir compra SOLO si la reserva es del mismo pasajero
      if (asientoActual.estado === 'RESERVADO') {
        let reservaActiva = null;

        if (dto.reservaId) {
          reservaActiva = await tx.reserva.findUnique({
            where: { id: dto.reservaId },
          });

          if (!reservaActiva) {
            throw new NotFoundException(`Reserva ${dto.reservaId} no encontrada`);
          }
        } else {
          reservaActiva = await tx.reserva.findFirst({
            where: {
              asientoId: dto.asientoId,
              pasajeroId: dto.pasajeroId,
              estado: 'ACTIVA',
            },
            orderBy: { creadoEn: 'desc' },
          });
        }

        if (!reservaActiva) {
          throw new ConflictException(
            'El asiento está reservado por otro pasajero o la reserva ya no está activa.',
          );
        }

        if (reservaActiva.asientoId !== dto.asientoId) {
          throw new BadRequestException(
            'La reserva encontrada no corresponde a este asiento',
          );
        }

        if (reservaActiva.pasajeroId !== dto.pasajeroId) {
          throw new ConflictException(
            'La reserva pertenece a otro pasajero',
          );
        }

        // Validar expiración
        if (reservaActiva.expiraEn && new Date(reservaActiva.expiraEn) < new Date()) {
          await tx.reserva.update({
            where: { id: reservaActiva.id },
            data: { estado: 'EXPIRADA' },
          });

          await tx.asiento.update({
            where: { id: dto.asientoId },
            data: { estado: 'LIBRE' },
          });

          throw new ConflictException(
            'La reserva ya expiró. Debe volver a reservar o comprar si está libre.',
          );
        }

        // Convertir reserva en venta
        await tx.reserva.update({
          where: { id: reservaActiva.id },
          data: { estado: 'CONVERTIDA' },
        });

        reservaIdFinal = reservaActiva.id;
      }

      const estadoAnterior = asientoActual.estado;

      const monto =
        Number(asientoActual.vuelo.precioBaseUsd) *
        Number(asientoActual.clase.multiplicador);

      await tx.asiento.update({
        where: { id: dto.asientoId },
        data: { estado: 'VENDIDO' },
      });

      const venta = await tx.venta.create({
        data: {
          asientoId: dto.asientoId,
          pasajeroId: dto.pasajeroId,
          reservaId: reservaIdFinal,
          montoUsd: monto,
          nodoOrigen: nodo,
          relojVector,
          estado: 'CONFIRMADA',
        },
        include: {
          asiento: { include: { vuelo: true, clase: true } },
          pasajero: true,
        },
      });

      const auditoria = await this.registrarAuditoria(tx as any, {
        asientoId: dto.asientoId,
        desde: estadoAnterior,
        hasta: 'VENDIDO',
        operacion: 'VENTA',
        referenciaId: venta.id,
        nodo,
        relojVector,
      });

      return {
        operacion: 'VENTA',
        ventaId: venta.id,
        reservaId: reservaIdFinal,
        estado: 'VENDIDO',
        montoUsd: monto,
        nodoOrigen: nodo,
        lamportTimestamp,
        timestampUtc: new Date().toISOString(),
        auditoria,
        detalle: venta,
      };
    });

    const replicaSqlSecundaria = await this.sqlReplica.replicarVenta({
      asiento: {
        id: resultado.detalle.asiento.id,
        vueloId: resultado.detalle.asiento.vueloId,
        claseId: resultado.detalle.asiento.claseId,
        numero: resultado.detalle.asiento.numero,
        estado: resultado.detalle.asiento.estado,
        creadoEn: resultado.detalle.asiento.creadoEn,
      },
      venta: {
        id: resultado.detalle.id,
        asientoId: resultado.detalle.asientoId,
        pasajeroId: resultado.detalle.pasajeroId,
        reservaId: resultado.detalle.reservaId,
        montoUsd: resultado.detalle.montoUsd,
        nodoOrigen: resultado.detalle.nodoOrigen,
        relojVector: resultado.detalle.relojVector,
        creadoEn: resultado.detalle.creadoEn,
        estado: resultado.detalle.estado,
      },
      auditoria: {
        id: resultado.auditoria.id,
        asientoId: resultado.auditoria.asientoId,
        estadoDesde: resultado.auditoria.estadoDesde,
        estadoHasta: resultado.auditoria.estadoHasta,
        operacion: resultado.auditoria.operacion,
        referenciaId: resultado.auditoria.referenciaId,
        nodoOrigen: resultado.auditoria.nodoOrigen,
        relojVector: resultado.auditoria.relojVector,
        timestampUtc: resultado.auditoria.timestampUtc,
      },
      reservaConvertidaId: resultado.reservaId,
    });

    const mongoReplicado = await this.mongoAuditoria.registrarEvento({
      tipoOperacion: 'VENTA',
      nodoOrigen: nodo,
      relojVector,
      lamportTimestamp,
      sincronizacionSqlSecundaria: replicaSqlSecundaria,
      timestampUtc: resultado.timestampUtc,
      asientoId: dto.asientoId,
      pasajeroId: dto.pasajeroId,
      estadoAntes: resultado.detalle.reservaId ? 'RESERVADO' : 'LIBRE',
      estadoDespues: 'VENDIDO',
      referenciaId: resultado.ventaId,
    });

    return {
      ...resultado,
      sincronizacion: {
        sqlPrincipal: { ok: true },
        sqlSecundaria: replicaSqlSecundaria,
        mongo: { ok: mongoReplicado },
      },
    };
  }

  // ── ANULACIÓN ─────────────────────────────────────────────────
  async anular(dto: AnulacionDto) {
    const asiento = await this.getAsientoOFail(dto.asientoId);

    const tipoRaw = (dto.tipo ?? 'ANULACION').toUpperCase();
    const esAnulacionReserva =
      tipoRaw === 'ANULACION' || tipoRaw === 'RESERVA';
    const esDevolucionVenta =
      tipoRaw === 'DEVOLUCION' || tipoRaw === 'VENTA';

    let estadoDestino: string;
    let tipoPersistido: string;

    if (asiento.estado === 'RESERVADO' && esAnulacionReserva) {
      estadoDestino = 'LIBRE';
      tipoPersistido = 'ANULACION';
    } else if (asiento.estado === 'VENDIDO' && esDevolucionVenta) {
      estadoDestino = 'DEVOLUCION';
      tipoPersistido = 'DEVOLUCION';
    } else {
      throw new BadRequestException(
        `No se puede realizar ${tipoRaw} sobre asiento en estado: ${asiento.estado}`,
      );
    }

    validarTransicion(asiento.estado, estadoDestino);

    const nodo = dto.nodoOrigen ?? 'NODO_1';
    const relojVector = this.normalizarRelojVector(dto.relojVector, nodo);
    const lamportTimestamp = this.resolverLamportTimestamp(
      dto.lamportTimestamp,
      dto.lamportRemoto,
    );

    const resultado = await this.prisma.$transaction(async (tx) => {
      let reservaIdFinal = dto.reservaId ?? null;
      let ventaIdFinal = dto.ventaId ?? null;

      // Si estamos anulando una reserva y no vino reservaId, buscar la reserva activa
      if (asiento.estado === 'RESERVADO' && tipoPersistido === 'ANULACION' && !reservaIdFinal) {
        const reserva = await tx.reserva.findFirst({
          where: {
            asientoId: dto.asientoId,
            pasajeroId: dto.pasajeroId,
            estado: 'ACTIVA',
          },
          orderBy: { creadoEn: 'desc' },
        });

        if (reserva) {
          reservaIdFinal = reserva.id;
        }
      }

      // Si estamos devolviendo una venta y no vino ventaId, buscar la venta confirmada
      if (asiento.estado === 'VENDIDO' && tipoPersistido === 'DEVOLUCION' && !ventaIdFinal) {
        const venta = await tx.venta.findFirst({
          where: {
            asientoId: dto.asientoId,
            pasajeroId: dto.pasajeroId,
            estado: 'CONFIRMADA',
          },
          orderBy: { creadoEn: 'desc' },
        });

        if (venta) {
          ventaIdFinal = venta.id;
        }
      }

      await tx.asiento.update({
        where: { id: dto.asientoId },
        data: { estado: estadoDestino },
      });

      if (reservaIdFinal) {
        await tx.reserva.update({
          where: { id: reservaIdFinal },
          data: { estado: 'ANULADA' },
        });
      }

      if (ventaIdFinal) {
        await tx.venta.update({
          where: { id: ventaIdFinal },
          data: { estado: 'ANULADA' },
        });
      }

      const anulacion = await tx.anulacion.create({
        data: {
          asientoId: dto.asientoId,
          pasajeroId: dto.pasajeroId,
          reservaId: reservaIdFinal,
          ventaId: ventaIdFinal,
          motivo: dto.motivo ?? null,
          tipo: tipoPersistido,
          nodoOrigen: nodo,
          relojVector,
        },
        include: {
          asiento: { include: { vuelo: true } },
          pasajero: true,
        },
      });

      const auditoria = await this.registrarAuditoria(tx as any, {
        asientoId: dto.asientoId,
        desde: asiento.estado,
        hasta: estadoDestino,
        operacion: tipoPersistido,
        referenciaId: anulacion.id,
        nodo,
        relojVector,
      });

      return {
        operacion: tipoPersistido,
        anulacionId: anulacion.id,
        estado: estadoDestino,
        reservaId: reservaIdFinal,
        ventaId: ventaIdFinal,
        nodoOrigen: nodo,
        lamportTimestamp,
        timestampUtc: new Date().toISOString(),
        auditoria,
        detalle: anulacion,
      };
    });

    const replicaSqlSecundaria = await this.sqlReplica.replicarAnulacion({
      asiento: {
        id: resultado.detalle.asiento.id,
        vueloId: resultado.detalle.asiento.vueloId,
        claseId: resultado.detalle.asiento.claseId,
        numero: resultado.detalle.asiento.numero,
        estado: resultado.detalle.asiento.estado,
        creadoEn: resultado.detalle.asiento.creadoEn,
      },
      anulacion: {
        id: resultado.detalle.id,
        asientoId: resultado.detalle.asientoId,
        pasajeroId: resultado.detalle.pasajeroId,
        reservaId: resultado.detalle.reservaId,
        ventaId: resultado.detalle.ventaId,
        motivo: resultado.detalle.motivo,
        tipo: resultado.detalle.tipo,
        nodoOrigen: resultado.detalle.nodoOrigen,
        relojVector: resultado.detalle.relojVector,
        creadoEn: resultado.detalle.creadoEn,
      },
      auditoria: {
        id: resultado.auditoria.id,
        asientoId: resultado.auditoria.asientoId,
        estadoDesde: resultado.auditoria.estadoDesde,
        estadoHasta: resultado.auditoria.estadoHasta,
        operacion: resultado.auditoria.operacion,
        referenciaId: resultado.auditoria.referenciaId,
        nodoOrigen: resultado.auditoria.nodoOrigen,
        relojVector: resultado.auditoria.relojVector,
        timestampUtc: resultado.auditoria.timestampUtc,
      },
      reservaAnuladaId: resultado.reservaId,
      ventaAnuladaId: resultado.ventaId,
    });

    const mongoReplicado = await this.mongoAuditoria.registrarEvento({
      tipoOperacion: tipoPersistido,
      nodoOrigen: nodo,
      relojVector,
      lamportTimestamp,
      sincronizacionSqlSecundaria: replicaSqlSecundaria,
      timestampUtc: resultado.timestampUtc,
      asientoId: dto.asientoId,
      pasajeroId: dto.pasajeroId,
      estadoAntes: asiento.estado,
      estadoDespues: resultado.estado,
      referenciaId: resultado.anulacionId,
    });

    return {
      ...resultado,
      sincronizacion: {
        sqlPrincipal: { ok: true },
        sqlSecundaria: replicaSqlSecundaria,
        mongo: { ok: mongoReplicado },
      },
    };
  }

  // ── CONSULTA DE AUDITORÍA ─────────────────────────────────────
  async getAuditoria(asientoId: number) {
    return this.prisma.auditoriaAsiento.findMany({
      where: { asientoId },
      orderBy: { timestampUtc: 'asc' },
    });
  }
}
