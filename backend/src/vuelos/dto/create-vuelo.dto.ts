// src/vuelos/dto/create-vuelo.dto.ts
export class CreateVueloDto {
  numeroVuelo!: string;
  origenId!: number;
  destinoId!: number;
  aeronaveId!: number;
  salidaUtc!: string;   // ISO 8601 con timezone
  llegadaUtc!: string;
  precioBaseUsd!: number;
}
