# Guía técnica — rama `devLucas` (backend + datos)

Este documento resume qué incluye la rama **`devLucas`**, cómo ejecutarla en local y qué cambios se incorporaron respecto al proyecto base, para que el equipo pueda **integrar o fusionar** su trabajo sin romper el monorepo.

**Repositorio:** [PRACTICA_3_DISTRIBUIDOS](https://github.com/Manu2405/PRACTICA_3_DISTRIBUIDOS) (remoto `origin`).

---

## 1. Qué aporta esta rama

| Área | Contenido |
|------|-----------|
| **Backend** | NestJS + Prisma + SQL Server: aeropuertos, vuelos, asientos, operaciones (reserva / venta / anulación), auditoría, Dijkstra de ejemplo. |
| **Base de datos** | Esquema en `backend/prisma/schema.prisma`; tablas creadas con `prisma db push`; datos iniciales con `prisma db seed`. |
| **Frontend** | App Vite/React existente; se corrigió el uso de `dijkstrajs` en `frontend/src/dijkstra.ts` (la librería no expone `distance`). |

**Origen del backend con Prisma:** se integró la línea de trabajo de la rama remota **`devPablo`** (API + modelo), más correcciones y mejoras listadas abajo.

---

## 2. Requisitos de entorno

- **Node.js** (LTS recomendado) y **npm**.
- **SQL Server** (instancia accesible por **TCP**; en local suele hacer falta habilitar **TCP/IP** en el Administrador de configuración de SQL Server y reiniciar el servicio del motor).
- Base de datos vacía creada previamente (por ejemplo `aviones_distribuidos`).

**No subir al repositorio:** el archivo `backend/.env` (credenciales). Solo existe **`backend/.env.example`** como plantilla.

---

## 3. Puesta en marcha (primera vez)

Desde la **raíz del monorepo**:

```bash
npm install
```

1. Copiar `backend/.env.example` → `backend/.env` y definir **`DATABASE_URL`** (Windows integrada o usuario/contraseña SQL). Ver comentarios dentro de `.env.example`.
2. Generar cliente Prisma y crear tablas:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

3. Arrancar API:

```bash
npm run start:backend
```

La API queda en **`http://localhost:3001`**. Opcionalmente, en otra terminal: `npm run start:frontend`.

---

## 4. Scripts útiles (raíz y `backend`)

| Comando (raíz) | Descripción |
|----------------|-------------|
| `npm run start:backend` | Ejecuta el backend en modo desarrollo (`ts-node`). |
| `npm run start:frontend` | Frontend Vite. |
| `npm run db:generate` | `prisma generate` en `backend`. |
| `npm run db:push` | Aplica el esquema Prisma a la BD. |
| `npm run db:seed` | Datos iniciales (aeropuertos, vuelos, asientos, pasajero de prueba). |

En la carpeta **`backend`** también existe `npm run start:backend` (alias de `start:dev`) por comodidad.

**Pruebas HTTP de ejemplo:** `backend/tests/endpoints.http` (extensión REST Client en VS Code/Cursor).

---

## 5. Endpoints principales

| Método | Ruta | Notas |
|--------|------|--------|
| GET | `/` | Información de la API y enlaces de ejemplo (evita 404 al abrir solo la raíz). |
| GET | `/aeropuertos`, `/aeropuertos/:id` | Catálogo. |
| GET | `/vuelos`, `/vuelos/:id`, `/vuelos/:id/asientos` | Vuelos y mapa de asientos. |
| POST | `/vuelos` | Crear vuelo (DTO validado). |
| POST | `/reservas`, `/ventas`, `/anulaciones` | Operaciones de negocio (**solo POST**; no se prueban abriendo la URL en el navegador). |
| GET | `/asientos/:id/auditoria` | Historial de cambios del asiento. |
| GET | `/shortest-path?from=A&to=F` | Dijkstra sobre grafo de ejemplo en memoria. |

---

## 6. Cambios técnicos relevantes (para integración en equipo)

### 6.1 Prisma y configuración

- Se **eliminó** `backend/prisma.config.ts` (orientado a otra versión de la CLI). Con **Prisma 5** basta `prisma/schema.prisma` + variable **`DATABASE_URL`** en `.env`.
- **`prisma db seed`** configurado en `backend/package.json` (`prisma.seed`).

### 6.2 Módulo `aeropuertos`

- Se eliminó un archivo mal ubicado (`vuelos.service.ts` dentro de `aeropuertos/`) y se añadió **`aeropuertos.service.ts`** con listado y detalle de aeropuertos.

### 6.3 Arranque y entorno

- **`main.ts`:** `await NestFactory.create(AppModule)` e **`import 'dotenv/config'`** para cargar `.env`.
- Dependencias: **`dotenv`**, **`class-validator`**, **`class-transformer`** (necesarias para el pipe global).

### 6.4 DTOs y `ValidationPipe`

En **`main.ts`** el `ValidationPipe` usa **`whitelist: true`**. Sin decoradores `class-validator`, **Nest elimina todo el body** y los `POST` fallan (antes, error 500).

- Se añadieron decoradores en **`operaciones.dto.ts`** y **`create-vuelo.dto.ts`** (`@IsInt()`, `@Type(() => Number)`, `@IsOptional()`, etc.).

**Regla para el equipo:** cualquier DTO nuevo que reciba JSON debe declarar propiedades con `class-validator` (o `@Allow()` donde aplique).

### 6.5 Dijkstra (`dijkstrajs`)

La librería **solo expone `find_path`**, no `distance`. La distancia se calcula **sumando pesos** del camino en:

- `backend/src/app.service.ts`
- `frontend/src/dijkstra.ts`

### 6.6 Otros

- **`GET /`** en `app.controller.ts` para respuesta clara en la raíz.
- **`start:backend`** en `backend/package.json` como alias del arranque en desarrollo.
- Se quitó **`@types/dijkstrajs`** del `package.json` (paquete inexistente en npm).
- **`.env.example`:** ejemplos para SQL Server (incl. autenticación Windows).

---

## 7. Cómo fusionar otras ramas sin “corromper” el proyecto

1. **Partir siempre de `devLucas` actualizado:**
   ```bash
   git fetch origin
   git checkout devLucas
   git pull origin devLucas
   ```
2. **Integrar otra rama** (ej. UI en `devManuel`):
   ```bash
   git merge origin/devManuel
   ```
   Resolver conflictos priorizando:
   - **`backend/package.json` / `package-lock.json`:** unificar dependencias; ejecutar `npm install` en la raíz.
   - **Rutas duplicadas** entre controladores: revisar prefijos `@Controller()` y orden de módulos en `app.module.ts`.
3. **No commitear** `backend/.env` ni secretos.
4. Tras un merge, en local: `npm install`, `npm run db:generate`, `npm run db:push` (si cambió el esquema), `npm run db:seed` solo si hace falta datos limpios, y probar `npm run start:backend`.

---

## 8. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| `P1001` / no conecta a SQL Server | TCP deshabilitado o puerto incorrecto | Habilitar TCP/IP en el Administrador de configuración; comprobar `DATABASE_URL` y puerto (p. ej. 1433). |
| `EADDRINUSE` en 3001 | Ya hay otro proceso usando el puerto | Cerrar la otra terminal o `Stop-Process` del proceso en ese puerto. |
| `Cannot GET /reservas` (404) | El navegador hace GET | Usar POST con cuerpo JSON (PowerShell, Postman o `endpoints.http`). |
| 500 en POST con body correcto | DTO sin decoradores con `whitelist: true` | Añadir `class-validator` al DTO. |
| `dijkstra.distance is not a function` | API antigua | Usar la versión de código que calcula la distancia manualmente (rama actual). |

---

## 9. Contacto y convenciones

- Mantener **TypeScript** estricto en lo posible en archivos nuevos.
- Documentar variables nuevas en **`.env.example`**, nunca valores reales en el repo.
- Para dudas de esquema, mirar **`backend/prisma/schema.prisma`** como fuente de verdad.

---

*Última actualización alineada con la rama `devLucas` del repositorio del equipo.*
