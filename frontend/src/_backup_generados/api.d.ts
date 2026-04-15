import type { SeatStateType } from './types';
import type { ApiRouteOffer } from './api-contract';
export declare const fetchAeropuertos: () => Promise<string[]>;
export declare const fetchRutasBackend: (origen: string, destino: string) => Promise<ApiRouteOffer[]>;
export declare const postVectorClock: (nodeId: string) => Promise<any>;
export declare const fetchAsientos: (vueloId?: number) => Promise<Record<string, SeatStateType>>;
export declare const postOperacion: (endpoint: "reservas" | "ventas" | "anulaciones", payload: any) => Promise<any>;
