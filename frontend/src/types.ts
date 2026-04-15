export type City = {
  code: string;
  label: string;
  country: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
};

export type FlightStatus = 'On Time' | 'Boarding' | 'En Route' | 'Arrived';

export type Language = 'es' | 'en' | 'pt';

export type RouteOffer = {
  path: string[];
  type: 'Directa' | 'Escala';
  economy: number;
  first: number;
  time: number;
  flight: string;
  airline: string;
  plane: string;
  gate: string;
  departure: string;
  arrival: string;
  status?: FlightStatus;
};

export type NodeStatus = {
  node: string;
  status: string;
  synced: string;
  load: number;
};

export type Conflict = {
  code: string;
  message: string;
  location: string;
  detected: string;
};

export type EventLog = {
  time: string;
  event: string;
  detail: string;
};

export type Aircraft = {
  origin: string;
  manufacturer: string;
  model: string;
  first: number;
  economy: number;
  engines: string;
  length: string;
  wingspan: string;
  rangeKm: string;
  cruise: string;
  rangeNm: string;
  weight: string;
};

/**
 * Estados de asiento (diagrama SARP):
 * Libre (azul) → Reserva (amarillo) o Venta (verde)
 * Reserva → Venta o Devolución (rojo) → tras temporizador → Libre
 * Venta: sin devoluciones en esta simulación.
 */
export type SeatStateType = 'free' | 'reserved' | 'sold' | 'refund';

export type CustomerStep = 1 | 2 | 3 | 4 | 5;

/** Totem de confirmación / pase (mock hasta conectar API). */
export type BoardingRecord = {
  kind: 'reserva' | 'compra';
  passengerName: string;
  passport: string;
  seat: string;
  flight: string;
  origin: string;
  destination: string;
  originLabel: string;
  destinationLabel: string;
  departure: string;
  arrival: string;
  gate: string;
  travelClass: string;
  localIssuedAt: string;
  flightDate: string;
  issuedAtISO: string; // ISO date for time-based logic like cancellation window
  purchaseLocationLabel?: string;
};
