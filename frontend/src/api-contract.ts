import type { EventLog, SeatStateType } from './types';

/**
 * Contrato orientativo: sustituir mocks por estos endpoints cuando existan.
 * (Solo tipos; sin fetch aquí.)
 */

export type ApiCity = {
  code: string;
  label: string;
  country: string;
  /** IANA, ej. America/Bogota */
  timezone: string;
  mapX: number;
  mapY: number;
};

export type ApiRouteOffer = {
  path: string[];
  kind: 'Directa' | 'Escala';
  economyUsd: number;
  firstUsd: number;
  durationHours: number;
  flightCodes: string;
  airline: string;
  aircraft: string;
  gate: string;
  departureLocal: string;
  arrivalLocal: string;
};

export type ApiSeatMapCell = {
  id: string;
  state: SeatStateType;
};

export type ApiBookingRequest = {
  flightCodes: string;
  seatId: string;
  passport: string;
  passengerName: string;
  /** Punto de compra / georreferencia declarada */
  purchaseLocationCode: string;
  action: 'reserve' | 'purchase';
};

export type ApiBookingResponse = {
  confirmationId: string;
  seatState: SeatStateType;
};

export type ApiScanRequest = {
  payload?: string;
  boardingPass?: string;
  raw?: string;
  source?: string;
  passport?: string;
  flight?: string;
  seat?: string;
  kind?: string;
};

export type ApiScanEvent = {
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

export type ApiScanResponse = {
  ok: boolean;
  message: string;
  scan: ApiScanEvent;
  recentScans?: ApiScanEvent[];
};

export type ApiScanStatusResponse = {
  ok: boolean;
  active: boolean;
  totalScans: number;
  lastScanAtUtc: string | null;
  lastMatched: boolean;
  lastPassport: string | null;
  lastFlight: string | null;
  lastSeat: string | null;
  lastSource: string | null;
  lastScan: ApiScanEvent | null;
};

export type ApiAdminNode = {
  id: string;
  status: string;
  lastSyncMs: number;
  loadPct: number;
};

export type ApiAdminTableSync = {
  table: 'Asientos' | 'Reservas' | 'Ventas' | 'Anulaciones' | 'AuditoriaAsientos';
  primaryCount: number;
  primaryMinId: number | null;
  primaryMaxId: number | null;
  secondaryCount: number;
  secondaryMinId: number | null;
  secondaryMaxId: number | null;
  deltaCount: number;
  aligned: boolean;
};

export type ApiAdminClassSummary = {
  classCode: string;
  className: string;
  seatsSold: number;
  revenueUsd: number;
};

export type ApiAdminFlightSummary = {
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

export type ApiAdminFleetSummary = {
  model: string;
  economy: number;
  business: number;
  first: number;
  totalCapacity: number;
};

export type ApiAdminDashboardResponse = {
  ok: true;
  generatedAt: string;
  sales: {
    totalRevenueUsd: number;
    firstClassRevenueUsd: number;
    economyRevenueUsd: number;
    totalSales: number;
    totalReservations: number;
    totalAnulaciones: number;
    byClass: ApiAdminClassSummary[];
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
    topRoutes: ApiAdminFlightSummary[];
  };
  sync: {
    secondaryEnabled: boolean;
    secondaryAttempted: boolean;
    alignedTables: number;
    totalTables: number;
    alignmentPct: number;
    tableSnapshots: ApiAdminTableSync[];
    mongo: {
      totalEvents: number;
      successRatePct: number;
      latestEventUtc: string | null;
      latestLamportTimestamp: number | null;
      recentEvents: EventLog[];
    };
  };
  fleet: {
    totalAircraft: number;
    totalCapacity: number;
    models: ApiAdminFleetSummary[];
  };
  passengers: {
    total: number;
    withEmail: number;
    withReservations: number;
    withSales: number;
  };
};
