// src/operaciones/operaciones.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservaDto } from './dto/operaciones.dto';
import { VentaDto } from './dto/operaciones.dto';
import { AnulacionDto } from './dto/operaciones.dto';

// ── Máquina de estados del asiento ───────────────────────────────
// LIBRE      → RESERVADO  (reserva)
// LIBRE      → VENDIDO    (venta directa)
// RESERVADO  → VENDIDO    (venta desde reserva)
// RESERVADO  → LIBRE      (anulación de reserva)
// VENDIDO    → DEVOLUCION (devolución)
// DEVOLUCION → LIBRE      (liberación posterior — proceso admin)

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  LIBRE:      ['RESERVADO', 'VENDIDO'],
  RESERVADO:  ['VENDIDO', 'LIBRE'],
  VENDIDO:    ['DEVOLUCION'],
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
  constructor(private readonly prisma: PrismaService) {}

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
    await tx.auditoriaAsiento.create({
      data: {
        asientoId:    params.asientoId,
        estadoDesde:  params.desde,
        estadoHasta:  params.hasta,
        operacion:    params.operacion,
        referenciaId: params.referenciaId,
        nodoOrigen:   params.nodo,
        relojVector:  params.relojVector,
      },
    });
  }

  // ── RESERVA ───────────────────────────────────────────────────
  async reservar(dto: ReservaDto) {
    const asiento = await this.getAsientoOFail(dto.asientoId);
    validarTransicion(asiento.estado, 'RESERVADO');

    const nodo = dto.nodoOrigen ?? 'NODO_1';
    const minutos = dto.minutosExpiracion ?? 30;
    const expiraEn = new Date(Date.now() + minutos * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
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
          asientoId:   dto.asientoId,
          pasajeroId:  dto.pasajeroId,
          nodoOrigen:  nodo,
          relojVector: dto.relojVector,
          expiraEn,
          estado: 'ACTIVA',
        },
        include: {
          asiento:  { include: { vuelo: true, clase: true } },
          pasajero: true,
        },
      });

      await this.registrarAuditoria(tx as any, {
        asientoId:   dto.asientoId,
        desde:       'LIBRE',
        hasta:       'RESERVADO',
        operacion:   'RESERVA',
        referenciaId: reserva.id,
        nodo,
        relojVector: dto.relojVector,
      });

      return {
        operacion: 'RESERVA',
        reservaId: reserva.id,
        estado:    'RESERVADO',
        expiraEn,
        nodoOrigen: nodo,
        timestampUtc: new Date().toISOString(),
        detalle: reserva,
      };
    });
  }

  // ── VENTA ─────────────────────────────────────────────────────
  async vender(dto: VentaDto) {
    const asiento = await this.getAsientoOFail(dto.asientoId);

    // Puede venir de LIBRE (venta directa) o de RESERVADO (confirmar reserva)
    if (!['LIBRE', 'RESERVADO'].includes(asiento.estado)) {
      throw new BadRequestException(
        `No se puede vender un asiento en estado: ${asiento.estado}`,
      );
    }

    const nodo = dto.nodoOrigen ?? 'NODO_1';

    return this.prisma.$transaction(async (tx) => {
      const asientoActual = await tx.asiento.findUniqueOrThrow({
        where: { id: dto.asientoId },
        include: {
          clase: true,
          vuelo: true,
        },
      });

      // Si viene desde reserva, validar que sea del mismo pasajero
      if (dto.reservaId) {
        const reserva = await tx.reserva.findUniqueOrThrow({
          where: { id: dto.reservaId },
        });
        if (reserva.asientoId !== dto.asientoId) {
          throw new BadRequestException('La reserva no corresponde a este asiento');
        }
        if (reserva.pasajeroId !== dto.pasajeroId) {
          throw new BadRequestException('El pasajero no coincide con la reserva');
        }
        // Marcar reserva como convertida
        await tx.reserva.update({
          where: { id: dto.reservaId },
          data: { estado: 'CONVERTIDA' },
        });
      } else if (asientoActual.estado === 'RESERVADO') {
        // Venta directa sobre asiento reservado por otro: conflicto
        throw new ConflictException(
          'El asiento está reservado por otro pasajero. Se debe anular primero.',
        );
      }

      const estadoAnterior = asientoActual.estado;

      // Calcular monto
      const monto = Number(asientoActual.vuelo.precioBaseUsd) *
                    Number(asientoActual.clase.multiplicador);

      await tx.asiento.update({
        where: { id: dto.asientoId },
        data: { estado: 'VENDIDO' },
      });

      const venta = await tx.venta.create({
        data: {
          asientoId:   dto.asientoId,
          pasajeroId:  dto.pasajeroId,
          reservaId:   dto.reservaId ?? null,
          montoUsd:    monto,
          nodoOrigen:  nodo,
          relojVector: dto.relojVector,
          estado:      'CONFIRMADA',
        },
        include: {
          asiento:  { include: { vuelo: true, clase: true } },
          pasajero: true,
        },
      });

      await this.registrarAuditoria(tx as any, {
        asientoId:    dto.asientoId,
        desde:        estadoAnterior,
        hasta:        'VENDIDO',
        operacion:    'VENTA',
        referenciaId: venta.id,
        nodo,
        relojVector:  dto.relojVector,
      });

      return {
        operacion:    'VENTA',
        ventaId:      venta.id,
        estado:       'VENDIDO',
        montoUsd:     monto,
        nodoOrigen:   nodo,
        timestampUtc: new Date().toISOString(),
        detalle:      venta,
      };
    });
  }

  // ── ANULACIÓN ─────────────────────────────────────────────────
  async anular(dto: AnulacionDto) {
    const asiento = await this.getAsientoOFail(dto.asientoId);
    const tipo = dto.tipo ?? 'ANULACION';

    // Determinar transición según tipo y estado actual
    let estadoDestino: string;
    if (asiento.estado === 'RESERVADO' && tipo === 'ANULACION') {
      estadoDestino = 'LIBRE';
    } else if (asiento.estado === 'VENDIDO' && tipo === 'DEVOLUCION') {
      estadoDestino = 'DEVOLUCION';
    } else {
      throw new BadRequestException(
        `No se puede realizar ${tipo} sobre asiento en estado: ${asiento.estado}`,
      );
    }

    validarTransicion(asiento.estado, estadoDestino);

    const nodo = dto.nodoOrigen ?? 'NODO_1';

    return this.prisma.$transaction(async (tx) => {
      // Actualizar estado del asiento
      await tx.asiento.update({
        where: { id: dto.asientoId },
        data: { estado: estadoDestino },
      });

      // Si anulamos una reserva, marcarla
      if (dto.reservaId) {
        await tx.reserva.update({
          where: { id: dto.reservaId },
          data: { estado: 'ANULADA' },
        });
      }

      // Si es devolución de venta, marcar la venta
      if (dto.ventaId) {
        await tx.venta.update({
          where: { id: dto.ventaId },
          data: { estado: 'ANULADA' },
        });
      }

      const anulacion = await tx.anulacion.create({
        data: {
          asientoId:   dto.asientoId,
          pasajeroId:  dto.pasajeroId,
          reservaId:   dto.reservaId ?? null,
          ventaId:     dto.ventaId ?? null,
          motivo:      dto.motivo ?? null,
          tipo,
          nodoOrigen:  nodo,
          relojVector: dto.relojVector,
        },
        include: {
          asiento:  { include: { vuelo: true } },
          pasajero: true,
        },
      });

      await this.registrarAuditoria(tx as any, {
        asientoId:    dto.asientoId,
        desde:        asiento.estado,
        hasta:        estadoDestino,
        operacion:    tipo,
        referenciaId: anulacion.id,
        nodo,
        relojVector:  dto.relojVector,
      });

      return {
        operacion:    tipo,
        anulacionId:  anulacion.id,
        estado:       estadoDestino,
        nodoOrigen:   nodo,
        timestampUtc: new Date().toISOString(),
        detalle:      anulacion,
      };
    });
  }

  // ── CONSULTA DE AUDITORÍA ─────────────────────────────────────
  async getAuditoria(asientoId: number) {
    return this.prisma.auditoriaAsiento.findMany({
      where: { asientoId },
      orderBy: { timestampUtc: 'asc' },
    });
  }
}
