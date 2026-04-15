import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const TABLES_IN_DEPENDENCY_ORDER = [
  'AuditoriaAsientos',
  'Anulaciones',
  'Ventas',
  'Reservas',
  'Asientos',
  'Vuelos',
  'Pasajeros',
  'Aeronaves',
  'ClasesTarifarias',
  'Aeropuertos',
] as const;

async function main() {
  const secondaryUrl = process.env.SECONDARY_DATABASE_URL?.trim();
  if (!secondaryUrl) {
    throw new Error('SECONDARY_DATABASE_URL is required for db:reset-secondary');
  }

  const client = new PrismaClient({
    datasources: {
      db: { url: secondaryUrl },
    },
  });

  try {
    await client.$connect();

    for (const table of TABLES_IN_DEPENDENCY_ORDER) {
      await client.$executeRawUnsafe(`DELETE FROM [${table}]`);
    }

    for (const table of TABLES_IN_DEPENDENCY_ORDER) {
      await client.$executeRawUnsafe(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
    }

    console.log('Secondary SQL cleaned and identity reseeded successfully.');
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
