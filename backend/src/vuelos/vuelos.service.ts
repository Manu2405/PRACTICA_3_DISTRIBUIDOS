// src/vuelos/vuelos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVueloDto } from './dto/create-vuelo.dto';

@Injectable()
export class VuelosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos los vuelos activos con origen y destino */
  findAll() {
    return this.prisma.vuelo.findMany({
      where: { activo: true },
      include: {
        origen:   { select: { codigo: true, ciudad: true } },
        destino:  { select: { codigo: true, ciudad: true } },
        aeronave: { select: { modelo: true } },
      },
      orderBy: { salidaUtc: 'asc' },
    });
  }

  /** Detalle de un vuelo */
  async findOne(id: number) {
    const vuelo = await this.prisma.vuelo.findUnique({
      where: { id },
      include: {
        origen:   true,
        destino:  true,
        aeronave: true,
      },
    });
    if (!vuelo) throw new NotFoundException(`Vuelo ${id} no encontrado`);
    return vuelo;
  }

  /**
   * Asientos de un vuelo con su estado actual.
   * Agrupa por clase para que la UI pueda armar el mapa de cabina.
   */
  async findAsientos(vueloId: number) {
    const vuelo = await this.prisma.vuelo.findUnique({ where: { id: vueloId } });
    if (!vuelo) throw new NotFoundException(`Vuelo ${vueloId} no encontrado`);

    const asientos = await this.prisma.asiento.findMany({
      where: { vueloId },
      include: { clase: true },
      orderBy: [{ clase: { codigo: 'asc' } }, { numero: 'asc' }],
    });

    // Resumen de disponibilidad
    const resumen = {
      total: asientos.length,
      libres:     asientos.filter(a => a.estado === 'LIBRE').length,
      reservados: asientos.filter(a => a.estado === 'RESERVADO').length,
      vendidos:   asientos.filter(a => a.estado === 'VENDIDO').length,
    };

    return { vueloId, resumen, asientos };
  }

  /** Crea un vuelo y genera los asientos según la aeronave */
  async create(dto: CreateVueloDto) {
    const aeronave = await this.prisma.aeronave.findUniqueOrThrow({
      where: { id: dto.aeronaveId },
    });

    const clases = await this.prisma.claseTarifaria.findMany();
    const claseMap = Object.fromEntries(clases.map(c => [c.codigo, c.id]));

    return this.prisma.$transaction(async (tx) => {
      // Crear vuelo
      const vuelo = await tx.vuelo.create({
        data: {
          numeroVuelo:   dto.numeroVuelo,
          origenId:      dto.origenId,
          destinoId:     dto.destinoId,
          aeronaveId:    dto.aeronaveId,
          salidaUtc:     new Date(dto.salidaUtc),
          llegadaUtc:    new Date(dto.llegadaUtc),
          precioBaseUsd: dto.precioBaseUsd,
        },
      });

      // Generar asientos automáticamente según capacidad de aeronave
      const asientosData: Array<{ vueloId: number; claseId: number; numero: string }> = [];

      const generarFila = (claseCode: string, cantidad: number, letraInicio: number) => {
        const letras = ['A','B','C','D','E','F'];
        let fila = 1;
        let count = 0;
        while (count < cantidad) {
          const letra = letras[count % letras.length];
          if (letra === 'A') fila = Math.floor(count / letras.length) + 1 + letraInicio;
          asientosData.push({
            vueloId: vuelo.id,
            claseId: claseMap[claseCode],
            numero: `${fila}${letra}`,
          });
          count++;
        }
      };

      if (aeronave.capacidadPri > 0) generarFila('PRI', aeronave.capacidadPri, 0);
      if (aeronave.capacidadBus > 0) generarFila('BUS', aeronave.capacidadBus, 2);
      generarFila('ECO', aeronave.capacidadEco, 10);

      await tx.asiento.createMany({ data: asientosData });

      return { ...vuelo, asientosCreados: asientosData.length };
    });
  }
}
