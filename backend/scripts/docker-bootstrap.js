const { execSync, spawn } = require('node:child_process');
const net = require('node:net');

const sqlHost = process.env.SQLSERVER_HOST || 'sqlserver';
const sqlPort = Number(process.env.SQLSERVER_PORT_INTERNAL || '1433');

function run(command) {
  execSync(command, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
}

function waitForTcp(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const socket = new net.Socket();

      socket.setTimeout(2000);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('timeout', () => {
        socket.destroy();
        retry();
      });
      socket.once('error', () => {
        socket.destroy();
        retry();
      });

      socket.connect(port, host);
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(
          new Error(`Timeout esperando ${host}:${port} despues de ${timeoutMs}ms`),
        );
        return;
      }

      setTimeout(tryConnect, 2000);
    };

    tryConnect();
  });
}

async function ensureSeedData() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const countAeropuertos = await prisma.aeropuerto.count();

    if (countAeropuertos === 0) {
      console.log('Base vacia: ejecutando seed...');
      run('npm run db:seed');
      return;
    }

    console.log('Seed omitido: ya existen datos base.');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log(`Esperando SQL Server en ${sqlHost}:${sqlPort}...`);
  await waitForTcp(sqlHost, sqlPort, 180000);

  console.log('Instalando dependencias del backend...');
  run('npm install');

  console.log('Generando cliente Prisma...');
  run('npm run db:generate');

  console.log('Aplicando esquema Prisma...');
  run('npm run db:push');

  await ensureSeedData();

  console.log('Iniciando backend NestJS...');
  const child = spawn('npm', ['run', 'start:backend'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error('Fallo bootstrap docker del backend:', error);
  process.exit(1);
});
