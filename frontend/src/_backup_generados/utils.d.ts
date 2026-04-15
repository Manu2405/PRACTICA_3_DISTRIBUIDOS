import type { RouteOffer, SeatStateType } from './types';
/** Solo para mapa (paso 1): línea directa origen→destino con avión animado. */
export declare function syntheticPreviewRoute(origin: string, destination: string): RouteOffer;
export declare function computeRoutes(origin: string, destination: string): RouteOffer[];
export declare function statusBadgeClass(status: string): string;
export declare function canReserve(state: SeatStateType | undefined): boolean;
export declare function canPurchase(state: SeatStateType | undefined): boolean;
export declare function isSeatSelectable(state: SeatStateType | undefined): boolean;
export declare function formatTimeInTz(date: Date, timeZone: string | undefined): string;
export declare function canRefundFromSale(): boolean;
