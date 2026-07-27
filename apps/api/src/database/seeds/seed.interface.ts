import type { Connection } from 'mongoose';

export interface Seed {
  id: string;
  description: string;
  run(connection: Connection): Promise<void>;
}

export interface SeedRunResult {
  id: string;
  status: 'executed';
}
