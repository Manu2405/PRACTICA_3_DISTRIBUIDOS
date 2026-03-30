// src/prisma/seed.ts
// Ejecutar con: npx ts-node src/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Insertando datos iniciales...');

  // Clases tarifarias
  await prisma.claseTarifaria.upsert({
    where: { codigo: 'ECO' },
    update: {},
    create: { codigo: 'ECO', nombre: 'Económica',  multiplicador: 1.00 },
  });
  await prisma.claseTarifaria.upsert({
    where: { codigo: 'BUS' },
    update: {},
    create: { codigo: 'BUS', nombre: 'Business',   multiplicador: 2.50 },
  });
  await prisma.claseTarifaria.upsert({
    where: { codigo: 'PRI' },
    update: {},
    create: { codigo: 'PRI', nombre: 'Primera',    multiplicador: 4.00 },
  });

  // Aeropuertos
  const aeropuertos = [
    { codigo: 'LPB', nombre: 'Aeropuerto Internacional El Alto',              ciudad: 'La Paz',       pais: 'Bolivia' },
    { codigo: 'VVI', nombre: 'Aeropuerto Internacional Viru Viru',             ciudad: 'Santa Cruz',   pais: 'Bolivia' },
    { codigo: 'CBB', nombre: 'Aeropuerto Internacional Jorge Wilstermann',     ciudad: 'Cochabamba',   pais: 'Bolivia' },
    { codigo: 'TJA', nombre: 'Aeropuerto Capitán Oriel Lea Plaza',             ciudad: 'Tarija',       pais: 'Bolivia' },
    { codigo: 'SRE', nombre: 'Aeropuerto Juana Azurduy de Padilla',            ciudad: 'Sucre',        pais: 'Bolivia' },
  ];

  for (const a of aeropuertos) {
    await prisma.aeropuerto.upsert({
      where: { codigo: a.codigo },
      update: {},
      create: a,
    });
  }

  // Aeronaves
  const aeronave1 = await prisma.aeronave.create({
    data: { modelo: 'Boeing 737-800', capacidadEco: 120, capacidadBus: 20, capacidadPri: 8 },
  });
  const aeronave2 = await prisma.aeronave.create({
    data: { modelo: 'Airbus A320',    capacidadEco: 126, capacidadBus: 16, capacidadPri: 0 },
  });

  // Aeropuertos ya creados
  const lpb = await prisma.aeropuerto.findUniqueOrThrow({ where: { codigo: 'LPB' } });
  const vvi = await prisma.aeropuerto.findUniqueOrThrow({ where: { codigo: 'VVI' } });
  const cbb = await prisma.aeropuerto.findUniqueOrThrow({ where: { codigo: 'CBB' } });

  const ecoClase = await prisma.claseTarifaria.findUniqueOrThrow({ where: { codigo: 'ECO' } });
  const busClase = await prisma.claseTarifaria.findUniqueOrThrow({ where: { codigo: 'BUS' } });

  // Vuelo 1: LPB → VVI
  const vuelo1 = await prisma.vuelo.create({
    data: {
      numeroVuelo:  'AV101',
      origenId:     lpb.id,
      destinoId:    vvi.id,
      aeronaveId:   aeronave1.id,
      salidaUtc:    new Date('2025-08-01T10:00:00Z'),
      llegadaUtc:   new Date('2025-08-01T11:30:00Z'),
      precioBaseUsd: 150.00,
    },
  });

  // Generar asientos para vuelo 1
  const asientosV1: any[] = [];
  const letras = ['A','B','C','D','E','F'];
  for (let fila = 1; fila <= 4; fila++) {   // 4 filas primera
    for (const l of ['A','B','C']) {
      asientosV1.push({ vueloId: vuelo1.id, claseId: busClase.id, numero: `${fila}${l}` });
    }
  }
  for (let fila = 10; fila <= 29; fila++) {  // 20 filas eco
    for (const l of letras) {
      asientosV1.push({ vueloId: vuelo1.id, claseId: ecoClase.id, numero: `${fila}${l}` });
    }
  }
  await prisma.asiento.createMany({ data: asientosV1 });

  // Vuelo 2: VVI → LPB
  const vuelo2 = await prisma.vuelo.create({
    data: {
      numeroVuelo:  'AV102',
      origenId:     vvi.id,
      destinoId:    lpb.id,
      aeronaveId:   aeronave2.id,
      salidaUtc:    new Date('2025-08-01T14:00:00Z'),
      llegadaUtc:   new Date('2025-08-01T15:30:00Z'),
      precioBaseUsd: 145.00,
    },
  });

  const asientosV2: any[] = [];
  for (let fila = 10; fila <= 30; fila++) {
    for (const l of letras) {
      asientosV2.push({ vueloId: vuelo2.id, claseId: ecoClase.id, numero: `${fila}${l}` });
    }
  }
  await prisma.asiento.createMany({ data: asientosV2 });

  // Vuelo 3: CBB → VVI
  await prisma.vuelo.create({
    data: {
      numeroVuelo:  'AV201',
      origenId:     cbb.id,
      destinoId:    vvi.id,
      aeronaveId:   aeronave1.id,
      salidaUtc:    new Date('2025-08-02T08:00:00Z'),
      llegadaUtc:   new Date('2025-08-02T09:15:00Z'),
      precioBaseUsd: 120.00,
    },
  });

  // Pasajero de prueba
  await prisma.pasajero.upsert({
    where: { documento: '12345678' },
    update: {},
    create: {
      nombre:    'Juan',
      apellido:  'Pérez',
      documento: '12345678',
      email:     'juan.perez@example.com',
    },
  });

  console.log('✅ Seed completado exitosamente');
  console.log(`   Vuelo AV101 (LPB→VVI): ${asientosV1.length} asientos`);
  console.log(`   Vuelo AV102 (VVI→LPB): ${asientosV2.length} asientos`);
  console.log('   Vuelo AV201 (CBB→VVI): sin asientos aún (usar POST /vuelos)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
