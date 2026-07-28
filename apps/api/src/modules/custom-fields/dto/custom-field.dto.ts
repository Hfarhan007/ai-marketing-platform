import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_TYPES } from '../custom-field.types.js';

export class CreateCustomFieldDto {
  @IsIn(CUSTOM_FIELD_ENTITIES) entityType!: (typeof CUSTOM_FIELD_ENTITIES)[number];
  @IsString() @Matches(/^[a-z][a-z0-9_]{1,79}$/u) key!: string;
  @IsString() @MaxLength(120) label!: string;
  @IsIn(CUSTOM_FIELD_TYPES) fieldType!: (typeof CUSTOM_FIELD_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(120) group = 'General';
  @IsOptional() @IsArray() @IsObject({ each: true }) options: Record<string, unknown>[] = [];
  @IsOptional() @IsObject() validation: Record<string, unknown> = {};
  @IsOptional() defaultValue?: unknown;
  @IsOptional() @IsObject() visibilityRules: Record<string, unknown> = {};
  @IsOptional() @IsBoolean() required = false;
  @IsOptional() @IsArray() @IsString({ each: true }) readPermissions: string[] = [];
  @IsOptional() @IsArray() @IsString({ each: true }) writePermissions: string[] = [];
  @IsOptional() @IsBoolean() indexed = false;
}
export class UpdateCustomFieldDto extends CreateCustomFieldDto {
  @IsInt() @Min(1) version!: number;
}
export class MigrateCustomFieldDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(CUSTOM_FIELD_TYPES) targetType!: (typeof CUSTOM_FIELD_TYPES)[number];
}
