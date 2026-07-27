import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateWorkspaceSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartsOn?: number;
  @IsOptional()
  @IsString()
  dateFormat?: string;
  @IsOptional()
  @IsIn(['12h', '24h'])
  timeFormat?: '12h' | '24h';
  @IsOptional()
  @IsMongoId()
  defaultPipelineId?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  dataRetentionDays?: number;
}
