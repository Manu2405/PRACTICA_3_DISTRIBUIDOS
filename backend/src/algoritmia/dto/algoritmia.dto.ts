// src/algoritmia/dto/algoritmia.dto.ts
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Rutas (Dijkstra) ────────────────────────────────────────────────────────

export class RutaQueryDto {
  @IsString()
  origen!: string;

  @IsString()
  destino!: string;

  @IsOptional()
  @IsIn(['price', 'time'])
  criterio?: 'price' | 'time';
}

// ── Reloj Vectorial ─────────────────────────────────────────────────────────

export class RelojVectorialDto {
  /** ID del nodo que solicita el reloj inicial (ej: "NODO_1") */
  @IsString()
  nodoId!: string;

  /** Lista opcional de todos los nodos del sistema */
  @IsOptional()
  @IsString({ each: true })
  nodos?: string[];
}

export class RelojIncrementoDto {
  @IsString()
  nodoId!: string;

  /** Reloj vectorial actual serializado como objeto */
  @IsObject()
  reloj!: Record<string, number>;
}

export class RelojCombinarDto {
  @IsObject()
  local!: Record<string, number>;

  @IsObject()
  incoming!: Record<string, number>;
}

export class RelojCompararDto {
  @IsObject()
  reloj1!: Record<string, number>;

  @IsObject()
  reloj2!: Record<string, number>;
}

// —— Reloj Lamport ——————————————————————————————————————————————————————————

export class LamportGenerarDto {
  @IsString()
  nodoId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  valorInicial?: number;
}

export class LamportIncrementoDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  relojLocal!: number;
}

export class LamportCombinarDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  local!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  incoming!: number;
}

export class LamportEventoDto {
  @IsString()
  nodeId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportTimestamp!: number;
}

export class LamportCompararDto {
  @ValidateNested()
  @Type(() => LamportEventoDto)
  eventoA!: LamportEventoDto;

  @ValidateNested()
  @Type(() => LamportEventoDto)
  eventoB!: LamportEventoDto;
}

// ── Conflictos ──────────────────────────────────────────────────────────────

export class BookingEventDto {
  @IsString()
  eventId!: string;

  @IsString()
  nodeId!: string;

  @IsString()
  seatId!: string;

  @IsIn(['reserve', 'purchase', 'cancel'])
  action!: 'reserve' | 'purchase' | 'cancel';

  @IsObject()
  vectorClock!: Record<string, number>;
}

export class ConflictoDto {
  @ValidateNested()
  @Type(() => BookingEventDto)
  eventoA!: BookingEventDto;

  @ValidateNested()
  @Type(() => BookingEventDto)
  eventoB!: BookingEventDto;
}
