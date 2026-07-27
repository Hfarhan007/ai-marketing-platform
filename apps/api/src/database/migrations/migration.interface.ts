import type { Connection } from 'mongoose';

export interface Migration {
  id: string;
  description: string;
  repeatable?: boolean;
  checksum?: string;
  up(connection: Connection): Promise<void>;
}

export interface MigrationRunResult {
  id: string;
  status: 'applied' | 'skipped';
}
