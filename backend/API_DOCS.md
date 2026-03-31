# Documentación de Entradas y Salidas (API Docs)

Sistema Distribuido de Reservas Aéreas (Práctica 3)

---

## 1. Módulo de Rutas (Dijkstra)

Endpoint encargado de recibir un origen, destino y criterio (costo o tiempo) para calcular la ruta óptima en base a un grafo pre-cargado.

### `GET /shortest-path`

**Entradas (Query Parameters):**
- `from` (string, requerido): Código IATA de la ciudad de origen (Ej. `ATL`, `PEK`).
- `to` (string, requerido): Código IATA de la ciudad de destino (Ej. `LON`, `DXB`).
- `criteria` (string, opcional): El criterio de optimización. Puede ser `price` (Costo) o `time` (Tiempo). Por defecto es `price`.

**Salidas (JSON):**

*Respuesta exitosa (200 OK)*
```json
{
  "path": [
    "ATL",
    "PAR",
    "LON"
  ],
  "totalValue": 550,
  "criteria": "price"
}
```

*Respuesta de error (400 Bad Request o Excepción Nativa)*
```json
{
  "message": "Destino no encontrado: XYZ",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## 2. Simulador de Conflictos Concurrencia (Relojes Vectoriales)

Módulo encargado de simular el ingreso de dos eventos distribuidos y calcular cuál gana utilizando reglas de concurrencia y políticas de negocio (Venta > Reserva, Desempate por ID de Nodo).

### Estructura Base: `BookingEvent`
Cada evento que ingresa al algoritmo tiene este esquema:
```json
{
  "eventId": "ID único del evento (string)",
  "nodeId": "ID del nodo (ej. node-1)",
  "seatId": "ID del asiento (ej. A1)",
  "action": "Tipo de acción: 'reserve' o 'purchase'",
  "vectorClock": {
    "node-1": 2,
    "node-2": 5,
    "node-3": 1
  }
}
```

### `POST /simulate-conflict`

**Entradas (Body - JSON):**
Se envían dos objetos `BookingEvent` simultáneamente en el cuerpo de la petición.
```json
{
  "event1": {
    "eventId": "evt-001",
    "nodeId": "node-1",
    "seatId": "A1",
    "action": "reserve",
    "vectorClock": { "node-1": 1, "node-2": 0 }
  },
  "event2": {
    "eventId": "evt-002",
    "nodeId": "node-2",
    "seatId": "A1",
    "action": "purchase",
    "vectorClock": { "node-1": 0, "node-2": 1 }
  }
}
```

**Salidas (JSON de Resolución de Conflicto - ConflictResult):**

*Respuesta exitosa (200 OK)*
```json
{
  "winner": {
    "eventId": "evt-002",
    "nodeId": "node-2",
    "seatId": "A1",
    "action": "purchase",
    "vectorClock": { "node-1": 0, "node-2": 1 }
  },
  "loser": {
    "eventId": "evt-001",
    "nodeId": "node-1",
    "seatId": "A1",
    "action": "reserve",
    "vectorClock": { "node-1": 1, "node-2": 0 }
  },
  "isConcurrent": true,
  "reason": "Política de Negocio: Venta (purchase) siempre prevalece sobre una Reserva (reserve)."
}
```

### `GET /simulate-conflict-demo`

**Entradas:** Ninguna. Este es un endpoint de demostración pura que ya incluye dos eventos programados o quemados que explican cómo funciona.

**Salidas (JSON):**
Idéntica a la respuesta del `POST` arriba, demostrando un empate cruzado que gana "purchase" o gana "node-1" según las reglas de negocio descritas en la variable interna del servidor.
