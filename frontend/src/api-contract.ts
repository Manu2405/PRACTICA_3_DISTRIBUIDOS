import type { SeatStateType } from './types';

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

export type ApiAdminNode = {
  id: string;
  status: string;
  lastSyncMs: number;
  loadPct: number;
};
