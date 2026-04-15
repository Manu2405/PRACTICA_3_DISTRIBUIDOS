import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CSV_PATH = path.resolve(process.cwd(), '../flights.csv');
const CSV_PATH = path.resolve(
  process.cwd(),
  process.env.FLIGHTS_CSV_PATH?.trim() || process.argv[2]?.trim() || DEFAULT_CSV_PATH,
);
const IMPORT_SEATS_THRESHOLD = Number(process.env.IMPORT_SEATS_THRESHOLD ?? 2000);
const FORCE_SEATS = process.env.IMPORT_SEATS === '1';
const DISABLE_SEATS = process.env.IMPORT_SEATS === '0';

type RawCsvRow = Record<string, string>;

type NormalizedFlightRow = {
  flightDate: string;
  flightTime: string;
  origin: string;
  destination: string;
  aircraftId: number;
  status: string;
  gate: string;
};

const COLUMN_ALIASES: Record<keyof NormalizedFlightRow, string[]> = {
  flightDate: ['flight_date', 'flightdate', 'date', 'departure_date', 'fecha_vuelo'],
  flightTime: ['flight_time', 'flighttime', 'time', 'departure_time', 'hora_vuelo'],
  origin: ['origin', 'from', 'source', 'origin_code', 'origin_airport', 'origin_iata'],
  destination: ['destination', 'to', 'target', 'destination_code', 'destination_airport', 'destination_iata'],
  aircraftId: ['aircraft_id', 'aircraftid', 'aircraft', 'aircraft_code', 'aircraft_number', 'aircraft_no'],
  status: ['status', 'flight_status', 'state', 'flight_state'],
  gate: ['gate', 'boarding_gate', 'puerta'],
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, '').trim());
}

function parseCsv(content: string): RawCsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map(normalizeKey);

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: RawCsvRow = {};

    headers.forEach((header, index) => {
      if (!header) {
        return;
      }

      row[header] = cols[index] ?? '';
    });

    return row;
  });
}

function pickField(row: RawCsvRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function normalizeStatus(rawStatus: string): string {
  const status = rawStatus.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');

  const map: Record<string, string> = {
    ARRIVED: 'LANDED',
    LANDED: 'LANDED',
    DEPARTED: 'DEPARTED',
    DEPARTURE: 'DEPARTED',
    AIRBORNE: 'ENROUTE',
    ENROUTE: 'ENROUTE',
    INFLIGHT: 'ENROUTE',
    INTRANSIT: 'ENROUTE',
    BOARDING: 'BOARDING',
    SCHEDULED: 'SCHEDULED',
    ONTIME: 'SCHEDULED',
    DELAYED: 'DELAYED',
    CANCELLED: 'CANCELLED',
    CANCELED: 'CANCELLED',
  };

  return map[status] ?? (status || 'SCHEDULED');
}

function isActiveFlight(status: string): boolean {
  return !['LANDED', 'CANCELLED'].includes(status);
}

function mapAircraftFleetIdToModel(fleetId: number): string {
  if (fleetId >= 1 && fleetId <= 6) return 'Airbus A380-800';
  if (fleetId >= 7 && fleetId <= 24) return 'Boeing 777-300ER';
  if (fleetId >= 25 && fleetId <= 35) return 'Airbus A350-900';
  return 'Boeing 787-9 Dreamliner';
}

function parseDateTimeUtc(dateStr: string, timeStr: string): Date {
  const date = dateStr.trim();
  const time = timeStr.trim();

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) {
    throw new Error(`Formato de hora no soportado: ${timeStr}`);
  }

  const hh = Number(timeMatch[1]);
  const min = Number(timeMatch[2]);
  const sec = Number(timeMatch[3] ?? '0');

  if (hh > 23 || min > 59 || sec > 59) {
    throw new Error(`Formato de hora no soportado: ${timeStr}`);
  }

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const usMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  const euMatch = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (usMatch) {
    month = Number(usMatch[1]);
    day = Number(usMatch[2]);
    year = Number(usMatch[3]);
  } else if (euMatch) {
    day = Number(euMatch[1]);
    month = Number(euMatch[2]);
    year = Number(euMatch[3]);
  } else {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Formato de fecha no soportado: ${dateStr}`);
    }

    return new Date(Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      hh,
      min,
      sec,
    ));
  }

  if (year < 100) {
    year += 2000;
  }

  const parsedUtc = new Date(Date.UTC(year, month - 1, day, hh, min, sec));
  if (
    parsedUtc.getUTCFullYear() !== year ||
    parsedUtc.getUTCMonth() !== month - 1 ||
    parsedUtc.getUTCDate() !== day
  ) {
    throw new Error(`Fecha no válida: ${dateStr}`);
  }

  return parsedUtc;
}

async function ensureBaseData() {
  const airportSeeds = [
    ['ATL', 'Atlanta', 'USA'],
    ['PEK', 'Beijing', 'CHN'],
    ['DXB', 'Dubai', 'ARE'],
    ['TYO', 'Tokyo', 'JPN'],
    ['LON', 'London', 'GBR'],
    ['LAX', 'Los Angeles', 'USA'],
    ['PAR', 'Paris', 'FRA'],
    ['FRA', 'Frankfurt', 'DEU'],
    ['IST', 'Istanbul', 'TUR'],
    ['SIN', 'Singapore', 'SGP'],
    ['MAD', 'Madrid', 'ESP'],
    ['AMS', 'Amsterdam', 'NLD'],
    ['DFW', 'Dallas', 'USA'],
    ['CAN', 'Guangzhou', 'CHN'],
    ['SAO', 'Sao Paulo', 'BRA'],
  ];

  for (const [codigo, ciudad, pais] of airportSeeds) {
    await prisma.aeropuerto.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nombre: `${ciudad} Airport`,
        ciudad,
        pais,
      },
    });
  }

  const aircraftSeeds = [
    { modelo: 'Airbus A380-800', capacidadEco: 439, capacidadBus: 0, capacidadPri: 10 },
    { modelo: 'Boeing 777-300ER', capacidadEco: 300, capacidadBus: 0, capacidadPri: 10 },
    { modelo: 'Airbus A350-900', capacidadEco: 250, capacidadBus: 0, capacidadPri: 12 },
    { modelo: 'Boeing 787-9 Dreamliner', capacidadEco: 220, capacidadBus: 0, capacidadPri: 8 },
  ];

  for (const aeronave of aircraftSeeds) {
    await prisma.aeronave.upsert({
      where: { modelo: aeronave.modelo },
      update: {},
      create: aeronave,
    });
  }

  const classes = [
    { codigo: 'ECO', nombre: 'Económica', multiplicador: 1.0 },
    { codigo: 'BUS', nombre: 'Business', multiplicador: 1.5 },
    { codigo: 'PRI', nombre: 'Primera', multiplicador: 1.8 },
  ];

  for (const clase of classes) {
    await prisma.claseTarifaria.upsert({
      where: { codigo: clase.codigo },
      update: {},
      create: clase,
    });
  }

  await prisma.pasajero.upsert({
    where: { documento: '42152' },
    update: {},
    create: {
      nombre: 'Juanito',
      apellido: 'Perez',
      documento: '42152',
      email: 'juanito@example.com',
    },
  });
}

function buildSeatCodes(total: number, columns: string[]): string[] {
  const seats: string[] = [];
  let row = 1;

  while (seats.length < total) {
    for (const col of columns) {
      if (seats.length >= total) {
        break;
      }
      seats.push(`${row}${col}`);
    }
    row++;
  }

  return seats;
}

async function createSeatsForFlight(vueloId: number, aeronaveId: number) {
  const existing = await prisma.asiento.count({ where: { vueloId } });
  if (existing > 0) {
    return;
  }

  const aeronave = await prisma.aeronave.findUnique({ where: { id: aeronaveId } });
  if (!aeronave) {
    return;
  }

  const ecoClass = await prisma.claseTarifaria.findUnique({ where: { codigo: 'ECO' } });
  const priClass = await prisma.claseTarifaria.findUnique({ where: { codigo: 'PRI' } });

  if (!ecoClass || !priClass) {
    return;
  }

  const priSeats = buildSeatCodes(aeronave.capacidadPri, ['A', 'B', 'C', 'D']);
  const ecoSeats = buildSeatCodes(aeronave.capacidadEco, ['A', 'B', 'C', 'D', 'E', 'F']).map(
    (_seatCode, index) => {
      const rowNum = Math.floor(index / 6) + 1 + Math.ceil(aeronave.capacidadPri / 4);
      const col = ['A', 'B', 'C', 'D', 'E', 'F'][index % 6];
      return `${rowNum}${col}`;
    },
  );

  const data = [
    ...priSeats.map((numero) => ({
      vueloId,
      claseId: priClass.id,
      numero,
      estado: 'LIBRE' as const,
    })),
    ...ecoSeats.map((numero) => ({
      vueloId,
      claseId: ecoClass.id,
      numero,
      estado: 'LIBRE' as const,
    })),
  ];

  await prisma.asiento.createMany({ data });
}

function normalizeFlightRow(row: RawCsvRow): NormalizedFlightRow | null {
  const flightDate = pickField(row, COLUMN_ALIASES.flightDate);
  const flightTime = pickField(row, COLUMN_ALIASES.flightTime);
  const origin = pickField(row, COLUMN_ALIASES.origin).toUpperCase();
  const destination = pickField(row, COLUMN_ALIASES.destination).toUpperCase();
  const aircraftIdRaw = pickField(row, COLUMN_ALIASES.aircraftId);
  const statusRaw = pickField(row, COLUMN_ALIASES.status);
  const gate = pickField(row, COLUMN_ALIASES.gate).toUpperCase();

  if (!flightDate || !flightTime || !origin || !destination || !aircraftIdRaw) {
    return null;
  }

  const aircraftId = Number(aircraftIdRaw);
  if (!Number.isFinite(aircraftId) || aircraftId <= 0) {
    return null;
  }

  return {
    flightDate,
    flightTime,
    origin,
    destination,
    aircraftId,
    status: normalizeStatus(statusRaw),
    gate,
  };
}

async function main() {
  await ensureBaseData();

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const parsedRows = parseCsv(raw);
  const rows = parsedRows
    .map(normalizeFlightRow)
    .filter((row): row is NormalizedFlightRow => Boolean(row));

  const airports = await prisma.aeropuerto.findMany();
  const airportByCode = new Map(airports.map((airport) => [airport.codigo, airport]));

  const aircraft = await prisma.aeronave.findMany();
  const aircraftByModel = new Map(aircraft.map((item) => [item.modelo, item]));

  const shouldGenerateSeats = FORCE_SEATS || (!DISABLE_SEATS && rows.length <= IMPORT_SEATS_THRESHOLD);

  let imported = 0;
  let skippedMissingAirport = 0;
  let skippedSameRoute = 0;
  let skippedMissingAircraft = 0;
  let skippedInvalidDate = 0;
  const missingAirportSamples: string[] = [];
  const completedStatuses = new Map<string, number>();

  if (!shouldGenerateSeats) {
    const chunkSize = 1000;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      const vueloData = [] as Array<{
        numeroVuelo: string;
        origenId: number;
        destinoId: number;
        aeronaveId: number;
        salidaUtc: Date;
        llegadaUtc: Date;
        precioBaseUsd: number;
        activo: boolean;
      }>;

      for (const row of chunk) {
        const origin = airportByCode.get(row.origin);
        const destination = airportByCode.get(row.destination);
        const aeronave = aircraftByModel.get(mapAircraftFleetIdToModel(row.aircraftId));

        if (!origin || !destination) {
          skippedMissingAirport++;
          if (missingAirportSamples.length < 10) {
            missingAirportSamples.push(`${row.origin} -> ${row.destination}`);
          }
          continue;
        }

        if (origin.codigo === destination.codigo) {
          skippedSameRoute++;
          continue;
        }

        if (!aeronave) {
          skippedMissingAircraft++;
          continue;
        }

        let salidaUtc: Date;
        try {
          salidaUtc = parseDateTimeUtc(row.flightDate, row.flightTime);
        } catch {
          skippedInvalidDate++;
          continue;
        }

        completedStatuses.set(row.status, (completedStatuses.get(row.status) ?? 0) + 1);

        vueloData.push({
          numeroVuelo: `FL-${String(imported + vueloData.length + 1).padStart(5, '0')}`,
          origenId: origin.id,
          destinoId: destination.id,
          aeronaveId: aeronave.id,
          salidaUtc,
          llegadaUtc: new Date(salidaUtc.getTime() + 2 * 60 * 60 * 1000),
          precioBaseUsd: 300,
          activo: isActiveFlight(row.status),
        });
      }

      if (vueloData.length > 0) {
        await prisma.vuelo.createMany({ data: vueloData });
        imported += vueloData.length;
      }
    }
  } else {
    for (const row of rows) {
      const origin = airportByCode.get(row.origin);
      const destination = airportByCode.get(row.destination);

      if (!origin || !destination) {
        skippedMissingAirport++;
        if (missingAirportSamples.length < 10) {
          missingAirportSamples.push(`${row.origin} -> ${row.destination}`);
        }
        continue;
      }

      if (origin.codigo === destination.codigo) {
        skippedSameRoute++;
        continue;
      }

      const aeronave = aircraftByModel.get(mapAircraftFleetIdToModel(row.aircraftId));
      if (!aeronave) {
        skippedMissingAircraft++;
        continue;
      }

      let salidaUtc: Date;
      try {
        salidaUtc = parseDateTimeUtc(row.flightDate, row.flightTime);
      } catch {
        skippedInvalidDate++;
        continue;
      }

      const numeroVuelo = `FL-${String(imported + 1).padStart(5, '0')}`;
      const vuelo = await prisma.vuelo.create({
        data: {
          numeroVuelo,
          origenId: origin.id,
          destinoId: destination.id,
          aeronaveId: aeronave.id,
          salidaUtc,
          llegadaUtc: new Date(salidaUtc.getTime() + 2 * 60 * 60 * 1000),
          precioBaseUsd: 300,
          activo: isActiveFlight(row.status),
        },
      });

      completedStatuses.set(row.status, (completedStatuses.get(row.status) ?? 0) + 1);
      await createSeatsForFlight(vuelo.id, aeronave.id);
      imported++;
    }
  }

  console.log(`✓ Se procesaron ${rows.length} vuelos normalizados desde ${path.basename(CSV_PATH)}.`);
  console.log(`  Importados: ${imported}`);
  console.log(
    `  Estados normalizados: ${Array.from(completedStatuses.entries())
      .map(([key, value]) => `${key}:${value}`)
      .join(', ') || 'ninguno'}`,
  );
  console.log(`  Omitidos por aeropuerto o ruta inexistente: ${skippedMissingAirport}`);
  console.log(`  Omitidos por misma ruta origen/destino: ${skippedSameRoute}`);
  console.log(`  Omitidos por aeronave no mapeada: ${skippedMissingAircraft}`);
  console.log(`  Omitidos por fecha/hora invalida: ${skippedInvalidDate}`);

  if (missingAirportSamples.length > 0) {
    console.log(`  Ejemplos de rutas o aeropuertos faltantes: ${missingAirportSamples.join(' | ')}`);
  }

  if (!shouldGenerateSeats) {
    console.log(
      `  Generacion de asientos omitida por volumen (${rows.length} filas > ${IMPORT_SEATS_THRESHOLD}). Usa IMPORT_SEATS=1 si quieres forzarla.`,
    );
  } else {
    console.log('  Asientos generados para cada vuelo importado.');
  }
}

main()
  .catch((e) => {
    console.error('Error importando vuelos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
