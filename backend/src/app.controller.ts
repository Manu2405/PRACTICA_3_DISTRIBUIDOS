import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Raíz: evita 404 al abrir solo http://localhost:3001 */
  @Get()
  root() {
    return {
      ok: true,
      servicio: 'Aviones Distribuidos API',
      docs: 'Usa rutas concretas; la raíz no lista datos.',
      ejemplos: {
        aeropuertos: '/aeropuertos',
        vuelos: '/vuelos',
        dijkstra: '/shortest-path?from=A&to=F',
      },
    };
  }

  @Get('shortest-path')
  getShortestPath(
    @Query('from') from = 'A',
    @Query('to') to = 'F'
  ) {
    return this.appService.computeShortestPath(from, to);
  }
}
