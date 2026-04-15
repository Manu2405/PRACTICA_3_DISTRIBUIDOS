// src/app.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

type WalletScanPayload = {
  payload?: string;
  boardingPass?: string;
  raw?: string;
  source?: string;
  passport?: string;
  flight?: string;
  seat?: string;
  kind?: string;
};

type ScanEvent = {
  id: number;
  scannedAtUtc: string;
  source: string;
  matched: boolean;
  passport: string | null;
  flight: string | null;
  seat: string | null;
  kind: string | null;
  raw: string;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  private scanCounter = 0;
  private lastScan: ScanEvent | null = null;
  private readonly scanHistory: ScanEvent[] = [];

  /** Raíz: listado de todos los endpoints disponibles */
  @Get()
  root() {
    return {
      ok: true,
      servicio: 'Aviones Distribuidos API',
      version: '2.0',
      modulos: {
        datos:       ['/aeropuertos', '/vuelos', '/vuelos/:id', '/vuelos/:id/asientos'],
        operaciones: ['POST /reservas', 'POST /ventas', 'POST /anulaciones'],
        admin: ['GET /admin/dashboard'],
        algoritmia:  [
          'GET  /algoritmia/ruta?origen=ATL&destino=LON&criterio=price',
          'GET  /algoritmia/ruta/comparar?origen=ATL&destino=LON',
          'GET  /algoritmia/aeropuertos',
          'POST /algoritmia/reloj/generar',
          'POST /algoritmia/reloj/incrementar',
          'POST /algoritmia/reloj/combinar',
          'POST /algoritmia/reloj/comparar',
          'POST /algoritmia/conflicto/resolver',
          'GET  /algoritmia/conflicto/demo',
        ],
        wallet: ['POST /scan', 'GET /scan/status'],
        legacy: ['GET /shortest-path?from=A&to=F  (grafo de ejemplo, compatibilidad)'],
      },
    };
  }

  @Post('scan')
  registerScan(@Body() body: WalletScanPayload) {
    const raw =
      body.payload?.trim() ||
      body.boardingPass?.trim() ||
      body.raw?.trim() ||
      JSON.stringify(body);

    let parsed: Record<string, unknown> | null = null;
    if (raw.startsWith('{')) {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }

    const passport = String((parsed?.passport ?? body.passport ?? '') || '').trim() || null;
    const flight = String((parsed?.flight ?? body.flight ?? '') || '').trim() || null;
    const seat = String((parsed?.seat ?? body.seat ?? '') || '').trim() || null;
    const kind = String((parsed?.kind ?? body.kind ?? '') || '').trim() || null;
    const source = String((parsed?.source ?? body.source ?? 'wallet') || '').trim() || 'wallet';

    const matched = Boolean(
      raw.includes('SARP_BOARDING_PASS') ||
      (passport && flight && seat),
    );

    const event: ScanEvent = {
      id: ++this.scanCounter,
      scannedAtUtc: new Date().toISOString(),
      source,
      matched,
      passport,
      flight,
      seat,
      kind,
      raw,
    };

    this.lastScan = event;
    this.scanHistory.unshift(event);
    this.scanHistory.splice(20);

    return {
      ok: true,
      message: matched ? 'Escaneo registrado correctamente.' : 'Escaneo registrado con datos parciales.',
      scan: event,
      recentScans: this.scanHistory.slice(0, 5),
    };
  }

  @Get('scan/status')
  scanStatus() {
    return {
      ok: true,
      active: true,
      totalScans: this.scanCounter,
      lastScanAtUtc: this.lastScan?.scannedAtUtc ?? null,
      lastMatched: this.lastScan?.matched ?? false,
      lastPassport: this.lastScan?.passport ?? null,
      lastFlight: this.lastScan?.flight ?? null,
      lastSeat: this.lastScan?.seat ?? null,
      lastSource: this.lastScan?.source ?? null,
      lastScan: this.lastScan,
    };
  }

  /**
   * GET /shortest-path?from=A&to=F
   *
   * Endpoint de compatibilidad usando el grafo de ejemplo del AppService.
   * Para rutas reales de aeropuertos usar GET /algoritmia/ruta
   */
  @Get('shortest-path')
  getShortestPath(
    @Query('from') from = 'A',
    @Query('to')   to   = 'F',
  ) {
    return this.appService.computeShortestPath(from, to);
  }
}


