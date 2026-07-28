import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
export class PipelineStageDto {
  @IsString() name!: string;
  @IsInt() @Min(0) order!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability = 0;
  @IsOptional() @IsObject() rules: Record<string, string | number | boolean> = {};
}
export class CreatePipelineDto {
  @IsString() name!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PipelineStageDto) stages!: PipelineStageDto[];
  @IsOptional() @IsIn(['active', 'inactive']) status = 'active';
  @IsOptional() @IsBoolean() isDefault = false;
}
export class UpdatePipelineDto extends CreatePipelineDto { @IsInt() @Min(0) version!: number; }
