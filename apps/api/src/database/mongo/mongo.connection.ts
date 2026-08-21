import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { STATES, type Connection } from 'mongoose';

@Injectable()
export class MongoConnection implements OnApplicationShutdown {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  get native(): Connection {
    return this.connection;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.connection.readyState !== STATES.disconnected) {
      await this.connection.close(false);
    }
  }
}
