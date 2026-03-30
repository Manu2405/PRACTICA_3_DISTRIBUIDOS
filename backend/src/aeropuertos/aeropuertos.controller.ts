// src/aeropuertos/aeropuertos.controller.ts
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AeropuertosService } from './aeropuertos.service';

@Controller('aeropuertos')
export class AeropuertosController {
  constructor(private readonly service: AeropuertosService) {}

  /** GET /aeropuertos */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** GET /aeropuertos/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
