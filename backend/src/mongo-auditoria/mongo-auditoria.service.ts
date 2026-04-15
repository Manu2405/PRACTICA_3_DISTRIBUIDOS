import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';

export type EventoOperacionMongo = {
  tipoOperacion: string;
  nodoOrigen: string;
  relojVector: string;
  lamportTimestamp?: number;
  sincronizacionSqlSecundaria?: {
    enabled: boolean;
    attempted: boolean;
    ok: boolean;
    error?: string | null;
    timestampUtc: string;
  };
  timestampUtc: string;
  asientoId: number;
  pasajeroId: number;
  estadoAntes: string;
  estadoDespues: string;
  referenciaId?: number | null;
};

export type EventoOperacionMongoResumen = {
  time: string;
  event: string;
  detail: string;
};

@Injectable()
export class MongoAuditoriaService implements OnModuleDestroy {
  private readonly logger = new Logger(MongoAuditoriaService.name);
  private client: MongoClient | null = null;
  private collection: Collection<EventoOperacionMongo> | null = null;
  private connectionPromise: Promise<Collection<EventoOperacionMongo> | null> | null =
    null;
  private disabledWarningShown = false;

  private get mongoUri(): string | null {
    return process.env.MONGODB_URI?.trim() || null;
  }

  private get dbName(): string {
    return process.env.MONGODB_DB_NAME?.trim() || 'sarp_auditoria';
  }

  private get collectionName(): string {
    return process.env.MONGODB_COLLECTION_EVENTOS?.trim() || 'eventos_operaciones';
  }

  private async getCollection(): Promise<Collection<EventoOperacionMongo> | null> {
    if (this.collection) {
      return this.collection;
    }

    if (!this.mongoUri) {
      if (!this.disabledWarningShown) {
        this.logger.warn(
          'Mongo auditoria deshabilitada: falta configurar MONGODB_URI.',
        );
        this.disabledWarningShown = true;
      }
      return null;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        this.client = new MongoClient(this.mongoUri as string);
        await this.client.connect();
        this.collection = this.client
          .db(this.dbName)
          .collection<EventoOperacionMongo>(this.collectionName);

        this.logger.log(
          `Mongo auditoria activa en ${this.dbName}.${this.collectionName}`,
        );

        return this.collection;
      } catch (error) {
        this.logger.error(
          'No se pudo conectar a Mongo para auditoria opcional.',
          error instanceof Error ? error.stack : undefined,
        );
        this.connectionPromise = null;
        this.client = null;
        this.collection = null;
        return null;
      }
    })();

    return this.connectionPromise;
  }

  async registrarEvento(evento: EventoOperacionMongo): Promise<boolean> {
    const collection = await this.getCollection();

    if (!collection) {
      return false;
    }

    try {
      await collection.insertOne(evento);
      return true;
    } catch (error) {
      this.logger.error(
        'No se pudo escribir el evento en Mongo.',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  async contarEventos(): Promise<number> {
    const collection = await this.getCollection();

    if (!collection) {
      return 0;
    }

    try {
      return await collection.countDocuments();
    } catch (error) {
      this.logger.error(
        'No se pudo contar los eventos de Mongo.',
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  async listarEventosRecientes(limit = 8): Promise<EventoOperacionMongo[]> {
    const collection = await this.getCollection();

    if (!collection) {
      return [];
    }

    try {
      return await collection
        .find({})
        .sort({ timestampUtc: -1, _id: -1 })
        .limit(Math.max(1, limit))
        .toArray();
    } catch (error) {
      this.logger.error(
        'No se pudieron leer los eventos recientes de Mongo.',
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }

    await this.client.close();
    this.client = null;
    this.collection = null;
    this.connectionPromise = null;
  }
}
