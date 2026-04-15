// src/operaciones/operaciones.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { OperacionesService } from './operaciones.service';
import { ReservaDto, VentaDto, AnulacionDto } from './dto/operaciones.dto';

@Controller()
export class OperacionesController {
  constructor(private readonly service: OperacionesService) {}

  /**
   * POST /reservas
   * Body: { asientoId, pasajeroId, nodoOrigen?, relojVector?, lamportTimestamp?, lamportRemoto?, minutosExpiracion? }
   */
  @Post('reservas')
  reservar(@Body() dto: ReservaDto) {
    return this.service.reservar(dto);
  }

  /**
   * POST /ventas
   * Body: { asientoId, pasajeroId, reservaId?, nodoOrigen?, relojVector?, lamportTimestamp?, lamportRemoto? }
   */
  @Post('ventas')
  vender(@Body() dto: VentaDto) {
    return this.service.vender(dto);
  }

  /**
   * POST /anulaciones
   * Body: { asientoId, pasajeroId, reservaId?, ventaId?, motivo?, tipo?, nodoOrigen?, relojVector?, lamportTimestamp?, lamportRemoto? }
   */
  @Post('anulaciones')
  anular(@Body() dto: AnulacionDto) {
    return this.service.anular(dto);
  }

  /**
   * GET /asientos/:id/auditoria
   * Historial de cambios de estado de un asiento (para el módulo de algoritmia)
   */
  @Get('asientos/:id/auditoria')
  getAuditoria(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAuditoria(id);
  }
}
