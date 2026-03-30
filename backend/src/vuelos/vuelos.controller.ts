// src/vuelos/vuelos.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { VuelosService } from './vuelos.service';
import { CreateVueloDto } from './dto/create-vuelo.dto';

@Controller('vuelos')
export class VuelosController {
  constructor(private readonly service: VuelosService) {}

  /** GET /vuelos */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** GET /vuelos/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** GET /vuelos/:id/asientos */
  @Get(':id/asientos')
  findAsientos(@Param('id', ParseIntPipe) id: number) {
    return this.service.findAsientos(id);
  }

  /** POST /vuelos  — crea vuelo y genera asientos automáticamente */
  @Post()
  create(@Body() dto: CreateVueloDto) {
    return this.service.create(dto);
  }
}
