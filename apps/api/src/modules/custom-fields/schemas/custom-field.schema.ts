import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_TYPES } from '../custom-field.types.js';

@Schema({ collection: 'custom_field_definitions', timestamps: true, versionKey: false })
export class CustomFieldDefinition {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) workspaceId!: Types.ObjectId;
  @Prop({ type: String, enum: CUSTOM_FIELD_ENTITIES, required: true }) entityType!: string;
  @Prop({ type: String, required: true, maxlength: 80 }) key!: string;
  @Prop({ type: String, required: true, maxlength: 120 }) label!: string;
  @Prop({ type: String, enum: CUSTOM_FIELD_TYPES, required: true }) fieldType!: string;
  @Prop({ type: String, default: 'General', maxlength: 120 }) group!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) options!: {
    value: string;
    label: string;
    archived?: boolean;
  }[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) validation!: Record<string, unknown>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) defaultValue!: unknown;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) visibilityRules!: Record<
    string,
    unknown
  >;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: [String], default: [] }) readPermissions!: string[];
  @Prop({ type: [String], default: [] }) writePermissions!: string[];
  @Prop({ type: Boolean, default: false }) indexed!: boolean;
  @Prop({ type: Boolean, default: false }) archived!: boolean;
  @Prop({ type: Number, default: 1 }) version!: number;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) versionHistory!: Record<
    string,
    unknown
  >[];
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) createdBy!: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) updatedBy!: Types.ObjectId;
}
export type CustomFieldDefinitionDocument = HydratedDocument<CustomFieldDefinition>;
export const CustomFieldDefinitionSchema = SchemaFactory.createForClass(CustomFieldDefinition);
CustomFieldDefinitionSchema.index({ workspaceId: 1, entityType: 1, key: 1 }, { unique: true });
CustomFieldDefinitionSchema.index({ workspaceId: 1, entityType: 1, archived: 1, group: 1 });
