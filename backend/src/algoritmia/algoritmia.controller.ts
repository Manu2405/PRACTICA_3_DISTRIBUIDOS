// src/algoritmia/algoritmia.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { VectorClockService } from './vector-clock/vector-clock.service';
import { ConflictResolverService } from './conflict-resolver/conflict-resolver.service';
import { LamportClockService } from './lamport-clock/lamport-clock.service';
import {
  ConflictoDto,
  LamportCombinarDto,
  LamportCompararDto,
  LamportGenerarDto,
  LamportIncrementoDto,
  RelojCombinarDto,
  RelojCompararDto,
  RelojIncrementoDto,
  RelojVectorialDto,
  RutaQueryDto,
} from './dto/algoritmia.dto';

@Controller('algoritmia')
export class AlgoritmiaController {
  constructor(
    private readonly dijkstraService: DijkstraService,
    private readonly vcService: VectorClockService,
    private readonly conflictService: ConflictResolverService,
    private readonly lamportService: LamportClockService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DIJKSTRA — Rutas óptimas
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /algoritmia/ruta?origen=ATL&destino=LON&criterio=price
   *
   * Calcula la ruta óptima entre dos aeropuertos.
   * criterio: 'price' (menor costo) | 'time' (menor tiempo)
   */
  @Get('ruta')
  calcularRuta(@Query() query: RutaQueryDto) {
    const { origen, destino, criterio } = query;
    const result = this.dijkstraService.calcularRuta(origen, destino, criterio ?? 'price');
    return {
      ok: true,
      origen,
      destino,
      criterio: criterio ?? 'price',
      ...result,
    };
  }

  /**
   * GET /algoritmia/ruta/comparar?origen=ATL&destino=LON
   *
   * Calcula ambas rutas (precio Y tiempo) para comparar en la UI.
   * Ideal para mostrar "ruta más barata" vs "ruta más rápida".
   */
  @Get('ruta/comparar')
  compararRutas(@Query() query: RutaQueryDto) {
    const { origen, destino } = query;
    const porPrecio = this.dijkstraService.calcularRuta(origen, destino, 'price');
    const porTiempo = this.dijkstraService.calcularRuta(origen, destino, 'time');

    // Calcular la métrica complementaria para cada ruta
    const costoRutaTiempo = this.dijkstraService.calcularRutaMetrica(
      porTiempo.path, 'price',
    );
    const tiempoRutaPrecio = this.dijkstraService.calcularRutaMetrica(
      porPrecio.path, 'time',
    );

    return {
      ok: true,
      origen,
      destino,
      porPrecio: {
        ...porPrecio,
        /** Costo total real en USD */
        costoUsd: porPrecio.totalValue,
        /** Tiempo de vuelo real en horas para esta ruta */
        tiempoHoras: tiempoRutaPrecio,
        /** Precio clase ejecutiva (50% sobre economy) */
        costoFirstUsd: Math.round(porPrecio.totalValue * 1.5),
      },
      porTiempo: {
        ...porTiempo,
        /** Tiempo real en horas */
        tiempoHoras: porTiempo.totalValue,
        /** Costo real en USD para esta ruta */
        costoUsd: costoRutaTiempo,
        /** Precio clase ejecutiva */
        costoFirstUsd: Math.round(costoRutaTiempo * 1.5),
      },
      sonIguales: JSON.stringify(porPrecio.path) === JSON.stringify(porTiempo.path),
    };
  }

  /**
   * GET /algoritmia/aeropuertos
   *
   * Lista los códigos IATA disponibles en el grafo.
   */
  @Get('aeropuertos')
  listarAeropuertos() {
    return {
      ok: true,
      aeropuertos: this.dijkstraService.listarAeropuertos(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELOJES VECTORIALES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /algoritmia/reloj/generar
   * Body: { nodoId: "NODO_1", nodos?: ["NODO_1","NODO_2","NODO_3"] }
   *
   * Genera un reloj vectorial inicial para un nodo.
   */
  @Post('reloj/generar')
  generarReloj(@Body() dto: RelojVectorialDto) {
    const evento = this.vcService.generarReloj(dto.nodoId, dto.nodos);
    return {
      ok: true,
      ...evento,
      serializado: this.vcService.serializar(evento.clock),
    };
  }

  /**
   * POST /algoritmia/reloj/incrementar
   * Body: { nodoId: "NODO_1", reloj: { "NODO_1": 2, "NODO_2": 1 } }
   *
   * Incrementa el contador local del nodo (llamar antes de cada operación).
   */
  @Post('reloj/incrementar')
  incrementarReloj(@Body() dto: RelojIncrementoDto) {
    const nuevoReloj = this.vcService.incrementar(dto.nodoId, dto.reloj);
    return {
      ok: true,
      nodoId: dto.nodoId,
      relojAnterior: dto.reloj,
      relojActualizado: nuevoReloj,
      serializado: this.vcService.serializar(nuevoReloj),
    };
  }

  /**
   * POST /algoritmia/reloj/combinar
   * Body: { local: {...}, incoming: {...} }
   *
   * Combina el reloj local con el recibido de otro nodo (max componente a componente).
   */
  @Post('reloj/combinar')
  combinarRelojes(@Body() dto: RelojCombinarDto) {
    const combinado = this.vcService.combinar(dto.local, dto.incoming);
    return {
      ok: true,
      relojLocal:    dto.local,
      relojRecibido: dto.incoming,
      relojCombinado: combinado,
      serializado: this.vcService.serializar(combinado),
    };
  }

  /**
   * POST /algoritmia/reloj/comparar
   * Body: { reloj1: {...}, reloj2: {...} }
   *
   * Compara dos relojes vectoriales y retorna la relación causal.
   */
  @Post('reloj/comparar')
  compararRelojes(@Body() dto: RelojCompararDto) {
    const relacion = this.vcService.comparar(dto.reloj1, dto.reloj2);
    const descripciones: Record<string, string> = {
      BEFORE:     'reloj1 ocurre ANTES que reloj2 (reloj2 es más reciente)',
      AFTER:      'reloj1 ocurre DESPUÉS que reloj2 (reloj1 es más reciente)',
      EQUAL:      'Ambos relojes son idénticos',
      CONCURRENT: 'Los eventos son CONCURRENTES — posible conflicto de negocio',
    };
    return {
      ok: true,
      relacion,
      descripcion: descripciones[relacion],
      hayConflicto: relacion === 'CONCURRENT',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELOJES DE LAMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /algoritmia/lamport/generar
   * Body: { nodoId: "NODO_1", valorInicial?: 0 }
   */
  @Post('lamport/generar')
  generarLamport(@Body() dto: LamportGenerarDto) {
    const evento = this.lamportService.generarTimestamp(
      dto.nodoId,
      dto.valorInicial ?? 0,
    );
    return {
      ok: true,
      ...evento,
    };
  }

  /**
   * POST /algoritmia/lamport/incrementar
   * Body: { relojLocal: 5 }
   */
  @Post('lamport/incrementar')
  incrementarLamport(@Body() dto: LamportIncrementoDto) {
    const actualizado = this.lamportService.incrementar(dto.relojLocal);
    return {
      ok: true,
      relojAnterior: dto.relojLocal,
      lamportTimestamp: actualizado,
    };
  }

  /**
   * POST /algoritmia/lamport/combinar
   * Body: { local: 5, incoming: 9 }
   */
  @Post('lamport/combinar')
  combinarLamport(@Body() dto: LamportCombinarDto) {
    const actualizado = this.lamportService.combinar(dto.local, dto.incoming);
    return {
      ok: true,
      local: dto.local,
      incoming: dto.incoming,
      lamportTimestamp: actualizado,
    };
  }

  /**
   * POST /algoritmia/lamport/comparar
   * Body: { eventoA: { nodeId, lamportTimestamp }, eventoB: { ... } }
   */
  @Post('lamport/comparar')
  compararLamport(@Body() dto: LamportCompararDto) {
    const comparacion = this.lamportService.comparar(dto.eventoA, dto.eventoB);
    const descripciones: Record<string, string> = {
      BEFORE: 'eventoA ordena ANTES que eventoB en Lamport',
      AFTER: 'eventoA ordena DESPUES que eventoB en Lamport',
      EQUAL: 'eventoA y eventoB son equivalentes para Lamport',
    };

    return {
      ok: true,
      relation: comparacion.relation,
      descripcion: descripciones[comparacion.relation],
      usedTieBreak: comparacion.usedTieBreak,
      nota:
        comparacion.usedTieBreak
          ? 'Se aplico desempate por nodeId porque el contador Lamport fue igual.'
          : 'No se requirio desempate por nodeId.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLUCIÓN DE CONFLICTOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /algoritmia/conflicto/resolver
   * Body: { eventoA: BookingEvent, eventoB: BookingEvent }
   *
   * Resuelve el conflicto entre dos eventos concurrentes sobre el mismo asiento.
   */
  @Post('conflicto/resolver')
  resolverConflicto(@Body() dto: ConflictoDto) {
    const resultado = this.conflictService.resolverConflicto(dto.eventoA, dto.eventoB);
    return {
      ok: true,
      ...resultado,
    };
  }

  /**
   * GET /algoritmia/conflicto/demo
   *
   * Ejecuta un escenario de conflicto predefinido para demostración.
   * Escenario: NODO_2 reserva y NODO_1 compra el mismo asiento concurrentemente.
   * Resultado esperado: NODO_1 (purchase) gana sobre NODO_2 (reserve).
   */
  @Get('conflicto/demo')
  conflictoDemo() {
    const eventoA = {
      eventId: 'evt-NODO2-001',
      nodeId:  'NODO_2',
      seatId:  'A12',
      action:  'reserve' as const,
      vectorClock: { NODO_1: 2, NODO_2: 5, NODO_3: 1 },
    };
    const eventoB = {
      eventId: 'evt-NODO1-002',
      nodeId:  'NODO_1',
      seatId:  'A12',
      action:  'purchase' as const,
      vectorClock: { NODO_1: 3, NODO_2: 4, NODO_3: 1 }, // concurrente con A
    };
    const resultado = this.conflictService.resolverConflicto(eventoA, eventoB);
    return {
      ok: true,
      escenario: 'NODO_2 reserva vs NODO_1 compra — asiento A12',
      descripcion: 'Los relojes vectoriales indican eventos CONCURRENTES. La política de negocio (purchase > reserve) decide el ganador.',
      ...resultado,
    };
  }
}
