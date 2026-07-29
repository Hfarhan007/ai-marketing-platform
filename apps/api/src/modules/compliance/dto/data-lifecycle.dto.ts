import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DATA_CLASSES, type DataClass } from '../data-lifecycle.types.js';

export class UpdateLifecyclePolicyDto {
  @IsIn(DATA_CLASSES) dataClass!: DataClass;
  @IsInt() @Min(1) @Max(3_650) retentionDays!: number;
  @IsOptional() @IsInt() @Min(0) @Max(90) recoveryDays?: number;
  @IsOptional() @IsIn(['anonymize', 'hard_delete']) deletionMode?: 'anonymize' | 'hard_delete';
  @IsOptional() @IsBoolean() enabled?: boolean;
}
export class RunRetentionDto {
  @IsBoolean() dryRun = true;
  @IsString() idempotencyKey!: string;
}
export class CreateLegalHoldDto {
  @IsIn(DATA_CLASSES) dataClass!: DataClass;
  @IsOptional() @IsString() recordId?: string;
  @IsString() reason!: string;
}
export class ScheduleDeletionDto {
  @IsIn(DATA_CLASSES) dataClass!: DataClass;
  @IsString() recordId!: string;
}
