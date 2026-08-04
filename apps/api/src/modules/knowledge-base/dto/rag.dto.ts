import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ChunkingStrategy } from '../chunking/chunking.service.js';
import type { AiProviderName } from '../../ai/providers/ai-provider.interface.js';
export class ProcessKnowledgeDto {
  @IsString() @MaxLength(200) idempotencyKey!: string;
  @IsString() @MaxLength(10_000_000) content!: string;
  @IsOptional() @IsString() @MaxLength(200) mimeType?: string;
  @IsOptional()
  @IsIn([
    'fixed-token',
    'paragraph',
    'heading-aware',
    'sentence-aware',
    'table-aware',
    'faq-pair',
    'transcript-segment',
    'sliding-window',
    'semantic-boundary',
  ])
  chunkingStrategy?: ChunkingStrategy;
  @IsOptional() @IsInt() @Min(20) @Max(10_000) chunkSize?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5_000) chunkOverlap?: number;
  @IsOptional() @IsBoolean() createParentChunks?: boolean;
  @IsOptional() @IsBoolean() createSummaryChunks?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(1) nearDuplicateThreshold?: number;
  @IsOptional() @IsObject() accessControl?: Record<string, unknown>;
}
export class RetrieveKnowledgeDto {
  @IsString() @MaxLength(2_000) query!: string;
  @IsString() @MaxLength(200) correlationId!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) collectionIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) sourceIds?: string[];
  @IsOptional() @IsString() @MaxLength(20) language?: string;
  @IsOptional() @IsObject() metadata?: Record<string, string | number | boolean>;
}

export class EmbeddingMigrationDto {
  @IsIn(['openai', 'gemini', 'groq', 'openrouter', 'ollama']) provider!: AiProviderName;
  @IsString() @MaxLength(200) model!: string;
  @IsString() @MaxLength(200) version!: string;
  @IsString() @MaxLength(200) targetIndex!: string;
  @IsOptional() @IsString() @MaxLength(200) sourceVersion?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100_000) expectedDimension?: number;
}
