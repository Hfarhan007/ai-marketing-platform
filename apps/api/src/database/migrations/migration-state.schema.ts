import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { MIGRATION_COLLECTION } from '../mongo/mongo.constants.js';

@Schema({ collection: MIGRATION_COLLECTION, timestamps: false, versionKey: false })
export class MigrationState {
  @Prop({ type: String, required: true })
  migrationId!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: Boolean, required: true, default: false })
  repeatable!: boolean;

  @Prop({ type: String })
  checksum?: string;

  @Prop({ type: Date, required: true })
  executedAt!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  durationMs!: number;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  runCount!: number;
}

export type MigrationStateDocument = HydratedDocument<MigrationState>;
export const MigrationStateSchema = SchemaFactory.createForClass(MigrationState);
