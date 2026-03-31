import type { City, RouteOffer, NodeStatus, Conflict, EventLog, Aircraft, SeatStateType } from './types';

export const BRAND = {
  name: 'Sistema Aerolíneas Rafael Pabón',
  shortName: 'SARP',
  /** Icono en `frontend/public/image.png` */
  iconImage: '/image.png',
} as const;

/** Mapa mundi de referencia: coloca `mapamundi.jpg` en `frontend/public/`. */
export const MAP_WORLD_IMAGE = '/mapamundi.jpg';

export const cities: City[] = [
  { code: 'ATL', label: 'Atlanta', country: 'USA', x: 27.5, y: 38, lat: 33.6407, lng: -84.4277 },
  { code: 'PEK', label: 'Beijing', country: 'CHN', x: 83.5, y: 32, lat: 40.0799, lng: 116.6031 },
  { code: 'DXB', label: 'Dubai', country: 'ARE', x: 67.5, y: 44, lat: 25.2532, lng: 55.3657 },
  { code: 'TYO', label: 'Tokyo', country: 'JPN', x: 88.5, y: 30, lat: 35.7647, lng: 140.3863 },
  { code: 'LON', label: 'Londres', country: 'GBR', x: 50.5, y: 25, lat: 51.4700, lng: -0.4543 },
  { code: 'LAX', label: 'Los Ángeles', country: 'USA', x: 19.5, y: 35, lat: 33.9416, lng: -118.4085 },
  { code: 'PAR', label: 'París', country: 'FRA', x: 51.5, y: 27, lat: 49.0097, lng: 2.5479 },
  { code: 'FRA', label: 'Fráncfort', country: 'DEU', x: 53.5, y: 26, lat: 50.0379, lng: 8.5622 },
  { code: 'IST', label: 'Estambul', country: 'TUR', x: 58.5, y: 31, lat: 41.2753, lng: 28.7519 },
  { code: 'SIN', label: 'Singapur', country: 'SGP', x: 79.5, y: 58, lat: 1.3644, lng: 103.9915 },
  { code: 'MAD', label: 'Madrid', country: 'ESP', x: 49.5, y: 32, lat: 40.4983, lng: -3.5676 },
  { code: 'AMS', label: 'Ámsterdam', country: 'NLD', x: 52.5, y: 24, lat: 52.3105, lng: 4.7683 },
  { code: 'DFW', label: 'Dallas', country: 'USA', x: 23.5, y: 37, lat: 32.8998, lng: -97.0403 },
  { code: 'CAN', label: 'Cantón', country: 'CHN', x: 82.5, y: 43, lat: 23.3924, lng: 113.2988 },
  { code: 'SAO', label: 'Sao Paulo', country: 'BRA', x: 36.5, y: 70, lat: -23.4356, lng: -46.4731 }
];

export const routeMatrix: Record<string, Record<string, RouteOffer>> = {
  ATL: {
    LAX: { path: ['ATL', 'LAX'], type: 'Directa', economy: 400, first: 540, time: 5, flight: 'AA102', airline: 'American', plane: 'Boeing 777-300ER', gate: 'B12', departure: '08:30', arrival: '13:30', status: 'On Time' },
    LON: { path: ['ATL', 'LON'], type: 'Directa', economy: 1400, first: 945, time: 8, flight: 'DL208', airline: 'Delta', plane: 'Airbus A350-900', gate: 'C21', departure: '10:15', arrival: '18:15', status: 'Boarding' },
    PAR: { path: ['ATL', 'PAR'], type: 'Directa', economy: 800, first: 1013, time: 9, flight: 'AF420', airline: 'Air France', plane: 'Airbus A380-800', gate: 'A05', departure: '11:00', arrival: '20:00', status: 'En Route' },
    FRA: { path: ['ATL', 'FRA'], type: 'Directa', economy: 1500, first: 1215, time: 9, flight: 'LH310', airline: 'Lufthansa', plane: 'Airbus A350-900', gate: 'D07', departure: '07:45', arrival: '17:00', status: 'On Time' }
  },
  LON: {
    PAR: { path: ['LON', 'PAR'], type: 'Directa', economy: 150, first: 203, time: 1, flight: 'BA101', airline: 'British', plane: 'Airbus A380-800', gate: 'C14', departure: '12:20', arrival: '13:20', status: 'On Time' },
    FRA: { path: ['LON', 'FRA'], type: 'Directa', economy: 200, first: 270, time: 1, flight: 'LH204', airline: 'Lufthansa', plane: 'Airbus A350-900', gate: 'B03', departure: '09:10', arrival: '10:10', status: 'Arrived' },
    AMS: { path: ['LON', 'AMS'], type: 'Directa', economy: 150, first: 270, time: 1, flight: 'KL101', airline: 'KLM', plane: 'Boeing 787-9 Dreamliner', gate: 'A11', departure: '14:00', arrival: '15:00', status: 'On Time' }
  },
  FRA: {
    IST: { path: ['FRA', 'IST'], type: 'Directa', economy: 350, first: 473, time: 3, flight: 'TK204', airline: 'Turkish', plane: 'Boeing 787-9 Dreamliner', gate: 'E05', departure: '13:10', arrival: '16:10', status: 'On Time' },
    SIN: { path: ['FRA', 'SIN'], type: 'Directa', economy: 900, first: 1080, time: 12, flight: 'SQ324', airline: 'Singapore', plane: 'Airbus A380-800', gate: 'D18', departure: '20:45', arrival: '12:45+1', status: 'En Route' }
  },
  IST: {
    SIN: { path: ['IST', 'SIN'], type: 'Directa', economy: 1000, first: 1080, time: 10, flight: 'TK72', airline: 'Turkish', plane: 'Airbus A350-900', gate: 'F02', departure: '22:30', arrival: '09:00+1', status: 'On Time' }
  },
  SIN: {
    DXB: { path: ['SIN', 'DXB'], type: 'Directa', economy: 600, first: 810, time: 7, flight: 'EK404', airline: 'Emirates', plane: 'Airbus A380-800', gate: 'G04', departure: '02:10', arrival: '08:10', status: 'Boarding' }
  },
  PEK: {
    TYO: { path: ['PEK', 'TYO'], type: 'Directa', economy: 500, first: 675, time: 3, flight: 'CA180', airline: 'Air China', plane: 'Boeing 787-9 Dreamliner', gate: 'H12', departure: '07:00', arrival: '10:00', status: 'On Time' },
    CAN: { path: ['PEK', 'CAN'], type: 'Directa', economy: 200, first: 270, time: 3, flight: 'CZ342', airline: 'China Southern', plane: 'Airbus A350-900', gate: 'J08', departure: '15:20', arrival: '18:20', status: 'On Time' }
  },
  LAX: {
    DFW: { path: ['LAX', 'DFW'], type: 'Directa', economy: 300, first: 405, time: 3, flight: 'AA356', airline: 'American', plane: 'Boeing 777-300ER', gate: 'K09', departure: '13:00', arrival: '19:00', status: 'On Time' }
  },
  AMS: {
    MAD: { path: ['AMS', 'MAD'], type: 'Directa', economy: 200, first: 270, time: 2, flight: 'KL180', airline: 'KLM', plane: 'Airbus A320neo', gate: 'L05', departure: '11:15', arrival: '13:15', status: 'On Time' }
  },
  DXB: {
    FRA: { path: ['DXB', 'FRA'], type: 'Directa', economy: 400, first: 540, time: 7, flight: 'EK45', airline: 'Emirates', plane: 'Airbus A380-800', gate: 'M02', departure: '09:50', arrival: '15:50', status: 'On Time' }
  },
  CAN: {
    SIN: { path: ['CAN', 'SIN'], type: 'Directa', economy: 500, first: 675, time: 4, flight: 'SQ812', airline: 'Singapore', plane: 'Airbus A350-900', gate: 'N07', departure: '18:40', arrival: '23:00', status: 'On Time' }
  },
  SAO: {
    ATL: { path: ['SAO', 'ATL'], type: 'Directa', economy: 900, first: 1215, time: 9, flight: 'LA708', airline: 'LATAM', plane: 'Airbus A320neo', gate: 'O01', departure: '06:00', arrival: '15:00', status: 'On Time' }
  }
};

export const aircrafts: Aircraft[] = [
  { origin: 'Francia', manufacturer: 'Airbus', model: 'Airbus A380-800', first: 24, economy: 439, engines: '4 turbofán', length: '72.7 m', wingspan: '79.8 m', rangeKm: '15,200', cruise: '900', rangeNm: '8,200', weight: '575,000 kg' },
  { origin: 'USA', manufacturer: 'Boeing', model: 'Boeing 777-300ER', first: 18, economy: 300, engines: '2 turbofán', length: '73.9 m', wingspan: '64.8 m', rangeKm: '13,650', cruise: '905', rangeNm: '7,370', weight: '351,500 kg' },
  { origin: 'USA', manufacturer: 'Boeing', model: 'Boeing 787-9 Dreamliner', first: 16, economy: 220, engines: '2 turbofán', length: '62.8 m', wingspan: '60.1 m', rangeKm: '14,100', cruise: '903', rangeNm: '7,600', weight: '254,000 kg' },
  { origin: 'Francia', manufacturer: 'Airbus', model: 'Airbus A350-900', first: 20, economy: 250, engines: '2 turbofán', length: '66.8 m', wingspan: '64.8 m', rangeKm: '15,000', cruise: '900', rangeNm: '8,100', weight: '280,000 kg' },
  { origin: 'Francia', manufacturer: 'Airbus', model: 'Airbus A321neo', first: 12, economy: 180, engines: '2 turbofán', length: '44.5 m', wingspan: '35.8 m', rangeKm: '7,400', cruise: '833', rangeNm: '4,000', weight: '93,500 kg' },
  { origin: 'USA', manufacturer: 'Boeing', model: 'Boeing 737 MAX 8', first: 12, economy: 160, engines: '2 turbofán', length: '39.5 m', wingspan: '35.9 m', rangeKm: '6,570', cruise: '839', rangeNm: '3,550', weight: '82,190 kg' },
  { origin: 'Brasil', manufacturer: 'Embraer', model: 'Embraer E195-E2', first: 8, economy: 120, engines: '2 turbofán', length: '41.5 m', wingspan: '35.1 m', rangeKm: '4,815', cruise: '820', rangeNm: '2,600', weight: '61,500 kg' },
  { origin: 'Francia', manufacturer: 'Airbus', model: 'Airbus A320neo', first: 12, economy: 150, engines: '2 turbofán', length: '37.5 m', wingspan: '35.8 m', rangeKm: '6,500', cruise: '833', rangeNm: '3,500', weight: '79,000 kg' },
];

export const nodeStatuses: NodeStatus[] = [
  { node: 'Nodo 1', status: 'Sincronizado', synced: '00:00:12', load: 18 },
  { node: 'Nodo 2', status: 'Sincronizado', synced: '00:00:10', load: 21 },
  { node: 'Nodo 3', status: 'Parcial', synced: '00:00:45', load: 34 },
  { node: 'Nodo 4', status: 'Resincronizando', synced: '00:01:20', load: 42 }
];

export const conflicts: Conflict[] = [
  { code: 'CF-001', message: 'Reserva duplicada detectada', location: 'Asiento A45', detected: '19:41' },
  { code: 'CF-002', message: 'Reserva y compra no consistente', location: 'Vuelo EK404', detected: '19:48' },
  { code: 'CF-003', message: 'Liberación tardía del asiento', location: 'Vuelo DL208', detected: '19:52' }
];

export const eventLogs: EventLog[] = [
  { time: '19:40', event: 'Evento de red', detail: 'Nodo 3 perdió sincronía momentáneamente' },
  { time: '19:45', event: 'Reserva confirmada', detail: 'Compra en tiempo real por usuario desde Bogotá' },
  { time: '19:50', event: 'Anulación procesada', detail: 'Asiento liberado para vuelo TK204' },
  { time: '19:55', event: 'Consistencia verificada', detail: 'Todas las bases con 96.4% de coincidencia' }
];

export function getPlaneColumns(model: string): number {
  if (model.includes('A380')) return 10;
  if (model.includes('E195') || model.includes('A318')) return 4;
  return 6;
}

/** 
 * Genera una matriz de asientos basada en la capacidad y el número de columnas.
 */
export function generateSeatMatrixForPlane(totalSeats: number, columns: number = 6): string[][] {
  const rows = Math.ceil(totalSeats / columns);
  const matrix: string[][] = [];
  const chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  for (let r = 1; r <= rows; r++) {
    const rowSeats: string[] = [];
    for (let c = 0; c < columns; c++) {
      rowSeats.push(`${chars[c]}${r}`);
    }
    matrix.push(rowSeats);
  }
  return matrix;
}

export const seatMatrix = generateSeatMatrixForPlane(60);

/** Azul=libre por defecto; otros según diagrama (Venta=verde, Reserva=amarillo, Devolución=rojo). */
export const seatState: Record<string, SeatStateType> = {
  A2: 'sold',
  B1: 'sold',
  C3: 'reserved',
  D5: 'sold',
  F4: 'reserved',
  E6: 'sold',
  B3: 'reserved',
  D2: 'sold',
  /** Ejemplo en devolución temporal (pasará a libre con temporizador simulado). */
  E2: 'refund',
};

/** Zonas horarias por código IATA (para UI clara; el backend puede enviar lo mismo). */
export const cityTimezones: Record<string, string> = {
  ATL: 'America/New_York',
  PEK: 'Asia/Shanghai',
  DXB: 'Asia/Dubai',
  TYO: 'Asia/Tokyo',
  LON: 'Europe/London',
  LAX: 'America/Los_Angeles',
  PAR: 'Europe/Paris',
  FRA: 'Europe/Berlin',
  IST: 'Europe/Istanbul',
  SIN: 'Asia/Singapore',
  MAD: 'Europe/Madrid',
  AMS: 'Europe/Amsterdam',
  DFW: 'America/Chicago',
  CAN: 'Asia/Shanghai',
  SAO: 'America/Sao_Paulo',
  BOG: 'America/Bogota',
  MEX: 'America/Mexico_City',
  LIM: 'America/Lima',
};

/** “Estoy comprando desde…” — mock hasta API/CSV de ciudades. */
export const purchaseLocations = [
  { code: 'BOG', label: 'Bogotá, Colombia' },
  { code: 'MAD', label: 'Madrid, España' },
  { code: 'MEX', label: 'Ciudad de México, México' },
  { code: 'LIM', label: 'Lima, Perú' },
] as const;

/** Pasaporte mock → nombre (autocompletar en formulario). */
export const mockPassengers: Record<string, string> = {
  '42152': 'Juanito Pérez',
  'SARP001': 'María López',
  'SARP-DEMO': 'Pasajero Demo',
};

/** Copia inicial para estado React (simulación de reservas/compras). */
export function initialSeatState(): Record<string, SeatStateType> {
  return { ...seatState };
}
