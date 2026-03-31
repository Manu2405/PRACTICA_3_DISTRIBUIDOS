import type { BoardingRecord, Language } from './types';
import { translations } from './i18n';

/**
 * Payload del QR del pase y el campo `barcode.value` del JSON Wallet.
 * Incluye todos los datos clave para que, al escanear, se puedan rellenar
 * automáticamente los campos del pasajero y el vuelo.
 */
export function boardingPassQrValue(record: BoardingRecord): string {
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
    purchaseLocationLabel: record.purchaseLocationLabel ?? null,
  });
}

/**
 * Estructura de referencia para Google Wallet (objeto de vuelo / embarque).
 * En producción: el backend crea un JWT firmado y devuelve el enlace o usa la API REST.
 * @see https://developers.google.com/wallet/tickets/boarding-passes/rest
 */
export function buildGoogleWalletFlightDemoPayload(record: BoardingRecord, lang: Language) {
  const t = translations[lang];
  const qrValue = boardingPassQrValue(record);

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
        value: `BOARDING-${record.flight}-${record.passport}`,
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

export function downloadWalletDemoJson(record: BoardingRecord, lang: Language): void {
  const payload = buildGoogleWalletFlightDemoPayload(record, lang);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sarp-google-wallet-demo-${record.flight.replace(/[^a-z0-9]+/gi, '-')}-${record.seat}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
