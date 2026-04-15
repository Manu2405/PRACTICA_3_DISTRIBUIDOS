import { translations } from './i18n';
/**
 * Payload del QR del pase y el campo `barcode.value` del JSON Wallet.
 * Incluye todos los datos clave para que, al escanear, se puedan rellenar
 * automáticamente los campos del pasajero y el vuelo.
 */
export function boardingPassQrValue(record) {
    var _a;
    return JSON.stringify({
        type: 'SARP_BOARDING_PASS',
        kind: record.kind,
        passengerName: record.passengerName,
        passport: record.passport,
        seat: record.seat,
        flight: record.flight,
        origin: record.origin,
        originLabel: record.originLabel,
        destination: record.destination,
        destinationLabel: record.destinationLabel,
        departure: record.departure,
        arrival: record.arrival,
        gate: record.gate,
        travelClass: record.travelClass,
        issuedAt: record.localIssuedAt,
        purchaseLocationLabel: (_a = record.purchaseLocationLabel) !== null && _a !== void 0 ? _a : null,
    });
}
/**
 * Estructura de referencia para Google Wallet (objeto de vuelo / embarque).
 * En producción: el backend crea un JWT firmado y devuelve el enlace o usa la API REST.
 * @see https://developers.google.com/wallet/tickets/boarding-passes/rest
 */
export function buildGoogleWalletFlightDemoPayload(record, lang) {
    var t = translations[lang];
    var qrValue = boardingPassQrValue(record);
    return {
        documentation: 'https://developers.google.com/wallet/generic/web/prerequisites',
        note: 'Sustituir issuerId, classId y firmar JWT en backend. Este JSON es solo para alinear campos con Producto/TI.',
        flightObject: {
            id: '%ISSUER_ID%.sarp_flight_sarp_demo',
            classId: '%ISSUER_ID%.sarp_flight_class',
            state: 'ACTIVE',
            heroImage: {
                sourceUri: { uri: 'https://www.gstatic.com/wallet/wallet-icon.png' },
            },
            passengerName: record.passengerName,
            origin: {
                airportIataCode: record.origin,
                terminal: '—',
            },
            destination: {
                airportIataCode: record.destination,
                terminal: '—',
            },
            flightHeader: {
                carrierIataCode: 'S4',
                flightNumber: record.flight.replace(/\s+/g, '').slice(0, 12),
            },
            boardingAndSeatingInfo: {
                gate: record.gate,
                seatNumber: record.seat,
                sequenceNumber: record.passport.slice(0, 8),
            },
            barcode: {
                type: 'QR_CODE',
                value: "BOARDING-".concat(record.flight, "-").concat(record.passport),
                alternateText: record.passport,
            },
            textModulesData: [
                { header: t.document, body: record.passport, id: 'passport' },
                { header: t.class_label, body: record.travelClass, id: 'class' },
                { header: t.departure, body: record.departure, id: 'dep' },
                { header: t.arrival, body: record.arrival, id: 'arr' },
            ],
        },
    };
}
export function downloadWalletDemoJson(record, lang) {
    var payload = buildGoogleWalletFlightDemoPayload(record, lang);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = "sarp-google-wallet-demo-".concat(record.flight.replace(/[^a-z0-9]+/gi, '-'), "-").concat(record.seat, ".json");
    a.click();
    URL.revokeObjectURL(url);
}
