import type { RouteOffer, SeatStateType } from './types';
import { routeMatrix, aircrafts } from './data';

const ROUTE_HUBS = ['LON', 'ATL', 'FRA', 'DXB', 'SIN', 'MAD', 'AMS', 'IST', 'PEK', 'CAN'];

function getRandomPlane(exclude?: string) {
  if (!aircrafts || aircrafts.length === 0) return 'Airbus A320neo';
  let p = aircrafts[Math.floor(Math.random() * aircrafts.length)].model;
  if (exclude && aircrafts.length > 1) {
    while (p === exclude) p = aircrafts[Math.floor(Math.random() * aircrafts.length)].model;
  }
  return p;
}

/** Solo para mapa (paso 1): línea directa origen→destino con avión animado. */
export function syntheticPreviewRoute(origin: string, destination: string): RouteOffer {
  return {
    path: [origin, destination],
    type: 'Directa',
    economy: 0,
    first: 0,
    time: 0,
    flight: '—',
    airline: 'SARP',
    plane: '—',
    gate: '—',
    departure: '—',
    arrival: '—',
  };
}

function mergeHubLegs(origin: string, hub: string, destination: string, leg1: RouteOffer, leg2: RouteOffer): RouteOffer {
  const p1 = getRandomPlane();
  const p2 = getRandomPlane(p1);
  return {
    path: [origin, hub, destination],
    type: 'Escala',
    economy: leg1.economy + leg2.economy,
    first: leg1.first + leg2.first,
    time: leg1.time + leg2.time + 1,
    flight: `${leg1.flight} + ${leg2.flight}`,
    airline: `${leg1.airline} / ${leg2.airline}`,
    plane: `${p1} / ${p2}`,
    gate: `${leg1.gate} / ${leg2.gate}`,
    departure: leg1.departure,
    arrival: leg2.arrival,
  };
}

function syntheticFallbackRoute(origin: string, destination: string): RouteOffer {
  const seed = (origin.codePointAt(0) ?? 0) + (destination.codePointAt(0) ?? 0);
  const depH = 8 + (seed % 5);
  const depM = (seed % 4) * 15;
  const arrH = 15 + (seed % 6);
  const arrM = (seed % 4) * 15;
  return {
    path: [origin, destination],
    type: 'Directa',
    economy: 380 + (seed % 420),
    first: 720 + (seed % 300),
    time: 5 + (seed % 6),
    flight: `SARP-${origin}${destination}`,
    airline: 'Sistema Aerolíneas Rafael Pabón',
    plane: getRandomPlane(),
    gate: `G${(seed % 9) + 1}`,
    departure: `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`,
    arrival: `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`,
  };
}

export function computeRoutes(origin: string, destination: string): RouteOffer[] {
  if (origin === destination) return [];

  const options: RouteOffer[] = [];
  const direct = routeMatrix[origin]?.[destination];
  if (direct) options.push({ ...direct, plane: getRandomPlane() });

  const originRoutes = routeMatrix[origin] ?? {};
  Object.keys(originRoutes).forEach((stop) => {
    if (stop === destination) return;
    const firstLeg = originRoutes[stop];
    const secondLeg = routeMatrix[stop]?.[destination];
    if (firstLeg && secondLeg) {
      options.push({
        path: [origin, stop, destination],
        type: 'Escala',
        economy: firstLeg.economy + secondLeg.economy,
        first: firstLeg.first + secondLeg.first,
        time: firstLeg.time + secondLeg.time + 1,
        flight: `${firstLeg.flight} + ${secondLeg.flight}`,
        airline: `${firstLeg.airline} / ${secondLeg.airline}`,
        plane: `${getRandomPlane()} / ${getRandomPlane()}`,
        gate: `${firstLeg.gate} / ${secondLeg.gate}`,
        departure: firstLeg.departure,
        arrival: secondLeg.arrival,
      });
    }
  });

  if (options.length === 0) {
    for (const hub of ROUTE_HUBS) {
      if (hub === origin || hub === destination) continue;
      const leg1 = routeMatrix[origin]?.[hub];
      const leg2 = routeMatrix[hub]?.[destination];
      if (leg1 && leg2) {
        options.push(mergeHubLegs(origin, hub, destination, leg1, leg2));
      }
    }
  }

  if (options.length === 0) {
    options.push(syntheticFallbackRoute(origin, destination));
  }

  // Generar datos adicionales ("inserta varios datos para que pueda elegir")
  if (options.length < 5) {
    const base = syntheticFallbackRoute(origin, destination);
    options.push({
      ...base,
      type: 'Directa',
      economy: Math.max(150, base.economy - 95),
      time: base.time + 1,
      plane: getRandomPlane(),
      flight: `SARP-PROM-${origin}${destination}`
    });
    options.push({
      ...base,
      type: 'Escala',
      economy: base.economy - 140,
      first: base.first - 50,
      time: base.time + 5,
      plane: getRandomPlane(),
      path: [origin, ROUTE_HUBS[Math.floor(Math.random() * ROUTE_HUBS.length)], destination],
      flight: `SARP-ESC1`
    });
    options.push({
      ...base,
      type: 'Directa',
      economy: base.economy + 160,
      time: Math.max(1, base.time - 2),
      plane: getRandomPlane(),
      flight: `SARP-FAST-${origin}${destination}`
    });
  }

  return options.sort((a, b) => a.economy - b.economy);
}

export function statusBadgeClass(status: string): string {
  if (status === 'Sincronizado') return 'bg-emerald-500';
  if (status === 'Parcial') return 'bg-amber-500';
  return 'bg-sky-500';
}

export function canReserve(state: SeatStateType | undefined): boolean {
  return (state ?? 'free') === 'free';
}

export function canPurchase(state: SeatStateType | undefined): boolean {
  const s = state ?? 'free';
  return s === 'free' || s === 'reserved';
}

export function isSeatSelectable(state: SeatStateType | undefined): boolean {
  return canReserve(state);
}

export function formatTimeInTz(date: Date, timeZone: string | undefined): string {
  if (!timeZone) {
    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  }
  return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone });
}

export function canRefundFromSale(): boolean {
  return false;
}
