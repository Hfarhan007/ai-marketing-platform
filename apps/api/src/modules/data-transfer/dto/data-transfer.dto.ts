import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
export const TRANSFER_ENTITIES = [
  'contacts',
  'companies',
  'leads',
  'deals',
  'products',
  'knowledge_faqs',
] as const;
export class CreateImportDto {
  @IsMongoId() fileId!: string;
  @IsIn(TRANSFER_ENTITIES) entity!: (typeof TRANSFER_ENTITIES)[number];
  @IsOptional() @IsIn(['csv', 'xlsx', 'json']) format?: 'csv' | 'xlsx' | 'json';
  @IsOptional() @IsObject() mapping: Record<string, string> = {};
  @IsOptional() @IsIn(['skip', 'update', 'merge', 'create_new']) duplicatePolicy:
    'skip' | 'update' | 'merge' | 'create_new' = 'skip';
  @IsOptional() @IsBoolean() dryRun = false;
  @IsString() @MaxLength(200) idempotencyKey!: string;
}
export class UpdateImportMappingDto {
  @IsObject() mapping!: Record<string, string>;
  @IsIn(['skip', 'update', 'merge', 'create_new']) duplicatePolicy!:
    'skip' | 'update' | 'merge' | 'create_new';
  @IsOptional() @IsBoolean() dryRun = false;
}
export class CreateExportDto {
  @IsIn(TRANSFER_ENTITIES) entity!: (typeof TRANSFER_ENTITIES)[number];
  @IsIn(['csv', 'xlsx', 'json']) format!: 'csv' | 'xlsx' | 'json';
  @IsOptional() @IsArray() @IsString({ each: true }) fields: string[] = [];
  @IsOptional() @IsObject() filter: Record<string, unknown> = {};
  @IsOptional() @IsBoolean() encrypted = false;
  @IsString() @MaxLength(200) idempotencyKey!: string;
}
