import type { SeatStateType } from './types';
import type {
  ApiAdminDashboardResponse,
  ApiRouteOffer,
  ApiScanRequest,
  ApiScanResponse,
  ApiScanStatusResponse,
} from './api-contract';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const fetchAeropuertos = async (): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/algoritmia/aeropuertos`);
  const data = await res.json();
  return data.aeropuertos || [];
};

export const fetchRutasBackend = async (
  origen: string,
  destino: string
): Promise<ApiRouteOffer[]> => {
  if (!origen || !destino) return [];

  try {
    const res = await fetch(
      `${API_BASE}/algoritmia/ruta/comparar?origen=${origen}&destino=${destino}`
    );
    const data = await res.json();
    if (!data.ok) return [];

    const routes: ApiRouteOffer[] = [];

    // Ruta óptima por precio
    if (data.porPrecio?.path) {
      const r = data.porPrecio;
      const flightCode = `LB-${origen.slice(0, 2)}${destino.slice(0, 2)}`.toUpperCase();

      routes.push({
        path: r.path,
        kind: r.path.length === 2 ? 'Directa' : 'Escala',
        economyUsd: r.costoUsd,
        firstUsd: r.costoFirstUsd,
        durationHours: r.tiempoHoras >= 0 ? r.tiempoHoras : r.totalValue,
        flightCodes: flightCode + '1',
        airline: 'SARP Airlines',
        aircraft: 'A320 / B737',
        gate: 'G' + ((origen.charCodeAt(0) + destino.charCodeAt(0)) % 20 + 1),
        departureLocal: '08:00',
        arrivalLocal: `${8 + (r.tiempoHoras >= 0 ? r.tiempoHoras : 10)}:00`,
      });
    }

    // Ruta óptima por tiempo
    if (data.porTiempo?.path && !data.sonIguales) {
      const r = data.porTiempo;
      const flightCode = `LB-${origen.slice(0, 2)}${destino.slice(0, 2)}`.toUpperCase();

      routes.push({
        path: r.path,
        kind: r.path.length === 2 ? 'Directa' : 'Escala',
        economyUsd: r.costoUsd >= 0 ? r.costoUsd : r.totalValue,
        firstUsd: r.costoFirstUsd,
        durationHours: r.tiempoHoras,
        flightCodes: flightCode + '2',
        airline: 'SARP Airlines',
        aircraft: 'B777 / A350',
        gate: 'G' + ((origen.charCodeAt(0) + destino.charCodeAt(1)) % 20 + 1),
        departureLocal: '14:00',
        arrivalLocal: `${14 + r.tiempoHoras}:00`,
      });
    }

    return routes;
  } catch (err) {
    console.error('Error fetching routes', err);
    return [];
  }
};

export const postVectorClock = async (nodeId: string) => {
  const res = await fetch(`${API_BASE}/algoritmia/reloj/generar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodoId: nodeId }),
  });

  return await res.json();
};

export const postScan = async (payload: ApiScanRequest): Promise<ApiScanResponse> => {
  const res = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as ApiScanResponse;
  return data;
};

export const fetchScanStatus = async (): Promise<ApiScanStatusResponse | null> => {
  try {
    const res = await fetch(`${API_BASE}/scan/status`);
    const data = (await res.json()) as ApiScanStatusResponse;
    if (!res.ok || !data?.ok) {
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error fetching scan status', err);
    return null;
  }
};

export const fetchAdminDashboard = async (): Promise<ApiAdminDashboardResponse | null> => {
  try {
    const res = await fetch(`${API_BASE}/admin/dashboard`);
    const data = (await res.json()) as ApiAdminDashboardResponse;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching admin dashboard', err);
    return null;
  }
};

function normalizeSeatVariants(code: string): string[] {
  const cleaned = code.trim().toUpperCase().replace(/[\s_-]+/g, '');
  const byRowThenCol = cleaned.match(/^0*(\d+)([A-Z])$/);
  const byColThenRow = cleaned.match(/^([A-Z])0*(\d+)$/);

  if (byRowThenCol) {
    const row = String(Number(byRowThenCol[1]));
    const col = byRowThenCol[2];
    return [`${row}${col}`, `${col}${row}`];
  }

  if (byColThenRow) {
    const col = byColThenRow[1];
    const row = String(Number(byColThenRow[2]));
    return [`${col}${row}`, `${row}${col}`];
  }

  return [cleaned];
}

export const fetchAsientos = async (vueloId: number = 1) => {
  try {
    const res = await fetch(`${API_BASE}/vuelos/${vueloId}/asientos`);
    const data = await res.json();

    const asntObj: Record<string, any> = {};
    const seats = Array.isArray(data) ? data : Array.isArray(data.asientos) ? data.asientos : [];

    seats.forEach((a: any) => {
      const estadoStr =
        a.estado === 'LIBRE'
          ? 'free'
          : a.estado === 'RESERVADO'
            ? 'reserved'
            : a.estado === 'VENDIDO'
              ? 'sold'
              : a.estado === 'DEVOLUCION'
                ? 'refund'
                : 'free';

      const variants = normalizeSeatVariants(a.numero);

      for (const variant of variants) {
        asntObj[variant] = estadoStr as SeatStateType;
        asntObj[`_db_id_${variant}`] = a.id;
      }
    });

    console.log('fetchAsientos -> mapeo', asntObj);
    return asntObj;
  } catch (err) {
    console.error('Error fetching seats', err);
    return {};
  }
};

export const postOperacion = async (
  endpoint: 'reservas' | 'ventas' | 'anulaciones',
  payload: any
) => {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  console.log(`postOperacion -> ${endpoint}`, {
    status: res.status,
    ok: res.ok,
    payload,
    data,
  });

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
};
