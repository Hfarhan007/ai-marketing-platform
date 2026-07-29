import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { SAGA_TYPES, type SagaType } from '../saga.types.js';

export class StartSagaDto {
  @IsIn(SAGA_TYPES) type!: SagaType;
  @IsString() @MaxLength(200) correlationId!: string;
  @IsOptional() @IsObject() payload: Record<string, unknown> = {};
}
export class SagaSignalDto {
  @IsString() step!: string;
  @IsBoolean() success!: boolean;
  @IsOptional() @IsString() externalReference?: string;
  @IsOptional() @IsString() @MaxLength(1000) error?: string;
}
export class SagaResumeDto {
  @IsOptional() @IsString() step?: string;
}
