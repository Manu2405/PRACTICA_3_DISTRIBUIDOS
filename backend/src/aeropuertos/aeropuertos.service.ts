import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AeropuertosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.aeropuerto.findMany({
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: number) {
    const aeropuerto = await this.prisma.aeropuerto.findUnique({
      where: { id },
    });
    if (!aeropuerto) {
      throw new NotFoundException(`Aeropuerto ${id} no encontrado`);
    }
    return aeropuerto;
  }
}
