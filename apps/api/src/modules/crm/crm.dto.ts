import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CrmListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(50) sort = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class VersionDto {
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}

export class BulkItemDto {
  @IsMongoId() id!: string;
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}
export class BulkOperationDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkItemDto) items!: BulkItemDto[];
  @IsIn(['delete', 'restore']) action!: 'delete' | 'restore';
}

export class DataJobDto {
  @IsOptional() @IsObject() options: Record<string, string | number | boolean> = {};
}
