import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
export class SearchDto {
  @IsOptional() @IsObject() filter?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(200) text?: string;
  @IsOptional() @IsObject() sort?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(1000) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000) limit = 50;
  @IsOptional() @IsBoolean() export = false;
}
export class SearchEntityParamDto {
  @IsIn([
    'contacts',
    'companies',
    'leads',
    'deals',
    'tasks',
    'conversations',
    'campaigns',
    'workflows',
    'appointments',
    'files',
  ])
  entity!: string;
}
