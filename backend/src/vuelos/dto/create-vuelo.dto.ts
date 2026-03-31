import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString } from 'class-validator';

export class CreateVueloDto {
  @IsString()
  numeroVuelo!: string;

  @Type(() => Number)
  @IsInt()
  origenId!: number;

  @Type(() => Number)
  @IsInt()
  destinoId!: number;

  @Type(() => Number)
  @IsInt()
  aeronaveId!: number;

  @IsString()
  salidaUtc!: string;

  @IsString()
  llegadaUtc!: string;

  @Type(() => Number)
  @IsNumber()
  precioBaseUsd!: number;
}
