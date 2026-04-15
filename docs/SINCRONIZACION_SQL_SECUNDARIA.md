# Sincronizacion SQL principal + SQL secundaria + Mongo

## Modelo academico adoptado

- `SQL Server principal`: fuente de verdad transaccional.
- `SQL Server secundaria`: replica logica a nivel de aplicacion.
- `MongoDB`: proyeccion documental de eventos y estado de sincronizacion.

## Flujo de escritura

1. La operacion critica se confirma en SQL principal.
2. Si el commit principal fue exitoso, el backend intenta replicar el mismo cambio en SQL secundaria.
3. Finalmente se registra el evento en Mongo con `relojVector`, `lamportTimestamp` y el resultado de la replica secundaria.

## Comportamiento ante fallo

- Si falla SQL principal, la operacion falla.
- Si falla SQL secundaria, la operacion principal NO se revierte.
- El fallo de replica queda visible en la respuesta HTTP y en el documento guardado en Mongo.

## Requisito operativo

- La base secundaria debe tener el mismo schema y los mismos datos base/IDs sembrados que la principal.
- Para eso se recomienda crear la base secundaria, aplicar `db:push` y ejecutar el mismo `db:seed` antes de habilitar `SECONDARY_DATABASE_URL`.
