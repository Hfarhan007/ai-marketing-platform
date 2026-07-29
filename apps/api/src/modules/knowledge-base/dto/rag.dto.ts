import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
export class ProcessKnowledgeDto {
  @IsString() @MaxLength(200) idempotencyKey!: string;
  @IsString() @MaxLength(10_000_000) content!: string;
  @IsOptional() @IsString() @MaxLength(200) mimeType?: string;
}
export class RetrieveKnowledgeDto {
  @IsString() @MaxLength(2_000) query!: string;
  @IsString() @MaxLength(200) correlationId!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) collectionIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) sourceIds?: string[];
  @IsOptional() @IsString() @MaxLength(20) language?: string;
  @IsOptional() @IsObject() metadata?: Record<string, string | number | boolean>;
}
