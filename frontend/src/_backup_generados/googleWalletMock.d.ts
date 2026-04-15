import type { BoardingRecord, Language } from './types';
/**
 * Payload del QR del pase y el campo `barcode.value` del JSON Wallet.
 * Incluye todos los datos clave para que, al escanear, se puedan rellenar
 * automáticamente los campos del pasajero y el vuelo.
 */
export declare function boardingPassQrValue(record: BoardingRecord): string;
/**
 * Estructura de referencia para Google Wallet (objeto de vuelo / embarque).
 * En producción: el backend crea un JWT firmado y devuelve el enlace o usa la API REST.
 * @see https://developers.google.com/wallet/tickets/boarding-passes/rest
 */
export declare function buildGoogleWalletFlightDemoPayload(record: BoardingRecord, lang: Language): {
    documentation: string;
    note: string;
    flightObject: {
        id: string;
        classId: string;
        state: string;
        heroImage: {
            sourceUri: {
                uri: string;
            };
        };
        passengerName: string;
        origin: {
            airportIataCode: string;
            terminal: string;
        };
        destination: {
            airportIataCode: string;
            terminal: string;
        };
        flightHeader: {
            carrierIataCode: string;
            flightNumber: string;
        };
        boardingAndSeatingInfo: {
            gate: string;
            seatNumber: string;
            sequenceNumber: string;
        };
        barcode: {
            type: string;
            value: string;
            alternateText: string;
        };
        textModulesData: {
            header: string;
            body: string;
            id: string;
        }[];
    };
};
export declare function downloadWalletDemoJson(record: BoardingRecord, lang: Language): void;
