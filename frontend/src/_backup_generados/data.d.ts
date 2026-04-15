import type { City, RouteOffer, NodeStatus, Conflict, EventLog, Aircraft, SeatStateType } from './types';
export declare const BRAND: {
    readonly name: "Sistema Aerolíneas Rafael Pabón";
    readonly shortName: "SARP";
    /** Icono en `frontend/public/image.png` */
    readonly iconImage: "/image.png";
};
/** Mapa mundi de referencia: coloca `mapamundi.jpg` en `frontend/public/`. */
export declare const MAP_WORLD_IMAGE = "/mapamundi.jpg";
export declare const cities: City[];
export declare const routeMatrix: Record<string, Record<string, RouteOffer>>;
export declare const aircrafts: Aircraft[];
export declare const nodeStatuses: NodeStatus[];
export declare const conflicts: Conflict[];
export declare const eventLogs: EventLog[];
export declare function getPlaneColumns(model: string): number;
/**
 * Genera una matriz de asientos basada en la capacidad y el número de columnas.
 */
export declare function generateSeatMatrixForPlane(totalSeats: number, columns?: number): string[][];
export declare const seatMatrix: string[][];
/** Azul=libre por defecto; otros según diagrama (Venta=verde, Reserva=amarillo, Devolución=rojo). */
export declare const seatState: Record<string, SeatStateType>;
/** Zonas horarias por código IATA (para UI clara; el backend puede enviar lo mismo). */
export declare const cityTimezones: Record<string, string>;
/** “Estoy comprando desde…” — mock hasta API/CSV de ciudades. */
export declare const purchaseLocations: readonly [{
    readonly code: "BOG";
    readonly label: "Bogotá, Colombia";
}, {
    readonly code: "MAD";
    readonly label: "Madrid, España";
}, {
    readonly code: "MEX";
    readonly label: "Ciudad de México, México";
}, {
    readonly code: "LIM";
    readonly label: "Lima, Perú";
}];
/** Pasaporte mock → nombre (autocompletar en formulario). */
export declare const mockPassengers: Record<string, string>;
/** Copia inicial para estado React (simulación de reservas/compras). */
export declare function initialSeatState(): Record<string, SeatStateType>;
