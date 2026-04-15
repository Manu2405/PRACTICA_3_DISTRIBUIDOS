import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Con ValidationPipe `whitelist: true`, sin decoradores class-validator el body queda vacío y falla la operación. */
export class ReservaDto {
  @Type(() => Number)
  @IsInt()
  asientoId!: number;

  @Type(() => Number)
  @IsInt()
  pasajeroId!: number;

  @IsOptional()
  @IsString()
  nodoOrigen?: string;

  @IsOptional()
  @IsString()
  relojVector?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportTimestamp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportRemoto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minutosExpiracion?: number;
}

export class VentaDto {
  @Type(() => Number)
  @IsInt()
  asientoId!: number;

  @Type(() => Number)
  @IsInt()
  pasajeroId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reservaId?: number;

  @IsOptional()
  @IsString()
  nodoOrigen?: string;

  @IsOptional()
  @IsString()
  relojVector?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportTimestamp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportRemoto?: number;
}

export class AnulacionDto {
  @Type(() => Number)
  @IsInt()
  asientoId!: number;

  @Type(() => Number)
  @IsInt()
  pasajeroId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reservaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ventaId?: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsIn(['ANULACION', 'DEVOLUCION', 'RESERVA', 'VENTA'])
  tipo?: 'ANULACION' | 'DEVOLUCION' | 'RESERVA' | 'VENTA';

  @IsOptional()
  @IsString()
  nodoOrigen?: string;

  @IsOptional()
  @IsString()
  relojVector?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportTimestamp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lamportRemoto?: number;
}
