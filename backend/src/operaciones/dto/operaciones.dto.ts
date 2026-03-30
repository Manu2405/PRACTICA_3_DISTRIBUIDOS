// src/operaciones/dto/reserva.dto.ts
export class ReservaDto {
  asientoId!: number;
  pasajeroId!: number;
  nodoOrigen?: string;
  relojVector?: string;   // JSON string del reloj vectorial, lo asigna el módulo de algoritmia
  minutosExpiracion?: number; // cuántos minutos dura la reserva (default 30)
}

// src/operaciones/dto/venta.dto.ts
export class VentaDto {
  asientoId!: number;
  pasajeroId!: number;
  reservaId?: number;     // si viene de una reserva previa
  nodoOrigen?: string;
  relojVector?: string;
}

// src/operaciones/dto/anulacion.dto.ts
export class AnulacionDto {
  asientoId!: number;
  pasajeroId!: number;
  reservaId?: number;
  ventaId?: number;
  motivo?: string;
  tipo?: 'ANULACION' | 'DEVOLUCION';
  nodoOrigen?: string;
  relojVector?: string;
}
