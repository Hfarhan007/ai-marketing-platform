import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { NODE_TYPES, type WorkflowNodeType } from '../types/workflow.types.js';
class RetryDto {
  @IsInt() @Min(1) @Max(10) attempts = 3;
  @IsInt() @Min(100) @Max(3600000) backoffMs = 1000;
}
class NodeDto {
  @IsString() @MaxLength(100) id!: string;
  @IsIn(NODE_TYPES) type!: WorkflowNodeType;
  @IsString() @MaxLength(200) name!: string;
  @IsObject() config!: Record<string, unknown>;
  @IsOptional() @ValidateNested() @Type(() => RetryDto) retry?: RetryDto;
}
class EdgeDto {
  @IsString() source!: string;
  @IsString() target!: string;
  @IsOptional() @IsString() branch?: string;
}
export class WorkflowGraphDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes!: NodeDto[];
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges!: EdgeDto[];
}
export class CreateWorkflowDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description = '';
  @ValidateNested() @Type(() => WorkflowGraphDto) graph!: WorkflowGraphDto;
}
export class UpdateDraftDto {
  @ValidateNested() @Type(() => WorkflowGraphDto) graph!: WorkflowGraphDto;
}
export class TriggerWorkflowDto {
  @IsString() @MaxLength(200) idempotencyKey!: string;
  @IsOptional() @IsString() @MaxLength(200) correlationId?: string;
  @IsObject() input: Record<string, unknown> = {};
}
